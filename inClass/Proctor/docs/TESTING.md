# Athena testing: the server is covered by a 41-step HTTP test, the app by one scripted end-to-end run

Compiled 2026-10-25. Test files and code are cited by path in this repository; results are dated to the run that produced them.

---

## Summary

Athena is verified at three levels, with one clear gap. The backend has a smoke test that drives the whole exam story over real HTTP against a temporary data folder. It has 41 steps and passed 41/41 on 2026-10-25 (`backend/scripts/smoke.js`). The app passes ESLint with no findings and `vite build` succeeds. On 2026-10-25 the real Electron app was also driven end to end over the Chrome DevTools Protocol (CDP), through every admin and student screen, with no console errors on any screen.

The gap is repeatability. There is no unit-test suite for the React components and no automated end-to-end test in CI: the CDP scripts lived in a scratch folder and are not in the repository. Three native macOS dialogs cannot be scripted and were checked by hand or by calling the same code path. A grader can reproduce the essentials in about ten minutes with the checklist at the end.

---

## What is verified and how

| Layer | Method | Result on 2026-10-25 | Repeatable from the repo |
|---|---|---|---|
| Backend routes and rules | `npm run smoke`: 41 steps over HTTP | 41/41 passed | yes |
| App source quality | `npm run lint` (ESLint) | no findings | yes |
| App build | `npm run build` (`vite build`) | passed | yes |
| Whole app, both roles | Electron driven over CDP against a scratch backend | every step below passed, no console errors | no, scripts not committed |
| Native dialogs | manual click, or the same function called directly | passed | by hand |

Source: `backend/scripts/smoke*.js`, `app/package.json`, run notes from 2026-10-25.

---

## The backend smoke test: the exam story over real HTTP

`npm run smoke` seeds a fresh temporary folder (data and images both inside it), starts `server.js` as a child process on port 3100 (or `SMOKE_PORT`), runs every step, stops the server and deletes the folder. Real data in `backend/data/` and `backend/screenshots/` is untouched. `SMOKE_KEEP=1` keeps the folder for inspection (`backend/scripts/smoke.js`). Each step prints `PASS` or `FAIL`, and the run exits non-zero on any failure.

The steps are grouped in four files. Their names below are the exact strings the test prints.

| Group | File | Steps | What they cover |
|---|---|---|---|
| Build an exam | `smoke-build.js` | 10 | health check answers; wrong password is rejected with a generic error; admin signs in; a student is refused on admin routes; admin creates a draft exam; admin adds one question of each of the seven types; publish checklist lists the missing key and the missing window; admin fixes the key, the window and proctoring, then publishes; questions are locked after publishing; admin adds two students and gets one-time passwords |
| Take it as a student | `smoke-student.js` | 14 | exams.list shows the new exam as open, with no key; start attempt returns questions without key or explanation; starting again resumes the same attempt; a second student starts an attempt; answers for every type are saved; a stale revision is ignored; an answer of the wrong shape is rejected; blur and fullscreen exit within 2 s become one flag; a tiny valid JPEG is stored under the right name; a non-JPEG and an oversized image are rejected; heartbeat returns the clock and the flag count; submit, and submit again returns the same receipt; result is hidden for an after_publish exam; a student can't read someone else's attempt |
| Review, publish, act | `smoke-admin.js` | 11 | review queue lists the flagged attempt; attempt detail has the merged flag with its capture; evidence downloads, and path traversal is refused; a decision needs a note; publish results: dry run counts, then publish; result is visible with the right marks for every type; extend adds 10 minutes and the heartbeat sees it; end stops the attempt; resume reopens it with one extra allowed flag; the flag limit (5 + 1 extra) ends the attempt; a held result cannot be released, and dismissing a flag lowers the count |
| Reports and accounts | `smoke-admin.js` | 6 | results CSV escapes cells that start with = + - @; admin analytics numbers are sane; student analytics counts only visible results; admin home and live views; import dry run checks every row; reset password signs the student out, and turning off blocks sign-in |

