// Hidden upload staging (BUILD_PLAN §25). Every image is written to this Mac BEFORE it's uploaded:
//   userData/pending-uploads/<attemptCode>/{identity,camera,screen}/<time>_<seq>.jpg  +  manifest.json
// The manifest doubles as the upload queue: an entry is `uploaded: true` only after the server confirms it,
// and its image file is then deleted from staging. A crash or a dropped network loses nothing, because the
// worker resumes from the manifest. One upload at a time, oldest first. People read the images on the server.
import { app } from 'electron'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getKnownAttempt } from './exam.js'
import { createLogger } from './log.js'
import { reportNetwork } from './queue.js'
import { PATH_ID_PATTERN } from './routes.js'
import { IpcError, handle, objectPayload, oneOf } from './validate.js'

const log = createLogger('evidence')

const MAX_IMAGE_BYTES = 1024 * 1024
const SAVE_KINDS = /** @type {const} */ (['camera', 'identity'])
const REASONS = /** @type {const} */ (['interval', 'flag', 'identity', 'resume', 'manual'])
const RETRY_MS = [5_000, 10_000, 20_000, 30_000]
const IDLE_POLL_MS = 30_000
/** Upload errors that won't change on retry: mark the entry skipped and move on. */
const SKIP_CODES = new Set(['PAYLOAD_TOO_LARGE', 'VALIDATION_FAILED', 'NOT_FOUND', 'FORBIDDEN', 'IPC_REJECTED'])

/** userData/pending-uploads. ATHENA_EVIDENCE_DIR overrides it (testing only). */
export function evidenceRoot() {
  if (process.env.ATHENA_EVIDENCE_DIR) return path.resolve(process.env.ATHENA_EVIDENCE_DIR)
  return path.join(app.getPath('userData'), 'pending-uploads')
}

/** Resolves `parts` under the root and refuses anything that lands outside it. */
function inside(...parts) {
  const root = evidenceRoot()
  const target = path.resolve(root, ...parts)
  if (target !== root && !target.startsWith(root + path.sep)) throw new IpcError('IPC_REJECTED', 'Outside evidence folder')
  return target
}

// ---- manifest ---------------------------------------------------------------------------------------

/** Per-attempt write chain, so two saves never interleave their manifest updates. */
const chains = new Map()
function serialize(key, task) {
  const next = (chains.get(key) ?? Promise.resolve()).then(task, task)
  chains.set(key, next.catch(() => null))
  return next
}

async function readManifest(dir) {
  try {
    return JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'))
  } catch {
    return null
  }
}

async function writeManifest(dir, manifest) {
  const file = path.join(dir, 'manifest.json')
  await writeFile(`${file}.tmp`, JSON.stringify(manifest, null, 2))
  await rename(`${file}.tmp`, file)
}

async function attemptDirs() {
  const root = evidenceRoot()
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name))
}

/** Finds an attempt's folder by the id stored in its manifest. */
async function dirForAttempt(attemptId) {
  for (const dir of await attemptDirs()) {
    if ((await readManifest(dir))?.attemptId === attemptId) return dir
  }
  return null
}

/** "2026-10-25T10:15:30.123Z", 14 → "2026-10-25T10-15-30Z_0014.jpg" */
const fileNameFor = (iso, seq) => `${iso.slice(0, 19).replaceAll(':', '-')}Z_${String(seq).padStart(4, '0')}.jpg`

// ---- evidence:save ------------------------------------------------------------------------------------

function checkJpeg(bytes) {
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) throw new IpcError('IPC_REJECTED', 'bytes must be binary')
  const buffer = bytes instanceof ArrayBuffer ? Buffer.from(bytes) : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) throw new IpcError('IPC_REJECTED', 'Image must be under 1 MB')
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) throw new IpcError('IPC_REJECTED', 'Not a JPEG')
  return buffer
}

async function saveEvidence(payload) {
  const input = objectPayload(payload)
  const attemptId = typeof input.attemptId === 'string' && PATH_ID_PATTERN.test(input.attemptId) ? input.attemptId : null
  const attempt = attemptId ? getKnownAttempt(attemptId) : null
  if (!attempt || attempt.status !== 'in_progress') throw new IpcError('IPC_REJECTED', 'Not an active attempt')
  const kind = oneOf(input.kind, 'kind', SAVE_KINDS)
  const reason = oneOf(input.reason ?? kind, 'reason', REASONS)
  const buffer = checkJpeg(input.bytes)
  return saveImage({ attempt, kind, reason, buffer })
}

