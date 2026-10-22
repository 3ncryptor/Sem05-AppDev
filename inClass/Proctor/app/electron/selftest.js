// `--selftest`: proves the packaged app can serve its UI over app:// and load MediaPipe from inside the bundle.
// Opens a hidden window at app://athena/index.html#/selftest, waits for the renderer's result, prints ONE
// JSON line to stdout and quits: { protocol, mediapipe, userData, profile }. Exit code 0 only if both pass.
import { app } from 'electron'
import { createMainWindow, uiUrl } from './window.js'

const SELFTEST_TIMEOUT_MS = 30_000

function finish(result) {
  const passed = result.protocol === 'ok' && result.mediapipe?.ok === true
  process.stdout.write(`${JSON.stringify(result)}\n`)
  app.exit(passed ? 0 : 1)
}

/** @param {{ profile: string }} options */
export function runSelftest({ profile }) {
  const base = { userData: app.getPath('userData'), profile }
  const timer = setTimeout(() => finish({ protocol: 'timeout', mediapipe: { ok: false, error: 'timeout' }, ...base }), SELFTEST_TIMEOUT_MS)

  // Always app://, even unpackaged: this is the path the packaged app uses. Needs `npm run build` first.
  const window = createMainWindow({ url: uiUrl({ forceApp: true, hash: '/selftest' }), show: false, backgroundThrottling: false })
  const contents = window.webContents

  contents.once('did-fail-load', (_e, code, description) => {
    clearTimeout(timer)
    finish({ protocol: `failed: ${code} ${description}`, mediapipe: { ok: false, error: 'page did not load' }, ...base })
  })
  contents.once('did-finish-load', async () => {
    // main.jsx stores the self-test promise on window.__athenaSelftest before the page finishes loading.
    let mediapipe
    try {
      mediapipe = await contents.executeJavaScript('window.__athenaSelftest ?? { ok: false, error: "no selftest hook" }')
    } catch (error) {
      mediapipe = { ok: false, error: error.message }
    }
    clearTimeout(timer)
    finish({ protocol: contents.getURL().startsWith('app://athena/') ? 'ok' : 'not app://', mediapipe, ...base })
  })
}
