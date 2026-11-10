import {
  cycleKey,
  expireActivities,
  nextExpiry,
  orderActivities,
  PRIORITY,
  removeActivity,
  upsertActivity,
  visibleActivities,
} from './islandQueue';

const act = (key, kind, extra = {}) => ({ key, kind, title: key, ...extra });

describe('upsertActivity', () => {
  it('adds a new activity with timestamps', () => {
    const list = upsertActivity([], act('a', 'message'), 100);
    expect(list).toEqual([{ ...act('a', 'message'), createdAt: 100, updatedAt: 100 }]);
  });

  it('updates the same key in place and keeps when it started', () => {
    const first = upsertActivity([], act('a', 'upload', { detail: '10%' }), 100);
    const next = upsertActivity(first, act('a', 'upload', { detail: '60%' }), 200);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ detail: '60%', createdAt: 100, updatedAt: 200 });
    expect(first[0].detail).toBe('10%');
  });
});

describe('removeActivity and expireActivities', () => {
  it('removes by key', () => {
    expect(removeActivity([act('a', 'copied'), act('b', 'copied')], 'a')).toEqual([
      act('b', 'copied'),
    ]);
  });

  it('drops activities whose time is up and keeps the rest', () => {
    const list = [
      act('a', 'copied', { expiresAt: 50 }),
      act('b', 'message'),
      act('c', 'copied', { expiresAt: 500 }),
    ];
    expect(expireActivities(list, 100).map((item) => item.key)).toEqual(['b', 'c']);
    expect(nextExpiry(list)).toBe(50);
    expect(nextExpiry([act('b', 'message')])).toBeNull();
  });
});

describe('orderActivities', () => {
  it('sorts by priority, then the most recently updated', () => {
    const list = [
      { ...act('m1', 'message'), updatedAt: 1 },
      { ...act('f', 'failed'), updatedAt: 1 },
      { ...act('m2', 'message'), updatedAt: 5 },
      { ...act('c', 'connection'), updatedAt: 1 },
    ];
    expect(orderActivities(list).map((item) => item.key)).toEqual(['f', 'c', 'm2', 'm1']);
  });

  it('ranks failures above connection above messages', () => {
    expect(PRIORITY.failed).toBeLessThan(PRIORITY.connection);
    expect(PRIORITY.connection).toBeLessThan(PRIORITY.message);
  });
});

describe('visibleActivities: main pill plus up to two circles', () => {
  const list = ['a', 'b', 'c', 'd'].map((key, index) => ({
    ...act(key, 'message'),
    updatedAt: 10 - index,
  }));

  it('shows three at once and counts the rest as waiting', () => {
    const view = visibleActivities(list, null);
    expect(view.main.key).toBe('a');
    expect(view.circles.map((item) => item.key)).toEqual(['b', 'c']);
    expect(view.waiting).toBe(1);
  });

  it('keeps the activity the user switched to in the main pill', () => {
    const view = visibleActivities(list, 'c');
    expect(view.main.key).toBe('c');
    expect(view.circles.map((item) => item.key)).toEqual(['a', 'b']);
  });

  it('is empty at rest', () => {
    expect(visibleActivities([], null)).toEqual({ main: null, circles: [], waiting: 0 });
  });
});

describe('cycleKey: the iPhone 18 style switch between live activities', () => {
  const list = ['a', 'b', 'c'].map((key, index) => ({
    ...act(key, 'message'),
    updatedAt: 9 - index,
  }));

  it('moves to the next visible activity and wraps', () => {
    expect(cycleKey(list, 'a', 1)).toBe('b');
    expect(cycleKey(list, 'c', 1)).toBe('a');
    expect(cycleKey(list, 'a', -1)).toBe('c');
  });

  it('stays put with a single activity', () => {
    expect(cycleKey([act('a', 'message')], 'a', 1)).toBe('a');
  });
});
