'use strict';
// npm run seed: RESETS the data folder, then creates 1 admin, 10 students and the four exams of
// BUILD_PLAN §14 (published, open from now for a week). Running it again starts over.
// Passwords are random each run. They are printed once and written to seed-credentials.txt
// in the data folder, which is gitignored.

const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('../config');
const store = require('../lib/store');
const clock = require('../lib/clock');
const { newId, generatePassword } = require('../lib/ids');
const { hashPassword } = require('../lib/auth');
const { preset } = require('../lib/proctoring');
const { SAMPLE_TERMS } = require('../lib/terms');
const { checklist } = require('../lib/checklist');

const WINDOW_OPENS_EARLY_MS = 5 * 60 * 1000;
const WINDOW_DAYS = 7;

const STUDENTS = [
  ['23CS042', 'Asha Rao'], ['23CS017', 'Dev Khanna'], ['23CS051', 'Kunal Shah'], ['23CS033', 'Neel Patel'],
  ['23CS060', 'Riya Mehta'], ['23CS008', 'Aarav Sharma'], ['23CS021', 'Isha Verma'], ['23CS029', 'Kabir Singh'],
  ['23CS045', 'Meera Iyer'], ['23CS054', 'Rohan Das'],
];

const EXAMS = [require('./seed-data/cli'), require('./seed-data/electron'), require('./seed-data/reactNative'), require('./seed-data/swift')];

function clearData(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  store.FILES.forEach((name) => {
    ['', '.tmp'].forEach((suffix) => fs.rmSync(path.join(dataDir, `${name}.json${suffix}`), { force: true }));
  });
  // Flag/event JSON for the attempts being removed. The seed never touches proctorImages/:
  // every attempt has its own code folder, so old and new images can sit side by side.
  fs.rmSync(path.join(dataDir, 'records'), { recursive: true, force: true });
}

async function makeUser(rollNo, name, role, nowIso) {
  const password = generatePassword();
  const user = { id: newId('us'), rollNo, name, role, ...(await hashPassword(password)), active: true, createdAt: nowIso, lastLoginAt: null };
  return { user, password };
}

function makeExam(spec, nowMs) {
  const nowIso = clock.iso(nowMs);
  const exam = {
    id: newId('ex'), code: spec.code, title: spec.title, description: spec.description, status: 'published',
    durationMinutes: spec.durationMinutes,
    opensAt: clock.iso(nowMs - WINDOW_OPENS_EARLY_MS), closesAt: clock.iso(nowMs + WINDOW_DAYS * 24 * 3600 * 1000),
    maxAttempts: 1, shuffleQuestions: true, shuffleOptions: true,
    instructions: 'Answer every question. Your answers save automatically. The clock does not pause.',
    terms: SAMPLE_TERMS, termsUpdatedAt: nowIso,
    resultPolicy: { visibility: spec.visibility, passPercent: 40, holdAutoEnded: true },
    resultsPublishedAt: null, publishedAt: nowIso,
    proctoring: preset(spec.preset),
    questions: spec.questions,
    createdAt: nowIso, updatedAt: nowIso,
  };
  const { problems } = checklist(exam, nowMs);
  if (problems.length) throw new Error(`Seed exam ${spec.title} has problems: ${problems.map((p) => p.message).join('; ')}`);
  return exam;
}

/**
 * @param {{ dataDir: string }} options
 * @returns {Promise<{ admin: { rollNo: string, password: string }, students: { rollNo: string, name: string, password: string }[], exams: object[] }>}
 */
async function seed({ dataDir }) {
  clearData(dataDir);
  store.init(dataDir);
  const nowMs = clock.now();
  const nowIso = clock.iso(nowMs);
  const admin = await makeUser('admin', 'Exam Admin', 'admin', nowIso);
  const students = await Promise.all(STUDENTS.map(([rollNo, name]) => makeUser(rollNo, name, 'student', nowIso)));
  const exams = EXAMS.map((build) => makeExam(build(), nowMs));
  await store.update('users', () => [admin.user, ...students.map((s) => s.user)]);
  await store.update('exams', () => exams);
  await store.update('sessions', () => []);
  await store.update('attempts', () => []);
  return {
    admin: { rollNo: 'admin', password: admin.password },
    students: students.map((s) => ({ rollNo: s.user.rollNo, name: s.user.name, password: s.password })),
    exams: exams.map((e) => ({ id: e.id, title: e.title, questions: e.questions.length })),
  };
}

function credentialsText(result) {
  const lines = [
    `Athena seed credentials (${clock.iso()}). Keep this file private; it is gitignored.`,
    '',
    `admin      ${result.admin.password}   (Exam Admin)`,
    ...result.students.map((s) => `${s.rollNo.padEnd(10)} ${s.password}   (${s.name})`),
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const config = loadConfig();
  const result = await seed({ dataDir: config.dataDir });
  const text = credentialsText(result);
  const file = path.join(config.dataDir, 'seed-credentials.txt');
  fs.writeFileSync(file, text, { mode: 0o600 });
  process.stdout.write(`Seeded ${config.dataDir}\n${result.exams.map((e) => `  exam: ${e.title} (${e.questions} questions)`).join('\n')}\n\n${text}\nSaved to ${file}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`Seed failed: ${err.stack}\n`);
    process.exit(1);
  });
}

module.exports = { seed };
