/**
 * Athena process model. Sources (all under inClass/Proctor/):
 *   renderer flags                app/electron/window.js (contextIsolation, sandbox, nodeIntegration false)
 *   UI source                     app/electron/protocol.js (app://), Vite :5173 in development
 *   preload allow-list            app/electron/preload.cjs
 *   trusted sender check          app/electron/validate.js (handle, isTrustedSender)
 *   HTTP client, route table      app/electron/api.js (net.fetch, REQUEST_TIMEOUT_MS 10 s), app/electron/routes.js (51 routes, 8 internal)
 *   token                         app/electron/session.js (safeStorage, session.bin)
 *   answer queue                  app/electron/queue.js (queue.json, BACKOFF_SECONDS 1,2,4,8,16,30)
 *   heartbeat                     app/electron/heartbeat.js (INTERVAL_MS 10 s, OFFSET_SAMPLES 5)
 *   screenshots                   app/electron/capture.js (FIRST_SHOT_MS 3 s, 45-60 s, 1280 px, JPEG 70)
 *   upload queue                  app/electron/evidence.js (manifest, RETRY_MS 5,10,20,30 s)
 *   exam lock                     app/electron/exam.js (lockWindow: kiosk packaged, fullscreen dev)
 *   server order                  backend/server.js (createApp)
 *   passwords, tokens             backend/lib/auth.js (scrypt; SHA-256 of a 32-byte token)
 *   JSON store                    backend/lib/store.js (4 files, .tmp + rename), backend/lib/locks.js (withLock)
 *   grace, lazy close             backend/lib/constants.js (ANSWER_GRACE_MS 30 s), backend/lib/finalize.js (closeIfOverdue)
 *   scoring                       backend/lib/scoring/index.js (7 type modules)
 */
