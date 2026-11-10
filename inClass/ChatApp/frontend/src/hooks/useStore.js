/**
 * useStore: reads a createStore store inside a component and re-renders when
 * it changes. Built only from useState and useEffect (buildPlan.md 3.1).
 *
 * Usage: const user = useStore(sessionStore, (s) => s.user);
 *
 * The whole store state is kept in useState and the selector runs during
 * render, so an inline selector arrow never forces a re-subscribe.
 */
import { useEffect, useState } from 'react';

const selectAll = (state) => state;

/**
 * @template T, S
 * @param {{ get: () => T, subscribe: (fn: (state: T) => void) => () => void }} store
 * @param {(state: T) => S} [selector] pick the part this component needs
 * @returns {S}
 */
export function useStore(store, selector = selectAll) {
  const [state, setState] = useState(store.get);

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    // The store may have changed between the first render and this effect
    // (for example the saved session finished loading). Catch up once;
    // setState with the same object is a no-op, so this is cheap.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(store.get());
    return unsubscribe;
  }, [store]);

  return selector(state);
}
