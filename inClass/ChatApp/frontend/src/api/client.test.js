import { clearLogs, logStore } from '../debug/logStore';
import { clearRequests, networkStore } from '../debug/networkStore';
import { ApiError } from './ApiError';
import { buildQuery, request } from './client';

// A short timeout keeps the timeout test fast with real timers.
jest.mock('../constants/config', () => ({
  ...jest.requireActual('../constants/config'),
  REQUEST_TIMEOUT_MS: 20,
}));

const connection = { baseUrl: 'http://10.0.0.5:3000', name: 'aarav', password: 'demo123' };

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  };
}

beforeEach(() => {
  clearLogs();
  clearRequests();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

describe('buildQuery', () => {
  it('encodes values and skips empty ones', () => {
    expect(buildQuery({ a: 'x y', b: undefined, c: null, d: '', e: 2 })).toBe('?a=x%20y&e=2');
    expect(buildQuery(undefined)).toBe('');
    expect(buildQuery({})).toBe('');
  });
});

describe('request', () => {
  it('sends the raw auth header, a request id and JSON body', async () => {
    fetch.mockResolvedValue(jsonResponse(201, { id: 'm1' }));
    const data = await request('/message', {
      method: 'POST',
      body: { content: 'hi' },
      connection,
    });

    expect(data).toEqual({ id: 'm1' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://10.0.0.5:3000/message');
    expect(init.headers.Authorization).toBe('Basic aarav:demo123');
    expect(init.headers['X-Request-Id']).toMatch(/^[a-z0-9]{6}$/);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Client-Poll']).toBeUndefined();
    expect(init.body).toBe('{"content":"hi"}');
  });

  it('tags polls and can skip auth', async () => {
    fetch.mockResolvedValue(jsonResponse(200, []));
    await request('/user', { isPoll: true, auth: false, connection });
    const { headers } = fetch.mock.calls[0][1];
    expect(headers['X-Client-Poll']).toBe('1');
    expect(headers.Authorization).toBeUndefined();
  });

  it('turns an HTTP error into an ApiError with the server message', async () => {
    fetch.mockResolvedValue(jsonResponse(401, { message: "Invalid password for user 'aarav'" }));
    const error = await request('/user/profile', { connection }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 401 });
    expect(error.message).toMatch(/Invalid password/);
    expect(networkStore.get().requests[0]).toMatchObject({ state: 'error', status: 401 });
  });

  it('reports a network failure', async () => {
    fetch.mockRejectedValue(new TypeError('Network request failed'));
    const error = await request('/user', { connection }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'network' });
  });

  it('times out slow requests', async () => {
    fetch.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const error = await request('/user', { connection }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'timeout' });
  });

  it('refuses to send without a server', async () => {
    const error = await request('/user', { connection: { baseUrl: '' } }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'network' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records the request and never logs the password', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { id: 'u1' }));
    await request('/user/profile', { connection });

    expect(networkStore.get().requests[0]).toMatchObject({ state: 'ok', status: 200 });
    const everything =
      JSON.stringify(logStore.get().entries) + JSON.stringify(console.log.mock.calls);
    expect(everything).toContain('GET /user/profile');
    expect(everything).not.toContain('demo123');
  });

  it('keeps polls out of the console unless they fail', async () => {
    fetch.mockResolvedValue(jsonResponse(200, []));
    await request('/conversation', { isPoll: true, connection });
    expect(console.log).not.toHaveBeenCalled();
    expect(logStore.get().entries).toHaveLength(0);
    expect(logStore.get().heartbeat).toMatchObject({
      checks: 1,
      failures: 0,
      byKind: { chats: 1 },
    });
  });
});

describe('request extras for the Inspector', () => {
  const { setTools, DEFAULT_TOOLS } = jest.requireActual('../debug/toolsStore');

  afterEach(() => setTools(DEFAULT_TOOLS));

  it('fails without calling fetch while simulate offline is on', async () => {
    setTools({ simulateOffline: true });
    await expect(request('/user', { connection })).rejects.toMatchObject({ kind: 'network' });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(networkStore.get().requests[0]).toMatchObject({ state: 'error' });
  });

  it('stores safe request and response previews and the size', async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { id: 'm1' }));
    await request('/message', {
      method: 'POST',
      body: { content: 'hi', password: 'x' },
      connection,
    });
    const row = networkStore.get().requests[0];
    expect(row.requestPreview).toContain('<hidden>');
    expect(row.requestPreview).not.toContain('"x"');
    expect(row.responsePreview).toBe('{"id":"m1"}');
    expect(row.bytes).toBe(11);
  });
});

describe('readable request logging (V4)', () => {
  it('keeps one line per request and fills it in when the reply arrives', async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { id: 'm1' }));
    await request('/message', { method: 'POST', body: { content: 'hi' }, connection });
    const lines = logStore.get().entries.filter((entry) => entry.category === 'API');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ pending: false, level: 'info' });
    expect(lines[0].message).toMatch(/^sent a message · ok 201 · \d+ ms$/);
    expect(lines[0].detail).toMatch(/^POST \/message #/);
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});

describe('a reply whose body fails', () => {
  it('fails as a network error and settles the log line', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.reject(new Error('connection reset')),
    });
    await expect(request('/user', { connection })).rejects.toMatchObject({ kind: 'network' });
    const line = logStore.get().entries.find((entry) => entry.category === 'API');
    expect(line).toMatchObject({ pending: false, level: 'error' });
    expect(networkStore.get().requests[0]).toMatchObject({ state: 'error' });
  });
});

describe('failed request logging', () => {
  it('prints failures with console.warn (no red error screen) but stores them as errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));
    await expect(request('/user', { connection })).rejects.toMatchObject({ kind: 'network' });
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('server unreachable'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('GET /user #'));
    expect(logStore.get().entries.at(-1).level).toBe('error');
  });
});

describe('request detail for the Inspector (devtools view)', () => {
  it('records safe headers, the full url, timing and the reply', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: [{ id: 'm1' }] }));
    await request('/message', {
      query: { conversation_id: 'c1' },
      connection,
      initiator: 'inbox checker',
    });
    const row = networkStore.get().requests[0];
    expect(row.url).toBe('http://10.0.0.5:3000/message?conversation_id=c1');
    expect(row.initiator).toBe('inbox checker');
    expect(row.requestHeaders.Authorization).toBe('Basic aarav:<hidden>');
    expect(row.response).toEqual({ data: [{ id: 'm1' }] });
    expect(Number.isFinite(row.ttfbMs)).toBe(true);
    expect(JSON.stringify(row)).not.toContain('demo123');
  });
});
