# Athena build plan

Status: draft for review, 2026-10-23. Nothing gets built until you approve this.

Athena is a proctored exam app for macOS. It's a class assignment that ends in a viva, so it has to look and feel like a finished product while every part stays explainable with what the class taught: Electron main, preload and renderer, IPC, `dialog`, `desktopCapturer`, browser media APIs, Node `fs`, Express with JSON files, React + Vite.

Reference: the behaviour rules and screen patterns come from RishiPariksha (`~/Projects/DevClub/rishihtest/docs`), cut down hard. Section 3 lists what we take and what we leave out.

---

## 1. Ground rules

1. **Viva first.** You must be able to trace every feature out loud: click → renderer → preload → main → server → back. If you can't, we simplify it or cut it.
2. **Plain technology, many features.** Express + JSON files, React + plain CSS. No database, websockets, cloud or TypeScript. The one exception is a pre-trained face-counting model (§5.5), used as a black box and explained at the level of "frame in, face count out".
3. **The server decides.** It owns the clock, the answer key, grading, flag counting, auto-end and roles. The client shows state and reports events. A student who edits the client still gets ended at the flag limit.
4. **One question renderer.** The same `QuestionView` component draws questions in the exam, the admin builder preview, the attempt review and the results page, so admins always see what students saw. (RishiPariksha does this with `packages/exam-ui`.)
5. **Each phase ends in a demo, a `VIVA.md` section and a commit.** Phases that change the app get a GitHub Release.
6. **No automated tests** (repo decision). Each phase has a manual demo script, and the API has `backend/requests.http`.

## 2. Decisions so far

| Topic | Decision |
|---|---|
| Platform | macOS Apple Silicon (arm64) only |
| Delivery | Unsigned DMG via electron-builder, attached to a GitHub Release on `3ncryptor/Sem05-AppDev` |
| Backend | Separate Node process (Express 5, CommonJS like the class backend), run on your laptop for the demo |
| Storage | JSON files with atomic writes; evidence images as plain files in folders, on both the student's Mac and the server (§4) |
| Roles | `student` and `admin`, one app, one DMG. Login picks the route tree |
| UI | Rebuilt from scratch. Native Mac layout with RishiPariksha's "quiet room" colour and behaviour rules |
| Questions | Seven auto-graded types (§5.4): single choice, multiple select, true/false, short answer, numeric, ordering, matching. Code blocks in question text. Topic tag and explanation on every question |
| Results | The admin picks per exam: shown right after submitting, or only after publishing |
| Face detection | In scope. No face for 5 s and two or more faces both raise flags (§5.5), using the same MediaPipe logic as RishiPariksha |
| Exam visibility | Every student sees every published exam |
| Seed exams | CLI Apps, Electron Apps, React Native, Swift Apps (§14) |
| v1 Task cards | Removed. Their APIs come back as real features (§7) |
| Location | Rebuild in place in `inClass/Proctor`; v1 committed first as the git baseline |

## 3. What we take from RishiPariksha, and what we leave

### Taken (scaled down)

| From RishiPariksha | In Athena |
|---|---|
| "Quiet room" principles: one thing at a time, never alarm, always say work is safe, no seconds on the timer until 5 min | Student exam UI rules (§5.1) |
| Colour system: warm paper, ink text, calm indigo for selection, amber for attention, red only for critical | Design tokens (§5.2) |
| Pre-test stepper: system check with fix cards → rules and consent → identity photo → start | Student flow steps 4–7 |
| Rules screen generated from the proctoring config, including "what we capture" | Same |
| Exam layout: status bar, progress hairline, question rail, centred stage, 56 px option tiles with key hints | Same, without sections or tools |
| Flag UX: toast on every flag, modal on the first and the final warning (N−1), flags sheet | Same |
| Blocking overlays when a sensor stops (fullscreen left, camera lost) | Same |
| Gentle timer thresholds (10 min, 5 min, 1 min) | Same |
| Review-before-submit screen, marked questions first | Same |
| Done page with receipt and a line for how the test ended (`submitReason`); never shows a score | Same, receipt saved as PDF via Electron |
| Proctoring config: rules with `enabled` / `counts` / `warn`, presets, auto-end at N flags, random screenshot interval | Same shape, fewer rules |
| Incident merging: counted events within 2 s become one flag | Same. In Electron, ⌘Tab fires `blur` and often `leave-full-screen` together |
| Server-side flag counting and auto-end, `{ accepted, warnings, forced }` response | Same |
| Heartbeat carrying `serverNow`, `deadlineAt`, `status`, `flagCount`, `forced` | Same, every 10 s |
| Clock offset from heartbeats; the clock never pauses | Same |
| Answer `revision` counter so a slow request can't overwrite a newer answer | Same |
| Heartbeat gap shown to admins but not counted as a flag | Computed when the admin views the attempt, no background job |
| Risk score from a small points table, used to sort the review queue | Same idea, five signals |
| Admin principles: one primary action per screen, shared status chips, never say "cheating", every decision needs a note | Admin UI rules (§6.1) |
| Builder: outline + editor + live preview; publish checklist that lists every problem | Same, single section |
| Settings with an explicit save bar; Proctoring tab with presets and a rules table | Same |
| Invigilation live grid (latest screenshot, sensor icons, last seen, flag count) + flag feed | Live monitor |
| Review console: queue, evidence filmstrip around the flag, Clear / Suspicious / Disqualify with a required note, dismiss a flag | Same |
| Result policy (pass mark, hold auto-ended attempts until reviewed) + publish dialog with dry-run counts | Same, minus bands |
| Analytics: overview tiles, score distribution, items table, integrity charts | Simplified versions (§6.6) |
| Admin actions: end, extend, resume after a wrong auto-end (with extra allowed flags) | Same |
| Face counting (`apps/web/candidate/features/media/face.ts`, 55 lines): MediaPipe BlazeFace, 1 sample/s, no-face after 5 s, multi-face on 2 samples in a row, too-far and low-light hints | Same logic, run in the renderer (§5.5) |
| Question types `mcq_single`, `mcq_multi`, `true_false`, `short_text`, `numeric`, `ordering`, `matching`, with their scoring rules | The seven auto-graded types that fit tech exams (§5.4) |
| Evidence grouped per student, one folder per attempt, ids only in paths | Same folder layout on the student's Mac and on the server |

### Left out on purpose

Magic-link entry (we use login), programs, sections and section timers, the other 25 question types (essays, sketches, scales, media answers and so on), anything needing manual marking, file uploads, calculator and scratchpad, accessibility menu, co-editing and locks, RBAC with eight roles, invitations, MFA, graders, merit lists, cutoff simulator, cohorts, CRM integration, S3 and presigned URLs, IndexedDB, virtual-camera detection, second-device detection, ⌘K palette, notification bell, full audit log, email.

### What a desktop app does better (good viva point)

RishiPariksha runs in a browser, so it has to work around browser limits: the screen-share picker, `displaySurface` checks, guessing at extra monitors. Athena's main process reads the OS directly. `desktopCapturer` captures the screen without a picker, `screen.getAllDisplays()` gives the real display count, `powerMonitor` reports sleep, lock and idle, and `BrowserWindow` controls fullscreen.

## 4. Architecture

```
┌──────────────────── Athena.app (DMG) ────────────────────┐          ┌──── backend (node) ─────┐
│ Renderer (React)                                         │          │ Express 5               │
│   screens, state, webcam capture (getUserMedia)          │          │  /api/auth              │
│      │  window.athena.*   (contextBridge, preload.cjs)   │          │  /api/exams, attempts   │
│      │  ipcRenderer.invoke / on   (whitelisted only)     │          │  /api/admin/...         │
│ Main process                                             │   HTTP   │                         │
│   api.js       net.fetch + token, retry queue  ─────────────────────► routes → lib → store    │
│   capture.js   desktopCapturer screenshots               │          │ data/*.json             │
│   detectors.js blur, fullscreen, screen, powerMonitor    │          │ data/evidence/<attempt>/│
│   window.js    fullscreen, dialogs, menu, nativeTheme    │          │                         │
└──────────────────────────────────────────────────────────┘          └─────────────────────────┘
```

**The main process makes every HTTP call.** The renderer calls `window.athena.api(name, params)`. Main checks `name` against a fixed route table, adds the token and calls the server with `net.fetch`. The renderer never sees the token, there's no CORS, and the preload API is the security boundary.

**Evidence is saved locally first, as v1 does, then uploaded.**
- Screenshots: main captures them with `desktopCapturer`.
- Webcam photos: the camera lives in the renderer, so the renderer encodes a JPEG and sends the bytes to main over IPC.
- When a detector fires, main sends `capture-now` to the renderer and takes a screenshot itself.
- Main writes every image to a folder on the student's Mac before anything else:
  ```
  ~/Library/Application Support/Athena/evidence/<attemptCode>/
    screen/2026-10-25T10-15-30Z_0014.jpg
    camera/2026-10-25T10-15-30Z_0014.jpg
    identity/2026-10-25T10-02-11Z_0001.jpg
    manifest.json        one entry per image: file, kind, seq, capturedAt, reason, uploaded
  ```
- The upload queue works from `manifest.json`. An image is marked `uploaded: true` only after the server confirms it. If the network drops or the app crashes, nothing is lost; the queue picks up from the manifest.
- The server stores its copy the same way: `backend/data/evidence/<userId>/<attemptId>/{screen,camera,identity}/`. Paths contain ids, never names.
- Local copies stay after the exam. The done page and Settings have **Show evidence folder** (`shell.openPath`). Settings also has **Delete local evidence** for submitted attempts once every image is uploaded.
- Viva point: local-first saving is what makes evidence crash-safe. The folder doubles as the upload queue.

**Answers survive a crash.** Main keeps unsent answers and events in a queue and writes it to `userData/queue.json` before each send. After a crash or a lost connection, main resends the queue in order on the next launch or reconnect. The status bar shows "Saved", "Saving…" or "Offline · 3 kept".

**The clock.**
- Starting an attempt stores `deadlineAt` on the server.
- The heartbeat returns `serverNow`. The client keeps `offset = serverNow − Date.now()` (median of the last 5) and shows `deadlineAt − (Date.now() + offset)`.
- Admin actions reach the student through the next heartbeat (`deadlineChanged`, `endedByAdmin`).
- The server rejects answers after the deadline plus 30 s of grace. It marks overdue attempts `submitted` with reason `deadline` the next time anything reads them, so no background job is needed.

**Loading the UI through `app://`.** The packaged app serves `dist/` through a custom `app://` protocol (`protocol.handle`, registered as standard, secure and fetch-enabled) instead of `file://`. Chromium blocks `fetch()` on `file://`, and MediaPipe needs `fetch()` to load its WebAssembly and model files. The protocol handler only serves files inside the app bundle.

**Window and security.**
- `contextIsolation: true`, `sandbox: true` and `nodeIntegration: false`, written out explicitly.
- DevTools only when not packaged. CSP meta tag.
- `setWindowOpenHandler` denies all, `will-navigate` is blocked, and `setPermissionRequestHandler` allows only `media`.
- `titleBarStyle: 'hiddenInset'` with a CSS drag region. `nativeTheme` for light/dark.
- A trimmed `Menu` with no Reload or DevTools in production.
- Single-instance lock per profile, plus a `--profile=<name>` flag that gets its own `userData` folder. That lets you run a student copy and an admin copy side by side in the viva.

## 5. Student experience

### 5.1 Rules for the exam UI (from RishiPariksha's "quiet room")

