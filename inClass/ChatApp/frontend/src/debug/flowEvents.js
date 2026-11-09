/**
 * Pure rules for the Live Wire view (buildPlan.md 6.3): which requests show
 * as dots, how they look, which server ripples are live, and the real
 * step-by-step story behind one request for explain mode.
 */

const RIPPLE_KINDS = [
  { kind: 'bot', pattern: /bot/i },
  { kind: 'receipts', pattern: /receipt/i },
  { kind: 'cleanup', pattern: /cleanup/i },
];

const CONTROLLERS = {
  user: 'UserController -> UserService',
  conversation: 'ConversationController -> ConversationService',
  message: 'MessageController -> MessageService',
  file: 'FileController -> FileService',
  debug: 'DebugController -> in-memory log buffer',
};

/**
 * @param {{ method: string, isPoll: boolean }} row networkStore row
 * @returns {'poll' | 'send' | 'read'} poll = grey heartbeat, send = gradient
 */
export function dotKind(row) {
  if (row.isPoll) return 'poll';
  return row.method === 'GET' ? 'read' : 'send';
}

/**
 * Requests to draw: still pending, or started within the window. Newest
 * `max` of them, oldest first so new dots draw on top.
 * @param {object[]} requests oldest first
 * @param {number} now
 * @param {{ windowMs: number, max: number }} options
 */
export function activeDots(requests, now, { windowMs, max }) {
  return requests
    .filter((row) => row.state === 'pending' || now - row.startedAt <= windowMs)
    .slice(-max);
}

/**
 * Background work the server did recently, from its log contexts.
 * @param {object[]} serverEntries normalized, oldest first
 * @param {number} now
 * @param {number} windowMs
 * @returns {{ id: string, kind: 'bot' | 'receipts' | 'cleanup' }[]}
 */
export function activeRipples(serverEntries, now, windowMs) {
  return serverEntries
    .filter((entry) => now - entry.time <= windowMs)
    .map((entry) => {
      const match = RIPPLE_KINDS.find(({ pattern }) => pattern.test(entry.category));
      return match ? { id: entry.id, kind: match.kind } : null;
    })
    .filter(Boolean);
}

/**
 * "MessageController -> MessageService" for "/message/abc".
 * @param {string} path
 */
export function controllerFor(path) {
  const segment = path.split('?')[0].split('/').filter(Boolean)[0] ?? '';
  return CONTROLLERS[segment] ?? 'Controller -> Service';
}

function outcome(row) {
  if (row.state === 'pending') return 'still waiting for the reply';
  if (row.state === 'error')
    return `the screen shows the problem: ${row.error ?? 'request failed'}`;
  if (row.isPoll) return 'the list is merged by id; nothing re-renders if it did not change';
  if (row.method === 'POST' && row.path.startsWith('/message')) {
    return "the bubble's clock flips to a tick";
  }
  if (row.method === 'POST') return 'the new item appears on screen';
  return 'the screen renders the data';
}

function replyStep(row) {
  if (row.state === 'pending') return { node: 'reply', title: 'waiting for the reply', detail: '' };
  const status = row.status ?? row.error ?? 'failed';
  return {
    node: 'reply',
    title: `${status} comes back in ${row.durationMs ?? '?'}ms`,
    detail: row.responsePreview || row.error || '',
  };
}

/**
 * The real story of one request, one step per node. Never includes the password.
 * @param {object} row networkStore row
 * @param {{ baseUrl: string, name: string, serverLines: object[] }} context
 * @returns {{ node: string, title: string, detail: string }[]}
 */
export function explainSteps(row, { baseUrl, name, serverLines }) {
  const isPublic = !name;
  const server = serverLines.map((line) => line.message).join('\n');
  const reachedServer = row.status !== undefined;
  return [
    {
      node: 'phone',
      title: isPublic
        ? `app builds ${row.method} ${row.path} with no login`
        : `app builds Authorization: Basic ${name}:<hidden>`,
      detail: `X-Request-Id: ${row.id}${row.isPoll ? '\nX-Client-Poll: 1' : ''}`,
    },
    {
      node: 'wire',
      title: `HTTP ${row.method} to ${baseUrl}${row.path}`,
      detail: row.requestPreview || 'no body',
    },
    {
      node: 'guard',
      title: reachedServer
        ? `AuthGuard checks ${name || 'the header'}`
        : 'never reached the server',
      detail: row.status === 401 ? 'rejected: 401' : '',
    },
    {
      node: 'service',
      title: controllerFor(row.path),
      detail: server || 'server lines appear here when the server shares its logs',
    },
    { node: 'db', title: 'Prisma -> MongoDB', detail: '' },
    replyStep(row),
    { node: 'phone', title: outcome(row), detail: '' },
  ];
}
