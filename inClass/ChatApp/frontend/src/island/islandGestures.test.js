import { project, swipeIntent, tapIntent } from './islandGestures';

const still = { tx: 0, ty: 0, vx: 0, vy: 0 };

describe('project: where a flick was going', () => {
  it('is zero without velocity and grows with it', () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeGreaterThan(project(500));
    expect(project(-1000)).toBeLessThan(0);
  });
});

describe('swipeIntent', () => {
  it('a sideways flick on a message marks it read, even a short one', () => {
    expect(swipeIntent('compact', 'message', { ...still, tx: 20, vx: 900 })).toBe('markRead');
    expect(swipeIntent('expanded', 'message', { ...still, tx: -120 })).toBe('markRead');
  });

  it('a slow, short sideways drag does nothing', () => {
    expect(swipeIntent('compact', 'message', { ...still, tx: 30, vx: 50 })).toBeNull();
  });

  it('sideways dismisses failures and new chats, and leaves live status alone', () => {
    expect(swipeIntent('compact', 'failed', { ...still, tx: 140 })).toBe('dismiss');
    expect(swipeIntent('compact', 'newChat', { ...still, tx: -140 })).toBe('dismiss');
    expect(swipeIntent('compact', 'upload', { ...still, tx: 140 })).toBeNull();
    expect(swipeIntent('compact', 'connection', { ...still, tx: 140 })).toBeNull();
  });

  it('swipe up dismisses a pill, closes a card or the glance', () => {
    expect(swipeIntent('compact', 'message', { ...still, ty: -40 })).toBe('dismiss');
    expect(swipeIntent('multi', 'connection', { ...still, ty: -40 })).toBe('dismiss');
    expect(swipeIntent('compact', 'upload', { ...still, ty: -40 })).toBeNull();
    expect(swipeIntent('expanded', 'message', { ...still, ty: -40 })).toBe('collapse');
    expect(swipeIntent('glance', null, { ...still, vy: -900 })).toBe('closeGlance');
  });

  it('pull down opens the card, or the glance at rest', () => {
    expect(swipeIntent('compact', 'message', { ...still, ty: 40 })).toBe('expand');
    expect(swipeIntent('rest', null, { ...still, ty: 40 })).toBe('glance');
    expect(swipeIntent('compact', 'copied', { ...still, ty: 40 })).toBeNull();
  });

  it('ignores swipes during a confirmation', () => {
    expect(swipeIntent('confirm', 'message', { ...still, tx: 200 })).toBeNull();
  });
});

describe('tapIntent', () => {
  it.each([
    ['rest', null, 'glance'],
    ['confirm', 'message', 'skip'],
    ['compact', 'message', 'open'],
    ['multi', 'newChat', 'open'],
    ['compact', 'failed', 'retry'],
    ['compact', 'upload', 'open'],
    ['compact', 'connection', 'network'],
    ['compact', 'copied', 'dismiss'],
    ['expanded', 'message', null],
    ['glance', null, null],
  ])('%s + %s -> %s', (presentation, kind, intent) => {
    expect(tapIntent(presentation, kind)).toBe(intent);
  });
});
