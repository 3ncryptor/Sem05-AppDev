/**
 * Immutable list helpers shared by the debug stores.
 */

/**
 * Adds an item to the end and drops the oldest items past `max`.
 * @template T
 * @param {T[]} list
 * @param {T} item
 * @param {number} max
 * @returns {T[]} a new list
 */
export function appendCapped(list, item, max) {
  const next = [...list, item];
  return next.length > max ? next.slice(next.length - max) : next;
}

/**
 * Replaces the item with the same id by merging in `patch`; unknown ids are left alone.
 * @template {{ id: string }} T
 * @param {T[]} list
 * @param {string} id
 * @param {Partial<T>} patch
 * @returns {T[]} a new list
 */
export function updateById(list, id, patch) {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
