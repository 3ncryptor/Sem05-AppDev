# ChatApp frontend build plan

The single planning document for the ChatApp frontend: rules, architecture, screens (with
ASCII mockups), the debug Inspector, the Live Wire visualiser, and the build order.
The visual language lives in [`design.md`](./design.md) ("soft slab", sampled from
`ChatApp.08.jpeg`).

Status: **draft for review**. No code until this is agreed.
Backend: `../backend` (NestJS) · API contract: `../swagger.json` · Branch: `chatApp-inclass`

---

## 0. Decisions so far

| # | Decision |
|---|---|
| D1 | Expo Router, **JavaScript only**, Expo SDK **58.0.23** (the SDK Expo Go supports today). Must run in **Expo Go on the phone**. |
| D2 | App logic uses `useState` + `useEffect` and **custom hooks**, which may also use plain JS (modules, closures, emitters, timers). |
| D3 | Rule relaxed for visuals: animation and visual code may use Reanimated, Gesture Handler, `useRef` and other React/RN hooks. |
| D4 | Shared state uses a hand-written store module plus a `useSession` hook. No `useContext` or `useReducer`. |
| D5 | Design follows the reference closely: notch header slabs, ring buttons, floating pill bars, the face-tile grid and the apricot→rose→orchid gradient. Features the backend can't support (calls, voice, reactions, presence) are left out. |
| D6 | Avatars are illustrated faces from **DiceBear**, styles **lorelei, notionists, open-peeps**, generated from the username so everyone sees the same face. |
| D7 | An in-app **Inspector** (logs, network, Live Wire, tools) opens from a floating orb, a shake, or Profile. |
| D8 | Server logs come from a new **local-only `GET /debug/logs`** route. On servers without it, the app degrades gracefully: app logs keep working and a calm notice explains why server logs are missing. |
| D9 | Everything logs to the console (Metro) **and** to the in-app log store. |
| D10 | Clean code: small files, components, a header comment on every file, JSDoc on every export. |
| D11 | **No emojis anywhere**: UI text, icons, logs or illustrations. All icons are **SVG** line icons from `lucide-react-native` (via `react-native-svg`). |
| D12 | App name **`huddle.`**, lowercase with a full stop. The wordmark is Inter 600, and the full stop is an SVG gradient dot (the screen's one accent). See `design.md` §4.1. |
| D13 | **Jest unit tests** (`jest-expo`) for all pure logic, written with each build step, not at the end. |
| D14 | **Dark mode from the start**: light and dark tokens in F1, every component themed from F2. Appearance follows the phone (light / dark / auto in Profile). |
| D15 | **Debug orb on by default** (hideable in Profile). |

---

## 1. Ground rules

| Rule | In practice |
|---|---|
| Small files | Screens about 120 lines or less, components about 100 or less. Logic lives in hooks and `src/` modules. |
| Comments | Every file opens with a comment saying what it does and why. JSDoc on exported functions, hooks and components (props, returns). Inline comments only for non-obvious reasons. |
| Hooks policy | **Data and logic:** `useState`, `useEffect`, custom hooks. **Visual and animation:** Reanimated (`useSharedValue`, `useAnimatedStyle`, ...), gestures, `useRef`, `useWindowDimensions`, `useColorScheme`. **Never:** `useContext`, `useReducer` (the store replaces them). ESLint enforces the "never" list. |
| Route params | `useLocalSearchParams()` from Expo Router. Navigate with the `router` object. |
| Expo Go only | Install with `npx expo install` (SDK-matched). No native modules outside Expo Go. |
| Both servers | Must work on local Docker **and** the class server. Local-only extras (receipts, server logs) are optional enhancements, never requirements. |
| No magic numbers | Intervals, sizes and durations live in `constants/`. |
| Icons | SVG only (`lucide-react-native`, 1.5 px stroke). **No emojis** in the UI, copy, logs or seed data. Ticks, badges and status dots are SVG or plain views. |
| Errors | All API failures become `ApiError {status, message, requestId}`. The UI shows a friendly message; the detail goes to the logs. Nothing fails silently. |

---

## 2. What the backend gives us (and doesn't)

| Fact | What the frontend does |
|---|---|
| Auth is the raw text `Authorization: Basic user:pass` (**not base64**) | `client.js` builds it by hand. Never use `btoa` or helpers. |
| No sign-up route; unknown names auto-register | Login calls `GET /user/profile`. The UI warns that a new name creates an account. |
| DMs have `name: null` | Title = the other participant, from `GET /user`. |
| No push or websockets | Poll: chats every 5 s, open chat every 3 s, Inspector server logs every 2 s (only while open). |
| Messages come in pages of 20, oldest first, with `nextCursor` | Inverted list. `loadOlder()` on scroll up. |
| Images: `POST /file` then `POST /message {file_id}` | Two-step send with progress state. |
| No last-message preview, chat list sorted by creation time | No previews (N requests per poll, and it would fake read receipts on local). Cards show members and type. |
| Read receipts only on local | Ticks come from `status`; on the class server they stay at ✓. |
| No avatar, presence, reactions, voice or calls | Avatars generated on the device. "● live" = *our connection* is healthy. The rest is out of scope. |

---

## 3. Architecture

```
┌────────────── app/ (routes: thin screens) ──────────────┐
│ compose components + hooks; no fetch, no business logic │
└──────────────┬──────────────────────────┬───────────────┘
               │ hooks                    │ components
┌──────────────▼──────────┐   ┌───────────▼──────────────┐
│ src/hooks (useState,    │   │ src/components (ui,      │
│ useEffect, plain JS)    │   │ chat, people, inspector) │
└──────┬─────────┬────────┘   └──────────────────────────┘
       │         │
┌──────▼───┐ ┌───▼──────────────┐  ┌──────────────────────┐
│ src/api  │ │ src/store        │  │ src/debug            │
│ client + │ │ session, settings│  │ logStore, network-   │
│ endpoints│ │ (pub/sub modules)│  │ Store, flow events   │
└──────┬───┘ └──────────────────┘  └──────────▲───────────┘
       │ every request/response/error emits ─────┘
       ▼
   fetch → backend (Docker LAN IP or class server)
```

### 3.1 Store pattern (instead of Context)

```js
// src/store/createStore.js: a tiny publish/subscribe store in plain JS
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (next) => { state = { ...state, ...next }; listeners.forEach((l) => l(state)); },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
// src/hooks/useStore.js: copies a store into useState and stays subscribed via useEffect
```

Stores: `sessionStore` (server, user, password, own profile), `settingsStore` (avatar style,
theme, orb visible, poll intervals), `logStore` and `networkStore` (Inspector). `sessionStore`
and `settingsStore` persist with `expo-secure-store`.

### 3.2 Server selection

| Option | URL | When |
|---|---|---|
| **This Mac** (default) | from `Constants.expoConfig.hostUri` (`192.168.x.y:8081` → `http://192.168.x.y:3000`) | At home, Docker, same Wi-Fi |
| **Class server** | typed in (e.g. `http://10.7.1.51:3000`), remembered | In class |

**Test connection** calls `GET /user` with no auth: a **401 means reachable**. On first use,
macOS may ask to allow port 3000 through the firewall (covered in the README).

### 3.3 Request tagging (for the Inspector)

Every request carries two extra headers. They are harmless on the class server:
- `X-Request-Id`: a short random id. The local backend logs it, which links app and server lines.
- `X-Client-Poll: 1` on polling requests, so both sides can label and hide polls.

---

## 4. Avatars

- **DiceBear** 9.4.2 (`@dicebear/core` + only the three style packages `@dicebear/lorelei`,
  `@dicebear/notionists`, `@dicebear/open-peeps`; MIT code) renders SVG on the device via
  `react-native-svg`. No network calls. All four are pinned to the same exact version. The full
  `@dicebear/collection` is avoided because Metro does not tree-shake and would bundle ~30 styles.
- **Seed = username**, so `aarav` has the same face on every phone, on both servers, with no
  storage needed (the backend has no avatar field).
- **Styles:** `lorelei` (default), `notionists`, `open-peeps`, chosen in Profile. The choice
  changes how *you* see everyone and is stored on the device.
- **Background tint:** a soft pastel picked from the name hash, drawn from tints of the
  gradient palette, so faces sit inside the design.
- **Licences:** checked at install: all three art styles are **CC0 1.0** (lorelei by Lisa
  Wischofsky, notionists by Zoish, open-peeps by Pablo Stanley), so no credit is required.
- **Caching:** the SVG string is generated once per `(style, name)` and kept in a module-level
  `Map`, so lists scroll smoothly.

```
 lorelei        notionists      open-peeps
 ╭─────╮        ╭─────╮         ╭─────╮
 │ ◕‿◕ │        │ •ᴗ• │         │ ^‿^ │     (illustrated faces on pastel circles)
 ╰─────╯        ╰─────╯         ╰─────╯
```

---

## 5. Screens (ASCII mockups)

App name: **`huddle.`**, lowercase with a full stop. In the mockups `huddle.` marks the wordmark: Inter 600 text plus a gradient SVG dot (D12).

**Mockup legend:** text in brackets or parentheses such as `(<-)`, `(msg)`, `[lock]`, and symbols like ✓ ➤ ⌕,
are **placeholders for Lucide SVG icons**. Faces like `◕‿◕` stand for DiceBear SVG avatars. The app
itself contains no emojis.

### 5.1 Login

```
╭──────────────────────────────────────────╮
│                                          │  surface #E3E9E7
│                                          │
│                huddle.                   │  wordmark 40: Inter 600, gradient dot
│        chat with your class.             │  meta, textSecondary
│                                          │
│   ◉ ◉ ◉ ◉ ◉   (seeded faces drift by)    │  slow floating avatars
│                                          │
│  server                                  │
│  ╭──────────────────┬──────────────────╮ │  segmented pill, gradient thumb
│  │▓▓ this mac ▓▓▓▓▓▓│   class server   │ │  springs between options
│  ╰──────────────────┴──────────────────╯ │
│  http://192.168.1.5:3000   ● reachable   │  test result, live dot
│                                          │
│  ╭──────────────────────────────────────╮│
│  │ [user]  username                     ││  pill inputs (surfaceRaised)
│  ╰──────────────────────────────────────╯│
│  ╭──────────────────────────────────────╮│
│  │ [lock]  password                (eye) ││
│  ╰──────────────────────────────────────╯│
│  new name? an account is created for you │  caption
│                                          │
│  ╭──────────────────────────────────────╮│
│  │              log in   ➤              ││  ink pill; gradient sweep on press
│  ╰──────────────────────────────────────╯│  morphs to ✓ on success
╰──────────────────────────────────────────╯
```

- Wrong password: the field shakes, an error haptic plays, and the server's message appears under it.
- Class server selected: the URL field appears with **test** (ring button) beside it.

### 5.2 Chats (home tab), the "friendlyhours" screen

```
╭──────────────────────────────────────────╮
│  (≡)            huddle.            ²(◎)  │  wordmark 26; right = Inspector, badge = errors
│                                          │
│  groups                                  │  meta label
│ ╭──────────────────────────────────────╮ │  horizontal swipeable cards
│ │ ╭──────────────────────────────────╮ │ │
│ │ │  ◕‿◕   •ᴗ•                       │ │ │  collage of member faces on a soft gradient wash
│ │ │     ^‿^    ◕‿◕                   │ │ │
│ │ │ study group                      │ │ │  display text, lowercase
│ │ │ (aarav)(diya)(kabir)(meera)      │ │ │  frosted chips: members
│ │ │ ╭────────────────────────────╮   │ │ │
│ │ │ │ (ppl)  (ⓘ)  (     open ➤    ) │   │ │ │  action bar: members, info, open (gradient)
│ │ │ ╰────────────────────────────╯   │ │ │
│ │ ╰──────────────────────────────────╯ │ │
│ │ ◉◉◉ +1                 study group   │ │  dark footer slab
│ │                        ppl 4 members   │ │
│ ╰──────────────────────────────────────╯ │
│               ● ○ ○                      │  page dots
│  direct                                  │
│ ╭──────────────────────────────────────╮ │
│ │ ◕‿◕  diya                       dm › │ │  light rows (card), avatar 44
│ ╰──────────────────────────────────────╯ │
│ ╭──────────────────────────────────────╮ │
│ │ •ᴗ•  kabir                      dm › │ │
│ ╰──────────────────────────────────────╯ │
│     ╭──────────────────────────────╮     │
│     │ (▓msg▓) (ppl)  (＋)  (me)       │     │  floating tab bar: chats·people·new·profile
│     ╰──────────────────────────────╯     │
╰──────────────────────────────────────────╯
```

- Pull to refresh (a custom gradient spinner). Rows fade up one after another on first load.
- Empty state: an illustration with "no chats yet". The button **find people** goes to the People tab.
- Connection banner drops under the top bar when polling fails: "reconnecting…" then "back online ✓".

### 5.3 Chat room (group), the "peak seekers" screen

```
╭──────────────────────────────────────────╮
│ ╭──────────────────────────────────────╮ │  header slab ("notch"), radius 36
│ │ (←)        study group          (ⓘ) │ │
│ │                                      │ │
│ │ ◉◉◉ +1                    ● live     │ │  live = polling healthy
│ │                           ppl 4 people │ │
│ ╰──────╮                      ╭────────╯ │
│                                          │
│  ◕‿◕ ╭───────────────────────────╮       │  incoming (card), sender name above in groups
│      │ welcome to the study group│       │
│      ╰╴──────────────────────────╯       │
│       meera · 7:55 pm                    │
│                                          │
│  •ᴗ• ╭───────────────────────────╮       │  image card bubble
│      │ here is the whiteboard    │       │
│      │ ╭───────────────────────╮ │       │
│      │ │        [image]        │ │       │  tap = zoom to viewer
│      │ ╰───────────────────────╯ │       │
│      ╰╴──────────────────────────╯       │
│       kabir · 7:58 pm                    │
│                                          │
│            ╭──────────────────────────╮  │  outgoing (ink pill)
│            │ quiz is on friday, right? │  │
│            ╰─────────────────────────╴╯  │
│                           8:01 pm ✓✓     │  ticks: ✓ sent, ✓✓ delivered, gradient ✓✓ read
│                 ╭──────────╮             │
│                 │ ↓ 2 new  │             │  pill appears when scrolled up
│                 ╰──────────╯             │
│ ╭──────────────────────────────╮ ╭────╮  │
│ │ ＋  type your message...      │ │ ➤  │  │  composer pill + ink send (gradient when ready)
│ ╰──────────────────────────────╯ ╰────╯  │
╰──────────────────────────────────────────╯
```

**DM variant:** the header shows a single large avatar with the name, and "● live" or "dm"
on the right. No sender names on bubbles.

**Message states:**
- *sending*: 70% opacity, small clock
- *sent*: ✓ pops in
- *failed*: bubble shakes and turns red, "tap to retry"
- *uploading image*: shimmer over a blurred thumbnail

**Long-press** a bubble: it lifts on a blurred backdrop with a menu (copy · details). "Details"
shows the time, id and receipts per member.

### 5.4 People (directory), the "room chat" grid

```
╭──────────────────────────────────────────╮
│ ╭──────────────────────────────────────╮ │  header slab
│ │ (⌕)            people          (＋ppl) │ │  search · new group
│ │ ╭──────────────────────────────────╮ │ │
│ │ │ ⌕  search people                 │ │ │  search pill (expands on tap)
│ │ ╰──────────────────────────────────╯ │ │
│ │ ╭───────────────╮ ╭───────────────╮  │ │  face tiles, 2 columns, radius 32
│ │ │(msg)          │ │(msg)          │  │ │  ring button top-left = message
│ │ │     ◕‿◕       │ │     •ᴗ•       │  │ │  big illustrated face on pastel tint
│ │ │  aarav        │ │  diya         │  │ │  name bottom-left, white on frosted strip
│ │ ╰───────────────╯ ╰───────────────╯  │ │
│ │ ╭───────────────╮ ╭───────────────╮  │ │
│ │ │(msg)          │ │(msg)          │  │ │
│ │ │     ^‿^       │ │     ◕‿◕       │  │ │
│ │ │  kabir        │ │  meera  (you) │  │ │
│ │ ╰───────────────╯ ╰───────────────╯  │ │
│ ╰──────────────────────────────────────╯ │
│     ╭──────────────────────────────╮     │
│     │ (msg)  (▓ppl▓)  (＋)  (me)       │     │  tab bar, people active
│     ╰──────────────────────────────╯     │
╰──────────────────────────────────────────╯
```

Tapping a tile opens the existing DM or creates one; the tile scales up into the chat
(shared-element feel). Your own tile is marked "(you)" and isn't tappable.

### 5.5 New group (selection mode)

```
╭──────────────────────────────────────────╮
│ ╭──────────────────────────────────────╮ │
│ │ (✕)          new group               │ │  compact slab
│ ╰──────────────────────────────────────╯ │
│  ╭──────────────────────────────────────╮│
│  │ ✎  group name                        ││  pill input
│  ╰──────────────────────────────────────╯│
│ ╭───────────────╮ ╭───────────────╮      │
│ │(✓)▓gradient▓  │ │( )            │      │  selected tile: gradient ring + ✓ pops
│ │     ◕‿◕       │ │     •ᴗ•       │      │  medium haptic on toggle
│ │  aarav        │ │  diya         │      │
│ ╰───────────────╯ ╰───────────────╯      │
│ ╭───────────────╮ ╭───────────────╮      │
│ │(✓)            │ │( )            │      │
│ │     ^‿^       │ │     ◕‿◕       │      │
│ │  kabir        │ │  rohan        │      │
│ ╰───────────────╯ ╰───────────────╯      │
│   ╭──────────────────────────────────╮   │
│   │ ◉◉ 2 selected     (▓ create ➤ ▓) │   │  control bar (like the call bar): stack + gradient commit
│   ╰──────────────────────────────────╯   │
╰──────────────────────────────────────────╯
```

**create** is disabled until there's a name and at least 2 people. On success, the bar morphs into ✓ and the app navigates into the new group.

### 5.6 Image viewer

```
╭──────────────────────────────────────────╮
│ (✕)                               (⤓?)   │  black background, ring buttons
│                                          │
│              [ full image ]              │  pinch to zoom, swipe down to close
│                                          │
│   kabir · 7:58 pm                        │
│   "here is the whiteboard"               │  caption
╰──────────────────────────────────────────╯
```

### 5.7 Profile

```
╭──────────────────────────────────────────╮
│ ╭──────────────────────────────────────╮ │  tall slab
│ │                 ◕‿◕                  │ │  avatar 96, springs in
│ │                aarav                 │ │  title
│ │        id 6af2…7d  (⧉ copy)          │ │  meta, mono-style id
│ ╰──────╮                      ╭────────╯ │
│  your look                               │
│  ╭──────╮ ╭──────╮ ╭──────╮              │
│  │▓◕‿◕▓ │ │ •ᴗ•  │ │ ^‿^  │              │  avatar style picker, gradient ring on selected
│  │lorelei│ │notion│ │peeps │              │
│  ╰──────╯ ╰──────╯ ╰──────╯              │
│  appearance      (light | dark | auto)   │  segmented pill
│  server          192.168.1.5:3000  ● ok  │
│  developer                               │
│   inspector                          ›   │
│   show debug orb                    [●]  │  toggle
│   shake to open inspector           [●]  │
│  ╭──────────────────────────────────────╮│
│  │               log out                ││  ink pill, confirm sheet
│  ╰──────────────────────────────────────╯│
╰──────────────────────────────────────────╯
```

### 5.8 Debug orb (floating, every screen)

```
                                     ╭───╮
                                     │ ◎ │²   gradient orb 52, draggable, snaps to the edge
                                     ╰───╯    green pulse = request ok, pink flash = error
```

---

## 6. Inspector (in-app debug console)

Opens as a bottom sheet (dark slab, radius 44 at the top) from the **orb**, a **shake** or
**Profile › inspector**.

### 6.1 Logs tab

```
╭──────────────────────────────────────────╮
│ ───                                      │  grab handle
│  inspector                        (✕)    │
│ ╭────────┬─────────┬────────┬─────────╮  │
│ │▓ logs ▓│ network │  flow  │  tools  │  │  segmented pill
│ ╰────────┴─────────┴────────┴─────────╯  │
│ (app ✓)(server ✓)  (info)(warn)(error)   │  source + level chips
│ (api)(poll)(nav)(auth)(receipts)(bot)    │  category chips
│ hide polls [●]  hide bot [●]  (‖)(⌫)(⇪)  │  toggles · pause · clear · export
│ ╭──────────────────────────────────────╮ │
│ │ ⌕ search                             │ │
│ ╰──────────────────────────────────────╯ │
│ 12:04:31 APP  api   → POST /message  #a1 │  monospace rows, colour by level
│ 12:04:31 SRV  chat  aarav ➔ diya "hi" #a1 │  same #id = same request
│ 12:04:31 APP  api   ← 201 84ms       #a1 │
│ 12:04:33 SRV  rcpt  2 read by diya       │
│ 12:04:35 APP  nav   chats → chat/6af2…   │
│ (!) server logs unavailable here         │  calm notice when /debug/logs is missing
╰──────────────────────────────────────────╯
```

### 6.2 Network tab

```
│ POST /message            201   84ms 0.4kB │  tap a row to expand
│ ├ request   {conversation_id, content}    │
│ ├ response  {id, type: TEXT, status…}     │
│ └ server    [Chat] aarav ➔ diya "hi"       │  joined by X-Request-Id
│ GET  /conversation  poll 200   12ms 1.1kB │
│ POST /file               413  120ms 14MB  │  red; reason shown
```

### 6.3 Flow tab, "Live Wire"

```
╭──────────────────────────────────────────╮
│   ╭─────╮        ╭─────────╮     ╭─────╮ │
│   │ (▯) │ ─•──•─►│ server  │ ──► │ db  │ │  dots = live requests (gradient = send,
│   │phone│◄──•────│ guard → │ ◄── │mongo│ │   grey = poll); replies green/pink + "84ms"
│   ╰─────╯        │ ctrl →  │     ╰─────╯ │
│                  │ service │             │
│                  ╰────▲────╯             │
│                       │ (bot) factbot    │  ripples for bot, receipts, cleanup
│  ( slow-mo ○ )   ( explain ● )           │
╰──────────────────────────────────────────╯
```

- **Heartbeat:** polls show as small regular grey pulses, which makes "no websockets, so we poll" visible.
- **Slow-mo** runs the animation at quarter speed, for presentations.
- **Explain mode:** tap a dot to freeze it and step through that real request:
  1. App builds `Authorization: Basic aarav:…`
  2. HTTP to `192.168.1.5:3000`
  3. AuthGuard finds `aarav`
  4. `MessageController` → `MessageService` → Prisma → MongoDB
  5. `201` comes back
  6. The bubble's clock flips to ✓

  Each step lights up its node and shows the real payload.
- Server-side ripples appear only when `/debug/logs` is available. App-side dots always work.

### 6.4 Tools tab

- Pause polling, change the chat and room poll intervals.
- **Simulate offline:** forces fetch failures, to demo the connection banner.
- Current server, user, app and SDK versions, server-logs status ("available" or "not on this server").
- Copy debug report: last 100 logs + versions + server, for bug reports.

### 6.5 Server-logs availability (graceful handling)

```
 inspector opens ─► GET /debug/logs?after=0
        ├─ 200  → state AVAILABLE   → poll every 2 s while open
        ├─ 404  → state UNSUPPORTED → "this server doesn't share logs" (class server)
        ├─ 401  → state UNSUPPORTED → same notice (session issue logged)
        └─ network/timeout → state UNREACHABLE → "can't reach server", retry button
 Re-checked only on: server change, "check again", or reopening the Inspector.
 App logs, the network tab and Live Wire app-side dots never depend on this.
```

### 6.6 Backend work for the Inspector (local only, step B1)

| Piece | Detail |
|---|---|
| Log buffer | A custom Nest `LoggerService` (extends `ConsoleLogger`) prints as today **and** keeps the last 500 entries in memory: `{seq, time, level, context, message, requestId, isPoll}`. Every existing log line is captured without other code changes. |
| Route | `GET /debug/logs?after=<seq>&limit=<n>` returns `{ entries, latestSeq }`. Hidden from Swagger (`@ApiExcludeController`), so the spec stays identical to `swagger.json`. Enabled by `DEBUG_LOGS=true`; when false the route returns 404, which the app already handles. |
| Headers | The request logger reads `X-Request-Id` and `X-Client-Poll` and includes them in its line and the buffer. |
| Noise | Requests to `/debug/logs` are not logged and not buffered. |
| Openness | Like the rest of this backend, anyone who can log in can read the logs. That's acceptable locally and matches the open-by-design rule. |

---

## 7. Folder structure

File extensions (as taught in class): anything that renders JSX (routes in `app/` and every
component) is **`.jsx`**. Plain logic with no JSX (api, store, debug, hooks, utils, constants)
and the Jest tests are **`.js`**. Imports leave the extension off, so Metro finds either.

```
frontend/
  app/                         routes only (.jsx: they render JSX)
    _layout.jsx                fonts, theme, Stack + Stack.Protected, orb overlay, shake listener
    index.jsx                  <Redirect>
    login.jsx
    (tabs)/_layout.jsx         custom FloatingTabBar
    (tabs)/chats.jsx · people.jsx · profile.jsx
    chat/[id].jsx
    new-group.jsx              modal
    image/[id].jsx             modal
    playground.jsx             dev-only gallery of every component (viva + design QA)
  src/
    api/          client.js · users.js · conversations.js · messages.js · files.js · debugLogs.js
    store/        createStore.js · sessionStore.js · settingsStore.js · persist.js
    debug/        logStore.js · networkStore.js · serverLogStore.js · inspectorStore.js · flowEvents.js ·
                  toolsStore.js · filterLogs.js · serverLogsState.js · shakeDetector.js · debugReport.js
    hooks/        useStore.js · useSession.js · usePolling.js · useConversations.js ·
                  useUsers.js · useMessages.js · useSendMessage.js · useServerLogs.js · useShake.js
    components/   every component file is .jsx
      ui/         RingButton · Slab · FloatingBar · PillInput · PrimaryButton · GradientFill · Chip ·
                  Badge · PressableScale · SegmentedPill · Sheet · Icon · Wordmark ·
                  ConnectionBanner · EmptyState · Skeleton
      avatar/     Avatar · AvatarStack (.jsx) · avatarSvg.js (DiceBear + cache)
      chat/       MessageBubble · ImageBubble · Ticks · Composer · MessageList · NewMessagesPill
      chats/      GroupCard · GroupCarousel · DmRow
      people/     FaceTile · FaceGrid
      inspector/  InspectorLayer (orb + shake + sheet, mounted once in _layout) · Inspector ·
                  LogRow · LogFilters · NetworkRow · LiveWire · FlowDot · FlowNode · FlowRipple ·
                  ExplainSteps · FlowPanel · ToolsPanel · DebugOrb
    utils/        logger.js · format.js · conversationTitle.js · serverUrl.js · requestId.js · hash.js
    constants/    theme.js (design.md tokens) · motion.js (durations, springs) · config.js
```

---

## 8. Key flows

- **Login:** validate → `GET /user/profile` → 200 saves the session and the guard routes to chats; 401 shakes and shows the server message; a network error shows "can't reach <url>".
- **Polling:** `usePolling(fn, ms, {tag:'poll'})` runs `setInterval` inside `useEffect`, skips overlapping calls, pauses while the app is in the background (`AppState`), and stops on unmount.
- **Messages:** newest-first array for the inverted list. Polls merge by `id`. `loadOlder()` uses the cursor. Optimistic send uses a temporary id that is replaced on 201 or marked failed with retry.
- **Images:** `expo-image-picker` (base64, quality about 0.5) → `POST /file` → `POST /message {file_id, content}`. Displayed from `GET /file/{id}` as a `data:` URI, with an in-memory cache keyed by file id.
- **Ticks** (own messages): ✓ sent · ✓✓ delivered to all · gradient ✓✓ read by all.
- **Logout:** clear stores and SecureStore, haptic, then route to login.

---

## 9. Logging

`logger.js` writes every entry to the **console** (the Metro terminal) **and** to `logStore` (the Inspector):

```
[API]   → POST /message #a1f3 {conversation_id:"6af2…", content:"hi"}
[API]   ← 201 POST /message #a1f3 84ms
[API]   ← 401 GET /user/profile #b7c2 12ms (error) "Invalid password for user 'aarav'"
[POLL]  conversations: 4 (no change)
[NAV]   chats → chat/6af2…61
[STATE] session: logged in as aarav @ http://192.168.1.5:3000
```

Base64 bodies are shortened to `<N chars>`. Passwords and the `Authorization` header are
**never** logged.

---

## 10. Dependencies (all work in Expo Go SDK 58)

| Package | Why |
|---|---|
| `expo-router` | routing |
| `react-native-reanimated`, `react-native-gesture-handler` | animations, gestures, the draggable orb, the sheet |
| `expo-linear-gradient` | the accent gradient |
| `expo-blur` | frosted chips, sheet backdrop |
| `expo-haptics` | haptic feedback |
| `expo-image` | image fade-in, placeholders |
| `react-native-svg` | avatars, Live Wire, illustrations |
| `@dicebear/core`, `@dicebear/lorelei`, `@dicebear/notionists`, `@dicebear/open-peeps` (9.4.2, exact) | face avatars (pure JS) |
| `expo-font`, `@expo-google-fonts/inter` | Inter |
| `lucide-react-native` | SVG line icons (draws with `react-native-svg`; no icon fonts, no emojis) |
| `expo-secure-store` | session and settings |
| `expo-image-picker` | pick photos |
| `expo-sensors` | shake to open the Inspector |
| `expo-clipboard` | copy message, copy id |
| `expo-constants` | LAN IP for the default server |
| `react-native-safe-area-context` | safe areas |

Dev: `eslint-config-expo`, `prettier`, `jest-expo` (58.x, matches the SDK), `jest`.

---

## 11. Build order (one small commit per step on `chatApp-inclass`)

| # | Step | Done when |
|---|---|---|
| **B1** | Backend: log buffer + `/debug/logs` + request-id/poll tags + remove the robot emoji from the FactBot log line and bio (the `user.dto` Swagger example keeps its emoji for spec parity; the app never shows it) | Route returns entries; Swagger is still identical to `swagger.json`; 39 contract checks pass |
| F1 | Scaffold Expo 58 JS + Router, ESLint (hook "never" list), Prettier, **Jest (`jest-expo`)**, light **and dark** theme tokens + `useTheme`, motion/config tokens, Inter, `huddle.` wordmark | Opens in Expo Go on the phone in both appearances; lint and `npm test` are clean is clean |
| F2 | UI primitives + `playground` route (ring button, slab, floating bar, pills, gradient, chips, badge, sheet) | Playground looks like `design.md` on the phone |
| F3 | Avatars (DiceBear, 3 styles, cache) + AvatarStack | Seeded users render the same faces on both screens |
| F4 | Logger, log and network stores, API client (headers, timeout, ApiError), session store + persistence | Requests visible in Metro **and** the backend console with the same request id |
| F5 | Login (server picker, test connection, shake on error, success morph) + protected routing | Log in as `aarav` from the phone; restart keeps you logged in |
| F6 | Tab bar + Chats (group carousel, DM rows, polling, pull-to-refresh, empty state, connection banner) | Seed chats render; banner appears when Docker stops |
| F7 | Chat room: text, pagination, optimistic send, ticks, new-messages pill, long-press menu | Two phones (or phone + Swagger) chat live; ticks update on Docker |
| F8 | Images: pick, upload progress, image bubble, viewer | A photo from the phone shows up for the other user |
| F9 | People grid + DM open; New group selection + control bar | `rohan` starts a DM and creates a group |
| F10 | Profile: avatar style picker, appearance, developer toggles, logout | Style change updates every face instantly |
| F11 | Inspector: orb, shake, sheet, logs, network, tools, graceful server-log states | Works on Docker; shows the "unsupported" notice on a server without the route |
| F12 | Live Wire + explain mode + slow-mo | A real send animates and the explain steps show real data |
| F13 | Polish: dark-mode contrast pass, reduce-motion fallbacks, accessibility labels, app icon + splash, README, class-server run | Full checklist passes on the phone against Docker **and** the class server |

**Checks after every step:** `npx expo lint`, `npm test`, a manual phone checklist in Expo Go
against Docker with the seeded users **in light and dark mode**, and a scan of both consoles for errors.

### 11.1 Unit tests (Jest)

- **Runner:** `jest-expo` preset. Tests sit next to their code as `*.test.js`. `npm test` must pass before every commit.
- **What gets tested:** all pure logic. To make that possible, logic is pulled out of hooks and components into plain functions.

| Module | What the tests prove |
|---|---|
| `utils/format.js` | time, day labels and file sizes across edge cases (midnight, yesterday, 0 bytes, 10 MB) |
| `utils/conversationTitle.js` | DM shows the *other* person, unknown user fallback, group name + member count |
| `utils/serverUrl.js` | LAN URL from `hostUri`, URL validation, trailing-slash and port handling |
| `api/authHeader.js` | header is the raw `Basic user:pass`, never base64 |
| `api/client.js` (fetch mocked) | timeout → `ApiError`, status and message parsing, request id and poll headers, logging never includes the password |
| `hooks/messageList.js` | merge by id with no duplicates, newest-first order, optimistic replace and fail, cursor paging stop |
| `utils/ticks.js` | sent / delivered / read from a `status` map, including groups and the class server (no changes) |
| `debug/filterLogs.js` | source, level, category, hide polls / bot, search |
| `debug/serverLogsState.js` | 200 → available, 404/401 → unsupported, network → unreachable, re-check rules |
| `avatar/avatarSvg.js` | same name + style gives the same SVG (cache), different styles differ |
| `store/createStore.js` | set merges immutably, subscribers are notified, unsubscribe works |

- **Coverage target:** 80% or more for `src/utils`, `src/api`, `src/debug`, `src/store` and the pure files under `src/hooks`.
  Screens and animated components are checked on the device instead.

---

## 12. Resolved questions

| # | Question | Answer |
|---|---|---|
| Q1 | App name | **`huddle.`** with a full stop and a careful wordmark (D12) |
| Q2 | Jest unit tests | **Yes**, for all pure logic, written step by step (D13, §11.1) |
| Q3 | Dark mode | **From the start** (D14) |
| Q4 | Debug orb on by default | **Yes** (D15) |

No open questions remain. Next: review this plan, then build B1.

---

## 13. Visual review round 1 (built, awaiting the phone check)

Feedback from the first phone run (2026-11-10), with the answers to the follow-up questions:
logs = the Inspector and terminal logs; the bland screen = the Chats tab (home); background
checks of every chat for notifications = yes; test phone = Android. Nothing is committed or
pushed until the user asks.

| # | Feedback | What we found |
|---|---|---|
| R1 | Springs are too loud everywhere | Damping ratios: press 0.43, tab 0.61, sheet 0.75, pop 0.31 (1.0 = no bounce). Seven entrances use `.springify()`, presses shrink to 0.92 |
| R2 | Dark-mode notch does not stand apart | Dark `slab #0B0B0B` on `surface #141414` is a 1.08:1 luminance ratio: invisible |
| R3 | Typing hides the message box | Android in SDK 58 is always edge-to-edge, so the window no longer resizes for the keyboard, and the chat's `KeyboardAvoidingView` has no Android behaviour |
| R4 | Logs are counter-intuitive | Each request prints two cryptic lines (`-> GET /user #fy250i` then `<- 200 ...`). No plain words, polls clutter, request ids and raw JSON up front |
| R5 | Chats home is bland | DM rows show only a face and a name: no last message, time or unread count, because the server's conversation list has no last message |
| R6 | The notch is unused | It is a static header. It should become a live, Dynamic Island style surface |
| R7 | Avatars are not fully loaded or rendered | Every face carries a no-op SVG mask (heavy and fragile on Android), dead metadata, and is re-parsed on every mount |

### Steps (each verified with lint, Jest and an iOS + Android export; no commits until asked)

**V0. Avatars that render completely (bug from the phone run).**

Found in the code (not reproduced yet: there is no Android emulator on this Mac):
- Every DiceBear face is wrapped in `<mask id="viewboxMask">`, a full-size white rectangle
  that hides nothing. On Android, react-native-svg 15.16 draws every masked group through
  three full-canvas offscreen layers and clips them to the group's bounds mapped back through
  the viewBox scale (980 or 1744 units down to 40 px). That path is where Android masks get
  cut off or drawn late. It is also heavy: Chats and People draw 20 to 40 of these at once.
- Each face also carries a `<metadata>` block (rdf/dc tags) that react-native-svg can't draw.
  It is parsed and thrown away for every avatar.
- `SvgXml` re-parses the XML string for every avatar that mounts. Only the string is
  cached, so scrolling a list parses the same 11 KB face again and again.
- The face is sized `100%` inside the circle. On Android the first frame can draw before
  layout settles.

Fix:
- `cleanAvatarSvg(svg)` (pure, tested) removes the metadata and unwraps the no-op mask.
  The faces look identical, are 7 to 18% smaller, and have no masks left (measured for all
  three styles).
- Cache the parsed tree, not just the string. react-native-svg exports `parse` and `SvgAst`,
  so each face is parsed once per style.
- Give the SVG numeric `width` and `height` equal to `size`.
- Tests: no `<mask` or `<metadata` left in any style; the path count is unchanged; parsing
  happens once per (style, name); the cache stays bounded.
- Phone check: a temporary "avatar lab" in `app/playground.jsx` shows 60 faces in all three
  styles, before and after side by side. You confirm on Android, then it goes away.

**V1. Calmer motion (R1).** Every later step uses these tokens.
- Re-tune `motion.js` with Reanimated 4's `dampingRatio` + `duration` springs: press 1.0 (no
  overshoot), tab 0.9, sheet 0.95, pop 0.85. Presses shrink to 0.97 instead of 0.92. Shake
  goes from 8 pt to 5 pt.
