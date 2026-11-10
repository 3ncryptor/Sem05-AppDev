import { createPoller } from './poller';

function fakeTimers() {
  const intervals = new Map();
  let nextId = 1;
  return {
    setInterval: (fn, ms) => {
      intervals.set(nextId, { fn, ms });
      nextId += 1;
      return nextId - 1;
    },
    clearInterval: (id) => intervals.delete(id),
    fire: () => intervals.forEach(({ fn }) => fn()),
    count: () => intervals.size,
  };
}

describe('createPoller', () => {
  it('runs the task on each tick and stops cleanly', async () => {
    const timers = fakeTimers();
    const task = jest.fn(() => Promise.resolve());
    const poller = createPoller({ task, intervalMs: 1000, timers });
    poller.start();
    poller.start(); // second start is ignored
    expect(timers.count()).toBe(1);

    timers.fire();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);

    poller.stop();
    expect(poller.isActive()).toBe(false);
    expect(timers.count()).toBe(0);
  });

  it('skips a tick while the previous task is still running', async () => {
    let finish;
    const task = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    const poller = createPoller({ task, intervalMs: 1000, timers: fakeTimers() });
    poller.tick();
    poller.tick();
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    poller.tick();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps polling after a failed task', async () => {
    const task = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue();
    const poller = createPoller({ task, intervalMs: 1000, timers: fakeTimers() });
    await expect(poller.tick()).rejects.toThrow('down');
    await poller.tick();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('resume restarts and runs immediately', () => {
    const timers = fakeTimers();
    const task = jest.fn(() => Promise.resolve());
    const poller = createPoller({ task, intervalMs: 1000, timers });
    poller.start();
    poller.pause();
    expect(timers.count()).toBe(0);
    poller.resume();
    expect(timers.count()).toBe(1);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