export default {
  id: 'athena-process',
  out: 'inClass/Proctor/docs/diagrams/process-model',
  width: 1200,
  height: 1010,
  title: 'Athena process model',
  desc:
    'The React renderer runs sandboxed and reaches the network only through the preload allow-list and the Electron main process, ' +
    'which owns the token, the answer queue, the heartbeat, screenshot capture and the upload queue. Main calls the Express 5 backend over HTTP; ' +
    'the backend runs a fixed middleware order, keeps its rules in lib/ and stores data in JSON files and a screenshots folder.',
  heading: 'Athena: process model and the path of an answer',
  caption: 'The page has no network access. Every request leaves through the main process, which also keeps answers and screenshots safe on disk first.',
  legend: [
    ['client', 'renderer and preload'],
    ['native', 'Electron main process'],
    ['server', 'Express backend'],
    ['data', 'files on disk'],
  ],
  dashedMeaning: 'only for unknown routes or errors',
  dotMeaning: 'answer, heartbeat or screenshot in flight',
  groups: [
    { x: 28, y: 80, w: 672, h: 870, layer: 'client', label: 'Student or examiner Mac: Athena, Electron 44' },
    { x: 48, y: 352, w: 632, h: 476, layer: 'native', labelOffset: 232, label: 'Main process (app/electron)', sub: 'all network and disk I/O' },
    { x: 740, y: 80, w: 432, h: 870, layer: 'server', label: 'Backend host: Express 5 on Node.js 22', sub: 'backend/server.js, in the order it runs' },
  ],
  nodes: [
    { x: 48, y: 118, w: 632, h: 94, layer: 'client', title: 'Renderer: React 19 UI (app/src)', lines: ['loaded from app://athena (packaged) or Vite :5173 (dev)', 'contextIsolation, sandbox, no nodeIntegration:', 'no Node.js and no network of its own'] },
    { x: 48, y: 246, w: 632, h: 94, layer: 'client', title: 'Preload: window.athena (preload.cjs)', lines: ['contextBridge: a fixed set of functions, one IPC channel each', 'events only from EXAM_EVENTS, theme:changed, net:status', 'main checks every caller is Athena (validate.js, handle)'] },

    { x: 64, y: 408, w: 300, h: 92, layer: 'native', title: 'queue.js: answers', lines: ['queue.json written first;', 'newest revision per question', 'retry after 1,2,4,8,16,30 s'] },
    { x: 64, y: 512, w: 300, h: 92, layer: 'native', title: 'heartbeat.js', lines: ['every 10 s; countdown uses', 'median of 5 clock offsets', "server may answer 'forced'"] },
    { x: 64, y: 616, w: 300, h: 92, layer: 'native', title: 'capture.js', lines: ['first shot at 3 s, then', 'random 45 to 60 s; window', 'only, 1280 px JPEG q70'] },
    { x: 64, y: 720, w: 300, h: 92, layer: 'native', title: 'evidence.js: uploads', lines: ['JPEG + manifest on disk', 'first; oldest sent first;', 'retry after 5,10,20,30 s'] },
    { x: 380, y: 408, w: 284, h: 196, layer: 'native', title: 'api.js: the one HTTP client', lines: ['net.fetch, 10 s timeout', 'route table: 51 names;', '8 internal, main only', 'adds the Bearer token', 'from session.js (kept', 'encrypted by safeStorage)'] },
    { x: 380, y: 616, w: 284, h: 196, layer: 'native', title: 'exam.js: the exam lock', lines: ['exam:enter starts the lock,', 'heartbeat and capture', 'lock = kiosk mode when', 'packaged, fullscreen in', 'development', 'exitExam stops all three'] },
    { x: 48, y: 846, w: 632, h: 78, layer: 'data', title: 'userData folder (this Mac)', lines: ['queue.json, session.bin (encrypted),', 'pending-uploads/<attempt>/<kind>/ + manifest.json'] },

    { x: 760, y: 126, w: 392, h: 60, layer: 'server', title: '1  requestId, logger, securityHeaders', lines: ['backend/lib/http.js'] },
    { x: 760, y: 198, w: 392, h: 60, layer: 'server', title: '2  express.json, limit 256 KB', lines: ['screenshots: express.raw image/jpeg'] },
    { x: 760, y: 270, w: 392, h: 60, layer: 'server', title: '3  GET /api/health (no auth)', lines: ['start.sh waits for it'] },
    { x: 760, y: 342, w: 392, h: 94, layer: 'server', title: '4  routers', lines: ['/api/auth     login, logout, me', '/api/admin/*  requireAuth + admin', '/api/*        requireAuth + student'] },
    { x: 760, y: 448, w: 392, h: 60, layer: 'server', dashed: true, title: '5  notFound, errorHandler', lines: ['every reply: { ok, data, error }'] },
    { x: 760, y: 528, w: 392, h: 158, layer: 'server', title: 'lib/: the rules', lines: ['auth.js    scrypt passwords;', '           tokens stored as SHA-256', 'store.js   4 JSON files, atomic write', 'locks.js   withLock per attempt', 'finalize   overdue closed on read', 'scoring/   7 types, one module each'] },
    { x: 760, y: 704, w: 392, h: 94, layer: 'data', title: 'backend/data/', lines: ['users, sessions, exams, attempts .json', 'written to .tmp, then renamed', 'records/<user>/<attempt>/'] },
    { x: 760, y: 816, w: 392, h: 78, layer: 'data', title: 'backend/screenshots/', lines: ['<Candidate>/<Test>/webcam/', '<Candidate>/<Test>/screen/'] },
  ],
  edges: [
    { id: 'ap-invoke', points: [[214, 212], [214, 245]], label: 'ipcRenderer.invoke', labelAt: [214, 216] },
    { id: 'ap-events-up', points: [[560, 245], [560, 213]] },
    { id: 'ap-to-queue', points: [[214, 340], [214, 407]], label: 'answers.save', labelAt: [140, 344] },
    { id: 'ap-to-api', points: [[520, 340], [520, 407]], label: 'other api calls', labelAt: [458, 344] },
    { id: 'ap-events-main', points: [[620, 407], [620, 341]] },
    { id: 'ap-queue-api', points: [[364, 454], [379, 454]] },
    { id: 'ap-beat-api', points: [[364, 558], [379, 558]] },
    { id: 'ap-capture-evidence', points: [[214, 708], [214, 719]] },
    { id: 'ap-exam-capture', points: [[380, 662], [365, 662]] },
    { id: 'ap-evidence-api', points: [[364, 766], [372, 766], [372, 590], [379, 590]] },
    { id: 'ap-disk', points: [[64, 454], [56, 454], [56, 845]] },
    { id: 'ap-disk-evidence', points: [[64, 766], [56, 766]], arrow: 'none' },
    { id: 'ap-http', points: [[664, 440], [712, 440], [712, 156], [759, 156]], label: 'HTTP', labelAt: [712, 300] },
    { id: 'ap-reply', points: [[759, 172], [724, 172], [724, 470], [665, 470]] },
    { id: 'ap-1-2', points: [[956, 186], [956, 197]] },
    { id: 'ap-2-3', points: [[956, 258], [956, 269]] },
    { id: 'ap-3-4', points: [[956, 330], [956, 341]] },
    { id: 'ap-4-5', points: [[956, 436], [956, 447]], dashed: true },
    { id: 'ap-4-lib', points: [[1152, 389], [1162, 389], [1162, 607], [1153, 607]] },
    { id: 'ap-lib-data', points: [[956, 686], [956, 703]] },
  ],
  notes: [
    { x: 552, y: 236, text: 'events: exam:capture-now, net:status', mono: true, anchor: 'end' },
  ],
  flows: [
    { edge: 'ap-invoke', period: 10, travel: 0.4, begin: 0, layer: 'client' },
    { edge: 'ap-to-queue', period: 10, travel: 0.5, begin: 0.4, layer: 'client' },
    { edge: 'ap-disk', period: 10, travel: 0.9, begin: 0.9, layer: 'data', r: 4.5 },
    { edge: 'ap-queue-api', period: 10, travel: 0.2, begin: 1.0, layer: 'native' },
    { edge: 'ap-http', period: 10, travel: 1.0, begin: 1.2, layer: 'native' },
    { edge: 'ap-1-2', period: 10, travel: 0.15, begin: 2.2, layer: 'server' },
    { edge: 'ap-2-3', period: 10, travel: 0.15, begin: 2.35, layer: 'server' },
    { edge: 'ap-3-4', period: 10, travel: 0.15, begin: 2.5, layer: 'server' },
    { edge: 'ap-4-lib', period: 10, travel: 0.6, begin: 2.65, layer: 'server' },
    { edge: 'ap-lib-data', period: 10, travel: 0.25, begin: 3.25, layer: 'server' },
    { edge: 'ap-reply', period: 10, travel: 1.0, begin: 3.6, layer: 'server' },
    { edge: 'ap-beat-api', period: 10, travel: 0.2, begin: 5.0, layer: 'native' },
    { edge: 'ap-http', period: 10, travel: 1.0, begin: 5.2, layer: 'native' },
    { edge: 'ap-exam-capture', period: 10, travel: 0.2, begin: 6.4, layer: 'native', r: 4.5 },
    { edge: 'ap-capture-evidence', period: 10, travel: 0.2, begin: 6.6, layer: 'native' },
    { edge: 'ap-events-main', period: 10, travel: 0.5, begin: 6.6, layer: 'native', r: 4.5 },
    { edge: 'ap-events-up', period: 10, travel: 0.3, begin: 7.1, layer: 'native', r: 4.5 },
    { edge: 'ap-evidence-api', period: 10, travel: 0.6, begin: 6.9, layer: 'native' },
    { edge: 'ap-http', period: 10, travel: 1.0, begin: 7.5, layer: 'native' },
  ],
};
