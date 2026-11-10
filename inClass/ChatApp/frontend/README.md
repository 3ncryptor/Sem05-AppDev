# huddle.

An Expo React Native chat app for the class ChatApp backend. It runs in **Expo Go**
(SDK 58, React Native 0.88, React 19.3), is written in plain JavaScript and uses Expo Router.

- [`../README.md`](../README.md): the whole project, how the app and the backend fit together
- `buildPlan.md`: the plan, screens, flows and build order
- `design.md`: the "soft slab" design system (colours, type, motion)

## Run it

1. Start the backend (from `../backend`, needs Docker Desktop):
   ```bash
   cp .env.example .env     # first time only
   npm run docker:up        # MongoDB + API on http://localhost:3000; leave it running
   ```
2. Add the demo users, once, from another terminal:
   ```bash
   docker exec chatapp_api npm run seed
   ```
3. Start the app (from this folder):
   ```bash
   npm install
   npx expo start
   ```
4. Open Expo Go and sign in to an Expo account (Expo Go asks for one before it opens a
   project), then scan the QR code. The phone and the Mac must be on the same Wi-Fi.
   The first time, macOS may ask to allow incoming connections on port 3000: allow it.
5. Log in as `aarav`, `diya`, `kabir`, `meera` or `rohan`. The password is `demo123`.
   The app finds the Mac's backend by itself from the address Expo Go connected to
   (`src/api/baseUrl.js`), so there is no IP to type.

### Class server

On the login screen choose **class server**, type the address your teacher gives you
(for example `http://10.7.1.51:3000`) and tap **test**. The Inspector shows "server logs
unavailable here" on that server. That's expected: only the local backend shares its logs.

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Dev server for Expo Go |
| `npm test` | Jest unit tests (pure logic) |
| `npm run test:coverage` | Tests with a coverage report |
| `npm run lint` | ESLint, including the project's own rules |
| `npm run format` | Prettier |
| `python3 scripts/make-icons.py` | Redraws the app icon, splash and favicon (needs Pillow) |

## Rules the code follows

- **Hooks:** app logic uses only `useState`, `useEffect` and custom hooks built from them.
  `useContext` and `useReducer` are banned by lint. Shared state lives in small stores
  (`src/store/createStore.js`) read through `useStore`. Reanimated and gesture-handler
  hooks are used for animation only. `useLocalSearchParams` is the one router hook;
  navigation uses the `router` object.
- **Files:** `.jsx` for anything that renders JSX, `.js` for logic and tests.
- **Imports:** lucide icons and Inter weights are imported one per file. Metro does
  not tree-shake, so the package indexes would bundle every icon and every font file.
- **Icons:** SVG (lucide) only, no emojis anywhere. Faces are DiceBear avatars seeded by username.
- **Logging:** everything goes through `src/utils/logger.js` to the Metro terminal and
  to the in-app Inspector. Passwords and the `Authorization` header are never logged.

## The notch island

A black pill around the front camera, on every screen. It shows what is live: new messages
(with a quick reply), reconnecting and back online, a photo uploading, messages that failed
(tap to retry), "copied", and short confirmations (signed in, photo sent, group created).

| On | Tap | Hold | Sideways | Up | Down |
|---|---|---|---|---|---|
| resting pill | status glance | Inspector | - | - | status glance |
| message | open chat | card with quick reply | mark read | dismiss | card |
| failed send | retry | card | dismiss | dismiss | card |
| photo upload | open chat | - | - | - | - |
| reconnecting | Inspector > network | - | - | dismiss | - |
| confirmation | skip | - | - | - | - |
| a small circle | bring it forward | - | switch to the next | - | - |

Up to three things show at once (the pill plus two circles). Motion is calm and liquid: the
pill inhales before it grows, circles pull away through a liquid neck, a ring leaves the pill
once when a message arrives, and at rest it stays still apart from one quiet breath when you
come back to the app and nothing is new.

New messages come from the **inbox checker**: it asks for each chat's newest page in turn,
one chat at a time, so one full round takes 10 s (Inspector > tools sets the cycle or turns it
off for the class server). Unread counts are kept on the phone, because the backend has no
read state.

## The Inspector

Open it from Profile > inspector, by shaking the phone, by holding the island when it is at
rest, or with the debug orb (Profile > show debug orb; it flies into the header first). The
header notch grows down into a full-screen panel; swipe up on its top strip, press back or
tap (x) to fold it away. Every line is written twice: a plain sentence, then the exact
technical detail.

| Tab | Shows |
|---|---|
| overview | A live app -> server -> database picture, requests this minute, failures, typical time, one sentence about how things are, and the last problem |
| flow | The architecture (frontend -> network -> NestJS backend -> MongoDB). **live**: every request travels the real path as an animated packet and the boxes light up; tap a box to learn what it does. **replay**: one request step by step with captions, play / pause / step / speed |
| network | Every request like browser devtools: filters, search, a waterfall. Tap one for summary, headers (password hidden), payload, response (JSON tree), timing, server lines; replay in flow, copy as cURL, copy reply, resend (GET only) |
| logs | A diary grouped by time, a pulse line for background checks, search, filters behind one button; tap a line to follow its request or open it in network |
| tools | Cards: polling (pause, intervals, inbox checks), try a problem (simulate offline), island, about and the debug report |

On the class server the backend and database parts say "from the code": that server does not
share its logs, so those steps come from this repository's backend code.

## Phone checklist (Docker, then the class server, light and dark)

- [ ] Login: wrong password shakes and shows the server's message; the right one opens Chats
- [ ] Restarting the app keeps you logged in
- [ ] Chats: groups carousel and DMs load; pull to refresh works
- [ ] Stop Docker: the island shows "reconnecting". Start it: "back online" with a check
- [ ] Chat: send text; the message appears at once, then ticks; scroll up loads older messages
- [ ] Long press: copy and details
- [ ] Photo: pick, upload, appears for the other user; viewer pinch, double tap, swipe down
- [ ] People: search, open a DM; New group: pick 2+, create, lands in the group
- [ ] Profile: change avatar style (every face changes), appearance, log out
- [ ] Inspector: the header grows into the panel and covers the whole screen (no message box
      showing at the bottom); swipe up / back closes it; all five tabs; class server shows
      "server logs unavailable here" and "from the code"
- [ ] Network: tap a request, check every detail view, replay it in flow, copy as cURL
- [ ] Flow: live packets travel to the right collection; replay steps through one request
- [ ] Inspector tools: simulate offline shows "reconnecting" in the island; pause polling stops the dots
- [ ] Avatars: Playground > avatar lab, "after" rows are complete and sharp (Android)
- [ ] Motion: presses barely shrink, nothing bounces; dark mode notch stands off the surface
- [ ] Keyboard (Android): the message box and last message stay above the keyboard; login fields too
- [ ] Inbox: a message from another phone shows in the island within about 10 s, the Chats row
      shows the preview, time and unread badge, and the badge clears after opening the chat
- [ ] Island: quick reply sends; sideways on a message marks it read; three live things at once;
      swipe across the circles to switch; tap the resting pill for the glance
- [ ] Sheets (members, log out, Inspector): drag the handle down to close, or flick it
- [ ] iOS Settings > Accessibility > Reduce Motion on: no travelling or looping animations
- [ ] VoiceOver or TalkBack reads buttons and message bubbles
