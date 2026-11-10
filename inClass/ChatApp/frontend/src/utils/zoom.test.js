import {
  clampScale,
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  nextDoubleTapScale,
  shouldDismiss,
} from './zoom';

describe('zoom rules', () => {
  it('clamps the pinch scale', () => {
    expect(clampScale(0.3)).toBe(MIN_SCALE);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(9)).toBe(MAX_SCALE);
  });

  it('dismisses on a long or fast swipe down only', () => {
    expect(shouldDismiss(200, 0)).toBe(true);
    expect(shouldDismiss(30, 1500)).toBe(true);
    expect(shouldDismiss(30, 100)).toBe(false);
    expect(shouldDismiss(-300, -2000)).toBe(false);
  });

  it('double tap toggles between fit and zoomed', () => {
    expect(nextDoubleTapScale(1)).toBe(DOUBLE_TAP_SCALE);
    expect(nextDoubleTapScale(2.5)).toBe(MIN_SCALE);
  });
});
