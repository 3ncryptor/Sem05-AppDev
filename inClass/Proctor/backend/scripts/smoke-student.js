'use strict';
// Smoke part 2: the student's attempt: start, answers, flags, evidence, heartbeat, submit.

const { expect } = require('./smoke-client');

const CONSENT = { consent: { capture: true, events: true, terms: true, termsVersion: '2026-10-23' }, systemCheck: { camera: 'ok', face: 'ok', screen: 'granted', displays: 1 } };
const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

/** Answers built from the admin's keys. Expected marks are worked out by hand in the comments. */
function answersFor(q) {
  const order = q.ordering.key.order;
  const pairs = q.matching.key.pairs;
  const leftIds = Object.keys(pairs);
  const wrongRight = q.matching.config.right[4].id;
  const multiWrong = q.multi.config.options.find((o) => !q.multi.key.optionIds.includes(o.id)).id;
  return [
    [q.single, { optionId: q.single.key.optionId }, 2], // correct → 2
    [q.multi, { optionIds: [q.multi.key.optionIds[0], q.multi.key.optionIds[1], multiWrong] }, 1], // 3 × (2 − 1) / 3 = 1
    [q.true_false, { value: true }, 1], // correct → 1
    [q.short_text, { text: '  -a ' }, 2], // trimmed match → 2
    [q.numeric, { number: 0 }, 2], // exact → 2
    [q.ordering, { order: [order[1], order[0], order[2], order[3]] }, 2], // 2 of 4 in place × 4 = 2
    [q.matching, { pairs: { ...pairs, [leftIds[3]]: wrongRight } }, 3], // 3 of 4 pairs × 4 = 3
  ];
}

function noSecrets(json) {
  const text = JSON.stringify(json);
  return !text.includes('"key"') && !text.includes('"explanation"');
}

