/**
 * One request, end to end: sending a text message (POST /message).
 * The backend steps are in the order the code runs them:
 *   1-3  Express middleware, registered in this order   backend/src/main.ts
 *   4    AuthGuard, global via APP_GUARD                 backend/src/auth/auth.module.ts, auth.guard.ts
 *   5    ValidationPipe (whitelist, forbidNonWhitelisted) backend/src/main.ts
 *   6-7  controller and service                          backend/src/message/message.controller.ts, message.service.ts
 *   8    PrismaService extends PrismaClient              backend/src/prisma/prisma.service.ts
 *   errors -> LoggingExceptionFilter                     backend/src/common/logging-exception.filter.ts
 *   log lines -> LogBuffer (500) -> GET /debug/logs      backend/src/common/log-buffer.ts, debug/debug.controller.ts
 * App side: frontend/src/store/messageController.js (send, deliver, confirmLocal),
 * frontend/src/api/client.js (headers, timeout, networkStore), frontend/src/hooks/useServerLogs.js (2 s).
 */
const ROW1 = 362;
const ROW2 = 478;
const BOX_H = 92;
const mid = (y) => y + BOX_H / 2;

export default {
  id: 'chat-request',
  out: 'inClass/ChatApp/docs/diagrams/request',
  width: 1200,
  height: 880,
  title: 'One request through huddle., end to end',
  desc:
    'Sending a message: the chat screen and message controller add an optimistic bubble, the API client sends POST /message, ' +
    'and the NestJS backend runs request logger, JSON parser, request context, AuthGuard, ValidationPipe, controller, service and Prisma ' +
    'before MongoDB stores the message. The reply confirms the bubble, and the log line reaches the Inspector through GET /debug/logs.',
  heading: 'huddle.: one request, end to end (sending a message)',
  caption:
    'Numbers 1 to 8 are the order the backend runs each step. Any error in steps 4 to 8 goes to the exception filter instead.',
  legend: [
    ['client', 'phone app'],
    ['network', 'network'],
    ['server', 'NestJS API'],
    ['data', 'MongoDB'],
  ],
  dashedMeaning: 'local backend only, or on error',
  dotMeaning: 'the request and its reply',
  groups: [
    { x: 28, y: 80, w: 1144, h: 144, layer: 'client', label: 'Phone: huddle. in Expo Go' },
    { x: 28, y: 318, w: 1144, h: 374, layer: 'server', label: 'NestJS API (container chatapp_api), steps in the order they run' },
    { x: 28, y: 708, w: 1144, h: 124, layer: 'data', labelOffset: 220, label: 'MongoDB 7 (container chatapp_mongo): the collections this request touches' },
  ],
  nodes: [
    { x: 48, y: 116, w: 190, h: 92, layer: 'client', title: 'Chat screen', lines: ['app/chat/[id].jsx', 'you tap send'] },
    { x: 258, y: 116, w: 240, h: 92, layer: 'client', title: 'messageController', lines: ["send(): 'sending' bubble", 'shows at once (optimistic)', 'then confirmed or failed'] },
    { x: 518, y: 116, w: 240, h: 92, layer: 'client', title: 'API client  client.js', lines: ['X-Request-Id: new id', 'Authorization: Basic', '10 s timeout'] },
    { x: 900, y: 116, w: 252, h: 92, layer: 'client', title: 'Inspector stores', lines: ['networkStore: the request', 'serverLogStore: its server', 'lines, by request id'] },
    { x: 440, y: 252, w: 300, h: 56, layer: 'network', title: 'HTTP/1.1 over Wi-Fi', lines: ['POST /message  JSON body'] },

    { x: 80, y: ROW1, w: 400, h: BOX_H, layer: 'server', title: 'BufferedLogger + LogBuffer', lines: ['every log line is kept with its', 'request id (the last 500 lines)', 'GET /debug/logs serves them'] },
    { x: 520, y: ROW1, w: 200, h: BOX_H, layer: 'server', title: '1  requestLogger', lines: ['starts a timer; logs', 'one line when the', 'reply has been sent'] },
    { x: 740, y: ROW1, w: 200, h: BOX_H, layer: 'server', title: '2  express.json()', lines: ['parses the JSON body', 'limit 15 MB'] },
    { x: 960, y: ROW1, w: 200, h: BOX_H, layer: 'server', title: '3  requestContext', lines: ['AsyncLocalStorage', 'keeps X-Request-Id', 'for every log line'] },

    { x: 960, y: ROW2, w: 200, h: BOX_H, layer: 'server', title: '4  AuthGuard (global)', lines: ['Basic name:password', 'new name: user created', 'wrong password: 401'] },
    { x: 740, y: ROW2, w: 200, h: BOX_H, layer: 'server', title: '5  ValidationPipe', lines: ['CreateMessageDto', 'unknown field: 400'] },
    { x: 520, y: ROW2, w: 200, h: BOX_H, layer: 'server', title: '6  MessageController', lines: ['POST /message', 'sender is request.user'] },
    { x: 300, y: ROW2, w: 200, h: BOX_H, layer: 'server', title: '7  MessageService', lines: ['chat exists, else 404', "file is sender's own", 'status map per member'] },
    { x: 80, y: ROW2, w: 200, h: BOX_H, layer: 'server', title: '8  PrismaService', lines: ['PrismaClient: typed', 'queries to MongoDB'] },

    { x: 600, y: 606, w: 400, h: 72, layer: 'server', dashed: true, title: 'LoggingExceptionFilter', lines: ['turns the error into a 4xx/5xx reply', 'and puts its reason on the log line'] },

    { x: 48, y: 744, w: 262, h: 72, layer: 'data', title: 'messages', lines: ['create: content, senderId,', 'status per member'] },
    { x: 330, y: 744, w: 262, h: 72, layer: 'data', title: 'conversations', lines: ['findUnique: does the', 'chat exist?'] },
    { x: 612, y: 744, w: 262, h: 72, layer: 'data', title: 'files', lines: ['findUnique: only when', 'a file_id was sent'] },
    { x: 894, y: 744, w: 258, h: 72, layer: 'data', title: 'users', lines: ['AuthGuard: find by name,', 'or create a new user'] },
  ],
  edges: [
    { id: 'rq-screen', points: [[238, 162], [257, 162]] },
    { id: 'rq-send', points: [[498, 146], [517, 146]] },
    { id: 'rq-confirm', points: [[518, 182], [499, 182]] },
    { id: 'rq-record', points: [[758, 162], [899, 162]], label: 'records it', labelAt: [828, 140] },
    { id: 'rq-request', points: [[690, 208], [690, 361]] },
    { id: 'rq-reply', points: [[560, 361], [560, 209]] },
    { id: 'rq-1-2', points: [[720, mid(ROW1)], [739, mid(ROW1)]] },
    { id: 'rq-2-3', points: [[940, mid(ROW1)], [959, mid(ROW1)]] },
    { id: 'rq-3-4', points: [[1060, ROW1 + BOX_H], [1060, ROW2 - 1]] },
    { id: 'rq-4-5', points: [[960, mid(ROW2)], [941, mid(ROW2)]] },
    { id: 'rq-5-6', points: [[740, mid(ROW2)], [721, mid(ROW2)]] },
    { id: 'rq-6-7', points: [[520, mid(ROW2)], [501, mid(ROW2)]] },
    { id: 'rq-7-8', points: [[300, mid(ROW2)], [281, mid(ROW2)]] },
    { id: 'rq-prisma', points: [[180, ROW2 + BOX_H], [180, 743]], label: 'Prisma queries', labelAt: [180, 640] },
    { id: 'rq-guard-users', points: [[1110, ROW2 + BOX_H], [1110, 743]], label: 'find or create', labelAt: [1110, 640] },
    { id: 'rq-log', points: [[520, mid(ROW1)], [481, mid(ROW1)]] },
    { id: 'rq-logs-feed', points: [[460, ROW1 - 1], [460, 236], [1026, 236], [1026, 209]], dashed: true },
    { id: 'rq-errors', points: [[400, 586], [1060, 586]], dashed: true, arrow: 'none' },
    { id: 'rq-errors-filter', points: [[800, 586], [800, 605]], dashed: true },
  ],
  notes: [
    { x: 770, y: 256, text: 'Inspector open: GET', mono: true },
    { x: 770, y: 271, text: '/debug/logs every 2 s', mono: true },
    { x: 490, y: 342, text: '201 reply', mono: true },
    { x: 700, y: 342, text: 'request', mono: true },
    { x: 410, y: 600, text: 'errors from steps 4 to 8', mono: true },
  ],
  flows: [
    { edge: 'rq-screen', period: 10, travel: 0.4, begin: 0, layer: 'client' },
    { edge: 'rq-send', period: 10, travel: 0.4, begin: 0.4, layer: 'client' },
    { edge: 'rq-record', period: 10, travel: 0.5, begin: 0.8, layer: 'client', r: 4.5 },
    { edge: 'rq-request', period: 10, travel: 0.9, begin: 0.8, layer: 'client' },
    { edge: 'rq-1-2', period: 10, travel: 0.25, begin: 1.7, layer: 'client' },
    { edge: 'rq-2-3', period: 10, travel: 0.25, begin: 1.95, layer: 'client' },
    { edge: 'rq-3-4', period: 10, travel: 0.3, begin: 2.2, layer: 'client' },
    { edge: 'rq-guard-users', period: 10, travel: 0.6, begin: 2.5, layer: 'server', r: 4.5 },
    { edge: 'rq-4-5', period: 10, travel: 0.25, begin: 3.1, layer: 'client' },
    { edge: 'rq-5-6', period: 10, travel: 0.25, begin: 3.35, layer: 'client' },
    { edge: 'rq-6-7', period: 10, travel: 0.25, begin: 3.6, layer: 'client' },
    { edge: 'rq-7-8', period: 10, travel: 0.25, begin: 3.85, layer: 'client' },
    { edge: 'rq-prisma', period: 10, travel: 0.7, begin: 4.1, layer: 'server' },
    { edge: 'rq-reply', period: 10, travel: 0.9, begin: 5.0, layer: 'server' },
    { edge: 'rq-confirm', period: 10, travel: 0.4, begin: 5.9, layer: 'server' },
    { edge: 'rq-log', period: 10, travel: 0.3, begin: 5.0, layer: 'server', r: 4.5 },
    { edge: 'rq-logs-feed', period: 10, travel: 1.8, begin: 5.6, layer: 'server', r: 4.5 },
  ],
};
