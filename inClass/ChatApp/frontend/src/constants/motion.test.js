import { durations, ENTER_SCALE, PRESS_SCALE, SHAKE_DISTANCE, springs } from './motion';

// Only the plain tokens are under test; the curve and keyframe builders need the native runtime.
jest.mock('react-native-reanimated', () => ({
  Easing: { bezier: () => () => 0 },
  Keyframe: jest.fn(),
}));

const MIN_DAMPING_RATIO = 0.85;
const UI_DURATION_CAP_MS = 300;

describe('motion tokens stay calm (buildPlan.md 13 V1)', () => {
  it.each(Object.entries(springs))('spring "%s" barely overshoots', (_, spring) => {
    expect(spring.dampingRatio).toBeGreaterThanOrEqual(MIN_DAMPING_RATIO);
    expect(spring.dampingRatio).toBeLessThanOrEqual(1);
    expect(spring).not.toHaveProperty('stiffness');
  });

  it('keeps every UI timing at or under 300 ms', () => {
    Object.values(durations).forEach((ms) => expect(ms).toBeLessThanOrEqual(UI_DURATION_CAP_MS));
  });

  it('presses are felt more than seen', () => {
    expect(PRESS_SCALE).toBeGreaterThanOrEqual(0.95);
    expect(durations.press).toBeLessThanOrEqual(150);
  });

  it('entrances never start from nothing, and shakes stay small', () => {
    expect(ENTER_SCALE).toBeGreaterThanOrEqual(0.9);
    expect(SHAKE_DISTANCE).toBeLessThanOrEqual(6);
  });
});
