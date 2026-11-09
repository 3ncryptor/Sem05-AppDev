/**
 * Read receipts for your own messages (buildPlan.md 8, Ticks).
 * The backend stores status per member: { [userId]: { delivered, read } }.
 *   sent       one tick
 *   delivered  two ticks: every other member has fetched their chat list
 *   read       two gradient ticks: every other member has opened the chat
 * The class server never updates status, so ticks stay at "sent" there.
 */

/** @typedef {'sending' | 'failed' | 'sent' | 'delivered' | 'read'} TickState */

/**
 * @param {{ senderId: string, status?: Record<string, { delivered: boolean, read: boolean }>,
 *           localState?: 'sending' | 'failed' }} message
 * @returns {TickState}
 */
export function tickState(message) {
  if (message.localState) return message.localState;
  const others = Object.entries(message.status ?? {}).filter(([id]) => id !== message.senderId);
  if (!others.length) return 'sent';
  if (others.every(([, receipt]) => receipt?.read)) return 'read';
  if (others.every(([, receipt]) => receipt?.delivered || receipt?.read)) return 'delivered';
  return 'sent';
}

/**
 * Per-member receipts for the message details view.
 * @param {{ senderId: string, status?: Record<string, { delivered: boolean, read: boolean }> }} message
 * @param {Record<string, { name: string }>} usersById
 * @returns {{ id: string, name: string, state: 'read' | 'delivered' | 'sent' }[]}
 */
export function receiptRows(message, usersById) {
  return Object.entries(message.status ?? {})
    .filter(([id]) => id !== message.senderId)
    .map(([id, receipt]) => ({
      id,
      name: usersById[id]?.name ?? 'unknown user',
      state: receipt?.read ? 'read' : receipt?.delivered ? 'delivered' : 'sent',
    }));
}
