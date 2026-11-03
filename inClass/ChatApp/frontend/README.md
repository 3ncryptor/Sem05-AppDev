# ChatApp Mobile UI (`frontend/`)

React Native + Expo (Expo Router & TypeScript) mobile client for the **Sem 05 Application Development ChatApp**, designed around [`rt-nst-ru/MobileApp-Bakcend-5thSem`](https://github.com/rt-nst-ru/MobileApp-Bakcend-5thSem) (`../backend`).

---

## Features & Screens

1. **Login & Zero-Registration Provisioning (`app/login.tsx`)**:
   - Injects raw plaintext `Authorization: Basic <username>:<password>` (never Base64 encoded, matching `backend/src/auth/auth.guard.ts`).
   - One-tap quick presets for student & instructor accounts (`aryan.vibhuti2024@nst.rishihood.edu.in`, `Ritesh`, `abhinay`).
   - Switch between **Live Lab Server (`http://10.7.1.51:3000`)**, **Local Docker (`http://localhost:3000`)**, or **Offline Mock Engine**.
2. **Conversations List (`app/(tabs)/index.tsx`)**:
   - Filter by `All`, `Direct (DMs)`, `Groups`, or `🤖 FactBot`.
   - Automatically resolves DM display names from `participants_ids` via the cached `GET /user` directory.
3. **User Discovery Directory (`app/(tabs)/users.tsx`)**:
   - Lists all registered users from `GET /user`.
   - Tap **DM** to call `POST /conversation` (`{ type: 'DM', participants_ids: [userId] }`) idempotently.
4. **Active Chat Room (`app/chat/[id].tsx`)**:
   - **Reverse-Cursor Pagination**: Loads 20 messages per page (`GET /message?conversation_id=<id>&from_message_cursor=<cursor>`).
   - **Base64 Image Messaging (`imageInfo`)**: Attach photos via `expo-image-picker` or built-in sample Base64 cards (`10MB` backend limit).
   - **Per-Participant Delivery & Read Status**: Tap any message bubble to inspect the raw `message.status` JSON map.
5. **Modals (`app/modal/*`)**:
   - `new-group.tsx`: Create multi-participant Group chats (`POST /conversation` with `type: 'GROUP'`).
   - `chat-info.tsx`: Inspect conversation metadata and participant roster.
   - `user-profile.tsx`: Inspect any user profile via `GET /user/profile?user_id=<id>`.
   - `image-viewer.tsx`: Fullscreen Base64 image lightbox and payload size inspector.

---

## Quick Start

```bash
cd inClass/ChatApp/frontend
npm install

# Start Expo Dev Server (iOS / Android / Web)
npm start

# Or launch directly on Web / iOS / Android:
npm run web
npm run ios
npm run android
```

