/**
 * flowBus: tells the flow map's boxes when a packet passes them (buildPlan.md
 * 15). A packet knows its timing up front, so it announces every visit once,
 * with a delay; each box schedules its own glow. Plain JS, no React.
 */

const listeners = new Set();

/**
 * @param {(visit: { node: string, delayMs: number, tone: 'ok' | 'bad' | 'poll',
 *   op?: 'read' | 'write' }) => void} listener
 * @returns {() => void} unsubscribe
 */
export function onFlowVisit(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {{ node: string, delayMs: number, tone: string, op?: string }} visit */
export function emitFlowVisit(visit) {
  listeners.forEach((listener) => listener(visit));
}
