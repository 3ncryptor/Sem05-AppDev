import { flowLayout, routePolyline } from './flowLayout';
import { routeOf } from './flowPath';
import { replaySteps } from './flowReplay';

describe('flowLayout', () => {
  const layout = flowLayout(340);

  it('places every box inside the width without overlaps in a row', () => {
    Object.values(layout.nodes).forEach((box) => {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(340.001);
    });
    expect(layout.nodes.screen.x + layout.nodes.screen.w).toBeLessThan(layout.nodes.store.x);
  });

  it('goes top to bottom: frontend, network, backend, database', () => {
    const y = (id) => layout.nodes[id].y;
    expect(y('screen')).toBeLessThan(y('http'));
    expect(y('http')).toBeLessThan(y('guard'));
    expect(y('service')).toBeLessThan(y('prisma'));
    expect(y('prisma')).toBeLessThan(y('messages'));
    expect(layout.bands.map((band) => band.id)).toEqual([
      'frontend',
      'network',
      'backend',
      'database',
    ]);
  });

  it('gives a packet path with even-speed lengths', () => {
    const line = routePolyline(['screen', 'store', 'client', 'http'], layout.nodes);
    expect(line.xs).toHaveLength(4);
    expect(line.lengths[0]).toBe(0);
    expect(line.total).toBeGreaterThan(0);
    expect([...line.lengths].sort((a, b) => a - b)).toEqual(line.lengths);
  });
});

describe('replaySteps', () => {
  const context = {
    name: 'aarav',
    baseUrl: 'http://x:3000',
    serverLines: [],
    hasServerLogs: false,
  };

  it('tells a sent message from the screen to the database and back', () => {
    const row = {
      id: 'ab12',
      method: 'POST',
      path: '/message',
      state: 'ok',
      status: 201,
      durationMs: 84,
      requestBody: { content: 'hi' },
    };
    const steps = replaySteps(row, context);
    expect(steps.map((step) => step.node)).toEqual([...routeOf(row).down, 'client', 'screen']);
    expect(steps.at(-1).plain).toBe("The message's clock turns into a tick.");
    expect(steps.find((step) => step.node === 'messages').plain).toMatch(/saves the new item/);
  });

  it('never shows the password and marks server steps "from the code" without logs', () => {
    const row = { id: 'x', method: 'GET', path: '/user', state: 'ok', status: 200, durationMs: 9 };
    const steps = replaySteps(row, context);
    expect(JSON.stringify(steps)).toContain('aarav:<hidden>');
    expect(steps.find((step) => step.node === 'guard').fromCode).toBe(true);
    expect(steps.find((step) => step.node === 'client').fromCode).toBeFalsy();
  });

  it('stops at the guard for a wrong password', () => {
    const row = {
      id: 'x',
      method: 'GET',
      path: '/user',
      state: 'error',
      status: 401,
      durationMs: 9,
    };
    const steps = replaySteps(row, { ...context, hasServerLogs: true });
    const guard = steps.find((step) => step.node === 'guard');
    expect(guard.plain).toMatch(/wrong, so it stops here/);
    expect(steps.map((step) => step.node)).not.toContain('controller');
  });
});
