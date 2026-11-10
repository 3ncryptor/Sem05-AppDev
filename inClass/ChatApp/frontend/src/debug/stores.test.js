import { MAX_LOG_ENTRIES } from '../constants/config';
import { addLogEntry, clearLogs, logStore } from './logStore';
import { clearRequests, finishRequest, networkStore, startRequest } from './networkStore';

describe('logStore', () => {
  beforeEach(() => clearLogs());

  it('stamps entries with an id, time and source', () => {
    const entry = addLogEntry({ level: 'info', category: 'APP', message: 'hello' });
    expect(entry).toMatchObject({ source: 'app', message: 'hello' });
    expect(typeof entry.id).toBe('string');
    expect(logStore.get().entries).toHaveLength(1);
  });

  it('keeps only the newest entries', () => {
    for (let i = 0; i < MAX_LOG_ENTRIES + 5; i += 1) {
      addLogEntry({ level: 'info', category: 'APP', message: String(i) });
    }
    const { entries } = logStore.get();
    expect(entries).toHaveLength(MAX_LOG_ENTRIES);
    expect(entries[entries.length - 1].message).toBe(String(MAX_LOG_ENTRIES + 4));
  });
});

describe('networkStore', () => {
  beforeEach(() => clearRequests());

  it('tracks a request from pending to finished', () => {
    startRequest({ id: 'abc', method: 'GET', path: '/user', isPoll: false });
    expect(networkStore.get().requests[0].state).toBe('pending');
    finishRequest('abc', { state: 'ok', status: 200, durationMs: 12 });
    expect(networkStore.get().requests[0]).toMatchObject({
      id: 'abc',
      state: 'ok',
      status: 200,
      durationMs: 12,
    });
  });
});

describe('networkStore keeps full bodies only for the newest rows', () => {
  const { pruneBodies } = jest.requireActual('./networkStore');
  it('drops older responses and keeps the newest', () => {
    const rows = [1, 2, 3, 4].map((n) => ({ id: String(n), response: { n } }));
    const pruned = pruneBodies(rows, 2);
    expect(pruned.map((row) => row.response)).toEqual([undefined, undefined, { n: 3 }, { n: 4 }]);
    expect(rows[0].response).toEqual({ n: 1 });
  });
});
