/**
 * Small, stable string hashing for picking things by name (avatar tints,
 * fallbacks). Not for security: it only needs to spread names out evenly.
 */

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/**
 * 32-bit FNV-1a hash of a string.
 * @param {string} text
 * @returns {number} unsigned 32-bit integer
 */
export function hashString(text) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Picks one item from a list, always the same one for the same seed.
 * @template T
 * @param {T[]} items non-empty list
 * @param {string} seed
 * @returns {T}
 */
export function pickBySeed(items, seed) {
  return items[hashString(seed) % items.length];
}
