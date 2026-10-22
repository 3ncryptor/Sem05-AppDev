'use strict';
// npm run smoke: the whole story over real HTTP, printed as PASS/FAIL per step.
// It seeds a fresh temporary data folder, starts the server on PORT (default 3100) as a child
// process, runs every step, stops the server and deletes the folder. Your real data is untouched.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { seed } = require('./seed');
const { makeClient, makeRecorder } = require('./smoke-client');
const { buildExam } = require('./smoke-build');
const { studentFlow } = require('./smoke-student');
const { reviewAndPublish, adminActions, reportsAndAccounts } = require('./smoke-admin');

const PORT = process.env.SMOKE_PORT || '3100';
const BASE = `http://127.0.0.1:${PORT}`;
const STARTUP_TRIES = 50;
const STARTUP_WAIT_MS = 100;

async function waitForServer(api) {
  for (let i = 0; i < STARTUP_TRIES; i += 1) {
    try {
      const r = await api.get('/api/health');
      if (r.status === 200) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => { setTimeout(resolve, STARTUP_WAIT_MS); });
  }
  throw new Error(`Server did not start on ${BASE}`);
}

function startServer(dataDir) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT, HOST: '127.0.0.1', DATA_DIR: dataDir },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  child.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  return child;
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-smoke-'));
  const seeded = await seed({ dataDir });
  const server = startServer(dataDir);
  const api = makeClient(BASE);
  const { step, results } = makeRecorder();
  const ctx = {};
  try {
    await waitForServer(api);
    await buildExam({ api, step, ctx, seeded });
    await studentFlow({ api, step, ctx });
    await reviewAndPublish({ api, step, ctx });
    await adminActions({ api, step, ctx });
    await reportsAndAccounts({ api, step, ctx });
  } finally {
    server.kill();
    if (!process.env.SMOKE_KEEP) fs.rmSync(dataDir, { recursive: true, force: true });
    else process.stdout.write(`Kept data in ${dataDir}\n`);
  }
  const failed = results.filter((r) => !r.ok).length;
  process.stdout.write(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`Smoke run crashed: ${err.stack}\n`);
  process.exit(1);
});
