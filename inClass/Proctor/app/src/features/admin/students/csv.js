// CSV in and out for A8b. Parsing stays small: quoted fields, "" escapes, CRLF or LF.

export const MAX_IMPORT_ROWS = 500

const HEADER_ALIASES = Object.freeze({
  rollNo: ['rollno', 'roll no', 'roll_no', 'roll number', 'roll'],
  name: ['name', 'student', 'student name', 'full name'],
})

function splitRecords(text) {
  const records = []
  let record = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      record = [...record, field]
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      records.push([...record, field])
      record = []
      field = ''
    } else field += char
  }
  if (field !== '' || record.length > 0) records.push([...record, field])
  return records.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

const columnOf = (header, key) => header.findIndex((cell) => HEADER_ALIASES[key].includes(cell.trim().toLowerCase()))

/**
 * Reads `rollNo,name[,password]`. Passwords are ignored: the server generates them on import.
 * @returns {{ rows: { rollNo: string, name: string }[], error: string | null }}
 */
export function parseStudentsCsv(text) {
  const records = splitRecords(String(text ?? '').replace(/^\uFEFF/, ''))
  if (records.length === 0) return { rows: [], error: 'The file is empty.' }
  const [header, ...body] = records
  const rollCol = columnOf(header, 'rollNo')
  const nameCol = columnOf(header, 'name')
  if (rollCol < 0 || nameCol < 0) return { rows: [], error: 'The first row must name the columns: rollNo,name' }
  if (body.length === 0) return { rows: [], error: 'The file has a header but no students.' }
  if (body.length > MAX_IMPORT_ROWS) return { rows: [], error: `At most ${MAX_IMPORT_ROWS} students per file. This one has ${body.length}.` }
  const rows = body.map((cells) => ({ rollNo: (cells[rollCol] ?? '').trim(), name: (cells[nameCol] ?? '').trim() }))
  return { rows, error: null }
}

const quote = (value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)

/** The created accounts as CSV text, for the clipboard. */
export const passwordsCsv = (created) =>
  ['rollNo,name,password', ...created.map((r) => [r.rollNo, r.name, r.password].map(quote).join(','))].join('\n')
