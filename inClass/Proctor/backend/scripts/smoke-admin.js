'use strict';
// Smoke part 3: admin review and results, extend/end/resume and the flag limit, analytics, accounts.

const { expect } = require('./smoke-client');

const FLAG_SPACING_MS = 2500;
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function reviewAndPublish({ api, step, ctx }) {
  const admin = ctx.admin;
  await step('review queue lists the flagged attempt', async () => {
    const r = await api.get(`/api/admin/exams/${ctx.examId}/review-queue`, { token: admin });
    const row = r.data.queue.find((q) => q.attemptId === ctx.att1.id);
    expect(row && row.flagCount === 1 && row.risk.score >= 3, JSON.stringify(r.data));
  });
  await step('attempt detail has the merged flag with its capture', async () => {
    const r = await api.get(`/api/admin/attempts/${ctx.att1.id}`, { token: admin });
    const flags = r.data.flags;
    expect(flags.length === 1 && flags[0].rules.length === 2 && flags[0].captures.includes(ctx.evidenceFile), JSON.stringify(flags));
    expect(r.data.captures.length === 1 && typeof r.data.captures[0].offsetSec === 'number', 'captures missing');
    ctx.flag1 = flags[0].id;
  });
  await step('evidence downloads, and path traversal is refused', async () => {
    const ok = await api.get(`/api/admin/attempts/${ctx.att1.id}/evidence/${ctx.evidenceFile}`, { token: admin });
    expect(ok.status === 200 && ok.type.startsWith('image/jpeg') && ok.bytes.length === 14, `got ${ok.status}`);
    const sneaky = await api.get(`/api/admin/attempts/${ctx.att1.id}/evidence/screen/..%2F..%2F..%2F..%2Fusers.json`, { token: admin });
    const dots = await api.get(`/api/admin/attempts/${ctx.att1.id}/evidence/..%2F..%2Fflags.json/x.jpg`, { token: admin });
    expect(sneaky.status === 404 && dots.status === 404, `got ${sneaky.status} and ${dots.status}`);
  });
  await step('a decision needs a note', async () => {
    const bad = await api.put(`/api/admin/attempts/${ctx.att1.id}/review`, { token: admin, body: { status: 'cleared' } });
    expect(bad.status === 400 && bad.error.fields.note, `got ${bad.status}`);
    const good = await api.put(`/api/admin/attempts/${ctx.att1.id}/review`, { token: admin, body: { status: 'cleared', note: 'Notification popped up; not an issue.' } });
    expect(good.status === 200 && good.data.review.status === 'cleared', `got ${good.status}`);
  });
  await step('publish results: dry run counts, then publish', async () => {
    const dry = await api.post(`/api/admin/exams/${ctx.examId}/results/publish`, { token: admin, body: { dryRun: true } });
    expect(dry.data.willPublish === 1 && dry.data.held === 0, JSON.stringify(dry.data));
    const real = await api.post(`/api/admin/exams/${ctx.examId}/results/publish`, { token: admin, body: {} });
    expect(real.data.resultsPublishedAt, 'not published');
  });
  await step('result is visible with the right marks for every type', async () => {
    const r = await api.get(`/api/attempts/${ctx.att1.id}/result`, { token: ctx.s1.token });
    expect(r.status === 200, `got ${r.status}`);
    const byId = new Map(r.data.questions.map((q) => [q.id, q]));
    const wrong = ctx.expected.filter(([q, , marks]) => byId.get(q.id).marksAwarded !== marks).map(([q, , m]) => `${q.type} ${byId.get(q.id).marksAwarded}≠${m}`);
    expect(wrong.length === 0, wrong.join(', '));
    expect(r.data.score === 13 && r.data.maxScore === 18 && r.data.percent === 72.2 && r.data.outcome === 'Passed', JSON.stringify({ ...r.data, questions: undefined }));
    expect(r.data.questions.every((q) => q.key && 'explanation' in q), 'key or explanation missing');
  });
}