1. One thing at a time. Each pre-test step is one centred card, and each question gets the whole stage.
2. Never alarm. Rules are explained before they apply. Warnings go amber before red. Nothing flashes or beeps.
3. Always say the work is safe. The save state is always visible.
4. Respect attention. The timer shows no seconds until the last 5 minutes. Nothing animates while the student is reading.
5. Be transparent. The student always knows what is captured, how many flags they have and why.

### 5.2 Visual language

- **Font.** The system font (SF Pro via `-apple-system`) and SF Mono for the timer and codes, so there are no font files to ship. Tabular figures for numbers.
- **Colour tokens.** Light values first, dark (warm charcoal) values in brackets:
  - `--canvas` `#FBF8F2` (`#17181A`), `--surface` `#FFFFFF` (`#1F2023`), `--surface-sunk` `#F3EFE7` (`#141517`)
  - `--ink` `#1E2529` (`#ECE9E3`), `--ink-soft` `#5A646B` (`#A9A59E`), `--line` `#E7E1D7` (`#2C2D31`)
  - `--focus` indigo `#3B4CCA` (`#8C98FF`), `--focus-tint` `#ECEEFB` (`#272B4A`)
  - `--ok` `#1F7A4D`, `--attention` `#B4690E`, `--critical` `#B3122F`
- **Meaning never relies on colour alone.** Every state also has an icon or a word.
- **Space and shape.** 4 px grid. Question stage max 760 px wide. 10 px radius for controls, 14 px for cards, 1 px borders, shadows only on overlays.
- **Motion.** 120–180 ms ease-out. Selecting an option fills its radio from the centre; moving between questions is a 160 ms crossfade. `prefers-reduced-motion` turns all of it off.
- **Icons.** Lucide at 16 px, always with a label or tooltip.
- **Layout.** Native Mac structure: hidden-inset title bar with traffic lights, a sidebar on dashboards, a sheet-style dialog for confirmations.

### 5.3 Screens

1. **Login.** Roll number + password. Errors are calm and specific. If the server is down, a "Can't reach the exam server" card shows the URL, a **Retry** button and **Change server** (saved in settings).
2. **Dashboard.** Sidebar: Exams, Results, Analytics, Settings.
   - Exams lists cards with title, window, duration, question count and status: *Upcoming*, *Open*, *In progress (resume)*, *Submitted*, *Closed*.
