/**
 * flowPath: the system's architecture as data, and the real path one request
 * takes through it (buildPlan.md 15, flow tab). Pure, so it is tested.
 *
 *   FRONTEND   screen -> store / hook -> api client
 *   NETWORK    HTTP over Wi-Fi
 *   BACKEND    middleware -> AuthGuard -> controller -> service -> Prisma
 *   DATABASE   users | conversations | messages | files   (MongoDB)
 *
 * The backend part is read from this repository's backend code. On the
 * teacher's server it is "from the code" (that server shares no logs).
 */

export const ARCHITECTURE = [
  {
    id: 'frontend',
    title: 'frontend',
    subtitle: 'this phone',
    nodes: ['screen', 'store', 'client'],
  },
  { id: 'network', title: 'network', subtitle: 'HTTP over Wi-Fi', nodes: ['http'] },
  {
    id: 'backend',
    title: 'backend',
    subtitle: 'NestJS server',
    nodes: ['middleware', 'guard', 'controller', 'service', 'prisma'],
  },
  {
    id: 'database',
    title: 'database',
    subtitle: 'MongoDB',
    nodes: ['users', 'conversations', 'messages', 'files'],
  },
];

export const NODE_ORDER = ARCHITECTURE.flatMap((layer) => layer.nodes);

const COLLECTIONS = new Set(['users', 'conversations', 'messages', 'files']);

const NODES = {
  screen: {
    title: 'screen',
    plain: 'What you see and tap. It asks for data and shows it.',
    technical: 'Expo Router screens, app/*.jsx',
    file: 'app/(tabs)/chats.jsx, app/chat/[id].jsx',
  },
  store: {
    title: 'store / hook',
    plain: 'Keeps the data in memory and decides when to ask the server again.',
    technical: 'createStore + useStore, polling timers (createPoller)',
    file: 'src/store/*.js, src/hooks/*.js',
  },
  client: {
    title: 'api client',
    plain: 'Writes the request: the address, your name and password, and a tracking id.',
    technical: 'fetch with Authorization: Basic, X-Request-Id, a 10 s timeout',
    file: 'src/api/client.js',
  },
  http: {
    title: 'HTTP',
    plain: 'The request travels over Wi-Fi to the laptop or the class server.',
    technical: 'HTTP/1.1 over the local network, JSON bodies',
    file: '-',
  },
  middleware: {
    title: 'middleware',
    plain: 'The server notes the tracking id, so its logs can be matched to this request.',
    technical: 'RequestContext (AsyncLocalStorage), request logger',
    file: 'backend/src/common/request-context.ts',
  },
  guard: {
    title: 'AuthGuard',
    plain: 'Checks the name and password on every request. Wrong password: it stops here.',
    technical: 'Basic auth; a new name is created on first login; 401 on a bad password',
    file: 'backend/src/auth/auth.guard.ts',
  },
  controller: {
    title: 'controller',
    plain: 'Finds which feature the request is for and checks the input.',
    technical: 'NestJS @Controller routes and DTO validation (400 on bad input)',
    file: 'backend/src/*/*.controller.ts',
  },
  service: {
    title: 'service',
    plain: 'Does the actual work: who may see what, what to save, what to send back.',
    technical: 'NestJS @Injectable services with the business rules',
    file: 'backend/src/*/*.service.ts',
  },
  prisma: {
    title: 'Prisma',
    plain: 'Turns the work into database reads and writes.',
    technical: 'Prisma Client (findMany, create, update ...) for MongoDB',
    file: 'backend/src/prisma/prisma.service.ts',
  },
  users: {
    title: 'users',
    plain: 'Everyone who has logged in.',
    technical: 'MongoDB collection User',
    file: 'backend/prisma/schema.prisma',
  },
  conversations: {
    title: 'conversations',
    plain: 'Every chat: direct messages and groups, and who is in them.',
    technical: 'MongoDB collection Conversation',
    file: 'backend/prisma/schema.prisma',
  },
  messages: {
    title: 'messages',
    plain: 'Every message, with when it was sent and whether it was delivered.',
    technical: 'MongoDB collection Message',
    file: 'backend/prisma/schema.prisma',
  },
  files: {
    title: 'files',
    plain: 'Photos sent in chats.',
    technical: 'MongoDB collection File (base64 data)',
    file: 'backend/prisma/schema.prisma',
  },
};

/** @param {string} id */
export function nodeInfo(id) {
  return { id, ...NODES[id] };
}

const ROUTES = [
  { prefix: '/message', collection: 'messages', screen: 'chat room', store: 'messageController' },
  { prefix: '/conversation', collection: 'conversations', screen: 'chats', store: 'chatsStore' },
  { prefix: '/user/profile', collection: 'users', screen: 'login', store: 'useLogin' },
  { prefix: '/user', collection: 'users', screen: 'people', store: 'directoryStore' },
  { prefix: '/file', collection: 'files', screen: 'chat room', store: 'imageCache' },
  { prefix: '/debug/logs', collection: null, screen: 'inspector', store: 'serverLogStore' },
];

function routeFor(path) {
  const clean = path.split('?')[0];
  return (
    ROUTES.find((route) => clean === route.prefix || clean.startsWith(`${route.prefix}/`)) ?? {
      collection: null,
      screen: 'app',
      store: 'store',
    }
  );
}

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;

/** Where a failed request stopped. */
function stopFor(row) {
  if (row.state !== 'error') return null;
  if (row.status === undefined) return 'http';
  if (row.status === 401 || row.status === 403) return 'guard';
  if (row.status >= SERVER_ERROR) return 'service';
  if (row.status >= BAD_REQUEST) return 'controller';
  return null;
}

/**
 * @param {{ method: string, path: string, state: string, status?: number,
 *   isPoll?: boolean, initiator?: string }} row a networkStore row
 * @returns {{ down: string[], stop: string | null, collection: string | null,
 *   op: 'read' | 'write', starter: { screen: string, store: string } }}
 */
export function routeOf(row) {
  const route = routeFor(row.path);
  const stop = stopFor(row);
  const full = [
    'screen',
    'store',
    'client',
    'http',
    'middleware',
    'guard',
    'controller',
    'service',
  ];
  if (route.collection) full.push('prisma', route.collection);
  const down = stop ? full.slice(0, full.indexOf(stop) + 1) : full;
  return {
    down,
    stop,
    collection: route.collection,
    op: row.method === 'GET' ? 'read' : 'write',
    starter: {
      screen: route.screen,
      store:
        row.initiator ??
        (row.isPoll && route.store === 'messageController' ? 'chat poll' : route.store),
    },
  };
}

/** @param {object} row */
export function touchesDatabase(row) {
  const { down } = routeOf(row);
  return COLLECTIONS.has(down.at(-1));
}
