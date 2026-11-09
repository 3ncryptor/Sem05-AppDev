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
    expect(logStore.get().entries.length).toBeGreaterThan(0);
  });
});
