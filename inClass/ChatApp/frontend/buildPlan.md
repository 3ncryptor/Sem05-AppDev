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

- **DiceBear** (`@dicebear/core` + `@dicebear/collection`, MIT code) renders SVG on the device
  via `react-native-svg`. No network calls. Pin matching major versions of core and collection
  at install time.
- **Seed = username**, so `aarav` has the same face on every phone, on both servers, with no
  storage needed (the backend has no avatar field).
- **Styles:** `lorelei` (default), `notionists`, `open-peeps`, chosen in Profile. The choice
  changes how *you* see everyone and is stored on the device.
- **Background tint:** a soft pastel picked from the name hash, drawn from tints of the
  gradient palette, so faces sit inside the design.
- **Licences:** check each style's art licence when installing. Credit any CC BY styles in the README.
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

```
frontend/
  app/                         routes only
    _layout.js                 fonts, theme, Stack + Stack.Protected, orb overlay, shake listener
    index.js                   <Redirect>
    login.js
    (tabs)/_layout.js          custom FloatingTabBar
    (tabs)/chats.js · people.js · profile.js
    chat/[id].js
    new-group.js               modal
    image/[id].js              modal
    inspector.js               modal sheet (logs | network | flow | tools)
    playground.js              dev-only gallery of every component (viva + design QA)
  src/
    api/          client.js · users.js · conversations.js · messages.js · files.js · debugLogs.js
    store/        createStore.js · sessionStore.js · settingsStore.js · persist.js
    debug/        logStore.js · networkStore.js · flowEvents.js · serverLogs.js
    hooks/        useStore.js · useSession.js · usePolling.js · useConversations.js ·
                  useUsers.js · useMessages.js · useSendMessage.js · useServerLogs.js · useShake.js
    components/
      ui/         RingButton · Slab · FloatingBar · PillInput · GradientFill · Chip · Badge ·
                  PressableScale · SegmentedPill · Sheet · ConnectionBanner · EmptyState · Skeleton
      avatar/     Avatar · AvatarStack · avatarSvg.js (DiceBear + cache)
      chat/       MessageBubble · ImageBubble · Ticks · Composer · MessageList · NewMessagesPill
      chats/      GroupCard · GroupCarousel · DmRow
      people/     FaceTile · FaceGrid
      inspector/  LogRow · LogFilters · NetworkRow · LiveWire · ExplainSteps · ToolsPanel · DebugOrb
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
| `@dicebear/core`, `@dicebear/collection` | face avatars (pure JS) |
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
