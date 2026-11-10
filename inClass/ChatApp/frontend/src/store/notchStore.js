/**
 * notchStore: the height of the header notch (the dark Slab with the
 * greeting) on the screen being shown, so the Inspector can grow out of
 * exactly that shape (buildPlan.md 15). Every notch Slab reports its height
 * when it lays out; the latest one is the screen in front.
 */
import { createStore } from './createStore';

/** Used until a notch has reported (status bar + one header row). */
export const DEFAULT_NOTCH_HEIGHT = 120;

export const notchStore = createStore({ height: DEFAULT_NOTCH_HEIGHT });

/** @param {number} height */
export function reportNotchHeight(height) {
  if (height > 0 && Math.round(height) !== Math.round(notchStore.get().height)) {
    notchStore.set({ height });
  }
}

/**
 * Every mounted notch registers a way to measure itself. Tabs stay mounted and
 * stack screens sit on top of each other, so on opening the Inspector asks them
 * all and takes the newest one that is really on screen (top-left at 0, a height).
 */
const measurers = [];

/**
 * @param {() => Promise<{ x: number, y: number, h: number } | null>} measure
 * @returns {() => void} unregister
 */
export function registerNotch(measure) {
  measurers.push(measure);
  return () => {
    const index = measurers.indexOf(measure);
    if (index !== -1) measurers.splice(index, 1);
  };
}

const ON_SCREEN_SLACK = 2;

/** @returns {Promise<number | null>} the visible notch's height, or null */
export async function measureVisibleNotch() {
  const results = await Promise.all(measurers.map((measure) => measure().catch(() => null)));
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const box = results[index];
    if (
      box &&
      box.h > 0 &&
      Math.abs(box.x) <= ON_SCREEN_SLACK &&
      Math.abs(box.y) <= ON_SCREEN_SLACK
    ) {
      return box.h;
    }
  }
  return null;
}
