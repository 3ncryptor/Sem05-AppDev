// Files in and out (BUILD_PLAN §17.4): the PDF receipt (C14), the results CSV export (A11), opening a
// students CSV (A8), and saved exam images for the admin review console (A10).
import { BrowserWindow, app, dialog } from 'electron'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { requestFile } from './api.js'
import { PATH_ID_PATTERN, SPECIAL_PARAM_PATTERNS } from './routes.js'
import { IpcError, handle, objectPayload } from './validate.js'

const CODE_PATTERN = /^[A-Z0-9-]{2,32}$/
const MAX_CSV_BYTES = 1024 * 1024
const FILTERS = Object.freeze({ pdf: { name: 'PDF', extensions: ['pdf'] }, csv: { name: 'CSV', extensions: ['csv'] } })

/**
 * Where to save. Dev only: ATHENA_SAVE_DIR skips the dialog so a scripted run can check the file.
 * The packaged app always asks.
 */
async function chooseSavePath(window, fileName, { title = 'Save receipt', type = 'pdf' } = {}) {
  if (!app.isPackaged && process.env.ATHENA_SAVE_DIR) return path.join(path.resolve(process.env.ATHENA_SAVE_DIR), fileName)
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title,
    defaultPath: path.join(app.getPath('documents'), fileName),
    filters: [FILTERS[type]],
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

const requireId = (value, name) => {
  if (typeof value !== 'string' || !PATH_ID_PATTERN.test(value)) throw new IpcError('IPC_REJECTED', `Bad ${name}`)
  return value
}

/** Turns a failed file request into the same error the renderer gets from api(). */
function fileOrThrow(result) {
  if (!result.ok) throw new IpcError(result.error.code, result.error.message)
  return result.buffer
}

/** results:exportCsv: asks where to save, then writes the exam's results CSV from the server. */
async function exportResultsCsv(payload, event) {
  const { examId, code } = objectPayload(payload)
  const safeCode = typeof code === 'string' && CODE_PATTERN.test(code) ? code : 'exam'
  const csv = fileOrThrow(await requestFile('admin.results.csv', { examId: requireId(examId, 'exam id') }))
  const window = BrowserWindow.fromWebContents(event.sender)
  const filePath = await chooseSavePath(window, `Athena results ${safeCode}.csv`, { title: 'Export results', type: 'csv' })
  if (!filePath) return null
  await writeFile(filePath, csv)
  return { path: filePath }
}

/** file:openCsv: native open dialog; returns the chosen file's name and text (at most 1 MB). */
async function openCsv(_payload, event) {
  const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: 'Import students',
    properties: ['openFile'],
    filters: [FILTERS.csv],
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  if ((await stat(filePath)).size > MAX_CSV_BYTES) throw new IpcError('VALIDATION_FAILED', 'The CSV file must be 1 MB or smaller.')
  return { name: path.basename(filePath), text: await readFile(filePath, 'utf8') }
}

/** evidence:adminImage: one saved exam image as a data URL the review console can show directly. */
async function adminImage(payload) {
  const { attemptId, kind, file } = objectPayload(payload)
  if (!SPECIAL_PARAM_PATTERNS.kind.test(String(kind)) || !SPECIAL_PARAM_PATTERNS.file.test(String(file))) {
    throw new IpcError('IPC_REJECTED', 'Bad image name')
  }
  const bytes = fileOrThrow(await requestFile('admin.evidence', { attemptId: requireId(attemptId, 'attempt id'), kind, file }))
  return `data:image/jpeg;base64,${bytes.toString('base64')}`
}

export function registerFileHandlers() {
  handle('receipt:savePdf', saveReceiptPdf)
  handle('results:exportCsv', exportResultsCsv)
  handle('file:openCsv', openCsv)
  handle('evidence:adminImage', adminImage)
}
