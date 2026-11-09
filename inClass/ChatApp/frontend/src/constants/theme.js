/**
 * Design tokens for the "soft slab" look (see design.md).
 * Colours are sampled from the reference mockup; the dark theme swaps the
 * light surface and dark slab materials while keeping the same accent.
 */

/** Light theme: pale sage surfaces with near-black slabs. */
const light = {
  surface: '#E3E9E7',
  surfaceRaised: '#ECF0EF',
  card: '#F7FBFC',
  slab: '#222021',
  slabRaised: '#3A3839',
  ink: '#1F1F1F',
  onInk: '#FFFFFF',
  textPrimary: '#0A0D0C',
  textSecondary: '#5A605E',
  textTertiary: '#9AA19F',
  textOnSlab: '#FFFFFF',
  textOnSlabMuted: '#959394',
  ringOnSlab: 'rgba(255,255,255,0.10)',
  ringOnSurface: 'rgba(255,255,255,0.85)',
  success: '#58B566',
  danger: '#C2564B',
  shadow: '#1F1F1F',
  scrim: 'rgba(10,13,12,0.40)',
};

/** Dark theme: headers go darker than the surface; outgoing bubbles turn light. */
const dark = {
  surface: '#141414',
  surfaceRaised: '#1E1E1F',
  card: '#262627',
  slab: '#0B0B0B',
  slabRaised: '#2C2B2C',
  ink: '#F2F4F3',
  onInk: '#0A0D0C',
  textPrimary: '#F3F5F4',
  textSecondary: '#A3A8A6',
  textTertiary: '#6E7472',
  textOnSlab: '#FFFFFF',
  textOnSlabMuted: '#8C8A8B',
  ringOnSlab: 'rgba(255,255,255,0.08)',
  ringOnSurface: 'rgba(255,255,255,0.06)',
  success: '#5FC46F',
  danger: '#E07A6F',
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.55)',
};

export const themes = { light, dark };

/** The single accent: apricot -> rose -> orchid. Used on 1-2 elements per screen. */
export const gradient = {
  colors: ['#E6A065', '#DB9796', '#D092BB'],
  locations: [0, 0.55, 1],
  start: { x: 0, y: 0.4 },
  end: { x: 1, y: 0.6 },
  fallback: '#E09E7A',
};

export const radius = { sheet: 44, slab: 36, card: 32, bubble: 24, tail: 8, image: 18, pill: 999 };

/** 4 pt spacing scale: space.md = 16 (screen padding). */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

/** Type scale from design.md section 4 (size / lineHeight / weight). */
export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  title: { fontFamily: fonts.medium, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14 },
  chip: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16 },
};

/** Soft shadows (design.md 5.3). Level 0 = flat surface. */
export function shadow(level, color) {
  const levels = {
    1: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.06, elevation: 1 },
    2: { shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, shadowOpacity: 0.1, elevation: 4 },
    3: { shadowOffset: { width: 0, height: 16 }, shadowRadius: 40, shadowOpacity: 0.25, elevation: 12 },
  };
  return levels[level] ? { shadowColor: color, ...levels[level] } : {};
}
