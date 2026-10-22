'use strict';
// The flag engine (BUILD_PLAN §19.5 "Events and flags"). A pure function: given the attempt, its
// proctoring config, its current flags and new events, it returns the new flags, the new count,
// the warnings for the student, and whether the flag limit was reached. No files, no HTTP.
//
// For each event whose rule is on (and that isn't an "end" phase):
//   - a counted flag that started within 2 s of it? → the event joins that flag (one ⌘Tab = one flag)
//   - otherwise → a new flag; if the rule counts, flagCount + 1
// Auto-end: flagCount ≥ maxFlags + flagAllowance stops processing; the caller submits the attempt.

const { EVENT_RULES, TIMING } = require('./constants');
const { newId } = require('./ids');
const clock = require('./clock');
const { effectiveMaxFlags } = require('./proctoring');

function record(event, flagId) {
  return { ...event, at: clock.iso(event.at), flagId };
}

function triggers(event, proctoring, limitReached) {
  const rule = EVENT_RULES[event.type];
  return !limitReached && proctoring.enabled && rule !== undefined && proctoring.rules[rule].on && event.phase !== 'end';
}

function nearbyFlag(flags, atMs) {
  return flags.find((f) => f.counted && !f.dismissed && Math.abs(clock.ms(f.startedAt) - atMs) <= TIMING.INCIDENT_MERGE_MS);
}

function joinFlag(state, flag, event, rule) {
  const merged = {
    ...flag,
    rules: flag.rules.includes(rule) ? flag.rules : [...flag.rules, rule],
    types: flag.types.includes(event.type) ? flag.types : [...flag.types, event.type],
    eventSeqs: [...flag.eventSeqs, event.seq],
  };
  return {
    ...state,
    flags: state.flags.map((f) => (f.id === flag.id ? merged : f)),
    records: [...state.records, record(event, flag.id)],
  };
}

function newFlag(state, event, rule, proctoring, maxFlags) {
  const counted = proctoring.rules[rule].counts;
  const flagCount = state.flagCount + (counted ? 1 : 0);
  const flag = {
    id: newId('fl'),
    flagNo: counted ? flagCount : null,
    rules: [rule],
    types: [event.type],
    startedAt: clock.iso(event.at),
    counted,
    questionId: event.questionId || null,
    eventSeqs: [event.seq],
    captures: [],
    dismissed: null,
  };
  return {
    ...state,
    flags: [...state.flags, flag],
    flagCount,
    newFlagIds: [...state.newFlagIds, flag.id],
    records: [...state.records, record(event, flag.id)],
    limitReached: counted && maxFlags !== null && flagCount >= maxFlags,
  };
}

function step(state, event, proctoring, maxFlags) {
  if (!triggers(event, proctoring, state.limitReached)) return { ...state, records: [...state.records, record(event, null)] };
  const rule = EVENT_RULES[event.type];
  const near = nearbyFlag(state.flags, event.at);
  return near ? joinFlag(state, near, event, rule) : newFlag(state, event, rule, proctoring, maxFlags);
}

/** @returns {{ flagId, flagNo, maxFlags, rules, first, final, at, questionId }} what C9 shows */
function toWarning(flag, maxFlags) {
  return {
    flagId: flag.id,
    flagNo: flag.flagNo,
    maxFlags,
    rules: flag.rules,
    first: flag.flagNo === 1,
    final: maxFlags !== null && flag.flagNo === maxFlags - 1,
    at: flag.startedAt,
    questionId: flag.questionId,
  };
}

/**
 * @param {{ attempt: object, proctoring: object, flags: readonly object[],
 *           events: { seq: number, type: string, phase?: string, at: number, questionId?: string, payload?: object }[] }} input
 * @returns {{ flags: object[], flagCount: number, records: object[], warnings: object[], limitReached: boolean }}
 */
function applyEvents({ attempt, proctoring, flags, events }) {
  const maxFlags = effectiveMaxFlags(proctoring, attempt);
  const start = { flags: [...flags], flagCount: attempt.flagCount, records: [], newFlagIds: [], limitReached: false };
  const end = [...events].sort((a, b) => a.at - b.at).reduce((s, e) => step(s, e, proctoring, maxFlags), start);
  const warnings = end.newFlagIds
    .map((id) => end.flags.find((f) => f.id === id))
    .filter((f) => f.counted && proctoring.rules[f.rules[0]].warn)
    .map((f) => toWarning(f, maxFlags));
  return { flags: end.flags, flagCount: end.flagCount, records: end.records, warnings, limitReached: end.limitReached };
}

module.exports = { applyEvents, toWarning };
