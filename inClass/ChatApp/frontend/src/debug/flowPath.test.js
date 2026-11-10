import { ARCHITECTURE, NODE_ORDER, nodeInfo, routeOf, touchesDatabase } from './flowPath';

const ok = (method, path, extra = {}) => ({ method, path, state: 'ok', status: 200, ...extra });

describe('routeOf: the real path a request takes', () => {
  it('goes all the way down to the collection and back for a normal read', () => {
    const route = routeOf(ok('GET', '/message', { isPoll: true }));
    expect(route.down).toEqual([
      'screen',
      'store',
      'client',
      'http',
      'middleware',
      'guard',
      'controller',
      'service',
      'prisma',
      'messages',
    ]);
    expect(route).toMatchObject({ collection: 'messages', op: 'read', stop: null });
  });

  it('marks writes', () => {
    expect(routeOf(ok('POST', '/message', { status: 201 }))).toMatchObject({ op: 'write' });
    expect(routeOf(ok('POST', '/conversation', { status: 201 })).collection).toBe('conversations');
    expect(routeOf(ok('POST', '/file', { status: 201 })).collection).toBe('files');
    expect(routeOf(ok('GET', '/file/abc')).collection).toBe('files');
    expect(routeOf(ok('GET', '/user/profile')).collection).toBe('users');
  });

  it('stops where a failure happened', () => {
    const offline = routeOf({ method: 'GET', path: '/user', state: 'error' });
    expect(offline.stop).toBe('http');
    expect(offline.down.at(-1)).toBe('http');

    const wrongPassword = routeOf({ method: 'GET', path: '/user', state: 'error', status: 401 });
    expect(wrongPassword.stop).toBe('guard');
    expect(wrongPassword.down.at(-1)).toBe('guard');

    expect(routeOf({ method: 'POST', path: '/message', state: 'error', status: 400 }).stop).toBe(
      'controller',
    );
    expect(routeOf({ method: 'GET', path: '/message', state: 'error', status: 500 }).stop).toBe(
      'service',
    );
  });

  it('ends at the service when no collection is involved', () => {
    const route = routeOf(ok('GET', '/debug/logs'));
    expect(route.collection).toBeNull();
    expect(route.down.at(-1)).toBe('service');
  });

  it('names who started it', () => {
    expect(routeOf(ok('GET', '/conversation', { isPoll: true })).starter).toMatchObject({
      screen: 'chats',
      store: 'chatsStore',
    });
    expect(
      routeOf(ok('GET', '/message', { isPoll: true, initiator: 'inbox checker' })).starter.store,
    ).toBe('inbox checker');
  });
});

describe('touchesDatabase', () => {
  it('is true only when a request reached its collection', () => {
    expect(touchesDatabase(ok('GET', '/message'))).toBe(true);
    expect(touchesDatabase({ method: 'GET', path: '/user', state: 'error', status: 401 })).toBe(
      false,
    );
    expect(touchesDatabase(ok('GET', '/debug/logs'))).toBe(false);
  });
});

describe('the architecture map', () => {
  it('describes every node in plain words and technically', () => {
    NODE_ORDER.forEach((id) => {
      const info = nodeInfo(id);
      expect(info.title).toBeTruthy();
      expect(info.plain).toBeTruthy();
      expect(info.technical).toBeTruthy();
    });
  });

  it('groups the nodes into frontend, network, backend and database', () => {
    expect(ARCHITECTURE.map((layer) => layer.id)).toEqual([
      'frontend',
      'network',
      'backend',
      'database',
    ]);
  });
});
