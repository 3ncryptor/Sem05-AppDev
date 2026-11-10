/**
 * createStore: a tiny publish/subscribe store in plain JS (buildPlan.md 3.1).
 * It replaces React Context: screens read a store through the useStore hook
 * (useState + useEffect), and any module can update it without React.
 * State is never mutated; every update makes a new object.
 */

/**
 * @template T
 * @param {T} initial
 * @returns {{
 *   get: () => T,
 *   set: (next: Partial<T> | ((state: T) => Partial<T>)) => void,
 *   reset: () => void,
 *   subscribe: (listener: (state: T) => void) => () => void,
 * }}
 */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    get: () => state,
    set(next) {
      const patch = typeof next === 'function' ? next(state) : next;
      state = { ...state, ...patch };
      notify();
    },
    reset() {
      state = initial;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
