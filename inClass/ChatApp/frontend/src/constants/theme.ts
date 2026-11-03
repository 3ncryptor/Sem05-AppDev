/**
 * Design Tokens & Theme System for ChatApp (v2 — Warm Editorial Beige)
 * Minimalist, quiet-luxury aesthetic with warm linen surfaces, espresso ink typography,
 * muted bronze/terracotta accents, and subtle hairline borders.
 */

export const COLORS = {
  // Backgrounds & Surfaces
  bgPrimary: '#F7F4EF',      // Warm Alabaster / Linen canvas
  bgSecondary: '#FFFFFF',    // Pure Ivory card / elevated surface
  bgTertiary: '#EFECE6',     // Soft Sand input / pill surface
  bgElevated: '#E6E1D8',     // Pressed / active subtle sand

  // Brand & Accents (Warm Espresso & Bronze)
  accent: '#2C2520',         // Deep Espresso primary button & sent bubble
  accentDark: '#1F1A17',     // Darker Espresso
  accentLight: '#8C6D53',    // Warm Bronze / Caramel secondary accent
  accentSoft: 'rgba(140, 109, 83, 0.12)',

  // Semantic Status (Muted Earth Tones)
  success: '#4A7C59',        // Muted Sage Green
  successSoft: 'rgba(74, 124, 89, 0.12)',
  warning: '#B87D4B',        // Warm Ochre / Amber
  warningSoft: 'rgba(184, 125, 75, 0.12)',
  danger: '#B84A39',         // Muted Terracotta Red
  dangerSoft: 'rgba(184, 74, 57, 0.10)',
  info: '#5B7B9A',           // Slate Blue for read receipts

  // Typography
  textPrimary: '#1C1917',    // Deep Espresso Ink
  textSecondary: '#655E57',  // Warm Taupe / Charcoal
  textMuted: '#9E968E',      // Soft Stone
  textInverse: '#FAF8F5',    // Warm Cream white on dark surfaces

  // Borders & Dividers
  border: '#E6E1D8',         // Hairline Sand divider
  borderLight: '#DCD6CB',    // Slightly stronger border for inputs

  // Deterministic User Avatar Palette (Curated Muted Editorial Tones)
  userPalette: [
    '#8C584C', // 0: Terracotta Clay
    '#4F6D5A', // 1: Forest Sage
    '#9A7B4F', // 2: Warm Ochre
    '#4A6B82', // 3: Nordic Slate
    '#7D5A68', // 4: Dusty Plum
    '#4D726D', // 5: Muted Teal
    '#A3634B', // 6: Burnt Sienna
    '#687852', // 7: Olive Moss
    '#6B5B7B', // 8: Muted Mauve
    '#526E69', // 9: Pine Mist
    '#8F5B62', // 10: Rosewood
    '#57687C', // 11: Steel Dusk
  ],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#2C2520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};
