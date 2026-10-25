# Athena HTTP API reference

Compiled 2026-10-25. Facts are cited to file paths in this repository (and function names where useful); response shapes were also checked against a throwaway server seeded from `backend/scripts/seed.js` on port 3170.

---

## Summary

The Athena backend is an Express 5 server (`backend/package.json`) with 51 named routes under `/api`, plus one unauthenticated health check. Every JSON response uses the same `{ ok, data, error }` envelope (`backend/lib/http.js`), every protected route takes a Bearer token issued by `POST /api/auth/login` (`backend/lib/auth.js`), and the role on the token decides which half of the API a caller can use: `/api/admin/*` for the examiner, `/api/exams`, `/api/attempts` and `/api/me` for students (`backend/server.js`). Each failure has one error code, and the code fixes the HTTP status (`backend/lib/errors.js`). The only rate limit is on login.

Nobody calls this API from a browser. The Electron main process is the only client: the React renderer asks for a route by name (for example `attempts.start`), and main checks the name against the table in `app/electron/routes.js`, attaches the token, which it keeps to itself, and makes the request (`app/electron/api.js`). Routes marked `internal` in that table can only be called by main.

Proctoring (face detection, flags, risk scores) was removed from the app on 2026-10-25. The backend still serves the routes and response fields that belonged to it. They are marked **legacy, unused since 2026-10-25** below, so a reader can tell live behaviour from leftovers.

---

## How the API works

This section covers the rules shared by every route: where the server listens, the envelope, authentication, roles, ids, errors and limits. Read it once; the route sections below assume it.

### Base URL and configuration

The server listens on `http://127.0.0.1:3000` by default, and every route lives under `/api`, so the base URL is `http://127.0.0.1:3000/api`. Binding to `127.0.0.1` means only the same Mac can connect unless `HOST` is changed (`backend/server.js`, `backend/config.js`). The Electron client stores the server address in its own `settings.json` (default `http://127.0.0.1:3000`) and appends `/api` itself (`app/electron/settings.js`, `request()` in `app/electron/api.js`).

| Variable | Default | Allowed values | Effect |
|---|---|---|---|
| `PORT` | `3000` | whole number 1 to 65535 | Listening port |
| `HOST` | `127.0.0.1` | letters, digits, `.`, `:`, `-` | Listening address; `0.0.0.0` lets another Mac connect |
| `DATA_DIR` | `backend/data` | any path | JSON files and per-attempt records |
| `EVIDENCE_DIR` | `backend/screenshots` | any path except the file-system root | Where uploaded images are written |
| `TOKEN_TTL_HOURS` | `12` | whole number 1 to 168 | Session lifetime |

Source: `loadConfig()` in `backend/config.js`. A bad value stops the server at startup with `Config error: ...` (`start()` in `backend/server.js`).

### The response envelope

Every JSON response has the same three keys, so a client can always test `ok` first. On success `data` holds the payload and `error` is `null`. On failure `data` is `null` and `error` holds a code, a message that is safe to show a user, and sometimes extra detail.

```json
{ "ok": true,  "data": { "status": "ok", "serverNow": "2026-10-25T17:21:55.549Z" }, "error": null }
{ "ok": false, "data": null, "error": { "code": "VALIDATION_FAILED", "message": "Some fields need attention.", "fields": { "rollNo": "Required" } } }
```

Source: `sendOk()` and `errorHandler()` in `backend/lib/http.js`; `AppError.toJSON()` in `backend/lib/errors.js`.

The `error` object can carry these extra keys. `fields` maps a field path (such as `consent.terms` or `config.options.0.text`) to a message, and appears on `VALIDATION_FAILED`. `problems` and `warnings` appear on `NOT_PUBLISHABLE`. `requestId` appears only on `SERVER_ERROR`, so the matching stack trace can be found in the server log. Every response also carries an `X-Request-Id` header, `X-Content-Type-Options: nosniff` and `Cache-Control: no-store` (`requestId()` and `securityHeaders()` in `backend/lib/http.js`).

Two routes answer with a file instead of the envelope on success: the results CSV (`text/csv`) and the evidence image download (`image/jpeg`). Their errors still use the envelope (`backend/routes/admin/results.js`, `backend/routes/admin/review.js`).

### Authentication

A client signs in with a roll number and password and gets back a token. It sends that token on every later request as `Authorization: Bearer <token>`. The token is 32 random bytes in base64url (43 characters), and the server stores only its SHA-256 hash, so a copy of `sessions.json` cannot be replayed (`createSession()` and `hashToken()` in `backend/lib/auth.js`). The header must match `^Bearer ([A-Za-z0-9_-]{20,100})$` (`bearerToken()`).

`requireAuth` answers `401 UNAUTHENTICATED` with "Please sign in again." when the header is missing or malformed, the session is unknown, the session has expired (the expired session is deleted at that moment), or the user is missing or turned off. Sessions last `TOKEN_TTL_HOURS` (12 by default) and are never refreshed; the user signs in again. Turning a student off or resetting their password deletes all of that student's sessions (`updateStudent()` and `resetPassword()` in `backend/lib/users.js`). Passwords are hashed with scrypt, a 16-byte salt and a 64-byte key, and compared with `timingSafeEqual`. An unknown roll number is checked against a dummy hash, so it costs the same time as a real one (`login()` and `DUMMY` in `backend/lib/auth.js`).

The Electron app never shows the token to the renderer. Main keeps it in memory and on disk only encrypted with `safeStorage` (`app/electron/session.js`). When any response comes back `UNAUTHENTICATED`, main clears the session (`request()` in `app/electron/api.js`).

### Roles

There are two roles, `admin` and `student`, stored on the user record. The server mounts two routers with a role check in front of each, so an admin token gets `403 FORBIDDEN` on student routes and the other way round (`backend/server.js`, `requireRole()` in `backend/lib/auth.js`). The Electron route table repeats the role (`role` in `app/electron/routes.js`), but the server check is the one that counts.

| Prefix | Who | Router |
|---|---|---|
| `/api/health` | anyone, no token | inline in `backend/server.js` |
| `/api/auth/*` | anyone for login; any signed-in user for logout and me | `backend/routes/auth.js` |
| `/api/admin/*` | `admin` | `backend/routes/admin/*.js` |
| `/api/exams/*`, `/api/attempts/*`, `/api/me/*` | `student` | `backend/routes/exams.js`, `attempts.js`, `me.js` |

Source: `createApp()` in `backend/server.js`.

One quirk follows from the mounting order. The student router is mounted at `/api` itself, so an unknown path such as `GET /api/nope` passes through the student auth check before it reaches the 404 handler. It answers `401 UNAUTHENTICATED` without a token and `403 FORBIDDEN` with an admin token, not `404`. Unknown paths under `/api/admin/` do return `404 NOT_FOUND` to an admin, because the admin router has its own 404 handler. This was observed on the test server.

### Ids in paths

Server ids look like `ex_<uuid>`: two lowercase letters, an underscore, then 8 to 40 characters from `A-Za-z0-9-` (`ID_PATTERN` in `backend/lib/ids.js`). The prefixes are `us` (user), `ex` (exam), `qn` (question), `at` (attempt) and `fl` (flag). Any path id that does not match is answered `404 NOT_FOUND` before a handler sees it (`checkIdParam()` in `backend/lib/http.js`). Items inside a question (options, ordering items, matching sides) use shorter ids such as `op_fc8853ed44` (`shortId()` in `backend/lib/ids.js`). Electron checks the same id pattern before it builds a URL (`PATH_ID_PATTERN` and `fillPath()` in `app/electron/routes.js` and `api.js`).

### Error codes

Every expected failure is an `AppError` whose code picks the HTTP status from one table. Body-parser failures are mapped onto the same codes, and anything unexpected becomes `SERVER_ERROR` with a request id.

