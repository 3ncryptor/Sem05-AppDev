# Athena user guide: running an exam as an examiner and taking one as a student

Compiled 2026-10-25. Every label quoted here was read from the screen's source file, and those files are cited by path in this repository (mostly under `app/src/features/`).

---

## Summary

Athena has two roles and one app. The examiner (admin) signs in, creates an exam, writes questions in seven auto-graded formats, sets the time window and screenshot interval, publishes, watches the exam live, reviews each attempt's answers and saved images, and publishes results. The student signs in, opens a published exam, passes a four-row system check, agrees to the rules and the capture terms, takes an identity photo, presses Begin and writes the exam in fullscreen. Answers save on their own, even offline.

While an exam runs, Athena saves a screenshot of its own window and a webcam photo: one pair 3 seconds after the exam opens, then one pair at a random moment every 45 to 60 seconds by default (`app/electron/capture.js`, `FIRST_SHOT_MS` and `DEFAULT_INTERVAL`). The examiner can change that range per exam. Students consent to this on the rules step, before anything is captured. The images are stored only on the server, at:

```
backend/screenshots/<Candidate_Name>/<Test_Name>/webcam/<Candidate_Name>-<Test_Name>-<YYYY-MM-DD_HH-mm-ss>.jpg
backend/screenshots/<Candidate_Name>/<Test_Name>/screen/<Candidate_Name>-<Test_Name>-<YYYY-MM-DD_HH-mm-ss>.jpg
```

Times are the server's local time, spaces become `_`, and a second image in the same second gets `_2` instead of overwriting the first (`backend/lib/evidence.js`). The identity photo goes in `webcam/`. Example: `backend/screenshots/Dev_Khanna/Viva_Demo_Exam/screen/Dev_Khanna-Viva_Demo_Exam-2026-10-25_22-21-32.jpg`.

To run the app first, see `docs/OPERATIONS.md`. Seeded sign-in details are in `backend/data/seed-credentials.txt`; the admin's roll number is `admin`.

---

## Signing in: one screen for both roles

The sign-in screen asks for **Roll number** and **Password** and has a **Sign in** button (`app/src/features/auth/LoginPage.jsx`). The eye button beside the password shows or hides it. Below the button, a line reads `Server: <host> · Change`; **Change** opens the **Exam server** screen where you type a **Server address** such as `http://127.0.0.1:3000` and press **Save and retry**.

If the server does not answer, Athena shows **Can't reach the exam server** with two checks ("Is the backend running?" and "Are you on the same network?") and the buttons **Retry** and **Save and retry** (`app/src/features/auth/ServerPage.jsx`).

1. Type your roll number and password.
2. Press **Sign in**.

Test of done: an admin lands on the admin **Home** page with a greeting ("Good morning", "Good afternoon" or "Good evening"); a student lands on **Exams**.

---

## Part 1. The examiner

The admin sidebar has four entries: **Home**, **Exams**, **Students** and **Settings** (`app/src/features/shell/AdminShell.jsx`).

### Home shows what is running and what needs you

Home has three tiles, **Live now**, **Writing** and **Results ready**, followed by **Needs your attention** and **Recent** (`app/src/features/admin/home/AdminHomePage.jsx`). Attention rows link straight to the fix: **Publish results…** opens an exam's Results tab, and **Fix** opens a draft that has problems. **Recent** lists the latest submissions with their scores. With no activity at all you see "Nothing running yet." and a **Go to exams** button.

### Exams: create, duplicate and delete

The **Exams** page lists every exam with the columns Exam, Status, Questions, Window, Attempts, Results and Actions, plus the filters **All**, **Draft**, **Published**, **Live** and **Closed** and a search box (`app/src/features/admin/exams/ExamsListPage.jsx`, `examRows.js`).

To create an exam:

1. Press **New exam**.
2. In the **New exam** dialog, fill **Title**. **Code** is optional ("Short, shown on receipts. Leave empty to make one from the title."); **Description** is optional.
3. Under **Start from**, keep **Blank**, or pick **Copy of another exam** and choose it in **Exam to copy**.
4. Press **Create exam**.

Test of done: a "Created <title>" message appears and Athena opens the new exam's **Questions** tab (`app/src/features/admin/exams/NewExamDialog.jsx`).

To duplicate an exam, press the copy icon (tooltip **Duplicate**) in its row. This opens the same **New exam** dialog with the copy pre-selected, so you can rename it before pressing **Create exam**.