- Replace the seven `.springify()` entrances (ZoomIn on ticks, checks, menus, avatars, the
  new-messages pill, sheets) with a short fade plus a 0.96 to 1 scale on an ease-out curve.
- Test: every spring token has `dampingRatio >= 0.85`.

**V2. Dark notch that reads as a separate layer (R2).**
- Dark theme only: `surface` goes darker (about `#0C0C0D`), `slab` goes lighter (about
  `#1F1E21`, like an elevated iOS dark surface), plus a 1 px hairline on the slab's lower
  edge (`rgba(255,255,255,0.08)`) and a soft shadow underneath.
- Test: the dark slab and surface differ by at least 1.3:1. The existing contrast test keeps
  text readable on both.

**V3. Message box above the keyboard (R3).**
- Add `react-native-keyboard-controller` 1.22.7. It is included in Expo Go for SDK 58
  (checked on docs.expo.dev). `KeyboardProvider` goes in the root layout.
- Chat room: the composer rides on top of the keyboard and the inverted list keeps the newest
  message in view. Login and New group: a keyboard-aware scroll view, so the focused field is
  never covered.
- Check on the Android phone: open a chat, type, the box and the last message stay visible.

**V4. Logs a person can read (R4).**
- One line per request, updated in place when the reply arrives, instead of a `->` and a `<-` line.
- Plain words first, technical detail second, for example
  `sent a message to study group · 201 · 84 ms` or `loaded 20 messages in diya · 200 · 31 ms`.
  A small table maps method and path to a phrase (unit tested).
