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
