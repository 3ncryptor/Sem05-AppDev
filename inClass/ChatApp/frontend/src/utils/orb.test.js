import { clampOrbY, snapOrbX } from './orb';

describe('orb position', () => {
  it('snaps to the nearer side', () => {
    expect(snapOrbX(10, 400, 48, 12)).toBe(12);
    expect(snapOrbX(300, 400, 48, 12)).toBe(340);
  });

  it('clamps vertically', () => {
    expect(clampOrbY(-5, 40, 700)).toBe(40);
    expect(clampOrbY(900, 40, 700)).toBe(700);
    expect(clampOrbY(300, 40, 700)).toBe(300);
  });
});
