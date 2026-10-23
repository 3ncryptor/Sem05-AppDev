# Athena backend

Express 5 + JSON files. The contract is BUILD_PLAN.md Part 2 (§18 routes, §19 rules, §20 errors, §21 shapes).

## Run

```bash
npm install
npm run seed     # RESETS data/ (proctorImages/ is never touched): 1 admin, 10 students, 4 open exams. Passwords → data/seed-credentials.txt
npm start        # http://127.0.0.1:3000  (HOST=0.0.0.0 to let a second Mac connect)
npm run smoke    # full story over HTTP on port 3100 with a temporary data folder; prints PASS/FAIL
```

Environment: `PORT` (3000), `HOST` (127.0.0.1), `DATA_DIR` (backend/data), `EVIDENCE_DIR` (`<Proctor>/evidence/server`), `TOKEN_TTL_HOURS` (12).

Proctoring images are stored at `backend/proctorImages/<rollNo>/<attemptCode>/` (`webcam/`, `screen/`, `identity/`); per-attempt records (`events.jsonl`, `flags.json`, `captures.json`) at `data/records/<userId>/<attemptId>/`. Both are gitignored, and `npm run seed` never touches `proctorImages/`.

## Layout

- `server.js` builds the pipeline: request id → logger → JSON parser → routers → 404 → error envelope.
- `routes/` thin handlers: validate input, call one `lib/` function, send `{ ok, data, error }`.
- `lib/` the rules. Start with `store.js` (atomic JSON files), `auth.js`, `flags.js` (pure flag engine),
  `finalize.js` (every way an attempt ends), `risk.js`, `analytics.js`, and `scoring/` (one file per question type).
- `lib/constants.js` every threshold and weight (2 s merge, 30 s grace, risk points).
- `requests.http` one request per route for the VS Code REST Client.
