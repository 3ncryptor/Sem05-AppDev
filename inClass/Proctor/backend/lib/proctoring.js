'use strict';
// Proctoring config: presets, validation, and the summaries students see (BUILD_PLAN §6.3, SCREENS A6).

const { RULE_NAMES } = require('./constants');
const { isPlainObject } = require('./validate');
const { validationError } = require('./errors');

const PRESET_NAMES = Object.freeze(['standard', 'lenient', 'monitor', 'off', 'custom']);

const LIMITS = Object.freeze({
  MAX_FLAGS: [1, 50], SHOT_SEC: [10, 3600], MIN_AWAY_SEC: [0.5, 60], NO_FACE_SEC: [2, 120], IDLE_SEC: [30, 3600],
});

function rulesFor({ on, idleCounts }) {
  const rule = { on, counts: on, warn: on };
  return {
    fullscreen: rule,
    focus: { ...rule, minAwaySec: 1.5 },
    displays: rule,
    camera: rule,
    noFace: { ...rule, afterSec: 5 },
    multiFace: rule,
    power: rule,
    idle: { ...rule, counts: on && idleCounts, afterSec: 120 },
    clipboard: { ...rule, blockCopyPaste: on, blockContextMenu: on },
  };
}

function base(preset, { enabled, autoEnd, maxFlags }) {
  return {
    enabled,
    preset,
    autoEnd: { enabled: autoEnd, maxFlags },
    screenshots: { minSec: 45, maxSec: 60, onFlag: enabled },
    cameraPhotos: { withScreenshots: enabled },
    blockMultipleDisplays: enabled,
    rules: rulesFor({ on: enabled, idleCounts: false }),
  };
}

const PRESETS = Object.freeze({
  standard: base('standard', { enabled: true, autoEnd: true, maxFlags: 5 }),
  lenient: base('lenient', { enabled: true, autoEnd: true, maxFlags: 10 }),
  monitor: base('monitor', { enabled: true, autoEnd: false, maxFlags: 5 }),
  off: base('off', { enabled: false, autoEnd: false, maxFlags: 5 }),
});

/** @param {'standard'|'lenient'|'monitor'|'off'} name */
function preset(name) {
  return PRESETS[name];
}

function sameConfig(a, b) {
  const { preset: _a, ...restA } = a;
  const { preset: _b, ...restB } = b;
  return JSON.stringify(restA) === JSON.stringify(restB);
}

/** The preset a config matches exactly, or 'custom'. */
function presetNameOf(config) {
  const match = ['standard', 'lenient', 'monitor', 'off'].find((name) => sameConfig(config, PRESETS[name]));
  return match || 'custom';
}

function bool(value, fallback, path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') errors[path] = 'Must be true or false';
  return value === true;
}

function num(value, fallback, [min, max], path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors[path] = `Must be from ${min} to ${max}`;
    return fallback;
  }
  return value;
}

function parseRule(name, input, current, errors) {
  const raw = isPlainObject(input) ? input : {};
  const path = `proctoring.rules.${name}`;
  const rule = {
    on: bool(raw.on, current.on, `${path}.on`, errors),
    counts: bool(raw.counts, current.counts, `${path}.counts`, errors),
    warn: bool(raw.warn, current.warn, `${path}.warn`, errors),
  };
  if (name === 'focus') return { ...rule, minAwaySec: num(raw.minAwaySec, current.minAwaySec, LIMITS.MIN_AWAY_SEC, `${path}.minAwaySec`, errors) };
  if (name === 'noFace') return { ...rule, afterSec: num(raw.afterSec, current.afterSec, LIMITS.NO_FACE_SEC, `${path}.afterSec`, errors) };
  if (name === 'idle') return { ...rule, afterSec: num(raw.afterSec, current.afterSec, LIMITS.IDLE_SEC, `${path}.afterSec`, errors) };
  if (name === 'clipboard') {
    return {
      ...rule,
      blockCopyPaste: bool(raw.blockCopyPaste, current.blockCopyPaste, `${path}.blockCopyPaste`, errors),
      blockContextMenu: bool(raw.blockContextMenu, current.blockContextMenu, `${path}.blockContextMenu`, errors),
    };
  }
  return rule;
}

