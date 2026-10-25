// List helpers for options, ordering items and matching sides. Ids follow the server's
// client-id pattern (`op_…`), so a new item keeps its id after it is saved.

/** @param {'op' | 'it' | 'lt' | 'rt'} prefix */
export const newItem = (prefix, text = '') => ({ id: `${prefix}_${crypto.randomUUID()}`, text })

/** New array with the entry at `from` moved to `to`; the same array if the move is out of range. */
export function moved(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list
  const without = list.filter((_, index) => index !== from)
  return [...without.slice(0, to), list[from], ...without.slice(to)]
}

export const withText = (list, id, text) => list.map((item) => (item.id === id ? { ...item, text } : item))

export const without = (list, id) => list.filter((item) => item.id !== id)
