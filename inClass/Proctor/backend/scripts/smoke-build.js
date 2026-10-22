'use strict';
// Smoke part 1: admin builds and publishes an exam with one question of each type; students sign in.

const { expect } = require('./smoke-client');

const PASSWORD_FORMAT = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

const QUESTIONS = [
  { type: 'single', marks: 2, topic: 'IPC', text: 'Which process can call `dialog.showOpenDialog`?', explanation: 'dialog is main-only.',
    config: { options: [{ text: 'Renderer' }, { text: 'Main' }, { text: 'Preload' }] } },
  { type: 'multi', marks: 3, topic: 'Process model', text: 'Which run in main?', explanation: 'Main owns windows.',
    config: { scoring: 'partial', options: [{ text: 'app' }, { text: 'ipcMain' }, { text: 'BrowserWindow' }, { text: 'DOM' }, { text: 'React' }] } },
  { type: 'true_false', marks: 1, topic: 'Preload', text: 'contextIsolation is on by default.', explanation: 'Since Electron 12.', key: { value: true } },
  { type: 'short_text', marks: 2, topic: 'Shell', text: 'Which ls flag shows hidden files?', explanation: '-a', key: { accepted: ['-a', '--all'], caseSensitive: true } },
  { type: 'numeric', marks: 2, topic: 'Exit codes', text: 'Exit code for success?', explanation: '0', key: { answer: 0, tolerance: 0 } },
  { type: 'ordering', marks: 4, topic: 'IPC', text: 'Order the IPC steps.', explanation: 'invoke → handle → resolve',
    config: { scoring: 'positional', items: [{ text: 'invoke' }, { text: 'preload forwards' }, { text: 'handle runs' }, { text: 'promise resolves' }] } },
  { type: 'matching', marks: 4, topic: 'Swift', text: 'Match keywords.', explanation: 'let/var/guard/defer',
    config: { left: [{ text: 'let' }, { text: 'var' }, { text: 'guard' }, { text: 'defer' }], right: [{ text: 'constant' }, { text: 'variable' }, { text: 'exit early' }, { text: 'on scope exit' }, { text: 'function' }] } },
];

/** Keys that can only be set once the server has given the items their ids. */
function keyFor(q) {
  if (q.type === 'multi') return { optionIds: [q.config.options[0].id, q.config.options[1].id, q.config.options[2].id] };
  if (q.type === 'matching') return { pairs: Object.fromEntries(q.config.left.map((l, i) => [l.id, q.config.right[i].id])) };
  return null;
}