| Code | HTTP | Raised when |
|---|---|---|
| `VALIDATION_FAILED` | 400 | A field fails its schema; body is not valid JSON; a JPEG is empty or not a JPEG; consent missing; publish-time setting rule broken |
| `INVALID_RESPONSE` | 400 | An answer does not fit its question type (`isValidResponse()`) |
| `INVALID_CREDENTIALS` | 401 | Wrong roll number or password (one message for both) |
| `UNAUTHENTICATED` | 401 | No token, bad token, expired session, user missing or inactive |
| `ACCOUNT_INACTIVE` | 403 | Right password, but the account is turned off |
| `FORBIDDEN` | 403 | Wrong role, or a student touching another student's attempt |
| `NOT_FOUND` | 404 | Unknown id, malformed path id, unknown admin path, missing image file |
| `RESULTS_NOT_AVAILABLE` | 404 | Student asks for a result that is not visible yet |
| `EXAM_NOT_OPEN` | 409 | Exam is not published, or outside its window |
| `NO_ATTEMPTS_LEFT` | 409 | Student used every allowed attempt |
| `ATTEMPT_NOT_ACTIVE` | 409 | Action needs an attempt in a different state (already submitted, still in progress) |
| `ATTEMPT_HELD` | 409 | Release refused because the result is held for review |
| `TIME_UP` | 409 | Answer arrives after deadline plus 30 s grace, or the attempt ended at the deadline |
| `EXAM_LOCKED` | 409 | Editing questions of a published exam; deleting a non-draft; changing proctoring or unpublishing after a student started |
| `PAYLOAD_TOO_LARGE` | 413 | JSON body over 256 KB, or image over 1 MB |
| `NOT_PUBLISHABLE` | 422 | Publish refused; `error.problems` lists every problem |
| `RATE_LIMITED` | 429 | Five failed logins for one roll number within 15 minutes |
| `SERVER_ERROR` | 500 | Anything unexpected; `error.requestId` is set |

Source: `STATUS_BY_CODE` in `backend/lib/errors.js`; `bodyParserError()` in `backend/lib/http.js`; raising sites in `backend/lib/*.js`.

The Electron client adds three codes of its own that never come from the server: `SERVER_UNREACHABLE` (network failure or the 10 s timeout), `IPC_REJECTED` (the renderer asked for an unknown or internal route, or sent a malformed parameter) and `ANSWERS_PENDING` (submit was refused because queued answers could not be sent within 15 s). Source: `unreachable()`, `handleApiRequest()` and `submit()` in `app/electron/api.js`.

### Rate limits and size limits

Login is the only rate-limited route. Five failed logins for the same roll number (compared lower-case) within 15 minutes block that roll number with `429 RATE_LIMITED` until the oldest failure ages out. A successful login clears the count. The counter lives in memory, so restarting the server resets it, and at most 10,000 roll numbers are tracked (`LOGIN_LIMIT` in `backend/lib/constants.js`, `login()` and `recordFailure()` in `backend/lib/auth.js`). No other route has a request-rate limit.

| Limit | Value | Source |
|---|---|---|
| JSON body | 256 KB | `express.json({ limit: '256kb' })` in `backend/server.js` |
| Evidence image | 1 MB, must start with bytes `FF D8 FF` | `LIMITS.EVIDENCE_BYTES` in `backend/lib/constants.js`; `assertJpeg()` in `backend/lib/evidence.js` |
| Events per request | 50 | `LIMITS.EVENTS_PER_REQUEST` |
| Event `payload` | 2,000 characters of JSON | `PAYLOAD_MAX_CHARS` in `backend/routes/attempts.js` |
| Student import | 500 rows | `LIMITS.IMPORT_ROWS` |
| Live flag feed | 50 newest | `LIMITS.LIVE_FEED` |
| Renderer `params` | 256 KB | `MAX_PARAMS_BYTES` in `app/electron/api.js` |
| Client request timeout | 10 s (5 s for ping) | `REQUEST_TIMEOUT_MS`, `PING_TIMEOUT_MS` in `app/electron/api.js` |

Source: the files named in each row.

### How the Electron app calls the API

The renderer cannot make HTTP requests itself. It calls `window.athena.api(name, params)`, which becomes the IPC message `api:request` (`app/electron/preload.cjs`). Main rejects any name that is not in `ROUTES`, rejects names marked `internal`, fills `:params` in the path from `params`, sends what is left as a query string for `GET` and `DELETE` or as a JSON body otherwise, and returns `data` or throws the error code (`handleApiRequest()`, `fillPath()`, `buildInit()` in `app/electron/api.js`).

Three flags in the route table change this path. `internal: true` routes are called only by main. `queued: true` (only `answers.save`) goes to the durable queue in `app/electron/queue.js` and returns at once with `{ queued: true, online, queued }`. `remembersAttempt: true` (`attempts.start`, `attempts.get`) records the returned attempt so main knows which attempt it may enter and capture for (`rememberAttempt()` in `app/electron/exam.js`). `attempts.submit` is special-cased: main first flushes the answer queue, then submits, leaves the exam and marks the image manifest as submitted (`submit()` in `app/electron/api.js`).

| Internal route | Why the renderer cannot call it | Who calls it |
|---|---|---|
| `auth.login`, `auth.logout`, `auth.me` | The response carries or depends on the token, which must never reach the renderer | IPC handlers `auth:login`, `auth:logout`, `auth:me` in `app/electron/api.js` |
| `attempts.heartbeat` | Sent on a 10 s timer by main, with sensor values main reads itself | `beat()` in `app/electron/heartbeat.js` |
| `attempts.events` | Event batches come from main's durable queue, with `seq` numbers main assigns | `send()` in `app/electron/queue.js` |
| `attempts.evidence` | Raw JPEG bytes read from main's staging folder, not JSON | `uploadOne()` in `app/electron/evidence.js` via `requestRaw()` |
| `admin.evidence` | Returns image bytes; main converts them to a `data:` URL after checking `kind` and `file` | `adminImage()` in `app/electron/files.js` via `requestFile()` |
| `admin.results.csv` | Returns a CSV file; main writes it where the user chooses in a save dialog | `exportResultsCsv()` in `app/electron/files.js` |

Source: `ROUTES` in `app/electron/routes.js`; callers named in the last column.

---

## Health

The health check lets the client test that a server is there before anyone signs in. It needs no token and has no route name; main calls it directly for the `server:ping` IPC channel, where any HTTP answer counts as reachable (`handleServerPing()` in `app/electron/api.js`).

| Method and path | Role | Route name | Response `data` |
|---|---|---|---|
| `GET /api/health` | none | none (`server:ping`) | `{ status: "ok", serverNow }` |

Source: `createApp()` in `backend/server.js`.

---

## Auth

These three routes open, check and close a session. All three are internal in the Electron route table, because the token stays in main.

