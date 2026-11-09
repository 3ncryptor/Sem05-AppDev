/**
 * Pure helper for AvatarStack: which faces to draw and how many go in "+N".
 * @param {string[] | undefined} names
 * @param {number} max faces to show
 * @returns {{ shown: string[], extra: number }}
 */
export function splitStack(names, max) {
  const list = Array.isArray(names) ? names : [];
  return { shown: list.slice(0, max), extra: Math.max(0, list.length - max) };
}