- Polls fold into one live heartbeat row, e.g. `checking chats every 5 s · 12 checks, nothing new`,
  and expand only when something changed or failed.
- Inspector rows: a category icon and colour, the time as "3 s ago" (exact time on tap), a
  readable status ("ok", "wrong password", "server unreachable"), and the request id and raw
  JSON tucked into the expanded view.
- Terminal: the same plain sentence, aligned columns, and ANSI colour per level (no emojis).

**V5. Inbox data: last message and unread per chat (feeds V6 and V7).**
- A background inbox checker asks for each chat's newest messages, spread evenly across a
  10 s cycle (no bursts). It skips the chat that is open, pauses in the background, and obeys
  Inspector > tools (pause, interval, and a new "inbox checks" switch for the class server).
- Unread is counted on this device: messages from others newer than the last time you opened
  that chat (saved locally). The server never updates read receipts, so it can't tell us.
- Pure logic with tests: unread count, "what is new since last check", the even schedule.
- Load: about 1 request per chat every 10 s, as agreed. On the shared class server that adds
  up across 200 students, so the interval is adjustable and checks back off after errors.

**V6. A Chats home with life in it (R5).**
- Notch header: a greeting ("good evening, aryan") and an unread summary ("3 new in 2 chats").
- A "recently active" rail of faces, ordered by the newest message, with a gradient ring on
  people who have unread messages.
