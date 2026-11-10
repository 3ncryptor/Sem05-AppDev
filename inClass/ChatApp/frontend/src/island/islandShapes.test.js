import { circleLayout, islandAnchor, presentationFor, shapeFor } from './islandShapes';

describe('islandAnchor: where the island sits', () => {
  it('centres a small pill in the Android status bar, around the front camera', () => {
    const anchor = islandAnchor({ os: 'android', insetTop: 32 });
    expect(anchor.rest).toEqual({ width: 76, height: 26 });
    expect(anchor.top).toBe(3);
  });

  it('wraps the real Dynamic Island on iPhones that have one', () => {
    const anchor = islandAnchor({ os: 'ios', insetTop: 62 });
    expect(anchor.rest).toEqual({ width: 126, height: 37 });
    expect(anchor.top).toBe(11);
  });

  it('never sits above the screen edge', () => {
    expect(islandAnchor({ os: 'android', insetTop: 0 }).top).toBeGreaterThanOrEqual(2);
  });
});

describe('presentationFor', () => {
  const main = { key: 'a' };
  it.each([
    [{ main: null, circles: [], expandedKey: null, confirm: null }, 'rest'],
    [{ main, circles: [], expandedKey: null, confirm: null }, 'compact'],
    [{ main, circles: [{ key: 'b' }], expandedKey: null, confirm: null }, 'multi'],
    [{ main, circles: [{ key: 'b' }], expandedKey: 'a', confirm: null }, 'expanded'],
    [{ main, circles: [], expandedKey: null, confirm: { title: 'sent' } }, 'confirm'],
    [{ main, circles: [], expandedKey: 'gone', confirm: null }, 'compact'],
    [{ main: null, circles: [], expandedKey: null, confirm: null, glance: true }, 'glance'],
    [
      { main: null, circles: [], expandedKey: null, confirm: { title: 'x' }, glance: true },
      'confirm',
    ],
  ])('%j -> %s', (state, presentation) => expect(presentationFor(state)).toBe(presentation));
});

describe('shapeFor', () => {
  const anchor = islandAnchor({ os: 'android', insetTop: 32 });
  const shape = (presentation) => shapeFor(presentation, { anchor, screenWidth: 390 });

  it('grows from rest to compact to expanded, never wider than the screen', () => {
    expect(shape('compact').width).toBeGreaterThan(shape('rest').width);
    expect(shape('expanded').width).toBeLessThanOrEqual(390 - 16);
    expect(shape('expanded').height).toBeGreaterThan(shape('compact').height);
  });

  it('keeps every corner fully rounded or concentric with the screen', () => {
    ['rest', 'compact', 'multi'].forEach((name) => {
      const { height, radius } = shape(name);
      expect(radius).toBe(height / 2);
    });
    expect(shape('expanded').radius).toBeGreaterThanOrEqual(28);
  });

  it('opens the glance card a little shorter than a message card', () => {
    expect(shape('glance').height).toBeLessThan(shape('expanded').height);
    expect(shape('glance').width).toBe(shape('expanded').width);
  });

  it('turns into a near square to confirm', () => {
    const { width, height } = shape('confirm');
    expect(Math.abs(width - height)).toBeLessThanOrEqual(12);
  });

  it('leaves room for two circles in the multi shape', () => {
    const multi = shape('multi');
    const circles = circleLayout(multi, 2);
    const right = circles.at(-1).x + circles.at(-1).size;
    expect(right).toBeLessThanOrEqual(390);
    expect(circles[0].x).toBeGreaterThan(multi.width / 2);
  });
});
