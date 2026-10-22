# Athena screens

Status: draft for review, 2026-10-23. Companion to [BUILD_PLAN.md](BUILD_PLAN.md).

Every screen in the app, drawn in ASCII. The layouts are adapted from RishiPariksha's web and admin UI plans (`rishihtest/docs/web-ui-plan`, `docs/admin-ui-plan`), redrawn as a macOS window and cut down to Athena's scope. Each screen lists its hash route, what it loads, what it sends, and its states. The API names match BUILD_PLAN §18 (main-process route table), and the IPC names match §17.

The frontend is built from this file. If a screen here and the code disagree, fix one of them; don't let them drift.

---

## 0. Conventions

### 0.1 The window

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                               (drag region, 44 px)                                     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│                                    content                                                   │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- `titleBarStyle: 'hiddenInset'`. The top 44 px is a drag region (`-webkit-app-region: drag`). Buttons inside it set `no-drag`.
- Minimum window size 1100 × 720. The exam runs fullscreen.
- Light and dark follow macOS through `nativeTheme`. Settings has an override.

### 0.2 Two moods

| | Student "quiet room" (pre-test and exam) | Everything else (dashboards, admin) |
|---|---|---|
| Layout | One centred card or one question at a time | Sidebar + content |
| Colour | Warm paper, ink, indigo for selection only | Same tokens, indigo for primary buttons and the active nav item |
| Motion | Only feedback for the student's own actions | 120–180 ms on panels and menus |

### 0.3 Shared components

`Button` (primary / secondary / ghost / danger), `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Card`, `Chip`, `Tabs`, `Stepper`, `Table`, `Dialog`, `Sheet` (right side, 440 px), `Toast` (bottom centre), `Banner`, `EmptyState`, `Skeleton`, `Kbd`, `StatTile`, `charts/Bar`, `charts/Line`, `charts/Histogram`, `QuestionView`.

### 0.4 Status chips (same words everywhere)

```
Exam:      ○ Draft   ● Published   ◐ Live now   ✓ Closed
Attempt:   ◐ In progress   ✓ Submitted   ⏱ Time's up   ⚑ Ended by flags   ⊘ Ended by examiner
Review:    · Pending   ✓ Cleared   ? Suspicious   ✕ Disqualified
Risk:      ▁ Low   ▃ Review   ▆ High                 (bars plus the word, never colour alone)
Result:    ○ Not available   ⏸ Held   ● Visible
```

### 0.5 States every data screen has

- **Loading:** skeleton rows or cards, never a spinner over the whole window.
- **Empty:** one sentence and the next action ("No questions yet. **Add question**").
- **Error:** a card with the message from the server and **Retry**. Validation errors sit under their fields.
- **Server unreachable:** any screen whose API call fails with `SERVER_UNREACHABLE` routes to S2, except the exam room, which queues and shows the offline banner (C11).

---

## Shared screens

### S1. Login · `#/login`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
│                                                                                              │
│                         ┌────────────────────────────────────────────┐                       │
│                         │                                            │                       │
│                         │   ▰ Athena                                 │                       │
│                         │   Sign in to take or manage exams          │                       │
│                         │                                            │                       │
│                         │   Roll number                              │                       │
│                         │   [ 23CS042                             ]  │                       │
│                         │                                            │                       │
│                         │   Password                                 │                       │
│                         │   [ ••••••••••                       👁 ]  │                       │
│                         │                                            │                       │
│                         │   ✕ Roll number or password is wrong.      │  ← only on error      │
│                         │                                            │                       │
│                         │   [            Sign in             ]       │                       │
│                         │                                            │                       │
│                         │   Server: 127.0.0.1:3000 · Change          │                       │
│                         └────────────────────────────────────────────┘                       │
│                                                       v1.0.0 · profile: default              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Sends:** IPC `auth:login { rollNo, password }`. Main keeps the token; the renderer gets `{ user }` back.
- **Routes after login:** `role: student` → C1, `role: admin` → A1. A resumable in-progress attempt shows a banner on C1.
- **Errors:** `INVALID_CREDENTIALS` "Roll number or password is wrong." · `ACCOUNT_INACTIVE` "This account is turned off. Ask your examiner." · `RATE_LIMITED` "Too many tries. Wait 15 minutes." · `SERVER_UNREACHABLE` → S2.
- **Enter** submits. The password field has a show toggle.

