import {
  describeOutcome,
  describeRequest,
  formatConsoleLine,
  pollKind,
  requestLine,
  resultCount,
} from './describeRequest';

describe('describeRequest: what the app was doing, in plain words', () => {
  it.each([
    [{ method: 'GET', path: '/user', auth: false }, 'tested the server'],
    [{ method: 'GET', path: '/user' }, 'loaded people'],
    [{ method: 'GET', path: '/user', isPoll: true }, 'checked the people list'],
    [{ method: 'GET', path: '/user/profile' }, 'checked your account'],
    [{ method: 'GET', path: '/conversation' }, 'loaded your chats'],
    [{ method: 'GET', path: '/conversation', isPoll: true }, 'checked for new chats'],
    [{ method: 'POST', path: '/conversation', body: { type: 'DM' } }, 'started a chat'],
    [
      { method: 'POST', path: '/conversation', body: { type: 'GROUP', name: 'study' } },
      'created the group "study"',
    ],
    [{ method: 'GET', path: '/message' }, 'opened a chat'],
    [
      { method: 'GET', path: '/message', query: { from_message_cursor: 'c1' } },
      'loaded older messages',
    ],
    [{ method: 'GET', path: '/message', isPoll: true }, 'checked for new messages'],
    [{ method: 'POST', path: '/message', body: { content: 'hi' } }, 'sent a message'],
    [{ method: 'POST', path: '/message', body: { file_id: 'f1' } }, 'sent a photo'],
    [{ method: 'POST', path: '/file' }, 'uploaded a photo'],
    [{ method: 'GET', path: '/file/abc' }, 'downloaded a photo'],
    [{ method: 'GET', path: '/debug/logs', isPoll: true }, 'fetched server logs'],
    [{ method: 'DELETE', path: '/thing' }, 'DELETE /thing'],
  ])('%j -> %s', (input, phrase) => {
    expect(describeRequest(input)).toBe(phrase);
  });
});

describe('describeOutcome: a readable status', () => {
  it.each([
    [{ status: 200 }, 'ok'],
    [{ status: 201 }, 'ok'],
    [{ kind: 'http', status: 401 }, 'wrong password'],
    [{ kind: 'http', status: 403 }, 'not allowed'],
    [{ kind: 'http', status: 404 }, 'not found'],
    [{ kind: 'http', status: 400, message: 'content is empty' }, 'rejected: content is empty'],
    [{ kind: 'http', status: 503 }, 'server error'],
    [{ kind: 'timeout' }, 'timed out'],
    [{ kind: 'network', message: 'Simulated offline' }, 'offline (simulated)'],
    [{ kind: 'network', message: 'Network request failed' }, 'server unreachable'],
  ])('%j -> %s', (input, outcome) => {
    expect(describeOutcome(input)).toBe(outcome);
  });
});

describe('resultCount', () => {
  it('counts lists and paged lists, and ignores everything else', () => {
    expect(resultCount([1, 2, 3])).toBe(3);
    expect(resultCount({ data: [1, 2] })).toBe(2);
    expect(resultCount({ id: 'x' })).toBeNull();
    expect(resultCount(null)).toBeNull();
  });
});

describe('requestLine', () => {
  it('reads as a sentence, then the technical detail', () => {
    expect(
      requestLine({
        phrase: 'loaded your chats',
        outcome: 'ok',
        status: 200,
        durationMs: 31,
        count: 4,
      }),
    ).toBe('loaded your chats (4) · ok 200 · 31 ms');
  });

  it('leaves out what is unknown', () => {
    expect(requestLine({ phrase: 'sent a message', outcome: 'timed out', durationMs: 10000 })).toBe(
      'sent a message · timed out · 10000 ms',
    );
    expect(requestLine({ phrase: 'sent a message' })).toBe('sent a message · sending');
  });
});

describe('pollKind', () => {
  it('names the background check a poll belongs to', () => {
    expect(pollKind('/conversation')).toBe('chats');
    expect(pollKind('/message')).toBe('messages');
    expect(pollKind('/user')).toBe('people');
    expect(pollKind('/debug/logs')).toBe('server logs');
    expect(pollKind('/other')).toBe('other');
  });
});

describe('formatConsoleLine: aligned terminal columns', () => {
  const entry = {
    time: new Date(2026, 10, 10, 9, 5, 7).getTime(),
    level: 'info',
    category: 'API',
    message: 'sent a message · ok 201 · 84 ms',
    detail: 'POST /message #ab12',
  };

  it('aligns time, category, message and detail without colour', () => {
    expect(formatConsoleLine(entry, { color: false })).toBe(
      '09:05:07  API    sent a message · ok 201 · 84 ms   POST /message #ab12',
    );
  });

  it('adds ANSI colour only when asked, and never emojis', () => {
    const coloured = formatConsoleLine({ ...entry, level: 'error' }, { color: true });
    expect(coloured).toContain('\u001b[');
    expect(coloured).toContain('sent a message');
    expect(coloured).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('works without a detail', () => {
    expect(formatConsoleLine({ ...entry, detail: undefined }, { color: false })).toBe(
      '09:05:07  API    sent a message · ok 201 · 84 ms',
    );
  });
});

describe('describeRow', () => {
  const { describeRow } = jest.requireActual('./describeRequest');
  it('reads the server test and group creation from the recorded row', () => {
    expect(describeRow({ method: 'GET', path: '/user', requestHeaders: { Accept: 'x' } })).toBe(
      'tested the server',
    );
    expect(
      describeRow({
        method: 'POST',
        path: '/conversation',
        requestHeaders: { Authorization: 'Basic a:<hidden>' },
        requestBody: { type: 'GROUP', name: 'study' },
      }),
    ).toBe('created the group "study"');
  });
});
