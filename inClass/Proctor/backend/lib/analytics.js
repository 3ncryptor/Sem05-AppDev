'use strict';
// Analytics as pure functions over submitted attempts (BUILD_PLAN §6.6, §19.5, SCREENS A12 and C17).
// Computed on every request: at class size this is a few hundred numbers, not worth caching.

const clock = require('./clock');
const { typeModule, round2 } = require('./scoring');
const { percentOf } = require('./visibility');

const BIN_COUNT = 10;
const MS_PER_MINUTE = 60 * 1000;

const round1 = (n) => Math.round(n * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

function median(xs) {
  if (!xs.length) return null;
  const s = xs.toSorted((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const maybe = (n, f = round1) => (n === null ? null : f(n));

function histogram(percents) {
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: 0 }));
  return percents.reduce((acc, p) => {
    const index = Math.min(BIN_COUNT - 1, Math.floor(p / 10));
    return acc.map((b, i) => (i === index ? { ...b, count: b.count + 1 } : b));
  }, bins);
}

/** One plain sentence under the histogram, e.g. "Most students scored between 50 and 70 %." */
function reading(bins, percents, passPercent) {
  if (!percents.length) return 'No submitted attempts yet.';
  const pairs = bins.slice(0, -1).map((b, i) => ({ from: b.from, to: bins[i + 1].to, count: b.count + bins[i + 1].count }));
  const best = pairs.reduce((a, b) => (b.count > a.count ? b : a));
  const below = percents.filter((p) => p < passPercent).length;
  const belowText = below === 0 ? 'Nobody is below the pass mark.' : `${below} student${below === 1 ? ' is' : 's are'} below the pass mark.`;
  return `Most students scored between ${best.from} and ${best.to} %. ${belowText}`;
}

function commonWrong(question, answers) {
  const counts = answers
    .filter((a) => a && a.response !== null && a.marksAwarded < question.marks)
    .map((a) => typeModule(question.type).label(question, a.response))
    .reduce((m, label) => m.set(label, (m.get(label) || 0) + 1), new Map());
  const top = [...counts.entries()].reduce((best, entry) => (!best || entry[1] > best[1] ? entry : best), null);
  return top ? { label: top[0], count: top[1] } : null;
}

/** ⚠ "key?": among the top-scoring half, a wrong option was picked more often than the key. */
function keySuspect(question, rankedAttempts) {
  if (!['single', 'true_false'].includes(question.type)) return false;
  const top = rankedAttempts.slice(0, Math.ceil(rankedAttempts.length / 2));
  if (top.length < 2) return false;
  const pick = (a) => {
    const answer = a.answers[question.id];
    if (!answer || answer.response === null) return null;
    return question.type === 'single' ? answer.response.optionId : answer.response.value;
  };
  const keyValue = question.type === 'single' ? question.key.optionId : question.key.value;
  const counts = top.map(pick).filter((v) => v !== null).reduce((m, v) => m.set(v, (m.get(v) || 0) + 1), new Map());
  const keyCount = counts.get(keyValue) || 0;
  return [...counts.entries()].some(([v, c]) => v !== keyValue && c > keyCount);
}

function questionStats(exam, submitted) {
  const ranked = submitted.toSorted((a, b) => (b.score || 0) - (a.score || 0));
  return exam.questions.map((q, index) => {
    const rows = submitted.filter((a) => a.questionOrder.includes(q.id));
    const answers = rows.map((a) => a.answers[q.id]).filter(Boolean);
    const marks = rows.map((a) => (a.answers[q.id] ? a.answers[q.id].marksAwarded || 0 : 0));
    return {
      questionId: q.id, no: index + 1, text: q.text, type: q.type, topic: q.topic, marks: q.marks,
      attempts: rows.length,
      percentCorrect: rows.length ? round1((marks.filter((m) => m >= q.marks).length / rows.length) * 100) : null,
      avgMarks: maybe(mean(marks), round2),
      avgTimeSec: maybe(mean(answers.map((a) => a.timeSpentSec || 0)), Math.round),
      commonWrong: commonWrong(q, answers),
      keySuspect: keySuspect(q, ranked),
    };
  });
}

/** Accuracy (earned / possible marks) grouped by a key of each question, e.g. topic or type. */
function accuracyBy(attempts, questionsById, keyOf) {
  const totals = attempts.flatMap((a) => a.questionOrder.map((qid) => {
    const q = questionsById.get(qid);
    return q ? { key: keyOf(q), earned: a.answers[qid] ? a.answers[qid].marksAwarded || 0 : 0, possible: q.marks } : null;
  })).filter(Boolean).reduce((m, t) => {
    const prev = m.get(t.key) || { earned: 0, possible: 0, questions: 0 };
    return m.set(t.key, { earned: prev.earned + t.earned, possible: prev.possible + t.possible, questions: prev.questions + 1 });
  }, new Map());
  return [...totals.entries()].map(([key, t]) => ({ key: key || 'Untagged', accuracy: t.possible ? round1((t.earned / t.possible) * 100) : 0, questions: t.questions }));
}

function integrity(exam, attempts, flagsByAttempt) {
  const pairs = attempts.flatMap((a) => (flagsByAttempt.get(a.id) || []).filter((f) => !f.dismissed).map((f) => ({ a, f })));
  const byRule = pairs.flatMap(({ f }) => f.rules).reduce((m, r) => m.set(r, (m.get(r) || 0) + 1), new Map());
  const minutes = Array.from({ length: Math.max(1, exam.durationMinutes) }, (_, minute) => ({ minute, count: 0 }));
  const byMinute = pairs.filter(({ f }) => f.counted).reduce((acc, { a, f }) => {
    const minute = Math.floor((clock.ms(f.startedAt) - clock.ms(a.startedAt)) / MS_PER_MINUTE);
    return acc.map((b) => (b.minute === Math.min(minute, acc.length - 1) ? { ...b, count: b.count + 1 } : b));
  }, minutes);
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const decisions = ['pending', 'cleared', 'suspicious', 'disqualified']
    .reduce((d, s) => ({ ...d, [s]: submitted.filter((a) => a.review.status === s).length }), {});
  return {
    byRule: [...byRule.entries()].map(([rule, count]) => ({ rule, count })).toSorted((x, y) => y.count - x.count),
    byMinute,
    autoEnded: submitted.filter((a) => a.submitReason === 'flag_limit').length,
    decisions,
  };
}

/**
 * Admin analytics for one exam.
 * @param {{ exam: object, attempts: readonly object[], flagsByAttempt: Map<string, readonly object[]> }} input
 */
function examAnalytics({ exam, attempts, flagsByAttempt }) {
  const submitted = attempts.filter((a) => a.status === 'submitted' && a.score !== null);
  const percents = submitted.map(percentOf);
  const timesSec = submitted.map((a) => (clock.ms(a.submittedAt) - clock.ms(a.startedAt)) / 1000);
  const bins = histogram(percents);
  const questionsById = new Map(exam.questions.map((q) => [q.id, q]));
  return {
    n: submitted.length,
    tiles: {
      started: attempts.length,
      submitted: submitted.length,
      completionPercent: attempts.length ? round1((submitted.length / attempts.length) * 100) : null,
      meanPercent: maybe(mean(percents)),
      medianPercent: maybe(median(percents)),
      avgTimeUsedSec: maybe(mean(timesSec), Math.round),
      durationMinutes: exam.durationMinutes,
    },
    histogram: bins,
    markers: { mean: maybe(mean(percents)), median: maybe(median(percents)), passPercent: exam.resultPolicy.passPercent },
    reading: reading(bins, percents, exam.resultPolicy.passPercent),
    questions: questionStats(exam, submitted),
    topics: accuracyBy(submitted, questionsById, (q) => q.topic).map(({ key, ...rest }) => ({ topic: key, ...rest })),
    integrity: integrity(exam, attempts, flagsByAttempt),
  };
}

function avgTimePerQuestion(attempt) {
  const answered = Object.values(attempt.answers).filter((a) => a.response !== null);
  return answered.length ? answered.reduce((s, a) => s + (a.timeSpentSec || 0), 0) / answered.length : null;
}

/**
 * The student's own analytics, from attempts whose result they can see.
 * @param {{ mine: readonly object[], examsById: Map<string, object>, classByExam: Map<string, readonly object[]> }} input
 */
function studentAnalytics({ mine, examsById, classByExam }) {
  const visible = mine.filter((a) => a.resultVisibleAt && examsById.has(a.examId))
    .toSorted((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const percents = visible.map(percentOf);
  const questionsById = new Map([...examsById.values()].flatMap((e) => e.questions.map((q) => [q.id, q])));
  const classTimes = [...new Set(visible.map((a) => a.examId))]
    .flatMap((id) => classByExam.get(id) || []).map(avgTimePerQuestion).filter((t) => t !== null);
  const myTimes = visible.map(avgTimePerQuestion).filter((t) => t !== null);
  return {
    tiles: {
      examsTaken: visible.length,
      averagePercent: maybe(mean(percents)),
      bestPercent: percents.length ? Math.max(...percents) : null,
      flagsPerExam: maybe(mean(visible.map((a) => a.flagCount))),
    },
    trend: visible.map((a) => ({ attemptId: a.id, examId: a.examId, examTitle: examsById.get(a.examId).title, submittedAt: a.submittedAt, percent: percentOf(a) })),
    byTopic: accuracyBy(visible, questionsById, (q) => q.topic).map(({ key, ...rest }) => ({ topic: key, ...rest })),
    byType: accuracyBy(visible, questionsById, (q) => q.type).map(({ key, ...rest }) => ({ type: key, ...rest })),
    timePerQuestion: { me: maybe(mean(myTimes), Math.round), classMedian: maybe(median(classTimes), Math.round) },
    integrity: visible.map((a) => ({ attemptId: a.id, examTitle: examsById.get(a.examId).title, flagCount: a.flagCount })),
  };
}

module.exports = { examAnalytics, studentAnalytics, mean, median, histogram };
