import {
  AVATAR_STYLES,
  avatarCacheSize,
  avatarSvg,
  avatarTint,
  clearAvatarCache,
  DEFAULT_AVATAR_STYLE,
} from './avatarSvg';

beforeEach(() => clearAvatarCache());

describe('avatarSvg', () => {
  it('returns an SVG document', () => {
    expect(avatarSvg('aarav')).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });

  it('gives the same face for the same name and style', () => {
    expect(avatarSvg('diya', 'notionists')).toBe(avatarSvg('diya', 'notionists'));
  });

  it('gives different faces for different names', () => {
    expect(avatarSvg('kabir')).not.toBe(avatarSvg('meera'));
  });

  it('gives different art for different styles', () => {
    expect(avatarSvg('rohan', 'lorelei')).not.toBe(avatarSvg('rohan', 'open-peeps'));
  });

  it('caches one entry per (style, name)', () => {
    avatarSvg('aarav');
    avatarSvg('aarav');
    avatarSvg('aarav', 'notionists');
    expect(avatarCacheSize()).toBe(2);
  });

  it('falls back to the default style for an unknown style', () => {
    expect(avatarSvg('aarav', 'nope')).toBe(avatarSvg('aarav', DEFAULT_AVATAR_STYLE));
  });

  it('still draws a face for an empty or missing name', () => {
    expect(avatarSvg('')).toMatch(/^<svg/);
    expect(avatarSvg(undefined)).toMatch(/^<svg/);
  });

  it('lists exactly the three supported styles', () => {
    expect(AVATAR_STYLES.map((style) => style.id)).toEqual(['lorelei', 'notionists', 'open-peeps']);
  });
});

describe('avatarTint', () => {
  it('is stable per name and is a hex colour', () => {
    expect(avatarTint('aarav')).toBe(avatarTint('aarav'));
    expect(avatarTint('aarav')).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