function parseSections(raw, current, errors) {
  const autoEnd = isPlainObject(raw.autoEnd) ? raw.autoEnd : {};
  const shots = isPlainObject(raw.screenshots) ? raw.screenshots : {};
  const camera = isPlainObject(raw.cameraPhotos) ? raw.cameraPhotos : {};
  const screenshots = {
    minSec: num(shots.minSec, current.screenshots.minSec, LIMITS.SHOT_SEC, 'proctoring.screenshots.minSec', errors),
    maxSec: num(shots.maxSec, current.screenshots.maxSec, LIMITS.SHOT_SEC, 'proctoring.screenshots.maxSec', errors),
    onFlag: bool(shots.onFlag, current.screenshots.onFlag, 'proctoring.screenshots.onFlag', errors),
  };
  if (screenshots.maxSec < screenshots.minSec) errors['proctoring.screenshots.maxSec'] = 'Must be at least the minimum';
  return {
    enabled: bool(raw.enabled, current.enabled, 'proctoring.enabled', errors),
    autoEnd: {
      enabled: bool(autoEnd.enabled, current.autoEnd.enabled, 'proctoring.autoEnd.enabled', errors),
      maxFlags: num(autoEnd.maxFlags, current.autoEnd.maxFlags, LIMITS.MAX_FLAGS, 'proctoring.autoEnd.maxFlags', errors),
    },
    screenshots,
    cameraPhotos: { withScreenshots: bool(camera.withScreenshots, current.cameraPhotos.withScreenshots, 'proctoring.cameraPhotos.withScreenshots', errors) },
    blockMultipleDisplays: bool(raw.blockMultipleDisplays, current.blockMultipleDisplays, 'proctoring.blockMultipleDisplays', errors),
  };
}

/**
 * Either applies a preset ({ preset: 'lenient' } on its own) or merges a full or partial config
 * over the current one. The stored preset name is whatever the result matches, else 'custom'.
 * @param {unknown} input @param {object} current
 * @returns {object} the new proctoring config
 */
function parseProctoring(input, current) {
  if (!isPlainObject(input)) throw validationError({ proctoring: 'Must be an object' });
  const keys = Object.keys(input);
  if (keys.length === 1 && keys[0] === 'preset') {
    if (!PRESETS[input.preset]) throw validationError({ 'proctoring.preset': 'Must be standard, lenient, monitor or off' });
    return PRESETS[input.preset];
  }
  const errors = {};
  const rawRules = isPlainObject(input.rules) ? input.rules : {};
  const rules = Object.fromEntries(RULE_NAMES.map((name) => [name, parseRule(name, rawRules[name], current.rules[name], errors)]));
  const config = { ...parseSections(input, current, errors), rules };
  if (Object.keys(errors).length) throw validationError(errors);
  return { ...config, preset: presetNameOf({ ...config, preset: 'custom' }) };
}

/** The flag limit for this attempt, including extra flags an admin allowed on resume; null if nothing ends it. */
function effectiveMaxFlags(proctoring, attempt) {
  if (!proctoring.enabled || !proctoring.autoEnd.enabled) return null;
  return proctoring.autoEnd.maxFlags + (attempt ? attempt.flagAllowance || 0 : 0);
}

/** Short lines for C2, e.g. "Camera photo about every 45–60 s". */
function summary(proctoring) {
  if (!proctoring.enabled) return { enabled: false, lines: ['No proctoring for this exam'], text: 'No proctoring' };
  const { minSec, maxSec } = proctoring.screenshots;
  const every = minSec === maxSec ? `${minSec} s` : `${minSec}–${maxSec} s`;
  const r = proctoring.rules;
  const lines = [
    proctoring.cameraPhotos.withScreenshots ? `Camera photo about every ${every}` : null,
    `Screen picture about every ${every}`,
    r.noFace.on || r.multiFace.on ? 'Face must stay in view, alone' : null,
    r.fullscreen.on ? (proctoring.blockMultipleDisplays ? 'Fullscreen, one display' : 'Fullscreen') : null,
    proctoring.autoEnd.enabled ? `The exam ends at ${proctoring.autoEnd.maxFlags} flags` : 'Flags are reviewed; they never end the exam',
  ].filter(Boolean);
  return { enabled: true, lines, text: lines.join(' · ') };
}

/** What the student's client needs to run the rules (no secrets in here, but no extras either). */
function studentProctoring(proctoring, attempt) {
  return {
    enabled: proctoring.enabled,
    preset: proctoring.preset,
    maxFlags: effectiveMaxFlags(proctoring, attempt),
    autoEnd: proctoring.autoEnd,
    screenshots: proctoring.screenshots,
    cameraPhotos: proctoring.cameraPhotos,
    blockMultipleDisplays: proctoring.blockMultipleDisplays,
    rules: proctoring.rules,
  };
}

module.exports = { PRESET_NAMES, PRESETS, preset, parseProctoring, presetNameOf, effectiveMaxFlags, summary, studentProctoring };
