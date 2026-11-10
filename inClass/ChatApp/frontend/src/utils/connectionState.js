/**
 * The connection states shown in the island (buildPlan.md 5.2, V7):
 *   online --failure--> reconnecting --success--> restored --(timer)--> online
 * "restored" shows "back online" briefly; the hook clears it with a timer.
 */

/** @typedef {'online' | 'reconnecting' | 'restored'} ConnectionState */

/**
 * @param {ConnectionState} state
 * @param {'success' | 'failure' | 'settle'} event "settle" = the restored banner timed out
 * @returns {ConnectionState}
 */
export function nextConnectionState(state, event) {
  if (event === 'failure') return 'reconnecting';
  if (event === 'success') return state === 'reconnecting' ? 'restored' : state;
  if (event === 'settle') return state === 'restored' ? 'online' : state;
  return state;
}
