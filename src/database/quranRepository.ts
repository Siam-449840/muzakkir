import { getQuranDailyPool, getQuranSurahChunk, staticData, QuranDailyItem, QuranFullVerse } from './db';
import { QuranVerse, SupportedQuranLanguage } from '../types';

export interface SurahMeta {
  number: number;
  name: string;
  name_ar: string;
  name_translation: string;
  total_ayahs: number;
  start_juz: number;
  revelation_type: string;
}

/**
 * Returns the full list of surahs from bundled metadata (always offline, always fast).
 */
export async function getSurahsList(): Promise<SurahMeta[]> {
  return staticData.surahs as SurahMeta[];
}

/**
 * Returns a single Quran verse by its ID.
 *
 * Lookup order:
 *   1. Daily pool (quran_daily_pool.json) — fast, already loaded for daily reminders.
 *   2. Surah chunk (quran_full/surah_NNN.json) — loaded on demand for Quran reader.
 *
 * All data is fully offline. No network request.
 */
export async function getQuranVerseById(
  verseId: string,
  language: SupportedQuranLanguage = 'en',
): Promise<QuranVerse | null> {
  // Fast path: check daily pool first (reminder detail screen)
  try {
    const daily = getQuranDailyPool();
    const item = daily.items.find((v: QuranDailyItem) => v.content_id === verseId);
    if (item) return quranDailyItemToQuranVerse(item, language);
  } catch (e) {
    console.warn('getQuranVerseById: daily pool error:', e);
  }

  // Surah chunk: parse surah number from content_id 'quran_NNN_MMM'
  try {
    const parts = verseId.split('_');
    if (parts.length >= 2) {
      const surahNum = parseInt(parts[1], 10);
      if (surahNum >= 1 && surahNum <= 114) {
        const chunk = getQuranSurahChunk(surahNum);
        const verse = chunk.verses.find(v => v.content_id === verseId);
        if (verse) return quranFullVerseToQuranVerse(verse, language);
      }
    }
  } catch (e) {
    console.warn('getQuranVerseById: surah chunk error:', e);
  }

  return null;
}

/**
 * Returns all verses for a given surah number.
 *
 * Source: quran_full/surah_NNN.json — all 6,236 verses × 10 languages, offline.
 * Loaded on-demand when the user opens the surah in the Quran reader.
 */
export async function getSurahVerses(
  surahNumber: number,
  language: SupportedQuranLanguage = 'en',
): Promise<QuranVerse[]> {
  const chunk = getQuranSurahChunk(surahNumber);
  return chunk.verses.map(v => quranFullVerseToQuranVerse(v, language));
}

// ── Shape converters ───────────────────────────────────────────────────────────

function quranFullVerseToQuranVerse(
  verse: QuranFullVerse,
  language: SupportedQuranLanguage,
): QuranVerse {
  const ref = verse.reference;
  return {
    id:   verse.content_id,
    type: 'quran',
    reference: {
      surah_number:           ref.surah_number as number,
      surah_name:             ref.surah_name as string,
      surah_name_ar:          (ref.surah_name_ar as string) || '',
      surah_name_translation: (ref.surah_name_translation as string) || '',
      ayah_number:            ref.ayah_number as number,
      juz:                    ref.juz as number | undefined,
      revelation_type:        ref.revelation_type as string | undefined,
    },
    arabic_word_count: verse.arabic_word_count,
    is_short_form:     (verse.arabic_word_count ?? 99) <= 10,
    translations: {
      ar: {
        text:       verse.translations['ar']?.text ?? '',
        translator: verse.translations['ar']?.translator,
      },
      [language]: {
        text:       verse.translations[language]?.text ?? verse.translations['en']?.text ?? '',
        translator: verse.translations[language]?.translator,
      },
    },
  };
}

function quranDailyItemToQuranVerse(
  item: QuranDailyItem,
  language: SupportedQuranLanguage,
): QuranVerse {
  const ref = item.reference;
  return {
    id:   item.content_id,
    type: 'quran',
    reference: {
      surah_number:           ref.surah_number as number,
      surah_name:             ref.surah_name as string,
      surah_name_ar:          '',
      surah_name_translation: (ref.surah_name_translation as string) || '',
      ayah_number:            ref.ayah_number as number,
      juz:                    ref.juz as number | undefined,
      revelation_type:        ref.revelation_type as string | undefined,
    },
    arabic_word_count: item.arabic_word_count,
    is_short_form:     (item.arabic_word_count ?? 99) <= 10,
    translations: {
      ar: {
        text:       item.translations['ar']?.text ?? '',
        translator: item.translations['ar']?.translator,
      },
      [language]: {
        text:       item.translations[language]?.text ?? item.translations['en']?.text ?? '',
        translator: item.translations[language]?.translator,
      },
    },
  };
}
