/**
 * tokens.ts
 *
 * Centralized Design System Tokens for Muzakkir.
 * Defines immutable tokens for Color, Typography, Spacing, Radii, Shadows,
 * Elevation, Touch Targets, and Content Width constraints.
 */

export const colors = {
  // Backgrounds & Paper Surfaces
  canvas: '#FAF7F2',            // Warm Ivory Canvas
  background: '#FAF7F2',        // Canonical background alias
  surface: '#FFFFFF',           // Pure white card surface
  surfaceElevated: '#FFFDF9',   // Elevated parchment card
  surfaceSubtle: '#F6F0E7',     // Recessed parchment container
  parchment: '#F4EFE6',         // Subtle aged paper
  parchmentDark: '#E9E2D5',     // Recessed parchment container
  parchmentBorder: '#E5DECE',   // Tactile paper border

  // Islamic Signature Forest Green
  primary: '#14382A',           // Deep Forest Green
  primaryDark: '#0D261C',       // Obsidian Green (Sanctuary / Hero)
  primaryLight: '#23533E',      // Radiant Emerald Tone
  primarySurface: '#EBF3EE',    // Soft Sage highlight background

  // Royal Gold & Metallic Accents
  gold: '#C5A059',              // Burnished Royal Gold
  goldLight: '#DFC286',         // Soft Gold Highlight
  goldDark: '#9E7B36',          // Embossed Gold Shadow
  goldSurface: '#FDF9F0',       // Gold-tinted card background
  goldBorder: '#D9C292',        // Gold rim line

  // Typography / Ink
  textPrimary: '#1C1917',       // Rich Charcoal Ink
  textSecondary: '#57534E',     // Warm Slate Subtitle
  textMuted: '#736B5E',         // Subtle stone caption (meets >= 4.5:1 on ivory canvas)
  textInverse: '#FAF7F2',       // White-Ivory text on dark cards
  textGold: '#9E7B36',          // Gold accented label text

  // Ink Aliases
  inkPrimary: '#1C1917',
  inkSecondary: '#57534E',
  inkMuted: '#736B5E',
  inkInverse: '#FAF7F2',

  // Verification & Authenticity Badges
  gradeSahih: '#0E845A',
  gradeSahihBg: '#EBF4F0',
  gradeSahihBorder: '#A7F3D0',
  gradeHasan: '#B45309',
  gradeHasanBg: '#FEF3C7',
  gradeHasanBorder: '#FDE68A',
  gradeDaif: '#DC2626',
  gradeDaifBg: '#FEF2F2',
  gradeDaifBorder: '#FECACA',
  gradeMawdu: '#7F1D1D',
  gradeMawduBg: '#FEE2E2',
  gradeMawduBorder: '#FCA5A5',
  gradeOther: '#4B5563',
  gradeOtherBg: '#F3F4F6',
  gradeOtherBorder: '#E5E7EB',

  // Legacy Badge Aliases
  badgeSahih: '#0E845A',
  badgeSahihBg: '#EBF4F0',
  badgeHasan: '#B45309',
  badgeHasanBg: '#FEF3C7',
  badgeUnavailable: '#DC2626',
  badgeUnavailableBg: '#FEF2F2',

  // Semantic Card & Badge Aliases
  card: '#FFFFFF',
  secondary: '#9E7B36',
  badgeQuranBg: '#EBF3EE',
  badgeQuranBorder: '#C2DEC9',
  badgeHadithBg: '#FDF9F0',
  badgeHadithBorder: '#D9C292',

  // Borders & Dividers
  borderLight: '#EAE5DC',
  borderSubtle: '#E5DECE',
  borderDark: 'rgba(28, 25, 23, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.50)',
  activePress: 'rgba(20, 56, 42, 0.06)',
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const touchTarget = {
  min: 44,
  iconButton: 44,
  smallButton: 44,
};

export const contentConstraints = {
  maxReadingWidth: 680,   // Optimal reading line length on tablets
  maxModalWidth: 480,     // Centered dialog cards on tablets
  maxFloatingCardWidth: 520, // Responsive floating reminder cap
};