- DM rows: last message preview (or "photo"), relative time, and a gradient unread badge;
  unread rows get a bolder name. Group cards: last message line and unread badge.
- New messages slide a row to the top with a calm (V1) layout transition.

**V7. The notch becomes a live island (R6), rev 2.**

*What the iPhone 18 Pro actually changed (checked 2026-11-10).* Apple's newsroom post says the
Dynamic Island is "smaller and even more useful" and "can now show three Live Activities at
once". Bloomberg describes users who "toggle between three live tasks". A simulator leak shows
the toggling. A MacRumors teaser says the third slot is for system activities only (not
verified). Apple published nothing about new animations, and the HIG page could not be read
here. So the plan takes the three confirmed ideas (a smaller resting island, up to three live
things at once, switching between them) and pairs them with the established Dynamic Island
patterns: compact content on both sides of the camera, a split pill and circle, a long press
to expand, and the square morph used for confirmations.

*Where it lives.* A black pill fixed at the top centre, just under the status bar, drawn above
every screen by one `NotchIsland` at the root. It sits inside the dark slab header, so the
slab becomes the "bezel" and the island the live part. Expo Go can't report where an Android
phone's camera hole is, so the island never tries to wrap the camera. Every slab header keeps
a 40 pt centre zone free so titles and back buttons are never covered.

