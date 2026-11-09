/**
 * Motion tokens from design.md section 8, so every animation in the app
 * shares the same feel. Durations are in milliseconds.
 */

export const springs = {
  press: { damping: 15, stiffness: 300 },
  tab: { damping: 18, stiffness: 220 },
  sheet: { damping: 20, stiffness: 180 },
  pop: { damping: 10, stiffness: 260 },
};

export const durations = {
  fast: 160,
  base: 240,
  messageIn: 260,
  screen: 300,
  shake: 300,
  imageFade: 250,
};

/** Delay between rows when a list fades in one after another. */
export const STAGGER_MS = 40;

/** How far a pressed control shrinks. */
export const PRESS_SCALE = 0.92;

/** Horizontal distance of the error shake, in points. */
export const SHAKE_DISTANCE = 8;
