# ChatApp — Critical Decisions & Backend Analysis Log (`decisions.md`)

This document records the architectural decisions, source-code discoveries from cloning [`rt-nst-ru/MobileApp-Bakcend-5thSem`](https://github.com/rt-nst-ru/MobileApp-Bakcend-5thSem) into `backend/`, and React Native engineering lessons applied in `frontend/`.

---

## 1. Critical Discoveries from the Cloned Backend Source Code (`backend/`)

Cloning and reading the actual NestJS + Prisma source code in `backend/src/` revealed six crucial implementation truths that would have caused bugs if we relied only on high-level notes:

### D1. `ValidationPipe({ forbidNonWhitelisted: true })` & `CreateConversationDto` Contract
* **Source File**: [`backend/src/main.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/main.ts#L15-L21) & [`backend/src/conversation/dto/conversation.dto.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/conversation/dto/conversation.dto.ts#L10-L37)
* **What We Found**:
  * The global `ValidationPipe` sets `whitelist: true` and `forbidNonWhitelisted: true`. Any unknown property in a POST body triggers an immediate `400 Bad Request`.
  * In `CreateConversationDto`, the only allowed fields are `type?: 'DM' | 'GROUP'`, `name?: string`, and `participants_ids?: string[]`. There is **no** `recipient_id` field in the DTO!
  * Furthermore, in [`conversation.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/conversation/conversation.service.ts#L48-L53), the service removes `callerId` from `participants_ids` (`participantIds.delete(callerId)`) and checks if `participantIds.size === 0`.
* **Frontend Decision**:
  * When initiating a 1-on-1 DM with a user `targetUserId`, our frontend **always** sends:
    ```json
    {
      "type": "DM",
      "participants_ids": ["<targetUserId>"]
    }
    ```
  * And we prevent the user from starting a DM with their own user ID (which the backend rejects with `400 Bad Request: At least one other participant is required`).

---

### D2. Plaintext Basic Auth & Password Stored in `user.phone`
* **Source File**: [`backend/src/auth/auth.guard.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/auth/auth.guard.ts#L24-L74) & [`backend/prisma/schema.prisma`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/prisma/schema.prisma#L13-L23)
* **What We Found**:
  * `AuthGuard` strips `"Basic "` from `request.headers['authorization']` and splits on the first `:` (`const colonIndex = credentials.indexOf(':')`).
  * Using `indexOf(':')` is great news: if a user's password contains a `:`, `credentials.substring(colonIndex + 1)` preserves the entire password intact.
  * In MongoDB (`schema.prisma`), `username` is stored in `user.name` (`@unique`), and `password` is stored in `user.phone`.
  * When `GET /user` or `GET /user/profile` runs, Prisma explicitly selects `{ id: true, name: true, bio: true }`, omitting `phone` and `conversationIds` for privacy.
* **Frontend Decision**:
  * We inject `Authorization: Basic ${username}:${password}` as a raw string in `src/api/client.ts`.
  * Login validates credentials by calling `GET /user/profile`, which either returns the existing user (if `user.phone === password`), auto-creates the user (if `name` is new), or throws `401 Unauthorized: Invalid password for user '<username>'`.

---

### D3. Base64 Image Messaging Support (`imageInfo` + `10mb` Payload Limit)
* **Source File**: [`backend/src/main.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/main.ts#L10-L12) & [`backend/src/message/message.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/message/message.service.ts#L63-L84)
* **What We Found**:
  * The backend explicitly configures `app.use(json({ limit: '10mb' }))` to support Base64-encoded images!
  * `CreateMessageDto` accepts `content?: string` and `imageInfo?: string`. At least one must be present (`if (!dto.content && !dto.imageInfo) throw new BadRequestException(...)`).
  * If `imageInfo` does not start with `'data:'`, the backend normalizes it to ``data:image/jpeg;base64,${dto.imageInfo}``.
  * The Swagger docs on `MessageResponseDto.imageInfo` explicitly note: *"Base64 data URI of the image, directly usable in React Native `<Image source={{ uri }} />`"*.
* **Frontend Decision**:
  * We added full **Image Messaging** support to the mobile UI:
    1. Users can attach images from their device photo library via `expo-image-picker` (`base64: true`, quality `0.5`) or choose from built-in sample Base64 visual cards.
    2. Users can send image-only messages, text-only messages, or image + caption messages.
    3. Tapping any image in a chat bubble opens a full-screen **Image Viewer Lightbox Modal (`S9`)**.

---

### D4. DM Naming Quirk (`[DM] <recipientName>`) vs Multi-Perspective UI
* **Source File**: [`backend/src/conversation/conversation.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/conversation/conversation.service.ts#L89-L94)
* **What We Found**:
  * When User A creates a DM with User B, the backend sets `conversation.name = "[DM] " + userB.name`.
  * However, that single `Conversation` document is shared by both User A and User B! When User B fetches `GET /conversation`, `conversation.name` still says `"[DM] " + userB.name` (User B's own name!).
* **Frontend Decision**:
  * Instead of blindly rendering `conversation.name` for DMs, our `resolveConversationTitle(conversation, currentUserId, usersById)` utility inspects `conversation.participants_ids`:
    1. Finds `otherUserId = conversation.participants_ids.find(id => id !== currentUserId)`.
    2. If `usersById[otherUserId]` exists, displays `usersById[otherUserId].name` (so User A sees `"Ritesh"` and Ritesh sees `"aryan.vibhuti..."`).
    3. Only falls back to `conversation.name.replace(/^\[DM\]\s*/, '')` if the user directory hasn't loaded yet.
  * In the **Conversation Info Modal (`S7`)**, we display both the resolved display title and the raw database `conversation.name` (`[DM] ...`) for transparency during viva.

---

### D5. Page Ordering & Reverse-Cursor Pagination (`PAGE_SIZE = 20`)
* **Source File**: [`backend/src/message/message.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/message/message.service.ts#L20-L55)
* **What We Found**:
  * `prisma.message.findMany` queries with `orderBy: { createdAt: 'desc' }, take: 20`.
  * Before returning, the service calls `const sorted = [...messages].reverse()`.
  * And `nextCursor` is set to `messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null` (which is `sorted[0].id`, i.e., the oldest message in the returned page).
* **Frontend Decision**:
  * Because `data` is already sorted **oldest-to-newest** (`sorted[0]` is oldest, `sorted[sorted.length - 1]` is newest):
    * On initial load (`from_message_cursor` omitted), `data` contains the 20 most recent messages in natural top-to-bottom reading order.
    * When loading older history (`from_message_cursor = nextCursor`), the newly fetched page of 20 older messages is **prepended** ahead of the existing messages (deduplicated by `message.id`).

---

### D6. `FactBot` Simulation & Deterministic `djb2` User Colors
* **Source Files**: [`backend/src/bot/bot.service.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/bot/bot.service.ts) & [`backend/src/common/color.util.ts`](file:///Users/aryanvibhuti/Projects/LearningProjects/Sem05-AppDev/inClass/ChatApp/backend/src/common/color.util.ts)
* **What We Found**:
  * When the backend runs with `BOT_MODE=true` (`npm run start:dev:bot` or `npm run docker:up:bot`), `BotService` seeds a user named `FactBot` (`bio: "I am a FactBot 🤖"`) and sends a random science/tech fact from `facts.data.ts` every 10 seconds into `[DM] FactBot`.
  * The backend console logger uses a deterministic `djb2` hash (`hashString(name) % 12`) to colorize usernames in terminal logs.
* **Frontend Decision**:
  * We ported the exact `djb2` hash function (`hashString`) to `frontend/src/utils/format.ts` so every user's avatar and group message header has a consistent, deterministic high-contrast color across the app.
  * We also embedded a subset of the real `FACTS` from `backend/src/bot/facts.data.ts` into our `mockServer.ts` so `FactBot` works identically in Offline Mock Mode!
