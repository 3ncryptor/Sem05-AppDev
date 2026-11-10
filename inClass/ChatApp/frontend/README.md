# huddle.

An Expo React Native chat app for the class ChatApp backend. It runs in **Expo Go**
(SDK 58), is written in plain JavaScript and uses Expo Router.

- `buildPlan.md`: the plan, screens, flows and build order
- `design.md`: the "soft slab" design system (colours, type, motion)

## Run it

1. Start the backend (from `../backend`, needs Docker):
   ```bash
   npm run docker:up        # API on http://localhost:3000, seeded users
   ```
2. Start the app (from this folder):
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code with Expo Go. The phone and the Mac must be on the same Wi-Fi.
   The first time, macOS may ask to allow incoming connections on port 3000: allow it.
4. Log in as `aarav`, `diya`, `kabir`, `meera` or `rohan`. The password is `demo123`.

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

## The Inspector

Open it from the floating orb, by shaking the phone, or from Profile > inspector.

| Tab | Shows |
|---|---|
| logs | App and server lines merged by time. Tap a `#id` to see one request from both sides |
| network | Every request: status, time, size, the redacted request and response bodies, and the server's lines |
| flow | Live Wire: a dot per request from phone to server to db and back. **explain** steps through one real request; **slow-mo** runs at quarter speed |
| tools | Pause polling, poll intervals, simulate offline, versions, copy a debug report |

## Phone checklist (Docker, then the class server, light and dark)

- [ ] Login: wrong password shakes and shows the server's message; the right one opens Chats
- [ ] Restarting the app keeps you logged in
- [ ] Chats: groups carousel and DMs load; pull to refresh works
- [ ] Stop Docker: "reconnecting" banner. Start it: "back online"
- [ ] Chat: send text; the message appears at once, then ticks; scroll up loads older messages
- [ ] Long press: copy and details
- [ ] Photo: pick, upload, appears for the other user; viewer pinch, double tap, swipe down
- [ ] People: search, open a DM; New group: pick 2+, create, lands in the group
- [ ] Profile: change avatar style (every face changes), appearance, log out
- [ ] Inspector: orb, shake, all four tabs; class server shows "server logs unavailable here"
- [ ] Inspector tools: simulate offline shows the banner; pause polling stops the dots
- [ ] iOS Settings > Accessibility > Reduce Motion on: no travelling or looping animations
- [ ] VoiceOver or TalkBack reads buttons and message bubbles
