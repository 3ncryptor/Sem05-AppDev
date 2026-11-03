# Comprehensive React Native & UI Engineering Notes (Viva Preparation Guide)

**Project:** `inClass/ChatApp` — Minimalist Editorial Messaging Client  
**Framework:** React Native (`0.88.1`) + Expo SDK 58 + Expo Router (`~58.0.29`) + TypeScript (`~6.0.3`)  
**Aesthetic Direction:** Warm Editorial Beige ("Quiet Luxury" Minimalist Design, 100% Vector Iconography via `@expo/vector-icons`, Zero Emojis)

---

## Table of Contents

1. [Executive Summary (30-Second Viva Pitch)](#1-executive-summary-30-second-viva-pitch)
2. [Project Architecture & File-Based Routing (`Expo Router`)](#2-project-architecture--file-based-routing-expo-router)
3. [Design System & Styling Engine (`StyleSheet` & Theme Tokens)](#3-design-system--styling-engine-stylesheet--theme-tokens)
4. [Device Ergonomics: Safe Areas, Android 3-Button Nav & Keyboard Handling](#4-device-ergonomics-safe-areas-android-3-button-nav--keyboard-handling)
5. [Animation Architecture in React Native (`Animated` & `LayoutAnimation`)](#5-animation-architecture-in-react-native-animated--layoutanimation)
6. [Touch & Gesture Engineering (`PanResponder`, Double-Tap, Long-Press)](#6-touch--gesture-engineering-panresponder-double-tap-long-press)
7. [High-Performance Lists & Reverse-Cursor Pagination (`FlatList`)](#7-high-performance-lists--reverse-cursor-pagination-flatlist)
8. [State Management, Context Architecture & `AsyncStorage` Persistence](#8-state-management-context-architecture--asyncstorage-persistence)
9. [Networking, Device Tunneling & Dual-Mode (`Live` vs `Mock`) Engine](#9-networking-device-tunneling--dual-mode-live-vs-mock-engine)
10. [Media Pipeline: `expo-image-picker` & Base64 Data URI Rendering](#10-media-pipeline-expo-image-picker--base64-data-uri-rendering)
11. [Component-by-Component UI Breakdown](#11-component-by-component-ui-breakdown)
12. [Top 20 Viva Questions & Model Answers](#12-viva-questions--model-answers-react-native-focused)

---

## 1. Executive Summary (30-Second Viva Pitch)

> **"What did you build and what makes your React Native implementation stand out?"**
>
> "We built a full-featured mobile messaging application in **React Native with Expo SDK 58 and TypeScript**, structured around file-based routing with **Expo Router**.  
> On the UI/UX side, we designed a **Minimalist Warm Editorial Beige** design system using strictly vector icons (`Ionicons`) and zero emojis. We engineered advanced mobile micro-interactions from flagship apps like Telegram, iMessage, and Slack using React Native's native-driver `Animated` API, `PanResponder` gesture handlers, and `LayoutAnimation`:
> - **Swipe-to-Pin & Swipe-to-Mute** on inbox conversation cards,
> - **Swipe-to-Quote Reply** and **Double-Tap Heart Burst** on message bubbles,
> - **Shimmer Skeletons** for initial network hydration,
> - **Stacked Mini Read-Receipt Avatars** and an expandable per-member **Delivery & Read Matrix**,
> - **In-Chat Search**, **Saved/Bookmarked Messages**, **Slash (`/`) Command Templates**, and **Android 3-Button Navigation Safe-Area Clearance**."

---

## 2. Project Architecture & File-Based Routing (`Expo Router`)

Unlike older React Native setups that manually wire `createNativeStackNavigator` and `createBottomTabNavigator` inside `App.tsx`, this project uses **Expo Router**, which brings filesystem-based routing (similar to Next.js) on top of **React Navigation**.

### Directory Map (`frontend/`)

```text
frontend/
├── app/                           # Expo Router file-based screens
│   ├── _layout.tsx                # Root Provider tree + Auth Guard + Stack Navigator
│   ├── login.tsx                  # Auth & Server Endpoint Configuration screen
│   ├── (tabs)/                    # Bottom Tab Navigator Group (parentheses = route group)
│   │   ├── _layout.tsx            # Tab Bar config + Unread badge + Android 3-btn inset padding
│   │   ├── index.tsx              # Tab 1: Messages Inbox (Quick Connect, Filters, Swipe rows)
│   │   ├── users.tsx              # Tab 2: User Directory (Spotlight Carousel + Search)
│   │   └── profile.tsx            # Tab 3: Settings, Workspace Stats & API Inspector
│   ├── chat/
│   │   └── [id].tsx               # Dynamic Route: Active Chat Room for conversation `id`
│   └── modal/                     # Native Modal Presentation routes
│       ├── new-group.tsx          # Multi-select Group Creation sheet
│       ├── chat-info.tsx          # Conversation Details, Shared Media Grid & Saved Messages
│       ├── user-profile.tsx       # User Profile inspector (`GET /user/profile?id=UID`)
│       └── image-viewer.tsx       # Fullscreen Base64 Photo Lightbox
└── src/
    ├── api/
    │   ├── client.ts              # Fetch wrapper + AbortController timeout + Plaintext Basic Auth
    │   ├── endpoints.ts           # Dual-mode router (Live HTTP vs Offline Mock Server)
    │   └── mockServer.ts          # Stateful AsyncStorage-backed local simulator + FactBot
    ├── components/
    │   ├── Avatar.tsx             # Deterministic hash-colored initials / vector badge avatar
    │   ├── ConversationRow.tsx    # PanResponder swipeable inbox card + unread & receipt pills
    │   ├── MessageBubble.tsx      # Swipe-to-reply, double-tap burst, reaction dock & receipts
    │   ├── Skeleton.tsx           # Synchronized Animated.loop shimmer skeletons
    │   ├── ServerStatusBanner.tsx # Live/Offline status bar with quick mode toggle
    │   └── EmptyState.tsx         # Reusable vector-illustrated empty state
    ├── constants/
    │   └── theme.ts               # Centralized COLORS, SPACING, RADIUS, SHADOWS tokens
    ├── context/
    │   ├── AuthContext.tsx        # Session state, AsyncStorage hydration, localhost URL sanitizer
    │   └── ChatContext.tsx        # Conversations, cursor pagination, pins, mutes, stars, reactions
    ├── types/
    │   └── api.ts                 # Strict TypeScript DTO interfaces mirroring NestJS backend
    └── utils/
        └── format.ts              # Deterministic color hashing, relative timestamps, sample Base64s
```

### How the Authentication Guard Works (`app/_layout.tsx`)
In [`app/_layout.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/_layout.tsx), `RootNavigationGuard` uses two Expo Router hooks:
- `useSegments()`: Returns the active route segments array (e.g. `['login']` or `['(tabs)', 'users']`).
- `useRouter()`: Provides imperative navigation (`router.replace()`, `router.push()`, `router.back()`).

```tsx
useEffect(() => {
  if (!isHydrated) return; // Wait until AsyncStorage finishes reading session

  const onLoginScreen = segments[0] === 'login';
  if (!currentUser && !onLoginScreen) {
    router.replace('/login'); // Redirect unauthenticated users to Login
  } else if (currentUser && onLoginScreen) {
    router.replace('/(tabs)'); // Redirect logged-in users into Tabs
  }
}, [currentUser, isHydrated, router, segments]);
```
**Why `router.replace` instead of `router.push`?**  
`replace` swaps the current history entry instead of pushing onto the stack, preventing the user from pressing the Android hardware Back button after logging out and accidentally returning to a protected screen.

---

## 3. Design System & Styling Engine (`StyleSheet` & Theme Tokens)

All design tokens live in [`src/constants/theme.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/constants/theme.ts).

### Why `StyleSheet.create()` instead of inline objects?
1. **Validation & Type Checking:** TypeScript validates every CSS-like property (`ViewStyle`, `TextStyle`, `ImageStyle`) at compile time.
2. **Memory Reuse:** Inline objects (`style={{ padding: 16 }}`) allocate a brand-new JavaScript object on every render pass. `StyleSheet.create` allocates static style structures once at module load time.

### Key Visual Decisions in `theme.ts`
- **Warm Editorial Beige Palette:**
  - `bgPrimary: '#F7F4EF'` (Warm Alabaster / Linen canvas—reduces eye strain compared to harsh `#FFFFFF` backgrounds)
  - `bgSecondary: '#FFFFFF'` (Pure Ivory elevated cards—creates natural figure/ground depth against the `#F7F4EF` canvas)
  - `bgTertiary: '#EFECE6'` (Soft Sand for filter pills, search inputs, and inactive badges)
  - `accent: '#2C2520'` (Deep Espresso for outgoing chat bubbles, primary CTAs, and active pills)
  - `accentLight: '#8C6D53'` (Warm Bronze for AI Bot indicators, pin icons, and quoted reply borders)
- **Sub-pixel Borders (`StyleSheet.hairlineWidth`):**
  - Instead of `borderWidth: 1` (which looks thick on high-DPI OLED screens), we use `StyleSheet.hairlineWidth` (`~0.33px` on 3x retina displays) with `COLORS.border` (`#E6E1D8`).
- **Cross-Platform Shadows (`SHADOWS.card` & `SHADOWS.floating`):**
  - iOS uses `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius`.
  - Android ignores iOS shadow properties and requires `elevation` (Material surface elevation). Both are combined in `SHADOWS` so cards look identical on iOS and Android.

---

## 4. Device Ergonomics: Safe Areas, Android 3-Button Nav & Keyboard Handling

One of the most common viva topics in React Native is handling physical device cutouts (notches, Dynamic Island, status bars) and system navigation bars.

### 1. Android 3-Button Navigation Bar Clearance
On phones configured with the classic Android 3-button bottom navigation bar (**Back ◀**, **Home ●**, **Recents ■**), standard bottom tab bars and chat input composers often sit too close to the system keys.

In [`app/(tabs)/_layout.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/(tabs)/_layout.tsx) and [`app/chat/[id].tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/chat/%5Bid%5D.tsx), we use `useSafeAreaInsets()` from `react-native-safe-area-context`:

```tsx
const insets = useSafeAreaInsets();
const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
```
We dynamically add `bottomInset` to both `height: 62 + bottomInset` and `paddingBottom: bottomInset` on the `Tabs` bar and the chat room `composerBar`. This guarantees a generous cushion above the Android system buttons on every screen size.

### 2. `KeyboardAvoidingView` in the Chat Room
When the soft keyboard opens in [`app/chat/[id].tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/chat/%5Bid%5D.tsx), the message composer must rise smoothly above the keyboard without covering the latest messages:

```tsx
<KeyboardAvoidingView
  style={styles.flex}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
>
```
- **Why `Platform.OS` branching?** iOS view hierarchies respond best to `behavior="padding"`, whereas Android window resizing works reliably with `behavior="height"`.

---

## 5. Animation Architecture in React Native (`Animated` & `LayoutAnimation`)

We used two complementary animation systems built into React Native:

### A. `Animated` API with `useNativeDriver: true`
Used for continuous 60/120 FPS physics and opacity transitions.
- **How `useNativeDriver: true` works:** Before the animation starts, React Native serializes the animation configuration across the bridge/JSI to the native UI thread (iOS CoreAnimation / Android RenderThread). Even if the JavaScript thread is busy parsing JSON or filtering lists, the animation never drops a frame.
- **Constraint to remember for Viva:** `useNativeDriver: true` only supports non-layout properties (`transform: [{ scale }, { translateX }, { translateY }]` and `opacity`). It cannot animate `width`, `height`, or `padding`.

#### Where we used `Animated`:
1. **Shimmer Skeletons ([`src/components/Skeleton.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/Skeleton.tsx)):**
   Uses `Animated.loop(Animated.sequence([...]))` cycling `opacity` between `0.45` and `1.0` over `750ms` to create a warm-sand pulse while conversations or messages load.
2. **Tactile Card Press Scaling ([`ConversationRow.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/ConversationRow.tsx) & [`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx)):**
   `onPressIn` springs `scaleAnim` to `0.98`, and `onPressOut` springs back to `1.0` with `bounciness: 6`.
3. **Message Entrance Animation ([`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx)):**
   Uses `Animated.parallel` to simultaneously fade in (`opacity: 0 -> 1`) and slide up (`translateY: 8 -> 0`) when a bubble mounts.
4. **Double-Tap Heart Burst ([`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx)):**
   Uses `Animated.sequence` (`scale: 0.3 -> 1.25 -> 0`) to pop a floating heart badge over the bubble on double-tap.
5. **Send Button Micro-Bounce ([`app/chat/[id].tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/chat/%5Bid%5D.tsx)):**
   Springs `sendBtnScale` (`1 -> 0.86 -> 1`) whenever a message is dispatched.

### B. `LayoutAnimation.configureNext()`
Used whenever React state changes cause elements to mount, unmount, or resize in the layout tree:
```tsx
LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
setShowStatusBreakdown((prev) => !prev);
```
**Where we used `LayoutAnimation`:**
- Expanding/collapsing the **Delivery & Read Matrix** inside `MessageBubble`.
- Opening/closing the **Long-Press Reaction Dock**.
- Showing/hiding the **Quote-Reply Banner**, **Attachment Sheet**, and **In-Chat Search Bar**.
- Re-sorting the inbox when a conversation is **Pinned** to the top.

---

## 6. Touch & Gesture Engineering (`PanResponder`, Double-Tap, Long-Press)

### 1. Horizontal Swipe Gestures via `PanResponder`
Both [`ConversationRow.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/ConversationRow.tsx) and [`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx) implement custom horizontal swipe gestures using React Native's `PanResponder`.

#### How Gesture Disambiguation Works (Horizontal Swipe vs Vertical `FlatList` Scroll)
If a user scrolls up and down in a `FlatList`, the row should **not** hijack the touch. We solve this in `onMoveShouldSetPanResponder`:

```tsx
onMoveShouldSetPanResponder: (_, gesture) =>
  Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
```
- `gesture.dx` is horizontal finger displacement; `gesture.dy` is vertical displacement.
- The row only claims the gesture if the finger moves at least `16px` horizontally **and** the horizontal movement is at least `1.6x` greater than vertical movement.
- As the user drags, `onPanResponderMove` clamps `gesture.dx` and updates `translateX.setValue(clamped)`.
- In `ConversationRow`, we use `translateX.interpolate()` to progressively fade in the left **"Pin"** action rail (`0 -> 70px`) or the right **"Mute"** action rail (`-70 -> 0px`).
- On finger release (`onPanResponderRelease`), if `gesture.dx` exceeded the threshold (`> 64px` or `< -64px`), the action fires (`onTogglePin()` / `onToggleMute()` or `onReply()`), and `Animated.spring` snaps `translateX` smoothly back to `0`.

### 2. Multi-Gesture Arbitration on `MessageBubble` (Single Tap vs Double Tap vs Long Press)
In [`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx), a single `Pressable` handles three distinct gestures:
1. **Single Tap:** Expands/collapses the per-user **Read Receipt Matrix**.
2. **Double Tap (< 280ms between taps):** Tracked via `const lastTapRef = useRef<number>(0)`. If `Date.now() - lastTapRef.current < 280`, it triggers `onToggleReaction('heart')` and plays the heart burst animation.
3. **Long Press (`delayLongPress={230}`):** Opens the floating **6-Icon Vector Reaction Bar & Quick Tool Dock** (`Reply`, `Save`, `Copy`, `Receipts`).

---

## 7. High-Performance Lists & Reverse-Cursor Pagination (`FlatList`)

### Why `FlatList` instead of `ScrollView`?
`ScrollView` mounts **all** children into native memory at once, which causes frame drops when a chat thread grows to hundreds of messages. `FlatList` **virtualizes** rendering—only mounting items inside or near the visible viewport window and recycling offscreen views.

### Key `FlatList` Props Used in Our Codebase
- `keyExtractor={(item) => item.id}`: Gives React stable MongoDB ObjectId keys so re-renders don't destroy component state.
- `ListHeaderComponent`:
  - In **Inbox (`app/(tabs)/index.tsx`)**: Renders the horizontal **Active Directory** strip so it scrolls naturally with the conversation list.
  - In **Chat Room (`app/chat/[id].tsx`)**: Renders the **"Load earlier messages"** reverse-pagination button (or the "Beginning of conversation" card when `nextCursor === null`).
- `ListEmptyComponent`: Renders [`EmptyState.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/EmptyState.tsx) when filters or searches return zero items.
- `refreshControl={<RefreshControl refreshing={...} onRefresh={...} />}`: Native pull-to-refresh spinner.
- `onScroll` + `scrollEventThrottle={32}`: Calculates distance from the bottom of the chat thread (`contentSize.height - layoutMeasurement.height - contentOffset.y > 180`) to show/hide the floating **Jump-to-Bottom** button.

### How Reverse-Cursor Pagination Works (`ChatContext.tsx`)
1. The backend `GET /message?conversation_id=CID` returns the newest 20 messages in descending order (`newest -> oldest`) along with `nextCursor` (the ObjectId of the oldest message in that batch).
2. Our frontend normalizes each page into chronological order (`oldest -> newest`) for natural top-to-bottom chat reading.
3. When the user taps **Load earlier messages**, `loadOlderMessages(conversationId)` calls `GET /message?conversation_id=CID&from_message_cursor=<nextCursor>`.
4. We deduplicate and merge older and newer messages using a JavaScript `Map<string, MessageResponseDto>()` keyed by `message.id`, then sort by `createdAt`:
   ```tsx
   const mapById = new Map<string, MessageResponseDto>();
   for (const m of res.data) mapById.set(m.id, m);
   for (const m of prevList) mapById.set(m.id, m);
   const merged = Array.from(mapById.values()).sort(
     (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
   );
   ```

---

## 8. State Management, Context Architecture & `AsyncStorage` Persistence

Instead of adding external Redux boilerplate, the app uses a clean **two-layer React Context architecture** optimized with `useMemo` and `useCallback`:

### 1. `AuthContext` ([`src/context/AuthContext.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/context/AuthContext.tsx))
- Manages `credentials`, `currentUser`, `baseUrl`, `mode` (`'live' | 'mock'`), and `isHydrated`.
- Persists the entire session to `@react-native-async-storage/async-storage` under `@chatapp_auth_session_v2` so closing and reopening Expo Go keeps the user logged in.

### 2. `ChatContext` ([`src/context/ChatContext.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/context/ChatContext.tsx))
- Manages:
  - Server-synced state: `users`, `usersById` (O(1) lookup dictionary), `conversations`, `messagesByConvId`, `lastMessageByConvId`.
  - Client-persisted UX enhancements (stored in `AsyncStorage` without requiring backend schema changes):
    - `pinnedConvIds`: Conversations pinned to the top of the inbox.
    - `mutedConvIds`: Conversations with muted notifications.
    - `starredMessageIds`: Bookmarked/saved messages inside chat threads.
    - `reactionsByMessageId`: Vector icon reactions attached to individual messages.

### 3. How Quoted Replies Work Without Modifying the Backend Schema
The backend `CreateMessageDto` has `forbidNonWhitelisted: true` and only accepts `{ conversation_id, content, imageInfo }`.  
To support **Telegram-style Swipe-to-Quote Replies** without changing the backend:
- When replying, [`app/chat/[id].tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/chat/%5Bid%5D.tsx) formats `content` using a markdown quote header:
  ```text
  > Ritesh: Are we meeting at the lab?

  Yes, I will be there in 10 minutes.
  ```
- When rendering, `parseQuotedContent()` in [`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx) parses `^> ([^:\n]+): ([^\n]+)\n\n([\s\S]*)$` and renders a dedicated **Quoted Reply Card** with a bronze left accent border above the message body.

---

## 9. Networking, Device Tunneling & Dual-Mode (`Live` vs `Mock`) Engine

### 1. Custom Plaintext Basic Auth (`src/api/client.ts`)
Standard HTTP Basic Auth encodes `username:password` in Base64. However, inspecting the backend [`backend/src/auth/auth.guard.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/auth/auth.guard.ts) revealed that the server slices `"Basic "` and splits directly on `:` in plaintext.  
Therefore, [`buildPlaintextBasicAuthHeader`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/api/client.ts#L24-L26) sends:
```ts
Authorization: `Basic ${creds.username.trim()}:${creds.password.trim()}`
```

### 2. Request Timeouts with `AbortController`
Native `fetch()` in React Native can hang for 60+ seconds if a campus IP (`10.7.1.51`) is unreachable. We wrap every request in [`httpRequest`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/api/client.ts#L41-L123) with a `5000ms` `AbortController` timeout and normalize errors into a typed `ApiError`.

### 3. Why `localhost:3000` Fails on a Physical Phone & How We Solved It
When running Expo Go on a physical Android phone, `http://localhost:3000` refers to the **Android phone's own loopback interface (`127.0.0.1`)**, not the Mac running Docker.
- We exposed the Mac's Docker container (`localhost:3000`) over a **Cloudflare HTTP/2 HTTPS Tunnel** (`https://excellent-shelf-controlled-std.trycloudflare.com`).
- We added `sanitizeServerUrlForDevice()` in [`AuthContext.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/context/AuthContext.tsx#L18-L32), which checks `Platform.OS !== 'web'` and automatically rewrites any cached `localhost` or `127.0.0.1` URL to the active Cloudflare HTTPS Tunnel.

---

## 10. Media Pipeline: `expo-image-picker` & Base64 Data URI Rendering

1. **Picking & Encoding (`app/chat/[id].tsx`):**
   We call `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.45, base64: true })`.
2. **Formatting as RFC 2397 Data URI:**
   We prefix the returned base64 payload with its MIME type:
   ```ts
   `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
   ```
3. **Fallback Preset Cards:**
   For emulators or devices without gallery photos, we provide 3 instant Base64 sample cards (`SAMPLE_BASE64_IMAGES` in [`src/utils/format.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/utils/format.ts)).
4. **Rendering:**
   React Native's `<Image source={{ uri: message.imageInfo }} />` natively decodes `data:image/...;base64,...` strings both inside [`MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx) and in the fullscreen lightbox modal ([`app/modal/image-viewer.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/modal/image-viewer.tsx)).

---

## 11. Component-by-Component UI Breakdown

| Component / Screen | File Path | Key UI & React Native Features |
| :--- | :--- | :--- |
| **Avatar** | [`src/components/Avatar.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/Avatar.tsx) | Deterministic djb2-style hash (`getUserColor`) maps any username to a consistent muted earth-tone palette color; renders `sparkles-outline` for FactBot and `people-outline` for groups. |
| **Skeleton** | [`src/components/Skeleton.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/Skeleton.tsx) | `SkeletonBox`, `ConversationListSkeleton`, and `ChatHistorySkeleton` using `Animated.loop` native-driver opacity pulsing. |
| **ConversationRow** | [`src/components/ConversationRow.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/ConversationRow.tsx) | `PanResponder` swipe-right to Pin, swipe-left to Mute; left unread accent bar; outgoing `Seen` / `Delivered` / `Sent` capsule; group member count badge. |
| **MessageBubble** | [`src/components/MessageBubble.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/src/components/MessageBubble.tsx) | Consecutive sender sequence clustering (3-min window); Swipe-to-Reply; Double-Tap Heart Burst; Long-Press 6-icon Reaction Dock; Stacked Mini "Seen" Avatars; expandable Delivery & Read Matrix. |
| **Messages Inbox** | [`app/(tabs)/index.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/(tabs)/index.tsx) | Live unread counter badge; `All / Unread / Pinned / Direct / Groups / AI Bot` filter pills with counts; horizontal `Active Directory` bar; Pinned-first sorting. |
| **Active Chat Room** | [`app/chat/[id].tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/chat/%5Bid%5D.tsx) | In-chat search with match highlighting; Saved/Starred messages filter; collapsible Shared Photos filmstrip; `/` Slash Command template tray; 1-tap quick replies; date separator pills (`Today`, `Yesterday`). |
| **Directory** | [`app/(tabs)/users.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/(tabs)/users.tsx) | Horizontal `Instant Connect` spotlight cards + searchable member list with 1-tap DM creation. |
| **Settings & Inspector** | [`app/(tabs)/profile.tsx`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/frontend/app/(tabs)/profile.tsx) | Live workspace stats strip (`Chats / Pinned / Saved / People`), 1-tap server switcher, and interactive `GET /user/profile` JSON inspector. |

---

## 12. Viva Questions & Model Answers (React Native Focused)

### Q1: Why did you use `FlatList` instead of mapping over an array inside a `ScrollView`?
**Answer:**  
`ScrollView` renders every single child component immediately upon mount, which consumes excessive memory and blocks the UI thread on long chat histories. `FlatList` uses **windowed virtualization** (`VirtualizeList` under the hood)—it only mounts items currently visible on screen (plus a small buffer) and unmounts off-screen items, keeping memory usage flat and scrolling at 60 FPS.

### Q2: What does `useNativeDriver: true` do in `Animated.timing` and `Animated.spring`?
**Answer:**  
By default, JavaScript-driven animations compute every frame on the JS thread and send updates over the React Native bridge/JSI, which can stutter if JS is busy (e.g., during network fetches). `useNativeDriver: true` offloads the entire animation timeline to the native UI thread before the animation starts. It supports transform (`scale`, `translateX`, `translateY`, `rotate`) and `opacity`.

### Q3: What is the difference between `Animated` and `LayoutAnimation` in your project?
**Answer:**  
We use `Animated` for continuous, interactive, or looping transforms—such as `PanResponder` swipe tracking, button press scaling, double-tap heart bursts, and skeleton shimmer loops. We use `LayoutAnimation.configureNext()` when a React state toggle adds, removes, or resizes views in the Flexbox tree (like expanding the Read Receipt drawer or opening the Quoted Reply banner), because `LayoutAnimation` automatically animates layout bounds (`width`, `height`, `top`, `left`) natively on the next render commit.

### Q4: How did you prevent horizontal swipe gestures (`PanResponder`) on chat rows from breaking vertical scrolling in `FlatList`?
**Answer:**  
In `PanResponder.create`, we configured `onMoveShouldSetPanResponder` to only capture the touch gesture when `Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6`. If the user drags vertically (`dy > dx`), the responder returns `false` and the parent `FlatList` scrolls normally.

### Q5: How did you handle the Android 3-button bottom navigation bar and screen notches?
**Answer:**  
We wrapped the app in `<SafeAreaProvider>` from `react-native-safe-area-context` and used `<SafeAreaView edges={['top']}>` for top status-bar clearance, combined with the `useSafeAreaInsets()` hook (`insets.bottom`) to dynamically add bottom padding to the Tab Bar (`app/(tabs)/_layout.tsx`) and the Chat Input Composer (`app/chat/[id].tsx`).

### Q6: How does Expo Router differ from standard React Navigation?
**Answer:**  
Expo Router is built on top of React Navigation, but uses **file-system routing** inside the `app/` directory. Files inside `app/(tabs)/` automatically become bottom tabs, `app/chat/[id].tsx` becomes a dynamic route accessed via `useLocalSearchParams<{ id: string }>()`, and `app/modal/*` screens are configured with `presentation: 'modal'` in `app/_layout.tsx`.

### Q7: How did you implement Double-Tap vs Single-Tap on `MessageBubble` when React Native's `Pressable` only has `onPress` and `onLongPress`?
**Answer:**  
We stored the timestamp of the last tap in a mutable ref (`const lastTapRef = useRef<number>(0)`). Inside `onPress`, we compare `Date.now() - lastTapRef.current`. If the delta is under `280ms`, we treat it as a **Double-Tap** (triggering the heart reaction burst); otherwise, we treat it as a **Single-Tap** (toggling the read-receipt breakdown drawer). Using `useRef` avoids triggering unnecessary re-renders on every tap timestamp update.

### Q8: Why did `http://localhost:3000` fail on the physical Android phone in Expo Go, and how did you fix it?
**Answer:**  
On a physical Android device, `localhost` (`127.0.0.1`) resolves to the phone itself, not the development laptop. Because campus Wi-Fi also uses client isolation between devices, we exposed the laptop's Docker backend (`localhost:3000`) via a **Cloudflare HTTPS Tunnel** and wrote `sanitizeServerUrlForDevice()` in `AuthContext.tsx` using `Platform.OS` detection to automatically route native devices through the HTTPS tunnel.

### Q9: How are Consecutive Message Clusters (tail grouping) computed in the Chat Room?
**Answer:**  
Inside `FlatList`'s `renderItem={({ item, index })}` in `app/chat/[id].tsx`, we inspect `displayedMessages[index - 1]` and `displayedMessages[index + 1]`.  
- `isFirstInSequence = !prevMsg || prevMsg.senderId !== item.senderId`
- `isLastInSequence = !nextMsg || nextMsg.senderId !== item.senderId`  
We pass these booleans to `MessageBubble`, which hides the sender name on middle bubbles, tightens vertical margins (`2px` vs `8px`), and only shows the avatar and sharp tail corner (`borderBottomLeftRadius: 4`) on the last bubble of a sequence.

### Q10: Why did you wrap context values in `useMemo` and context functions in `useCallback` inside `AuthContext` and `ChatContext`?
**Answer:**  
Whenever a Context Provider re-renders, passing a new object literal `value={{ users, sendMessage, ... }}` forces every consumer component calling `useChat()` to re-render even if the specific data changed was unrelated. Wrapping methods in `useCallback` and the provider value object in `useMemo` ensures referential stability across renders.