3. **Exam detail.** Description, duration, number of questions, pass mark, a proctoring summary ("Camera photo about every 45 s · screen about every 60 s · ends at 5 flags"), and **Get started**.
4. **Step 1, System check.** Checks run one after another, each showing *checking → ✓* or *✕ + fix card + Run again*. A live camera preview anchors the screen.
   - Server reachable.
   - Camera works (`getUserMedia`).
   - Camera permission (`systemPreferences.getMediaAccessStatus('camera')`, ask with `askForMediaAccess`).
   - Face: "Hold still, facing the camera". Needs exactly one face for 2 s. This is also where the face model loads, so it never loads mid-exam. If it can't load, the check shows "Face check unavailable" and the exam continues without face rules; admins see a note on the attempt.
   - Light: warns (doesn't block) if the frame is too dark.
   - Screen Recording permission. The fix card says "macOS needs Athena to restart" and has **Quit and reopen** (`app.relaunch()`).
   - Exactly one display (`screen.getAllDisplays()`). The fix card says "Disconnect it, or mirror your displays."
5. **Step 2, Rules and consent.** Generated from the exam's config:
   - How the test works: duration, the clock doesn't pause, answers save automatically.
   - The rules: stay in fullscreen, don't switch apps, stay in camera view, one display, copy/paste is off.
   - Flags: "At 5 flags your test ends automatically. Staff review every flag."
   - What we capture, as three required checkboxes.
   - The platform terms, in a scroll box, with one more required checkbox.
6. **Step 3, Identity photo.** Take a photo, retake if needed, use it. The photo needs exactly one face. It's saved to the `identity/` folder and uploaded as the attempt's identity evidence.
7. **Step 4, Start.** "The clock starts when you press Begin." **Begin** puts the window in fullscreen and starts the attempt on the server.
8. **Exam.**
   - **Status bar:** exam name, `⏱ 58 min left`, `✓ Saved`, `⚑ 1/5`, and a camera dot.
   - **Below it:** a 2 px answered-progress line.
   - **Left rail:** question numbers with distinct shapes (● answered, ○ not yet, ◐ seen, ⚐ marked, ◉ current), filters (All / Unanswered / Marked) and the legend.
   - **Stage:** "Question 4 of 20 · 2 marks · ☆ Mark", then the question text and the answer area for its type (§5.4).
   - **Keyboard:** `1–9` choose an option, `N`/`P` next/previous, `M` mark, `Q` toggles the rail. Typing in a text box turns the letter shortcuts off.
   - On the last question, **Next** becomes **Review & submit**.
9. **Flags during the exam.** A toast on every flag ("Flag 2 of 5 · You left the exam window"). A modal on the first flag (explains how flags work) and at N−1 ("One more flag will end your test"). The ⚑ counter opens a sheet listing each flag with time, rule and the question that was open.
10. **Blocking overlays.** *You left fullscreen* → **Return to fullscreen**. *We lost your camera* → **Reconnect**. The question is hidden behind the overlay, and the overlay says the clock is still running. Face problems use a toast, not an overlay ("We can't see your face. Please face the camera."), because covering the question would punish someone who glanced away.
11. **Offline banner.** "You're offline. Keep working: your answers are kept on this computer." On reconnect: "✓ Back online. Everything is saved."
12. **Timer.** At 10 min it turns amber and shows a toast. At 5 min seconds appear. At 1 min it turns red and shows a banner. At 0: "Time's up. Submitting your answers…"
13. **Review & submit.** Shows "18 of 20 answered", marked questions first, then unanswered, each with **Go**. Then a native confirm dialog: "Submit your exam? 18 of 20 answered." with Submit and Keep working.
14. **Quitting mid-exam.** A native confirm: "Your exam is still running and the clock won't stop." The attempt stays open; on relaunch the dashboard shows **Resume**.
15. **Done.**
    - Shows "Your exam is submitted, Asha", "We received 18 of 20 answers", and "Camera and screen capture are off."
    - A receipt card with attempt code, exam, time and answer count. **Save receipt (PDF)** uses `webContents.printToPDF` + `dialog.showSaveDialog`.
    - The title changes with how it ended: *submitted*, *time's up*, *ended after 5 flags*, *ended by the examiner*.
    - **Show evidence folder** opens this attempt's local folder.
    - The done page itself shows no score. If the exam shows results right after submitting, it has a **View your results** button. Otherwise it says "Results will appear when your examiner publishes them."
16. **Results.** Available when the exam's setting allows it: right after submitting, or once the admin publishes. An auto-ended attempt on an exam that holds those for review waits for the admin's decision either way.
    - A large outcome word (*Passed* / *Not passed*, no green or red), score and percent.
    - Every question through `QuestionView` in review mode: your answer, the correct answer, marks earned and the explanation.
    - Filters: All / Wrong / Marked.
    - Before results are available: "Results aren't available yet."
17. **My analytics.**
    - Tiles: exams taken, average %, best %, flags per attempt.
    - Charts: score trend line across attempts, accuracy by topic (bars), accuracy by question type, time per question vs. the class median (released exams only), integrity summary per attempt.

### 5.4 Question types

Seven types, all auto-graded, picked from RishiPariksha's catalogue because they suit tech exams. Each type is one small module with three parts: an `Answer` component (exam mode), an `Editor` component (builder) and a pure `score(question, response)` function on the server. `QuestionView` picks the module by `type`.

| Type | Student does | Config | Scoring | Example (seed exams) |
|---|---|---|---|---|
| `single` | Picks one option | 2–8 options, `correctOptionId` | Full marks or 0 | "Which process creates `BrowserWindow`?" |
| `multi` | Picks all that apply | options, `correctOptionIds`, `scoring: all_or_nothing \| partial` | Partial: `marks × max(0, (right − wrong) / correct)` | "Which of these run in the main process?" |
| `true_false` | True or False | `correct` | Full or 0 | "`contextIsolation` is on by default in Electron 44." |
| `short_text` | Types a short answer | `accepted: string[]`, `caseSensitive`, max 100 chars | Match after trimming and collapsing spaces. Never regex | "Which `ls` flag shows hidden files?" → `-a` (case-sensitive) |
| `numeric` | Types a number | `answer`, `tolerance` (absolute), optional unit | Within tolerance = full | "What exit code means success?" → `0` |
| `ordering` | Puts items in order with ↑/↓ buttons or drag | 3–8 items, correct order | `exact` or `positional` (marks per item in place) | "Order the steps of an IPC round trip" |
| `matching` | Picks a right-side match for each left item from a dropdown | left items, right items (may include extras), `pairs` | Marks split per correct pair | "Match each Swift keyword to what it does" |

- **Code in questions.** Question text and options support fenced code blocks (```` ```bash ````), shown in SF Mono on a sunk surface. There's no syntax-highlighting library; plain mono is easy to read.
- **Rules for every type.** Unanswered scores 0. No negative marks. Scores round to 2 decimals. The answer key never reaches the client before results are available.
- **Accessibility.** Ordering works without drag (↑/↓ buttons and keys), and matching uses plain `<select>` elements, so both work from the keyboard. Same rule as RishiPariksha.
- **Analytics.** Item analysis reports % correct (full marks) and average marks for every type.

### 5.5 Face detection

Ported from RishiPariksha's `face.ts` + `proctor.ts`, which together are about 80 lines of the logic that matters.

- **Engine.** `@mediapipe/tasks-vision` 1.1.0 (the version RishiPariksha pins) with the BlazeFace short-range model. It counts faces; it doesn't recognise who someone is. The WebAssembly and the 228 KB model file ship inside the app and load through `app://`, so nothing comes from the internet at exam time.
- **Sampling.** Once per second the renderer runs `detectForVideo` on the camera feed (`minDetectionConfidence: 0.6`, CPU). It skips samples while the window is hidden.

| Condition | Event | Flag? |
|---|---|---|
| 0 faces for 5 s | `no_face` (start, and end when a face returns) + camera photo + screenshot | Yes |
| 2 or more faces in 2 samples in a row | `multiple_faces` + camera photo + screenshot. Won't fire again for 30 s | Yes |
| One face narrower than 14% of the frame for 10 s | `face_too_far` | No, hint toast |
| Average brightness below 45/255 for 10 s | `low_light` | No, hint toast |
| Model failed to load | `face_detection_unavailable`, once | No. Admin sees it on the attempt |

- **Server side.** Face events go through the same flag engine as every other rule (counts, warns, 2 s merging, auto-end). Risk score adds +5 per `multiple_faces` and +10 if total no-face time is over 2 minutes.
- **Admin config.** Two rows in the Proctoring tab's rules table: No face (after X s) and Multiple faces. Both are on in the Standard preset.
- **Honest limits, for the viva.** It can miss a face in bad light or at a sharp angle, and a photo held up to the camera counts as a face. That's why a person reviews every flag, and why the UI says "flag", never "cheating".

## 6. Admin experience

### 6.1 Rules for the admin UI

- One primary (filled) button per screen.
- Status chips use the same words everywhere:
  - Exam: Draft, Published, Live now, Closed.
  - Attempt: In progress, Submitted, Ended.
  - Review: Pending, Cleared, Suspicious, Disqualified.
  - Result: Not published, Published, Held.
- Every empty state says what to do next ("No questions yet. Add one.").
- Destructive actions name the object and the consequence.
- The UI never says "cheating". It uses *flag*, *evidence* and *decision*, and every decision needs a note.
- Live screens show "Updated 6 s ago · ⟳".

### 6.2 Shell

- Sidebar: Home, Exams, Students, Settings.
- Inside an exam, tabs: **Overview · Questions · Settings · Proctoring · Live · Review · Results · Analytics**.
- The header shows exam name, status chip and the one primary action (Publish… / Publish results…).
- Home shows what needs action: exams live now, attempts waiting for review, exams ready to publish results.

### 6.3 Building an exam

- **Create exam dialog.** Title, description, then it opens the workspace as a draft.
- **Questions tab** (outline + editor + preview).
  - Outline: drag or `⌥↑↓` to reorder. Each row shows type icon, stem, marks and a ⚠ badge for problems.
  - **Add question** opens a type picker with the seven types (§5.4), each with an icon and one-line description.
  - Editor: the shared fields (text with code blocks, marks, topic, explanation), then the type's own `Editor` (options and key, accepted answers, number and tolerance, items in order, pairs). Autosaves 800 ms after typing stops.
  - Preview: the real `QuestionView`. Answering in the preview shows the marks it would get.
- **Settings tab** (explicit save bar).
  - Duration and open/close window. If a student starts late, the attempt ends at window close.
  - Max attempts, shuffle questions, shuffle options.
  - Instructions and terms text.
  - Results: **Show results to students: ( ) Right after they submit (•) When I publish.** Plus a pass mark %, and hold auto-ended attempts until reviewed. "Right after" suits practice tests; "When I publish" suits real tests, because it stops answers spreading while others are still writing.
- **Proctoring tab.**
  - Presets: Standard (ends at 5), Lenient (ends at 10), Monitor only (never ends), Off.
  - Auto-end at N flags.
  - Screenshots every [min]–[max] s, random, plus one at every flag. Camera photo with each screenshot.
  - Rules table with ON / COUNTS / WARN per rule: fullscreen, app switch (away longer than X s), extra display, camera lost, no face (after X s), multiple faces, sleep/lock, idle (X s), copy/paste (block copy-paste, block right-click).
  - Heartbeat gap: shown to admins, never counted.
  - **Preview consent screen** opens the student's rules screen.
- **Publish checklist dialog.** Lists every problem at once, each with a link to fix it: a question with no correct option, an exam with 0 questions, a window that closes before it opens, a duration longer than the window. **Publish** stays disabled until all are fixed. After publishing, questions are locked; unpublish is allowed only while no one has started.

### 6.4 Students

- Table of roll no, name, status, attempts and last active.
- **Add student** dialog. **Import from file** reads a CSV via `dialog.showOpenDialog`, previews it and creates the accounts. This replaces v1's file-picker task with a real use.
- Reset password shows a one-time password once. Deactivate.

### 6.5 Running and reviewing an exam

- **Live tab** (polls every 5 s).
  - Counters: Writing, Flagged, Needs attention (no heartbeat for over 30 s, or camera lost), Ended by limit.
  - Grid of student cards: latest screenshot thumbnail, name and roll no, `⚑ 3/5`, time left, sensor icons (fullscreen, camera, display), "last seen 4 s ago".
  - Sensor icons include a face indicator (✓ one face, ✕ none, ⚠ several), from the last heartbeat.
  - Card actions: **Evidence**, **Extend…**, **End…**.
  - Flag feed underneath, newest first. **Extend everyone…** for a platform problem.
- **Review tab** (the console).
  - Left: queue sorted by risk score (highest first).
  - Right: the selected student's flags, with `←/→` to step through them.
  - For each flag: a filmstrip of webcam and screen images from 2 min before to 2 min after, a large image viewer, and events in that window.
  - Actions: **Dismiss flag** (with a note; lowers the count), and a decision of **Clear**, **Suspicious** or **Disqualify** (note required).
  - **Resume** reopens an auto-ended attempt with extra allowed flags and the time that was left.
- **Identity photo** is shown at the top of the review page, next to the flagged camera photos, so the reviewer can compare faces.
- **Risk score.**
  - Each counted flag: +3.
  - Each `multiple_faces`: +5.
  - Total no-face time over 2 min: +10.
  - Total time away over 2 min: +10.
  - Auto-ended: +10.
  - Screenshot coverage below 80% of expected: +5.
  - Each heartbeat gap: +5.
  - Levels: Low below 10, Review 10–24, High 25 and up. The weights live in one constants file.

### 6.6 Results and analytics

- **Results tab.**
  - Table: student, score, %, outcome, flags, review status, state.
  - Held rows show why ("auto-ended, review pending").
  - "When I publish" exams: **Publish results…** opens a dialog with the counts first ("41 will be published · 3 held for review"), then confirm.
  - "Right after submitting" exams: no publish button. The header says "Students see results when they submit". Held attempts still need a decision, and **Release** on the row makes the result visible.
  - **Export CSV** uses `dialog.showSaveDialog` + `fs` in main.
- **Analytics tab** (submitted attempts only).
  - Overview tiles: submitted / started, completion %, mean, median, average time used.
  - Score distribution: histogram in 10% bins with markers for mean, median and pass mark, plus a one-line reading ("Most students scored between 50 and 70%").
  - Questions table: type, % correct (difficulty), average marks, average time, the most common wrong answer (option, text or number), and a ⚠ when more top-scoring students pick a wrong option than the key (a sign the key is wrong).
  - By topic: average accuracy per topic.
  - Integrity: flags by rule (bars), flags by minute into the exam (bars), auto-ended count, review decisions.
- Charts are small hand-written SVG components (bar, line, histogram), each with a table view.

## 7. Where each class concept is used (the viva map)

| Concept | Feature |
|---|---|
| `BrowserWindow` options, events | Hidden-inset window, fullscreen, `blur`, `leave-full-screen`, quit confirm on `close` |
| Preload + `contextBridge` | `window.athena` API, the only bridge |
| `ipcRenderer.invoke` / `ipcMain.handle` | `api(name, params)`, `capture:webcam`, `dialog:*`, `exam:fullscreen` |
| `webContents.send` (main → renderer) | Detector events, `capture-now`, heartbeat state, offline/online |
| `dialog.showMessageBox` | Submit confirm, quit confirm, final flag warning |
| `dialog.showOpenDialog` | Import students from CSV |
| `dialog.showSaveDialog` | Save receipt PDF, export results CSV |
| `desktopCapturer` | Periodic and on-flag screenshots |
| `getUserMedia` + `ImageCapture` / canvas | Camera check, identity photo, webcam evidence, brightness check |
| `protocol.handle` (custom `app://`) | Serving the UI and the face model in the packaged app |
| `shell.openPath` | Show evidence folder |
| `webContents.printToPDF` | Save receipt as PDF |
| `screen` module | Display check before start, `display-added` during the exam |
| `powerMonitor` | Sleep, lock, idle detection |
| `systemPreferences` | Camera and Screen Recording permission checks |
| `nativeTheme`, `Menu`, `app.relaunch` | Theme, trimmed menu, restart after granting permission |
| `net.fetch` in main | All server calls |
| Node `fs`, `path`, `crypto` | Local evidence folders and manifest, crash-safe queue, scrypt passwords, tokens |
| MediaPipe in the renderer | Face counting (§5.5), the one library that isn't a class topic, kept small and explained |
| Express REST + JSON files | Whole backend |
| React + Vite | Whole UI |
| electron-builder | DMG + GitHub Release |

## 8. Data model (JSON files)

Every write goes through `lib/store.js`, which queues writes per file and writes atomically (temp file + `rename`). Ids are random (`crypto.randomUUID()`). Evidence paths contain ids only, never names. Dates are ISO 8601 UTC strings.

```jsonc
// users.json
{ "id": "u_8f2c...", "rollNo": "23CS042", "name": "Asha Rao", "role": "student",
  "passwordHash": "<scrypt hex>", "salt": "<hex>", "active": true, "createdAt": "2026-10-23T10:00:00.000Z" }

// sessions.json (login tokens, stored hashed)
{ "tokenHash": "<sha256 hex>", "userId": "u_8f2c...", "expiresAt": "2026-10-24T10:00:00.000Z" }

// exams.json
{ "id": "ex_01...", "title": "Electron Basics", "description": "...", "status": "draft",
  "durationMinutes": 30, "opensAt": "...", "closesAt": "...", "maxAttempts": 1,
  "shuffleQuestions": true, "shuffleOptions": true, "instructions": "...", "terms": "...",
  "resultPolicy": { "visibility": "after_publish", "passPercent": 40, "holdAutoEnded": true },
  "resultsPublishedAt": null,
  "proctoring": {
    "enabled": true, "preset": "standard",
    "autoEnd": { "enabled": true, "maxFlags": 5 },
    "screenshots": { "minSec": 45, "maxSec": 60, "onFlag": true },
    "cameraPhotos": { "withScreenshots": true },
    "rules": {
      "fullscreen": { "on": true, "counts": true, "warn": true },
      "focus":      { "on": true, "counts": true, "warn": true, "minAwaySec": 1.5 },
      "displays":   { "on": true, "counts": true, "warn": true },
      "camera":     { "on": true, "counts": true, "warn": true },
      "noFace":     { "on": true, "counts": true, "warn": true, "afterSec": 5 },
      "multiFace":  { "on": true, "counts": true, "warn": true },
      "power":      { "on": true, "counts": true, "warn": true },
      "idle":       { "on": true, "counts": false, "warn": true, "afterSec": 120 },
      "clipboard":  { "on": true, "counts": true, "warn": true, "blockCopyPaste": true, "blockContextMenu": true }
    }
  },
  "questions": [
    // shared fields on every question: id, type, text, marks, topic, explanation; then a per-type "config" and "key"
    { "id": "q_01...", "type": "single", "text": "...", "marks": 2, "topic": "IPC", "explanation": "...",
      "config": { "options": [ { "id": "o_a...", "text": "..." } ] }, "key": { "optionId": "o_b..." } },
    { "id": "q_02...", "type": "multi", "config": { "options": [], "scoring": "partial" }, "key": { "optionIds": [] } },
    { "id": "q_03...", "type": "true_false", "key": { "value": true } },
    { "id": "q_04...", "type": "short_text", "config": { "maxChars": 100 }, "key": { "accepted": ["-a", "--all"], "caseSensitive": true } },
    { "id": "q_05...", "type": "numeric", "config": { "unit": null }, "key": { "answer": 0, "tolerance": 0 } },
    { "id": "q_06...", "type": "ordering", "config": { "items": [ { "id": "i_1...", "text": "..." } ], "scoring": "positional" }, "key": { "order": ["i_2...", "i_1..."] } },
    { "id": "q_07...", "type": "matching", "config": { "left": [ { "id": "l_1...", "text": "..." } ], "right": [ { "id": "r_1...", "text": "..." } ] }, "key": { "pairs": { "l_1...": "r_3..." } } }
  ] }

// attempts.json
{ "id": "at_5d1e...", "examId": "ex_01...", "userId": "u_8f2c...", "code": "ATH-7K4Q-9M2X",
  "status": "in_progress", "submitReason": null,
  "startedAt": "...", "deadlineAt": "...", "submittedAt": null, "lastSeenAt": "...",
  "questionOrder": ["q_03...", "q_01..."], "optionOrder": { "q_01...": ["o_c...", "o_a..."] },
  // "response" shape depends on the type: { optionId } | { optionIds } | { value } | { text } | { number } | { order } | { pairs }
  "answers": { "q_01...": { "response": { "optionId": "o_b..." }, "revision": 3, "timeSpentSec": 42, "marked": false, "marksAwarded": null } },
  "resultVisibleAt": null, "faceDetection": "ok",
  "flagCount": 2, "flagAllowance": 0, "remainingSecAtEnd": null,
  "score": null, "maxScore": 40, "risk": { "score": 0, "level": "low", "reasons": [] },
  "review": { "status": "pending", "note": "", "by": null, "at": null } }

// evidence/<userId>/<attemptId>/events.jsonl (one event per line, append only; images sit next to it in screen/ camera/ identity/)
{ "seq": 14, "at": "...", "type": "window_blur", "phase": "start", "questionId": "q_03...", "flagId": "fl_2..." }

// evidence/<userId>/<attemptId>/flags.json
{ "id": "fl_2...", "rules": ["focus", "fullscreen"], "startedAt": "...", "counted": true,
  "captures": ["screen/2026-10-25T10-15-30Z_0014.jpg", "camera/2026-10-25T10-15-30Z_0014.jpg"], "dismissed": null }
```

- **Attempt status:** `in_progress` or `submitted`. `submitReason` is `student`, `deadline`, `flag_limit` or `admin`.
- **Grading:** one pure `score()` per type in `lib/scoring/` (rules in §5.4). The server scores at submit and stores `marksAwarded` per answer.
- **Result visibility:** at submit, `resultVisibleAt` is set to now for "right after" exams (unless the attempt is held). For "when I publish" exams it's set at publish. `GET /attempts/:id/result` checks only this field.
- **Event types:**
  - Counted: `fullscreen_exit`, `window_blur`, `display_added`, `camera_lost`, `no_face`, `multiple_faces`, `system_sleep`, `screen_locked`, `clipboard_attempt`.
  - Not counted by default: `idle`.
  - Info only: `face_too_far`, `low_light`, `face_detection_unavailable`, `network_offline`, `app_quit`, `app_resumed`.
  - Admin actions: `admin_extended`, `admin_ended`, `admin_resumed`, `flag_dismissed`. Logging these in the same file gives a small audit trail.

## 9. API (all under `/api`, response `{ ok, data, error }`)

Overview only. The complete list, with the names the app uses, is the route table in §18; request rules are in §19.5 and shapes in §21.

**Auth**
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

**Student**
- `GET /exams`: published, with my status and attempts left.
- `GET /exams/:id`: details, rules config, no questions.
- `POST /exams/:id/attempts`: start, or resume the open attempt. Returns questions in this attempt's order, no answer key.
- `GET /attempts/:id`: state for resume. Includes answers, flag count and deadline, no scores.
- `PUT /attempts/:id/answers/:qid`: body `{ revision, response, timeSpentSec, marked }`. The server checks `response` against the question's type.
- `POST /attempts/:id/heartbeat`: queued events in; `{ serverNow, deadlineAt, status, flagCount, maxFlags, warnings, forced }` out.
- `POST /attempts/:id/events`: urgent events. Returns `{ accepted, warnings, forced }`.
- `POST /attempts/:id/evidence?kind=screen|camera|identity&seq=&capturedAt=`: raw `image/jpeg` body, max 1 MB. Idempotent on `seq`, so a retried upload doesn't create a duplicate.
- `POST /attempts/:id/submit`: returns `{ received, total, submittedAt, code }`.
- `GET /attempts/:id/result`: 404 until `resultVisibleAt` is set. Returns score, outcome, and each question with key, response, marks and explanation.
- `GET /me/attempts`, `GET /me/analytics`

**Admin** (`requireRole('admin')`)
- Exams:
  - `GET|POST /admin/exams`, `GET|PATCH|DELETE /admin/exams/:id`
  - `PUT /admin/exams/:id/settings`, `PUT /admin/exams/:id/proctoring`
  - `POST /admin/exams/:id/questions`, `PATCH|DELETE /admin/exams/:id/questions/:qid`, `PUT /admin/exams/:id/questions/order`
  - `POST /admin/exams/:id/publish`: returns all problems or publishes. `POST /admin/exams/:id/unpublish`
- Students:
  - `GET|POST /admin/users`, `POST /admin/users/import`, `PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password`
- Live and review:
  - `GET /admin/exams/:id/live`
  - `GET /admin/exams/:id/review-queue`
  - `GET /admin/attempts/:id`: full detail with flags, events and risk.
  - `GET /admin/attempts/:id/evidence/:file`
  - `POST /admin/attempts/:id/flags/:flagId/dismiss`
  - `PUT /admin/attempts/:id/review`: body `{ status, note }`.
  - `POST /admin/attempts/:id/extend | end | resume`, `POST /admin/exams/:id/extend-in-progress`
- Results and analytics:
  - `GET /admin/exams/:id/results`, `POST /admin/exams/:id/results/publish` (supports `dryRun`), `POST /admin/attempts/:id/release`, `GET /admin/exams/:id/results.csv`
  - `GET /admin/exams/:id/analytics`

**Inputs.** The server checks every input with small hand-written validators in `lib/validate.js`; there's no library for this. Errors come back as `{ ok: false, error: { code, message, fields } }`.

## 10. Folder layout

```
Proctor/
  BUILD_PLAN.md  VIVA.md  README.md  .gitignore
  backend/
    server.js                 creates the app, mounts routes, listens on 127.0.0.1
    routes/                   auth.js exams.js attempts.js me.js admin/{exams,users,live,review,results,analytics}.js
    lib/                      store.js auth.js validate.js flags.js risk.js analytics.js clock.js
    lib/scoring/              index.js single.js multi.js trueFalse.js shortText.js numeric.js ordering.js matching.js
    data/                     seed JSON (evidence/, sessions.json and attempts.json gitignored)
    scripts/seed.js           admin + 10 students + 2 sample exams
    requests.http
  app/                        (was frontend/)
    electron/                 main.js preload.cjs window.js protocol.js api.js routes.js queue.js evidence.js capture.js
                              detectors.js heartbeat.js exam.js system.js files.js menu.js validate.js   (jobs in §17.4)
    src/
      styles/                 tokens.css base.css
      components/             Button Input Checkbox Card Chip Dialog Sheet Toast Table Tabs Stepper EmptyState charts/
      question/               QuestionView.jsx (exam, preview, review modes), CodeText.jsx
      question/types/         single/ multi/ trueFalse/ shortText/ numeric/ ordering/ matching/   each: Answer.jsx Editor.jsx Review.jsx
      proctoring/             face.js (MediaPipe wrapper) faceLoop.js brightness.js webcam.js
      features/               auth/ student/ pretest/ exam/ results/ analytics/ admin/
    public/mediapipe/         wasm files (copied from the npm package at build time)
    public/models/            blaze_face_short_range.tflite
      lib/                    api.js format.js shortcuts.js
    electron-builder.yml
```

Client dependencies: React, `react-router` (hash router), `lucide-react` and `@mediapipe/tasks-vision` 1.1.0. Server dependencies: `express`.

## 11. Phases

Each phase ends with the demo listed, a `VIVA.md` section (what it does, the data flow, the APIs used, likely questions) and a commit.

Which screens (SCREENS.md) and contracts (Part 2) each phase builds:

| Phase | Screens | Contracts |
|---|---|---|
| 0 | (spike page only) | `app://` protocol, evidence folder |
| 1 | (none, API only) | §18 server side, §19, §20, §21 |
| 2 | S1, S2, S3, A0 and the student sidebar | §16, §17.1, §17.2 auth/server/app/theme, §22.1 |
| 3 | C1–C6 | `system:*`, `evidence:save` (identity), `exam:enter`, §22.2 |
| 4 | C7, C7a, C8, C11, C12, C13, C14 | queue, heartbeat, `dialog:confirmSubmit`, `receipt:savePdf`, §22.3, §22.4, §22.7, §22.10 |
| 5 | C9, C10 | detectors, capture, evidence upload, `exam:event`, `exam:warning`, §22.5, §22.6 |
| 6 | A1–A8 | `file:openCsv`, `file:saveCsv` |
| 7 | A9, A9a, A10, A10a | `evidence:adminImage`, §22.8 |
| 8 | C15–C17, A11, A11a, A12 | `results:exportCsv`, §22.9 |
| 9 | every screen's loading, empty and error states | — |

**Phase 0. Baseline and packaging spike → v0.1.0 pre-release**
- `.gitignore`, delete the 7 personal screenshots, commit v1 as the baseline.
- Fix the packaging blockers: serve the UI through `app://` when packaged, Vite `base: './'`, `userData` paths (v1's snapshot folders move there), `main` and `productName`.
- Spike: load MediaPipe and count faces in the **packaged** app. This is the riskiest technical piece, so it gets proven before anything is built on it.
- electron-builder: arm64 DMG, `NSCameraUsageDescription`, check ad-hoc signing.
- `gh release create v0.1.0 --prerelease`.
- Demo: download the DMG from GitHub, open it after the quarantine workaround, the camera prompt appears, a face count shows on screen, and a snapshot lands in the local evidence folder.

**Phase 1. Backend core**
- Restructure into routes and `lib/`. `store.js`, response envelope, validators.
- Auth (scrypt, hashed tokens, roles). Seed script.
- Exam and question CRUD for all seven types, the seven `score()` functions, publish checklist, student exam listing without the key.
- Seed script with the four exams and sample terms (§14, §15).
- Demo: in `requests.http`, the admin creates and publishes an exam and the checklist catches a missing key. A student lists exams and the key isn't in the response. A scripted attempt on each type gets the expected marks.

**Phase 2. Shell and design system**
- Secure window, hidden-inset title bar, theme, menu, `--profile`.
- Main-process API client and route table.
- Tokens and base components. Login, server-unreachable and settings screens. Empty student and admin shells.
- Demo: log in as each role, theme follows macOS, stop the backend and the unreachable card appears, renderer DevTools show no token.

**Phase 3. Student pre-test**
- Dashboard, exam detail, stepper: system check with fix cards (including the face and light checks), rules and consent, identity photo, start.
- Demo: plug in a second display and Begin stays blocked. Deny Screen Recording and the restart fix card works. Two people in frame block the identity photo.

**Phase 4. Exam runtime → v0.2.0**
- Attempt start/resume, `QuestionView` with the seven `Answer` components and code blocks, rail, marking, shortcuts, autosave with revision.
- Crash-safe queue, heartbeat clock, gentle timer, review & submit, confirm dialogs, auto-submit, done page with PDF receipt.
- Demo: answer, quit mid-exam, relaunch and resume with the right time left. Pull the network and answers queue, then sync. Let time run out and it auto-submits.

**Phase 5. Proctoring**
- Client side: detectors in main, the face loop in the renderer, local-first evidence folders with the manifest-driven upload queue, screenshots and webcam photos at random intervals and on flags, toasts, modals, flags sheet, blocking overlays.
- Server side: flag engine with 2 s incident merging, counting, auto-end, warnings.
- Demo:
  - ⌘Tab gives one flag, not two.
  - Leave the camera's view for 5 s, then have a second person lean in; each gives a flag with a camera photo.
  - Plug in a display, sleep the lid, try to paste; each makes a flag.
  - Turn off Wi-Fi: images pile up in the local folder, then upload on reconnect.
  - The 5th flag ends the exam with the "ended after 5 flags" done page.

**Phase 6. Admin: building → v0.3.0**
- Exams list, create, builder with type picker, seven `Editor` components and preview, settings (including result visibility), proctoring tab with presets, publish checklist.
- Students: add, CSV import, reset.
- Demo: build an exam with one question of each type and a custom proctoring preset, preview it, publish it, and see it on the student dashboard.

**Phase 7. Admin: live and review**
- Live grid and flag feed (polling), extend/end/resume.
- Review console with filmstrip, dismiss, decisions, risk score.
- Demo (two profiles side by side): the admin watches the student live. Extending time makes the student's timer jump. Ending the attempt shows the "ended by the examiner" done page. Resuming an auto-ended attempt lets the student continue.

**Phase 8. Results and analytics → v0.4.0**
- Result policy with both visibility modes, publish dialog with dry run, per-attempt release, CSV export.
- Student results page with review per type, student analytics, admin analytics.
- Demo: a "right after" exam shows results on submit. A "when I publish" exam hides them until publish. A held auto-ended attempt stays hidden in both until released. Analytics numbers match a hand calculation on the seed data.

**Phase 9. Polish → v1.0.0**
- App icon. Loading, empty and error states on every screen. Keyboard and focus pass. Copy pass.
- README: setup, running backend + app, quarantine workaround, the concept map from §7.
- Final `VIVA.md`. Release v1.0.0.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Scope. This is now a large project | Phases are ordered so that after Phase 5 there's already a complete, demo-able student product. Phases 6 to 8 add admin. New ideas go to a "later" list, not into the current phase |
| Screen Recording permission only applies after a restart | Fix card with **Quit and reopen** (`app.relaunch`) |
| Unsigned app shows "damaged" after download | README workaround, tested in Phase 0 |
| Evidence volume | JPEG at 1280 px, 45–60 s intervals, 1 MB cap; about 10 MB per 30-min attempt, stored twice (student Mac and server). **Delete local evidence** in Settings frees the student's copy |
| MediaPipe won't load in the packaged app (`file://` blocks `fetch`) | `app://` protocol, proven in the Phase 0 spike before anything depends on it |
| Face detection false positives (bad light, angle, glasses) | 5 s threshold, 2-sample confirmation for multi-face, low-light hint, every flag reviewed by a person, admin can turn the rules off or stop them counting |
| Face detection CPU on older Macs | 320 px input, 1 sample/s, skipped while the window is hidden. If a sample takes over 50 ms, sample every 2 s instead |
| DMG size | MediaPipe adds its WebAssembly files. Ship only the SIMD build the Apple Silicon Mac needs, not all 37 MB |
| Seven question types is more work than one | Each type is one small module with the same three parts. If time runs short, `ordering` and `matching` move to the "later" list and the other five ship |
| JSON write races | One server process, per-file write queue, atomic rename |
| Clock differences between laptops | The server clock is the only clock; the client uses the heartbeat offset |
| Running admin and student on one Mac for the viva | `--profile` flag gives each copy its own `userData` and lock |
| ⌘Tab and Mission Control can't be blocked on macOS without kiosk mode | We detect and flag them instead of blocking. That's what RishiPariksha does too, and it's an honest viva answer |

## 13. Open questions

None blocking. Earlier answers: sample terms written (§15), every student sees every published exam, seed exams as in §14.

## 14. Seed exams

The seed script creates one admin, 10 students and these four published exams. Each exam has 12 questions covering all seven types, so the demo shows every renderer. The exams use different settings so each mode can be shown.

| Exam | Duration | Topics (tags) | Results | Proctoring preset |
|---|---|---|---|---|
| CLI Apps | 20 min | Shell basics, flags and arguments, stdin/stdout, exit codes, Node CLI (`process.argv`, `readline`) | Right after submitting | Lenient (ends at 10) |
| Electron Apps | 30 min | Process model, preload and `contextBridge`, IPC, `BrowserWindow`, `dialog`, packaging | When I publish | Standard (ends at 5) |
| React Native | 25 min | Components and JSX, state and props, `FlatList`, navigation, native modules | When I publish | Standard |
| Swift Apps | 25 min | Optionals, structs vs classes, closures, SwiftUI views and state, Xcode build basics | Right after submitting | Monitor only (never ends) |

Example questions, one per type:
- `single`, Electron: "Which process can call `dialog.showOpenDialog`?"
- `multi`, React Native: "Which of these are core components?"
- `true_false`, Swift: "A `struct` is a reference type."
- `short_text`, CLI: "Which `ls` flag lists hidden files?" accepts `-a`, case-sensitive.
- `numeric`, CLI: "What exit code does a successful command return?" answer `0`.
- `ordering`, Electron: "Order the steps of `ipcRenderer.invoke` reaching a handler and returning."
- `matching`, Swift: "Match each keyword (`let`, `var`, `guard`, `defer`) to what it does."

## 15. Sample platform terms

Shown in step 2 in a scroll box, with a required "I have read and agree to the platform terms" checkbox. The admin can edit them per exam.

> **Athena platform terms (sample)**
>
> 1. **Who you are.** You will take this exam yourself, using your own account. Sharing your login or letting someone else answer is not allowed.
> 2. **What Athena records.** During the exam Athena takes photos from your camera and pictures of your screen at random times and whenever a rule is broken. It also records events such as leaving fullscreen, switching apps, connecting a second display, your face not being visible, or more than one face being visible. Before the exam it takes one identity photo.
> 3. **Where it is kept.** Copies of these images are saved in a folder on this computer and sent to your examiner's server. On this computer you can open the folder from Athena's Settings, and delete it once your exam is submitted and uploaded.
> 4. **Who sees it.** Only your examiner and the people they authorise. Athena doesn't use your images for anything except reviewing this exam.
> 5. **Flags.** Breaking a rule creates a flag, and you will see a warning each time. If the exam has a flag limit, reaching it ends your exam and submits your answers. A person reviews every flag; the software never decides on its own that you broke the rules.
> 6. **Time.** The exam clock runs on the server and doesn't stop if you lose connection or close the app. If something goes wrong, tell your examiner; they can extend your time.
> 7. **Results.** Your examiner decides whether you see results right after submitting or later. Results can change if your examiner corrects a question.
> 8. **Your consent.** By ticking the box you agree to these terms for this exam. If you don't agree, don't start the exam and contact your examiner.
>
> This is a sample for a class project. It is not legal advice.

---

# Part 2. Integration

Sections 16–22 are the contract between the renderer, the main process and the server. [SCREENS.md](SCREENS.md) names every call it makes by the names used here. If code needs a call that isn't listed, add it here first.

## 16. Frontend architecture

- **Screens.** `SCREENS.md` is the source of truth for layout, copy and states. Screen ids (S1, C7, A10…) are used in component file names' comments and in commit messages.
- **Router.** `react-router` hash router. The route table is at the end of `SCREENS.md`. `RequireRole role="student|admin"` wraps each route tree; it reads the auth context and redirects.
- **The renderer only talks to `window.athena`.** It never imports Node or Electron, and never calls `fetch`. `lib/api.js` wraps `window.athena.api(name, params)` and throws an `ApiError { code, message, fields }` when the envelope says `ok: false`.
- **State.**
  - `AuthContext`: `user`, `signIn(rollNo, password)`, `signOut()`. Filled from `auth:me` on start.
  - Server data: two small hooks, `useApi(name, params)` → `{ data, error, loading, refetch }` and `useMutation(name)` → `{ run, loading, error }`, plus `usePoll(fn, ms, enabled)` for the live screens. No data-fetching library.
  - Exam room: one `useReducer` in `ExamProvider`. State `{ attempt, questions, answers, index, flags, deadlineAt, offsetMs, saveState, sensors, overlay, online, queued, forced }`. Actions come from the student (`ANSWER`, `GO`, `MARK`) and from main (`HEARTBEAT`, `WARNING`, `SENSOR`, `FORCED`, `NET`). The reducer is a pure function, which makes it easy to walk through in the viva.
  - Builder and settings: local form state, with a debounced autosave (builder) or a save bar (settings).
- **Styles.** `styles/tokens.css` defines the tokens from §5.2 under `:root[data-theme="light"]` and `[data-theme="dark"]`. `theme:changed` from main sets `data-theme`. Components use CSS Modules (built into Vite).
- **Face detection.** `proctoring/face.js` (load + read, a port of RishiPariksha's `face.ts`), `faceLoop.js` (the 1 s loop and the rules in §5.5) and `brightness.js`. The loop reports through `window.athena.exam.event()`.
- **Webcam capture.** `proctoring/webcam.js` keeps one `MediaStream` alive from C3 to C14. `snap()` draws the current frame to a canvas at 1280 px wide and returns JPEG bytes (`canvas.toBlob('image/jpeg', 0.7)`).

## 17. Preload API and IPC channels

### 17.1 What the preload exposes

```js
// electron/preload.cjs  →  window.athena
{
  api: (name, params) => ipcRenderer.invoke('api:request', { name, params }),
  auth:     { login, logout, me },
  server:   { get, set, ping },
  app:      { info },
  theme:    { set, onChange },
  system:   { mediaAccess, askCamera, displays, openPrivacy, relaunch },
  exam:     { enter, exit, fullscreen, event, confirmSubmit, on },   // on(name, cb) returns an unsubscribe function
  evidence: { save, summary, openFolder, deleteLocal, adminImage },
  files:    { openCsv, saveCsv, saveReceiptPdf, exportResultsCsv },
  net:      { onStatus },
}
```

- Each function calls exactly one channel. The preload never exposes `ipcRenderer` itself, and `on()` only accepts the event names in §17.3.

### 17.2 Renderer → main (`ipcRenderer.invoke` / `ipcMain.handle`)

| Channel | Payload | Returns | Main module | Checks in main |
|---|---|---|---|---|
| `api:request` | `{ name, params }` | `{ ok, data, error }` | `api.js` | `name` is in the route table (§18) and not internal; `params` is a plain object, under 256 KB |
| `auth:login` | `{ rollNo, password }` | `{ user }` | `api.js` | strings, 1–64 chars. Token stored by main (below) |
| `auth:logout` | — | `{ ok }` | `api.js` | clears the token |
| `auth:me` | — | `{ user } \| null` | `api.js` | — |
| `server:get` / `server:set` / `server:ping` | `{ url }` for set | url / `{ ok, ms }` | `api.js` | `http(s)://host[:port]` only |
| `app:info` | — | `{ version, electron, profile, isPackaged }` | `main.js` | — |
| `theme:set` | `{ mode: 'light'\|'dark'\|'system' }` | — | `window.js` | enum |
| `system:mediaAccess` | `{ kind: 'camera'\|'screen' }` | `'granted'\|'denied'\|'not-determined'\|'restricted'` | `system.js` | enum |
| `system:askCamera` | — | `boolean` | `system.js` | — |
| `system:displays` | — | `{ count }` | `system.js` | — |
| `system:openPrivacy` | `{ pane: 'camera'\|'screen' }` | — | `system.js` | maps to one of two fixed `x-apple.systempreferences:` URLs; nothing else is opened |
| `system:relaunch` | — | — | `system.js` | only when no attempt is active |
| `exam:enter` | `{ attemptId }` | `{ ok }` | `exam.js` | `attemptId` must be the attempt main received from `attempts.start` / `attempts.get` in this session |
| `exam:exit` | — | — | `exam.js` | — |
| `exam:fullscreen` | — | — | `exam.js` | only while an attempt is active |
| `exam:event` | `{ type, phase?, payload? }` | — | `exam.js` | `type` must be a renderer-reported type: `clipboard_attempt`, `camera_lost`, `camera_restored`, `no_face`, `multiple_faces`, `face_too_far`, `low_light`, `face_detection_unavailable` |
| `dialog:confirmSubmit` | `{ answered, total, marked }` | `boolean` | `exam.js` | integers |
| `evidence:save` | `{ attemptId, kind: 'camera'\|'identity', reason, bytes }` | `{ file }` | `evidence.js` | active attempt; `bytes` is an `ArrayBuffer` under 1 MB that starts with the JPEG marker `FF D8 FF`; `reason` from a fixed list |
| `evidence:summary` | `{ attemptId? }` | `{ attempts, bytes, pending }` | `evidence.js` | — |
| `evidence:openFolder` | `{ attemptId? }` | — | `evidence.js` | the folder must sit inside the evidence root |
| `evidence:deleteLocal` | — | `{ deleted, kept }` | `evidence.js` | native confirm; deletes only submitted, fully uploaded attempts |
| `evidence:adminImage` | `{ attemptId, file }` | `{ mime, bytes }` | `api.js` | admin session; `file` matches `^(screen\|camera\|identity)/[\w.-]+\.jpg$` |
| `file:openCsv` | — | `{ fileName, text } \| null` | `files.js` | `.csv`, under 1 MB, UTF-8 |
| `file:saveCsv` | `{ suggestedName, text }` | `{ path } \| null` | `files.js` | under 5 MB |
| `receipt:savePdf` | `{ attemptId }` | `{ path } \| null` | `files.js` | — |
| `results:exportCsv` | `{ examId }` | `{ path } \| null` | `files.js` | admin session |

**Every handler** first runs `assertTrustedSender(event)`: the sender frame's URL must start with `app://athena/` (or the Vite dev URL when not packaged). Payloads go through small validators in `electron/validate.js`. A failed check returns `{ ok: false, error: { code: 'IPC_REJECTED' } }` and logs the channel name.

**The token** lives in main only. It's kept in memory and, so that a relaunch can resume an exam, written to `userData/session.bin` encrypted with `safeStorage.encryptString` (macOS Keychain-backed). Logout deletes the file.

### 17.3 Main → renderer (`webContents.send`)

| Event | Payload | Used by |
|---|---|---|
| `exam:heartbeat` | `{ serverNow, deadlineAt, status, flagCount, maxFlags }` | C7 timer, flag counter |
| `exam:warning` | `{ flagId, flagNo, maxFlags, rules, final, first, at, questionId }` | C9 toast and modals |
| `exam:info` | `{ type }` | C9 hint toasts |
| `exam:forced` | `{ submitReason }` | C14 (exam ended by deadline, flags or admin) |
| `exam:sensor` | `{ fullscreen, focused, displays }` | C10 overlays |
| `exam:capture-now` | `{ reason, seq }` | webcam snap → `evidence:save` |
| `net:status` | `{ online, queued }` | C7 save state, C11 banner |
| `theme:changed` | `{ dark }` | `data-theme` |

### 17.4 Main-process modules

| Module | Job |
|---|---|
| `main.js` | App lifecycle, `--profile`, single-instance lock, registers `app://`, creates the window, wires the other modules |
| `window.js` | `BrowserWindow` with the security settings in §4, navigation and permission handlers, theme, fullscreen, the quit confirm (C13) |
| `protocol.js` | `app://athena/…` → files inside `dist/`. Resolves the path and refuses anything outside `dist/` |
| `api.js` | Server URL, token, `request(name, params)` using the route table, 10 s timeout, maps network failures to `SERVER_UNREACHABLE` |
| `queue.js` | Durable FIFO for answers and events, persisted to `userData/queue.json`. Keeps only the newest revision per question. Retries with backoff 1, 2, 4, 8, 16, 30 s. Emits `net:status` |
| `evidence.js` | Local folders and `manifest.json`, the upload worker (one upload at a time, oldest first), `deleteLocal` |
| `capture.js` | Random-interval timer (`minSec`–`maxSec`), `desktopCapturer` at 1280 px, `nativeImage.toJPEG(70)`, sends `exam:capture-now` for the paired camera photo |
| `detectors.js` | `blur`/`focus` with the `minAwaySec` threshold, `leave-full-screen`, `screen` `display-added`/`removed`, `powerMonitor` `suspend`/`lock-screen`/`resume`, idle poll every 10 s |
| `heartbeat.js` | Every 10 s: sends queued non-urgent events and sensor state, handles the response, keeps the clock offset (median of the last 5) |
| `exam.js` | Holds the active attempt; `enter`/`exit` start and stop capture, detectors and heartbeat; forwards renderer events; the submit confirm |
| `system.js` | `systemPreferences`, `screen.getAllDisplays()`, `shell.openExternal` for the two privacy URLs, `app.relaunch()` |
| `files.js` | Open/save dialogs, `printToPDF`, CSV export |
| `menu.js` | App menu; no Reload or DevTools when packaged |

## 18. Main-process route table

`api:request` only accepts names in this table. "Internal" names are used by main itself and are rejected from the renderer. "Queued" names go through `queue.js` instead of being sent at once.

| Name | Method and path | Role | Notes |
|---|---|---|---|
| `auth.login` | `POST /auth/login` | — | internal (via `auth:login`) |
| `auth.logout` | `POST /auth/logout` | any | internal |
| `auth.me` | `GET /auth/me` | any | internal |
| `exams.list` | `GET /exams` | student | |
| `exams.get` | `GET /exams/:examId` | student | |
| `attempts.start` | `POST /exams/:examId/attempts` | student | main remembers the returned attempt id |
| `attempts.get` | `GET /attempts/:attemptId` | student | main remembers the attempt id |
| `answers.save` | `PUT /attempts/:attemptId/answers/:questionId` | student | queued, collapsed per question |
| `attempts.events` | `POST /attempts/:attemptId/events` | student | internal; urgent events |
| `attempts.heartbeat` | `POST /attempts/:attemptId/heartbeat` | student | internal |
| `attempts.evidence` | `POST /attempts/:attemptId/evidence` | student | internal; raw JPEG |
| `attempts.submit` | `POST /attempts/:attemptId/submit` | student | main flushes the queue first |
| `attempts.receipt` | `GET /attempts/:attemptId/receipt` | student | |
| `attempts.result` | `GET /attempts/:attemptId/result` | student | |
| `me.attempts` | `GET /me/attempts` | student | |
| `me.analytics` | `GET /me/analytics` | student | |
| `admin.home` | `GET /admin/home` | admin | |
| `admin.exams.list` | `GET /admin/exams` | admin | |
| `admin.exams.get` | `GET /admin/exams/:examId` | admin | |
| `admin.exams.create` | `POST /admin/exams` | admin | `copyFromId` duplicates |
| `admin.exams.update` | `PATCH /admin/exams/:examId` | admin | title, code, description |
| `admin.exams.delete` | `DELETE /admin/exams/:examId` | admin | drafts only |
| `admin.exams.updateSettings` | `PUT /admin/exams/:examId/settings` | admin | |
| `admin.exams.updateProctoring` | `PUT /admin/exams/:examId/proctoring` | admin | |
| `admin.exams.publish` | `POST /admin/exams/:examId/publish` | admin | `dryRun` |
| `admin.exams.unpublish` | `POST /admin/exams/:examId/unpublish` | admin | |
| `admin.exams.extendInProgress` | `POST /admin/exams/:examId/extend-in-progress` | admin | |
| `admin.questions.create` | `POST /admin/exams/:examId/questions` | admin | |
| `admin.questions.update` | `PATCH /admin/exams/:examId/questions/:questionId` | admin | |
| `admin.questions.delete` | `DELETE /admin/exams/:examId/questions/:questionId` | admin | |
| `admin.questions.reorder` | `PUT /admin/exams/:examId/questions/order` | admin | |
| `admin.questions.previewScore` | `POST /admin/exams/:examId/questions/:questionId/preview-score` | admin | |
| `admin.users.list` | `GET /admin/users` | admin | |
| `admin.users.create` | `POST /admin/users` | admin | returns the one-time password |
| `admin.users.update` | `PATCH /admin/users/:userId` | admin | name, active |
| `admin.users.resetPassword` | `POST /admin/users/:userId/reset-password` | admin | returns the one-time password |
| `admin.users.import` | `POST /admin/users/import` | admin | `dryRun` |
| `admin.live` | `GET /admin/exams/:examId/live?since=` | admin | polled every 5 s |
| `admin.reviewQueue` | `GET /admin/exams/:examId/review-queue` | admin | |
| `admin.attempts.get` | `GET /admin/attempts/:attemptId` | admin | |
| `admin.attempts.extend` | `POST /admin/attempts/:attemptId/extend` | admin | |
| `admin.attempts.end` | `POST /admin/attempts/:attemptId/end` | admin | |
| `admin.attempts.resume` | `POST /admin/attempts/:attemptId/resume` | admin | |
| `admin.attempts.review` | `PUT /admin/attempts/:attemptId/review` | admin | |
| `admin.attempts.release` | `POST /admin/attempts/:attemptId/release` | admin | |
| `admin.flags.dismiss` | `POST /admin/attempts/:attemptId/flags/:flagId/dismiss` | admin | |
| `admin.evidence` | `GET /admin/attempts/:attemptId/evidence/:kind/:file` | admin | internal (via `evidence:adminImage`) |
| `admin.results.list` | `GET /admin/exams/:examId/results` | admin | |
| `admin.results.publish` | `POST /admin/exams/:examId/results/publish` | admin | `dryRun` |
| `admin.results.csv` | `GET /admin/exams/:examId/results.csv` | admin | internal (via `results:exportCsv`) |
| `admin.analytics` | `GET /admin/exams/:examId/analytics` | admin | |

This table replaces the endpoint list in §9 where they differ. Path parameters are filled from `params` and must match `^[a-z]{2}_[A-Za-z0-9-]{8,40}$`; anything else is rejected before a request is made.

## 19. Backend internals

### 19.1 Request pipeline (in order)

1. **`requestId`** sets `req.id` (`crypto.randomUUID()`) and the `X-Request-Id` header.
2. **`logger`** prints one line per request: time, id, method, path, status, ms, user id. It never logs bodies, passwords, tokens or images.
3. **Body parsers.** `express.json({ limit: '256kb' })` everywhere. The evidence route uses `express.raw({ type: 'image/jpeg', limit: '1mb' })` instead.
4. **Routers.**
   - `/api/auth` (login has a rate limiter).
   - `/api` with `requireAuth`.
   - `/api/admin` with `requireAuth` + `requireRole('admin')`.
5. **`validate(schema)`** per route. Schemas are plain objects checked by `lib/validate.js` (types, lengths, enums, ranges). Failure → 400 `VALIDATION_FAILED` with `fields`.
6. **Handlers** stay thin. They call a service in `lib/` with plain values and send the envelope. Services never see `req` or `res`.
7. **`notFound`** → 404 `NOT_FOUND`.
8. **`errorHandler`** maps an `AppError(code, status, message, fields)` to the envelope. Anything else → 500 `SERVER_ERROR` with the request id; the stack goes to the log only.

### 19.2 Config (`backend/config.js`)

- `PORT` (default 3000).
- `HOST` (default `127.0.0.1`; set `0.0.0.0` to let a second Mac connect in the viva).
- `DATA_DIR` (default `backend/data`).
- `TOKEN_TTL_HOURS` (default 12).
- Checked at startup. The server refuses to start with a clear message if a value is invalid.

### 19.3 Auth

- **Passwords:** `crypto.scrypt` with a 16-byte salt and a 64-byte key, compared with `crypto.timingSafeEqual`. Generated passwords are 12 characters from an unambiguous alphabet, shown as `XXXX-XXXX-XXXX`.
- **Tokens:** 32 random bytes (base64url) sent as `Authorization: Bearer`. Stored as a SHA-256 hash in `sessions.json` with `expiresAt`. Expired sessions are removed on read.
- **Login limiter:** 5 failed tries per roll number in 15 minutes (in memory), then `RATE_LIMITED`. The error for a wrong roll number and a wrong password is the same message.
- **Deactivating a user** deletes their sessions.

### 19.4 Store (`lib/store.js`)

- `read(name)` returns the cached array (loaded from disk once at startup).
- `update(name, fn)` queues on a per-file promise chain, runs `fn(current)` which must **return a new array** (no mutation), writes `name.json.tmp`, then `rename` over `name.json`, then swaps the cache.
- `appendLine(file, obj)` for `events.jsonl`.
- Files: `users`, `sessions`, `exams`, `attempts`. Evidence and per-attempt `events.jsonl` / `flags.json` sit under `data/evidence/<userId>/<attemptId>/`.
- Every evidence path is built from validated ids and a server-made file name. The final path is checked with `path.resolve` to sit inside `DATA_DIR/evidence`.

### 19.5 Business rules (`lib/`)

**Starting an attempt** (`attempts.start`):
- The exam is `published` and now is between `opensAt` and `closesAt`, otherwise `EXAM_NOT_OPEN`.
- If the student has an `in_progress` attempt for this exam, return it (resume) instead of making a new one.
- Attempts used < `maxAttempts`, otherwise `NO_ATTEMPTS_LEFT`.
- `deadlineAt = min(now + duration, closesAt)`.
- Question and option order are shuffled with Fisher–Yates using `crypto.randomInt`, when the settings ask for it.
- `code` is `ATH-XXXX-XXXX` from `crypto.randomBytes`.
- Consent and the system-check summary are stored on the attempt.
- The response carries questions without `key` and `explanation`.

**Overdue attempts** (`finalizeIfOverdue(attempt, now)`): called whenever an attempt is read (by the student, heartbeat, live view, results). If it's `in_progress` and `now > deadlineAt + 30 s`, it's submitted with `submitReason: 'deadline'`. There's no background job.

**Saving an answer** (`answers.save`):
- Own attempt, `in_progress`, `now ≤ deadlineAt + 30 s` (else `TIME_UP`).
- The question is in the attempt.
- `response` matches the question type's response shape (else `INVALID_RESPONSE`).
- If `revision ≤` the stored revision, the server answers `200 { applied: false }` and changes nothing. That makes retries from the queue harmless.

**Events and flags** (`attempts.events` and the heartbeat):
- 1–50 events per request. Each has a `seq` that is unique per attempt; repeats are ignored. Events are appended to `events.jsonl`.
- For each event whose rule is `on`:
  - If a counted flag for this attempt started within 2 s, attach the event to it.
  - Otherwise create a flag. If the rule `counts`, add 1 to `flagCount`.
- **Auto-end:** if `autoEnd.enabled` and `flagCount ≥ maxFlags + flagAllowance`, submit with `submitReason: 'flag_limit'` and save `remainingSecAtEnd`.
- Response: `{ accepted, warnings: [{ flagId, flagNo, maxFlags, rules, final: flagNo === maxFlags − 1, first: flagNo === 1 }], forced? }`.
- Events arriving up to 2 minutes after the attempt ends are stored but never trigger anything.

**Heartbeat:**
- Updates `lastSeenAt` and the last sensor state (`fullscreen`, `focused`, `displays`, `camera`, `faces`, `faceDetector`, `online`) and takes in queued events.
- Returns `{ serverNow, deadlineAt, status, flagCount, maxFlags, warnings, forced? }`. `forced` is set when the attempt is no longer `in_progress`, carrying its `submitReason`.

**Submitting:**
- Idempotent: a second call returns the same receipt.
- Scores every answer with `lib/scoring`. Sets `score`, `maxScore` and `submittedAt`, and computes `risk` (§6.5).
- Sets `resultVisibleAt`:
  - "Right after" exams: now, unless the attempt is held.
  - "When I publish" exams: only if results are already published and the attempt isn't held.
- **Held** means `holdAutoEnded && submitReason === 'flag_limit' && review.status === 'pending'`.

**Publishing an exam:**
- Runs the checklist in SCREENS A7 and returns every problem.
- After publishing, question create/update/delete is refused with `EXAM_LOCKED`.
- Unpublish is allowed only while no attempt exists.
- Proctoring and duration lock once the first attempt starts.

**Publishing results:** sets `exam.resultsPublishedAt`, then sets `resultVisibleAt` on every submitted attempt that isn't held. Later submissions follow the submitting rule above.

**Review decisions:**
- `cleared`, `suspicious` and `disqualified` need a note.
- `disqualified` makes the outcome "Disqualified" whatever the score.
- A decision on a held attempt un-holds it. If results are visible for that exam, its `resultVisibleAt` is set.

**Admin actions:**
- `extend` adds minutes to `deadlineAt` (only `in_progress`).
- `end` submits with `submitReason: 'admin'`.
- `resume` (only for `flag_limit` or `admin` endings) sets `status: in_progress`, `deadlineAt = now + remainingSecAtEnd` and `flagAllowance += extraFlags`.
- Each action appends an `admin_*` event with the admin id and the reason.

**Analytics:** pure functions in `lib/analytics.js` over the submitted attempts of an exam: mean, median, histogram in 10 % bins, per-question % correct and average marks, the "top half picks a wrong option more than the key" check, per-topic accuracy, flags by rule and by minute. Computed on each request.

## 20. Error codes

| Code | HTTP | When | What the UI does |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | A field is missing or wrong | Shows `fields` under the inputs |
| `INVALID_RESPONSE` | 400 | An answer doesn't fit the question type | Logs it; keeps the local answer (shouldn't happen) |
| `INVALID_CREDENTIALS` | 401 | Wrong roll number or password | S1 message |
| `UNAUTHENTICATED` | 401 | No token, or it expired | Clears the session → S1 ("Please sign in again") |
| `ACCOUNT_INACTIVE` | 403 | The account is turned off | S1 message |
| `FORBIDDEN` | 403 | Wrong role, or not your attempt | Goes to the role's home |
| `NOT_FOUND` | 404 | Unknown id | "This doesn't exist any more" card |
| `RESULTS_NOT_AVAILABLE` | 404 | Result not visible yet | C15 "Results aren't available yet" |
| `EXAM_NOT_OPEN` | 409 | Before the window, after it, or not published | C2/C6 message |
| `NO_ATTEMPTS_LEFT` | 409 | Attempts used up | C2/C6 message |
| `ATTEMPT_NOT_ACTIVE` | 409 | Writing to a submitted attempt | Goes to C14 |
| `TIME_UP` | 409 | Answer after deadline + grace | Goes to C14 (time's up) |
| `EXAM_LOCKED` | 409 | Editing questions of a published exam | A4 banner |
| `NOT_PUBLISHABLE` | 422 | Publish with problems | A7 lists `problems` |
| `PAYLOAD_TOO_LARGE` | 413 | Body or image over the limit | Logs it; evidence worker skips the file and marks it in the manifest |
| `RATE_LIMITED` | 429 | Too many login tries | S1 message |
| `SERVER_ERROR` | 500 | Anything unexpected | Error card with the request id |
| `SERVER_UNREACHABLE` | — | Made by main: no response in 10 s | S2, or the offline banner in the exam |
| `IPC_REJECTED` | — | Made by main: an IPC call failed its checks | Logs it; error card |

## 21. Key request and response shapes

```jsonc
// POST /auth/login
→ { "rollNo": "23CS042", "password": "K7Q4-M2XB-9F3C" }
← { "ok": true, "data": { "token": "<base64url>", "user": { "id": "u_8f2c…", "rollNo": "23CS042", "name": "Asha Rao", "role": "student" } } }
   // main keeps the token; the renderer receives only { user }

// POST /exams/:examId/attempts
→ { "consent": { "capture": true, "events": true, "terms": true, "termsVersion": "2026-10-23" },
    "systemCheck": { "camera": "ok", "face": "ok", "screen": "granted", "displays": 1 } }
← { "ok": true, "data": {
     "attempt": { "id": "at_5d1e…", "code": "ATH-7K4Q-9M2X", "status": "in_progress", "startedAt": "…", "deadlineAt": "…", "serverNow": "…", "flagCount": 0 },
     "questions": [ { "id": "q_03…", "type": "ordering", "text": "…", "marks": 4, "topic": "IPC",
                      "config": { "items": [ { "id": "i_2…", "text": "…" } ] } } ],   // no key, no explanation
     "answers": {},
     "proctoring": { "enabled": true, "maxFlags": 5, "screenshots": { "minSec": 45, "maxSec": 60, "onFlag": true },
                     "rules": { "focus": { "on": true, "minAwaySec": 1.5 }, "noFace": { "on": true, "afterSec": 5 } } } } }

// PUT /attempts/:attemptId/answers/:questionId
→ { "revision": 4, "response": { "order": ["i_2…", "i_1…", "i_3…"] }, "timeSpentSec": 52, "marked": false }
← { "ok": true, "data": { "applied": true, "revision": 4 } }

// POST /attempts/:attemptId/events
→ { "events": [ { "seq": 14, "type": "window_blur", "phase": "start", "clientTs": "…", "questionId": "q_03…", "payload": {} } ] }
← { "ok": true, "data": { "accepted": 1,
     "warnings": [ { "flagId": "fl_2…", "flagNo": 2, "maxFlags": 5, "rules": ["focus"], "first": false, "final": false } ] } }

// POST /attempts/:attemptId/heartbeat
→ { "seq": 31, "sensors": { "fullscreen": true, "focused": true, "displays": 1, "camera": "live", "faces": 1, "faceDetector": "ok", "online": true },
    "events": [] }
← { "ok": true, "data": { "serverNow": "…", "deadlineAt": "…", "status": "in_progress", "flagCount": 2, "maxFlags": 5, "warnings": [] } }
   // after an admin ends it:  "status": "submitted", "forced": { "submitReason": "admin" }

// POST /attempts/:attemptId/evidence?kind=screen&seq=22&capturedAt=2026-10-25T10:15:30Z&reason=interval
   Content-Type: image/jpeg   (raw bytes)
← { "ok": true, "data": { "file": "screen/2026-10-25T10-15-30Z_0022.jpg", "duplicate": false } }

// POST /attempts/:attemptId/submit
← { "ok": true, "data": { "received": 10, "total": 12, "submittedAt": "…", "code": "ATH-7K4Q-9M2X", "submitReason": "student", "resultVisible": false } }

// GET /attempts/:attemptId/result
← { "ok": true, "data": { "score": 32.5, "maxScore": 40, "percent": 81.3, "outcome": "Passed", "passPercent": 40,
     "questions": [ { "id": "q_04…", "type": "single", "text": "…", "marks": 2, "marksAwarded": 2,
                      "config": { "options": [] }, "key": { "optionId": "o_b…" }, "response": { "optionId": "o_b…" },
                      "explanation": "…", "marked": false, "timeSpentSec": 35 } ] } }

// GET /admin/exams/:examId/live?since=…
← { "ok": true, "data": {
     "counters": { "writing": 8, "flagged": 3, "needsAttention": 1, "endedByFlags": 1, "submitted": 2 },
     "attempts": [ { "id": "at_…", "student": { "rollNo": "23CS017", "name": "Dev Khanna" }, "status": "in_progress",
                     "deadlineAt": "…", "lastSeenAt": "…", "flagCount": 4, "maxFlags": 5, "risk": { "score": 31, "level": "high" },
                     "sensors": { "fullscreen": true, "camera": "live", "faces": 2, "displays": 1 },
                     "latestScreenshot": "screen/2026-10-25T10-41-02Z_0040.jpg", "needsAttention": false } ],
     "feed": [ { "at": "…", "attemptId": "at_…", "studentName": "Dev Khanna", "rules": ["multiFace"], "flagId": "fl_…" } ] } }
```

## 22. End-to-end flows

### 22.1 Sign in

```
S1 ─ auth:login ─▶ main api.js ─ POST /auth/login ─▶ server: rate limit → find user → scrypt verify → new token
                    ◀───────────── { token, user } ──┘
   main: keep token in memory + safeStorage → session.bin
S1 ◀─ { user } ──┘   AuthContext.user = user → route by role
```

### 22.2 Start an exam

```
C6 Begin ─ api attempts.start ─▶ main ─ POST /exams/:id/attempts ─▶ server: checks (§19.5) → attempt + shuffled questions
   ◀────────────────────────────────── { attempt, questions, proctoring } ──┘   main remembers attempt.id
C6 ─ evidence:save (identity) ─▶ main evidence.js: write identity/…jpg + manifest → upload worker
C6 ─ exam:enter ─▶ main exam.js: setFullScreen(true) · detectors.start · capture.start · heartbeat.start
C6 → navigate C7
```

### 22.3 Save an answer

```
C7 click ─▶ reducer ANSWER (UI shows the choice at once, saveState "Saving…")
   ─ api answers.save ─▶ main queue.js: replace any queued save for this question → write queue.json → send
                          ─ PUT …/answers/:qid ─▶ server: checks → store if revision is newer
                          ◀ { applied } ─┘ remove from queue → net:status { online, queued: 0 }
C7 ◀─ net:status ──┘ saveState "✓ Saved"
   offline: the send fails → stays in queue.json → net:status { online: false, queued: 3 } → C11 banner; retried with backoff
```

### 22.4 Clock and heartbeat

```
every 10 s  main heartbeat.js ─ POST …/heartbeat { sensors, queued events } ─▶ server: finalizeIfOverdue → lastSeenAt → events
            ◀ { serverNow, deadlineAt, status, flagCount, forced? } ─┘
            offsetMs = median of last 5 (serverNow − local time at response)
            webContents.send('exam:heartbeat', …)  ·  forced → exam.exit + webContents.send('exam:forced')
renderer    timeLeft = deadlineAt − (Date.now() + offsetMs), redrawn every second; thresholds in SCREENS C11
```

### 22.5 A flag

```
⌘Tab ─▶ main detectors.js: window 'blur' at t0, 'focus' at t1; away = t1 − t0 ≥ minAwaySec
        ─▶ capture.js: screenshot now + webContents.send('exam:capture-now') (renderer snaps the camera → evidence:save)
        ─▶ queue.js urgent: POST …/events [window_blur start/end] ─▶ server: flag engine (merge 2 s, count, auto-end?)
        ◀ { warnings: [{ flagNo: 2, maxFlags: 5, rules: ['focus'] }] } ─┘
        ─▶ webContents.send('exam:warning', …) ─▶ C9 toast (modal if first or final)
face   renderer faceLoop: 0 faces for 5 s ─ exam:event { type: 'no_face', phase: 'start' } ─▶ main ─▶ same path
```

### 22.6 Evidence

```
capture.js timer (random 45–60 s)  or a flag
  main: desktopCapturer → nativeImage.toJPEG(70) → evidence/<code>/screen/<ts>_<seq>.jpg → manifest { uploaded: false }
  main: send 'exam:capture-now' → renderer webcam.snap() → evidence:save → camera/<ts>_<seq>.jpg → manifest
upload worker (main): oldest un-uploaded entry → POST …/evidence?kind&seq&capturedAt (raw JPEG)
  ◀ { file, duplicate } → manifest { uploaded: true }     fail → back off, try again later; nothing is deleted
```

### 22.7 Submit

```
C12 Submit ─ dialog:confirmSubmit ─▶ main: native sheet → true
           ─ api attempts.submit ─▶ main: queue.flush() (answers and events first) ─ POST …/submit ─▶ server: score · risk · resultVisibleAt
           ◀ { received, total, code, resultVisible } ─┘   main: exam.exit (leave fullscreen, stop capture/detectors/heartbeat);
                                                            the evidence upload worker keeps running until the manifest is empty
C14 shows the receipt; "View your results" only if resultVisible
```

### 22.8 Admin extends time

```
A9a Extend 10 ─ api admin.attempts.extend ─▶ server: deadlineAt += 10 min, admin_extended event
student main: next heartbeat (≤ 10 s) gets the new deadlineAt ─▶ exam:heartbeat ─▶ C7 timer jumps + toast "Your examiner added 10 minutes"
```

### 22.9 Publish results

```
A11 Publish results… ─ api admin.results.publish { dryRun: true } ─▶ counts ─▶ A11a
    confirm ─ { dryRun: false } ─▶ server: exam.resultsPublishedAt = now; resultVisibleAt on every non-held submitted attempt
student C1/C16 next load: resultVisible = true ─▶ C15
```

### 22.10 Crash and resume

```
Athena quits mid-exam (crash or Quit anyway)
relaunch: main reads session.bin (safeStorage) and queue.json; evidence worker resumes from manifests
C1 shows "exam in progress" (exams.list) → Resume → attempts.get (server finalizes it if overdue) → Welcome-back card
→ exam:enter → queue flushes → heartbeat → C7 at the same question with the server's deadline
```

## 23. Contract changes from Loop 1 (these override earlier sections)

Recorded after the backend and frontend specialists finished Loop 1 (2026-10-23). Where these differ from §8, §17, §18 or §21, these win.

**Ids.** Every id has a two-letter prefix so it matches the §18 path check: `us_` users, `ex_` exams, `qn_` questions, `at_` attempts, `fl_` flags. Option/item ids inside questions: `op_`, `it_`, `lt_`, `rt_`.

**Envelope.** Every IPC invoke returns `{ ok, data, error }`; the "Returns" column in §17.2 describes `data`. HTTP errors may carry extras: `NOT_PUBLISHABLE` has `error.problems[]` and `error.warnings[]`; `SERVER_ERROR` has `error.requestId`. New code `ATTEMPT_HELD` (409) when releasing a held result.

**New and changed endpoints.**
- `GET /api/health`, no auth. `server:ping` uses it; any HTTP answer counts as reachable.
- CSV export and evidence download send raw bytes, not the JSON envelope.
- `exams.get` also returns `code`, `termsVersion`, `proctoringSummary { lines[], text }`, `canStart` and `cannotStartReason`.
- `attempts.start` / `attempts.get` return `{ attempt, exam, questions, answers, proctoring, flags, resumed }`. Status is 201 for a new attempt and 200 for a resume. `attempt.maxFlags` already includes `flagAllowance`, and is `null` when auto-end is off.
- Heartbeat also returns `submitReason`. Warnings also carry `at` and `questionId`.

**Values.**
- Results visibility: `after_submit` | `after_publish`.
- Proctoring presets: `standard` | `lenient` | `monitor` | `off` | `custom`, plus a `blockMultipleDisplays` field. `updateProctoring` accepts `{ proctoring: { preset } }` alone or a partial config.
- `short_text` student config includes `caseSensitive` (for the C7a hint).
- Ordering items and the matching right column are always shuffled for students, whatever `shuffleOptions` says.
- Extra client event types accepted: `camera_restored`, `display_removed`, `network_online`, `system_resume`.

**Admin response shapes.**
- `admin.exams.get` → `{ exam }`, where `exam` also has `displayStatus`, `locked`, `problems` and `counts`.
- Settings body is `{ settings }`; partial updates are fine.
- `admin.results.list` → `{ exam, pipeline, rows }`.
- Publish dry run → `{ willPublish, held, outcomes }`.
- Users: list → `{ users }`, create → `{ user, password }`, import → `{ rows, counts, created }`. Import is `dryRun: true` unless `false` is sent.
- Risk reasons are `{ code, label, points }`.

**Main process (frontend).**
- New modules `settings.js`, `session.js`, `log.js`, `selftest.js`.
- `app:info` also returns `theme`; `evidence:summary` also returns `folder`.
- Saving a different server URL signs the user out.
- `--selftest` and `--spike` flags, plus a `#/selftest` route, exist for packaging checks.

**Behaviour.**
- Event times use the client's `clientTs`, clamped between the attempt start and now, so the 2 s merge still works for events sent late from the offline queue.
- Evidence uploads are still accepted after submit, so the upload worker can finish its queue.
- Extend isn't capped at the window close.
- Dismissing a flag never reopens an ended attempt.
- A heartbeat gap is a silence of more than 30 s, recorded at the next heartbeat. Each gap adds 5 risk points.

## 24. Evidence location (decided 2026-10-23, overrides §4 and §19.4)

All screenshots, webcam photos and identity photos live in one folder at the Proctor root, next to `app/` and `backend/`. The folder is gitignored and never leaves the user's machine through git.

```
Proctor/
  evidence/
    client/<attemptCode>/{screen,camera,identity}/…jpg + manifest.json   ← the app's local-first copies
    server/<userId>/<attemptId>/{screen,camera,identity}/…jpg            ← what the backend stored on upload
           <userId>/<attemptId>/events.jsonl, flags.json
```

- **App:** when not packaged, the evidence root is `<Proctor>/evidence/client`. When packaged (the DMG on another Mac), there's no repo folder, so it falls back to `userData/evidence`. `ATHENA_EVIDENCE_DIR` overrides both.
- **Backend:** `EVIDENCE_DIR` defaults to `<Proctor>/evidence/server`. The smoke script still uses a temp folder.
- **Unchanged:** the path-traversal guards. Every file path is built from validated ids and must resolve inside its evidence root.

## 25. Proctoring images live in `backend/proctorImages/` (2026-10-23, replaces §24)

The user's decision: one clear folder of images, inside the backend folder, readable by a person, gitignored and local only.

```
backend/
  proctorImages/                         ← gitignored
    23CS042/                             ← roll number
      ATH-7K4Q-9M2X/                     ← attempt code (also on the student's receipt)
        webcam/2026-10-25T10-15-30Z_0014.jpg
        screen/2026-10-25T10-15-30Z_0014.jpg
        identity/2026-10-25T10-02-11Z_0001.jpg
    (npm run seed never touches this folder; every attempt has its own code folder)
  data/records/<userId>/<attemptId>/     ← gitignored: flags.json, captures.json, events.jsonl
```

- **The API doesn't change.** It still uses kind `camera` and file names like `camera/<name>.jpg`; only the folder on disk is named `webcam`. `EVIDENCE_DIR` still overrides the image root.
- **The app's local copy is now a hidden staging area,** not a folder for people:
  - Images wait in `userData/pending-uploads/<attemptCode>/` with a `manifest.json` until the server confirms them, and are then removed from staging.
  - Crash safety is unchanged: staging survives a crash, and the worker resumes from the manifest.
  - The root `evidence/` folder from §24 is dropped.
- **Settings and the done page:** "Show evidence folder" becomes "N images waiting to upload" (or "All images uploaded ✓"). The "Delete local evidence" button is removed, because there are no lasting local copies any more.
