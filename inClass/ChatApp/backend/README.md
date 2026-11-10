# Chat App Backend

NestJS + Prisma + MongoDB + Swagger

## Stack

| | |
|--|--|
| Framework | NestJS v11 |
| ORM | Prisma v6 |
| Database | MongoDB 7.0 (Replica Set) |
| API Docs | Swagger UI → `http://localhost:3000/docs` |

---

## Quick Start (Docker)

```bash
# 1. Copy env
cp .env.example .env

# 2. Start everything (MongoDB + API)
npm run docker:up

# With FactBot simulation enabled
npm run docker:up:bot
```

API → `http://localhost:3000`  
Docs → `http://localhost:3000/docs`

---

## Local Dev (without Docker)

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev

# With FactBots
npm run start:dev:bot
```

---

## Demo Data

```bash
docker exec chatapp_api npm run seed
```

Creates users `aarav`, `diya`, `kabir`, `meera` and `rohan` (password `demo123`), three DMs, a "Study Group" with an image message, and a few messages each. Running it again adds nothing new. `rohan` has no chats, for testing a fresh account.

---

## Watching the Console

```bash
docker logs -f chatapp_api
```

Every request prints one line: method, URL, status, time and user, plus a short body summary (long text and base64 are shown as `<N chars>`; passwords are never printed). Failed requests add `reason="…"`; server errors also print a stack trace. Sign-ups, sent messages, read receipts, FactBot ticks and upload cleanup log their own lines.

```
[HTTP] POST /message 201 42ms user=aarav {conversation_id="6af2…", content="logging demo"}
[HTTP] POST /message 400 8ms user=aarav {…} reason="file_id must reference a file uploaded by the sender"
[Auth] New user "viva_newbie" signed up (first request with this username)
```

---

## Local Additions (not on the class server)

These keep every route and response shape the same, so apps written against the class server work unchanged:

- **Read receipts**: `GET /conversation` marks the caller's messages `delivered`; `GET /message` marks that conversation's messages `read` for the caller. Only users already in a message's `status` are updated.
- **Server logs for the app's Inspector**: `GET /debug/logs?after=<seq>&limit=<n>` returns the last 500 log lines as
  `{ entries: [{ seq, time, level, context, message, requestId, isPoll }], latestSeq, oldestSeq }`. Hidden from Swagger.
  On when `DEBUG_LOGS=true` (the Docker default), otherwise 404. Requests carrying `X-Request-Id` / `X-Client-Poll`
  headers get those tags on every log line they cause, so the app can match its requests to server lines.
- **Orphaned upload cleanup**: files uploaded with `POST /file` but never sent in a message are deleted after `FILE_ORPHAN_TTL_HOURS` (default 24). Checked on startup and hourly.

---

## Authentication

Every request needs:
```
Authorization: Basic <username>:<password>
```

- `username` → unique user identifier (display name)
- `password` → secret for the user
- If username is not found, user is **created automatically** on first request
- If username exists, password must match

---

## FactBot Simulation (`BOT_MODE=true`)

Creates 5 bot users on startup. Every 10s, **every real user** receives a random fact — each from an independently randomly picked bot. Useful for generating test chat data without manual effort.

---

## Logging

- **Interactive Message Logs**: Real messages log sender, receiver, and conversation with deterministic user colors.
- **Bot Logs**: FactBots log a single `[BOT] Bot is chatting...` entry per cycle.
- **MongoDB Logs**: Controlled by `MONGO_SILENT_LOGS` in `.env` (defaults to `true` to keep Docker output clean). Set to `false` for raw Mongo engine logs.

---

## API Endpoints

> Full request/response details at `http://localhost:3000/docs`

| Method | Path | Intent |
|--------|------|--------|
| `GET` | `/user` | List every registered user on the platform — use this to discover who exists before starting a conversation |
| `GET` | `/user/profile` | Fetch a specific user's profile; omit `user_id` to get your own |
| `POST` | `/conversation` | Create a new DM or group conversation; the caller is automatically added as a participant. Returns the existing DM if one already exists between the same two users |
| `GET` | `/conversation` | Fetch all conversations the authenticated user is part of |
| `POST` | `/message` | Send a message to a conversation: text in `content`, an attachment via `file_id`, or both |
| `GET` | `/message` | Fetch the message history for a given conversation |
| `POST` | `/file` | Upload an image or file as base64 (max 10 MB); returns the `id` to send as `file_id` |
| `GET` | `/file/{id}` | Fetch a file's metadata and base64 contents (uploader or conversation participants only) |
| `GET` | `/file/{id}/download` | Fetch the raw bytes; images display inline, other files download |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start Docker stack |
| `npm run docker:up:bot` | Start with FactBots enabled |
| `npm run docker:down` | Stop containers |
| `npm run docker:logs` | Tail API logs |
| `npm run start:dev` | Local dev (hot-reload) |
| `npm run start:dev:bot` | Local dev + FactBots |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:push` | Push schema to DB |