async function buildExam({ api, step, ctx, seeded }) {
  await step('health check answers', async () => {
    const r = await api.get('/api/health');
    expect(r.status === 200 && r.json.ok, `status ${r.status}`);
  });
  await step('wrong password is rejected with a generic error', async () => {
    const r = await api.post('/api/auth/login', { body: { rollNo: 'admin', password: 'nope-nope' } });
    expect(r.status === 401 && r.error.code === 'INVALID_CREDENTIALS', `got ${r.status} ${r.error && r.error.code}`);
  });
  await step('admin signs in', async () => {
    const r = await api.post('/api/auth/login', { body: { rollNo: 'admin', password: seeded.admin.password } });
    expect(r.status === 200 && r.data.token && r.data.user.role === 'admin', `got ${r.status}`);
    ctx.admin = r.data.token;
  });
  await step('a student is refused on admin routes', async () => {
    const s = seeded.students[0];
    const login = await api.post('/api/auth/login', { body: { rollNo: s.rollNo, password: s.password } });
    ctx.seedStudent = login.data.token;
    const r = await api.get('/api/admin/exams', { token: ctx.seedStudent });
    expect(r.status === 403 && r.error.code === 'FORBIDDEN', `got ${r.status}`);
  });
  await step('admin creates a draft exam', async () => {
    const r = await api.post('/api/admin/exams', { token: ctx.admin, body: { title: 'Smoke Exam', description: 'All seven types' } });
    expect(r.status === 201 && r.data.exam.status === 'draft', `got ${r.status}`);
    ctx.examId = r.data.exam.id;
  });
  await step('admin adds one question of each of the seven types', async () => {
    ctx.q = {};
    for (const input of QUESTIONS) {
      const r = await api.post(`/api/admin/exams/${ctx.examId}/questions`, { token: ctx.admin, body: input });
      expect(r.status === 201, `${input.type}: ${r.status} ${JSON.stringify(r.error)}`);
      const key = keyFor(r.data.question);
      const saved = key ? await api.patch(`/api/admin/exams/${ctx.examId}/questions/${r.data.question.id}`, { token: ctx.admin, body: { key } }) : r;
      ctx.q[input.type] = saved.data.question;
    }
    expect(Object.keys(ctx.q).length === 7, 'not all types created');
  });
  await step('publish checklist lists the missing key and the missing window', async () => {
    const dry = await api.post(`/api/admin/exams/${ctx.examId}/publish`, { token: ctx.admin, body: { dryRun: true } });
    const codes = dry.data.problems.map((p) => p.code);
    expect(!dry.data.publishable && codes.includes('WINDOW_MISSING'), `codes ${codes}`);
    expect(dry.data.problems.some((p) => p.questionId === ctx.q.single.id && /no correct option/.test(p.message)), 'missing key not reported');
    const real = await api.post(`/api/admin/exams/${ctx.examId}/publish`, { token: ctx.admin, body: {} });
    expect(real.status === 422 && real.error.code === 'NOT_PUBLISHABLE' && real.error.problems.length === dry.data.problems.length, `got ${real.status}`);
  });
  await step('admin fixes the key, the window and proctoring, then publishes', async () => {
    const single = ctx.q.single;
    const fix = await api.patch(`/api/admin/exams/${ctx.examId}/questions/${single.id}`, { token: ctx.admin, body: { key: { optionId: single.config.options[1].id } } });
    ctx.q.single = fix.data.question;
    const now = Date.now();
    const settings = { durationMinutes: 30, opensAt: new Date(now - 60000).toISOString(), closesAt: new Date(now + 86400000).toISOString(), resultPolicy: { visibility: 'after_publish', holdAutoEnded: true } };
    const s = await api.put(`/api/admin/exams/${ctx.examId}/settings`, { token: ctx.admin, body: { settings } });
    expect(s.status === 200, `settings ${s.status} ${JSON.stringify(s.error)}`);
    const p = await api.put(`/api/admin/exams/${ctx.examId}/proctoring`, { token: ctx.admin, body: { proctoring: { preset: 'standard' } } });
    expect(p.status === 200 && p.data.exam.proctoring.autoEnd.maxFlags === 5, `proctoring ${p.status}`);
    const pub = await api.post(`/api/admin/exams/${ctx.examId}/publish`, { token: ctx.admin, body: {} });
    expect(pub.status === 200 && pub.data.status === 'published', `publish ${pub.status} ${JSON.stringify(pub.error)}`);
  });
  await step('questions are locked after publishing', async () => {
    const r = await api.post(`/api/admin/exams/${ctx.examId}/questions`, { token: ctx.admin, body: { type: 'true_false' } });
    expect(r.status === 409 && r.error.code === 'EXAM_LOCKED', `got ${r.status}`);
  });
  await step('admin adds two students and gets one-time passwords', async () => {
    const a = await api.post('/api/admin/users', { token: ctx.admin, body: { rollNo: 'SMK001', name: 'Smoke One' } });
    const b = await api.post('/api/admin/users', { token: ctx.admin, body: { rollNo: 'SMK002', name: '=Mallory' } });
    expect(a.status === 201 && PASSWORD_FORMAT.test(a.data.password) && PASSWORD_FORMAT.test(b.data.password), 'bad password format');
    const dup = await api.post('/api/admin/users', { token: ctx.admin, body: { rollNo: 'smk001', name: 'Dup' } });
    expect(dup.status === 400 && dup.error.fields.rollNo, 'duplicate roll number accepted');
    ctx.s1 = { id: a.data.user.id, password: a.data.password };
    ctx.s2 = { id: b.data.user.id, password: b.data.password };
    ctx.s1.token = (await api.post('/api/auth/login', { body: { rollNo: 'SMK001', password: a.data.password } })).data.token;
    ctx.s2.token = (await api.post('/api/auth/login', { body: { rollNo: 'SMK002', password: b.data.password } })).data.token;
    expect(ctx.s1.token && ctx.s2.token, 'students could not sign in');
  });
}

module.exports = { buildExam };
