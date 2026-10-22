// The app menu (BUILD_PLAN §4): trimmed to what a Mac app needs. Reload and DevTools only when unpackaged.
import { Menu, app } from 'electron'

export function buildMenu() {
  const devItems = app.isPackaged
    ? []
    : [{ type: 'separator' }, { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }]

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      // Kept so text fields support ⌘C/⌘V/⌘Z. The exam blocks clipboard use itself (Phase 5).
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, ...devItems] },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
