import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const DEV_PORT = 5173

/**
 * Content-Security-Policy for the renderer, written into index.html as a <meta> tag.
 *
 * Built app (served from app://athena/): only our own files run. 'wasm-unsafe-eval' lets MediaPipe compile
 * its WebAssembly; blob:/data: cover canvas snapshots and camera frames; mediastream: is the live camera.
 * Dev server: React Fast Refresh needs one inline script, Vite injects CSS as inline <style> tags, and hot
 * reload talks over a WebSocket, so those are allowed only in `vite dev`, never in the shipped build.
 */
function contentSecurityPolicy(isDev) {
  const devScript = isDev ? " 'unsafe-inline'" : ''
  const devConnect = isDev ? ` ws://localhost:${DEV_PORT}` : ''
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval'${devScript}`,
    // Vite injects CSS as <style> tags in dev; the build ships a .css file instead.
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' app: blob: data:",
    "media-src 'self' blob: mediastream:",
    `connect-src 'self'${devConnect}`,
    "worker-src 'self' blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

/** Injects the CSP meta tag so dev and build each get the policy that fits them. */
function cspPlugin() {
  let isDev = false
  return {
    name: 'athena-csp',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(isDev) },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs so the same build works under app://athena/ (packaged) and http://localhost (dev).
  base: './',
  plugins: [react(), cspPlugin()],
  server: { port: DEV_PORT, strictPort: true, host: 'localhost' },
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome140', assetsInlineLimit: 0 },
})