*Five shapes* (pure size table `islandShapes.js`, unit tested; every change animates width,
height and corner radius together):

```
 rest        ( . )                       96 x 28   brand dot, nothing live
 compact     ( (face)  ·  2 new )        leading + trailing content around the centre
 multi       ( (face) 2 new )  (◔)  (!)  main pill + up to 2 circles: the iPhone 18 "three at once"
 expanded    ╭─────────────────────────────────╮
             │ (face) diya                now  │
             │ are you coming to the lab?      │
             │ ( reply ......... )  ( open )   │
             ╰─────────────────────────────────╯
 confirm     ╭──────╮                    near-square: avatar + a check that draws itself
             │ (✓)  │                    "signed in", "photo sent", "group created"
             ╰──────╯
```

*Activities* (an `islandQueue.js` of pure functions: add, update, expire, dismiss, pick the
visible three, toggle order; all unit tested):

| Activity | Compact (left / right) | Expanded or confirm | Ends |
|---|---|---|---|
| New message in another chat (V5) | face(s) / "2 new" | preview + quick reply + open; auto-expands once for 4 s | opening the chat or swipe up |
| Added to a new chat (diff of the chats poll) | group stack / "new group" | "kabir added you to study group" + open | 6 s |
| Connection | amber dot / "reconnecting" | none | "back online" with a green check for 1.5 s |
| Photo upload | progress arc / "sending photo" | confirm: thumbnail + check | sent, or failed |
| Message failed | red dot / "1 not sent" | tap = retry | sent or dismissed |
| Signed in | none | confirm: your face + check, "hi aryan" | 1.6 s |
| Copied (message menu) | check / "copied" | none | 1.2 s |
| Live Wire (debug, off by default) | a dot runs across the pill for each request | none | always on while enabled |