| Method and path | Role | Route name | Request | Response `data` | Notable errors |
|---|---|---|---|---|---|
| `POST /api/auth/login` | none | `auth.login` (internal) | `rollNo` string, required, 1 to 64 chars, trimmed; `password` string, required, 1 to 64 chars, not trimmed | `{ token, expiresAt, user: { id, rollNo, name, role } }` | `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `RATE_LIMITED`, `VALIDATION_FAILED` |
| `POST /api/auth/logout` | any signed-in | `auth.logout` (internal) | none | `{ ok: true }` | `UNAUTHENTICATED` |
| `GET /api/auth/me` | any signed-in | `auth.me` (internal) | none | `{ user: { id, rollNo, name, role } }` | `UNAUTHENTICATED` |

Source: `backend/routes/auth.js`; `login()`, `logout()`, `publicUser()` in `backend/lib/auth.js`.

Roll numbers match case-insensitively (`findByRollNo()`). Login also records `lastLoginAt` on the user and drops expired sessions from `sessions.json` (`createSession()`). Logout deletes only the session for the token that was sent.

---

## Student: exams and attempts

These routes carry a student from the dashboard through one exam: list, details, start or resume, answer, submit, receipt and result. Every attempt route first checks that the attempt belongs to the caller and answers `403 FORBIDDEN` otherwise (`ownAttempt()` in `backend/lib/attempts.js`). Overdue attempts are finished lazily: whenever an attempt is read and the time is past its deadline plus 30 seconds, it is scored and submitted with reason `deadline` before the response is built (`closeIfOverdue()` and `refreshAttempts()` in `backend/lib/finalize.js`). There is no background job.

| Method and path | Route name | Electron handling |
|---|---|---|
| `GET /api/exams` | `exams.list` | direct |
| `GET /api/exams/:examId` | `exams.get` | direct |
| `POST /api/exams/:examId/attempts` | `attempts.start` | direct, remembers attempt |
| `GET /api/attempts/:attemptId` | `attempts.get` | direct, remembers attempt |
| `PUT /api/attempts/:attemptId/answers/:questionId` | `answers.save` | queued |
| `POST /api/attempts/:attemptId/heartbeat` | `attempts.heartbeat` | internal |
| `POST /api/attempts/:attemptId/evidence` | `attempts.evidence` | internal |
| `POST /api/attempts/:attemptId/events` | `attempts.events` | internal; legacy |
| `POST /api/attempts/:attemptId/submit` | `attempts.submit` | direct, after queue flush |
| `GET /api/attempts/:attemptId/receipt` | `attempts.receipt` | direct |
| `GET /api/attempts/:attemptId/result` | `attempts.result` | direct |

Source: `backend/routes/exams.js`, `backend/routes/attempts.js`, `app/electron/routes.js`.

### GET /api/exams

Lists every published exam as a card. Every student sees every published exam; there are no class groups (`listForStudent()` in `backend/lib/studentExams.js`). Cards are sorted by `opensAt`.

`data` is `{ exams: Card[], serverNow }`. Each card has `id`, `code`, `title`, `description`, `questionCount`, `totalMarks`, `durationMinutes`, `opensAt`, `closesAt`, `maxAttempts`, `attemptsUsed`, `attemptsLeft`, `myStatus`, `openAttemptId`, `deadlineAt` (of the open attempt), `lastAttemptId`, `submittedAt`, `resultVisible`, `lastPercent` (only when the result is visible) and `resultVisibility` (`after_submit` or `after_publish`). `myStatus` is one of `in_progress`, `open`, `upcoming`, `submitted`, `closed` (`myStatus()` and `examCard()`).

### GET /api/exams/:examId

Returns one card plus what the pre-test screens need: `instructions`, `terms`, `termsVersion` (the date part of `termsUpdatedAt`), `resultPolicy: { visibility, passPercent }`, `proctoring` (the student view of the proctoring config, see below), `proctoringSummary: { enabled, lines[], text }`, `canStart` and `cannotStartReason` (`null`, `EXAM_NOT_OPEN` or `NO_ATTEMPTS_LEFT`). The response never contains questions. A draft or unknown exam is `404 NOT_FOUND`. Source: `getForStudent()` and `cannotStartReason()` in `backend/lib/studentExams.js`.

The `proctoring` object still matters after 2026-10-25 for one reason: its `screenshots.minSec` and `screenshots.maxSec` set the capture interval, which reaches the app through `attempts.start` (`rememberAttempt()` in `app/electron/exam.js`). Its `rules.clipboard` settings still drive the copy-and-paste block in the exam room (`app/src/features/exam/useClipboardBlock.js`). The other rule settings no longer do anything in the app.

### POST /api/exams/:examId/attempts

Starts an attempt, or returns the open one. A per-student, per-exam lock stops a double click from creating two attempts (`startAttempt()` in `backend/lib/attempts.js`). If the student already has an attempt `in_progress` for this exam, it is returned with `resumed: true` and HTTP 200, and the consent is not checked again. Otherwise the server checks the window, the attempt count and consent, creates the attempt and answers HTTP 201 with `resumed: false`.

| Field | Type and rule | Notes |
|---|---|---|
| `consent` | object, required | |
| `consent.terms` | boolean, default `false` | Must be `true` |
| `consent.capture` | boolean, default `false` | Must be `true` when `exam.proctoring.enabled` |
| `consent.events` | boolean, default `false` | Must be `true` when `exam.proctoring.enabled` |
| `consent.termsVersion` | string, at most 40 chars | Stored, not checked |
| `systemCheck` | object, optional | Stored on the attempt as given |
| `systemCheck.camera`, `.light`, `.screen` | string, at most 20 chars | The app sends `camera` only |
| `systemCheck.face` | `ok`, `unavailable` or `failed` | Legacy; `unavailable` sets `attempt.faceDetection`. The app no longer sends it |
| `systemCheck.displays` | integer 0 to 16 | |

Source: `backend/routes/exams.js`; `checkConsent()` and `newAttempt()` in `backend/lib/attempts.js`; `checkSummary()` in `app/src/features/pretest/checks.js`.

The seeded exams all use proctoring presets with `enabled: true`, so all three consent boxes are required for them (`backend/scripts/seed.js`, `PRESETS` in `backend/lib/proctoring.js`). The deadline is the earlier of start plus `durationMinutes` and the exam's `closesAt` (`newAttempt()`).

`data` is the exam-room view, the same shape as `GET /api/attempts/:attemptId`, plus `resumed`:

| Key | Content |
|---|---|
| `attempt` | `id`, `code` (such as `ATH-DX9A-KNST`), `examId`, `attemptNo`, `status`, `submitReason`, `startedAt`, `deadlineAt`, `submittedAt`, `serverNow`, `flagCount`, `maxFlags`, `questionCount`, `answeredCount`, `resultVisible` |
| `exam` | `id`, `code`, `title`, `durationMinutes` |
| `questions` | In this attempt's order; each `{ id, type, text, marks, topic, config }` with the key removed and lists in this attempt's shuffled order |
| `answers` | Map of question id to `{ response, revision, timeSpentSec, marked }` |
| `proctoring` | `enabled`, `preset`, `maxFlags`, `autoEnd`, `screenshots`, `cameraPhotos`, `blockMultipleDisplays`, `rules` |
| `flags` | Legacy; always empty in practice |
| `resumed` | `true` or `false` |

Source: `examRoomView()` and `attemptSummary()` in `backend/lib/attemptViews.js`; `studentQuestion()` in `backend/lib/questions.js`; `studentProctoring()` in `backend/lib/proctoring.js`.

Errors: `EXAM_NOT_OPEN` (draft, before `opensAt` or at or after `closesAt`), `NO_ATTEMPTS_LEFT`, `VALIDATION_FAILED` with `fields["consent.terms"]` and friends, `NOT_FOUND`.

### GET /api/attempts/:attemptId

Returns the exam-room view above without `resumed`. The app uses it to resume after a relaunch or reload. If the attempt is overdue it is finished first, so the response can show `status: "submitted"` with `submitReason: "deadline"` (`getAttempt()` in `backend/lib/attempts.js`).

### PUT /api/attempts/:attemptId/answers/:questionId

Saves one answer. Each save carries a `revision` number, and a revision that is not newer than the stored one changes nothing and reports `applied: false`. That makes retries from the offline queue safe, and stops a slow old request from overwriting a newer answer (`saveAnswer()` in `backend/lib/attempts.js`).

| Field | Type and rule |
|---|---|
| `revision` | integer, required, 1 to 1,000,000,000 |
| `response` | required, may be `null` (clears the answer); shape depends on the question type |
| `timeSpentSec` | integer 0 to 86,400, default 0 |
| `marked` | boolean, default `false` (marked for review) |

Source: `backend/routes/attempts.js`.

`data` is `{ applied: true, revision }` or `{ applied: false, revision: <stored revision> }`. Errors: `INVALID_RESPONSE` (wrong shape for the type, see [Question types](#question-types-and-scoring)), `NOT_FOUND` (question not in this attempt), `TIME_UP` (more than 30 s past the deadline, `TIMING.ANSWER_GRACE_MS`), `ATTEMPT_NOT_ACTIVE` (already submitted). The Electron queue drops an item on `VALIDATION_FAILED`, `INVALID_RESPONSE`, `NOT_FOUND`, `FORBIDDEN`, `TIME_UP`, `ATTEMPT_NOT_ACTIVE`, `IPC_REJECTED` or `PAYLOAD_TOO_LARGE`, and keeps and retries it on anything else (`PERMANENT_CODES` in `app/electron/queue.js`).

### POST /api/attempts/:attemptId/heartbeat

Main sends a heartbeat every 10 seconds while an exam is open. The server records `lastSeenAt` and the sensor values, notes a gap when more than 30 seconds passed since the last one, and answers with its clock and the current deadline. The app uses `serverNow` to correct its timer and `deadlineAt` to pick up extensions; when the answer contains `forced`, the attempt has ended on the server and the app leaves the exam (`heartbeat()` in `backend/lib/events.js`, `beat()` in `app/electron/heartbeat.js`).

| Field | Type and rule | Sent by the app |
|---|---|---|
| `seq` | integer 0 to 1e9 | yes |
| `sensors.fullscreen`, `.focused`, `.online` | boolean | yes |
| `sensors.displays` | integer 0 to 16 | yes |
| `sensors.camera` | `live`, `lost`, `off`, `unknown` | no (legacy) |
| `sensors.faces` | integer 0 to 20 or `null` | no (legacy) |
| `sensors.faceDetector` | `ok`, `loading`, `unavailable`, `off` | no (legacy) |
| `events` | event list as in the events route, default `[]` | always `[]` |

Source: `backend/routes/attempts.js`; `sensors()` and `beat()` in `app/electron/heartbeat.js`.

`data` is `{ serverNow, deadlineAt, status, submitReason, flagCount, maxFlags, warnings, forced? }`, where `forced` is `{ submitReason }` and appears only when the attempt is no longer in progress. `flagCount`, `maxFlags` and `warnings` are legacy. Heartbeat gaps no longer feed anything the app shows, but they are still stored on the attempt (`withHeartbeat()`).

### POST /api/attempts/:attemptId/evidence

Uploads one image, as the raw request body with `Content-Type: image/jpeg`. Metadata travels in the query string. The worker in main uploads each staged image, oldest first, and keeps going after submit until its manifest is empty, so uploads are accepted for submitted attempts too (`uploadEvidence()` in `backend/lib/evidence.js`, `uploadOne()` in `app/electron/evidence.js`).

| Query parameter | Type and rule |
|---|---|
| `kind` | required: `screen`, `camera` or `identity` |
| `seq` | required integer 0 to 1e9 (the client's manifest sequence number) |
| `capturedAt` | required ISO 8601 date-time |
| `reason` | `interval`, `flag`, `identity`, `resume` or `manual`; default `interval` |

Source: `backend/routes/attempts.js`; `EVIDENCE_KINDS`, `EVIDENCE_REASONS` in `backend/lib/constants.js`.

The upload is idempotent on the pair (`kind`, `seq`): a repeat returns the first file name with `duplicate: true` and writes nothing. The server saves the file under `backend/screenshots/<Candidate_Name>/<Test_Name>/{webcam,screen}/` and names it from the candidate, the test and `capturedAt` in the server's local time. `camera` and `identity` both go to `webcam/`. When a name is taken in the same second, `_2`, `_3` and so on up to `_99` are tried. `docs/DATA_AND_STORAGE.md` has the full naming rules.

`data` is `{ file, duplicate }` with HTTP 201, where `file` is `<kind>/<file name>.jpg`. The API keeps the kind as the first part even though the folder on disk is `webcam/` for camera and identity photos. Observed example: `{ "file": "camera/Dev_Khanna-CLI_Apps-2026-10-25_22-52-21_2.jpg", "duplicate": false }`. An `identity` upload also sets `attempt.identityPhoto` (`saveCapture()`).

Errors: `VALIDATION_FAILED` with `fields.body` "This is not a JPEG image" or "Send the image bytes as image/jpeg", `PAYLOAD_TOO_LARGE` over 1 MB, `VALIDATION_FAILED` "Too many images in the same second." after 99 clashes, `FORBIDDEN`, `NOT_FOUND`.

### POST /api/attempts/:attemptId/events (legacy, unused since 2026-10-25)

This route took proctoring events (fullscreen exits, focus loss, faces) and turned counted ones into flags. Nothing in the app reports those events any more: the renderer helper `examEvent` in `app/src/lib/api.js` has no callers, and `app/electron/detectors.js` is an empty placeholder. One sender remains: when a student quits during an exam, main queues an `app_quit` event (`confirmQuit()` in `app/electron/exam.js`), which the queue sends here. `app_quit` is an information event and never creates a flag (`INFO_EVENTS` in `backend/lib/constants.js`).

| Field | Type and rule |
|---|---|
| `events` | array, required, 1 to 50 items |
| `events[].seq` | integer, required, 0 to 1e9; repeats are ignored |
| `events[].type` | required; one of the counted types `fullscreen_exit`, `window_blur`, `display_added`, `camera_lost`, `no_face`, `multiple_faces`, `system_sleep`, `screen_locked`, `clipboard_attempt`, `idle`, or the information types `face_too_far`, `low_light`, `face_detection_unavailable`, `camera_restored`, `display_removed`, `network_offline`, `network_online`, `app_quit`, `app_resumed`, `system_resume` |
| `events[].phase` | `start` or `end` |
| `events[].clientTs` | ISO date-time; clamped between attempt start and now |
| `events[].questionId` | id pattern |
| `events[].payload` | object, at most 2,000 characters as JSON |

Source: `backend/routes/attempts.js`; `CLIENT_EVENT_TYPES` in `backend/lib/constants.js`; `recordEvents()` and `ingest()` in `backend/lib/events.js`.

`data` is `{ accepted, warnings, forced? }`. Events are appended to `events.jsonl`. Events arriving up to 2 minutes after submit are stored but never flag anything; later ones get `ATTEMPT_NOT_ACTIVE` (`canTakeEvents()`, `TIMING.LATE_EVENT_MS`). The flag engine in `backend/lib/flags.js` would still flag a counted event type if a client sent one, and reaching the flag limit would still end the attempt with reason `flag_limit`. The current app never sends such events.

### POST /api/attempts/:attemptId/submit

Submits the attempt: every answer is scored, the score saved and result visibility worked out (`finishAttempt()` in `backend/lib/finalize.js`). It is idempotent, so a second submit returns the same receipt. In the app, main first tries for 15 s to send every queued answer and throws `ANSWERS_PENDING` if it cannot (`submit()` in `app/electron/api.js`). No body.

`data` is the receipt: `{ code, attemptId, attemptNo, status, submitReason, examId, examTitle, examCode, studentName, startedAt, submittedAt, received, total, flagCount, resultVisible, resultVisibility }`, where `received` is the number of answered questions and `total` the number asked (`receiptView()` in `backend/lib/attemptViews.js`). `submitReason` is `student`, `deadline`, `admin` or (legacy) `flag_limit` (`SUBMIT_REASONS` in `backend/lib/constants.js`).

### GET /api/attempts/:attemptId/receipt

Returns the same receipt as submit, for the done page and for the PDF receipt (`getReceipt()`).

### GET /api/attempts/:attemptId/result

Returns the full result once `attempt.resultVisibleAt` is set, and `404 RESULTS_NOT_AVAILABLE` before that (`getResult()`). This is the only student response that includes answer keys and explanations.

`data` is `{ attemptId, examId, examTitle, examCode, submittedAt, submitReason, resultVisibleAt, resultsPublishedAt, score, maxScore, percent, outcome, passPercent, questions[] }`. `percent` has one decimal; `outcome` is `Passed`, `Not passed` or `Disqualified`. Each question is the student view plus `key`, `explanation`, `response`, `marksAwarded`, `result` (`correct`, `partial`, `wrong`, `unanswered`), `marked` and `timeSpentSec`. Source: `resultView()` and `reviewQuestion()` in `backend/lib/attemptViews.js`; `scoreSummary()` and `outcomeOf()` in `backend/lib/visibility.js`.

When a result becomes visible depends on the exam's `resultPolicy.visibility`. With `after_submit` it is visible at submit. With `after_publish` it becomes visible when the admin publishes results or releases that one attempt. A result is held (kept hidden) only when the attempt ended at the flag limit, the exam has `holdAutoEnded: true` and no review decision was made (`isHeld()` and `withVisibility()` in `backend/lib/visibility.js`). Since no attempt can reach the flag limit through the current app, holding is effectively unused.

---

## Student: me

Two read-only routes give a student their own history and analytics.

| Method and path | Role | Route name | Response `data` |
|---|---|---|---|
| `GET /api/me/attempts` | student | `me.attempts` | `{ attempts[] }`, newest first |
| `GET /api/me/analytics` | student | `me.analytics` | `{ tiles, trend, byTopic, byType, timePerQuestion, integrity }` |

Source: `backend/routes/me.js`; `myAttemptList()` and `myAnalytics()` in `backend/lib/results.js`; `studentAnalytics()` in `backend/lib/analytics.js`.

Each attempt row has `id`, `code`, `examId`, `examTitle`, `examCode`, `attemptNo`, `status`, `submitReason`, `startedAt`, `deadlineAt`, `submittedAt`, `resultVisible`, `resultVisibility`, `score`, `maxScore`, `percent`, `outcome` and `passPercent`. The four score fields are `null` until the result is visible.

Analytics use only attempts whose result is visible. `tiles` is `{ examsTaken, averagePercent, bestPercent, flagsPerExam }`; `trend` lists `{ attemptId, examId, examTitle, submittedAt, percent }` in date order; `byTopic` and `byType` list `{ topic | type, accuracy, questions }`, where accuracy is earned marks over possible marks in percent; `timePerQuestion` is `{ me, classMedian }` in seconds. `flagsPerExam` and `integrity` (`{ attemptId, examTitle, flagCount }[]`) are legacy and read zero.

---

## Admin: home and exams

The examiner's exam routes create, edit, publish and unpublish exams. An exam starts as a draft with sample terms, the `standard` proctoring preset and results shown after publish (`blankExam()` in `backend/lib/exams.js`). Most routes return the full admin view of the exam, which includes answer keys.

| Method and path | Route name | Request | Response `data` |
|---|---|---|---|
| `GET /api/admin/home` | `admin.home` | none | `{ tiles, attention[], recent[] }` |
| `GET /api/admin/exams` | `admin.exams.list` | none | `{ exams: Row[] }`, newest `updatedAt` first |
| `POST /api/admin/exams` | `admin.exams.create` | `title` required 1 to 120; `code` optional; `description` optional, at most 2,000; `copyFromId` optional id | `{ exam }`, HTTP 201 |
| `GET /api/admin/exams/:examId` | `admin.exams.get` | none | `{ exam }` |
| `PATCH /api/admin/exams/:examId` | `admin.exams.update` | `title`, `code`, `description` (all optional) | `{ exam }` |
| `DELETE /api/admin/exams/:examId` | `admin.exams.delete` | none | `{ deleted: true }` |
| `PUT /api/admin/exams/:examId/settings` | `admin.exams.updateSettings` | `settings` object, required | `{ exam }` |
| `PUT /api/admin/exams/:examId/proctoring` | `admin.exams.updateProctoring` | `proctoring` object, required | `{ exam }` |
| `POST /api/admin/exams/:examId/publish` | `admin.exams.publish` | `dryRun` boolean, default `false` | checklist, plus `exam` when published |
| `POST /api/admin/exams/:examId/unpublish` | `admin.exams.unpublish` | none | `{ exam }` |
| `POST /api/admin/exams/:examId/extend-in-progress` | `admin.exams.extendInProgress` | `minutes` integer 1 to 180; `reason` 1 to 200 chars | `{ extended, attempts[] }` |

Source: `backend/routes/admin/exams.js`, `backend/routes/admin/live.js`; `backend/lib/exams.js`; `homeView()` in `backend/lib/live.js`.

**Home.** `tiles` is `{ liveExams, writing, toReview, resultsReady }`. `attention` lists items of kind `review`, `publish_results` or `draft_problems`, each with `examId`, `examTitle`, `count` and a `message`. `recent` lists the last 10 submissions with `at`, `kind` (the submit reason), `attemptId`, `examId`, `examTitle`, `studentName`, `score`, `maxScore` and a sentence in `text` (`attentionItems()`, `recentActivity()`).

**List row.** `id`, `code`, `title`, `status`, `displayStatus`, `questionCount`, `totalMarks`, `durationMinutes`, `opensAt`, `closesAt`, `attemptsStarted`, `inProgress`, `pendingReview`, `studentCount` (active students), `resultVisibility`, `resultsPublishedAt`, `problemCount`, `updatedAt` (`listRow()`). `displayStatus` is `draft`, `published` (window not open yet), `live` or `closed` (`displayStatus()` in `backend/lib/examStore.js`).

**Admin exam view.** The stored exam (see `docs/DATA_AND_STORAGE.md`, exams.json) plus `displayStatus`, `totalMarks`, `termsVersion`, `locked: { questions, proctoring, duration, attempts }`, `problems`, `warnings`, `counts: { started, submitted, inProgress, meanPercent, flagged, pendingReview, students }` and `proctoringSummary` (`adminExam()` in `backend/lib/exams.js`).

**Create.** `code` must match `^[A-Z0-9][A-Z0-9-]{0,15}$`; without one, the server makes one from the title, such as `DOC-01` (`makeCode()`). With `copyFromId`, settings and questions are copied (questions get new ids) and the copy starts as a draft (`copiedExam()`).

**Delete.** Only drafts can be deleted; otherwise `409 EXAM_LOCKED`. Attempts are not checked here, but a draft that had attempts would have to have been unpublished, which is refused once anyone started.

**Settings.** `settings` may be partial. Fields: `durationMinutes` integer 1 to 600; `opensAt` and `closesAt` ISO date-time or `null`; `maxAttempts` integer 1 to 10; `shuffleQuestions`, `shuffleOptions` booleans; `instructions` at most 5,000 chars; `terms` at most 20,000 chars (changing it updates `termsUpdatedAt`); `resultPolicy.visibility` `after_submit` or `after_publish`; `resultPolicy.passPercent` 0 to 100; `resultPolicy.holdAutoEnded` boolean (`SETTINGS_FIELDS`). Once any attempt exists, `durationMinutes` and `maxAttempts` cannot change, `opensAt` cannot move later than the earliest start and `closesAt` cannot be in the past (`lockedSettingErrors()`). A published exam's window must stay valid (`publishedWindowErrors()`). These rule failures are `VALIDATION_FAILED` with `fields`. A draft can be saved with an invalid window; the publish checklist catches it. After saving, result visibility is re-applied to every attempt of the exam (`syncExam()`).

**Proctoring.** Send either `{ preset: "standard" | "lenient" | "monitor" | "off" }` alone, or a full or partial config merged over the current one (`parseProctoring()` in `backend/lib/proctoring.js`). Since 2026-10-25 the only parts with an effect in the app are `screenshots.minSec` and `screenshots.maxSec` (each 10 to 3,600 s, max at least min), which set the capture interval, and `rules.clipboard.on`, `blockCopyPaste` and `blockContextMenu`, which block copy, paste and the context menu (`app/electron/capture.js`, `app/src/features/exam/useClipboardBlock.js`). `enabled` still decides whether consent to capture and events is required at start. `autoEnd`, `cameraPhotos`, `blockMultipleDisplays` and the other rules are stored but unused. Refused with `EXAM_LOCKED` once a student has started.

**Publish.** With `dryRun: true`, or when the exam is already published, it returns the checklist without changing anything: `{ publishable, problems[], warnings[], summary: { questionCount, totalMarks, durationMinutes, opensAt, closesAt }, status }`. Otherwise it publishes, adding `exam`, or answers `422 NOT_PUBLISHABLE` with `error.problems` and `error.warnings`. Problem codes are `NO_QUESTIONS`, `QUESTION` (with `questionId`), `WINDOW_MISSING`, `WINDOW_ORDER`, `WINDOW_SHORT` and `DURATION`; warning codes are `PROCTORING_OFF`, `RESULTS_EARLY` and `WINDOW_PAST` (`checklist()` in `backend/lib/checklist.js`). Warnings never block publishing.

**Unpublish.** Returns a published exam to draft. Refused with `EXAM_LOCKED` once any attempt exists; the message suggests duplicating instead (`unpublishExam()`).

**Extend in progress.** Adds `minutes` to the deadline of every attempt of the exam still in progress and logs an `admin_extended` event for each. Attempts that fail (for example, one that turned out to be overdue) are skipped silently. `attempts` lists `{ attemptId, deadlineAt }` for those extended (`extendInProgress()` in `backend/lib/review.js`).

---

## Admin: questions

Questions belong to an exam and can be changed only while it is a draft; on a published exam these routes answer `409 EXAM_LOCKED` ("Unpublish (no one has started) or duplicate the exam to make changes."). Preview scoring is the exception and works on published exams too (`assertEditable()` and `previewScore()` in `backend/lib/examQuestions.js`).

| Method and path | Route name | Request | Response `data` |
|---|---|---|---|
| `POST /api/admin/exams/:examId/questions` | `admin.questions.create` | `type` required; `text`, `marks`, `topic`, `explanation`, `config`, `key` optional; `afterId` optional | `{ question }`, HTTP 201 |
| `PATCH /api/admin/exams/:examId/questions/:questionId` | `admin.questions.update` | any of `type`, `text`, `marks`, `topic`, `explanation`, `config`, `key` | `{ question }` |
| `DELETE /api/admin/exams/:examId/questions/:questionId` | `admin.questions.delete` | none | `{ deleted: true }` |
| `PUT /api/admin/exams/:examId/questions/order` | `admin.questions.reorder` | `order`: array of every question id exactly once, at most 500 | `{ order }` |
| `POST /api/admin/exams/:examId/questions/:questionId/preview-score` | `admin.questions.previewScore` | `response` required, may be `null` | `{ marksAwarded, marks, result }` |

Source: `backend/routes/admin/exams.js`; `backend/lib/examQuestions.js`; `parseQuestion()` in `backend/lib/questions.js`.

Shared fields: `text` at most 5,000 chars; `marks` a number from 0.5 to 100 (default 1); `topic` at most 60 chars; `explanation` at most 3,000 chars (`SHARED_FIELDS` in `backend/lib/questions.js`). The returned `question` is the stored question plus `problems`, a list of short phrases that would block publishing (such as `"no correct option"`). A new question is appended, or placed right after `afterId` when that id exists. On update, missing fields keep their values. Changing `type` clears `config` and `key` unless new ones are sent. If the builder sends new `config` without a `key` and the old key no longer fits, the key is cleared instead of failing the save (`parseTypePart()`). List items sent without an id get one, so an option can be added and saved in one request (`parseItems()` in `backend/lib/scoring/common.js`).

### Question types and scoring

Athena has seven auto-graded question types. Each lives in its own module under `backend/lib/scoring/` with the same parts: parse the builder's definition, list publish problems, validate a student response, score it, build the student's view without the key, label a wrong answer for analytics, and say which list gets shuffled (`backend/lib/scoring/index.js`).

| Type | `config` | `key` | Student `response` | Scoring |
|---|---|---|---|---|
| `single` | `{ options: [{ id, text }] }`, at most 8 | `{ optionId }` | `{ optionId }` | Full marks if `optionId` equals the key, else 0 |
| `multi` | `{ options: [{ id, text }], scoring: "all_or_nothing" \| "partial" }`, at most 8; default `all_or_nothing` | `{ optionIds: [] }` | `{ optionIds: [] }`, no duplicates | `all_or_nothing`: full marks only for exactly the key set. `partial`: marks times max(0, (right minus wrong) / number correct) |
| `true_false` | `{}` | `{ value: true \| false }` | `{ value: true \| false }` | Full marks if equal, else 0 |
| `short_text` | `{ maxChars }`, 1 to 100, default 100 | `{ accepted: [string], caseSensitive }`, up to 20 answers of at most 100 chars | `{ text }`, at most `maxChars` | Trim, collapse spaces, lower-case unless `caseSensitive`; full marks if it equals any accepted answer. Blank scores 0. Never a regex |
| `numeric` | `{ unit }`, at most 16 chars or `null` | `{ answer: number, tolerance: number >= 0 }` | `{ number }`, finite | Full marks if within the tolerance (plus 1e-9 for floating point), else 0 |
| `ordering` | `{ items: [{ id, text }], scoring: "positional" \| "exact" }`, at most 8; default `positional` | `{ order: [ids] }`, defaults to the authored order | `{ order: [ids] }`, every item once | `exact`: full marks only for the whole order. `positional`: marks times items in the right place / items |
| `matching` | `{ left: [{ id, text }], right: [{ id, text }] }`, at most 8 left and 12 right | `{ pairs: { leftId: rightId } }` | `{ pairs: { leftId: rightId \| null } }` | Marks times correct pairs / left items |

Source: `backend/lib/scoring/single.js`, `multi.js`, `trueFalse.js`, `shortText.js`, `numeric.js`, `ordering.js`, `matching.js`.

Three rules apply to every type (`scoreAnswer()` in `backend/lib/scoring/index.js`). A `null` or missing response scores 0, and so does a response that fails validation. The raw score is clamped between 0 and the question's marks, so there is no negative marking. The result is rounded half-up to 2 decimals (`round2()`). The outcome label is `correct` at full marks, `partial` above 0, `wrong` at 0 and `unanswered` with no response (`outcomeOf()`).

Students never see the key during the exam, with one deliberate exception: a `short_text` question shows `caseSensitive`, so the student knows when case matters (`studentConfig()` in `shortText.js`). Options of `single` and `multi` are shuffled per attempt when the exam's `shuffleOptions` is on. `ordering` items and `matching` right-hand items are always shuffled, because the builder stores them in the correct order, and the shuffle is retried up to 10 times until it differs from that order (`shuffle` in each module; `buildOptionOrder()` and `shuffledIds()` in `backend/lib/attempts.js`). Question order is shuffled when `shuffleQuestions` is on.

Publish problems per type: `single` and `multi` need at least 2 options with text and a correct option; `true_false` needs a value; `short_text` needs an accepted answer; `numeric` needs an answer; `ordering` needs at least 2 items with text; `matching` needs at least 2 items on each side and a match for every left item (`keyProblems()` in each module). Every type also needs question text (`questionProblems()` in `backend/lib/questions.js`).

As an observed example, a `multi` question worth 2 marks with `partial` scoring and key `{a, b}`, answered `{a, c}`, scores 2 times max(0, (1 minus 1) / 2) = 0, and preview-score returned `{ "marksAwarded": 0, "marks": 2, "result": "wrong" }`.

---

## Admin: users

These routes manage student accounts. Admin accounts cannot be listed, created or changed through the API; `getStudent()` answers `NOT_FOUND` for a non-student id (`backend/lib/users.js`). Generated passwords look like `K7Q4-M2XB-9F3C`, drawn with `crypto.randomInt` from an alphabet without I, L, O, 0 and 1 (`generatePassword()` in `backend/lib/ids.js`), and are returned exactly once.

| Method and path | Route name | Request | Response `data` |
|---|---|---|---|
| `GET /api/admin/users` | `admin.users.list` | none | `{ users[] }`, sorted by roll number |
| `POST /api/admin/users` | `admin.users.create` | `rollNo` required 2 to 32, `^[A-Za-z0-9._-]{2,32}$`; `name` required 1 to 80; `password` optional 8 to 64 | `{ user, password }`, HTTP 201; `password` is `null` if one was supplied |
| `POST /api/admin/users/import` | `admin.users.import` | `rows`: 1 to 500 objects `{ rollNo, name }`; `dryRun` boolean, default `true` | `{ dryRun, rows[], counts, created[] }` |
| `PATCH /api/admin/users/:userId` | `admin.users.update` | `name` 1 to 80; `active` boolean | `{ user }` |
| `POST /api/admin/users/:userId/reset-password` | `admin.users.resetPassword` | none | `{ password }` |

Source: `backend/routes/admin/users.js`; `backend/lib/users.js`.

A user row is `{ id, rollNo, name, active, attempts, lastActiveAt, createdAt }`, where `lastActiveAt` is the latest of `lastLoginAt` and the student's attempts' `lastSeenAt` (`studentRow()`). A duplicate roll number (case-insensitive) is `VALIDATION_FAILED` with `fields.rollNo`. Import checks every row and gives each a `status` of `ready`, `exists` or `problem` with a `problem` phrase; with `dryRun: false` it creates the ready rows and returns `created: [{ rollNo, name, password }]` (`importStudents()`). Note that `dryRun` defaults to `true` here but to `false` on the publish routes. Setting `active: false` and resetting a password both sign the student out everywhere (`endSessionsFor()`).

---

## Admin: live monitor and review

These routes let the examiner watch a running exam and act on single attempts. The live view and attempt detail are in daily use. The review queue, flag dismissal, review decisions and resume are proctoring-era routes; the server still serves them, but the renderer no longer calls them (a search of `app/src` for their route names finds no callers).

| Method and path | Route name | Status | Request | Response `data` |
|---|---|---|---|---|
| `GET /api/admin/exams/:examId/live` | `admin.live` | in use | query `since` ISO date-time, optional | `{ serverNow, exam, counters, attempts[], feed[] }` |
| `GET /api/admin/attempts/:attemptId` | `admin.attempts.get` | in use | none | attempt detail, below |
| `POST /api/admin/attempts/:attemptId/extend` | `admin.attempts.extend` | in use | `minutes` 1 to 180; `reason` 1 to 200 | `{ attemptId, deadlineAt }` |
| `POST /api/admin/attempts/:attemptId/end` | `admin.attempts.end` | in use | `reason` 1 to 200 | `{ attemptId, status, submitReason, remainingSecAtEnd }` |
| `POST /api/admin/attempts/:attemptId/release` | `admin.attempts.release` | in use | none | `{ attemptId, resultVisibleAt }` |
| `GET /api/admin/exams/:examId/review-queue` | `admin.reviewQueue` | not called by the app | query `status`, `rule`, `sort` | `{ queue[], pendingCount }` |
| `POST /api/admin/attempts/:attemptId/resume` | `admin.attempts.resume` | not called by the app | `extraFlags` 0 to 20, default 0; `reason` 1 to 200 | `{ attemptId, status, deadlineAt, flagCount, maxFlags }` |
| `POST /api/admin/attempts/:attemptId/flags/:flagId/dismiss` | `admin.flags.dismiss` | legacy, unused since 2026-10-25 | `note` 1 to 500 | `{ flag, flagCount, risk? }` |
| `PUT /api/admin/attempts/:attemptId/review` | `admin.attempts.review` | legacy, unused since 2026-10-25 | `status` `pending`, `cleared`, `suspicious`, `disqualified`; `note` at most 1,000 | `{ review, held, resultVisible, score, maxScore, percent, outcome, passPercent }` |

Source: `backend/routes/admin/live.js`, `backend/routes/admin/review.js`; `backend/lib/live.js`, `backend/lib/review.js`; route usage counted with a search of `app/src`.

**Live view.** `exam` is `{ id, title, displayStatus }`; `counters` is `{ writing, flagged, needsAttention, endedByFlags, submitted }`. Each attempt card has `id`, `code`, `student: { id, rollNo, name }`, `status`, `submitReason`, `startedAt`, `deadlineAt`, `lastSeenAt`, `answered`, `questionCount`, `secondsSinceSeen`, `timeLeftSec`, `flagCount`, `maxFlags`, `risk: { score, level }`, `sensors`, `latestScreenshot` (the `file` of the newest screen image, or `null`) and `needsAttention`, which is true when an in-progress attempt has been silent for more than 30 s (`liveCard()`, `needsAttention()`). `feed` lists flags newer than `since`, so it is empty in practice. `flagged`, `endedByFlags`, `flagCount`, `maxFlags`, `risk` and `feed` are legacy.

**Attempt detail.** `data` has `attempt` (the stored record without `eventSeqs`, plus `maxFlags`, `held`, `score`, `maxScore`, `percent`, `outcome`, `passPercent`), `student`, `exam: { id, code, title, durationMinutes, maxFlags, resultPolicy }`, `identityPhoto`, `flags`, `events`, `captures`, `risk`, `heartbeatGaps` and `answers` (every question with key, response and marks, as in the student result). `flags`, `events` and `captures` each carry an `offsetSec` from the attempt start, and `captures` is sorted by it. Each capture is `{ file, kind, seq, capturedAt, reason, receivedAt, bytes, offsetSec }` (`attemptDetail()` in `backend/lib/review.js`). The review screen loads each image through the evidence download below.

**Extend and end.** Both need an attempt in progress (`ATTEMPT_NOT_ACTIVE` otherwise) and append an `admin_extended` or `admin_ended` event to `events.jsonl`. The student's app picks up a new deadline, or a forced end, at its next heartbeat. End submits with reason `admin`.

**Release.** Makes one submitted attempt's result visible now, or keeps the earlier time if already visible. Refused with `ATTEMPT_NOT_ACTIVE` if still in progress and `ATTEMPT_HELD` if held (`releaseResult()`).

**Review queue (not called by the app).** Query `status` is `pending` (default), `cleared`, `suspicious`, `disqualified` or `all`; `rule` is one of the nine rule names or `any`; `sort` is `risk` (default), `flags` or `recent`. With `pending` it lists submitted, undecided attempts that have flags, ended at the flag limit, or have a risk level other than `low` (`needsReview()`), which no attempt can reach through the current app.

**Resume (not called by the app).** Reopens an attempt ended with reason `flag_limit` or `admin`, with the time it had left and optional extra flags; other attempts get `ATTEMPT_NOT_ACTIVE` (`resumeAttempt()`).

**Flag dismiss (legacy, unused since 2026-10-25).** Marks a flag dismissed with a note, lowers `flagCount` if it counted, logs `flag_dismissed` and rescores risk. Dismissing an already dismissed flag returns `{ flag, flagCount }` without `risk` (`dismissFlag()`).

**Review decision (legacy, unused since 2026-10-25).** Records an integrity decision on a submitted attempt. `cleared`, `suspicious` and `disqualified` need a non-empty `note` (`VALIDATION_FAILED` otherwise); `pending` undoes a decision. `disqualified` changes the outcome to `Disqualified` in results. Refused with `ATTEMPT_NOT_ACTIVE` while the attempt is in progress (`decide()`).

---

## Admin: results and analytics

These routes produce the results table, publish results and compute exam analytics. All of them finish overdue attempts first (`examAttempts()` in `backend/lib/results.js`).

| Method and path | Route name | Request | Response |
|---|---|---|---|
| `GET /api/admin/exams/:examId/results` | `admin.results.list` | none | `{ exam, pipeline, rows[] }` |
| `GET /api/admin/exams/:examId/results.csv` | `admin.results.csv` (internal) | none | `text/csv; charset=utf-8`, attachment `results.csv` |
| `POST /api/admin/exams/:examId/results/publish` | `admin.results.publish` | `dryRun` boolean, default `false` | counts, plus `resultsPublishedAt` when published |
| `GET /api/admin/exams/:examId/analytics` | `admin.analytics` | none | `{ n, tiles, histogram, markers, reading, questions, topics, integrity }` |

Source: `backend/routes/admin/results.js`; `backend/lib/results.js`; `examAnalytics()` in `backend/lib/analytics.js`.

**Results list.** `exam` is `{ id, title, visibility, passPercent, holdAutoEnded, resultsPublishedAt }`. `pipeline` is `{ submitted, reviewed, waiting, ready, visible }`. Each row, sorted by roll number, has `attemptId`, `code`, `student`, `status`, `submitReason`, `startedAt`, `submittedAt`, `score`, `maxScore`, `percent`, `outcome`, `passPercent`, `flagCount`, `risk`, `review`, `held`, `heldReason` and `resultVisible` (`resultRow()`). `reviewed`, `waiting`, `flagCount`, `risk`, `review`, `held` and `heldReason` are proctoring leftovers.

**CSV.** Header `rollNo,name,status,submitReason,score,maxScore,percent,outcome,resultVisible,startedAt,submittedAt`, lines separated by CRLF. A cell starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`, so a spreadsheet does not run it as a formula (`csvCell()` and `resultsCsv()`).

