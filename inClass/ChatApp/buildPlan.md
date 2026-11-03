# ChatApp — Architectural & UI Build Plan (`buildPlan.md`)

**Status:** Grounded in `rt-nst-ru/MobileApp-Bakcend-5thSem` (`2026-11-03`)  
**Course:** Semester 05 — Application Development (`inClass/ChatApp`)  
**Backend Repository:** [`https://github.com/rt-nst-ru/MobileApp-Bakcend-5thSem`](https://github.com/rt-nst-ru/MobileApp-Bakcend-5thSem) (cloned in `inClass/ChatApp/backend/`)  
**Target Frontend:** Mobile UI (iOS / Android / Web) built with **React Native + Expo (Expo Router & TypeScript)** in `inClass/ChatApp/frontend/`

---

## 1. Deep-Dive Analysis of the Cloned Backend (`backend/`)

After cloning and inspecting every module in `backend/src/` and `backend/prisma/schema.prisma`, we uncovered critical implementation details in the actual NestJS + Prisma + MongoDB backend that directly shape our React Native frontend:

### 1.1 Global Validation Pipe (`forbidNonWhitelisted: true`)
In [`backend/src/main.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/main.ts#L15-L21):
```ts
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```
* **Impact on Frontend**: Any request body or query string containing an unrecognized property is **immediately rejected with `400 Bad Request`**.
* **Crucial Discovery in [`CreateConversationDto`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/conversation/dto/conversation.dto.ts#L10-L37)**:
  * Unlike older cURL notes that mentioned `recipient_id`, the actual backend DTO (`CreateConversationDto`) **ONLY** accepts:
    * `type?: 'DM' | 'GROUP'`
    * `name?: string`
    * `participants_ids?: string[]` (each validated with `@IsMongoId({ each: true })`)
  * Passing `recipient_id` to `POST /conversation` would fail because of `forbidNonWhitelisted: true`!
  * Therefore, both **DMs** and **Groups** MUST pass `participants_ids: string[]`:
    * **For a DM**: `{ type: 'DM', participants_ids: [recipientUserId] }`
    * **For a Group**: `{ type: 'GROUP', name: groupName, participants_ids: [...selectedUserIds] }`

### 1.2 Plaintext Basic Auth & Auto-Provisioning (`AuthGuard`)
In [`backend/src/auth/auth.guard.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/auth/auth.guard.ts#L24-L74):
* Extracts `request.headers['authorization']`, verifies `.startsWith('Basic ')`, slices off `'Basic '`, and splits on the **first** colon (`:`) into `username` and `password`.
* Looks up `prisma.user.findUnique({ where: { name: username } })`.
* **Auto-Create**: If no user exists with `name === username`, it creates `{ name: username, phone: password, conversationIds: [] }`.
* **Password Verification**: If the user exists and `user.phone !== password`, throws `401 Unauthorized: Invalid password for user '<username>'`.

### 1.3 Base64 Image Messaging Support (`10mb` JSON Body Limit)
In [`backend/src/main.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/main.ts#L10-L12) and [`backend/src/message/message.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/message/message.service.ts#L63-L84):
* Express JSON parser is configured with `app.use(json({ limit: '10mb' }))`.
* `CreateMessageDto` accepts:
  * `conversation_id: string` (`@IsMongoId()`)
  * `content?: string` (optional if `imageInfo` is provided)
  * `imageInfo?: string` (Base64 data URI, e.g., `data:image/jpeg;base64,...`; if raw Base64 is sent without the `data:` prefix, the backend automatically prepends `data:image/jpeg;base64,`).
* **Impact on Frontend**: Our Chat Room screen (`S5`) and Image Lightbox (`S8`) will natively support **attaching, previewing, sending, and viewing full-screen Base64 images** alongside text messages!

### 1.4 Message Ordering & Reverse-Cursor Pagination (`PAGE_SIZE = 20`)
In [`backend/src/message/message.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/message/message.service.ts#L20-L55):
* Queries up to `20` messages ordered by `createdAt: 'desc'`.
* If `from_message_cursor` is provided, uses Prisma cursor `{ id: fromMessageCursor }` with `skip: 1`.
* Reverses the slice (`[...messages].reverse()`) before returning, so **`data` within each page is ordered oldest-to-newest (natural chronological chat order)**, while **`nextCursor`** is the ID of the oldest message in that batch (or `null` if fewer than 20 messages were returned).

### 1.5 Conversation Naming Convention (`[DM] <username>`) & Participant Resolution
In [`backend/src/conversation/conversation.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/conversation/conversation.service.ts#L89-L94):
* When a DM is created, the backend sets `name = "[DM] <recipientName>"`.
* However, for the *recipient* viewing the same DM conversation, `conversation.name` would say `"[DM] <their own name>"`!
* Therefore, our frontend resolves DM display names dynamically by finding the **other participant's ID** in `participants_ids` (`id !== currentUser.id`) and looking up their `UserResponseDto` from `GET /user`, falling back to stripping `[DM] ` from `conversation.name`.

### 1.6 `FactBot` Automated Simulation (`BOT_MODE=true`)
In [`backend/src/bot/bot.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/bot/bot.service.ts):
* Seeds a bot user `{ name: 'FactBot', bio: 'I am a FactBot 🤖' }`.
* Every 10 seconds, `FactBot` finds or creates a DM (`[DM] FactBot`) with every registered user and sends one of 200 curated Computer Science / Physics / Medicine facts from `facts.data.ts`.
* Our UI highlights `FactBot` with a dedicated 🤖 Bot Badge and includes a live FactBot simulator in Offline/Mock mode too!

### 1.7 Deterministic User Colors (`djb2` Hash)
In [`backend/src/common/color.util.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/common/color.util.ts):
* Uses a deterministic `djb2` string hash (`hash = (hash * 33) ^ str.charCodeAt(i)`) across a 12-color high-contrast palette so every username always gets the exact same color.
* We port this exact `hashString(name)` algorithm to the React Native `Avatar` and group message sender labels so frontend avatar colors match the backend console logs!

---

## 2. Project Directory Architecture

```text
inClass/ChatApp/
├── README.md                     # Complete documentation, architecture, API & run guide
├── buildPlan.md                  # Full backend analysis, screen wireframes & roadmap (this file)
├── decisions.md                  # Engineering decisions, backend discoveries & learning log
├── backend/                      # Cloned from https://github.com/rt-nst-ru/MobileApp-Bakcend-5thSem
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── prisma/schema.prisma      # User, Conversation, Message MongoDB models
│   └── src/                      # NestJS modules: auth, user, conversation, message, bot, common
└── frontend/                     # Expo + React Native Mobile Application (TypeScript + Expo Router)
    ├── app.json                  # Expo config (cleartext HTTP enabled, image picker permissions)
    ├── package.json              # Expo SDK, expo-router, expo-image-picker, AsyncStorage, vector-icons
    ├── tsconfig.json             # Strict TypeScript config
    ├── app/                      # All Application Screens (Expo Router)
    │   ├── _layout.tsx           # Root Stack Navigator + AuthProvider + ChatProvider + StatusBanner
    │   ├── login.tsx             # Screen 1 (S1): Sign-In / Auto-Provision + Server & Auth Inspector
    │   ├── (tabs)/               # Main Bottom Tab Navigator
    │   │   ├── _layout.tsx       # Bottom Tabs: Chats, Directory, My Profile
    │   │   ├── index.tsx         # Screen 2 (S2): Conversations List (All / DMs / Groups / FactBot)
    │   │   ├── users.tsx         # Screen 3 (S3): User Discovery Directory (Search, Tap to DM, View Profile)
    │   │   └── profile.tsx       # Screen 4 (S4): My Profile, User Lookup Tester & Server/Mock Controls
    │   ├── chat/
    │   │   └── [id].tsx          # Screen 5 (S5): Active Chat Room (Text + Base64 Images, Cursor Pagination)
    │   └── modal/
    │       ├── new-group.tsx     # Screen 6 (S6): Create New Group Chat Modal (Multi-select participants)
    │       ├── chat-info.tsx     # Screen 7 (S7): Conversation Details & Participants Inspector Modal
    │       ├── user-profile.tsx  # Screen 8 (S8): Other User Profile & Direct Message Modal
    │       └── image-viewer.tsx  # Screen 9 (S9): Full-Screen Base64 Image Lightbox Modal
    └── src/
        ├── api/
        │   ├── client.ts         # Custom HTTP client injecting raw `Authorization: Basic <user>:<pass>`
        │   ├── endpoints.ts      # Unified API service routing to Live Backend or Local Mock Engine
        │   └── mockServer.ts     # Stateful Mock Server with FactBot ticker, Base64 images & cursor paging
        ├── context/
        │   ├── AuthContext.tsx   # Credentials, currentUser, serverUrl (10.7.1.51:3000 / localhost:3000), mode
        │   └── ChatContext.tsx   # Users cache, Conversations state, Message pages cache, FactBot toggle
        ├── components/
        │   ├── Avatar.tsx        # Deterministic djb2 hash avatar + FactBot badge
        │   ├── ConversationRow.tsx # Chat list row with DM participant resolution & [IMG] preview tag
        │   ├── MessageBubble.tsx # Text + Base64 Image bubble, sender name, delivery/read status ticks
        │   ├── ImageComposerModal.tsx # Pick image from gallery or generate sample Base64 card + caption
        │   ├── ServerStatusBanner.tsx # Live vs Offline Mock indicator bar with quick switch
        │   └── EmptyState.tsx    # Clean empty & error state cards
        ├── constants/
        │   └── theme.ts          # Modern dark/slate & indigo chat design tokens
        ├── types/
        │   └── api.ts            # Exact TypeScript DTOs matching backend Swagger schemas
        └── utils/
            └── format.ts         # djb2 color hash, relative timestamps, DM name resolver, sample Base64 generator
```

---

## 3. Complete Catalog of Frontend Screens (All 9 Screens & Modals)

Every screen below is designed specifically around the capabilities and constraints of `rt-nst-ru/MobileApp-Bakcend-5thSem`.

---

### Screen 1 (`S1`): Login, Zero-Registration & Server Selector (`app/login.tsx`)
* **Route**: `/login`
* **Backend Endpoint Called**: `GET /user/profile` with `Authorization: Basic <username>:<password>`
* **Purpose**:
  * Authenticates existing users or **auto-provisions** a brand-new user account on first request (`AuthGuard` creates `{ name: username, phone: password }`).
  * Provides **1-Tap Quick Presets** for rapid testing and viva demonstration:
    1. **Aryan (Student Lab Account)**: `aryan.vibhuti2024@nst.rishihood.edu.in` / `Aryan@1122334455`
    2. **Ritesh**: `Ritesh` / `ritesh123`
    3. **Abhinay**: `abhinay` / `abhinay123`
  * **Server Target Switcher**:
    * **Lab Network Server**: `http://10.7.1.51:3000`
    * **Local Docker Backend**: `http://localhost:3000`
    * **Custom IP:Port**: Editable text input
    * **Offline Mock Engine**: Instant local simulation (with optional fallback if the network request times out).
  * **Live Raw Auth Header Preview Card**: Shows the exact `Authorization: Basic <username>:<password>` string sent over the wire to highlight why standard Base64 Basic Auth is not used.

```text
┌────────────────────────────────────────────────────────┐
│  💬 ChatApp                          [🟢 Live / 🧪 Mock] │
│  Sem 05 Mobile Messenger · NestJS + MongoDB            │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  USERNAME (Unique Identifier -> user.name)       │  │
│  │  [ aryan.vibhuti2024@nst.rishihood.edu.in     ]  │  │
│  │                                                  │  │
│  │  PASSWORD (Stored in user.phone)                 │  │
│  │  [ ••••••••••••••••                        👁 ]  │  │
│  │                                                  │  │
│  │  ⚡ Quick Presets: [Aryan] [Ritesh] [abhinay]    │  │
│  │                                                  │  │
│  │  [          Sign In / Auto-Register           ]  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🌐 Backend Connection Configuration             │  │
│  │  (•) Lab Server (http://10.7.1.51:3000)          │  │
│  │  ( ) Local Docker (http://localhost:3000)        │  │
│  │  ( ) Offline Mock Mode (Built-in Simulator)      │  │
│  │  URL: [ http://10.7.1.51:3000                 ]  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  🔐 Wire Header Preview (Plaintext, non-Base64):       │
│  Authorization: Basic aryan.vibhuti2024@nst...:Aryan*  │
└────────────────────────────────────────────────────────┘
```

---

### Screen 2 (`S2`): Conversations List (`app/(tabs)/index.tsx`)
* **Route**: `/(tabs)` (Tab 1: **Chats**)
* **Backend Endpoints Called**: `GET /conversation`, `GET /user` (to resolve participant names)
* **Purpose**:
  * Displays all conversations where `participants_ids` includes the logged-in user, ordered newest first (`createdAt: 'desc'`).
  * **Smart Title Resolution**:
    * For `GROUP` conversations: Displays `conversation.name` (e.g., `"Team Study Group"`) and member count badge.
    * For `DM` conversations: Resolves the *other* participant from `participants_ids` via the cached `usersById` map (so both participants see the other person's name rather than seeing their own name if they received the DM).
    * For `FactBot` DMs: Displays a special `🤖 BOT` pill badge.
  * **Filter Chips**: `All`, `Direct (DMs)`, `Groups`, `🤖 FactBot`.
  * **Search Bar**: Filters conversations by resolved display name, group name, or participant name.
  * **Quick Actions**:
    * Header `[+ Group]` button → opens `S6` (`New Group Modal`).
    * Floating Action Button `[💬 New DM]` → navigates to `S3` (`User Directory`).
    * Pull-to-refresh reloads conversations and user list.

```text
┌────────────────────────────────────────────────────────┐
│  Chats                               [+ New Group] 🔄  │
│  🔍 [ Search chats or participants...               ]  │
│  [ All (5) ]  [ DMs (3) ]  [ Groups (1) ]  [ 🤖 Bot ]  │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  FactBot  [🤖 BOT]                 Just now  │
│  │  FB  │  The legendary Fast Inverse Square Root...   │
│  └──────┘  DM · Auto-Facts Stream                      │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  Ritesh                            11:42 AM  │
│  │  RI  │  Hello Sir                              ✓✓   │
│  └──────┘  DM · 2 participants                         │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  Team Study Group                 Yesterday  │
│  │  TS  │  📷 [Image] Here is the Prisma schema diagram │
│  └──────┘  GROUP · 3 members                           │
├────────────────────────────────────────────────────────┤
│                                              ┌───────┐ │
│                                              │ 💬 DM │ │
│                                              └───────┘ │
├────────────────────────────────────────────────────────┤
│    [ 💬 Chats ]     [ 👥 Directory ]    [ 👤 Profile ]  │
└────────────────────────────────────────────────────────┘
```

---

### Screen 3 (`S3`): User Discovery Directory (`app/(tabs)/users.tsx`)
* **Route**: `/(tabs)/users` (Tab 2: **Directory**)
* **Backend Endpoints Called**:
  * `GET /user` (lists all registered users ordered alphabetically by `name: 'asc'`)
  * `POST /conversation` with `{ type: 'DM', participants_ids: [targetUser.id] }`
* **Purpose**:
  * Lets the user browse and search every registered classmate/user on the server (including `FactBot`).
  * Shows each user's deterministic `djb2`-colored `Avatar`, `name`, `bio` (or `"No bio set"`), and `24-char MongoDB ObjectId`.
  * **Two Actions per User Row**:
    1. **Tap `[ 💬 Message ]`**: Calls `POST /conversation` with `{ type: 'DM', participants_ids: [user.id] }`. Because the backend checks `hasEvery: [callerId, otherId]`, this idempotently opens the existing DM or creates a new one, then navigates to `S5` (`Active Chat Room`).
    2. **Tap Avatar / `[ ⓘ Profile ]`**: Opens `S8` (`User Profile Modal`) which calls `GET /user/profile?user_id=<id>` to inspect that user's profile resource.

```text
┌────────────────────────────────────────────────────────┐
│  User Directory                         14 Users Found │
│  🔍 [ Search by name, bio, or MongoDB ObjectId...   ]  │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  abhinay                      [ⓘ] [ 💬 DM ]  │
│  │  AB  │  Bio: No bio set                             │
│  └──────┘  ID: 6ae190cf596b5b3b79cac734                │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  FactBot  [🤖 BOT]            [ⓘ] [ 💬 DM ]  │
│  │  FB  │  Bio: I am a FactBot 🤖                      │
│  └──────┘  ID: 6ae19000596b5b3b79cac701                │
├────────────────────────────────────────────────────────┤
│  ┌──────┐  Ritesh                       [ⓘ] [ 💬 DM ]  │
│  │  RI  │  Bio: Building cool stuff 🚀                 │
│  └──────┘  ID: 6ae191ea596b5b3b79cac73e                │
├────────────────────────────────────────────────────────┤
│    [ 💬 Chats ]     [ 👥 Directory ]    [ 👤 Profile ]  │
└────────────────────────────────────────────────────────┘
```

---

### Screen 4 (`S4`): My Profile, Endpoint Tester & FactBot Control (`app/(tabs)/profile.tsx`)
* **Route**: `/(tabs)/profile` (Tab 3: **Profile**)
* **Backend Endpoints Called**: `GET /user/profile` (own profile) and `GET /user/profile?user_id=<id>` (target profile lookup)
* **Purpose**:
  * **Caller Profile Card**: Displays the logged-in user's `id` (with Copy button), `name`, `bio`, and deterministic `djb2` color swatch.
  * **Interactive `GET /user/profile?user_id=` Tester**: Allows pasting or selecting any `24-char ObjectId` to test the query-parameterized `/user/profile` endpoint live and view the raw JSON response.
  * **Network & Mode Controls**:
    * Toggle between **Live Server (`http://10.7.1.51:3000` / `http://localhost:3000`)** and **Offline Mock Mode**.
    * **FactBot Simulator Control** (in Mock Mode): Toggle the 10-second `FactBot` auto-message ticker or tap **"Trigger FactBot Message Now"** to immediately demonstrate incoming bot messages during a demo!
  * **Sign Out / Switch Account**: Clears stored session and returns to `S1` (`/login`).

---

### Screen 5 (`S5`): Active Chat Room — Text, Base64 Images & Reverse-Cursor Pagination (`app/chat/[id].tsx`)
* **Route**: `/chat/[id]`
* **Backend Endpoints Called**:
  * `GET /message?conversation_id=<id>` (initial page of 20 newest messages)
  * `GET /message?conversation_id=<id>&from_message_cursor=<nextCursor>` (older pages of 20 messages)
  * `POST /message` with `{ conversation_id: string, content?: string, imageInfo?: string }`
* **Purpose**:
  * **Header Bar**: Back button, resolved conversation title (`Ritesh` or `Team Study Group`), subtitle (`DM · 2 participants` or `GROUP · 3 participants`), and `[ ⓘ Info ]` button opening `S7` (`Conversation Info Modal`).
  * **Message History & Cursor Pagination**:
    * Renders messages in natural chronological order (`oldest -> newest` within each page, auto-scrolled to the newest message at the bottom).
    * **Load Older Messages Banner / Scroll Trigger**: Displays `"↑ Load Older Messages (Cursor: 6ae19...)"` when `nextCursor !== null`, or `"🎉 Beginning of conversation history"` when `nextCursor === null`.
    * **Auto-Polling**: Polls `GET /message?conversation_id=<id>` every 4 seconds while the screen is active so new messages from classmates or `FactBot` appear live.
  * **Rich Message Bubbles (`MessageBubble.tsx`)**:
    * **Sender Attribution**: In `GROUP` chats, displays the sender's name colored deterministically with the backend's `djb2` palette.
    * **Base64 Image Rendering (`imageInfo`)**: If `message.imageInfo` is present (`data:image/...;base64,...`), renders a crisp inline image thumbnail inside the bubble. Tapping the image opens `S9` (`Full-Screen Image Lightbox`).
    * **Text Content (`content`)**: Renders text or caption below the image. Supports text-only, image-only, or combined text + image messages!
    * **Per-Participant Delivery & Read Status (`status` JSON)**:
      * Inspects `message.status`:
        * If all other participants have `read: true` → Double cyan check (`✓✓ Read`)
        * If any other participant has `delivered: true` → Double grey check (`✓✓ Delivered`)
        * If other participants have `{ delivered: false, read: false }` (backend default on creation) → Single check (`✓ Sent`)
      * Long-pressing or tapping a message bubble shows a mini **Delivery Breakdown Pill** listing each participant's `{ delivered, read }` state from `message.status`.
  * **Composer Bar (Text + Base64 Image Attachment)**:
    * `[ 📷 ]` Attachment Button: Opens the **Image Attachment Sheet** allowing the user to:
      1. Pick a photo from device gallery (`expo-image-picker` with `base64: true` & compressed quality to stay well under the `10mb` backend limit), OR
      2. Pick a **Generated Sample Base64 Card** (e.g. Diagram, Code Card, Viva Badge) so image messaging can be tested instantly on any simulator even without library photos!
    * **Staged Image Preview Bar**: Shows a thumbnail preview with an `[ ✕ ]` remove button above the text input before sending.
    * **Text Input + `[ Send ➤ ]` Button**: Dispatches `POST /message` with `content`, `imageInfo`, or both.

```text
┌────────────────────────────────────────────────────────┐
│  ←  [RI]  Ritesh                                  [ⓘ]  │
│           DM · ID: 6ae1927c... · Live Polling          │
├────────────────────────────────────────────────────────┤
│       [ ↻ Load older messages (cursor: 6ae192...) ]    │
│                                                        │
│  ┌────────────────────────────────────┐                │
│  │ Ritesh                             │                │
│  │ Hey Aryan, try sending a Base64    │                │
│  │ image and text to POST /message!   │                │
│  │ 06:12 AM                           │                │
│  └────────────────────────────────────┘                │
│                                                        │
│                ┌────────────────────────────────────┐  │
│                │ ┌────────────────────────────────┐ │  │
│                │ │     🖼️ [Base64 Image URI]      │ │  │
│                │ │      (Tap for Fullscreen)      │ │  │
│                │ └────────────────────────────────┘ │  │
│                │ Hello Sir, here is the screenshot! │  │
│                │ 06:13 AM                    ✓ Sent │  │
│                └────────────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│  🖼️ [Staged Image Attached: data:image/png;base64] [✕] │
│  [📷]  [ Write a message...                 ]  [ ➤ ]   │
└────────────────────────────────────────────────────────┘
```

---

### Screen 6 (`S6`): Create New Group Conversation Modal (`app/modal/new-group.tsx`)
* **Route**: `/modal/new-group` (presented as a modal sheet)
* **Backend Endpoint Called**:
  * `POST /conversation` with:
    ```json
    {
      "type": "GROUP",
      "name": "Team Study Group",
      "participants_ids": ["6ae191ea596b5b3b79cac73e", "6ae190cf596b5b3b79cac734"]
    }
    ```
* **Purpose**:
  * Input field for **Group Name** (e.g. `"Team Study Group"`).
  * Selected Participants horizontal chip strip (tap chip to remove).
  * Searchable list of all users from `GET /user` (excluding the caller, since the backend automatically adds `callerId` and deletes `callerId` from `participants_ids` before checking `participantIds.size === 0`).
  * Enforces selecting at least 1 other participant and entering a group name, then creates the group and navigates straight into `app/chat/[id].tsx`.

---

### Screen 7 (`S7`): Conversation Info & Participant Inspector Modal (`app/modal/chat-info.tsx`)
* **Route**: `/modal/chat-info?conversationId=<id>`
* **Backend Endpoints Used**: Cached `ConversationResponseDto` + `GET /user/profile?user_id=<id>`
* **Purpose**:
  * Displays full metadata for the active conversation:
    * Conversation Avatar & Resolved Title
    * Raw `conversation.name` stored in MongoDB (e.g. `"[DM] Ritesh"` or `"Team Study Group"`)
    * Conversation `id` (`24-char ObjectId`), `type` (`DM` or `GROUP`), `createdAt` timestamp, and `createdBy` creator user.
  * **Participant Roster**:
    * Lists every ObjectId in `conversation.participants_ids` resolved to their `UserResponseDto` (`name`, `bio`, `"You"` badge, `"Creator"` badge).
    * Tapping any participant opens `S8` (`User Profile Modal`) or starts a direct 1-on-1 DM with them.

---

### Screen 8 (`S8`): User Profile Inspector Modal (`app/modal/user-profile.tsx`)
* **Route**: `/modal/user-profile?userId=<id>`
* **Backend Endpoint Called**: `GET /user/profile?user_id=<id>`
* **Purpose**:
  * Directly exercises the `GET /user/profile?user_id=<ObjectId>` endpoint on the backend.
  * Shows the user's large deterministic `Avatar`, `name`, `bio`, `ObjectId`, and whether they are a human classmate or `FactBot`.
  * Includes a primary **`[ 💬 Start Direct Message ]`** button that calls `POST /conversation` (`{ type: 'DM', participants_ids: [userId] }`) and opens the DM thread.

---

### Screen 9 (`S9`): Full-Screen Base64 Image Lightbox Modal (`app/modal/image-viewer.tsx`)
* **Route**: `/modal/image-viewer`
* **Purpose**:
  * Displays any `message.imageInfo` Base64 data URI in full-screen high-contrast view with sender name, timestamp, caption, and Base64 payload size inspector (e.g., `mime: image/jpeg · size: 42.8 KB`).

---

## 4. Exact TypeScript DTO Mapping (`frontend/src/types/api.ts`)

```typescript
// Matches backend/src/user/dto/user.dto.ts
export interface UserResponseDto {
  id: string;
  name: string;
  bio?: string | null;
}

// Matches backend/src/conversation/dto/conversation.dto.ts
export type ConversationType = 'DM' | 'GROUP';

export interface CreateConversationDto {
  type?: ConversationType;
  name?: string;
  participants_ids?: string[];
}

export interface ConversationResponseDto {
  id: string;
  name?: string | null;
  type: ConversationType | string;
  createdAt: string;
  createdBy: string;
  participants_ids: string[];
}

// Matches backend/src/message/dto/message.dto.ts
export interface GetMessagesDto {
  conversation_id: string;
  from_message_cursor?: string;
}

export interface CreateMessageDto {
  conversation_id: string;
  content?: string;
  imageInfo?: string;
}

export interface MessageDeliveryStatus {
  delivered: boolean;
  read: boolean;
}

export interface MessageResponseDto {
  id: string;
  content?: string | null;
  imageInfo?: string | null;
  createdAt: string;
  senderId: string;
  conversationId: string;
  status: Record<string, MessageDeliveryStatus>;
}

export interface PaginatedMessagesResponseDto {
  data: MessageResponseDto[];
  nextCursor?: string | null;
  count: number;
}
```

---

## 5. Implementation Phases

1. **Phase 1 — Expo Project Initialization**: Scaffold `frontend/` with Expo SDK, Expo Router, TypeScript, `expo-image-picker`, and `@react-native-async-storage/async-storage`.
2. **Phase 2 — API Client & Stateful Mock Backend**: Implement `client.ts` (raw `Basic <username>:<password>`), `mockServer.ts` (matching the exact Prisma/NestJS logic in `backend/`, including `[DM] <name>`, `FactBot` 200-fact generator, Base64 `imageInfo` normalization, and 20-message reverse-cursor paging), and `endpoints.ts`.
3. **Phase 3 — Context Providers (`AuthContext` & `ChatContext`)**: Session persistence, automatic user directory caching, DM title resolution, and live polling.
4. **Phase 4 — All 9 Screens & Modals (`S1`–`S9`)**: Build `login.tsx`, `(tabs)/index.tsx`, `(tabs)/users.tsx`, `(tabs)/profile.tsx`, `chat/[id].tsx`, `modal/new-group.tsx`, `modal/chat-info.tsx`, `modal/user-profile.tsx`, and `modal/image-viewer.tsx`.
5. **Phase 5 — Verification & Documentation**: Type-check with `tsc --noEmit`, verify web/mobile bundle, and update root `README.md`.
