/**
 * The three projects side by side. Each column is a summary of the project's
 * own figure (see each project README), so every box here is checked there:
 *   CLI-Player   inClass/CLI-Player/songs/cliPlayer.js, audio_player.m
 *   Athena       inClass/Proctor/app/electron/*, inClass/Proctor/backend/server.js
 *   huddle.      inClass/ChatApp/frontend/src/api/client.js, inClass/ChatApp/backend/docker-compose.yml
 */
const COLS = [28, 416, 804];
const W = 368;
const NODE_X = (col) => COLS[col] + 20;
const NODE_W = W - 40;
const Y = [140, 252, 364];
const H = 64;
const midX = (col) => COLS[col] + W / 2;

export default {
  id: 'overview',
  out: 'docs/diagrams/overview',
  width: 1200,
  height: 600,
  title: 'Three projects, three architectures',
  desc:
    'Left: the CLI Music Player, a terminal process that drives a native audio process over stdin and stdout. ' +
    'Middle: Athena, a sandboxed Electron renderer that reaches an Express server only through the main process. ' +
    'Right: huddle., a phone app that polls a NestJS API in Docker, which stores data in MongoDB through Prisma.',
  heading: 'Sem05-AppDev: three projects, three architectures',
  caption: 'A terminal program, a desktop app and a mobile app with a server. Each project README has the detailed figure.',
  legend: [
    ['client', 'user interface'],
    ['native', 'native or privileged process'],
    ['server', 'server'],
    ['data', 'storage'],
  ],
  dashedMeaning: 'fallback',
  dotMeaning: 'data in flight',
  groups: [
    { x: COLS[0], y: 88, w: W, h: 448, layer: 'client', label: 'CLI Music Player  (inClass/CLI-Player)' },
    { x: COLS[1], y: 88, w: W, h: 448, layer: 'native', label: 'Athena  (inClass/Proctor)' },
    { x: COLS[2], y: 88, w: W, h: 448, layer: 'server', label: 'huddle.  (inClass/ChatApp)' },
  ],
  nodes: [
    { x: NODE_X(0), y: Y[0], w: NODE_W, h: H, layer: 'client', title: 'Terminal process (Bun or Node.js)', lines: ['OpenTUI dashboard, player state'] },
    { x: NODE_X(0), y: Y[1], w: NODE_W, h: H, layer: 'native', title: 'audio_player (Objective-C)', lines: ['AVAudioPlayer, speed and volume'] },
    { x: NODE_X(0), y: Y[2], w: NODE_W, h: H, layer: 'native', dashed: true, title: 'afplay (macOS)', lines: ['used if audio_player is missing'] },

    { x: NODE_X(1), y: Y[0], w: NODE_W, h: H, layer: 'client', title: 'Renderer: React 19, sandboxed', lines: ['no Node.js, no network'] },
    { x: NODE_X(1), y: Y[1], w: NODE_W, h: H, layer: 'native', title: 'Electron 44 main process', lines: ['token, answer queue, screenshots'] },
    { x: NODE_X(1), y: Y[2], w: NODE_W, h: H, layer: 'server', title: 'Express 5 server', lines: ['JSON files, screenshots folder'] },

    { x: NODE_X(2), y: Y[0], w: NODE_W, h: H, layer: 'client', title: 'Phone: Expo Go, React Native', lines: ['stores, polling, Inspector'] },
    { x: NODE_X(2), y: Y[1], w: NODE_W, h: H, layer: 'server', title: 'NestJS 11 API (Docker)', lines: ['global AuthGuard, validation'] },
    { x: NODE_X(2), y: Y[2], w: NODE_W, h: H, layer: 'data', title: 'MongoDB 7.0 (Docker)', lines: ['replica set rs0, via Prisma 6'] },
  ],
  edges: [
    { id: 'ov-cli-1', points: [[midX(0) - 40, Y[0] + H], [midX(0) - 40, Y[1] - 1]], label: 'stdin', labelAt: [midX(0) - 72, Y[0] + H + 12] },
    { id: 'ov-cli-2', points: [[midX(0) + 40, Y[1]], [midX(0) + 40, Y[0] + H + 1]], label: 'stdout', labelAt: [midX(0) + 76, Y[0] + H + 12] },
    { id: 'ov-cli-3', points: [[NODE_X(0), Y[0] + 44], [COLS[0] + 10, Y[0] + 44], [COLS[0] + 10, Y[2] + 32], [NODE_X(0) - 1, Y[2] + 32]], dashed: true },

    { id: 'ov-ath-1', points: [[midX(1), Y[0] + H], [midX(1), Y[1] - 1]], arrow: 'both', label: 'IPC allow-list', labelAt: [midX(1) + 60, Y[0] + H + 12] },
    { id: 'ov-ath-2', points: [[midX(1), Y[1] + H], [midX(1), Y[2] - 1]], arrow: 'both', label: 'HTTP, Bearer', labelAt: [midX(1) + 56, Y[1] + H + 12] },

    { id: 'ov-hud-1', points: [[midX(2), Y[0] + H], [midX(2), Y[1] - 1]], arrow: 'both', label: 'HTTP polling, Basic', labelAt: [midX(2) + 80, Y[0] + H + 12] },
    { id: 'ov-hud-2', points: [[midX(2), Y[1] + H], [midX(2), Y[2] - 1]], arrow: 'both', label: 'Prisma', labelAt: [midX(2) + 34, Y[1] + H + 12] },
  ],
  notes: [
    { x: COLS[0] + 20, y: 470, text: 'Native code in its own process,' },
    { x: COLS[0] + 20, y: 488, text: 'driven by a line protocol over pipes.' },
    { x: COLS[1] + 20, y: 470, text: 'Least privilege: only the main process' },
    { x: COLS[1] + 20, y: 488, text: 'reaches the network and the file system.' },
    { x: COLS[2] + 20, y: 470, text: 'Client and containerised server;' },
    { x: COLS[2] + 20, y: 488, text: 'polling instead of push.' },
  ],
  flows: [
    { edge: 'ov-cli-1', period: 4, travel: 0.7, begin: 0, layer: 'client' },
    { edge: 'ov-cli-2', period: 4, travel: 0.7, begin: 1.2, layer: 'native' },
    { edge: 'ov-ath-1', period: 4, travel: 0.7, begin: 0.4, layer: 'client' },
    { edge: 'ov-ath-2', period: 4, travel: 0.7, begin: 1.1, layer: 'native' },
    { edge: 'ov-ath-2', period: 4, travel: 0.7, begin: 2.1, layer: 'server', reverse: true },
    { edge: 'ov-ath-1', period: 4, travel: 0.7, begin: 2.8, layer: 'native', reverse: true },
    { edge: 'ov-hud-1', period: 3, travel: 0.7, begin: 0.2, layer: 'client' },
    { edge: 'ov-hud-2', period: 3, travel: 0.5, begin: 0.9, layer: 'server' },
    { edge: 'ov-hud-2', period: 3, travel: 0.5, begin: 1.6, layer: 'data', reverse: true },
    { edge: 'ov-hud-1', period: 3, travel: 0.7, begin: 2.1, layer: 'server', reverse: true },
  ],
};
