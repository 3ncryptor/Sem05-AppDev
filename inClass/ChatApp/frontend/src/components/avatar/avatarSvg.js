/**
 * avatarSvg: turns a username into an illustrated face (DiceBear, drawn on
 * the device, no network). The username is the seed, so everyone sees the
 * same face for "aarav" on every phone and server without storing anything.
 *
 * Only the three styles we use are installed (not @dicebear/collection),
 * because Metro would otherwise bundle all ~30 styles. All three are CC0.
 *
 * Results are cached per (style, name): generating an SVG costs a few ms,
 * which adds up while a list scrolls.
 */
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import { pickBySeed } from '../../utils/hash';

export const AVATAR_STYLES = [
  { id: 'lorelei', label: 'lorelei', style: lorelei },
  { id: 'notionists', label: 'notionists', style: notionists },
  { id: 'open-peeps', label: 'open peeps', style: openPeeps },
];

export const DEFAULT_AVATAR_STYLE = 'lorelei';

/** Soft pastels taken from the accent gradient, so faces sit inside the design. */
const TINTS = ['#F6DCC6', '#F3D9D8', '#EED8E6', '#F8E6D6', '#E9DCEC', '#F4E1E0'];

/** Seed used when a name is missing, so the UI never shows a blank circle. */
const FALLBACK_SEED = 'huddle';

/** Upper bound on cached faces: a class of 200 people in all three styles. */
const MAX_CACHE_ENTRIES = 600;

const cache = new Map();

function findStyle(styleId) {
  return (
    AVATAR_STYLES.find((entry) => entry.id === styleId) ??
    AVATAR_STYLES.find((entry) => entry.id === DEFAULT_AVATAR_STYLE)
  );
}

function seedFor(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed || FALLBACK_SEED;
}

/**
 * SVG markup for a user's face.
 * @param {string} name username (the seed)
 * @param {string} [styleId] one of AVATAR_STYLES ids; unknown ids use the default
 * @returns {string} an <svg> document with a transparent background
 */
export function avatarSvg(name, styleId = DEFAULT_AVATAR_STYLE) {
  const entry = findStyle(styleId);
  const seed = seedFor(name);
  const key = `${entry.id}:${seed}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const svg = createAvatar(entry.style, { seed }).toString();
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, svg);
  return svg;
}

/**
 * Pastel background colour for a user's avatar circle.
 * @param {string} name
 * @returns {string} hex colour
 */
export function avatarTint(name) {
  return pickBySeed(TINTS, seedFor(name));
}

/** Test helper: empties the face cache. */
export function clearAvatarCache() {
  cache.clear();
}

/** Test helper: number of cached faces. */
export function avatarCacheSize() {
  return cache.size;
}
