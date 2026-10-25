# Athena operations: start it with one script, keep data and screenshots safe, fix the usual problems

Compiled 2026-10-25. Every command, variable and message below was read from the scripts and code, cited by file path in this repository.

---

## Summary

Athena runs as three local processes: the Express backend on port 3000, the Vite UI server on port 5173, and the Electron app that loads the UI from Vite. `./start.sh` starts whichever of the three is not already running and healthy, and `./stop.sh` stops what it started. Both are safe to run repeatedly. Logs and process ids live in `.run/` at the repository root.

Data lives in two places. `backend/data/` holds the JSON store (users, exams, sessions, attempts) and `backend/data/records/`. `backend/screenshots/` holds every exam image. `npm run seed` resets the first and never touches the second. The most common failure on this machine has been another program holding port 3000, which `start.sh` detects and names.

---

## Requirements: an Apple Silicon Mac with Node 22 and a camera

| Requirement | Why | Source |
|---|---|---|
| macOS on Apple Silicon | the only build target is an arm64 DMG | `app/package.json` (`dist`), `app/electron-builder.yml` |
| Node.js 22 or newer, with npm | the backend declares `"node": ">=22"`; `start.sh` stops if `node` is missing | `backend/package.json`, `start.sh` |
| curl and lsof | `start.sh` uses curl for health checks and lsof for port checks | `start.sh` |
| A camera | the student system check and the webcam photos need one | `app/src/features/pretest/checks.js` |

Source: files named in the table.

---

## First run: one command

```bash
cd Proctor
./start.sh
```

On the first run `start.sh` runs `npm ci` in `backend/` and `app/` if `node_modules` is missing, seeds the database if `backend/data/users.json` is missing, and creates `backend/screenshots/`. It then starts the three processes and prints the screenshots folder and where the logins are.