async function studentFlow({ api, step, ctx }) {
  const s1 = ctx.s1.token;
  await step('exams.list shows the new exam as open, with no key', async () => {
    const r = await api.get('/api/exams', { token: s1 });
    const card = r.data.exams.find((e) => e.id === ctx.examId);
    expect(card && card.myStatus === 'open' && card.attemptsLeft === 1 && card.questionCount === 7, `card ${JSON.stringify(card)}`);
    const detail = await api.get(`/api/exams/${ctx.examId}`, { token: s1 });
    expect(detail.data.exam.proctoringSummary.text && noSecrets(detail.json), 'detail leaks or lacks summary');
  });
  await step('start attempt returns questions without key or explanation', async () => {
    const r = await api.post(`/api/exams/${ctx.examId}/attempts`, { token: s1, body: CONSENT });
    expect(r.status === 201 && r.data.questions.length === 7 && noSecrets(r.json), `got ${r.status} ${JSON.stringify(r.error)}`);
    expect(/^ATH-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(r.data.attempt.code), 'bad attempt code');
    ctx.att1 = r.data.attempt;
  });
  await step('starting again resumes the same attempt', async () => {
    const r = await api.post(`/api/exams/${ctx.examId}/attempts`, { token: s1, body: CONSENT });
    expect(r.status === 200 && r.data.resumed && r.data.attempt.id === ctx.att1.id, `got ${r.status}`);
  });
  await step('second student starts an attempt (used later for admin actions)', async () => {
    const r = await api.post(`/api/exams/${ctx.examId}/attempts`, { token: ctx.s2.token, body: CONSENT });
    expect(r.status === 201, `got ${r.status}`);
    ctx.att2 = r.data.attempt;
  });
  await step('answers for every type are saved', async () => {
    ctx.expected = answersFor(ctx.q);
    for (const [question, response] of ctx.expected) {
      const r = await api.put(`/api/attempts/${ctx.att1.id}/answers/${question.id}`, { token: s1, body: { revision: 2, response, timeSpentSec: 20, marked: false } });
      expect(r.status === 200 && r.data.applied, `${question.type}: ${r.status} ${JSON.stringify(r.error)}`);
    }
  });
  await step('a stale revision is ignored', async () => {
    const wrong = ctx.q.single.config.options[0].id;
    const r = await api.put(`/api/attempts/${ctx.att1.id}/answers/${ctx.q.single.id}`, { token: s1, body: { revision: 1, response: { optionId: wrong } } });
    expect(r.status === 200 && r.data.applied === false && r.data.revision === 2, `got ${JSON.stringify(r.data)}`);
  });
  await step('an answer of the wrong shape is rejected', async () => {
    const r = await api.put(`/api/attempts/${ctx.att1.id}/answers/${ctx.q.numeric.id}`, { token: s1, body: { revision: 3, response: { text: 'zero' } } });
    expect(r.status === 400 && r.error.code === 'INVALID_RESPONSE', `got ${r.status}`);
  });
  await step('blur + fullscreen exit within 2 s become ONE flag', async () => {
    const t = new Date().toISOString();
    const events = [
      { seq: 1, type: 'window_blur', phase: 'start', clientTs: t, questionId: ctx.q.single.id },
      { seq: 2, type: 'fullscreen_exit', phase: 'start', clientTs: t },
      { seq: 3, type: 'window_blur', phase: 'end', clientTs: t },
    ];
    const r = await api.post(`/api/attempts/${ctx.att1.id}/events`, { token: s1, body: { events } });
    const w = r.data.warnings;
    expect(r.data.accepted === 3 && w.length === 1, `accepted ${r.data.accepted}, warnings ${w.length}`);
    expect(w[0].flagNo === 1 && w[0].first && w[0].rules.includes('focus') && w[0].rules.includes('fullscreen'), JSON.stringify(w[0]));
    const again = await api.post(`/api/attempts/${ctx.att1.id}/events`, { token: s1, body: { events } });
    expect(again.data.accepted === 0, 'repeated seq was not ignored');
  });
  await evidenceSteps({ api, step, ctx });
  await step('heartbeat returns the clock and the flag count', async () => {
    const r = await api.post(`/api/attempts/${ctx.att1.id}/heartbeat`, { token: s1, body: { seq: 1, sensors: { fullscreen: true, focused: true, displays: 1, camera: 'live', faces: 1, faceDetector: 'ok', online: true }, events: [] } });
    expect(r.data.status === 'in_progress' && r.data.flagCount === 1 && r.data.maxFlags === 5 && r.data.serverNow && !r.data.forced, JSON.stringify(r.data));
  });
  await step('submit, and submit again returns the same receipt', async () => {
    const r = await api.post(`/api/attempts/${ctx.att1.id}/submit`, { token: s1 });
    expect(r.data.received === 7 && r.data.total === 7 && r.data.resultVisible === false && r.data.submitReason === 'student', JSON.stringify(r.data));
    const again = await api.post(`/api/attempts/${ctx.att1.id}/submit`, { token: s1 });
    expect(again.data.code === r.data.code && again.data.submittedAt === r.data.submittedAt, 'second submit changed the receipt');
  });
  await step('result is hidden for an after_publish exam', async () => {
    const r = await api.get(`/api/attempts/${ctx.att1.id}/result`, { token: s1 });
    expect(r.status === 404 && r.error.code === 'RESULTS_NOT_AVAILABLE', `got ${r.status}`);
  });
  await step("a student can't read someone else's attempt", async () => {
    const r = await api.get(`/api/attempts/${ctx.att1.id}`, { token: ctx.s2.token });
    expect(r.status === 403 && r.error.code === 'FORBIDDEN', `got ${r.status}`);
  });
}

async function evidenceSteps({ api, step, ctx }) {
  const s1 = ctx.s1.token;
  const url = (seq) => `/api/attempts/${ctx.att1.id}/evidence?kind=screen&seq=${seq}&capturedAt=${encodeURIComponent(new Date().toISOString())}&reason=flag`;
  await step('a tiny valid JPEG is stored under the right name', async () => {
    const r = await api.post(url(1), { token: s1, raw: TINY_JPEG });
    expect(r.status === 201 && /^screen\/[A-Za-z0-9_]+-[A-Za-z0-9_]+-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.jpg$/.test(r.data.file) && !r.data.duplicate, JSON.stringify(r.json));
    ctx.evidenceFile = r.data.file;
    const again = await api.post(url(1), { token: s1, raw: TINY_JPEG });
    expect(again.data.duplicate === true && again.data.file === r.data.file, 'retry was not idempotent');
  });
  await step('a non-JPEG and an oversized image are rejected', async () => {
    const bad = await api.post(url(2), { token: s1, raw: Buffer.from('not an image at all') });
    expect(bad.status === 400 && bad.error.code === 'VALIDATION_FAILED', `non-jpeg got ${bad.status}`);
    const big = Buffer.concat([TINY_JPEG.subarray(0, 3), Buffer.alloc(1024 * 1024 + 10)]);
    const large = await api.post(url(3), { token: s1, raw: big });
    expect(large.status === 413 && large.error.code === 'PAYLOAD_TOO_LARGE', `large got ${large.status}`);
  });
}

module.exports = { studentFlow };
