import { lastProblem, overviewSentence, overviewStats } from './overviewStats';

const now = 100000;
const row = (id, ago, extra = {}) => ({
  id,
  startedAt: now - ago,
  state: 'ok',
  durationMs: 20,
  ...extra,
});

describe('overviewStats', () => {
  it('counts the last minute and finds a typical time', () => {
    const rows = [
      row('old', 90000),
      row('a', 5000, { durationMs: 10 }),
      row('b', 4000, { durationMs: 30 }),
      row('c', 3000, { state: 'error', durationMs: 10000 }),
      row('d', 1000, { state: 'pending', durationMs: undefined }),
    ];
    expect(overviewStats(rows, now)).toEqual({ perMinute: 4, failed: 1, typicalMs: 20 });
  });

  it('has no typical time before anything finished', () => {
    expect(overviewStats([], now).typicalMs).toBeNull();
  });
});

describe('overviewSentence', () => {
  const poll = { conversations: 5000, messages: 3000, inbox: 10000 };
  it('explains polling when all is well', () => {
    expect(overviewSentence({ tone: 'ok', failed: 0, pollMs: poll, isPaused: false })).toBe(
      'The app asks the server for new data every 5 seconds. Everything is working.',
    );
  });
  it('says plainly when the server cannot be reached', () => {
    expect(overviewSentence({ tone: 'bad', failed: 3, pollMs: poll, isPaused: false })).toBe(
      "The app can't reach the server right now. It keeps trying every 5 seconds.",
    );
  });
  it('mentions failures that happened and paused polling', () => {
    expect(overviewSentence({ tone: 'ok', failed: 2, pollMs: poll, isPaused: false })).toMatch(
      /2 requests failed in the last minute/,
    );
    expect(overviewSentence({ tone: 'ok', failed: 0, pollMs: poll, isPaused: true })).toBe(
      'Polling is paused, so the app is not asking for new data. Turn it back on in tools.',
    );
  });
  it('waits before the first request', () => {
    expect(overviewSentence({ tone: 'idle', failed: 0, pollMs: poll, isPaused: false })).toBe(
      'Waiting for the first request to the server.',
    );
  });
});

describe('lastProblem', () => {
  it('finds the newest failed request', () => {
    const rows = [
      row('a', 9000, { state: 'error' }),
      row('b', 5000),
      row('c', 2000, { state: 'error' }),
    ];
    expect(lastProblem(rows).id).toBe('c');
    expect(lastProblem([row('a', 1)])).toBeNull();
  });
});
