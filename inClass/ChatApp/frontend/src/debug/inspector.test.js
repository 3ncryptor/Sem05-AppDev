import { buildDebugReport, formatLogLine } from './debugReport';
import {
  DEFAULT_LOG_FILTERS,
  filterLogs,
  logCategories,
  mergeLogs,
  toggleValue,
  unseenErrorCount,
} from './filterLogs';
import { isLogPage, normalizeServerEntry, startSeq, stateFromError } from './serverLogsState';
import { createShakeDetector } from './shakeDetector';

const app = (id, time, extra = {}) => ({
  id: String(id),
  time,
  source: 'app',
  level: 'info',
  category: 'API',
  message: `app ${id}`,
  ...extra,
});

const server = (seq, time, extra = {}) => ({
  id: `s${seq}`,
  time,
  source: 'server',
  level: 'info',
  category: 'HTTP',
  message: `server ${seq}`,
  ...extra,
});

describe('serverLogsState', () => {
  it('recognises a log page', () => {
    expect(isLogPage({ entries: [], latestSeq: 0 })).toBe(true);
    expect(isLogPage({ entries: 'no', latestSeq: 0 })).toBe(false);
    expect(isLogPage('<html>')).toBe(false);
    expect(isLogPage(null)).toBe(false);
  });

  it('maps 404/401/403/405 to unsupported and the rest to unreachable', () => {
    expect(stateFromError({ kind: 'http', status: 404 })).toBe('unsupported');
    expect(stateFromError({ kind: 'http', status: 401 })).toBe('unsupported');
    expect(stateFromError({ kind: 'http', status: 403 })).toBe('unsupported');
    expect(stateFromError({ kind: 'http', status: 500 })).toBe('unreachable');
    expect(stateFromError({ kind: 'network' })).toBe('unreachable');
    expect(stateFromError({ kind: 'timeout' })).toBe('unreachable');
    expect(stateFromError(undefined)).toBe('unreachable');
  });

  it('starts at most `backlog` lines back, never below zero', () => {
    expect(startSeq(547, 100)).toBe(447);
    expect(startSeq(20, 100)).toBe(0);
  });

  it('normalises a backend entry to the app log shape', () => {
    const entry = normalizeServerEntry({
      seq: 49,
      time: '2026-11-09T22:30:03.451Z',
      level: 'log',
      context: 'HTTP',
      message: 'POST /file 201',
      requestId: null,
      isPoll: false,
    });
    expect(entry).toEqual({
      id: 's49',
      seq: 49,
      time: Date.parse('2026-11-09T22:30:03.451Z'),
      source: 'server',
      level: 'info',
      category: 'HTTP',
      message: 'POST /file 201',
      requestId: undefined,
      isPoll: false,
    });
    expect(normalizeServerEntry({ seq: 1, time: 'x', level: 'fatal', context: '' }).level).toBe(
      'error',
    );
  });
});

describe('filterLogs', () => {
  const entries = mergeLogs(
    [app(1, 10), app(2, 30, { isPoll: true, category: 'POLL' }), app(3, 50, { level: 'error' })],
    [server(7, 20, { requestId: 'ab12' }), server(8, 40, { category: 'BOT', message: 'factbot' })],
  );

  it('merges app and server lines in time order', () => {
    expect(entries.map((e) => e.id)).toEqual(['1', 's7', '2', 's8', '3']);
  });

  it('hides polls by default and keeps everything else', () => {
    expect(filterLogs(entries, DEFAULT_LOG_FILTERS).map((e) => e.id)).toEqual([
      '1',
      's7',
      's8',
      '3',
    ]);
  });

  it('filters by source, level, category, bot and search', () => {
    const base = { ...DEFAULT_LOG_FILTERS, hidePolls: false };
    expect(filterLogs(entries, { ...base, sources: ['server'] })).toHaveLength(2);
    expect(filterLogs(entries, { ...base, levels: ['error'] }).map((e) => e.id)).toEqual(['3']);
    expect(filterLogs(entries, { ...base, categories: ['HTTP'] }).map((e) => e.id)).toEqual(['s7']);
    expect(filterLogs(entries, { ...base, hideBot: true }).map((e) => e.id)).not.toContain('s8');
    expect(filterLogs(entries, { ...base, search: ' AB12 ' }).map((e) => e.id)).toEqual(['s7']);
  });

  it('lists categories in first-seen order', () => {
    expect(logCategories(entries)).toEqual(['API', 'HTTP', 'POLL', 'BOT']);
  });

  it('toggles a value without changing the input', () => {
    const list = ['a'];
    expect(toggleValue(list, 'b')).toEqual(['a', 'b']);
    expect(toggleValue(list, 'a')).toEqual([]);
    expect(list).toEqual(['a']);
  });

  it('counts only errors newer than the seen id', () => {
    const logs = [app(1, 1, { level: 'error' }), app(2, 2), app(3, 3, { level: 'error' })];
    expect(unseenErrorCount(logs, 0)).toBe(2);
    expect(unseenErrorCount(logs, 1)).toBe(1);
    expect(unseenErrorCount(logs, 3)).toBe(0);
  });
});

describe('createShakeDetector', () => {
  const options = { threshold: 1.4, hits: 3, windowMs: 900, cooldownMs: 1500 };
  const still = { x: 0, y: 0, z: 1 };
  const jolt = { x: 2.5, y: 0, z: 1 };

  it('ignores a phone at rest', () => {
    const detector = createShakeDetector(options);
    expect([0, 100, 200, 300].some((t) => detector.sample(still, t))).toBe(false);
  });

  it('fires after enough jolts inside the window, then cools down', () => {
    const detector = createShakeDetector(options);
    expect(detector.sample(jolt, 0)).toBe(false);
    expect(detector.sample(jolt, 100)).toBe(false);
    expect(detector.sample(jolt, 200)).toBe(true);
    expect(detector.sample(jolt, 300)).toBe(false);
    expect(detector.sample(jolt, 400)).toBe(false);
    expect(detector.sample(jolt, 500)).toBe(false);
  });

  it('forgets jolts older than the window', () => {
    const detector = createShakeDetector(options);
    detector.sample(jolt, 0);
    detector.sample(jolt, 100);
    expect(detector.sample(jolt, 2000)).toBe(false);
  });
});

describe('debugReport', () => {
  it('formats a line with source, category and request id', () => {
    const line = formatLogLine(
      app(1, new Date(2026, 0, 1, 9, 4, 31).getTime(), { requestId: 'a1' }),
    );
    expect(line).toBe('09:04:31 APP api app 1 #a1');
  });

  it('builds a report with versions, server and only the newest lines', () => {
    const report = buildDebugReport({
      entries: [app(1, 1), app(2, 2), app(3, 3)],
      lines: 2,
      versions: { app: '1.0.0', sdk: '58.0.0', platform: 'ios 18' },
      session: { baseUrl: 'http://10.0.0.5:3000', name: 'aarav' },
      serverLogs: 'available',
      now: 0,
    });
    expect(report).toContain('server: http://10.0.0.5:3000  user: aarav');
    expect(report).toContain('last 2 lines:');
    expect(report).not.toContain('app 1');
    expect(report).toContain('app 3');
    expect(report).not.toMatch(/password/i);
  });
});
