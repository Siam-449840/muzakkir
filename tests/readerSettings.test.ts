import { toBengaliNumerals } from '../src/utils/bengaliNumerals';
import {
  DEFAULT_QURAN_SETTINGS,
  DEFAULT_HADITH_SETTINGS,
  loadReaderSettings,
  saveReaderSettings,
} from '../src/utils/readerSettings';
import { getChapterSections } from '../src/database/hadithRepository';

describe('Reader Settings & Bengali Numerals Unit Tests', () => {
  test('toBengaliNumerals formats English digits into authentic Bengali digits', () => {
    expect(toBengaliNumerals(0)).toBe('০');
    expect(toBengaliNumerals(123456789)).toBe('১২৩৪৫৬৭৮৯');
    expect(toBengaliNumerals('7563')).toBe('৭৫৬৩');
    expect(toBengaliNumerals('১ - ৭')).toBe('১ - ৭');
    expect(toBengaliNumerals('1 - 7')).toBe('১ - ৭');
  });

  test('Reader settings have clean, independent defaults for Quran and Hadith', () => {
    expect(DEFAULT_QURAN_SETTINGS.showArabic).toBe(true);
    expect(DEFAULT_QURAN_SETTINGS.showDiacritics).toBe(true);
    expect(DEFAULT_QURAN_SETTINGS.arabicFontSize).toBe(24);
    expect(DEFAULT_QURAN_SETTINGS.readingMode).toBe('list');

    expect(DEFAULT_HADITH_SETTINGS.showArabic).toBe(true);
    expect(DEFAULT_HADITH_SETTINGS.arabicFontSize).toBe(20);
    expect(DEFAULT_HADITH_SETTINGS.readingMode).toBe('list');
  });

  test('loadReaderSettings and saveReaderSettings persist preferences cleanly', async () => {
    const custom = { ...DEFAULT_HADITH_SETTINGS, arabicFontSize: 28, readingMode: 'slide' as const };
    await saveReaderSettings('hadith', custom);
    const loaded = await loadReaderSettings('hadith');

    expect(loaded.arabicFontSize).toBe(28);
    expect(loaded.readingMode).toBe('slide');
  });

  test('getChapterSections returns 6 sections for Bukhari Chapter 1 matching screenshot 3', async () => {
    const sections = await getChapterSections('bukhari', 1);
    expect(sections).toHaveLength(6);
    expect(sections[0].id).toBe(1);
    expect(sections[0].title).toContain('ওহী শুরু হয়েছিল');
    expect(sections[0].display_label).toBe('১/১. অধ্যায়ঃ');
  });
});
