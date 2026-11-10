import { nextConnectionState } from './connectionState';

describe('nextConnectionState', () => {
  it('stays online while polls succeed', () => {
    expect(nextConnectionState('online', 'success')).toBe('online');
  });

  it('goes reconnecting on failure, restored on the next success, then online', () => {
    const a = nextConnectionState('online', 'failure');
    const b = nextConnectionState(a, 'failure');
    const c = nextConnectionState(b, 'success');
    expect([a, b, c]).toEqual(['reconnecting', 'reconnecting', 'restored']);
    expect(nextConnectionState(c, 'settle')).toBe('online');
  });

  it('a failure while restored goes back to reconnecting; settle elsewhere is a no-op', () => {
    expect(nextConnectionState('restored', 'failure')).toBe('reconnecting');
    expect(nextConnectionState('reconnecting', 'settle')).toBe('reconnecting');
    expect(nextConnectionState('online', 'unknown')).toBe('online');
  });
});
