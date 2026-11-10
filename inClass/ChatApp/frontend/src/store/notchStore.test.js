import { measureVisibleNotch, registerNotch } from './notchStore';

describe('measureVisibleNotch', () => {
  it('picks the newest notch that is on screen', async () => {
    const offs = [
      registerNotch(() => Promise.resolve({ x: 0, y: 0, h: 150 })), // tabs underneath
      registerNotch(() => Promise.resolve({ x: 0, y: 0, h: 0 })), // a detached tab
      registerNotch(() => Promise.resolve({ x: 0, y: 0, h: 128 })), // the chat on top
      registerNotch(() => Promise.resolve({ x: 390, y: 0, h: 140 })), // sliding off screen
    ];
    expect(await measureVisibleNotch()).toBe(128);
    offs.forEach((off) => off());
  });

  it('returns null with no notch, and survives a failing measure', async () => {
    expect(await measureVisibleNotch()).toBeNull();
    const off = registerNotch(() => Promise.reject(new Error('gone')));
    expect(await measureVisibleNotch()).toBeNull();
    off();
  });
});
