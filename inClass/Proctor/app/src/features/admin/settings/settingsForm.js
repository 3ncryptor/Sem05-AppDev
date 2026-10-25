// A5 form model: exam → editable strings, form → the two payloads the server takes, and client checks
// that mirror the server's (backend/lib/exams.js SETTINGS_FIELDS, backend/lib/proctoring.js LIMITS.SHOT_SEC).

export const SHOT_LIMITS = Object.freeze({ MIN: 10, MAX: 3600 })

const pad = (n) => String(n).padStart(2, '0')

/** ISO → the "YYYY-MM-DDTHH:mm" a datetime-local input shows, in local time. */
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toIso = (local) => (local ? new Date(local).toISOString() : null)

/** @param {object} exam */
export function formFromExam(exam) {
  return {
    durationMinutes: String(exam.durationMinutes),
    opensAt: toLocalInput(exam.opensAt),
    closesAt: toLocalInput(exam.closesAt),
    maxAttempts: String(exam.maxAttempts),
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    instructions: exam.instructions,
    terms: exam.terms,
    visibility: exam.resultPolicy.visibility,
    passPercent: String(exam.resultPolicy.passPercent),
    minSec: String(exam.proctoring.screenshots.minSec),
    maxSec: String(exam.proctoring.screenshots.maxSec),
  }
}

/** Body for admin.exams.updateSettings. */
export function settingsPayload(form) {
  return {
    durationMinutes: Number(form.durationMinutes),
    opensAt: toIso(form.opensAt),
    closesAt: toIso(form.closesAt),
    maxAttempts: Number(form.maxAttempts),
    shuffleQuestions: form.shuffleQuestions,
    shuffleOptions: form.shuffleOptions,
    instructions: form.instructions,
    terms: form.terms,
    resultPolicy: { visibility: form.visibility, passPercent: Number(form.passPercent) },
  }
}

/** Body for admin.exams.updateProctoring: only the screenshot interval, nothing else. */
export const screenshotsPayload = (form) => ({ screenshots: { minSec: Number(form.minSec), maxSec: Number(form.maxSec) } })

export const screenshotsChanged = (form, initial) => form.minSec !== initial.minSec || form.maxSec !== initial.maxSec

export const isDirty = (form, initial) => JSON.stringify(form) !== JSON.stringify(initial)

function wholeNumberError(value, min, max) {
  const n = Number(value)
  if (value.trim() === '' || !Number.isInteger(n)) return 'Must be a whole number'
  if (n < min || n > max) return `Must be from ${min} to ${max}`
  return null
}

/** Field errors keyed like the server's, so one map feeds every field. */
export function validate(form) {
  const errors = {
    durationMinutes: wholeNumberError(form.durationMinutes, 1, 600),
    maxAttempts: wholeNumberError(form.maxAttempts, 1, 10),
    'resultPolicy.passPercent': wholeNumberError(form.passPercent, 0, 100),
    'screenshots.minSec': wholeNumberError(form.minSec, SHOT_LIMITS.MIN, SHOT_LIMITS.MAX),
    'screenshots.maxSec': wholeNumberError(form.maxSec, SHOT_LIMITS.MIN, SHOT_LIMITS.MAX),
  }
  if (form.opensAt && form.closesAt && toIso(form.closesAt) <= toIso(form.opensAt)) errors.closesAt = 'Must be after the window opens'
  if (!errors['screenshots.maxSec'] && Number(form.maxSec) < Number(form.minSec)) errors['screenshots.maxSec'] = 'Must be at least the minimum'
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}

/** The proctoring route reports "proctoring.screenshots.minSec"; the form uses "screenshots.minSec". */
export const stripProctoringPrefix = (fields) =>
  Object.fromEntries(Object.entries(fields ?? {}).map(([key, message]) => [key.replace(/^proctoring\./, ''), message]))
