// Remembers which question was open, so a relaunch resumes on the same one. Per-window convenience only
// (the answers themselves live on the server and in main's queue), so losing it is harmless.
const key = (attemptId) => `athena.lastQuestion.${attemptId}`

export function readLastQuestion(attemptId) {
  try {
    return Number.parseInt(window.localStorage.getItem(key(attemptId)) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

export function writeLastQuestion(attemptId, index) {
  try {
    window.localStorage.setItem(key(attemptId), String(index))
  } catch {
    // Storage unavailable: resume starts at question 1.
  }
}