Source: `backend/scripts/smoke-build.js`, `smoke-student.js`, `smoke-admin.js`; output of `npm run smoke` on 2026-10-25 (41/41 passed).

The image step checks the stored name against the pattern `screen/<Name>-<Test>-YYYY-MM-DD_HH-mm-ss.jpg` (`smoke-student.js`), so the naming rule is tested on every run. Security-relevant behaviour is covered too: the key and explanations never reach the student before results, one student cannot read another's attempt, path traversal on image downloads is refused, and CSV cells cannot become spreadsheet formulas.

About a quarter of the steps exercise flag and risk endpoints from the proctoring that was removed on 2026-10-25. The server still accepts focus and fullscreen events and still has flag limits (`backend/lib/flags.js`, `backend/lib/risk.js`), but the app no longer sends those events. Those steps prove the server code works; they do not describe what a student experiences today.

---

## The end-to-end run on 2026-10-25

The real Electron app was started with `--fake-media` (Chromium's fake camera, no permission prompts) against a scratch backend on port 3156, and driven over CDP. `ATHENA_SAVE_DIR` let the receipt and CSV saves land in a known folder (`app/electron/files.js`). Every step below was clicked through and its result checked on screen or on disk.

| Area | Steps verified |
|---|---|
| Sign-in | login screen renders and signs in |
| Exams | New exam created "Viva Demo Exam", code VIV-01; Duplicate; Delete with the typed title confirmation |
| Questions | added a single choice and a true/false question; autosave reached "Saved ✓"; set the answer key; moved a question up; deleted a question |
| Settings | saved with screenshot interval 30 to 40 s |
| Publishing | Publish, Unpublish, Publish again |
| Students | Add student (password shown once); Reset password; Turn off |
| CSV import | the app's own parser (`csv.js`) on a test file, then the same server dry run and import the dialog calls |
| Live | Extend 10 min moved the deadline by 10 minutes; End exam ended the attempt |
| Results | Publish results ("Publish 2 results"); Export CSV wrote the file |
| Review | identity photo and Screen/Webcam screenshot gallery displayed |
| Analytics and Home | both rendered with real data |
| Student pre-test | system check showed 4 rows OK; rules accepted; identity photo taken; Begin |
| Student exam | exam room opened; an answer clicked; review page; submit; done page |
| Student after | receipt PDF saved; published result showed "Passed", 3 / 3, 100 % |
| Images on disk | screenshots present under `backend/screenshots/` in the exact naming format |
| Console | no console errors on any screen |

Source: run notes from 2026-10-25; screen labels from `app/src/features/**`.

### Three native dialogs were verified outside the script

CDP drives the web page, not macOS sheets or file pickers, so three steps were checked another way.

| Dialog | Code | How it was verified |
|---|---|---|
| "Submit your exam? <n> of <total> answered." with **Submit** / **Keep working** | `app/electron/exam.js`, `confirmSubmit` | the user clicked **Submit** in a manual run |
| "Your exam is still running" quit warning with **Keep working** / **Quit anyway** | `app/electron/exam.js`, `confirmQuit` | the same code path called directly |
| The CSV file picker behind **Choose file…** | `app/electron/files.js` | parser and server import tested with the same file contents, picker skipped |

Source: files named in the table.

---

## How to re-run the checks

From the repository root:

```bash
# backend: 41-step HTTP test on port 3100, temporary data
cd backend && npm run smoke
# expect the last line: 41/41 passed

# app: lint and production build
cd ../app && npm run lint && npm run build
# expect no ESLint output and a finished vite build in app/dist/

# app in a scriptable mode (fake camera, saves without dialogs), against a backend on another port
cd ../backend && PORT=3156 DATA_DIR=/tmp/athena-e2e EVIDENCE_DIR=/tmp/athena-e2e/screenshots npm run seed
PORT=3156 DATA_DIR=/tmp/athena-e2e EVIDENCE_DIR=/tmp/athena-e2e/screenshots npm start
# second terminal
cd app && npm run dev
# third terminal
cd app && ATHENA_SAVE_DIR=/tmp/athena-e2e/saves npx electron . --fake-media --profile=e2e
```

In that third window, set **Settings → Server** to `http://127.0.0.1:3156`. The scratch data and images stay in `/tmp/athena-e2e`, away from the real `backend/data/` and `backend/screenshots/`. Port 3100 is used by the smoke test and 3000 by the normal backend, so pick another port if either is busy.

---

## Test of done: a ten-minute check a grader can follow by hand

1. Run `./start.sh`. You should see `[athena] Ready.` and the sign-in screen.
2. Open `backend/data/seed-credentials.txt` and sign in as `admin`. You should see the admin **Home**.
3. Go to **Exams**, press **New exam**, type a title such as "Grader Check", press **Create exam**. You should land on the **Questions** tab.
4. Press **Add question**, pick **True / false**, type a statement, choose the **Correct answer**. You should see **Saved ✓**.
5. Open **Settings**, set **Window closes** to later today if needed, press **Save settings**. Then press **Publish…** and **Publish**. You should see "Published. Students can see it now."
6. Open **Settings** in the sidebar (or sign out) and sign in as a student from the credentials file, for example Dev Khanna. You should see **Exams** with "Grader Check" open.
7. Open it, press **Get started**, pass the four system-check rows, tick all four boxes on the rules step, take the identity photo, press **Begin**. You should be in fullscreen on question 1.
8. Answer, press **Review & submit**, **Submit exam**, then **Submit** in the macOS sheet. You should see the done page with a receipt.
9. In Finder or a terminal, open `backend/screenshots/<Candidate_Name>/Grader_Check/`. You should find `webcam/` and `screen/` with files named `<Candidate_Name>-Grader_Check-<YYYY-MM-DD_HH-mm-ss>.jpg`.
10. Sign in as `admin` again, open the exam's **Results** tab, press **Publish results…** and **Publish 1 result**. Then sign in as the student and open **Results**. You should see the result with its outcome and score.

If any step fails, `docs/OPERATIONS.md` has the troubleshooting table.

---

## Known gaps

These are real limits as of 2026-10-25, not plans.

There is no unit-test suite for the React components and no automated end-to-end test in CI. The CDP scripts that drove the 2026-10-25 run lived in a scratch folder and are not committed, so that run can be repeated by hand but not by a command. Drag-to-reorder in the question builder is not built; reordering uses up and down arrow buttons (`app/src/features/admin/questions/Outline.jsx`). There is no manual mark override: scores come only from the answer key, so a wrong key must be fixed in a copy of the exam. Two candidates with the same name share a screenshots folder, because the folder is named after the candidate's name, not the roll number (`backend/lib/evidence.js`); their files can only be told apart through the review console, which knows each attempt. The smoke test still exercises flag and risk endpoints that the app no longer uses; they pass, but they test dead paths.

---

## Further reading

1. [backend/scripts/smoke.js](../backend/scripts/smoke.js) and the three step files it loads: the test itself.
2. [docs/OPERATIONS.md](OPERATIONS.md): ports, environment variables and troubleshooting.
3. [docs/USER_GUIDE.md](USER_GUIDE.md): the screens the end-to-end run clicked through.
4. [docs/ARCHITECTURE.md](ARCHITECTURE.md): the design the tests check.

---

## Caveats

The 41/41 result and the end-to-end run are from 2026-10-25 on one Apple Silicon Mac with a fake camera for the scripted run. The end-to-end evidence is a run record, not a committed script, so it cannot be audited line by line. The smoke test talks to the server directly and does not prove the Electron main process or the React screens behave the same way; the end-to-end run is the only check of that.