**Publish results.** The counts are `{ willPublish, held, outcomes: { passed, notPassed, disqualified }, windowOpen, alreadyPublishedAt }`, with `dryRun` echoed. Without a dry run the server sets `exam.resultsPublishedAt` (keeping an earlier value) and makes every eligible submitted attempt visible (`publishResults()`, `syncExam()`). Attempts submitted later on an `after_publish` exam become visible at their own submit, because `resultsPublishedAt` is already set (`withVisibility()` in `backend/lib/visibility.js`).

**Analytics.** Computed on every request over submitted attempts. `tiles` is `{ started, submitted, completionPercent, meanPercent, medianPercent, avgTimeUsedSec, durationMinutes }`; `histogram` is ten 10-point bins `{ from, to, count }`; `markers` is `{ mean, median, passPercent }`; `reading` is one sentence; each entry in `questions` has `questionId`, `no`, `text`, `type`, `topic`, `marks`, `attempts`, `percentCorrect`, `avgMarks`, `avgTimeSec`, `commonWrong: { label, count } | null` and `keySuspect`; `topics` lists `{ topic, accuracy, questions }`. `keySuspect` is true for a `single` or `true_false` question when, among the top-scoring half of students (at least 2), a wrong answer was picked more often than the key (`keySuspect()`). `integrity` (`byRule`, `byMinute`, `autoEnded`, `decisions`) is legacy and reads zero.

