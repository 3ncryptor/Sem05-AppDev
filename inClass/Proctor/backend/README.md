# Athena backend

Express 5 + JSON files, Node.js 22 or newer (`package.json`, `engines`). The API as it is today is described route by route in [`../docs/API.md`](../docs/API.md). `../BUILD_PLAN.md` Part 2 was the original contract and still covers the error envelope and shapes, but it predates the removal of proctoring. [`../README.md`](../README.md) covers the whole app, and `../start.sh` starts this server together with the UI.

## Run

```bash
npm install
npm run seed     # RESETS data/ (screenshots/ is never touched): 1 admin, 10 students, 4 open exams. Passwords → data/seed-credentials.txt
npm start        # http://127.0.0.1:3000  (HOST=0.0.0.0 to let a second Mac connect)
npm run smoke    # full story over HTTP on port 3100 with a temporary data folder; prints PASS/FAIL
```

Environment: `PORT` (3000), `HOST` (127.0.0.1), `DATA_DIR` (backend/data), `EVIDENCE_DIR` (`backend/screenshots`), `TOKEN_TTL_HOURS` (12).

Exam screenshots are stored at `backend/screenshots/<Candidate_Name>/<Test_Name>/`, with `webcam/` (webcam photos, including the identity photo) and `screen/` (screenshots of the Athena window), one pair about every 45–60 s. Each file is named `<Candidate_Name>-<Test_Name>-<YYYY-MM-DD_HH-mm-ss>.jpg` in the server's local time. See ../docs/DATA_AND_STORAGE.md. Per-attempt records (`captures.json`, `events.jsonl`) are at `data/records/<userId>/<attemptId>/`. Both are gitignored, and `npm run seed` never touches `screenshots/`.

## Layout

- `server.js` builds the pipeline: request id → logger → JSON parser → routers → 404 → error envelope.
- `routes/` thin handlers: validate input, call one `lib/` function, send `{ ok, data, error }`.
- `lib/` the rules. Start with `store.js` (atomic JSON files), `auth.js`, `finalize.js` (every way an attempt ends),
  `analytics.js`, `evidence.js` + `attemptFiles.js` (screenshots on disk), and `scoring/` (one file per question type). `flags.js` and `risk.js` are left from the removed proctoring: no client sends flag events, but `risk.js` still scores heartbeat gaps and screenshot counts, and no screen shows it.
- `lib/constants.js` every threshold and weight (2 s merge, 30 s grace, risk points).
- `requests.http` one request per route for the VS Code REST Client.