Test of done: the terminal ends with `[athena] Ready. Screenshots are saved in backend/screenshots/<Candidate>/<Test>/{webcam,screen}/`, the Athena window shows the sign-in screen, and `curl http://127.0.0.1:3000/api/health` prints JSON containing `"status":"ok"`. Sign in with the passwords in `backend/data/seed-credentials.txt` (the admin's roll number is `admin`).

---

## start.sh and stop.sh are idempotent

`start.sh` checks each process before starting it (`start.sh`):

| Step | Check that counts as "already running" | Action when not running | Log and pid |
|---|---|---|---|
| Backend | `GET http://127.0.0.1:3000/api/health` returns `"status":"ok"` | if port 3000 is busy, stop with a message; else `node server.js` | `.run/backend.log`, `.run/backend.pid` |
| UI server | `http://localhost:5173/` returns a page with `<title>Athena</title>` | if port 5173 is busy, stop with a message; else `node node_modules/vite/bin/vite.js --port 5173 --strictPort` | `.run/vite.log`, `.run/vite.pid` |
| Electron app | an Electron process from this checkout's `app/node_modules/electron` is running, whether the script or someone else opened it | the Electron binary (`node -p "require('electron')"`) with `.` in `app/`; fail if it exits within 2 s | `.run/electron.log`, `.run/electron.pid` |

Source: `start.sh`.

Each wait polls 60 times at 0.5 s (30 s). If a process does not come up, the script prints the last 15 lines of its log. When port 3000 is held by something that is not Athena, it prints:

```
Port 3000 is used by something that isn't Athena:
<lsof line naming the process>
Stop it (for Docker: docker stop <name>) and run ./start.sh again.
```

`start.sh` launches each program with `exec`, detached from the terminal (`launch()`), so each pid file holds the real `node` or `Electron` process rather than a wrapper shell, and piping the script's output (for example `./start.sh | tee`) does not hang. `stop.sh` reads the three pid files in the order electron, vite, backend, sends each process `TERM`, waits up to 3 s (10 tries at 0.3 s), and force-kills it if it is still alive, which also covers the "exam is still running" quit dialog. It then closes any Athena window opened by hand from this checkout, deletes the pid files and prints `<name>: stopped` or `<name>: not running` (`stop.sh`). Both scripts were run twice in a row through a pipe on 2026-10-25: the second `start.sh` started nothing, the second `stop.sh` found nothing, and no process was left on ports 3000 or 5173.

Test of done for `stop.sh`: it prints three lines, and `curl http://127.0.0.1:3000/api/health` fails. Running it again prints `not running` three times.

`stop.sh` only stops processes that `start.sh` recorded. A backend you started by hand with `npm start` is not in `.run/` and keeps running.

---

## Manual commands, for when you want each piece in its own terminal

| Folder | Command | What it does |
|---|---|---|
| `backend/` | `npm run seed` | resets the data folder and creates 1 admin, 10 students and 4 open exams; prints and saves the passwords |
| `backend/` | `npm start` | `node server.js`, listening on `http://127.0.0.1:3000` |
| `backend/` | `npm run dev` | the same with `node --watch` |
| `backend/` | `npm run smoke` | the 41-step HTTP test against a temporary data folder on port 3100 (see `docs/TESTING.md`) |
| `app/` | `npm run dev` | copies MediaPipe assets, then starts Vite on 5173 |
| `app/` | `npm run electron` | `electron .`, which loads the UI from the Vite dev server |
| `app/` | `npm run build` | copies MediaPipe assets, then `vite build` into `app/dist/` |
| `app/` | `npm run lint` | ESLint over the app |
| `app/` | `npm run dist` | build, then `electron-builder --mac dmg --arm64` |

Source: `backend/package.json`, `app/package.json`.

The order matters: backend first, then `npm run dev`, then `npm run electron` in a third terminal. Test of done: the same as the first run.

---

## Environment variables and flags

The backend reads five variables once at startup and refuses to start with a clear message if one is invalid (`backend/config.js`).

| Variable | Default | Allowed values |
|---|---|---|
| `PORT` | `3000` | whole number 1 to 65535 |
| `HOST` | `127.0.0.1` | letters, digits, `.`, `:` and `-`; use `0.0.0.0` to let a second Mac connect |
| `DATA_DIR` | `backend/data` | any path |
| `EVIDENCE_DIR` | `backend/screenshots` | any path except the file-system root |
| `TOKEN_TTL_HOURS` | `12` | whole number 1 to 168 |

Source: `backend/config.js`.

The Electron app reads these (all development only unless noted):

| Name | Effect | Source |
|---|---|---|
| `ATHENA_DEV_URL` | where the unpackaged app loads the UI from and which origin may call IPC; default `http://localhost:5173` | `app/electron/validate.js` |
| `ATHENA_SAVE_DIR` | skips the save dialog for the receipt PDF and CSV export and writes there instead; ignored when packaged | `app/electron/files.js` |
| `--profile=<name>` | separate settings, session and lock, stored in `Athena-<name>` under Application Support, so a student copy and an admin copy can run side by side; lowercase letters, digits and dashes | `app/electron/main.js` |
| `--fake-media` | Chromium's fake camera and no permission prompts; the packaged app refuses it and exits | `app/electron/flags.js`, `app/electron/main.js` |
| `--selftest` | packaged-app check: loads the UI over `app://`, prints one JSON line and exits 0 only if it passes (`npm run selftest`) | `app/electron/selftest.js` |

Source: files named in the table.

Example of a second window for the viva, signed in separately: `cd app && npx electron . --profile=student`.

---

## Ports, logs and where things live

| Item | Location |
|---|---|
| Backend | port 3000 (`start.sh`, `backend/config.js`) |
| UI server | port 5173 (`start.sh`) |
| Smoke test server | port 3100, or `SMOKE_PORT` (`backend/scripts/smoke.js`) |
| Backend log | `.run/backend.log`: one line per request (time, request id, method, path, status, ms, user) (`backend/lib/http.js`) |
| UI server log | `.run/vite.log` |
| App log | `.run/electron.log`: lines prefixed `[athena:<scope>]`, never passwords, tokens or images (`app/electron/log.js`) |
| Data | `backend/data/*.json`, `backend/data/records/<userId>/<attemptId>/` |
| Screenshots | `backend/screenshots/<Candidate_Name>/<Test_Name>/{webcam,screen}/` |
| App settings | `settings.json` in the app's userData folder (server address, theme) (`app/electron/settings.js`) |

Source: files named in the table.

`.run/`, `backend/screenshots/`, `backend/data/records/` and the generated JSON and credentials files are gitignored (`.gitignore`).

---

## Reseeding resets accounts and attempts, never screenshots

```bash
cd backend
npm run seed
```

The seed deletes the store files (`users`, `exams`, `sessions`, `attempts` and their `.tmp` copies) and `backend/data/records/`, then creates the admin, ten students (Asha Rao, Dev Khanna and eight more) and four published exams open for seven days: CLI Apps, Electron Apps, React Native and Swift Apps (`backend/scripts/seed.js`, `backend/scripts/seed-data/`). Passwords are random on every run. They are printed once and written to `backend/data/seed-credentials.txt` with file mode 600.

It never touches `backend/screenshots/`. Image names carry the capture time, so images from before and after a reseed sit side by side.

Stop the backend before reseeding and start it again afterwards. The store loads each file into memory once at startup (`backend/lib/store.js`), so a running backend keeps serving the old data and its next write puts old records back on disk. The safe sequence is `./stop.sh`, `cd backend && npm run seed`, `./start.sh`. Test of done: `seed-credentials.txt` has a new timestamp, the new passwords work and the old ones do not.

---

## Building the DMG

```bash
cd app
npm run dist
```

This runs the build and then electron-builder with `app/electron-builder.yml`: arm64 DMG, ad-hoc signed, not notarized, output in `app/release/`. Only `dist/`, `electron/` and `package.json` are packed into an asar, and Electron fuses turn off run-as-Node and Node options. Because it is not notarized, macOS asks for confirmation the first time it opens. The packaged app loads its UI over `app://athena`, so it needs only the backend, not Vite. Point it at the backend in **Settings → Server**.

Test of done: `app/release/` contains a `.dmg`, and `npm run selftest` on a dev checkout prints a JSON line and exits 0.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `start.sh` stops with "Port 3000 is used by something that isn't Athena" | another program listens on 3000. On this machine it was the Docker container `ru-exam-dev-web-1` from another project | `docker ps` to confirm, `docker stop ru-exam-dev-web-1`, then `./start.sh`. For a non-Docker process, stop the program the lsof line names |
| "Port 5173 is used by something that isn't Athena's UI server" | another Vite or web server on 5173 | stop it, then `./start.sh` |
| App shows **Can't reach the exam server** | the backend is not running, or the saved server address is wrong | `curl http://127.0.0.1:3000/api/health`; if it fails, `./start.sh` or `cd backend && npm start`; otherwise fix the address on that screen and press **Save and retry** |
| System check: "Athena can't use your camera" | camera access is off in macOS Privacy settings | press **Open System Settings**, turn on Athena (or Electron, in development) under Privacy & Security → Camera, come back and press **Run again** |
| "The camera isn't working" | another app (Zoom, FaceTime) holds the camera | close it and press **Run again** |
| The app does not open, or `start.sh` says "The Athena app exited at once" | another copy with the same profile is running; the single-instance lock makes the new one exit and focuses the old window | use the open window, or quit it first; run a second copy with `--profile=<name>` (`app/electron/main.js`) |
| Student sees "You can't start this exam" / "This exam isn't open right now." | the exam's window has closed (or not opened, or it was unpublished) | in the exam's **Settings**, move **Window closes** later and press **Save settings**; the exam must be published (`backend/lib/attempts.js`) |
| `backend/screenshots/` stays empty after an exam | the backend was not running during the exam, or it was not restarted after an update that changed image storage | `./stop.sh && ./start.sh` (or restart `npm start`), then take a short exam and check for new files; check `.run/backend.log` for upload requests |
| Server refuses to start: "PORT must be a whole number…" or similar | an invalid environment variable | fix or unset it (`backend/config.js`) |
| "Please sign in again." on the sign-in screen | the token expired (12 hours by default) or the password was reset | sign in again; raise `TOKEN_TTL_HOURS` if needed |

Source: `start.sh`, `app/src/features/auth/ServerPage.jsx`, `app/src/features/pretest/FixCard.jsx`, files named in the table.

---

## Further reading

1. [docs/USER_GUIDE.md](USER_GUIDE.md): every screen for the examiner and the student.
2. [docs/TESTING.md](TESTING.md): the smoke test and how to re-run the checks.
3. [docs/ARCHITECTURE.md](ARCHITECTURE.md): why the main process makes every HTTP call and how images are staged and uploaded.
4. [backend/README.md](../backend/README.md): the backend layout in brief.

---

## Caveats

The scripts assume one Mac running everything on localhost. Running the backend for a second Mac needs `HOST=0.0.0.0` and the server address changed in the app; `start.sh` does not set this. `stop.sh` closes an Athena window opened by hand, but a backend or UI server started by hand (outside `start.sh`) has no pid file and must be stopped by hand (`lsof -nP -iTCP:3000 -sTCP:LISTEN` finds it). The Docker container name in the troubleshooting table is specific to this machine on 2026-10-25.