To delete an exam, press the bin icon (tooltip **Delete draft**). It only appears on drafts. The dialog is titled "Delete <title>?" and says "The draft and its questions are removed for good." Type the exact exam title into the box labelled `Type "<title>" to confirm`, then press **Delete draft**; the button stays disabled until the text matches (`app/src/features/admin/exams/DeleteExamDialog.jsx`). Test of done: a "Deleted <title>" message and the row is gone.

### The exam workspace has seven tabs

Opening an exam shows its title, a status chip (Draft, Published, Live or Closed) and at most one primary button: **Publish…** for a draft, **Publish results…** when results wait for you, or **Unpublish…** for a published exam nobody has started (`app/src/features/admin/examStatus.js`). The tabs are **Overview**, **Questions**, **Settings**, **Live**, **Review**, **Results** and **Analytics** (`app/src/features/admin/ExamWorkspace.jsx`).

**Overview** shows the tiles **Started**, **Submitted**, **In progress** and **Mean**, and a **Setup** list that marks each part as ready or needing a fix, with a button to jump to the tab that fixes it (`app/src/features/admin/overview/ExamOverviewPage.jsx`).

### Questions: a builder for seven types that saves as you type

The builder has three columns: an outline of questions on the left, the editor in the middle and a **Preview** on the right (`app/src/features/admin/questions/QuestionsPage.jsx`). The seven types, as named in the type picker, are listed below.

| Type in the picker | What the student does | What you set as the answer key |
|---|---|---|
| Single choice | Pick one option | "Options · pick the correct one" |
| Multiple select | Pick all that apply | "Options · tick every correct one", plus a **Scoring** choice |
| True / false | One statement | **Correct answer** |
| Short answer | Type a word or command | **Accepted answers** (one per line, up to 20), **Case-sensitive**, **Max characters** |
| Number | Type a number | **Answer**, **Tolerance ±**, optional **Unit** |
| Put in order | Arrange steps | "Items in the correct order (shuffled for students)", plus **Scoring** |
| Match pairs | Connect two columns | "Left · correct match" pairs and optional "Extra right-side options (distractors)" |

Source: `app/src/features/admin/questions/typeMeta.js`, `app/src/features/admin/questions/editors/*.jsx`.

To add and edit a question:

