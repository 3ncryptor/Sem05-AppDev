import { activeDots, activeRipples, controllerFor, dotKind, explainSteps } from './flowEvents';

const row = (id, extra = {}) => ({
  id,
  method: 'GET',
  path: '/conversation',
  isPoll: false,
  startedAt: 1000,
  state: 'ok',
  status: 200,
  durationMs: 84,
  requestPreview: '',
  responsePreview: '[]',
  ...extra,
});

describe('dotKind', () => {
  it('tells polls, reads and sends apart', () => {
    expect(dotKind(row('a', { isPoll: true }))).toBe('poll');
    expect(dotKind(row('a'))).toBe('read');
    expect(dotKind(row('a', { method: 'POST' }))).toBe('send');
  });
});

describe('activeDots', () => {
  const options = { windowMs: 2000, max: 2 };

  it('keeps pending and recent requests, newest max of them', () => {
    const requests = [
      row('old', { startedAt: 0 }),
      row('slow', { startedAt: 0, state: 'pending' }),
      row('a', { startedAt: 4000 }),
      row('b', { startedAt: 4500 }),
    ];
    expect(activeDots(requests, 5000, options).map((r) => r.id)).toEqual(['a', 'b']);
    expect(activeDots(requests, 5000, { ...options, max: 5 }).map((r) => r.id)).toEqual([
      'slow',
      'a',
      'b',
    ]);
  });
});

describe('activeRipples', () => {
  it('maps recent background contexts to ripple kinds', () => {
    const entries = [
      { id: 's1', time: 0, category: 'BOTSERVICE' },
      { id: 's2', time: 900, category: 'BOTSERVICE' },
      { id: 's3', time: 950, category: 'RECEIPTS' },
      { id: 's4', time: 980, category: 'FILECLEANUP' },
      { id: 's5', time: 990, category: 'HTTP' },
    ];
    expect(activeRipples(entries, 1000, 500)).toEqual([
      { id: 's2', kind: 'bot' },
      { id: 's3', kind: 'receipts' },
      { id: 's4', kind: 'cleanup' },
    ]);
  });
});

describe('controllerFor', () => {
  it('names the controller from the first path segment', () => {
    expect(controllerFor('/message?conversation_id=1')).toBe('MessageController -> MessageService');
    expect(controllerFor('/file/abc')).toBe('FileController -> FileService');
    expect(controllerFor('/nope')).toBe('Controller -> Service');
  });
});

describe('explainSteps', () => {
  const context = { baseUrl: 'http://10.0.0.5:3000', name: 'aarav', serverLines: [] };

  it('tells the real story of a sent message without the password', () => {
    const send = row('a1', {
      method: 'POST',
      path: '/message',
      status: 201,
      requestPreview: '{"conversation_id":"c1","content":"hi"}',
    });
    const steps = explainSteps(send, {
      ...context,
      serverLines: [{ message: 'POST /message 201 84ms user=aarav' }],
    });
    expect(steps.map((s) => s.node)).toEqual([
      'phone',
      'wire',
      'guard',
      'service',
      'db',
      'reply',
      'phone',
    ]);
    expect(steps[0].title).toBe('app builds Authorization: Basic aarav:<hidden>');
    expect(steps[0].detail).toBe('X-Request-Id: a1');
    expect(steps[1].title).toBe('HTTP POST to http://10.0.0.5:3000/message');
    expect(steps[1].detail).toContain('"content":"hi"');
    expect(steps[3].title).toBe('MessageController -> MessageService');
    expect(steps[3].detail).toBe('POST /message 201 84ms user=aarav');
    expect(steps[5].title).toBe('201 comes back in 84ms');
    expect(steps[6].title).toBe("the bubble's clock flips to a tick");
  });

  it('explains polls, failures and pending requests', () => {
    expect(explainSteps(row('p', { isPoll: true }), context)[0].detail).toContain(
      'X-Client-Poll: 1',
    );
    const offline = row('o', { state: 'error', status: undefined, error: 'Simulated offline' });
    const steps = explainSteps(offline, context);
    expect(steps[2].title).toBe('never reached the server');
    expect(steps[6].title).toContain('Simulated offline');
    expect(explainSteps(row('w', { state: 'pending' }), context)[5].title).toBe(
      'waiting for the reply',
    );
  });
});