---

## Evidence download

The review screen fetches each saved image through this route. It answers with the JPEG bytes, and main turns them into a `data:` URL for the renderer (`adminImage()` in `app/electron/files.js`).

| Method and path | Role | Route name | Path parameters | Response |
|---|---|---|---|---|
| `GET /api/admin/attempts/:attemptId/evidence/:kind/:file` | admin | `admin.evidence` (internal) | `kind`: `screen`, `camera` or `identity`; `file`: letters (any script), digits, `_` and `-`, up to 200 characters, ending `.jpg` | `image/jpeg` bytes |

Source: `backend/routes/admin/review.js`; `readEvidence()` in `backend/lib/evidence.js`; `SPECIAL_PARAM_PATTERNS` in `app/electron/routes.js`.

The `kind/file` pair is exactly the `file` value stored in `captures.json` and returned by the upload, for example `camera/Dev_Khanna-CLI_Apps-2026-10-25_22-52-21_2.jpg`. The server checks both against fixed patterns, maps the kind to its folder (`camera` and `identity` to `webcam/`), rebuilds the path from the attempt's current candidate name and exam title, and refuses any path that resolves outside the screenshots root (`imagePath()` and `insideRoot()` in `backend/lib/attemptFiles.js`). A missing file, unknown attempt or bad name is `404 NOT_FOUND` "This file doesn't exist any more."

