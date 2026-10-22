// app://athena/… → files inside dist/ (BUILD_PLAN §4, §17.4).
//
// Why not file://: Chromium blocks fetch() on file://, and MediaPipe fetches its .wasm and model files.
// A custom scheme registered as standard + secure + fetch-enabled behaves like a normal https origin.
import { protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createLogger } from './log.js'

const log = createLogger('protocol')

export const SCHEME = 'app'
export const HOST = 'athena'

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  // application/wasm lets the browser compile while it downloads (WebAssembly.instantiateStreaming).
  '.wasm': 'application/wasm',
  '.tflite': 'application/octet-stream',
  '.woff2': 'font/woff2',
})

/** Must run before app 'ready'. */
export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ])
}

const textResponse = (status, text) => new Response(text, { status, headers: { 'content-type': 'text/plain' } })

/**
 * Maps a request URL to a file inside `distDir`, or null if it points anywhere else.
 * `path.resolve` collapses any `..`, then the prefix check refuses whatever ended up outside dist/.
 * @param {string} requestUrl @param {string} distDir
 */
export function resolveDistFile(requestUrl, distDir) {
  const url = new URL(requestUrl)
  if (url.host !== HOST) return null
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  if (pathname.includes('\0')) return null
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const file = path.resolve(distDir, relative)
  return file.startsWith(distDir + path.sep) ? file : null
}

/** @param {string} distDir absolute path to the built UI */
export function handleAppScheme(distDir) {
  const root = path.resolve(distDir)
  protocol.handle(SCHEME, async (request) => {
    if (request.method !== 'GET') return textResponse(405, 'Method not allowed')
    const file = resolveDistFile(request.url, root)
    if (!file) {
      log.warn(`refused ${request.url}`)
      return textResponse(403, 'Forbidden')
    }
    try {
      const body = await readFile(file)
      const type = MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
      return new Response(body, { status: 200, headers: { 'content-type': type, 'x-content-type-options': 'nosniff' } })
    } catch {
      return textResponse(404, 'Not found')
    }
  })
}

export const APP_INDEX_URL = `${SCHEME}://${HOST}/index.html`