### S2. Can't reach the server · `#/server`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
│                         ┌────────────────────────────────────────────┐                       │
│                         │   ◌  Can't reach the exam server           │                       │
│                         │                                            │                       │
│                         │   Athena tried  http://127.0.0.1:3000      │                       │
│                         │   and got no answer.                       │                       │
│                         │                                            │                       │
│                         │   • Is the backend running?                │                       │
│                         │     cd backend && npm start                │                       │
│                         │   • Are you on the same network?           │                       │
│                         │                                            │                       │
│                         │   Server address                           │                       │
│                         │   [ http://127.0.0.1:3000             ]    │                       │
│                         │                                            │                       │
│                         │   [ Save and retry ]        [ Retry ]      │                       │
│                         └────────────────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Sends:** IPC `server:set { url }`, then `server:ping`. On success it goes back to the screen that failed.
- **Validation:** must be `http://` or `https://` with a host. Main rejects anything else.

### S3. Settings · `#/settings` (both roles, from the sidebar)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  Settings                                                                    │
│               │                                                                              │
│ ▤ Exams       │  APPEARANCE                                                                  │
│ ✓ Results     │  Theme            ( ) Light   ( ) Dark   (•) Match macOS                     │
│ ◔ Analytics   │                                                                              │
│ ⚙ Settings    │  SERVER                                                                      │
│               │  Address          [ http://127.0.0.1:3000          ]  [ Test ]  ✓ Connected  │
│               │                                                                              │
│               │  EVIDENCE ON THIS MAC                    (students only)                     │
│               │  Folder           ~/Library/Application Support/Athena/evidence              │
│               │                   [ Show in Finder ]                                         │
│               │  Stored           3 attempts · 41 MB · all uploaded ✓                        │
│               │                   [ Delete local evidence… ]                                 │
│               │                                                                              │
│               │  ABOUT                                                                       │
│ ───────────── │  Athena 1.0.0 · Electron 44.3.0 · profile: default                           │
│ (AR) Asha Rao │                                                                              │
│ Sign out      │                                                                              │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads:** IPC `app:info`, `server:get`, `evidence:summary`.
- **Sends:** `theme:set`, `server:set` + `server:ping`, `evidence:openFolder`, `evidence:deleteLocal` (native confirm in main; only deletes attempts that are submitted and fully uploaded, and says how many it kept), `auth:logout`.

---

## Student screens

### C1. Exams (dashboard) · `#/student/exams`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  ┌────────────────────────────────────────────────────────────────────────┐  │
│               │  │ ◐ You have an exam in progress: Electron Apps · 18 min left  [ Resume ]│  │
│ ▤ Exams     ● │  └────────────────────────────────────────────────────────────────────────┘  │
│ ✓ Results     │                                                                              │
│ ◔ Analytics   │  Exams                                                                       │
│ ⚙ Settings    │  Exams you can take now and soon.                                            │
│               │                                                                              │
│               │  [ All ] [ Open 2 ] [ Upcoming 1 ] [ Done 1 ]                                │
│               │                                                                              │
│               │  ┌───────────────────────────────┐  ┌───────────────────────────────┐        │
│               │  │ ● Open                        │  │ ◐ In progress                 │        │
│               │  │ CLI Apps                      │  │ Electron Apps                 │        │
│               │  │ 12 questions · 20 min         │  │ 12 questions · 30 min         │        │
│               │  │ Closes today, 18:00           │  │ 18 min left                   │        │
│               │  │ 1 attempt left                │  │                               │        │
│               │  │                 [ View exam ] │  │                    [ Resume ] │        │
│               │  └───────────────────────────────┘  └───────────────────────────────┘        │
│               │  ┌───────────────────────────────┐  ┌───────────────────────────────┐        │
│               │  │ ○ Upcoming                    │  │ ✓ Submitted                   │        │
│               │  │ React Native                  │  │ Swift Apps                    │        │
│               │  │ Opens 26 Oct, 10:00           │  │ Submitted 22 Oct · 72%        │        │
│               │  │                 [ View exam ] │  │                [ See result ] │        │
│               │  └───────────────────────────────┘  └───────────────────────────────┘        │
│ ───────────── │                                                                              │
│ (AR) Asha Rao │                                                                              │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads:** `exams.list` → `{ exams: [{ id, title, questionCount, durationMinutes, opensAt, closesAt, attemptsLeft, myStatus, openAttemptId, deadlineAt, resultVisible, lastPercent }] }`.
- **Card actions by `myStatus`:** `open` → C2 · `upcoming` → C2 (Get started disabled) · `in_progress` → **Resume** goes straight to C7 (via C6's resume path) · `submitted` → C15 if `resultVisible`, else C14 summary · `closed` → nothing.
- **Empty:** "No exams yet. Your examiner will publish them here."

### C2. Exam detail · `#/student/exams/:examId`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  ‹ Exams                                                                     │
│               │                                                                              │
│ ▤ Exams     ● │  Electron Apps                                              ● Open           │
│ ✓ Results     │  Process model, preload, IPC, windows, dialogs and packaging.                │
│ ◔ Analytics   │                                                                              │
│ ⚙ Settings    │  ┌─────────────┬─────────────┬─────────────┬─────────────┐                   │
│               │  │ 30 min      │ 12 questions│ 40 marks    │ Pass 40%    │                   │
│               │  └─────────────┴─────────────┴─────────────┴─────────────┘                   │
│               │                                                                              │
│               │  WINDOW         Today 09:00 to 18:00 · 1 attempt                             │
│               │  RESULTS        Shown after your examiner publishes them                     │
│               │                                                                              │
│               │  PROCTORING                                                                  │
│               │  ◉ Camera photo about every 45–60 s     ⎚ Screen picture about every 45–60 s │
│               │  ☺ Face must stay in view, alone         ⛶ Fullscreen, one display          │
│               │  ⚑ The exam ends at 5 flags                                                  │
│               │                                                                              │
│               │  Before you start you'll check your setup (about 2 minutes),                 │
│               │  read the rules and take an identity photo. The clock starts                 │
│               │  only when you press Begin.                                                  │
│               │                                                                              │
│               │                                                  [ Get started → ]           │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads:** `exams.get { examId }` → details, `proctoringSummary`, `resultPolicy.visibility`, no questions.
- **Get started** → C3. It's disabled with a reason when the exam isn't open or no attempts are left.

### C3. Step 1 · System check · `#/student/exams/:examId/start/check`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●     ▰ Athena · Electron Apps     ● Setup ── ○ Rules ── ○ Photo ── ○ Begin              │
│                                                                                              │
│   Let's check your setup                                                                     │
│   This takes about 2 minutes. Nothing is recorded yet.                                       │
│                                                                                              │
│   ┌────────────────────────────────────────┐   ┌──────────────────────────────────────────┐  │
│   │                                        │   │ ✓ Exam server: connected                 │  │
│   │                                        │   │ ✓ Camera permission                      │  │
│   │          [ live camera preview ]       │   │ ✓ Camera: working                        │  │
│   │              ╭──────╮                  │   │ ◌ Face: hold still for 2 seconds… ▓▓░    │  │
│   │              │  ☺   │  face guide      │   │ ○ Light                                  │  │
│   │              ╰──────╯                  │   │ ○ Screen Recording permission            │  │
│   │                                        │   │ ○ Displays                               │  │
│   │                                        │   │                                          │  │
│   └────────────────────────────────────────┘   └──────────────────────────────────────────┘  │
│   💡 Turn on Do Not Disturb now: notifications can pull focus during the exam.               │
│                                                                                              │
│   [ ‹ Back ]                                                     [ Continue ] (after all ✓)  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Runs in order,** each row `○ waiting → ◌ checking → ✓ / ✕`:
  1. `server:ping`.
  2. IPC `system:mediaAccess { kind: 'camera' }`. If `not-determined`, `system:askCamera`.
  3. `getUserMedia({ video })` in the renderer, which also starts the preview.
  4. Face model load (`face.load()`), then exactly one face for 2 s.
  5. Brightness above 45 (warning only).
  6. IPC `system:mediaAccess { kind: 'screen' }`.
  7. IPC `system:displays` → count.
- **Continue** is enabled when every blocking row is ✓. Face-model failure doesn't block (row reads "Face check unavailable: the exam will run without it").
- The camera stream stays alive into C5 and C7, so the student grants it once.

**C3a. Fix cards** replace a failed row. **Run again** re-checks only that row.

```
┌──────────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────────────────────────────────┐
│  ✕ Screen Recording is off for Athena                            │   │  ✕ Two displays connected                                        │
│                                                                  │   │                                                                  │
│  macOS needs your permission for Athena to capture the screen.   │   │  This exam allows one display.                                   │
│   1. Click Open System Settings                                  │   │   • Unplug the extra monitor, or                                 │
│   2. Turn on Athena under Screen & System Audio Recording        │   │   • Mirror your displays in System Settings → Displays           │
│   3. Click Quit and reopen (macOS asks for this)                 │   │                                                                  │
│                                                                  │   │                                       [ Run again ]              │
│  Your exam hasn't started. Nothing is lost.                      │   └──────────────────────────────────────────────────────────────────┘
│  [ Open System Settings ]            [ Quit and reopen ]         │
└──────────────────────────────────────────────────────────────────┘
```

| Failure | Blocks? | Fix card says | Actions |
|---|---|---|---|
| Server unreachable | yes | "Can't reach the exam server" | Retry, Change server (S2) |
| Camera permission denied | yes | Steps for System Settings → Privacy → Camera | **Open System Settings** (`system:openPrivacy { pane: 'camera' }`), Run again |
| Camera busy / no camera | yes | "Another app may be using it (Zoom, FaceTime). Close it." | Run again |
| No face / two faces | yes | "Sit facing the camera, in good light, alone." | Run again |
| Too dark | no | "Add some light in front of you." | Run again |
| Screen Recording off | yes | Above | **Open System Settings**, **Quit and reopen** (`system:relaunch`) |
| Two displays | yes if `blockMultipleDisplays`, else a warning | Above | Run again |
| Face model unavailable | no | "Face check unavailable" | (none) |

### C4. Step 2 · Rules, terms and consent · `#/student/exams/:examId/start/rules`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●     ▰ Athena · Electron Apps     ✓ Setup ── ● Rules ── ○ Photo ── ○ Begin              │
│                ┌──────────────────────────────────────────────────────────────────┐          │
│                │  Before you begin                                                │          │
│                │                                                                  │          │
│                │  HOW THE EXAM WORKS                                              │          │
│                │  ◷  30 minutes. The clock starts when you press Begin and        │          │
│                │     doesn't pause, even if you lose connection or quit.          │          │
│                │  ✓  Answers save automatically, even offline.                    │          │
│                │  ⇄  You can change any answer until you submit.                  │          │
│                │                                                                  │          │
│                │  THE RULES                                                       │          │
│                │  ⛶  Stay in fullscreen.                                          │          │
│                │  ⇥  Don't switch apps (even a quick look counts).                │          │
│                │  ☺  Stay in view of the camera, alone.                           │          │
│                │  ▭  One display only.                                            │          │
│                │  ⎘  Copy and paste are turned off.                               │          │
│                │                                                                  │          │
│                │  ⚑  Breaking a rule is a flag. You'll see a warning each time.   │          │
│                │     At 5 flags your exam ends automatically.                     │          │
│                │     A person reviews every flag; the software doesn't decide.    │          │
│                │                                                                  │          │
│                │  WHAT ATHENA CAPTURES                                            │          │
│                │  [■] Photos from your camera, at random times and at flags       │          │
│                │  [■] Pictures of your screen, at random times and at flags       │          │
│                │  [■] Events such as leaving fullscreen or switching apps         │          │
│                │  Saved on this Mac and on your examiner's server.                │          │
│                │                                                                  │          │
│                │  PLATFORM TERMS                                                  │          │
│                │  ┌────────────────────────────────────────────────────────────┐  │          │
│                │  │ 1. Who you are. You will take this exam yourself…        ▲ │  │          │
│                │  │ 2. What Athena records. During the exam Athena takes…    █ │  │          │
│                │  │ 3. Where it is kept. Copies of these images are saved…   ▼ │  │          │
│                │  └────────────────────────────────────────────────────────────┘  │          │
│                │  [ ] I have read and agree to the platform terms                 │          │
│                │                                                                  │          │
│                │  [ ‹ Back ]                          [ I agree, continue → ]     │          │
│                │                                 (disabled: "All four are needed")│          │
│                └──────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Data:** text is generated from `exams.get` (`durationMinutes`, `proctoring.rules`, `autoEnd`, `terms`). Rules that are off aren't listed. With proctoring off, only "How the exam works" and the terms show.
- **State:** consent is kept in memory and sent with `attempts.start` in C6 as `consent: { capture: true, events: true, terms: true, termsVersion }`. Nothing is sent to the server yet.

### C5. Step 3 · Identity photo · `#/student/exams/:examId/start/photo`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●     ▰ Athena · Electron Apps     ✓ Setup ── ✓ Rules ── ● Photo ── ○ Begin              │
│                ┌──────────────────────────────────────────────────────────────────┐          │
│                │  Take your identity photo                                        │          │
│                │  Your examiner compares it with photos taken during the exam.    │          │
│                │                                                                  │          │
│                │        ┌──────────────────────────────────────────────┐          │          │
│                │        │                                              │          │          │
│                │        │             [ live camera preview ]          │          │          │
│                │        │                  ╭────────╮                  │          │          │
│                │        │                  │   ☺    │                  │          │          │
│                │        │                  ╰────────╯                  │          │          │
│                │        └──────────────────────────────────────────────┘          │          │
│                │        ✓ One face in view                                        │          │
│                │                                                                  │          │
│                │  [ ‹ Back ]                                [ ◉ Take photo ]      │          │
│                └──────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
          after taking:   [ frozen photo ]   [ Retake ]   [ Use this photo → ]
```

- **Take photo** is enabled only while exactly one face is in view (unless the face model is unavailable).
- The photo is held in memory as JPEG bytes until C6, because no attempt exists yet. After `attempts.start`, the renderer sends it with IPC `evidence:save { attemptId, kind: 'identity', bytes }`.

### C6. Step 4 · Begin · `#/student/exams/:examId/start/begin`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●     ▰ Athena · Electron Apps     ✓ Setup ── ✓ Rules ── ✓ Photo ── ● Begin              │
│                ┌──────────────────────────────────────────────────────────────────┐          │
│                │  Ready when you are                                              │          │
│                │                                                                  │          │
│                │  ◷  30 minutes start when you press Begin.                       │          │
│                │  ⛶  Athena switches to fullscreen.                               │          │
│                │  ◉  Camera and screen capture start.                             │          │
│                │                                                                  │          │
│                │  Keys during the exam                                            │          │
│                │  1–9 choose · N next · P previous · M mark · Q questions         │          │
│                │                                                                  │          │
│                │  [ ‹ Back ]                                       [ Begin ]      │          │
│                └──────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Begin:**
  1. `attempts.start { examId, consent, systemCheck }` → `{ attempt, questions, proctoring }`.
  2. `evidence:save` for the identity photo.
  3. IPC `exam:enter { attemptId, proctoring }`. Main goes fullscreen and starts detectors, the capture timer and the heartbeat.
  4. Navigate to C7.
- **Resume path:** C1's **Resume** calls `attempts.get { attemptId }` and goes through a short "Welcome back" card: a camera check, the face check if face rules are on, and a **Continue** button that does steps 3–4. Consent and photo aren't repeated.
- **Errors:** `EXAM_NOT_OPEN`, `NO_ATTEMPTS_LEFT` → message card with **Back to exams**.

### C7. The exam room · `#/student/attempts/:attemptId`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▰  Electron Apps                     ⏱ 24 min left          ✓ Saved     ⚑ 1/5    ◉           │ ← status bar 48 px
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← answered progress
├────┬─────────────────────────────────────────────────────────────────────────────────────────┤
│ ●1 │                                                                                         │
│ ●2 │        Question 4 of 12                                        2 marks   ☆ Mark          │
│ ●3 │                                                                                         │
│◉ 4 │        Which process is allowed to call dialog.showOpenDialog?                          │
│ ○5 │                                                                                         │
│ ◐6 │        ┌───────────────────────────────────────────────────────────────┐                │
│ ⚐7 │        │  ◯   A    The renderer process                           1    │                │
│ ○8 │        └───────────────────────────────────────────────────────────────┘                │
│ ○9 │        ┌───────────────────────────────────────────────────────────────┐                │
│ ○10│        │  ◉   B    The main process                               2    │  ← selected:    │
│ ○11│        └───────────────────────────────────────────────────────────────┘    indigo ring  │
│ ○12│        ┌───────────────────────────────────────────────────────────────┐    + tint       │
│    │        │  ◯   C    The preload script, through Node's require     3    │                │
│  6 │        └───────────────────────────────────────────────────────────────┘                │
│ of │        ┌───────────────────────────────────────────────────────────────┐                │
│ 12 │        │  ◯   D    Any process with nodeIntegration on            4    │                │
│    │        └───────────────────────────────────────────────────────────────┘                │
│    │        Clear answer                                                                     │
│    │                                                                                         │
│    │  ‹ Previous                                                                   Next ›    │
└────┴─────────────────────────────────────────────────────────────────────────────────────────┘
  rail 56 px (Q expands)         stage max 760 px, centred         1–9 choose · N/P · M mark · Q
```

- **Status bar:** exam name · timer (C11 thresholds) · save state (`✓ Saved` → fades after 2 s, `Saving…`, `Offline · 3 kept`, `Syncing 3…`) · `⚑ k/N` (neutral at 0, amber from 1, red at N−1; opens C9c; hidden when proctoring is off) · camera dot (green live, red lost).
- **Rail:** a distinct shape per state: `●` answered · `○` not yet · `◐` seen · `⚐` marked · `◉` current. Click to jump.
- **Stage:** one question through `QuestionView mode="exam"` (C7a). On the last question **Next** becomes **Review & submit** → C12.
- **On every answer change:** `answers.save { attemptId, questionId, revision, response, timeSpentSec, marked }`. Main queues it (BUILD_PLAN §17), so the UI updates at once.
- **Time per question:** the renderer counts visible seconds on each question and sends the total with the next save.
- **Blocked in the exam:** copy, cut, paste and the context menu (if the rule is on) are blocked in the renderer and sent as `exam:event { type: 'clipboard_attempt' }`. Typing inside a text answer box is allowed; pasting into it is still blocked.
- **IPC events received:** `exam:heartbeat` (timer, flag count, status), `exam:warning` (C9), `exam:forced` (→ C14 with the reason), `exam:sensor` (C10 overlays), `exam:capture-now` (take a webcam photo and `evidence:save`), `net:status` (C11 banner).

#### C7a. Answer areas by question type

```
multi                                              true_false
┌───────────────────────────────────────────┐     ┌──────────────────────┐  ┌──────────────────────┐
│  ☑   A   app                          1   │     │  ◉   True        1   │  │  ◯   False       2   │
└───────────────────────────────────────────┘     └──────────────────────┘  └──────────────────────┘
┌───────────────────────────────────────────┐
│  ☐   B   document                     2   │     short_text
└───────────────────────────────────────────┘     Your answer
┌───────────────────────────────────────────┐     [ -a                                       ]  2 / 100
│  ☑   C   BrowserWindow                3   │     Exact spelling matters for this question.     (when caseSensitive)
└───────────────────────────────────────────┘
Choose all that apply · 2 selected                numeric
                                                  Your answer
                                                  [ 0                ]  (number keypad allowed; unit shown after the box)

ordering                                           matching
Put these in order (top = first)                   Match each item on the left
┌────────────────────────────────────────┐         let     ──  [ Declares a constant           ▾ ]
│ 1  ipcRenderer.invoke('save')  [↑][↓]  │         var     ──  [ Declares a variable           ▾ ]
│ 2  preload forwards the call   [↑][↓]  │         guard   ──  [ Choose…                       ▾ ]
│ 3  ipcMain.handle runs         [↑][↓]  │         defer   ──  [ Runs code when scope exits    ▾ ]
│ 4  promise resolves in React   [↑][↓]  │         One option may be left over.
└────────────────────────────────────────┘
Drag a row, or focus it and use ⌥↑ / ⌥↓.

code block inside question text
        What does this print?
        ┌───────────────────────────────────────────────────┐
        │ $ echo $?                                         │   ← SF Mono on --surface-sunk, scrolls sideways
        │ 0                                                 │      when long; never wraps
        └───────────────────────────────────────────────────┘
```

- **Responses sent:** `{ optionId }` · `{ optionIds }` · `{ value }` · `{ text }` · `{ number }` · `{ order }` · `{ pairs }`. An empty answer sends `response: null` (Clear answer).
- **Key hints:** `1–9` only on choice types. Inside text and number boxes the letter keys type normally; `Esc` leaves the box and turns shortcuts back on.

### C8. Question palette (rail expanded with `Q`)

```
┌─────────────────────────────────────┐
│  Questions          6 of 12 answered │
│  [All] [Unanswered 6] [Marked 1]     │
│                                      │
│   ● 1  ● 2  ● 3  ◉ 4  ○ 5  ◐ 6       │
│   ⚐ 7  ○ 8  ○ 9  ○10  ○11  ○12       │
│                                      │
│  ● answered  ○ not yet  ◐ seen        │
│  ⚐ marked    ◉ current                │
└─────────────────────────────────────┘
```

Opens as a 280 px panel over the stage's left edge. `Esc` or `Q` closes it.

### C9. Flags

**C9a. Toast** (every counted flag), bottom centre, amber, 6 s:

```
                 ┌──────────────────────────────────────────────────────────┐
                 │ ⚑ Flag 2 of 5 · You left the exam window                 │
                 │   Even a quick switch counts. Tip: turn on Do Not Disturb.│
                 │                                            Details · ✕    │
                 └──────────────────────────────────────────────────────────┘
```

**C9b. Modal** (the first flag, and the final warning at N−1). It needs a click:

```
┌──────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────────────────────────────┐
│  ⚑  How flags work                                           │   │  ⚠  One more flag will end your exam                         │
│                                                              │   │                                                              │
│  You were flagged for: leaving the exam window.              │   │  You have 4 of 5 flags. The 5th ends the exam                │
│  Each flag is saved with a camera photo and a picture of     │   │  automatically, and your answers so far are submitted.       │
│  your screen, and a person reviews it.                       │   │                                                              │
│  At 5 flags the exam ends automatically.                     │   │  So far: app switch · no face · app switch · fullscreen exit  │
│                                                              │   │                                                              │
│                                  [ I understand, continue ]  │   │                                  [ I understand, continue ]  │
└──────────────────────────────────────────────────────────────┘   └──────────────────────────────────────────────────────────────┘
```

**C9c. Flags sheet** (click `⚑ 1/5`):

```
┌──────────────────────────────────────────┐
│  Your flags                     1 of 5 ✕ │
│                                          │
│  10:22  Left the exam window · Q4        │
│  You were away for 3 s.                  │
│  Tip: close chat apps before the exam.   │
│                                          │
│  4 more flags before the exam ends.      │
│  A person reviews every flag.            │
└──────────────────────────────────────────┘
```

- **Data:** `exam:warning { flagNo, maxFlags, rules, final, at, questionId }` from main. The renderer keeps the list for the sheet; on resume it comes from `attempts.get` → `flags`.
- **Copy:** each rule has a fixed message in `features/exam/flagMessages.js`, never the raw rule name.

| Rule | Toast text |
|---|---|
| `focus` | You left the exam window |
| `fullscreen` | You left fullscreen |
| `displays` | Another display was connected |
| `camera` | Your camera stopped |
| `noFace` | We couldn't see your face for 5 seconds |
| `multiFace` | More than one face was in view |
| `power` | Your Mac went to sleep or locked |
| `clipboard` | Copy and paste are turned off |

Info-only events (`face_too_far`, `low_light`, `idle` when not counted) show a neutral hint toast without a flag number: "Move a little closer to the camera."

### C10. Blocking overlays

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░┌──────────────────────────────────────────────────┐░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│  ⛶  You left fullscreen                          │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│                                                  │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│  Go back to fullscreen to continue.              │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│  Your answers are saved. Your time is running:   │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│  21 min left.                                    │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│                                                  │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░│  [   Return to fullscreen   ]                    │░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░└──────────────────────────────────────────────────┘░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Overlay | Trigger | Action |
|---|---|---|
| You left fullscreen | `exam:sensor { fullscreen: false }` | **Return to fullscreen** → IPC `exam:fullscreen` |
| We lost your camera | `MediaStreamTrack` `ended` / `mute` | **Reconnect** → `getUserMedia` again, with tips (unplugged, another app took it) |
| Another display is connected | `exam:sensor { displays: 2 }` and `blockMultipleDisplays` | Waits; clears itself when `displays` is 1 again |

The question is hidden behind the frosted layer. The status bar stays visible, so the timer keeps showing.

### C11. Connection and timer states

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚠ You're offline. Keep working: your answers are kept on this Mac. Don't quit Athena.        │  ← amber banner under status bar
└──────────────────────────────────────────────────────────────────────────────────────────────┘
   status bar: ⏱ 18 min left   ◌ Offline · 3 kept

   back online       → toast: "✓ Back online. Everything is saved."
   time ran out while offline → full card: "Your time ended while you were offline.
                       Answers saved before the deadline were submitted."  → C14
```

| Time left | Display | Colour | Moment |
|---|---|---|---|
| > 10 min | `24 min left` | `--ink` | none |
| 10 min | `10 min left` | `--attention` | one toast "10 minutes left" |
| 5 min | `4:59` (seconds appear) | `--attention`, bold | one toast |
| 1 min | `0:59` | `--critical` | banner "1 minute left: your answers are saved" |
| 0 | `Time's up` | `--critical` | card "Time's up. Submitting your answers…" → C14 |

- **Data:** `net:status { online, queued }` from main. The timer uses `deadlineAt` and `serverNow` from `exam:heartbeat` (BUILD_PLAN §22.4).
- **Extended time:** `exam:heartbeat` with a later `deadlineAt` → toast "Your examiner added 10 minutes."

### C12. Review & submit · `#/student/attempts/:attemptId/review`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▰  Electron Apps                     ⏱ 6 min left           ✓ Saved     ⚑ 1/5    ◉           │
│                                                                                              │
│              Review before you submit                                                        │
│              10 of 12 answered                                                               │
│                                                                                              │
│              MARKED FOR REVIEW (2)                                                           │
│              ⚐ Q7   Which window option hides the title bar…    answered       [ Go ]        │
│              ⚐ Q9   Put the IPC steps in order                  not answered   [ Go ]        │
│              NOT ANSWERED (2)                                                                │
│              ○ Q9 (above) · ○ Q11 How many processes does…                     [ Go ]        │
│                                                                                              │
│              After you submit, you can't change your answers.                                │
│              [ ‹ Back to questions ]                             [ Submit exam ]             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Submit exam** → IPC `dialog:confirmSubmit { answered: 10, total: 12, marked: 2 }`, a native sheet: "Submit your exam? 10 of 12 answered." with **Submit** / **Keep working**.
- On Submit: main flushes the queue, then `attempts.submit` → `{ received, total, submittedAt, code, resultVisible }`. Main runs `exam:exit` (leaves fullscreen, stops capture, detectors and heartbeat). → C14.
- **If the queue can't flush** (offline): "We're waiting for the connection to send your last answers. Your exam is submitted on the server when time runs out, with everything sent so far." **Keep trying** keeps retrying; the native dialog isn't shown again.

### C13. Quitting during an exam (native)

```
┌─────────────────────────────────────────────────────────┐
│  [icon]  Your exam is still running                     │
│                                                         │
│  The clock won't stop if you quit. You can reopen       │
│  Athena and resume until 10:30.                         │
│                                                         │
│                      [ Keep working ]   [ Quit anyway ] │
└─────────────────────────────────────────────────────────┘
```

- Main shows this on the window's `close` and on `before-quit` while an attempt is active (`dialog.showMessageBox`, `cancelId` = Keep working).
- **Quit anyway** sends an `app_quit` info event and persists the queue before quitting.

### C14. Done · `#/student/attempts/:attemptId/done`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
│                ┌──────────────────────────────────────────────────────────────────┐          │
│                │                         ✓                                        │          │
│                │            Your exam is submitted, Asha                          │          │
│                │                                                                  │          │
│                │   We received 10 of 12 answers.                                  │          │
│                │   Camera and screen capture are off.                             │          │
│                │                                                                  │          │
│                │   ┌────────────────────────────────────────────────────────┐     │          │
│                │   │ RECEIPT                                  ATH-7K4Q-9M2X  │     │          │
│                │   │ Electron Apps · Attempt 1                              │     │          │
│                │   │ Submitted 25 Oct 2026, 10:24 · by you                  │     │          │
│                │   │ Answers 10 / 12 · Evidence 64 images, all uploaded ✓   │     │          │
│                │   └────────────────────────────────────────────────────────┘     │          │
│                │   [ Save receipt (PDF) ]   [ Show evidence folder ]              │          │
│                │                                                                  │          │
│                │   Results will appear when your examiner publishes them.         │          │
│                │        (or, for "right after" exams:  [ View your results → ])   │          │
│                │                                                                  │          │
│                │                                          [ Back to exams ]       │          │
│                └──────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

| `submitReason` | Title | Line |
|---|---|---|
| `student` | Your exam is submitted | (as above) |
| `deadline` | Time's up: your exam is submitted | "Everything you answered before the deadline was saved." |
| `flag_limit` | Your exam has ended | "It ended automatically after 5 flags. Your answers so far were submitted. A person will review the flags." |
| `admin` | Your exam was ended by the examiner | "Your answers so far were submitted. If you weren't expecting this, talk to your examiner." |

- **Loads:** `attempts.receipt { attemptId }` and IPC `evidence:summary { attemptId }` (image count, upload state).
- **Save receipt (PDF):** IPC `receipt:savePdf { attemptId }`. Main opens `dialog.showSaveDialog`, prints the receipt card with `printToPDF` (print stylesheet shows only the receipt), and writes the file.
- The check mark draws once (300 ms; none with reduced motion). No confetti and no score on this page.

### C15. Result · `#/student/results/:attemptId`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  ‹ Results                                                                   │
│               │  Electron Apps · submitted 25 Oct · results published 26 Oct                 │
│ ▤ Exams       │                                                                              │
│ ✓ Results   ● │        Passed                                                                │
│ ◔ Analytics   │        32.5 / 40 · 81.3 %                  pass mark 40 %                     │
│ ⚙ Settings    │                                                                              │
│               │  [ All 12 ] [ Wrong 3 ] [ Marked 2 ]                                         │
│               │  ┌────────────────────────────────────────────────────────────────────────┐  │
│               │  │ Q4 · 2 / 2 marks  ✓                                       IPC          │  │
│               │  │ Which process is allowed to call dialog.showOpenDialog?               │  │
│               │  │   ◯ A  The renderer process                                            │  │
│               │  │   ◉ B  The main process                     ✓ your answer · correct    │  │
│               │  │   ◯ C  The preload script, through Node's require                     │  │
│               │  │   ◯ D  Any process with nodeIntegration on                            │  │
│               │  │ ▸ Explanation                                                          │  │
│               │  │   dialog is a main-process module. The renderer asks main over IPC.    │  │
│               │  └────────────────────────────────────────────────────────────────────────┘  │
│               │  ┌────────────────────────────────────────────────────────────────────────┐  │
│               │  │ Q9 · 1 / 4 marks  ◐ partly                               IPC           │  │
│               │  │ Put the IPC steps in order                                             │  │
│               │  │   Your order            Correct order                                  │  │
│               │  │   1 preload forwards  ✕ 1 ipcRenderer.invoke('save')                  │  │
│               │  │   2 ipcRenderer…      ✕ 2 preload forwards the call                   │  │
│               │  │   3 ipcMain.handle    ✓ 3 ipcMain.handle runs                         │  │
│               │  │   4 promise resolves  ✓ 4 promise resolves in React                   │  │
│               │  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads:** `attempts.result { attemptId }`. A 404 `RESULTS_NOT_AVAILABLE` shows "Results aren't available yet. Your examiner will publish them."
- **Rendering:** each question uses `QuestionView mode="review"`, which every type implements (its `Review.jsx`).
- **Tone:** the outcome word is `--ink` and large; no green for pass, no red for fail. Correct/incorrect marks per question use an icon and a word.

### C16. Results list · `#/student/results`

```
│  Results                                                                                     │
│  ┌──────────────────────┬──────────────┬─────────────┬──────────┬──────────┬───────────────┐ │
│  │ EXAM                 │ SUBMITTED    │ SCORE       │ %        │ OUTCOME  │               │ │
│  ├──────────────────────┼──────────────┼─────────────┼──────────┼──────────┼───────────────┤ │
│  │ Electron Apps        │ 25 Oct 10:24 │ 32.5 / 40   │ 81.3     │ Passed   │ View →        │ │
│  │ Swift Apps           │ 22 Oct 14:05 │ 26.0 / 36   │ 72.2     │ Passed   │ View →        │ │
│  │ React Native         │ 24 Oct 11:40 │ —           │ —        │ ○ Not available yet          │ │
│  └──────────────────────┴──────────────┴─────────────┴──────────┴──────────┴───────────────┘ │
```

- **Loads:** `me.attempts` → each attempt with `resultVisible` and, when visible, `score`, `maxScore`, `percent`, `outcome`.

### C17. My analytics · `#/student/analytics`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●                                                                                        │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  My analytics                                   From 3 exams with results    │
│               │  ┌────────────┬────────────┬────────────┬────────────┐                      │
│ ▤ Exams       │  │ EXAMS      │ AVERAGE    │ BEST       │ FLAGS / EXAM│                      │
│ ✓ Results     │  │ 3          │ 71.4 %     │ 81.3 %     │ 1.3         │                      │
│ ◔ Analytics ● │  └────────────┴────────────┴────────────┴────────────┘                      │
│ ⚙ Settings    │  ┌─ Score over time ───────────────────┐ ┌─ Accuracy by topic ───────────────┐ │
│               │  │ 100 ┤                               │ │ IPC          ████████████░  86 % │ │
│               │  │  75 ┤        ●───────●              │ │ Preload      ██████████░░░  78 % │ │
│               │  │  50 ┤  ●────╯                       │ │ Packaging    ██████░░░░░░░  50 % │ │
│               │  │  25 ┤                               │ │ Optionals    ████████░░░░░  64 % │ │
│               │  │     └──┬───────┬───────┬──          │ │ Shell flags  ███████████░░  83 % │ │
│               │  │      Swift  RN   Electron           │ └──────────────────────────────────┘ │
│               │  └─────────────────────────────────────┘                                      │
│               │  ┌─ By question type ──────────────────┐ ┌─ Time per question ───────────────┐ │
│               │  │ single       █████████████░  91 %   │ │ you      ▇▇▇▇▇▇  58 s              │ │
│               │  │ multi        ████████░░░░░░  60 %   │ │ class    ▇▇▇▇▇   49 s (median)     │ │
│               │  │ ordering     ██████░░░░░░░░  45 %   │ └───────────────────────────────────┘ │
│               │  │ …                                   │                                       │
│               │  └─────────────────────────────────────┘                                       │
│               │  Integrity: Electron Apps 1 flag · React Native 0 · Swift Apps 3              │
│               │  Every chart has a table view: [ Show as table ]                              │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads:** `me.analytics` → `{ tiles, trend[], byTopic[], byType[], timePerQuestion: { me, classMedian }, integrity[] }`. Only attempts whose result is visible count.
- **Empty:** "Your analytics appear after your first result."

---

## Admin screens

### A0. Admin shell

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●     Exams / Electron Apps / Live                                                       │
├───────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ ▰ Athena      │  Electron Apps                                       ◐ Live now · 8 writing  │
│   ADMIN       │  ELE-01 · 30 min · 12 questions                       [ Publish results… ]   │
│               │  ──────────────────────────────────────────────────────────────────────────  │
│ ⌂ Home        │  Overview  Questions  Settings  Proctoring  Live●  Review 3  Results  Analytics│
│ ▤ Exams     ● │  ═════════════════════════════════════                                       │
│ ☺ Students    │                                                                              │
│ ⚙ Settings    │                          (tab content)                                       │
│               │                                                                              │
│ ───────────── │                                                                              │
│ (TA) Admin    │                                                                              │
│ Sign out      │                                                                              │
└───────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

- **Sidebar:** 220 px, collapses to a 56 px icon rail (remembered in `localStorage`).
- **Breadcrumbs** sit in the title-bar row (in the drag region, with `no-drag` on links).
- **Exam header:** name, code, a status chip (pulses gently while live), and one primary action that depends on state: draft → **Publish…**, live or closed with "when I publish" → **Publish results…**.
- **Tab badges:** a dot on **Live** while attempts are in progress; a number on **Review** for pending reviews.

### A1. Home · `#/admin`

```
│  Good morning                                                                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐                              │
│  │ LIVE NOW     │ WRITING      │ TO REVIEW    │ RESULTS READY│                              │
│  │ 1 exam       │ 8 students   │ 3 attempts   │ 1 exam       │                              │
│  └──────────────┴──────────────┴──────────────┴──────────────┘                              │
│                                                                                              │
│  NEEDS YOUR ATTENTION                                                                        │
│  ⚑ Electron Apps   3 attempts waiting for review                       [ Open review ]      │
│  ● React Native    window closed · results not published (14 ready)    [ Publish results… ] │
│  ○ Swift Apps v2   draft · 2 problems before publishing                [ Fix ]              │
│                                                                                              │
│  RECENT                                                                                      │
│  10:24  Asha Rao submitted Electron Apps (32.5 / 40)                                         │
│  10:22  Dev Khanna ended by flags in Electron Apps                                           │
```

- **Loads:** `admin.home` → `{ tiles, attention[], recent[] }`.

### A2. Exams · `#/admin/exams`

```
│  Exams                                                                       [ + New exam ]  │
│  Build, publish and run exams.                                                               │
│  [ All 5 ] [ Draft 1 ] [ Published 2 ] [ Live 1 ] [ Closed 1 ]          [⌕ Search        ]   │
│  ┌──────────────────────┬─────────┬───────────┬──────────────────────┬──────────┬─────────┐  │
│  │ EXAM                 │ STATUS  │ QUESTIONS │ WINDOW               │ ATTEMPTS │ RESULTS │  │
│  ├──────────────────────┼─────────┼───────────┼──────────────────────┼──────────┼─────────┤  │
│  │ Electron Apps        │ ◐ Live  │ 12 · 40 mk│ Today 09:00–18:00    │ 8 / 10   │ On publish│ │
│  │ CLI Apps             │ ● Publ. │ 12 · 30 mk│ Today 09:00–18:00    │ 3 / 10   │ Right after││
│  │ React Native         │ ✓ Closed│ 12 · 36 mk│ 24 Oct               │ 14 / 10  │ ○ Not publ.││
│  │ Swift Apps v2        │ ○ Draft │ 9 · 28 mk │ (not set)            │ —        │ —        │ │
│  └──────────────────────┴─────────┴───────────┴──────────────────────┴──────────┴─────────┘  │
```

- **Loads:** `admin.exams.list`. A row click opens A3. Row `⋯`: Duplicate, Unpublish (only if no one started), Delete (drafts only, confirm with the exam name).

**A2a. New exam dialog**

```
┌──────────────────────────────────────────────────────────────┐
│  New exam                                                    │
│                                                              │
│  Title           [ Swift Apps v2                          ]  │
│  Code            [ SWF-02 ]  (short, shown on receipts)      │
│  Description     [                                        ]  │
│  Start from      (•) Blank   ( ) Copy of [ Swift Apps   ▾ ]  │
│                                                              │
│                                  [ Cancel ]  [ Create exam ] │
└──────────────────────────────────────────────────────────────┘
```

- **Sends:** `admin.exams.create { title, code, description, copyFromId? }` → opens A4 (Questions) of the new draft.

### A3. Exam overview · `#/admin/exams/:examId`

```
│  Overview                                                                                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐               │
│  │ STARTED      │ SUBMITTED    │ IN PROGRESS  │ MEAN         │ FLAGGED      │               │
│  │ 10           │ 8            │ 2            │ 68.4 %       │ 3            │               │
│  └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘               │
│  SETUP                                                                                       │
│  ✓ 12 questions · 40 marks · all types have keys                       [ Questions ]        │
│  ✓ 30 min · today 09:00–18:00 · 1 attempt                              [ Settings ]         │
│  ✓ Proctoring: Standard (ends at 5) · face rules on                    [ Proctoring ]       │
│  ✓ Results: when you publish · pass 40 % · hold auto-ended             [ Settings ]         │
```

- **Loads:** `admin.exams.get { examId }` (summary counts included).

### A4. Questions (the builder) · `#/admin/exams/:examId/questions`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Swift Apps v2                ○ Draft · 2 problems                            [ Publish… ]   │
│  Overview  Questions  Settings  Proctoring  …                                                │
│  ══════════                                                                                  │
├──────────────────────────┬──────────────────────────────────────────┬────────────────────────┤
│ OUTLINE   9 q · 28 mk    │  Q4 · Short answer                        │ PREVIEW         ☀ ☾   │
│ [⌕ Find question ]       │  ─────────────────────────────────────── │ ┌────────────────────┐ │
│                          │  Type   ✎ Short answer ▾      2 marks     │ │ Q4 of 9   2 marks  │ │
│   ⋮ 1 ◉ What does a…   2 │                                          │ │                    │ │
│   ⋮ 2 ☑ Which are val… 4 │  Question                                │ │ Which keyword      │ │
│   ⋮ 3 ⊤ A struct is a…  2 │  ┌────────────────────────────────────┐ │ │ unwraps an         │ │
│ ▸ 4 ✎ Which keyword…  2 ●│  │ Which keyword unwraps an optional  │ │ │ optional and exits │ │
│   ⋮ 5 # How many byte… 2 │  │ and exits early when it is nil?    │ │ │ early when it is   │ │
│   ⋮ 6 ⇅ Order the app… 4 │  │ ```swift                           │ │ │ nil?               │ │
│   ⋮ 7 ⇄ Match keyword… 4 │  │ ____ let user = user else { … }    │ │ │ [ code block ]     │ │
│   ⋮ 8 ◉ Which view…   ⚠ 2│  │ ```                                │ │ │ [ answer box    ]  │ │
│     ⚠ No correct option  │  └────────────────────────────────────┘ │ │                    │ │
│   ⋮ 9 ◉ What is …      4 │                                          │ │ ◁ Prev  ☆  Next ▷ │ │
│                          │  Accepted answers                        │ └────────────────────┘ │
│ + Add question           │  [ guard ]  [ + add ]                     │ Answer as a student    │
│                          │  [■] Case-sensitive   Max chars [ 100 ]   │ to check the key:      │
│                          │                                          │ → 2 / 2 marks ✓        │
│                          │  Topic        [ Optionals      ]          │                        │
│                          │  Explanation  [ guard let binds… ]        │                        │
│                          │                       Saved 3 s ago ✓    │                        │
├──────────────────────────┴──────────────────────────────────────────┴────────────────────────┤
│  N new question · ⌥↑↓ move · ⌘D duplicate · ⌘⌫ delete                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Outline:** drag rows or `⌥↑↓` to reorder (`admin.questions.reorder`). Type icons: `◉` single, `☑` multi, `⊤` true/false, `✎` short text, `#` numeric, `⇅` ordering, `⇄` matching. `⚠` marks a problem from the publish checks.
- **Editor:** shared fields + the type's `Editor.jsx`. It autosaves 800 ms after typing stops (`admin.questions.update`). Validation errors from the server sit under their fields. Changing the type asks first ("Options and the key will be cleared").
- **Preview:** `QuestionView mode="preview"`. Answering it calls `admin.questions.previewScore { questionId, response }` and shows the marks.
- **Published exams:** read-only, with the banner "Published · questions are locked. Unpublish (no one has started) or duplicate the exam to make changes."

**A4a. Add question: the type picker**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Add a question                                                              │
│  ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────┐│
│  │ ◉ Single choice        │ │ ☑ Multiple select      │ │ ⊤ True / false     ││
│  │ Pick one option        │ │ Pick all that apply    │ │ One statement      ││
│  └────────────────────────┘ └────────────────────────┘ └────────────────────┘│
│  ┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────┐│
│  │ ✎ Short answer         │ │ # Number               │ │ ⇅ Put in order     ││
│  │ Type a word or command │ │ Type a number          │ │ Arrange steps      ││
│  └────────────────────────┘ └────────────────────────┘ └────────────────────┘│
│  ┌────────────────────────┐                                                  │
│  │ ⇄ Match pairs          │                                                  │
│  │ Connect two columns    │                                                  │
│  └────────────────────────┘                                     [ Cancel ]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**A4b. Type editors** (the part under "Question" that changes by type)

```
single / multi                                        numeric
Options                           Shuffle (exam-wide) Answer     [ 0      ]   Tolerance ± [ 0   ]
⋮ (•) A  [ The main process          ]  ✕             Unit       [        ]   (shown after the box)
⋮ ( ) B  [ The renderer process      ]  ✕
+ Add option          (multi: ☑ boxes, and           ordering
                       Scoring (•) All or nothing     Items in the CORRECT order (shuffled for students)
                               ( ) Partial)           ⋮ 1 [ ipcRenderer.invoke('save')  ]  ✕
                                                      ⋮ 2 [ preload forwards the call   ]  ✕
true_false                                            + Add item
Correct answer   (•) True  ( ) False                  Scoring (•) Positional  ( ) Exact

matching
Left                         Correct match            Extra right-side options (distractors)
[ let    ]  ──  [ Declares a constant        ]        [ Declares a function   ]  ✕
[ guard  ]  ──  [ Exits early unless true    ]        + Add extra
+ Add pair
```

### A5. Settings · `#/admin/exams/:examId/settings`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                                    │
├──────────────────────┬───────────────────────────────────────────────────────────────────────┤
│  Timing & window  ●  │  TIMING & WINDOW                                                      │
│  Attempts & order    │  Duration          [ 30 ] minutes                                     │
│  Instructions        │  Window opens      [ 25 Oct 2026 ] [ 09:00 ]                          │
│  Platform terms      │  Window closes     [ 25 Oct 2026 ] [ 18:00 ]                          │
│  Results             │  Late start        Starting at 17:45 gives 15 min, not 30.            │
│  Danger zone         │                                                                       │
│                      │  ATTEMPTS & ORDER                                                     │
│                      │  Attempts allowed  [ 1 ]                                              │
│                      │  Shuffle questions [■]   Shuffle options [■]                          │
│                      │                                                                       │
│                      │  INSTRUCTIONS      [ Shown on the exam page and the rules step… ]     │
│                      │  PLATFORM TERMS    [ 1. Who you are. You will take…            ]      │
│                      │                    [ Reset to the sample terms ]                      │
│                      │                                                                       │
│                      │  RESULTS                                                              │
│                      │  Show results      ( ) Right after the student submits                │
│                      │                    (•) When I publish                                 │
│                      │                    "Right after" suits practice; "when I publish"     │
│                      │                    stops answers spreading while others still write.  │
│                      │  Pass mark         [ 40 ] %                                           │
│                      │  Auto-ended        [■] Hold until I review them                       │
│                      │                                                                       │
│                      │  DANGER ZONE       [ Duplicate ]  [ Unpublish ]  [ Delete draft ]     │
├──────────────────────┴───────────────────────────────────────────────────────────────────────┤
│  You have unsaved changes                                      [ Discard ]   [ Save settings ] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Sends:** `admin.exams.updateSettings { examId, settings }`. It saves explicitly (no autosave). Leaving with unsaved changes asks first.
- **Published exams:** the window can be extended but not moved earlier than a start that already happened; duration and attempts are locked once someone starts. Locked fields show why in a tooltip.

### A6. Proctoring · `#/admin/exams/:examId/proctoring`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Proctoring                                                                                  │
│  Preset  [ Standard ] [ Lenient ] [ Monitor only ] [ Off ]           (Custom once you change) │
│                                                                                              │
│  Auto-end     [■] End the exam at [ 5 ] counted flags     Students see "Flag 2 of 5"         │
│  Screenshots  every [ 45 ]–[ 60 ] s (random) · also at every flag [■]                        │
│  Camera photo [■] with each screenshot                                                       │
│  Displays     [■] Block the start if more than one display is connected                      │
│                                                                                              │
│  RULE                         ON   COUNTS   WARN   SETTING                                   │
│  Fullscreen                   [■]   [■]      [■]                                             │
│  App switch                   [■]   [■]      [■]    away longer than [ 1.5 ] s               │
│  Extra display                [■]   [■]      [■]                                             │
│  Camera lost                  [■]   [■]      [■]                                             │
│  No face                      [■]   [■]      [■]    for [ 5 ] s                              │
│  Multiple faces               [■]   [■]      [■]                                             │
│  Sleep or lock                [■]   [■]      [■]                                             │
│  Idle                         [■]   [ ]      [■]    after [ 120 ] s                          │
│  Copy / paste                 [■]   [■]      [■]    block copy-paste [■]  right-click [■]    │
│  Heartbeat gap                shown to you, never counted                                    │
│                                                                                              │
│  ⓘ What students will see before starting                         [ Preview rules screen ]  │
│                                                                         [ Save proctoring ]  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Sends:** `admin.exams.updateProctoring { examId, proctoring }`. Client-side checks match the server's: max interval ≥ min, min ≥ 10 s, max flags 1–50.
- **Preview rules screen** opens C4 in a sheet, generated from the unsaved form.
- Locked once a student starts (same as RishiPariksha).

| Preset | Auto-end | Rules |
|---|---|---|
| Standard | on, 5 | everything counts except idle |
| Lenient | on, 10 | same rules |
| Monitor only | off | everything flagged, nothing ends the exam |
| Off | — | no capture, no rules; the rules step shows only "How the exam works" |

### A7. Publish checklist dialog

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Publish Swift Apps v2?                                                      │
│                                                                              │
│  ✕ 2 problems must be fixed                                                  │
│    ✕ Q8 Which view…: no correct option                          [ Go to Q8 ] │
│    ✕ Window closes before it opens                              [ Settings ] │
│  ⚠ 1 thing to check (won't block)                                            │
│    ⚠ Proctoring is Off                                          [ Proctoring]│
│  ✓ 9 questions · 28 marks · 25 min · opens 27 Oct 10:00                      │
│                                                                              │
│  After publishing, questions are locked. Settings stay editable within       │
│  limits.                                                                     │
│                                             [ Cancel ]   [ Publish ] (off)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Sends:** `admin.exams.publish { examId, dryRun: true }` to fill the list, then `dryRun: false`. The server returns every problem at once, so the list matches it exactly.

| Check | Blocks |
|---|---|
| No questions | yes |
| A question with no key (no correct option, empty accepted list, fewer than 2 ordering items, a matching pair without a match) | yes |
| A choice question with fewer than 2 options | yes |
| Window missing, or closes before it opens, or shorter than the duration | yes |
| Duration below 1 min | yes |
| Proctoring off | no (warning) |
| Results "right after" with proctoring on | no (warning: "students see answers while others may still be writing") |

### A8. Students · `#/admin/students`

```
│  Students                                              [ Import from file ]  [ + Add student ]│
│  Accounts that can sign in and take exams.                                                   │
│  [ All 10 ] [ Active 9 ] [ Off 1 ]                                       [⌕ Search        ]  │
│  ┌──────────────┬──────────────────────┬─────────┬──────────┬───────────────────┬─────────┐  │
│  │ ROLL NO      │ NAME                 │ STATUS  │ ATTEMPTS │ LAST ACTIVE       │         │  │
│  ├──────────────┼──────────────────────┼─────────┼──────────┼───────────────────┼─────────┤  │
│  │ 23CS042      │ Asha Rao             │ ● Active│ 3        │ 4 min ago         │ ⋯       │  │
│  │ 23CS017      │ Dev Khanna           │ ● Active│ 2        │ 25 Oct 10:22      │ ⋯       │  │
│  │ 23CS051      │ Kunal Shah           │ ○ Off   │ 0        │ never             │ ⋯       │  │
│  └──────────────┴──────────────────────┴─────────┴──────────┴───────────────────┴─────────┘  │
        row ⋯ :  Reset password…  ·  Turn off / Turn on  ·  View attempts
```

**A8a. Add student / one-time password**

```
┌──────────────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
│  Add student                                 │   │  Password for Asha Rao                       │
│  Roll number  [ 23CS042            ]         │   │                                              │
│  Name         [ Asha Rao           ]         │   │   K7Q4-M2XB-9F3C                  [ Copy ]   │
│  Password     (•) Generate one               │   │                                              │
│               ( ) Set: [            ]        │   │  Shown once. Give it to the student; they    │
│                                              │   │  sign in with it.                            │
│                    [ Cancel ]  [ Add ]       │   │                                   [ Done ]   │
└──────────────────────────────────────────────┘   └──────────────────────────────────────────────┘
```

**A8b. Import from file** (three steps in one dialog)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Import students              ① Choose file ── ② Check ── ③ Done             │
│                                                                              │
│  students.csv · 24 rows                                     [ Choose another]│
│  ✓ 21 ready   ⚠ 2 already exist (skipped)   ✕ 1 problem                     │
│  ┌──────────┬─────────────────┬────────────────────────────────────┐         │
│  │ ROLL NO  │ NAME            │                                    │         │
│  │ 23CS060  │ Riya Mehta      │ ✓                                  │         │
│  │ 23CS042  │ Asha Rao        │ ⚠ exists                           │         │
│  │          │ Neel            │ ✕ roll number missing (row 14)     │         │
│  └──────────┴─────────────────┴────────────────────────────────────┘         │
│  Expected columns: rollNo,name (password is generated)                       │
│                                       [ Cancel ]   [ Import 21 students ]    │
└──────────────────────────────────────────────────────────────────────────────┘
   step ③ shows the 21 generated passwords once, with [ Save as CSV… ]
```

- **Loads/sends:** `admin.users.list`, `admin.users.create`, `admin.users.update { active }`, `admin.users.resetPassword` → `{ password }` (shown once).
- **Import:** IPC `file:openCsv` (main runs `dialog.showOpenDialog`, reads the file with `fs`, max 1 MB, returns `{ fileName, text }`). The renderer parses it for the preview. `admin.users.import { rows, dryRun }` checks it on the server. Step ③'s **Save as CSV…** uses IPC `file:saveCsv`.

### A9. Live · `#/admin/exams/:examId/live`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Live                                                               Updated 4 s ago ⟳ ⏸     │
│  ┌──────────┬───────────┬──────────────┬─────────────┬─────────────┐                        │
│  │ WRITING  │ FLAGGED   │ NEEDS ATTENT.│ ENDED BY FLAGS│ SUBMITTED  │                        │
│  │   8      │   3       │   1          │   1          │   2         │                        │
│  └──────────┴───────────┴──────────────┴─────────────┴─────────────┘                        │
│  [ Grid ▦ ][ List ☰ ]   Sort: Flags ▾   Show: Flagged only [ ]        [ Extend everyone… ]  │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌───────────────────┐│
│  │ [screenshot 10:41]  │ │ [screenshot 10:41]  │ │ [screenshot 10:40]  │ │ [⚠ no heartbeat   ││
│  │                     │ │                     │ │                     │ │   for 45 s ]      ││
│  │ Dev Khanna · 23CS017│ │ Asha Rao · 23CS042  │ │ Neel P. · 23CS033   │ │ Kunal S. · 23CS051││
│  │ ⚑4/5 ▆High  11m left│ │ ⚑1/5 ▁Low  18m left │ │ ⚑0/5 ▁Low  20m left │ │ ⚑1/5  14m left    ││
│  │ ⛶✓ ◉✓ ☺⚠ ▭1  6s ago │ │ ⛶✓ ◉✓ ☺✓ ▭1  3s ago │ │ ⛶✓ ◉✓ ☺✓ ▭1  2s ago │ │ ⛶? ◉? ☺? ▭?  45s ⚠ ││
│  │ [Evidence] [⋯]      │ │ [Evidence] [⋯]      │ │ [Evidence] [⋯]      │ │ [Evidence] [⋯]    ││
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └───────────────────┘│
│                                                                                              │
│  FLAG FEED (newest first)                                                     ⏸ pause feed   │
│  10:41:08  Dev Khanna   Multiple faces        [▧]  ·  10:40:51  Asha Rao   App switch 2.1 s  │
│  10:40:12  Dev Khanna   No face 6 s           [▧]  ·  10:39:30  Kunal S.   Fullscreen exit   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
 ⛶ fullscreen   ◉ camera   ☺ face (✓ one · ✕ none · ⚠ several)   ▭ displays   · time since last heartbeat
 card ⋯ :  Extend…  ·  End…  ·  Open review
```

- **Loads:** `admin.live { examId, since }` every 5 s while the tab is visible → `{ counters, attempts[], feed[] }`. Each attempt carries `latestScreenshot` (a file name; the image loads through IPC `evidence:adminImage`, see BUILD_PLAN §17).
- **Needs attention:** no heartbeat for over 30 s, camera lost, or face detection unavailable. Computed by the server at read time.
- **Counters filter the grid** when clicked. **⏸** stops polling.

**A9a. Extend / End / Resume dialogs**

```
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│  Extend time for Asha Rao                    │ │  End Dev Khanna's exam?                      │ │  Resume Dev Khanna's exam                    │
│                                              │ │                                              │ │                                              │
│  Add  [ 10 ] minutes                         │ │  Their answers so far are submitted and the  │ │  Ended by flags at 10:22 with 11 min left.   │
│  New end: 10:44 (was 10:34)                  │ │  exam ends on their screen at the next       │ │  Extra flags allowed  [ 2 ]                  │
│                                              │ │  heartbeat (within 10 s).                    │ │  Time given back      11 min                 │
│  Reason  [Power cut] [Platform issue] [Other]│ │                                              │ │                                              │
│          [ ...                             ] │ │  Reason (required) [                       ] │ │  Reason (required) [                       ] │
│                                              │ │                                              │ │                                              │
│              [ Cancel ]  [ Extend 10 min ]   │ │              [ Cancel ]  [ End exam ]        │ │              [ Cancel ]  [ Resume ]          │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

- **Sends:** `admin.attempts.extend { attemptId, minutes, reason }`, `admin.attempts.end { attemptId, reason }`, `admin.attempts.resume { attemptId, extraFlags, reason }`, `admin.exams.extendInProgress { examId, minutes, reason }`. Each one is logged as an admin event on the attempt.

### A10. Review · `#/admin/exams/:examId/review` (the console)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Review     Status: Pending ▾   Rule: Any ▾   Sort: Risk ▾                                   │
├──────────────────────────────┬───────────────────────────────────────────────────────────────┤
│ QUEUE  3 pending             │  Dev Khanna · 23CS017        ⚑ Ended by flags · ⚑ 5/5 · ▆ High 38│
│ ┌──────────────────────────┐ │  Reasons: 2× multiple faces · no face 2 m 40 s · auto-ended    │
│ │▸ Dev Khanna   ▆38  ⚑5/5  │ │  ┌ Identity photo ┐   Flag 3 of 5   ‹ prev  next ›             │
│ │  ended · faces, focus    │ │  │  [ photo ]     │   Multiple faces · 10:22:40 · Q7 on screen  │
│ ├──────────────────────────┤ │  └────────────────┘   counted                                  │
│ │  Kunal Shah   ▃14  ⚑3/5  │ │ ┌───────────────────────────────────────────────────────────┐ │
│ │  submitted · fullscreen  │ │ │ −2:10   −1:05   −0:20 │ 0:00 ★  │ +0:35   +1:20   +2:00  │ │
│ ├──────────────────────────┤ │ │ [scr]   [cam]   [scr] │ [cam]★  │ [scr]   [cam]   [scr]  │ │
│ │  Asha Rao     ▁4   ⚑1/5  │ │ └───────────────────────────────────────────────────────────┘ │
│ │  submitted · focus       │ │ ┌───────────────────────────────────────────────────────────┐ │
│ └──────────────────────────┘ │ │                                                           │ │
│                              │ │          [ camera photo 10:22:40 · large ]                │ │
│ j/k student · ←/→ flag       │ │          two faces visible                                │ │
│                              │ │                       ◁  ▷   ⤢ full screen               │ │
│                              │ └───────────────────────────────────────────────────────────┘ │
│                              │  EVENTS ±2 min                                                │
│                              │  10:21:02  window_blur 2.1 s                                  │
│                              │  10:22:38  ▶ multiple_faces (2) ─ this flag                   │
│                              │  10:22:40  ▶ camera photo, screenshot captured                │
│                              │ ───────────────────────────────────────────────────────────── │
│                              │  This flag:  [ Dismiss flag… (d) ]                            │
│                              │  Decision:   [ ✓ Clear (c) ] [ ? Suspicious (s) ] [ ✕ Disqualify (x) ]│
│                              │  Note (required) [ Second person visible in 2 camera photos ] │
│                              │  Attempt:    [ Resume… ]  (only when ended by flags)          │
└──────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

- **Loads:** `admin.reviewQueue { examId, status, rule, sort }` → queue rows. Selecting one loads `admin.attempts.get { attemptId }` → `{ attempt, identityPhoto, flags[], events[], captures[], risk, answers }`.
- **Filmstrip:** captures within ±2 min of the flag, placed by time offset; the flag's own captures get a ★. Clicking an image shows it large; **⤢** opens the lightbox (A10a). Images load through IPC `evidence:adminImage`.
- **Sends:** `admin.flags.dismiss { attemptId, flagId, note }` (quick picks: *Network blip*, *Lighting*, *Told to by me*, *Other*) · `admin.attempts.review { attemptId, status, note }` (note required; Disqualify asks again: "This sets the outcome to Disqualified when results are visible").
- **After a decision** the queue moves to the next student and the toast offers **Undo** for 10 s (sets the review back to Pending).
- **Answers tab** (segmented control above the flag header: `Flags | Answers`): the attempt's answers through `QuestionView mode="review"`, with time spent per question.
- **Wording:** never "cheating". Only *flag*, *evidence*, *decision*.

**A10a. Evidence lightbox**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ✕   Dev Khanna · Flag 3 of 5 · Multiple faces                       Image 4 of 7 · camera    │
│                                                                                              │
│  ◁                         [ full-size image, fit to window ]                             ▷  │
│                                                                                              │
│  10:22:40 · 0 s from the flag · attached to the flag ★                            [ 1:1 ]    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### A11. Results · `#/admin/exams/:examId/results`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Results        Show results: when you publish · pass 40 %     [ ⇩ Export CSV ]  [ Publish results… ]│
│  ① Submitted 10 ── ② Reviewed 7 · 3 waiting ── ③ Ready 9 ── ④ Visible 0                      │
│                                                                                              │
│  Outcome: All ▾   Review: All ▾   Flagged only [ ]                         [⌕ ]             │
│  ┌──────────────────────┬────────┬───────┬──────────────┬──────┬────────────┬──────────────┐ │
│  │ STUDENT              │ SCORE  │ %     │ OUTCOME      │ FLAGS│ REVIEW     │ RESULT       │ │
│  ├──────────────────────┼────────┼───────┼──────────────┼──────┼────────────┼──────────────┤ │
│  │ Asha Rao 23CS042     │ 32.5   │ 81.3  │ Passed       │ 1    │ ✓ Cleared  │ ○ Not visible│ │
│  │ Dev Khanna 23CS017   │ 14.0   │ 35.0  │ Not passed   │ ⚑5   │ · Pending  │ ⏸ Held       │ │
│  │   held: ended by flags, review pending  [ Review ]                                      │ │
│  │ Kunal Shah 23CS051   │ 22.0   │ 55.0  │ Disqualified │ ⚑3 ✕ │ ✕ Disq.    │ ○ Not visible│ │
│  └──────────────────────┴────────┴───────┴──────────────┴──────┴────────────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
   "Right after" exams: no Publish button; header reads "Students see results when they submit";
   held rows get [ Release ] once reviewed.
```

**A11a. Publish results dialog**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Publish results · Electron Apps                                             │
│                                                                              │
│  Will be visible to 9 students:                                              │
│    score, percent, outcome, every question with the key and explanation      │
│  Not included: 1 held for review                                             │
│  Outcomes: 7 Passed · 1 Not passed · 1 Disqualified                          │
│                                                                              │
│  Students who submit later (the window is still open) see results as soon   │
│  as they submit.                                                             │
│                                                                              │
│                                       [ Cancel ]   [ Publish 9 results ]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Loads/sends:** `admin.results.list { examId }` · `admin.results.publish { examId, dryRun: true }` fills the counts, then `dryRun: false` · `admin.attempts.release { attemptId }` · **Export CSV** → IPC `results:exportCsv { examId }` (main calls `admin.results.csv`, opens `dialog.showSaveDialog`, writes the file; the server escapes cells that start with `= + - @` so the CSV is safe to open in a spreadsheet).

### A12. Analytics · `#/admin/exams/:examId/analytics`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  Analytics   [ Overview ] [ Questions ] [ Topics ] [ Integrity ]       Submitted attempts · n = 10 │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────┐                          │
│  │ SUBMITTED  │ COMPLETION │ MEAN       │ MEDIAN     │ TIME USED  │                          │
│  │ 10 / 10    │ 100 %      │ 61.8 %     │ 63.0 %     │ 24 of 30 m │                          │
│  └────────────┴────────────┴────────────┴────────────┴────────────┘                          │
│  ┌─ Score distribution ────────────────────────────────────────────────────────────────────┐│
│  │ count                                                                                   ││
│  │  4 ┤                         ██                                                         ││
│  │  3 ┤                   ██    ██                                                         ││
│  │  2 ┤             ██    ██    ██    ██                                                   ││
│  │  1 ┤       ██    ██    ██    ██    ██    ██                                             ││
│  │  0 ┼──┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴──                        ││
│  │     0    10    20    30    40    50    60    70    80    90   100 %                     ││
│  │                     ┊ pass 40 %        │median  │mean                                   ││
│  └─────────────────────────────────────────────────────────────────────────────────────────┘│
│  Most students scored between 50 and 80 %. 1 student is below the pass mark.               │
│                                                                                              │
│  QUESTIONS                                                                       [ ⇩ CSV ]  │
│  ┌────┬──────────────────────────────┬──────────┬──────────┬───────────┬────────┬──────────┐ │
│  │ Q  │ QUESTION                     │ TYPE     │ CORRECT  │ AVG MARKS │ AVG T  │ COMMON ✕ │ │
│  ├────┼──────────────────────────────┼──────────┼──────────┼───────────┼────────┼──────────┤ │
│  │ 9  │ Put the IPC steps in order   │ ordering │ 20 % ⚠   │ 1.8 / 4   │ 1m40s  │ 2↔1 swap │ │
│  │ 4  │ Which process can call dial… │ single   │ 90 %     │ 1.8 / 2   │ 0m35s  │ A (1)    │ │
│  │ 7  │ Which option hides the tit…  │ single   │ 30 % ⚠key?│ 0.6 / 2  │ 0m50s  │ C (6)    │ │
│  └────┴──────────────────────────────┴──────────┴──────────┴───────────┴────────┴──────────┘ │
│  ⚠key? = more top-half students chose a wrong option than the key. Check the key.           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

Topics tab                                        Integrity tab
┌─ Accuracy by topic ───────────────────┐        ┌─ Flags by rule ───────────┐ ┌─ Flags by minute ──────────┐
│ IPC         ████████████░░  78 %      │        │ App switch   ████████ 9   │ │ ▁▁▂▁▁▁▁█▁▁▂▁▁▁▁▁▁▁▁▁       │
│ Preload     ██████████░░░░  70 %      │        │ No face      ████ 4       │ │ spike at min 8 ⓘ           │
│ Packaging   ██████░░░░░░░░  45 %      │        │ Multi face   ██ 2         │ └────────────────────────────┘
│ Windows     ███████████░░░  74 %      │        │ Fullscreen   ██ 2         │  Ended by flags 1 · cleared 7
└───────────────────────────────────────┘        └───────────────────────────┘  suspicious 1 · disqualified 1
```

- **Loads:** `admin.analytics { examId }` → `{ tiles, histogram[], markers, reading, questions[], topics[], integrity: { byRule[], byMinute[], decisions } }`. The server computes it from attempts on each request (fine at class size).
- **ⓘ on a spike:** "A spike across many students usually means a platform problem, not cheating."
- **Every chart** has **Show as table**.

---

## Route table

| Route | Screen | Role |
|---|---|---|
| `#/login` | S1 | any |
| `#/server` | S2 | any |
| `#/settings` | S3 | signed in |
| `#/student/exams` | C1 | student |
| `#/student/exams/:examId` | C2 | student |
| `#/student/exams/:examId/start/check` · `/rules` · `/photo` · `/begin` | C3–C6 | student |
| `#/student/attempts/:attemptId` | C7–C11 | student, own in-progress attempt |
| `#/student/attempts/:attemptId/review` | C12 | student |
| `#/student/attempts/:attemptId/done` | C14 | student |
| `#/student/results` · `/:attemptId` | C16, C15 | student |
| `#/student/analytics` | C17 | student |
| `#/admin` | A1 | admin |
| `#/admin/exams` | A2 | admin |
| `#/admin/exams/:examId` · `/questions` · `/settings` · `/proctoring` · `/live` · `/review` · `/results` · `/analytics` | A3–A12 | admin |
| `#/admin/students` | A8 | admin |

- A route guard checks `auth:me` (cached in the auth context). Wrong role → the role's home. Not signed in → S1.
- The server enforces the same rules. The guard only keeps the UI tidy.