The server finds the image through the capture record's stored `path`, not the current names, so renaming a student (`PATCH /api/admin/users/:userId`) or an exam title (`PATCH /api/admin/exams/:examId`) after images were saved does not break this route; this was checked on 2026-10-25 (`readEvidence()` in `backend/lib/evidence.js`). A file that is not in the attempt's `captures.json` is `404 NOT_FOUND`.

---

## Route index

This table lists every route once, in the order of the Electron route table, for quick lookup.

| Route name | Method and path | Role | Internal | Status |
|---|---|---|---|---|
| `auth.login` | `POST /auth/login` | any | yes | in use |
| `auth.logout` | `POST /auth/logout` | any | yes | in use |
| `auth.me` | `GET /auth/me` | any | yes | in use |
| `exams.list` | `GET /exams` | student | | in use |
| `exams.get` | `GET /exams/:examId` | student | | in use |
| `attempts.start` | `POST /exams/:examId/attempts` | student | | in use |
| `attempts.get` | `GET /attempts/:attemptId` | student | | in use |
| `answers.save` | `PUT /attempts/:attemptId/answers/:questionId` | student | queued | in use |
| `attempts.events` | `POST /attempts/:attemptId/events` | student | yes | legacy, unused since 2026-10-25 (only `app_quit`) |
| `attempts.heartbeat` | `POST /attempts/:attemptId/heartbeat` | student | yes | in use |
| `attempts.evidence` | `POST /attempts/:attemptId/evidence` | student | yes | in use |
| `attempts.submit` | `POST /attempts/:attemptId/submit` | student | | in use |
| `attempts.receipt` | `GET /attempts/:attemptId/receipt` | student | | in use |
| `attempts.result` | `GET /attempts/:attemptId/result` | student | | in use |
| `me.attempts` | `GET /me/attempts` | student | | in use |
| `me.analytics` | `GET /me/analytics` | student | | in use |
| `admin.home` | `GET /admin/home` | admin | | in use |
| `admin.exams.list` | `GET /admin/exams` | admin | | in use |
| `admin.exams.get` | `GET /admin/exams/:examId` | admin | | in use |
| `admin.exams.create` | `POST /admin/exams` | admin | | in use |
| `admin.exams.update` | `PATCH /admin/exams/:examId` | admin | | in use |
| `admin.exams.delete` | `DELETE /admin/exams/:examId` | admin | | in use |
| `admin.exams.updateSettings` | `PUT /admin/exams/:examId/settings` | admin | | in use |
| `admin.exams.updateProctoring` | `PUT /admin/exams/:examId/proctoring` | admin | | in use (screenshot interval, clipboard) |
| `admin.exams.publish` | `POST /admin/exams/:examId/publish` | admin | | in use |
| `admin.exams.unpublish` | `POST /admin/exams/:examId/unpublish` | admin | | in use |
| `admin.exams.extendInProgress` | `POST /admin/exams/:examId/extend-in-progress` | admin | | in use |
| `admin.questions.create` | `POST /admin/exams/:examId/questions` | admin | | in use |
| `admin.questions.update` | `PATCH /admin/exams/:examId/questions/:questionId` | admin | | in use |
| `admin.questions.delete` | `DELETE /admin/exams/:examId/questions/:questionId` | admin | | in use |
| `admin.questions.reorder` | `PUT /admin/exams/:examId/questions/order` | admin | | in use |
| `admin.questions.previewScore` | `POST /admin/exams/:examId/questions/:questionId/preview-score` | admin | | in use |
| `admin.users.list` | `GET /admin/users` | admin | | in use |
| `admin.users.create` | `POST /admin/users` | admin | | in use |
| `admin.users.update` | `PATCH /admin/users/:userId` | admin | | in use |
| `admin.users.resetPassword` | `POST /admin/users/:userId/reset-password` | admin | | in use |
| `admin.users.import` | `POST /admin/users/import` | admin | | in use |
| `admin.live` | `GET /admin/exams/:examId/live` | admin | | in use |
| `admin.reviewQueue` | `GET /admin/exams/:examId/review-queue` | admin | | not called by the app |
| `admin.attempts.get` | `GET /admin/attempts/:attemptId` | admin | | in use |
| `admin.attempts.extend` | `POST /admin/attempts/:attemptId/extend` | admin | | in use |
| `admin.attempts.end` | `POST /admin/attempts/:attemptId/end` | admin | | in use |
| `admin.attempts.resume` | `POST /admin/attempts/:attemptId/resume` | admin | | not called by the app |
| `admin.attempts.review` | `PUT /admin/attempts/:attemptId/review` | admin | | legacy, unused since 2026-10-25 |
| `admin.attempts.release` | `POST /admin/attempts/:attemptId/release` | admin | | in use |
| `admin.flags.dismiss` | `POST /admin/attempts/:attemptId/flags/:flagId/dismiss` | admin | | legacy, unused since 2026-10-25 |
| `admin.evidence` | `GET /admin/attempts/:attemptId/evidence/:kind/:file` | admin | yes | in use |
| `admin.results.list` | `GET /admin/exams/:examId/results` | admin | | in use |
| `admin.results.publish` | `POST /admin/exams/:examId/results/publish` | admin | | in use |
| `admin.results.csv` | `GET /admin/exams/:examId/results.csv` | admin | yes | in use |
| `admin.analytics` | `GET /admin/exams/:examId/analytics` | admin | | in use |
| none | `GET /health` | none | n/a | in use (`server:ping`) |

