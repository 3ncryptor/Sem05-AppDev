import { ApiError } from '../api/ApiError';
import { fetchServerLogs } from '../api/debugLogs';
import { sessionStore } from '../store/sessionStore';
import { checkServerLogs, pollServerLogs, serverLogStore } from './serverLogStore';

jest.mock('../api/debugLogs', () => ({ fetchServerLogs: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const entry = (seq) => ({
  seq,
  time: '2026-11-09T22:30:00.000Z',
  level: 'log',
  context: 'HTTP',
  message: `line ${seq}`,
  requestId: null,
  isPoll: false,
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  fetchServerLogs.mockReset();
  sessionStore.set({ status: 'signedIn', baseUrl: 'http://x:3000', name: 'aarav' });
});

afterEach(() => jest.restoreAllMocks());

describe('serverLogStore', () => {
  it('is signedOut without a session and makes no request', async () => {
    sessionStore.set({ status: 'signedOut' });
    await checkServerLogs();
    expect(serverLogStore.get().status).toBe('signedOut');
    expect(fetchServerLogs).not.toHaveBeenCalled();
  });

  it('loads only the recent backlog when available', async () => {
    fetchServerLogs
      .mockResolvedValueOnce({ entries: [entry(1)], latestSeq: 547 })
      .mockResolvedValueOnce({ entries: [entry(448), entry(449)], latestSeq: 549 });
    await checkServerLogs();
    expect(fetchServerLogs).toHaveBeenLastCalledWith({ after: 447, limit: 200 });
    expect(serverLogStore.get()).toMatchObject({ status: 'available', afterSeq: 449 });
    expect(serverLogStore.get().entries.map((e) => e.id)).toEqual(['s448', 's449']);
  });

  it('treats a 404 as unsupported (class server)', async () => {
    fetchServerLogs.mockRejectedValueOnce(
      new ApiError({ kind: 'http', status: 404, message: 'x' }),
    );
    await checkServerLogs();
    expect(serverLogStore.get().status).toBe('unsupported');
  });

  it('treats a non-log 200 as unsupported', async () => {
    fetchServerLogs.mockResolvedValueOnce('<html>');
    await checkServerLogs();
    expect(serverLogStore.get().status).toBe('unsupported');
  });

  it('goes unreachable when a poll fails, and stops polling', async () => {
    fetchServerLogs
      .mockResolvedValueOnce({ entries: [], latestSeq: 0 })
      .mockResolvedValueOnce({ entries: [], latestSeq: 0 })
      .mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'down' }));
    await checkServerLogs();
    await pollServerLogs();
    expect(serverLogStore.get().status).toBe('unreachable');
    await pollServerLogs();
    expect(fetchServerLogs).toHaveBeenCalledTimes(3);
  });

  it('clears lines when the server changes', async () => {
    fetchServerLogs
      .mockResolvedValueOnce({ entries: [], latestSeq: 1 })
      .mockResolvedValueOnce({ entries: [entry(1)], latestSeq: 1 });
    await checkServerLogs();
    expect(serverLogStore.get().entries).toHaveLength(1);
    sessionStore.set({ baseUrl: 'http://other:3000' });
    expect(serverLogStore.get()).toMatchObject({ status: 'idle', entries: [] });
  });
});
