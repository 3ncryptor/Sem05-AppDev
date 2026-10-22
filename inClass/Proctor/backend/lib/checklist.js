'use strict';
// The publish checklist (SCREENS A7). Pure: exam in, every problem out, so the dialog can list
// them all at once and the server refuses exactly the same list.

const clock = require('./clock');
const { questionProblems, shortStem, totalMarks } = require('./questions');

const MS_PER_MINUTE = 60 * 1000;

function windowProblems(exam) {
  const opens = clock.ms(exam.opensAt);
  const closes = clock.ms(exam.closesAt);
  if (opens === null || closes === null) {
    return [{ code: 'WINDOW_MISSING', target: 'settings', message: 'The exam window is not set' }];
  }
  if (closes <= opens) return [{ code: 'WINDOW_ORDER', target: 'settings', message: 'Window closes before it opens' }];
  if (closes - opens < exam.durationMinutes * MS_PER_MINUTE) {
    return [{ code: 'WINDOW_SHORT', target: 'settings', message: 'The window is shorter than the duration' }];
  }
  return [];
}

function questionListProblems(exam) {
  if (exam.questions.length === 0) return [{ code: 'NO_QUESTIONS', target: 'questions', message: 'The exam has no questions' }];
  return exam.questions.flatMap((q, i) => questionProblems(q).map((p) => ({
    code: 'QUESTION', target: 'questions', questionId: q.id, message: `${shortStem(q, i)}: ${p}`,
  })));
}

function checklistWarnings(exam, nowMs) {
  const warnings = [];
  if (!exam.proctoring.enabled) warnings.push({ code: 'PROCTORING_OFF', target: 'proctoring', message: 'Proctoring is Off' });
  if (exam.resultPolicy.visibility === 'after_submit' && exam.proctoring.enabled) {
    warnings.push({ code: 'RESULTS_EARLY', target: 'settings', message: 'Students see answers while others may still be writing' });
  }
  const closes = clock.ms(exam.closesAt);
  if (closes !== null && closes <= nowMs) warnings.push({ code: 'WINDOW_PAST', target: 'settings', message: 'The window has already closed' });
  return warnings;
}

/**
 * @param {object} exam
 * @param {number} [nowMs]
 * @returns {{ publishable: boolean, problems: object[], warnings: object[], summary: object }}
 */
function checklist(exam, nowMs = clock.now()) {
  const duration = exam.durationMinutes < 1
    ? [{ code: 'DURATION', target: 'settings', message: 'Duration must be at least 1 minute' }]
    : [];
  const problems = [...questionListProblems(exam), ...windowProblems(exam), ...duration];
  return {
    publishable: problems.length === 0,
    problems,
    warnings: checklistWarnings(exam, nowMs),
    summary: {
      questionCount: exam.questions.length,
      totalMarks: totalMarks(exam.questions),
      durationMinutes: exam.durationMinutes,
      opensAt: exam.opensAt,
      closesAt: exam.closesAt,
    },
  };
}

module.exports = { checklist, windowProblems };