Source: `ROUTES` in `app/electron/routes.js`; `backend/server.js` and `backend/routes/**`; usage from a search of `app/src` and `app/electron`. Paths are relative to `/api`.

---

## Related documents

1. `docs/DATA_AND_STORAGE.md`: the stored shape of every record these routes read and write, and the screenshots folder.
2. `docs/ARCHITECTURE.md`: why the client works through main, and why proctoring was replaced by screenshots.
3. `docs/SECURITY.md`: the threat model behind the token handling, path checks and limits described here.
4. `backend/requests.http`: one example request per route, for the VS Code REST Client.
5. `BUILD_PLAN.md` §18 to §21: the original route and shape contract. Its proctoring sections predate 2026-10-25 and no longer match the app.

---

## Caveats

Response shapes were read from the handlers and confirmed for the main student and admin flows against a throwaway server on 2026-10-25. Paths not exercised there (resume, flag dismiss, a successful review decision, a deadline expiry) are described from the code alone. "Not called by the app" and "legacy" are based on a text search of `app/src` and `app/electron` for route names; a route reached through a dynamically built name would be missed, though none was seen. The sample terms text served with every new exam (`backend/lib/terms.js`) still describes flags and a local image folder in Settings, which no longer matches the app; this reference documents what the API returns, not whether that text is accurate. The `held`, `risk` and `flag*` fields are documented so a reader can recognise them, but no current flow changes their values from the defaults.
