// BUILD_PLAN §18: the only HTTP calls Athena can make. `api:request` rejects any name not listed here,
// and names marked `internal` are used by main itself (login, heartbeat, evidence upload, CSV export)
// and are rejected when the renderer asks for them.
//
// `queued` names will go through queue.js (Phase 4); until then they are sent directly.

/**
 * @typedef {{ method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, role: 'any' | 'student' | 'admin',
 *             internal?: boolean, queued?: boolean, remembersAttempt?: boolean }} Route
 */

/** @type {Readonly<Record<string, Route>>} */
export const ROUTES = Object.freeze({
  'auth.login': { method: 'POST', path: '/auth/login', role: 'any', internal: true },
  'auth.logout': { method: 'POST', path: '/auth/logout', role: 'any', internal: true },
  'auth.me': { method: 'GET', path: '/auth/me', role: 'any', internal: true },

  'exams.list': { method: 'GET', path: '/exams', role: 'student' },
  'exams.get': { method: 'GET', path: '/exams/:examId', role: 'student' },
  'attempts.start': { method: 'POST', path: '/exams/:examId/attempts', role: 'student', remembersAttempt: true },
  'attempts.get': { method: 'GET', path: '/attempts/:attemptId', role: 'student', remembersAttempt: true },
  'answers.save': { method: 'PUT', path: '/attempts/:attemptId/answers/:questionId', role: 'student', queued: true },
  'attempts.events': { method: 'POST', path: '/attempts/:attemptId/events', role: 'student', internal: true },
  'attempts.heartbeat': { method: 'POST', path: '/attempts/:attemptId/heartbeat', role: 'student', internal: true },
  'attempts.evidence': { method: 'POST', path: '/attempts/:attemptId/evidence', role: 'student', internal: true },
  'attempts.submit': { method: 'POST', path: '/attempts/:attemptId/submit', role: 'student' },
  'attempts.receipt': { method: 'GET', path: '/attempts/:attemptId/receipt', role: 'student' },
  'attempts.result': { method: 'GET', path: '/attempts/:attemptId/result', role: 'student' },
  'me.attempts': { method: 'GET', path: '/me/attempts', role: 'student' },
  'me.analytics': { method: 'GET', path: '/me/analytics', role: 'student' },

  'admin.home': { method: 'GET', path: '/admin/home', role: 'admin' },
  'admin.exams.list': { method: 'GET', path: '/admin/exams', role: 'admin' },
  'admin.exams.get': { method: 'GET', path: '/admin/exams/:examId', role: 'admin' },
  'admin.exams.create': { method: 'POST', path: '/admin/exams', role: 'admin' },
  'admin.exams.update': { method: 'PATCH', path: '/admin/exams/:examId', role: 'admin' },
  'admin.exams.delete': { method: 'DELETE', path: '/admin/exams/:examId', role: 'admin' },
  'admin.exams.updateSettings': { method: 'PUT', path: '/admin/exams/:examId/settings', role: 'admin' },
  'admin.exams.updateProctoring': { method: 'PUT', path: '/admin/exams/:examId/proctoring', role: 'admin' },
  'admin.exams.publish': { method: 'POST', path: '/admin/exams/:examId/publish', role: 'admin' },
  'admin.exams.unpublish': { method: 'POST', path: '/admin/exams/:examId/unpublish', role: 'admin' },
  'admin.exams.extendInProgress': { method: 'POST', path: '/admin/exams/:examId/extend-in-progress', role: 'admin' },
  'admin.questions.create': { method: 'POST', path: '/admin/exams/:examId/questions', role: 'admin' },
  'admin.questions.update': { method: 'PATCH', path: '/admin/exams/:examId/questions/:questionId', role: 'admin' },
  'admin.questions.delete': { method: 'DELETE', path: '/admin/exams/:examId/questions/:questionId', role: 'admin' },
  'admin.questions.reorder': { method: 'PUT', path: '/admin/exams/:examId/questions/order', role: 'admin' },
  'admin.questions.previewScore': {
    method: 'POST',
    path: '/admin/exams/:examId/questions/:questionId/preview-score',
    role: 'admin',
  },
  'admin.users.list': { method: 'GET', path: '/admin/users', role: 'admin' },
  'admin.users.create': { method: 'POST', path: '/admin/users', role: 'admin' },
  'admin.users.update': { method: 'PATCH', path: '/admin/users/:userId', role: 'admin' },
  'admin.users.resetPassword': { method: 'POST', path: '/admin/users/:userId/reset-password', role: 'admin' },
  'admin.users.import': { method: 'POST', path: '/admin/users/import', role: 'admin' },
  'admin.live': { method: 'GET', path: '/admin/exams/:examId/live', role: 'admin' },
  'admin.reviewQueue': { method: 'GET', path: '/admin/exams/:examId/review-queue', role: 'admin' },
  'admin.attempts.get': { method: 'GET', path: '/admin/attempts/:attemptId', role: 'admin' },
  'admin.attempts.extend': { method: 'POST', path: '/admin/attempts/:attemptId/extend', role: 'admin' },
  'admin.attempts.end': { method: 'POST', path: '/admin/attempts/:attemptId/end', role: 'admin' },
  'admin.attempts.resume': { method: 'POST', path: '/admin/attempts/:attemptId/resume', role: 'admin' },
  'admin.attempts.review': { method: 'PUT', path: '/admin/attempts/:attemptId/review', role: 'admin' },
  'admin.attempts.release': { method: 'POST', path: '/admin/attempts/:attemptId/release', role: 'admin' },
  'admin.flags.dismiss': { method: 'POST', path: '/admin/attempts/:attemptId/flags/:flagId/dismiss', role: 'admin' },
  'admin.evidence': {
    method: 'GET',
    path: '/admin/attempts/:attemptId/evidence/:kind/:file',
    role: 'admin',
    internal: true,
  },
  'admin.results.list': { method: 'GET', path: '/admin/exams/:examId/results', role: 'admin' },
  'admin.results.publish': { method: 'POST', path: '/admin/exams/:examId/results/publish', role: 'admin' },
  'admin.results.csv': { method: 'GET', path: '/admin/exams/:examId/results.csv', role: 'admin', internal: true },
  'admin.analytics': { method: 'GET', path: '/admin/exams/:examId/analytics', role: 'admin' },
})

/** Ids in paths: two lowercase letters, underscore, 8–40 safe characters (e.g. `at_5d1e…`). */
export const PATH_ID_PATTERN = /^[a-z]{2}_[A-Za-z0-9-]{8,40}$/

/**
 * Path params that are not ids get their own patterns. `admin.evidence` is internal and only built by main,
 * which checks `kind` and `file` itself (BUILD_PLAN §17.2, evidence:adminImage).
 * @type {Readonly<Record<string, RegExp>>}
 */
export const SPECIAL_PARAM_PATTERNS = Object.freeze({
  kind: /^(screen|camera|identity)$/,
  file: /^[\w.-]+\.jpg$/,
})

/** @param {string} name */
export const isKnownRoute = (name) => Object.hasOwn(ROUTES, name)
