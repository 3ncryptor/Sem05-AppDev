'use strict';
// Every threshold and weight in one place, so the viva answer to "why 2 seconds?" is one file away.

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const TIMING = Object.freeze({
  /** Counted events this close to an existing flag join it (⌘Tab fires blur and leave-full-screen together). */
  INCIDENT_MERGE_MS: 2 * SECOND,
  /** Answers are still accepted this long after the deadline, for requests already in flight. */
  ANSWER_GRACE_MS: 30 * SECOND,
  /** Events that arrive this long after an attempt ended are stored but never flag anything. */
  LATE_EVENT_MS: 2 * MINUTE,
  /** Silence longer than this between heartbeats (sent every 10 s) is a heartbeat gap. */
  HEARTBEAT_GAP_MS: 30 * SECOND,
  /** Live view: no heartbeat for this long means the card needs attention. */
  ATTENTION_SILENCE_MS: 30 * SECOND,
  /** A flag's camera/screen pair is attached if captured within this long after the flag started. */
  FLAG_CAPTURE_MS: 30 * SECOND,
});

const LOGIN_LIMIT = Object.freeze({ MAX_FAILURES: 5, WINDOW_MS: 15 * MINUTE, MAX_TRACKED: 10000 });

const LIMITS = Object.freeze({
  EVENTS_PER_REQUEST: 50,
  EVIDENCE_BYTES: 1024 * 1024,
  IMPORT_ROWS: 500,
  LIVE_FEED: 50,
});

/** Risk score weights (BUILD_PLAN §6.5). Levels: low < REVIEW_AT ≤ review < HIGH_AT ≤ high. */
const RISK = Object.freeze({
  PER_COUNTED_FLAG: 3,
  PER_MULTIPLE_FACES: 5,
  LONG_NO_FACE: 10,
  LONG_AWAY: 10,
  LONG_ABSENCE_SEC: 120,
  AUTO_ENDED: 10,
  LOW_COVERAGE: 5,
  COVERAGE_MIN: 0.8,
  PER_HEARTBEAT_GAP: 5,
  REVIEW_AT: 10,
  HIGH_AT: 25,
});

/** Which proctoring rule each counted event type belongs to. */
const EVENT_RULES = Object.freeze({
  fullscreen_exit: 'fullscreen',
  window_blur: 'focus',
  display_added: 'displays',
  camera_lost: 'camera',
  no_face: 'noFace',
  multiple_faces: 'multiFace',
  system_sleep: 'power',
  screen_locked: 'power',
  clipboard_attempt: 'clipboard',
  idle: 'idle',
});

/** Recorded for the timeline only; never a flag. */
const INFO_EVENTS = Object.freeze([
  'face_too_far', 'low_light', 'face_detection_unavailable', 'camera_restored', 'display_removed',
  'network_offline', 'network_online', 'app_quit', 'app_resumed', 'system_resume',
]);

/** Written by the server for admin actions. The client can never send these. */
const ADMIN_EVENTS = Object.freeze(['admin_extended', 'admin_ended', 'admin_resumed', 'flag_dismissed']);

const CLIENT_EVENT_TYPES = Object.freeze([...Object.keys(EVENT_RULES), ...INFO_EVENTS]);

const RULE_NAMES = Object.freeze([
  'fullscreen', 'focus', 'displays', 'camera', 'noFace', 'multiFace', 'power', 'idle', 'clipboard',
]);

const QUESTION_TYPES = Object.freeze(['single', 'multi', 'true_false', 'short_text', 'numeric', 'ordering', 'matching']);
const SUBMIT_REASONS = Object.freeze(['student', 'deadline', 'flag_limit', 'admin']);
const REVIEW_STATUSES = Object.freeze(['pending', 'cleared', 'suspicious', 'disqualified']);
const VISIBILITY = Object.freeze(['after_submit', 'after_publish']);
const EVIDENCE_KINDS = Object.freeze(['screen', 'camera', 'identity']);
const EVIDENCE_REASONS = Object.freeze(['interval', 'flag', 'identity', 'resume', 'manual']);

module.exports = {
  TIMING, LOGIN_LIMIT, LIMITS, RISK, EVENT_RULES, INFO_EVENTS, ADMIN_EVENTS, CLIENT_EVENT_TYPES,
  RULE_NAMES, QUESTION_TYPES, SUBMIT_REASONS, REVIEW_STATUSES, VISIBILITY, EVIDENCE_KINDS, EVIDENCE_REASONS,
};
