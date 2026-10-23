// Native file dialogs (BUILD_PLAN §17.4). Phase 4: the PDF receipt (C14).
// CSV open/save and results export arrive with the admin phases.
import { BrowserWindow, app, dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PATH_ID_PATTERN } from './routes.js'
import { IpcError, handle, objectPayload } from './validate.js'

const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/

/**
 * Where to save. Dev only: ATHENA_SAVE_DIR skips the dialog so a scripted run can check the file.
 * The packaged app always asks.
 */
async function chooseSavePath(window, fileName) {
  if (!app.isPackaged && process.env.ATHENA_SAVE_DIR) return path.join(path.resolve(process.env.ATHENA_SAVE_DIR), fileName)
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: 'Save receipt',
    defaultPath: path.join(app.getPath('documents'), fileName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  return canceled ? null : filePath
}

/**
 * receipt:savePdf: asks where to save, then prints the current page. The page's print stylesheet hides
 * everything except the receipt card (styles/base.css @media print), so the PDF is just the receipt.
 */
async function saveReceiptPdf(payload, event) {
  const { attemptId, code } = objectPayload(payload)
  if (typeof attemptId !== 'string' || !PATH_ID_PATTERN.test(attemptId)) throw new IpcError('IPC_REJECTED', 'Bad attempt id')
  const safeCode = typeof code === 'string' && CODE_PATTERN.test(code) ? code : attemptId
  const fileName = `Athena receipt ${safeCode}.pdf`
  const filePath = await chooseSavePath(BrowserWindow.fromWebContents(event.sender), fileName)
  if (!filePath) return null
  const pdf = await event.sender.printToPDF({ printBackground: false, pageSize: 'A4', margins: { marginType: 'default' } })
  await writeFile(filePath, pdf)
  return { path: filePath }
}

export function registerFileHandlers() {
  handle('receipt:savePdf', saveReceiptPdf)
}