1. Press **Add question** (in the outline, or in the empty state).
2. In the **Add a question** dialog, pick a type.
3. In the editor, fill **Question** (use ``` fences for code), **Marks** (0.5 to 100 in steps of 0.5), the answer key for that type, and optionally **Topic** and **Explanation** ("Shown with results, never during the exam.").
4. Stop typing. Athena saves 800 ms later (`app/src/features/admin/questions/useAutosave.js`).

Test of done: the save state reads **Saved ✓**. While typing it reads **Unsaved changes…**, then **Saving…**; **Not saved** means the save failed (`SaveStatus.jsx`).

Other builder actions:

- **Reorder**: the up and down arrows beside each outline row move a question. Options, items and pairs inside a question have their own arrows and an X to remove them (`Outline.jsx`, `ItemList.jsx`). Drag-to-reorder is not built.
- **Change type**: pick another value in **Type**. Athena asks "Change to <type>?" and you confirm with **Change type**.
- **Delete**: press **Delete** in the editor, then **Delete question** in the "Delete Q<n>?" dialog. A "Question deleted" message confirms it.
- **Preview and Check answer**: answer the question in the **Preview** panel as a student would, then press **Check answer**. It scores the last saved version and shows, for example, `→ 2 / 2 marks ✓` (`Preview.jsx`). Use this to test your key.

After publishing, questions are locked: the page says "Published · questions are locked. Unpublish (no one has started) or duplicate the exam to make changes."

### Settings: window, attempts, texts, results and screenshot interval

The **Settings** tab has five cards (`app/src/features/admin/settings/SettingsSections.jsx`):

| Card | Fields |
|---|---|
| Timing & window | **Duration (minutes)** (1 to 600), **Window opens**, **Window closes** |
| Attempts & order | **Attempts allowed** (1 to 10), **Shuffle questions**, **Shuffle options** |
| Instructions & terms | **Instructions** (shown on the exam page and the rules step), **Platform terms** (students accept them before starting; changing them asks students to accept again) |
| Results | **Show results**: "Right after the student submits" or "When I publish"; **Pass mark (%)** |
| Screenshots | **Every (min seconds)** and **To (max seconds)**, each 10 to 3600 |

Source: `SettingsSections.jsx`, `settingsForm.js` (`SHOT_LIMITS`).

A late starter only gets the time left before the window closes. Duration, attempts and the screenshot range lock once a student has started ("Locked: a student has already started"). The maximum must be at least the minimum.

1. Change any field. A bar appears: "You have unsaved changes".
2. Press **Save settings** (or **Discard**).

Test of done: a "Settings saved" message. Leaving the tab with unsaved changes asks "Leave without saving?" with **Stay**. A **Danger zone** card below offers **Duplicate**, and **Unpublish** when allowed (`DangerZone.jsx`).

### Publish and unpublish

1. Press **Publish…** in the exam header.
2. The **Publish this exam?** dialog runs a checklist. Problems ("must be fixed") block publishing and link to the tab that fixes them; warnings ("to check (won't block)") do not.
3. Press **Publish**.

Test of done: "Published. Students can see it now." and the chip changes to Published, or Live once the window is open (`app/src/features/admin/exams/PublishDialog.jsx`).

To undo it, press **Unpublish…**, then **Unpublish** in **Unpublish this exam?**. This only works while nobody has started. Test of done: "Back to draft. Students no longer see it."

### Live: extend time or end an attempt

**Live** refreshes on its own and shows the tiles **Writing**, **Online**, **Offline** (no heartbeat for 30 s) and **Finished**, a **Writing only** switch, refresh and pause buttons, and a table with Student, Status, Started, Answered, Time left, Connection and Actions (`app/src/features/admin/live/LivePage.jsx`).

- **Extend…** on a row opens "Extend time for <name>". Enter **Add minutes**, a **Reason (required)** (presets: Power cut, Platform issue, Accessibility), and press **Extend <n> min**. Test of done: the row's Time left grows by that amount.
- **Extend everyone…** above the table opens "Extend everyone writing", which adds time to every attempt in progress.
- **End…** opens "End <name>'s exam?". Their answers so far are submitted and the exam ends on their screen at the next heartbeat (within 10 s). Give a reason and press **End exam**. Test of done: the student sees "Your exam was ended by the examiner".

Source: `app/src/features/admin/live/ActionDialog.jsx`.

### Review: answers, identity photo and the screenshot gallery

**Review** lists attempts on the left. Selecting one shows the identity photo (or "No identity photo"), the student's details, and three views: **Answers (n)**, **Screen (n)** and **Webcam (n)** (`app/src/features/admin/review/AttemptPanel.jsx`). Answers shows each answer next to the correct one. Screen and Webcam are galleries of the saved images; click one to enlarge it and use the left and right arrow keys to step through (`Lightbox.jsx`). An image that cannot load shows "Image unavailable".

Test of done: for a submitted attempt, Screen and Webcam both show a count above zero, and the same files exist under `backend/screenshots/<Candidate_Name>/<Test_Name>/`.

### Results: publish, release and export

**Results** lists each attempt with #, Student, Score, %, Time taken, Status, Outcome and Result (`app/src/features/admin/results/ResultsPage.jsx`).

1. If the exam's results wait for you ("When I publish"), press **Publish results…**.
2. The dialog "Publish results · <exam>" counts what will be published. Press **Publish <n> results**.

Test of done: "Results published", and students can open their results. A held result has a **Release** button in its row, which shows "Result released to <name>".

**Export CSV** asks where to save and then shows "Saved to <path>". Cells that start with `=`, `+`, `-` or `@` are escaped so a spreadsheet does not run them as formulas (checked by the smoke test, `backend/scripts/smoke-admin.js`).

### Analytics: how the class did

**Analytics** covers submitted attempts only ("Submitted attempts · n = <count>"). It shows the tiles **Submitted**, **Average**, **Median**, **Highest**, **Lowest** and **Time used**, a **Score distribution** histogram, **Accuracy by topic**, and a **Questions** table sorted "Hardest first" with Correct, Avg marks, Avg time and Common wrong. A warning icon marks a question where more top-half students chose a wrong option than the key, which usually means the key is wrong (`app/src/features/admin/analytics/`).

### Students: accounts, passwords and CSV import

The **Students** page lists accounts with Name, Status, Attempts, Last active and Actions (`app/src/features/admin/students/StudentsPage.jsx`).

To add one student:

1. Press **Add student**.
2. Fill **Roll number** and **Name**. Keep **Generate one** for the password, or choose **Set it myself** and type a **Password**.
3. Press **Add**.

Test of done: a "Password for <name>" dialog shows the password with a **Copy** button and the note "Shown once. Give it to the student; they sign in with it." (`PasswordDialog.jsx`).

**Reset password…** asks "Reset <name>'s password?"; the old password stops working, the student is signed out everywhere, and the new one is shown once. **Turn off…** asks "Turn off <name>?"; they are signed out and cannot sign in until you press **Turn on**.

To import many students from a file:

1. Make a `.csv` file whose first row is `rollNo,name`, one student per row. A password column is ignored; the server generates passwords (`csv.js`).
2. Press **Import from file**, then **Choose file…** in the **Import students** dialog.
3. Step **② Check** marks each row **Ready**, **Exists** or **Problem**. Fix the file and use **Choose another** if needed.
4. Press **Import <n> students**.
5. On **③ Done**, press **Copy as CSV** to copy the new passwords, then **Done**.

Test of done: the new names appear in the table. A file without the header is rejected with "The first row must name the columns: rollNo,name".

### Settings: theme and server address

The app-wide **Settings** page (both roles) has **Appearance** with **Theme** (**Light**, **Dark**, **Match macOS**), **Server** with the **Address** field and a **Test** or **Save and test** button ("Saving a different server signs you out."), **Exam images** with an **Upload status** line, and **About** with the version (`app/src/features/settings/`).

---

## Part 2. The student

The student sidebar has **Exams**, **Results**, **Analytics** and **Settings** (`app/src/features/shell/StudentShell.jsx`).

### Exams: find the exam and open it

**Exams** ("Exams you can take now and soon.") shows a card per exam with a status (Open, Upcoming, In progress, Submitted or Closed) and filters **All**, **Open**, **Upcoming** and **Done**. A card's button is **View exam**, **Resume** for an attempt in progress, or **See result** / **View receipt** afterwards (`app/src/features/student/examCardModel.js`). If an attempt is running, a banner at the top says so with the minutes left.

The exam page shows **Duration**, **Questions**, **Marks** and **Pass mark**, the **Window** with attempts left, and when **Results** appear (`app/src/features/student/ExamDetailPage.jsx`). Press **Get started** (or **Resume**).

### Before the exam: four steps

A stepper at the top reads **Setup**, **Rules**, **Photo**, **Begin** (`app/src/features/pretest/QuietLayout.jsx`).

**Step 1, system check.** "Let's check your setup" runs four rows (`app/src/features/pretest/checks.js`):

| Row | Passes when | Shown when it passes |
|---|---|---|
| Exam server | the server answers | Exam server: connected |
| Camera permission | macOS allows Athena to use the camera (Athena asks the first time) | Camera permission |
| Camera | the camera starts | Camera: working |
| Displays | one display is connected | Displays: one |

A second display is only a warning and does not block. A failed row shows a fix card: for the camera permission it is "Athena can't use your camera" with **Open System Settings** and the steps "Turn on Athena under Privacy & Security → Camera" and "Come back and click Run again" (`FixCard.jsx`). Press **Continue** when every row is done.

**Step 2, rules and consent.** "Before you begin" explains how the exam works (the clock starts at Begin and does not pause, answers save automatically even offline, you can change answers until you submit). Under **What Athena captures** you tick three boxes: "Photos from your camera, about once a minute", "Screenshots of the Athena window, about once a minute" and "Your answers and when you saved them" (`rulesModel.js`). Then read the **Platform terms** and tick "I have read and agree to the platform terms". This is where you consent to the screenshots and webcam photos. The button **I agree, continue →** stays disabled until all four boxes are ticked ("All four are needed") (`RulesPage.jsx`).

**Step 3, identity photo.** "Take your identity photo": face the camera alone, press **Take photo**, then **Use this photo →** or **Retake** (`PhotoPage.jsx`). Your examiner compares it with the photos taken during the exam. It is saved in your `webcam/` folder on the server.

**Step 4, begin.** "Ready when you are" lists what happens next (the clock starts, Athena goes fullscreen, camera and screen capture start) and the keys. Press **Begin** (`BeginPage.jsx`). If the exam can no longer be started, for example because its window has closed, the page says "You can't start this exam" with the reason.

Test of done: Athena switches to fullscreen and shows question 1 with the timer running.

### The exam room

The top bar shows the exam title, the timer ("<n> min left"), the save state and a camera dot ("Camera on" or "Camera off") (`app/src/features/exam/StatusBar.jsx`). Each question shows "Question <n> of <total>", its marks, a **Mark** star, **Clear answer**, and **Previous** / **Next**; the last question has **Review & submit** instead of Next (`Stage.jsx`).

| Key | Action |
|---|---|
| 1 to 9 | choose an option |
| N | next question |
| P | previous question |
| M | mark the question for review |
| Q | open the question palette |

Source: `app/src/features/pretest/BeginPage.jsx`, `app/src/features/exam/useShortcuts.js`.

The palette (**Q**) lists all questions with the filters **All**, **Unanswered** and **Marked** (`Palette.jsx`).

Every answer saves on its own. The save state shows **Saving…**, then **Saved**. If the connection drops, it shows "Offline · <n> kept" and a banner says "You're offline. Keep working: your answers are kept on this Mac. Don't quit Athena." The answers are sent when the connection returns (`ExamRoom.jsx`, `app/electron/queue.js`). The timer warns at "10 minutes left" and "5 minutes left", and a banner appears at "1 minute left: your answers are saved." At zero the room shows "Time's up." and submits for you.

If you try to quit during an exam, Athena warns "Your exam is still running" with **Keep working** and **Quit anyway**; the clock does not stop, and you can reopen Athena and resume until the deadline (`app/electron/exam.js`, `confirmQuit`).

### Review and submit

1. Press **Review & submit** on the last question.
2. "Review before you submit" shows "<answered> of <total> answered", then **Marked for review** and **Not answered** lists with a button to jump to each. Use **‹ Back to questions** to return.
3. Press **Submit exam**.
4. macOS shows "Submit your exam? <answered> of <total> answered." with **Submit** and **Keep working**. Press **Submit**.

Test of done: the done page appears. If the last answers have not reached the server yet, a banner explains it is waiting and offers **Keep trying** (`app/src/features/exam/ReviewPage.jsx`).

### Done page and receipt

The done page says "Your exam is submitted, <first name>" (or explains a time-up or examiner ending) and "Camera and screen capture are off." The **Receipt** card shows the receipt code, exam and attempt number, the submit time, and answers received (`app/src/features/exam/DonePage.jsx`).

Press **Save receipt (PDF)**, choose a place, and Athena saves `Athena receipt <code>.pdf` containing only the receipt (`app/electron/files.js`). Test of done: a "Receipt saved." message. If results are already visible, **View your results →** opens them; otherwise the page says "Results will appear when your examiner publishes them."

### Results and My analytics

**Results** lists your attempts with Exam, Submitted, Score, % and Outcome. A result that is not out yet shows "Not available yet"; a visible one has **View** (`app/src/features/results/ResultsListPage.jsx`). The result page shows the outcome word (for example "Passed"), the score and percent (for example "3 / 3 · 100 %", from the test run in `docs/TESTING.md`; source: `app/src/features/results/ResultPage.jsx`), the pass mark, and every question with your answer, the correct answer and the explanation (`ResultPage.jsx`, `QuestionReview.jsx`).

**Analytics** opens the page titled **My analytics**: tiles for **Exams**, **Average**, **Best** and **Time / question**, then **Score over time**, **Accuracy by topic**, **By question type** and **Time per question** (you against the class median). **Show as tables** switches the charts to tables (`MyAnalyticsPage.jsx`). Before your first result it says "Your analytics appear after your first result."

---

## Further reading

1. [README.md](../README.md) at the repository root: what Athena is and the quick start.
2. [docs/OPERATIONS.md](OPERATIONS.md): starting, stopping, reseeding and troubleshooting.
3. [docs/TESTING.md](TESTING.md): what has been verified and a ten-minute check.
4. [docs/ARCHITECTURE.md](ARCHITECTURE.md): how the app, the server and the screenshots fit together.

---

## Caveats

The rules step says images are taken "about once a minute". That is the default (45 to 60 s); an examiner who changes the interval in Settings changes the real schedule, and the student exam page's **What Athena captures** section shows the exact range from the server (`backend/lib/proctoring.js`, `summary`; `app/src/features/pretest/rulesModel.js`). Images are filed under the candidate's name, not the roll number, so two candidates with the same name share a folder. Labels in this guide were read from source on 2026-10-25 and will drift if the screens change.
