'use strict';
// Risk score (BUILD_PLAN §6.5): a small points table used to sort the review queue.
// Pure: it reads the attempt, its flags, events and captures and returns { score, level, reasons }.
// It is a sorting aid for a person, never a verdict.

const { RISK, TIMING } = require('./constants');
const clock = require('./clock');

/** Total ms between "start" and "end" events of one type; an open start runs until endMs. */
function totalDuration(events, type, endMs) {
  const sorted = events.filter((e) => e.type === type && e.phase).toSorted((a, b) => clock.ms(a.at) - clock.ms(b.at));
  const result = sorted.reduce((acc, e) => {
    const at = clock.ms(e.at);
    if (e.phase === 'start') return acc.open === null ? { ...acc, open: at } : acc;
    if (acc.open === null) return acc;
    return { total: acc.total + Math.max(0, at - acc.open), open: null };
  }, { total: 0, open: null });
  return result.total + (result.open === null ? 0 : Math.max(0, endMs - result.open));
}

/** Closed gaps recorded by heartbeats, plus the one still open right now. */
function heartbeatGaps(attempt, nowMs) {
  const closed = attempt.heartbeatGaps || [];
  const silence = nowMs - clock.ms(attempt.lastSeenAt);
  if (attempt.status !== 'in_progress' || silence <= TIMING.HEARTBEAT_GAP_MS) return closed;
  return [...closed, { from: attempt.lastSeenAt, to: null, sec: Math.round(silence / 1000), open: true }];
}

function coverageIsLow(attempt, proctoring, captures, endMs) {
  if (!proctoring.enabled) return false;
  const elapsedSec = (endMs - clock.ms(attempt.startedAt)) / 1000;
  const average = (proctoring.screenshots.minSec + proctoring.screenshots.maxSec) / 2;
  const expected = Math.floor(elapsedSec / average);
  // Too short to judge: one late screenshot shouldn't add points to a 2-minute attempt.
  if (expected < 3) return false;
  const screens = captures.filter((c) => c.kind === 'screen').length;
  return screens < RISK.COVERAGE_MIN * expected;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m} m ${s} s` : `${s} s`;
}

function levelOf(score) {
  if (score >= RISK.HIGH_AT) return 'high';
  return score >= RISK.REVIEW_AT ? 'review' : 'low';
}

/**
 * @param {{ attempt: object, exam: object, flags: readonly object[], events: readonly object[],
 *           captures: readonly object[], nowMs: number }} input
 * @returns {{ score: number, level: 'low'|'review'|'high', reasons: { code: string, label: string, points: number }[],
 *             noFaceSec: number, awaySec: number, gaps: object[] }}
 */
function computeRisk({ attempt, exam, flags, events, captures, nowMs }) {
  const endMs = attempt.status === 'submitted' ? clock.ms(attempt.submittedAt) : nowMs;
  const live = flags.filter((f) => !f.dismissed);
  const counted = live.filter((f) => f.counted).length;
  const multiFaces = events.filter((e) => e.type === 'multiple_faces' && e.phase !== 'end').length;
  const noFaceSec = totalDuration(events, 'no_face', endMs) / 1000;
  const awaySec = totalDuration(events, 'window_blur', endMs) / 1000;
  const gaps = heartbeatGaps(attempt, nowMs);
  const candidates = [
    { code: 'flags', points: counted * RISK.PER_COUNTED_FLAG, label: `${counted} counted flag${counted === 1 ? '' : 's'}` },
    { code: 'multiple_faces', points: multiFaces * RISK.PER_MULTIPLE_FACES, label: `${multiFaces}× multiple faces` },
    { code: 'no_face', points: noFaceSec > RISK.LONG_ABSENCE_SEC ? RISK.LONG_NO_FACE : 0, label: `no face ${formatDuration(noFaceSec)}` },
    { code: 'away', points: awaySec > RISK.LONG_ABSENCE_SEC ? RISK.LONG_AWAY : 0, label: `away ${formatDuration(awaySec)}` },
    { code: 'auto_ended', points: attempt.submitReason === 'flag_limit' ? RISK.AUTO_ENDED : 0, label: 'auto-ended' },
    { code: 'coverage', points: coverageIsLow(attempt, exam.proctoring, captures, endMs) ? RISK.LOW_COVERAGE : 0, label: 'few screenshots' },
    { code: 'heartbeat_gaps', points: gaps.length * RISK.PER_HEARTBEAT_GAP, label: `${gaps.length} heartbeat gap${gaps.length === 1 ? '' : 's'}` },
  ];
  const reasons = candidates.filter((c) => c.points > 0);
  const score = reasons.reduce((sum, r) => sum + r.points, 0);
  return { score, level: levelOf(score), reasons, noFaceSec: Math.round(noFaceSec), awaySec: Math.round(awaySec), gaps };
}

/** The stored shape on the attempt. */
function storedRisk(risk) {
  return { score: risk.score, level: risk.level, reasons: risk.reasons };
}

module.exports = { computeRisk, storedRisk, totalDuration, levelOf };
