// Copies the MediaPipe WebAssembly files the app needs into public/mediapipe/ so Vite ships them in dist/.
//
// Why only two files: FilesetResolver.forVisionTasks(base) picks
//   `${base}/vision_wasm_internal.js` + `.wasm`          when the browser supports WASM SIMD, or
//   `${base}/vision_wasm_nosimd_internal.js` + `.wasm`   when it doesn't, and
//   `vision_wasm_module_internal.*`                       only when asked for the ES-module build.
// Electron's Chromium on Apple Silicon always supports SIMD and we never ask for the module build,
// so the SIMD pair (~13 MB) is all that loads. The other four files (~25 MB) would be dead weight in the DMG.
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const TARGET_DIR = path.join(ROOT, 'public', 'mediapipe')
const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']

async function copyIfChanged(name) {
  const from = path.join(SOURCE_DIR, name)
  const to = path.join(TARGET_DIR, name)
  const source = await stat(from)
  const existing = await stat(to).catch(() => null)
  if (existing && existing.size === source.size && existing.mtimeMs >= source.mtimeMs) return false
  await copyFile(from, to)
  return true
}

async function main() {
  await mkdir(TARGET_DIR, { recursive: true })
  for (const name of FILES) {
    const copied = await copyIfChanged(name)
    console.log(`[copy-mediapipe] ${copied ? 'copied' : 'up to date'} ${name}`)
  }
}

main().catch((error) => {
  console.error(`[copy-mediapipe] failed: ${error.message}`)
  console.error('Run `npm install` first so @mediapipe/tasks-vision is present.')
  process.exit(1)
})