*Gestures*
- Tap: opens what the main activity points to (the chat, the retry, the Inspector).
- Long press: expands the main activity. On the rest pill it opens the Inspector, so the
  floating orb can be turned off by default.
- Swipe left or right on the pill: switches the main activity with the next circle. This is
  the iPhone 18 toggle.
- Tap a circle: brings that activity into the main pill.
- Swipe up on the expanded card: collapses it.

*Motion* (all on the calm V1 tokens):
- Shape moves first, content follows. On the way in, the size runs on a critically damped
  spring (`dampingRatio` 1, about 380 ms) and the content fades and scales from 0.96 once the
  shape is 60% of the way there. On the way out, the content fades in 120 ms, then the shape
  shrinks.
- Split and merge: a circle leaves the pill through a thin "bridge" (a small rounded rect
  whose height goes to 0 as they separate) and reverses to merge. This gives the liquid feel
  without blur filters, which Expo Go can't do cheaply.
- The confirm morph grows to a square, draws the check (SVG stroke offset, 300 ms), holds,
  then shrinks back.
- No loops: the reconnecting dot breathes once every 2 s at most, the progress arc only moves
  when progress changes, and nothing animates while the island is at rest.
- Haptics: light on expand, success on confirm, warning on failed, nothing on compact changes.
- Reduce motion: shapes snap, content cross-fades, no bridge, no check drawing.

*Rules*
- At most three activities visible (main + 2 circles). The rest wait in the queue by priority:
  failed > connection > new message > upload > new chat > copied. Same key = update in
  place, never a duplicate.
- No message activity for the chat you are looking at.
- No auto-expanding while the keyboard is open or a sheet or modal is up. The island waits.
- Hidden while the Inspector is open.
- Accessibility: every shape has a label ("2 new messages from diya, double tap to open").
  New messages are announced politely and the island is reachable by TalkBack.
- The connection banner and the "copied" toast are removed; the island replaces them.

*Files*
- `src/island/islandQueue.js`, `islandShapes.js` (+ tests), `islandStore.js`
- `src/hooks/useIslandFeeds.js` (inbox, chats, connection, upload and session feed the store)
- `src/components/island/NotchIsland.jsx`, `IslandPill.jsx`, `IslandCircle.jsx`,
  `IslandBridge.jsx`, `IslandExpanded.jsx`, `IslandConfirm.jsx`, `QuickReply.jsx`
- Quick reply uses the V3 keyboard controller, so V3 must land first.

### Order and checkpoints

V0 (avatars, a bug, so first) → V1 → V2 → V3 (check on the phone) → V4 → V5 → V6 →
V7a (shapes, rest, compact, connection, confirm) → V7b (multi, toggle, bridge, expanded,
quick reply). Check on the phone after each.

### Status (2026-11-10)

All of V0 to V7b is built, not committed. Each step passed lint, Jest and an iOS + Android
export (339 tests at the end, expo-doctor 20/20). The user asked for everything up to V7b in
one go, so the per-step phone checks become one phone pass, with the README checklist.

Changes from the plan while building:
- Motion followed Emil Kowalski's animation skills (installed in `.claude/skills`, git-ignored):
  presses and indicators became timing curves (120 ms / 250 ms) instead of springs, and
  virtualized list rows lost their entrance animation (recycled rows replay it while scrolling).
- Android: the island rests in the status bar around the front camera (most punch-hole phones
  put it top centre); on iPhones with a Dynamic Island it lines up with the real one.
- The connection banner is gone; the island shows reconnecting and back online.
- The debug orb starts hidden; long press on the resting island opens the Inspector.
- Not verifiable here (no emulator): touch handling inside the expanded card, the bridge look,
  and the avatar fix itself. The avatar lab in the playground is there to confirm it.

## 14. Visual review round 2: island polish, DB logs, motion pass (built, awaiting the phone check)

Decisions (user, 2026-11-10): sideways swipe on a message = mark read, switching moves to
the circles; the "orb" is the island's resting pill; DB logs may change the local backend
copy (gated by `DEBUG_LOGS`).

Feedback after the round 1 build (2026-11-10). Nothing is committed until the user asks.

| # | Feedback | What we found |
|---|---|---|
| R8 | The island is a black pill that just sits there until something happens | Rest has no behaviour at all: tap does nothing, nothing tells you it is alive |
| R9 | It needs fluid, liquid-like motion to be noticed | The morph is a plain spring on width/height; the bridge is a shrinking rectangle; a new message gets no "arrival" moment |
| R10 | A notification should slide away once read | Sideways swipe is used to switch between activities; there is no "mark read" gesture |
| R11 | The island exists to make the app more interactive | Several states have no tap or hold action (rest, upload, connection, confirm) |
| R12 | Readable DB logs in the debugger | The server logs HTTP lines only; Live Wire's "db" node is drawn for every request whether or not the database was touched |

### W1. Rest is still, but never dead (R8, R11)

Apple keeps a resting island still, and a loop that runs all day breaks the motion rules
(100+ sightings a day = no animation). So rest stays still and gains behaviour instead:
- **Tap or pull down at rest opens a glance card**: "all caught up" or "3 new in 2 chats" (tap
  jumps to the newest), server health ("class server · ok · 24 ms · checked 3 s ago"), and
  three shortcuts: new chat, people, Inspector.
- **One quiet "breath" when there is news about nothing**: when the app returns to the
  foreground and the first inbox round finds nothing new, the pill widens 6% and settles back
  once (300 ms) with a faint gradient rim. At most once per foreground, never on a loop.
- Long press at rest still opens the Inspector.

### W2. Fluid, liquid motion (R9)

- **Anticipation**: before growing, the pill "inhales" for 90 ms (scaleX 1.04, scaleY 0.94),
  then morphs on the same calm spring. This is what makes an arrival noticeable without bounce.
- **Liquid bridge**: the rectangle becomes an SVG neck with concave sides (animated path),
  so a circle visibly pulls away from the pill and snaps free, like two drops separating.