async function adminActions({ api, step, ctx }) {
  const admin = ctx.admin;
  const s2 = ctx.s2.token;
  const beat = () => api.post(`/api/attempts/${ctx.att2.id}/heartbeat`, { token: s2, body: { sensors: { camera: 'live' } } });
  await step('extend adds 10 minutes and the heartbeat sees it', async () => {
    const r = await api.post(`/api/admin/attempts/${ctx.att2.id}/extend`, { token: admin, body: { minutes: 10, reason: 'Power cut' } });
    expect(Date.parse(r.data.deadlineAt) - Date.parse(ctx.att2.deadlineAt) === 600000, `deadline ${r.data.deadlineAt}`);
    expect((await beat()).data.deadlineAt === r.data.deadlineAt, 'heartbeat has the old deadline');
  });
  await step('end stops the attempt; heartbeat says forced: admin', async () => {
    const r = await api.post(`/api/admin/attempts/${ctx.att2.id}/end`, { token: admin, body: { reason: 'Testing end' } });
    expect(r.data.submitReason === 'admin', JSON.stringify(r.data));
    const hb = await beat();
    expect(hb.data.forced && hb.data.forced.submitReason === 'admin', JSON.stringify(hb.data));
    const save = await api.put(`/api/attempts/${ctx.att2.id}/answers/${ctx.q.true_false.id}`, { token: s2, body: { revision: 1, response: { value: false } } });
    expect(save.status === 409 && save.error.code === 'ATTEMPT_NOT_ACTIVE', `save got ${save.status}`);
  });
  await step('resume reopens it with one extra allowed flag', async () => {
    const r = await api.post(`/api/admin/attempts/${ctx.att2.id}/resume`, { token: admin, body: { extraFlags: 1, reason: 'Ended by mistake' } });
    expect(r.data.status === 'in_progress' && r.data.maxFlags === 6, JSON.stringify(r.data));
  });
  await step('the flag limit (5 + 1 extra) ends the attempt', async () => {
    const started = Date.parse(ctx.att2.startedAt);
    const needed = started + 6 * FLAG_SPACING_MS + 500 - Date.now();
    if (needed > 0) await sleep(needed);
    const events = Array.from({ length: 6 }, (_, i) => ({ seq: 100 + i, type: 'window_blur', phase: 'start', clientTs: new Date(started + 200 + i * FLAG_SPACING_MS).toISOString() }));
    const r = await api.post(`/api/attempts/${ctx.att2.id}/events`, { token: s2, body: { events } });
    expect(r.data.warnings.length === 6 && r.data.forced && r.data.forced.submitReason === 'flag_limit', JSON.stringify(r.data));
    expect(r.data.warnings[4].final === true && r.data.warnings[0].first === true, 'first/final warnings wrong');
  });
  await step('a held result cannot be released; dismissing a flag lowers the count', async () => {
    const rel = await api.post(`/api/admin/attempts/${ctx.att2.id}/release`, { token: admin });
    expect(rel.status === 409 && rel.error.code === 'ATTEMPT_HELD', `release got ${rel.status}`);
    const detail = await api.get(`/api/admin/attempts/${ctx.att2.id}`, { token: admin });
    const d = await api.post(`/api/admin/attempts/${ctx.att2.id}/flags/${detail.data.flags[0].id}/dismiss`, { token: admin, body: { note: 'Network blip' } });
    expect(d.data.flagCount === 5, JSON.stringify(d.data));
  });
}

async function reportsAndAccounts({ api, step, ctx }) {
  const admin = ctx.admin;
  await step('results CSV escapes cells that start with = + - @', async () => {
    const r = await api.get(`/api/admin/exams/${ctx.examId}/results.csv`, { token: admin });
    const text = r.bytes.toString('utf8');
    expect(text.startsWith('rollNo,name') && text.includes("'=Mallory") && !text.includes(',=Mallory'), text.slice(0, 200));
  });
  await step('admin analytics numbers are sane', async () => {
    const r = await api.get(`/api/admin/exams/${ctx.examId}/analytics`, { token: admin });
    const a = r.data;
    const binTotal = a.histogram.reduce((s, b) => s + b.count, 0);
    expect(a.tiles.started === 2 && a.tiles.submitted === 2 && binTotal === 2 && a.questions.length === 7, JSON.stringify(a.tiles));
    expect(a.tiles.meanPercent === 36.1 && a.markers.median === 36.1, `mean ${a.tiles.meanPercent}`);
    const single = a.questions.find((q) => q.type === 'single');
    expect(single.percentCorrect === 50 && a.integrity.autoEnded === 1, JSON.stringify(single));
  });
  await step('student analytics counts only visible results', async () => {
    const r = await api.get('/api/me/analytics', { token: ctx.s1.token });
    expect(r.data.tiles.examsTaken === 1 && r.data.tiles.averagePercent === 72.2 && r.data.byType.length === 7, JSON.stringify(r.data.tiles));
    const mine = await api.get('/api/me/attempts', { token: ctx.s1.token });
    expect(mine.data.attempts[0].percent === 72.2 && mine.data.attempts[0].outcome === 'Passed', 'me.attempts wrong');
  });
  await step('admin home and live views', async () => {
    const home = await api.get('/api/admin/home', { token: admin });
    expect(home.data.tiles.liveExams >= 5 && home.data.tiles.toReview >= 1, JSON.stringify(home.data.tiles));
    const live = await api.get(`/api/admin/exams/${ctx.examId}/live`, { token: admin });
    expect(live.data.counters.submitted === 2 && live.data.counters.endedByFlags === 1 && live.data.feed.length >= 1, JSON.stringify(live.data.counters));
  });
  await step('import dry run checks every row', async () => {
    const rows = [{ rollNo: 'SMK010', name: 'New One' }, { rollNo: 'SMK001', name: 'Exists' }, { rollNo: '', name: 'No Roll' }];
    const r = await api.post('/api/admin/users/import', { token: admin, body: { rows, dryRun: true } });
    expect(r.data.counts.ready === 1 && r.data.counts.exists === 1 && r.data.counts.problems === 1, JSON.stringify(r.data.counts));
  });
  await step('reset password signs the student out; turning off blocks sign-in', async () => {
    const reset = await api.post(`/api/admin/users/${ctx.s1.id}/reset-password`, { token: admin });
    const old = await api.get('/api/auth/me', { token: ctx.s1.token });
    expect(old.status === 401, `old token still works (${old.status})`);
    const login = await api.post('/api/auth/login', { body: { rollNo: 'SMK001', password: reset.data.password } });
    expect(login.status === 200, `new password login ${login.status}`);
    await api.patch(`/api/admin/users/${ctx.s1.id}`, { token: admin, body: { active: false } });
    const off = await api.post('/api/auth/login', { body: { rollNo: 'SMK001', password: reset.data.password } });
    expect(off.status === 403 && off.error.code === 'ACCOUNT_INACTIVE', `got ${off.status}`);
  });
}

module.exports = { reviewAndPublish, adminActions, reportsAndAccounts };
