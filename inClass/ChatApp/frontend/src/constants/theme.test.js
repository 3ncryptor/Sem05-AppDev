/**
 * Theme tokens: both appearances must define the same colours, and every
 * value must be a colour React Native understands.
 */
import { gradient, shadow, themes } from './theme';

const COLOUR = /^(#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\))$/i;

describe('theme tokens', () => {
  it('defines the same colour names in light and dark', () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });

  it.each(['light', 'dark'])('uses valid colour values in %s', (scheme) => {
    Object.values(themes[scheme]).forEach((value) => expect(value).toMatch(COLOUR));
  });

  it('has a three-stop accent gradient with matching locations', () => {
    expect(gradient.colors).toHaveLength(3);
    expect(gradient.locations).toEqual([0, 0.55, 1]);
  });
});

describe('shadow', () => {
  it('returns nothing for a flat surface', () => {
    expect(shadow(0, '#000000')).toEqual({});
  });

  it('gets stronger with each level', () => {
    const opacities = [1, 2, 3].map((level) => shadow(level, '#000000').shadowOpacity);
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b));
  });
});

describe('contrast (WCAG)', () => {
  const { contrastRatio } = jest.requireActual('../utils/contrast');
  const SURFACES = ['surface', 'surfaceRaised', 'card'];
  const SLABS = ['slab', 'slabRaised'];
  const RULES = [
    { text: 'textPrimary', on: SURFACES, min: 4.5 },
    { text: 'textSecondary', on: SURFACES, min: 4.5 },
    { text: 'danger', on: SURFACES, min: 4.5 },
    { text: 'textTertiary', on: SURFACES, min: 3.5 },
    { text: 'textOnSlab', on: SLABS, min: 4.5 },
    { text: 'textOnSlabMuted', on: SLABS, min: 4.5 },
    { text: 'dangerOnSlab', on: SLABS, min: 4.5 },
  ];

  it('lifts the dark notch off the surface (at least 1.3:1) and off the black island', () => {
    const { slab, surface } = themes.dark;
    expect(contrastRatio(slab, surface)).toBeGreaterThanOrEqual(1.3);
    expect(contrastRatio(slab, '#000000')).toBeGreaterThanOrEqual(1.4);
  });

  it('knows the extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it.each(['light', 'dark'])('keeps text readable in %s', (scheme) => {
    const colors = themes[scheme];
    RULES.forEach(({ text, on, min }) =>
      on.forEach((background) => {
        const ratio = contrastRatio(colors[text], colors[background]);
        if (ratio < min) throw new Error(`${scheme} ${text} on ${background}: ${ratio.toFixed(2)}`);
      }),
    );
  });
});
