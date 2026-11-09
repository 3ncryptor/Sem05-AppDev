import { createStore } from './createStore';

describe('createStore', () => {
  it('returns the initial state', () => {
    expect(createStore({ count: 0 }).get()).toEqual({ count: 0 });
  });

  it('merges a patch into a new object without mutating the old one', () => {
    const store = createStore({ count: 0, name: 'a' });
    const before = store.get();
    store.set({ count: 1 });
    expect(store.get()).toEqual({ count: 1, name: 'a' });
    expect(before).toEqual({ count: 0, name: 'a' });
    expect(store.get()).not.toBe(before);
  });

  it('accepts an updater function', () => {
    const store = createStore({ count: 1 });
    store.set((state) => ({ count: state.count + 1 }));
    expect(store.get().count).toBe(2);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
    unsubscribe();
    store.set({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reset goes back to the initial state and notifies', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.set({ count: 5 });
    store.reset();
    expect(store.get()).toEqual({ count: 0 });
    expect(listener).toHaveBeenLastCalledWith({ count: 0 });
  });
});