- **Stretch under the finger**: while dragged, the pill stretches along the drag by up to 6%
  from the velocity, and relaxes on release.
- **Content emerges from the camera**: content scales from the top centre (the camera point),
  not from the middle.
- **Arrival ring**: a soft gradient ring expands once from the island when a message arrives
  (opacity 0.35 to 0, 600 ms). Once per arrival, never repeated.
- **The resting pill itself** (the "orb" in the feedback): it squishes softly under the
  finger, stretches toward a drag and snaps back like liquid, and does the one-time breath
  from W1. Still at rest otherwise.
- Reduce motion: no inhale, stretch, ring or bridge; fades only.

### W3. Slide a notification away (R10)

- **Sideways swipe on a message (compact or card) marks it read**: the pill content follows
  the finger 1:1, fades with distance, and leaves on a flick (velocity projection, not a fixed
  distance). It marks the chat read on this phone and clears its unread badge. A light haptic
  fires when the swipe crosses the commit point, the same frame the content lets go.
- **Switching between live activities moves to the circles**: tap a circle (already there),
  or swipe across the circles. This frees the sideways swipe on the pill for "mark read".
- Swipe up still dismisses without marking read; pull down still opens the card.

### W4. Interaction audit of every island state (R11)

| State | Tap | Hold | Swipe sideways | Swipe up | Pull down |
|---|---|---|---|---|---|
| rest | glance card (new) | Inspector | - | - | glance card (new) |
| message | open chat | card | mark read (new) | dismiss | card |
| failed | retry | card with details | dismiss | dismiss | card |
| upload | open the chat (new) | - | - | - | - |
| connection | Inspector > network (new) | - | - | dismiss | - |
| new chat | open chat | card | dismiss | dismiss | card |
| confirm | skip it (new) | - | - | - | - |

Each action also exists as a TalkBack action. Haptics stay at one per committed action.

### W5. Readable DB logs in the Inspector (R12): DROPPED

Dropped by the user (2026-11-10): real DB logs are only possible on our local backend, never
on the teacher's server, so a new debugger part would not work by default. Kept below for the
record only.

#### Original W5 plan

**Backend** (local copy only; no route changes; active only with `DEBUG_LOGS=true`, so the
class server and the default run are unaffected):
- A Prisma client extension (`query.$allModels.$allOperations`) in `PrismaService` times every
  query, counts the rows, reads the request id from the existing AsyncLocalStorage context,
  and writes one line with context `DB` into the same log buffer that `/debug/logs` serves.
  (Prisma 6 uses client extensions; the old `$use` middleware is deprecated.)
- One plain sentence per query, from a table covering the ~30 calls the backend makes:
  - `read 20 messages in chat 7f3a, newest first · 4 ms`
  - `looked up user aarav · 1 ms`
  - `saved a text message (12 characters) in chat 7f3a · 6 ms`
  - `marked 3 messages delivered · 3 ms`
  - `deleted 2 expired photos · 9 ms`
- Privacy: never logs passwords, photo data or message text (only its length); ids shortened.
- 50 ms or slower is logged as a warning ("slow").
- Tests: the sentence table is a pure function, tested with Node's built-in test runner (no new
  dependency), plus a check in Docker that a request produces its DB lines.

**Frontend**:
- DB lines get their own category, a database icon and a "db" filter chip.
- **Request timeline** (Network row and "follow this request"): app sent -> server received
  -> guard checked the user -> 2 queries (4 ms + 1 ms) -> reply, with small bars for the time
  each step took.
- **Live Wire**: the db node lights only when the request really touched the database, and
  explain mode shows the actual queries.
- **Hints**: "6 queries for one request" and "slowest: read 20 messages, 54 ms" on a request.
- Background checks' DB reads fold into the heartbeat ("132 checks · 264 db reads").
- Class server: "db logs need the local server" (same graceful notice as server logs).

### W6. App-wide motion polish

Run the `improve-animations` audit (read-only, from Emil Kowalski's skills) over `app/` and
`src/`, then fix by priority. Already known:
- Bottom sheets cannot be dragged down to close: add drag-to-dismiss with velocity.
- Badge counts snap: numbers crossfade (150 ms); a badge appears with the soft pop.
- A sent message rises from the composer (origin-aware), not from nowhere.
- Opening a photo grows it from its thumbnail.
- The header summary crossfades when it changes ("all caught up" -> "2 new").
- Login success: the button's check and the island's "hi aarav" are two confirmations; keep
  the island one only.
- Keep the gate: nothing new animates on surfaces seen 100+ times a day (tabs, typing, scroll).

### Order

W3 + W4 (interaction, the core ask) -> W1 -> W2 -> W6. Phone check after the island steps
and at the end. No commits until asked. (W5 dropped.)

### Status (2026-11-10)

W1-W4 and W6 are built, not committed (368 tests, lint, iOS + Android export). W5 dropped.
- Island gestures are pure rules (`src/island/islandGestures.js`, tested) carried out by
  `islandActions.js`; touch handling in `useIslandGestures.js`, motion in `useIslandMotion.js`.
- On the open card, sideways drags belong to the reply field, so "mark read" is a button there.
- W6 done: sheet drag-to-dismiss (handle strip), badge pop and count fade (not in list rows),
  my messages grow from the composer corner, photos grow in, the header summary fades, and
  login has one confirmation (the island).
- Not run: a full `improve-animations` audit; the known list above was done instead.

## 15. The Inspector grows out of the header notch (built, awaiting the phone check)

Feedback (2026-11-10): "notch" means the dark header slab with "good afternoon, aryan" (the
`Slab variant="notch"` on every screen), not the island; the Inspector grows down out of it.
Inside, it is cramped. Decisions: plain, simple language anyone can follow (the "kid" remark
was an analogy, not a request for metaphors); tab names stay technical; tabs at the bottom.
The flow tab must show, with good animation, how the app, the backend and the database work
together (viva). The network tab must work like browser devtools: pick any request and dive
into it.

Already fixed while planning: the drawer's window now covers Android's system bars, and its
88% height is back.

### Writing rule for every screen

Each thing is said twice: a plain sentence first ("checked for new messages, nothing new"),
the exact technical fact under it in small text ("GET /message?conversation_id=… · 200 ·
31 ms"). Nobody needs to know HTTP to follow the first line; the viva gets the second.

### Screen 0: closed (today's header)

```
╭────────────────────────────────────────╮
│ huddle.                         (face) │   the notch slab, as it is now
│ good afternoon, aryan                  │
│ • 3 new in 2 chats                     │
╰──────╮                        ╭────────╯
```

### Screen 1: opening, the notch grows down (about 450 ms)

```
 frame 1              frame 2                    frame 3 (open)
╭──────────╮        ╭──────────────╮           ╭────────────────────╮
│ huddle.  │        │ huddle.      │           │ inspector     (x)  │
│ good aft…│        │ good aft…    │           │ ● 10.41.170.153 ok │
╰──────────╯        │              │           │                    │
 page               │              │           │   (screen 2)       │
                    ╰──────────────╯           │                    │
                     page dims                 │ overview network … │
                                               ╰────────────────────╯
```
- The header's bottom edge moves down to the bottom of the screen (same colour, same rounded
  corners), so it reads as the header growing. The greeting fades out, "inspector" fades in;
  the page dims and is then fully covered. Closing plays it backwards.
- Ways in: Profile > inspector, shake, island long press, the orb (it flies into the header
  first). Ways out: swipe up on the top strip, Android back, (x).
- A root overlay (not a Modal), measured from the header the current screen shows, so it
  lines up everywhere. Lists load after the panel lands, so the growth stays smooth.

Tab bar at the bottom: **overview · flow · network · logs · tools**.

### Screen 2: overview

```
╭────────────────────────────────────────╮
│ inspector                          (x) │
│ ● connected to 10.41.170.153 · 24 ms   │
│                                        │
│  [ animated mini diagram ]             │
│   app ═══►  server ═══► database       │   a pulse runs along the line for every
│       ◄═══         ◄═══                │   request (green ok, red failed)
│                                        │
│  ┌──────────┐┌──────────┐┌──────────┐ │
│  │ 48       ││ 2        ││ 31 ms    │ │
│  │ requests ││ failed   ││ typical  │ │
│  │ this min ││          ││ time     │ │
│  └──────────┘└──────────┘└──────────┘ │
│                                        │
│  The app asks the server for new data  │   one plain sentence about now
│  every 5 seconds. Everything is fine.  │
│  ─ polling: chats 5 s, open chat 3 s,  │
│    inbox round 10 s                    │
│                                        │
│  last problem: couldn't reach the      │   tap -> that request in network
│  server, 2 min ago                     │
│ ( overview )( flow )( network )( logs )( tools )
╰────────────────────────────────────────╯
```

### Screen 3: flow, live (the architecture, animated)

```
╭────────────────────────────────────────╮
│ flow                  ( live | replay )│
│ FRONTEND (this phone)                  │
│  ┌ screen ┐ → ┌ store / hook ┐ → ┌ api client ┐
│  │ chats  │   │ chatsStore   │   │ fetch      │
│  └────────┘   └──────────────┘   └─────┬──────┘
│                                ═══ HTTP │ ▲ ═══   over Wi-Fi
│ BACKEND (NestJS)                        ▼ │
│  ┌ middleware ┐→┌ AuthGuard ┐→┌ controller ┐→┌ service ┐
│  │ request id │ │ name+pass │ │ /message   │ │ logic   │
│  └────────────┘ └───────────┘ └────────────┘ └────┬────┘
│                                       Prisma │ ▲
│ DATABASE (MongoDB)                           ▼ │
│  ┌ users ┐ ┌ conversations ┐ ┌ messages ┐ ┌ files ┐
│  └───────┘ └───────────────┘ └──────────┘ └───────┘
│                                        │
│  polling ▏ . ▏ . ▏ . ▏ . ▏  every 5 s  │
╰────────────────────────────────────────╯
```
(laid out top to bottom on the phone; the sketch is compressed sideways)
- Every request is a packet that travels the real path: screen -> store -> api client -> HTTP
  -> middleware -> guard -> controller -> service -> Prisma -> the right collection -> and
  back up. Each box lights up as the packet passes; the connecting lines flow (moving dashes)
  only while traffic is on them.
- The packet changes on the way back: a request packet (outline, labelled GET / POST) turns
  into a response packet (filled, labelled with the status). Green for ok, red for a failure,
  and a failure stops at the box where it failed (guard for 401, wire for no connection).
- Database: a read lights the rows it reads in a small table drawing of that collection; a
  write slides a new row in.
- Background checks (polls) are smaller, quieter packets and tick the polling strip.
- Tap any box: a plain explanation of what that part does, its file, and the last requests
  that went through it.
- On the teacher's server the backend and database boxes are marked "from the code" (no
  server logs there); on the local server they use the real server lines.

