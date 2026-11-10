import { redactHeaders, timingParts, toCurl, waterfall } from './networkDetail';

describe('redactHeaders', () => {
  it('hides the password but keeps who it is', () => {
    const headers = {
      Authorization: 'Basic YWFyYXY6ZGVtbzEyMw==',
      'X-Request-Id': 'ab12',
      Accept: 'application/json',
    };
    expect(redactHeaders(headers, 'aarav')).toEqual({
      Authorization: 'Basic aarav:<hidden>',
      'X-Request-Id': 'ab12',
      Accept: 'application/json',
    });
  });

  it('does not change the input', () => {
    const headers = { Authorization: 'Basic x' };
    redactHeaders(headers, 'aarav');
    expect(headers.Authorization).toBe('Basic x');
  });
});

describe('toCurl', () => {
  const row = {
    method: 'POST',
    url: 'http://10.0.0.5:3000/message',
    requestHeaders: {
      Authorization: 'Basic aarav:<hidden>',
      'X-Request-Id': 'ab12',
      'Content-Type': 'application/json',
    },
    requestBody: { conversation_id: 'c1', content: "it's here" },
  };

  it("uses this backend's raw Basic header with a password placeholder, never the password", () => {
    const curl = toCurl(row);
    expect(curl).toContain("curl -X POST 'http://10.0.0.5:3000/message'");
    expect(curl).toContain("-H 'Authorization: Basic aarav:YOUR_PASSWORD'");
    expect(curl).not.toContain('-u ');
    expect(curl).not.toContain('<hidden>');
    expect(curl).toContain("-H 'X-Request-Id: ab12'");
    expect(curl).toContain(`-d '{"conversation_id":"c1","content":"it'\\''s here"}'`);
  });

  it('takes the user from the request itself, and adds none when the request had none', () => {
    const curl = toCurl({ method: 'GET', url: 'http://x/user', requestHeaders: {} });
    expect(curl).toBe("curl -X GET 'http://x/user'");
  });
});

describe('timingParts', () => {
  it('splits waiting for the server from downloading the reply', () => {
    expect(timingParts({ durationMs: 100, ttfbMs: 80 })).toEqual({ waitingMs: 80, downloadMs: 20 });
  });
  it('treats the whole time as waiting when there is no split', () => {
    expect(timingParts({ durationMs: 50 })).toEqual({ waitingMs: 50, downloadMs: 0 });
    expect(timingParts({})).toEqual({ waitingMs: 0, downloadMs: 0 });
  });
});

describe('waterfall', () => {
  it('places each request on one shared time axis', () => {
    const rows = [
      { id: 'a', startedAt: 1000, durationMs: 100 },
      { id: 'b', startedAt: 1050, durationMs: 50 },
      { id: 'c', startedAt: 1100, state: 'pending' },
    ];
    const bars = waterfall(rows, 1200);
    expect(bars.a).toEqual({ left: 0, width: 0.5 });
    expect(bars.b).toEqual({ left: 0.25, width: 0.25 });
    expect(bars.c).toEqual({ left: 0.5, width: 0.5 });
  });

  it('copes with a single instant request', () => {
    expect(waterfall([{ id: 'a', startedAt: 5, durationMs: 0 }], 5).a.width).toBeGreaterThan(0);
  });
});
