import { createInboxChecker } from './inboxChecker';

function setup(overrides = {}) {
  const calls = [];
  const options = {
    getChatIds: () => ['a', 'b'],
    getOpenId: () => null,
    getCycleMs: () => 10000,
    isEnabled: () => true,
    getFailures: () => 0,
    check: jest.fn(async (id) => calls.push(id)),
    ...overrides,
  };
  return { checker: createInboxChecker(options), calls, options };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function advance(ms) {
  await jest.advanceTimersByTimeAsync(ms);
}

describe('createInboxChecker', () => {
  it('checks one chat per gap, in turn, spread over the cycle', async () => {
    const { checker, calls } = setup();
    checker.start();
    await advance(0);
    expect(calls).toEqual(['a']);
    await advance(5000);
    expect(calls).toEqual(['a', 'b']);
    await advance(5000);
    expect(calls).toEqual(['a', 'b', 'a']);
    checker.stop();
  });

  it('skips the chat that is open', async () => {
    const { checker, calls } = setup({ getOpenId: () => 'a' });
    checker.start();
    await advance(20000);
    expect(calls.every((id) => id === 'b')).toBe(true);
    checker.stop();
  });

  it('does nothing while disabled, and carries on when enabled again', async () => {
    let enabled = false;
    const { checker, calls } = setup({ isEnabled: () => enabled });
    checker.start();
    await advance(30000);
    expect(calls).toEqual([]);
    enabled = true;
    await advance(10000);
    expect(calls.length).toBeGreaterThan(0);
    checker.stop();
  });

  it('backs off a failing chat on its own, without slowing the others', async () => {
    const { checker, calls } = setup({
      getChatIds: () => ['bad', 'good'],
      getFailures: (id) => (id === 'bad' ? 3 : 0),
    });
    checker.start();
    await advance(0);
    expect(calls).toEqual(['bad']);
    // gap 5 s; "bad" waits cycle 10 s x 2^(3-1) = 40 s before its next try
    await advance(30000);
    expect(calls.filter((id) => id === 'bad')).toHaveLength(1);
    expect(calls.filter((id) => id === 'good').length).toBeGreaterThanOrEqual(3);
    await advance(20000);
    expect(calls.filter((id) => id === 'bad')).toHaveLength(2);
    checker.stop();
  });

  it('never runs two loops after stop and start during a request', async () => {
    let release;
    const check = jest.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { checker } = setup({ check, getChatIds: () => ['a'] });
    checker.start();
    await advance(0);
    checker.stop();
    checker.start(); // back in the foreground before the request settled
    await advance(0);
    release();
    await advance(0);
    const before = check.mock.calls.length;
    await advance(10000);
    expect(check.mock.calls.length - before).toBeLessThanOrEqual(1);
    checker.stop();
  });

  it('stops cleanly and never runs two checks at once', async () => {
    let release;
    const check = jest.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const { checker } = setup({ check });
    checker.start();
    await advance(20000);
    expect(check).toHaveBeenCalledTimes(1);
    release();
    checker.stop();
    await advance(20000);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