### Screen 4: flow, replay (one request, step by step)

```
╭────────────────────────────────────────╮
│ replay  sent a message · 201 · 84 ms   │
│ ( sent a message )( opened diya )( … ) │   pick a request, or open it from network
│                                        │
│  [ the same diagram, zoomed to the     │   the camera follows the packet from box
│    current box, others dimmed ]        │   to box
│                                        │
│  step 4 of 9 · AuthGuard               │
│  The server checks the name and        │   plain sentence
│  password sent with the request.       │
│  "aarav" is correct, so it continues.  │
│  ─ Authorization: Basic aarav:hidden   │   the exact data, small
│                                        │
│  ●●●●○○○○○  ( |< )  ( > play )  ( >| ) │
│  speed ( 0.25x )( 0.5x )( 1x )         │   drag the dots to scrub
╰────────────────────────────────────────╯
```
Steps: screen action -> store -> api client builds it (headers, request id) -> over Wi-Fi ->
middleware (request id) -> AuthGuard -> controller -> service -> Prisma / MongoDB -> response
comes back (status, time) -> what changed on screen.

### Screen 5: network (like browser devtools)

```
╭────────────────────────────────────────╮
│ network   ( all | failed | hide polls )│
│ ( search path or status )              │
│ method path            status time  ▬▬ │   waterfall column: when it started and
│ POST   /message        201    84ms  ▬  │   how long it took, on one time axis
│ GET    /message?…      200    31ms   ▬ │
│ GET    /conversation   200    22ms    ▬│
│ GET    /user           ERR  10.0s ▬▬▬▬▬│
╰────────────────────────────────────────╯
```
Tap a request -> **request detail** (pushes in from the right, back to return):
```
╭────────────────────────────────────────╮
│ (<) POST /message                 201  │
│ sent a message · 84 ms · 0.3 KB        │
│ ( summary )( headers )( payload )( response )( timing )( server )
│                                        │
│ summary   url, method, status, time, size, started at,
│           started by (which screen / store / poll), request id
│ headers   request and response headers, Authorization shown as
│           "Basic aarav:hidden"
│ payload   the body we sent, as a collapsible JSON tree
│ response  the body that came back, collapsible JSON tree, search,
│           copy a value
│ timing    bars: waiting for the server (until the first byte)
│           and downloading the body, with ms
│ server    the server's own log lines for this request id (local
│           server; "not shared by this server" otherwise)
│                                        │
│ ( replay in flow )  ( copy as cURL )  ( copy response )
╰────────────────────────────────────────╯
```
- "Copy as cURL" never includes the real password (it writes a placeholder).
- "Resend" only for GET requests, so a message is never sent twice by accident.
- Needs small client additions: response headers, time to first byte vs body download, who
  started the request, and the full response for the newest 30 requests (older ones keep the
  1.5 KB preview, so memory stays small).

### Screen 6: logs

```
╭────────────────────────────────────────╮
│ logs              ( search )( filter ) │
│ ~~~^~~~~^~~~~^~~~  132 background      │   pulse line, one beat per check
│                    checks, nothing new │
│ just now                               │   grouped by time
│  (icon) sent a message · ok 201 · 84ms │   plain sentence first
│         POST /message #ab12            │   detail small
│  (icon) opened chat with diya          │
│ 1 minute ago                           │
│  (icon) couldn't reach the server      │   problems in red, tap -> the request
╰────────────────────────────────────────╯
```

### Screen 7: tools

Cards with an icon, a plain title, a one-line explanation and the control: simulate offline,
pause polling and the intervals, inbox checks, requests in the island, copy debug report,
versions and server.

### Animation (animated SVGs with react-native-svg + Reanimated, both in Expo Go)

- Packets move along SVG paths (`useAnimatedProps`), connecting lines flow with an animated
  dash offset, boxes glow when a packet passes, database rows slide in, the pulse line draws.
- The notch growth, tab changes inside the panel (content crossfade, no sliding between
  tabs), and the request detail push all use the calm motion tokens.
- Nothing moves without traffic; at most 8 packets at once; reduce motion = still diagram
  with colour changes only.

### Order

1. The notch grows into the panel (screens 0, 1) with the bottom tab bar; page fully covered.
2. Network list and request detail (screen 5), with the client additions it needs.
3. Flow live, then replay (screens 3, 4), linked from request detail ("replay in flow").
4. Overview, logs, tools (screens 2, 6, 7).
5. Polish: contrast, TalkBack, a phone pass.

Nothing is built yet for this section. Nothing is committed until asked.

### Status (2026-11-10)

Built, not committed (413 tests, lint, iOS + Android export, expo-doctor 20/20).
- Panel: `Inspector.jsx` (root overlay, grows from `notchStore` height), `InspectorTabBar.jsx`.
- Overview: `OverviewPanel.jsx`, `MiniWire.jsx`, `overviewStats.js`.
- Network: `NetworkPanel.jsx`, `NetworkRow.jsx`, `RequestDetail.jsx`, `JsonTreeView.jsx`;
  pure `networkDetail.js` (cURL, waterfall, header redaction), `jsonTree.js`; the client now
  records url, redacted headers, safe body, time to first byte, response headers and the full
  reply (newest 30 kept).
- Flow: `flow/ArchitectureMap.jsx`, `FlowBox.jsx`, `FlowPacket.jsx`, `FlowLive.jsx`,
  `FlowReplay.jsx`, `NodeInfoCard.jsx`; pure `flowPath.js`, `flowLayout.js`, `flowReplay.js`,
  `flowBus.js`.
- Logs: `LogsPanel.jsx` (diary), `PulseLine.jsx`, `logGroups.js`. Tools: `ToolCard.jsx`.
- The old Inspector pieces (`LiveWire`, `FlowDot`, `FlowNode`, `FlowRipple`, `ExplainSteps`,
  `HeartbeatRow`, `flowEvents.js` + test, and their FLOW_* timing constants) were deleted on
  the user's request (2026-11-10). Phone check passed: tabs show, the user is happy with it.
