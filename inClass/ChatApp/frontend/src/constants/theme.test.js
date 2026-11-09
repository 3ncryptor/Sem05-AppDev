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
