import { TextStyle, Platform } from 'react-native';

export const typography = {
  // Arabic Quran typography (Amiri / Serif, high legibility, generous line spacing)
  arabicQuran: {
    fontFamily: Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
    fontSize: 26,
    lineHeight: 48,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
    letterSpacing: 0,
  } as TextStyle,

  // Arabic Hadith Matn typography
  arabicHadith: {
    fontFamily: Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
    fontSize: 22,
    lineHeight: 42,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
    letterSpacing: 0,
  } as TextStyle,

  // Arabic Heading
  arabicHeading: {
    fontFamily: Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'center' as const,
    writingDirection: 'rtl' as const,
    fontWeight: '700' as const,
  } as TextStyle,

  // Legacy alias
  arabicText: {
    fontFamily: Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
    letterSpacing: 0,
  } as TextStyle,

  // Editorial & Hero Titles
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
    letterSpacing: -0.3,
  } as TextStyle,

  sectionHeading: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,

  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 22,
  } as TextStyle,

  // Reading Body (Bengali primary translation, optimized for reading endurance)
  readingBody: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 27, // 1.7x line height for effortless reading
    letterSpacing: 0.1,
  } as TextStyle,

  // Legacy body aliases
  bodyText: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  } as TextStyle,

  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  } as TextStyle,

  // Narrator (রাবী) Callout
  narratorCallout: {
    fontSize: 13.5,
    fontWeight: '600' as const,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  } as TextStyle,

  // Scholarly Footnote
  footnoteText: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: 0.1,
  } as TextStyle,

  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  } as TextStyle,

  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  } as TextStyle,
};
