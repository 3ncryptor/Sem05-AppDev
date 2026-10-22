import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { applyInitialTheme } from './lib/theme.js'
import './styles/tokens.css'
import './styles/base.css'

// `--selftest` loads #/selftest in a hidden window and reads this promise from main (electron/selftest.js).
if (window.location.hash === '#/selftest') {
  window.__athenaSelftest = import('./features/selftest/runSelftest.js').then((m) => m.runSelftest())
}

applyInitialTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
