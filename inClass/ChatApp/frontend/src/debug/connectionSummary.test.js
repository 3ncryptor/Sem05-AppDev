import { lastFinished, summarizeConnection } from './connectionSummary';

describe('summarizeConnection', () => {
  it('shows the host and the last time', () => {
    expect(summarizeConnection('http://10.0.0.5:3000', { state: 'ok', durationMs: 24 })).toEqual({
      host: '10.0.0.5:3000',
      text: '10.0.0.5:3000 · ok 24 ms',
      tone: 'ok',
    });
  });
  it('says unreachable after a failure and waiting before any request', () => {
    expect(summarizeConnection('http://x:1', { state: 'error' }).tone).toBe('bad');
    expect(summarizeConnection('', undefined).text).toBe('no server · waiting');
  });
});

describe('lastFinished', () => {
  it('skips requests still in flight', () => {
    const rows = [
      { id: 'a', state: 'ok' },
      { id: 'b', state: 'error' },
      { id: 'c', state: 'pending' },
    ];
    expect(lastFinished(rows).id).toBe('b');
    expect(lastFinished([])).toBeUndefined();
  });
});
