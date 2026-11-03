# Athena design system: calm editorial

Agreed 2026-10-26. Every screen, admin and candidate, follows this file. Tokens live in `src/styles/tokens.css`; shared components in `src/components/`. If a screen needs something this file doesn't cover, add it here first, then build it.

## Intent

Athena is used under exam stress and in front of a grader. It should feel like a well-set document: warm paper, charcoal ink, generous space, clear type hierarchy, and color only where it means something. Nothing moves unless something changed. The candidate side is quieter than the admin side; the exam room is the quietest screen of all.

## Color

Warm monochrome plus one accent and four muted semantic tints. Both themes are designed; the app follows macOS by default (`data-theme` from main's `nativeTheme`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#F7F6F3` | `#161615` | App background |
| `--surface` | `#FFFFFF` | `#1E1E1C` | Cards, inputs, tables, dialogs |
| `--surface-sunk` | `#F1EFEA` | `#121211` | Wells, hover rows, code, previews |
| `--sidebar` | `#F2F1ED` | `#1A1A19` | Sidebar and quiet panels |
| `--ink` | `#1F2225` | `#ECEAE5` | Primary text, primary button fill |
| `--ink-soft` | `#6B6A66` | `#A3A09A` | Secondary text, labels |
| `--ink-faint` | `#9A9893` | `#75726D` | Placeholders, disabled, meta |
| `--line` | `#E8E6E1` | `#2A2A28` | Every border and divider (1 px) |
| `--line-strong` | `#D9D6CF` | `#383733` | Input borders, emphasis dividers |
| `--accent` | `#2F5D8A` | `#8DB4DD` | Links, focus ring, selected tab, active nav marker. Nowhere else |
| `--accent-tint` | `#E8EFF6` | `#1C2733` | Selection, focused-input halo |
| `--ok` / `--ok-tint` | `#346538` / `#EDF3EC` | `#8CC59A` / `#1F2A20` | Saved, passed, live, correct |
| `--attention` / `--attention-tint` | `#956400` / `#FBF3DB` | `#E2B85C` / `#2E2716` | Warnings, time running low, pending |
| `--critical` / `--critical-tint` | `#9F2F2D` / `#FDEBEC` | `#F0A09A` / `#331C1C` | Errors, failed, destructive, last minute |
| `--info` / `--info-tint` | `#1F6C9F` / `#E1F3FE` | `#8EC3EB` / `#172634` | Neutral notices |

Rules: body text is never pure black or white. No gradients, no saturated fills on large areas, no colored page backgrounds. Status color appears as small tinted chips or a 2 px left rule, never as a whole card fill. Every text/background pair meets WCAG AA (4.5:1 body, 3:1 large and UI).

## Type

All fonts ship with macOS; nothing is downloaded (the CSP blocks web fonts and the app must work offline).

| Token | Stack | Use |
|---|---|---|
| `--font-ui` | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif` | Everything by default |
| `--font-serif` | `'Iowan Old Style', 'Charter', Georgia, serif` | Page titles, the exam question stem, result outcome word, large numbers in stat tiles |
| `--font-mono` | `ui-monospace, 'SF Mono', Menlo, monospace` | Exam and attempt codes, timers, roll numbers, keyboard keys, code in questions |

| Step | Size / line height / weight | Use |
|---|---|---|
| `--text-xs` | 11 / 16 / 600, uppercase, `letter-spacing: 0.06em` | Table headers, section labels, chips |
| `--text-sm` | 12 / 18 / 400 | Meta lines, captions, helper text |
| `--text-md` | 13 / 20 / 400 | Tables, dense admin UI, buttons |
| `--text-base` | 14 / 22 / 400 | Body text, form fields, candidate UI |
| `--text-lg` | 16 / 24 / 500 | Card titles, lead paragraphs |
| `--text-xl` | 20 / 28 / 600 sans | Section titles |
| `--text-question` | 22 / 32 / 400 serif | Exam question stem |
| `--text-2xl` | 30 / 36 / 500 serif, `letter-spacing: -0.02em` | Page titles (one per page) |
| `--text-display` | 44 / 48 / 500 serif, `letter-spacing: -0.03em` | Login wordmark, result outcome word, done-page headline |

Numbers in tables, timers and scores use `font-variant-numeric: tabular-nums`.

## Space, size and shape

4 px grid (`--space-1` 4 through `--space-16` 64). Page padding 40 px (32 px under 1200 px wide). Admin content max width 1200 px; candidate reading column 720 px; forms 480 px.

Radius: `--radius-sm` 4 px (chips are the exception, see below), `--radius-control` 6 px (buttons, inputs, menus), `--radius-card` 10 px (cards, dialogs, images). Pills (`999px`) only for chips and the status dot.

Borders: every card, table, input and divider is `1px solid var(--line)`. Shadows: none on cards. Only overlays (dialogs, menus, toasts) get `--shadow-overlay`, a very soft two-layer shadow. Cards may get `--shadow-hover` (a 4 percent shadow) when they are clickable and hovered.

Controls: height 32 px (dense admin) and 40 px (candidate and primary page actions). Icons: `lucide-react`, 16 px in controls, 20 px in empty states, stroke width 1.75 everywhere (set once in `base.css`).

## Components

**Buttons.** Primary: `--ink` fill, `--canvas` text, no border. Secondary: `--surface` fill, `1px --line-strong` border, `--ink` text. Ghost: no fill or border, `--ink-soft` text, hover `--surface-sunk`. Danger: secondary shape with `--critical` text; a confirmed destructive action uses a `--critical` fill. Hover darkens or lightens by one step; `:active` scales to 0.98. One primary button per view.

**Inputs.** 1 px `--line-strong` border, `--surface` fill, 6 px radius. Focus: border `--accent` plus a 3 px `--accent-tint` halo. Labels sit above in `--text-sm` 500 `--ink`; helper text below in `--ink-soft`; errors below in `--critical` with the border turned `--critical`.

**Cards.** `--surface`, 1 px `--line`, 10 px radius, 24 px padding (16 px in dense lists). No shadow. A card title is `--text-lg`; a section label above a group of cards is `--text-xs`.

**Tables.** No outer card shadow, 1 px `--line` frame, 10 px radius, no vertical rules. Header row: `--text-xs` `--ink-soft` on `--surface`. Rows 44 px, `--text-md`, divided by 1 px `--line`; hover `--surface-sunk`. Numbers right-aligned, tabular. The first column carries the primary label (name + muted roll number under it).

**Chips.** Pill, 20 px tall, `--text-xs` uppercase, semantic tint background with its text color (ok, attention, critical, info, neutral = `--surface-sunk` / `--ink-soft`). A 6 px dot may lead.

**Tabs.** Text tabs, `--text-md` 500, `--ink-soft`; active is `--ink` with a 2 px `--ink` underline sitting on the 1 px `--line` divider. Filter tabs (All / Draft / Live) use a segmented control: `--surface-sunk` track, active segment `--surface` with 1 px `--line`.

**Sidebar.** `--sidebar` background, 232 px. Wordmark at the top in serif. Nav items 32 px, 6 px radius, `--ink-soft`; hover `--surface-sunk`; active `--surface` fill, `--ink` text, 1 px `--line` border. Account block pinned to the bottom.

**Stat tiles.** Card with `--text-xs` label, value in serif at 30 px, optional `--text-sm` caption. Arrange in a row of 3 to 4.

**Empty states.** Centered in the content area: 40 px `--surface-sunk` rounded square holding a 20 px icon, a `--text-lg` title, one `--ink-soft` sentence, and at most one button.

**Dialogs.** `--surface`, 10 px radius, `--shadow-overlay`, 24 px padding, title `--text-xl`, footer buttons right-aligned (secondary then primary). Scrim `rgb(0 0 0 / 0.32)`.

**Keyboard keys.** `<kbd>`: mono 11 px, 1 px `--line`, 4 px radius, `--surface-sunk`.

## Layout patterns

**Page header** (every admin and candidate shell page): optional breadcrumb in `--text-sm` `--ink-soft`; title in `--text-2xl` serif; one-line description in `--ink-soft`; primary action right-aligned on the title line. 32 px below the header before content.

**Admin.** Sidebar plus content. Home: greeting title, a row of stat tiles, then two columns: "Needs your attention" and "Recent activity". Exams: segmented filter + search, then a table. Exam workspace: header with serif title, mono code and meta, status chip, primary action; underline tabs; tab content below. Builder keeps three columns (outline, editor card, preview in a `--surface-sunk` panel). Review: attempt list left, detail right, screenshots as a 4:3 grid with 8 px radius thumbnails and time captions.

**Candidate.** Shell pages use a 960 px column. Exams: grouped sections ("Open now", "Upcoming", "Finished"), each exam a row card with title, mono code, duration and window, a status chip and one action. Pre-test: quiet layout with no sidebar, a slim stepper, a centered 640 px column, no boxed card around the whole step. Results: list of row cards; the result page leads with the outcome word in display serif and the score in mono.

**Exam room** (the quietest screen). Top bar 48 px: exam title left, timer center in mono (attention tint under 5 min, critical under 1 min), save state right. A slim left rail of question numbers (answered = filled `--ink` dot, marked = outlined accent ring, current = `--ink` text). Stage column 720 px: "Question 3 of 12 · 2 marks" in `--text-sm` `--ink-soft`; the stem in `--text-question` serif; options as full-width rows (1 px `--line`, 10 px radius, 52 px min height, letter in mono at left, key hint at right); selected = 1.5 px `--ink` border, `--surface-sunk` fill, check icon. Bottom bar: Previous (ghost), Mark for review (ghost toggle), Next (primary). No color besides the timer states and the save state.

## Motion

Quiet and fast. Content mounts with `opacity 0 → 1` and `translateY(4px) → 0` over 180 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`; list items may stagger by 30 ms up to 8 items. Hover and press transitions 120 ms. Dialogs fade and scale from 0.98. No looping animation except the saving spinner. `prefers-reduced-motion: reduce` turns all of it off. The exam room uses no entry motion at all.

## Accessibility

Visible focus ring on every interactive element (`2px --accent`, 2 px offset). Hit targets at least 32 px. Status is never color alone: chips carry a word, the rail carries a shape. Every icon-only button has an `aria-label`. Keep existing ARIA roles and keyboard shortcuts working.

## Don'ts

No Inter or Roboto, no emoji, no gradients, no glassmorphism, no heavy shadows, no pill-shaped buttons or cards, no colored section backgrounds, no new npm dependencies, no copy like "Elevate" or "Seamless". Don't change data flow, API calls, routes or behaviour: this is a visual and layout rework.
