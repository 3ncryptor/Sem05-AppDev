/**
 * huddle. system and deployment. Every box names the file, port or setting it
 * comes from:
 *   ports, images, volumes, replica set   inClass/ChatApp/backend/docker-compose.yml
 *   Node 20                               inClass/ChatApp/backend/Dockerfile
 *   poll intervals                        inClass/ChatApp/frontend/src/constants/config.js (POLL_MS)
 *   request headers, 10 s timeout         inClass/ChatApp/frontend/src/api/client.js
 *   API address from Metro's hostUri      inClass/ChatApp/frontend/src/api/baseUrl.js
 *   SecureStore                           inClass/ChatApp/frontend/src/store/persist.js
 *   FileCleanup, FactBots                 backend/src/file/file-cleanup.service.ts, backend/src/bot/bot.service.ts
 */
export default {
  id: 'chat-system',
  out: 'inClass/ChatApp/docs/diagrams/system',
  width: 1200,
  height: 650,
  title: 'huddle. system and deployment',
  desc:
    'The huddle. app runs in Expo Go on a phone and talks over Wi-Fi to a NestJS API in a Docker container on the Mac, ' +
    'which stores data in a MongoDB container through Prisma. Metro serves the app bundle. A class server can replace the local API.',
  heading: 'huddle.: system and deployment',
  caption:
    'Request dots run at the real polling intervals: open chat every 3 s, chat list every 5 s, inbox checker one chat at a time. The hourly cleanup is sped up.',
  legend: [
    ['client', 'phone app'],
    ['network', 'network and tooling'],
    ['server', 'API container'],
    ['data', 'database'],
    ['jobs', 'background work'],
  ],
  dashedMeaning: 'alternative path',
  groups: [
    { x: 28, y: 88, w: 330, h: 500, layer: 'client', label: 'Phone (Android or iOS)', sub: 'Expo Go, Expo SDK 58, React Native 0.88' },
    { x: 610, y: 88, w: 562, h: 500, layer: 'network', label: 'Your Mac', sub: 'npx expo start  +  npm run docker:up' },
    { x: 630, y: 232, w: 522, h: 340, layer: 'server', label: 'Docker Compose project "chatapp"', sub: 'one private network; the API reaches MongoDB as host "mongo"' },
  ],
  nodes: [
    { x: 48, y: 136, w: 290, h: 78, layer: 'client', title: 'Screens (Expo Router)', lines: ['app/(tabs)/chats, people, profile', 'app/chat/[id], login, new-group'] },
    { x: 48, y: 234, w: 290, h: 94, layer: 'client', title: 'Stores and polling', lines: ['createStore + useStore (no Context)', 'createPoller, paused in background', 'inbox checker: one chat at a time'] },
    { x: 48, y: 348, w: 290, h: 78, layer: 'client', title: 'API client  src/api/client.js', lines: ['Basic auth, X-Request-Id, 10 s timeout', 'records each request for Inspector'] },
    { x: 48, y: 446, w: 140, h: 94, layer: 'client', title: 'SecureStore', lines: ['session,', 'settings,', 'unread counts'] },
    { x: 198, y: 446, w: 140, h: 94, layer: 'client', title: 'Inspector', lines: ['overview, flow,', 'network, logs,', 'tools'] },
    { x: 400, y: 330, w: 170, h: 84, layer: 'network', title: 'Wi-Fi (same LAN)', lines: ['HTTP/1.1 + JSON', 'no push channel:', 'the app polls'] },
    { x: 380, y: 480, w: 210, h: 94, layer: 'network', dashed: true, title: 'Class server (instructor)', lines: ['same routes (swagger.json)', 'no /debug/logs, no receipts', 'picked on the login screen'] },
    { x: 630, y: 140, w: 270, h: 78, layer: 'network', title: 'Metro bundler  :8081', lines: ['serves the JS bundle; the app', 'derives the API address from it'] },
    { x: 650, y: 286, w: 240, h: 128, layer: 'server', title: 'chatapp_api  :3000', lines: ['NestJS 11 on Node 20', 'global AuthGuard', 'global ValidationPipe', 'Swagger UI at /docs', 'GET /debug/logs (DEBUG_LOGS)'] },
    { x: 650, y: 432, w: 240, h: 110, layer: 'jobs', title: 'Background work in the API', lines: ['FileCleanup: at start, then', 'hourly; deletes uploads not', 'sent in 24 h', 'FactBots: every 10 s (BOT_MODE)'] },
    { x: 940, y: 286, w: 192, h: 144, layer: 'data', title: 'chatapp_mongo  :27017', lines: ['MongoDB 7.0', 'replica set rs0', 'keyfile between members', 'collections: users,', 'conversations,', 'messages, files'] },
    { x: 940, y: 456, w: 192, h: 76, layer: 'data', title: 'Docker volumes', lines: ['mongo_data  /data/db', 'mongo_key   /data/key'] },
  ],
  edges: [
    { id: 'cs-bundle', points: [[630, 179], [340, 179]], label: 'JS bundle (dev)', labelAt: [485, 157] },
    { id: 'cs-ui-store', points: [[193, 214], [193, 233]] },
    { id: 'cs-store-client', points: [[193, 328], [193, 347]] },
    { id: 'cs-client-inspector', points: [[268, 426], [268, 445]] },
    { id: 'cs-request', points: [[338, 368], [649, 368]] },
    { id: 'cs-reply', points: [[650, 396], [339, 396]] },
    { id: 'cs-class', points: [[485, 414], [485, 479]], dashed: true, arrow: 'both', label: 'or', labelAt: [503, 438] },
    { id: 'cs-db', points: [[890, 350], [939, 350]], arrow: 'both', label: 'Prisma', labelAt: [915, 326] },
    { id: 'cs-volumes', points: [[1036, 430], [1036, 455]], arrow: 'none' },
    { id: 'cs-job-db', points: [[890, 487], [915, 487], [915, 400], [939, 400]] },
  ],
  notes: [
    { x: 485, y: 284, text: 'upper line: request,', mono: true, anchor: 'middle' },
    { x: 485, y: 299, text: 'Authorization: Basic', mono: true, anchor: 'middle' },
    { x: 485, y: 314, text: 'lower line: JSON reply', mono: true, anchor: 'middle' },
  ],
  flows: [
    { edge: 'cs-bundle', period: 6, travel: 1.8, begin: 0, layer: 'network', once: true },
    { edge: 'cs-request', period: 3, travel: 1.0, begin: 0.2, layer: 'client' },
    { edge: 'cs-reply', period: 3, travel: 1.0, begin: 1.5, layer: 'server' },
    { edge: 'cs-db', period: 3, travel: 0.3, begin: 1.2, layer: 'server', r: 4.5 },
    { edge: 'cs-request', period: 5, travel: 1.0, begin: 0.9, layer: 'client' },
    { edge: 'cs-reply', period: 5, travel: 1.0, begin: 2.2, layer: 'server' },
    { edge: 'cs-request', period: 10, travel: 1.0, begin: 2.6, layer: 'client' },
    { edge: 'cs-reply', period: 10, travel: 1.0, begin: 3.9, layer: 'server' },
    { edge: 'cs-job-db', period: 15, travel: 1.4, begin: 4, layer: 'jobs' },
  ],
};
