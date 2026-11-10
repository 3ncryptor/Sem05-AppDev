import {
  AUTO_EXPAND_MS,
  breatheIsland,
  clearConfirm,
  GLANCE_MS,
  openGlance,
  collapseIsland,
  confirmIsland,
  cycleIsland,
  dismissActivity,
  expandIsland,
  islandStore,
  promoteActivity,
  resetIsland,
  setAutoExpandGuard,
  showActivity,
} from './islandStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.useFakeTimers();
  resetIsland();
  setAutoExpandGuard(() => true);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const message = (key, extra = {}) => ({ key, kind: 'message', title: key, ...extra });

describe('islandStore', () => {
  it('shows an activity and removes it when its time is up', () => {
    showActivity({ key: 'copy', kind: 'copied', title: 'copied' }, { ttlMs: 1200 });
    expect(islandStore.get().activities).toHaveLength(1);
    jest.advanceTimersByTime(1200);
    expect(islandStore.get().activities).toHaveLength(0);
  });

  it('expands a new message once, then settles back to compact', () => {
    showActivity(message('m1', { autoExpand: true }));
    expect(islandStore.get().expandedKey).toBe('m1');
    jest.advanceTimersByTime(AUTO_EXPAND_MS);
    expect(islandStore.get().expandedKey).toBeNull();
    expect(islandStore.get().activities).toHaveLength(1);
  });

  it('does not auto-expand while typing or behind the Inspector', () => {
    setAutoExpandGuard(() => false);
    showActivity(message('m1', { autoExpand: true }));
    expect(islandStore.get().expandedKey).toBeNull();
  });

  it('keeps a card the user opened on purpose until they close it', () => {
    showActivity(message('m1'));
    expandIsland('m1');
    jest.advanceTimersByTime(AUTO_EXPAND_MS * 3);
    expect(islandStore.get().expandedKey).toBe('m1');
    collapseIsland();
    expect(islandStore.get().expandedKey).toBeNull();
  });

  it('switches the main activity and brings a circle forward', () => {
    showActivity(message('a'));
    showActivity(message('b'));
    showActivity(message('c'));
    const before = islandStore.get().primaryKey;
    cycleIsland(1);
    expect(islandStore.get().primaryKey).not.toBe(before);
    promoteActivity('a');
    expect(islandStore.get().primaryKey).toBe('a');
  });

  it('dismisses an activity and forgets it as main or expanded', () => {
    showActivity(message('a'));
    expandIsland('a');
    dismissActivity('a');
    expect(islandStore.get()).toMatchObject({
      activities: [],
      expandedKey: null,
      primaryKey: null,
    });
  });

  it('holds a confirmation, then returns to what was there', () => {
    showActivity(message('a'));
    confirmIsland({ title: 'photo sent' }, 1600);
    expect(islandStore.get().confirm).toMatchObject({ title: 'photo sent' });
    jest.advanceTimersByTime(1600);
    expect(islandStore.get().confirm).toBeNull();
    expect(islandStore.get().activities).toHaveLength(1);
  });
});

describe('islandStore round 2 (W1, W4)', () => {
  it('opens the glance card at rest and closes it by itself', () => {
    openGlance();
    expect(islandStore.get().glance).toBe(true);
    jest.advanceTimersByTime(GLANCE_MS);
    expect(islandStore.get().glance).toBe(false);
  });

  it('closes the glance card when something live arrives', () => {
    openGlance();
    showActivity(message('m1'));
    expect(islandStore.get().glance).toBe(false);
  });

  it('breathes only when nothing is live', () => {
    const before = islandStore.get().breathId;
    breatheIsland();
    expect(islandStore.get().breathId).toBe(before + 1);
    showActivity(message('m1'));
    breatheIsland();
    expect(islandStore.get().breathId).toBe(before + 1);
  });

  it('marks an arrival for new messages and for more messages, not for other updates', () => {
    const start = islandStore.get().arrivalId;
    showActivity(message('m1', { count: 1 }));
    showActivity(message('m1', { count: 1 }));
    showActivity(message('m1', { count: 2 }));
    showActivity({ key: 'up', kind: 'upload', title: 'sending photo' });
    expect(islandStore.get().arrivalId).toBe(start + 2);
  });

  it('skips a confirmation on tap', () => {
    confirmIsland({ title: 'sent' });
    clearConfirm();
    expect(islandStore.get().confirm).toBeNull();
  });
});
