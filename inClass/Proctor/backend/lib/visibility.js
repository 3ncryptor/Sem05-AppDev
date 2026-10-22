'use strict';
// When a student may see a result (BUILD_PLAN §8 "Result visibility", §19.5).
// GET /attempts/:id/result checks only attempt.resultVisibleAt; these rules decide when it gets set.

const store = require('./store');
const clock = require('./clock');
const { round2 } = require('./scoring');

/** Held = auto-ended by flags, the exam holds those, and nobody has decided yet. */
function isHeld(attempt, exam) {
  return Boolean(exam.resultPolicy.holdAutoEnded)
    && attempt.submitReason === 'flag_limit'
    && attempt.review.status === 'pending';
}

/**
 * Returns the attempt with resultVisibleAt brought in line with the rules. Pure.
 * Once visible it stays visible, unless the attempt becomes held again (Undo on a decision).
 */
function withVisibility(attempt, exam, nowIso) {
  if (attempt.status !== 'submitted' || isHeld(attempt, exam)) {
    return attempt.resultVisibleAt === null ? attempt : { ...attempt, resultVisibleAt: null };
  }
  if (attempt.resultVisibleAt) return attempt;
  const allowed = exam.resultPolicy.visibility === 'after_submit' || Boolean(exam.resultsPublishedAt);
  return allowed ? { ...attempt, resultVisibleAt: nowIso } : attempt;
}

/** Re-applies the rules to every attempt of an exam (after publishing results or changing the policy). */
async function syncExam(exam) {
  const nowIso = clock.iso();
  await store.update('attempts', (list) => {
    const next = list.map((a) => (a.examId === exam.id ? withVisibility(a, exam, nowIso) : a));
    return next.every((a, i) => a === list[i]) ? list : next;
  });
}

/** @returns {number|null} percent with one decimal */
function percentOf(attempt) {
  if (attempt.score === null || !attempt.maxScore) return null;
  return Math.round((attempt.score / attempt.maxScore) * 1000) / 10;
}

/** @returns {'Passed'|'Not passed'|'Disqualified'|null} */
function outcomeOf(attempt, exam) {
  if (attempt.status !== 'submitted' || attempt.score === null) return null;
  if (attempt.review.status === 'disqualified') return 'Disqualified';
  return percentOf(attempt) >= exam.resultPolicy.passPercent ? 'Passed' : 'Not passed';
}

/** Score fields shared by every result-shaped response. */
function scoreSummary(attempt, exam) {
  return {
    score: attempt.score === null ? null : round2(attempt.score),
    maxScore: attempt.maxScore,
    percent: percentOf(attempt),
    outcome: outcomeOf(attempt, exam),
    passPercent: exam.resultPolicy.passPercent,
  };
}

module.exports = { isHeld, withVisibility, syncExam, percentOf, outcomeOf, scoreSummary };
