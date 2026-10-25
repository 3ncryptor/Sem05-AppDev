# Athena

A desktop exam app for a classroom: examiners build and run timed exams, students take them on a Mac, and every exam leaves a record of screen and webcam screenshots.

Compiled 2026-10-25. Facts are cited to file paths in this repository; the detailed documents in `docs/` cite the code they describe.

## Summary

Athena is an Electron 44 desktop app (React 19 UI) talking to a small Express 5 server that keeps its data in JSON files. One app serves two roles. An examiner signs in to write questions in seven auto-graded formats, publish an exam with a time window, watch who is writing, and publish results. A student signs in, passes a short system check, agrees to the capture terms, takes an identity photo and writes the exam in fullscreen. While the exam runs, Athena saves a screenshot of its own window and a webcam photo about once a minute into `backend/screenshots/`, sorted by candidate and test, so the examiner can review them afterwards.

Earlier versions tried automated proctoring (face detection, focus and fullscreen flags, risk scores). It was removed on 2026-10-25 because it was not reliable enough to ship, and screenshots took its place. `docs/ARCHITECTURE.md` explains that decision.

## Quick start

You need macOS on Apple Silicon, Node.js 22 or newer and a camera. From this folder:

```bash
./start.sh
```

The script installs dependencies and seeds the database on the first run, then starts the backend on port 3000, the UI server on port 5173 and the Athena window. It is safe to run again: anything already running is left alone (`start.sh`). Sign-in details for the seeded admin and ten students are written to `backend/data/seed-credentials.txt`. Stop everything with `./stop.sh`.

You are done when the Athena window shows the sign-in screen and `curl http://127.0.0.1:3000/api/health` returns `"status":"ok"`. If port 3000 is taken by another program, the script names it and stops; `docs/OPERATIONS.md` covers that and other problems.

## Where the screenshots go

Every image lands in one folder, grouped by candidate, then test, then source:

```
backend/screenshots/
  Dev_Khanna/                                            candidate
    Viva_Demo_Exam/                                      test
      webcam/Dev_Khanna-Viva_Demo_Exam-2026-10-25_22-21-29.jpg   identity photo
      webcam/Dev_Khanna-Viva_Demo_Exam-2026-10-25_22-21-32.jpg   webcam photo
      screen/Dev_Khanna-Viva_Demo_Exam-2026-10-25_22-21-32.jpg   screenshot of the Athena window
```

The first pair is taken 3 seconds after the exam opens and then one pair every 45 to 60 seconds, a range the examiner can change per exam (`app/electron/capture.js`). File names are `<Candidate>-<Test>-<date_time>.jpg` in the server's local time, and a second image in the same second gets `_2` instead of overwriting the first (`backend/lib/evidence.js`, `backend/lib/attemptFiles.js`). The folder is gitignored and `npm run seed` never deletes it. `docs/DATA_AND_STORAGE.md` has the full rules.

## What is in the box

| Area | What works | Code |
|---|---|---|
| Student | Exams list, system check, rules and consent, identity photo, exam room with autosave and offline queue, review and submit, receipt PDF, results, personal analytics | `app/src/features/{student,pretest,exam,results}` |
| Examiner | Home, exams (create, duplicate, delete, publish), question builder for 7 types, settings, live view (extend, end), review console with screenshot gallery, results (publish, CSV export), analytics, students (add, reset password, turn off, CSV import) | `app/src/features/admin` |
| Desktop shell | Every HTTP call made by the main process, token kept out of the page, preload allow-list, screenshot timer, upload queue | `app/electron` |
| Server | Auth, exams, attempts, scoring, results, analytics, image storage | `backend/routes`, `backend/lib` |

Source: `app/src/routes.jsx`, `app/electron/routes.js`, `backend/server.js`.

## Repository layout

```
Proctor/
  start.sh, stop.sh     start and stop backend, UI server and app
  app/                  Electron main process (electron/) and React UI (src/)
  backend/              Express server, JSON data (data/), screenshots (screenshots/)
  docs/                 the documentation below
  BUILD_PLAN.md         original build plan (written before proctoring was removed)
  SCREENS.md            original screen specs (same caveat)
```

## Documentation and further reading

Read them in this order if you are new to the project; the design alternatives that were considered and rejected are argued in `docs/ARCHITECTURE.md`.

1. [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md): how an examiner and a student use the app, screen by screen.
2. [`docs/OPERATIONS.md`](docs/OPERATIONS.md): running, configuring, reseeding, building the DMG and fixing common problems.
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the pieces fit, the decisions behind them and the alternatives that lost.
4. [`docs/DATA_AND_STORAGE.md`](docs/DATA_AND_STORAGE.md): every data file and the screenshots layout.
5. [`docs/API.md`](docs/API.md): the HTTP API, route by route.
6. [`docs/SECURITY.md`](docs/SECURITY.md): threat model, the controls in the code and the known gaps.
7. [`docs/TESTING.md`](docs/TESTING.md): what has been verified, how to re-run it and what has not been tested.

## Caveats

`BUILD_PLAN.md` and `SCREENS.md` describe the plan as it stood before proctoring was removed, so their sections on flags, face detection and risk scores no longer match the app; the documents in `docs/` describe the code as it is. Some proctoring-era code still sits in the backend: no client sends flag events any more, but `backend/lib/risk.js` still computes a risk score from heartbeat gaps and screenshot counts, which the current screens do not show. Two candidates with exactly the same name would share a screenshots folder, because folders are named by candidate name. The server speaks plain HTTP on the local machine and stores images unencrypted, which suits a classroom on one network and would need changing before wider use (`docs/SECURITY.md`).