/** Writes the image, then the manifest entry. Also used by capture.js for screenshots (Loop 3). */
export function saveImage({ attempt, kind, reason, buffer }) {
  const dir = inside(attempt.code)
  return serialize(attempt.id, async () => {
    await mkdir(path.join(dir, kind), { recursive: true })
    const manifest = (await readManifest(dir)) ?? { attemptId: attempt.id, attemptCode: attempt.code, status: 'in_progress', nextSeq: 1, entries: [] }
    const capturedAt = new Date().toISOString()
    const file = `${kind}/${fileNameFor(capturedAt, manifest.nextSeq)}`
    await writeFile(path.join(dir, file), buffer)
    const entry = { file, kind, seq: manifest.nextSeq, capturedAt, reason, bytes: buffer.length, uploaded: false }
    await writeManifest(dir, { ...manifest, nextSeq: manifest.nextSeq + 1, entries: [...manifest.entries, entry] })
    log.info(`saved ${attempt.code}/${file}`)
    kickUploads()
    return { file, seq: entry.seq }
  })
}

/** After submit: mark the manifest. Uploads of the remaining images carry on. */
export async function markSubmitted(attemptId) {
  const dir = await dirForAttempt(attemptId)
  if (!dir) return
  await serialize(attemptId, async () => {
    const manifest = await readManifest(dir)
    if (manifest) await writeManifest(dir, { ...manifest, status: 'submitted' })
  })
}

// ---- upload worker ------------------------------------------------------------------------------------

let deps = { requestRaw: null }
let uploading = false
let failures = 0
let timer = null

/** Oldest entry not yet uploaded, across all attempts. */
async function nextPending() {
  let best = null
  for (const dir of await attemptDirs()) {
    const manifest = await readManifest(dir)
    for (const entry of manifest?.entries ?? []) {
      if (entry.uploaded || entry.skipped) continue
      if (!best || entry.capturedAt < best.entry.capturedAt) best = { dir, manifest, entry }
    }
  }
  return best
}

async function markEntry(dir, attemptId, seq, patch) {
  await serialize(attemptId, async () => {
    const manifest = await readManifest(dir)
    const entries = manifest.entries.map((entry) => (entry.seq === seq ? { ...entry, ...patch } : entry))
    await writeManifest(dir, { ...manifest, entries })
  })
}

/** Uploads one image. Returns false when the worker should pause (network down). */
async function uploadOne({ dir, manifest, entry }) {
  const body = await readFile(path.join(dir, entry.file))
  const params = { attemptId: manifest.attemptId, kind: entry.kind, seq: entry.seq, capturedAt: entry.capturedAt, reason: entry.reason }
  const envelope = await deps.requestRaw('attempts.evidence', params, body, 'image/jpeg')
  if (envelope.ok) {
    await markEntry(dir, manifest.attemptId, entry.seq, { uploaded: true })
    await rm(path.join(dir, entry.file), { force: true })
    return true
  }
  if (envelope.error.code === 'SERVER_UNREACHABLE') {
    reportNetwork(false)
    return false
  }
  if (SKIP_CODES.has(envelope.error.code)) {
    log.warn(`skipped ${entry.file}: ${envelope.error.code}`)
    await markEntry(dir, manifest.attemptId, entry.seq, { skipped: envelope.error.code })
    await rm(path.join(dir, entry.file), { force: true })
    return true
  }
  log.warn(`upload of ${entry.file} failed: ${envelope.error.code}`)
  return false
}

async function runUploads() {
  for (let next = await nextPending(); next; next = await nextPending()) {
    if (!(await uploadOne(next))) {
      failures += 1
      return RETRY_MS[Math.min(failures - 1, RETRY_MS.length - 1)]
    }
    failures = 0
  }
  return IDLE_POLL_MS
}

export function kickUploads() {
  if (uploading || !deps.requestRaw) return
  uploading = true
  clearTimeout(timer)
  runUploads()
    .catch((error) => {
      log.error('upload worker:', error.message)
      return RETRY_MS.at(-1)
    })
    .then((delay) => {
      uploading = false
      timer = setTimeout(kickUploads, delay)
    })
}

/** @param {{ requestRaw: Function }} wiring */
export function initEvidence(wiring) {
  deps = { ...deps, ...wiring }
  kickUploads()
}

// ---- Settings and the done page -----------------------------------------------------------------------

async function folderSummary(dir) {
  const entries = (await readManifest(dir))?.entries ?? []
  const uploaded = entries.filter((entry) => entry.uploaded).length
  return { images: entries.length, uploaded, pending: entries.filter((entry) => !entry.uploaded && !entry.skipped).length }
}

/** evidence:summary → { pending, uploaded, images } for one attempt, or for everything on this Mac. */
async function summary(payload) {
  const { attemptId } = objectPayload(payload)
  const dirs = attemptId ? [await dirForAttempt(attemptId)].filter(Boolean) : await attemptDirs()
  const parts = await Promise.all(dirs.map(folderSummary))
  const total = (key) => parts.reduce((sum, part) => sum + part[key], 0)
  return { pending: total('pending'), uploaded: total('uploaded'), images: total('images') }
}

export function registerEvidenceHandlers() {
  handle('evidence:save', saveEvidence)
  handle('evidence:summary', summary)
}
