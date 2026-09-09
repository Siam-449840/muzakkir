import { getQuranDailyPool, getHadithDailyPool } from './db';
import { ContentType } from '../types';

export interface SearchResultItem {
  id: string;
  type: ContentType;
  title: string;
  reference_text: string;
  excerpt: string;
  arabic_text: string;
  highlight?: string;
  topic?: string;
}

import { cleanArabicNorm } from '../utils/arabicNorm';

/**
 * Removes Arabic Tashkeel/Harakat diacritics, Tatweel, and normalizes Alif & Dagger Alif
 * for flexible, accurate Quran and Hadith Arabic search.
 */
export function removeArabicDiacritics(text: string): string {
  return cleanArabicNorm(text);
}

/**
 * Parses exact Quran reference syntax like "2:255", "Surah 1:1", or "112:4".
 */
export function parseQuranReferenceQuery(query: string): { surah: number; ayah: number } | null {
  const match = query.match(/(?:surah\s*)?(\d{1,3})\s*[:\-\,\.\s]\s*(\d{1,3})/i);
  if (match) {
    const surah = parseInt(match[1], 10);
    const ayah = parseInt(match[2], 10);
    if (surah >= 1 && surah <= 114 && ayah >= 1) {
      return { surah, ayah };
    }
  }
  return null;
}

/**
 * Parses exact Hadith reference syntax like "Bukhari 13" or "Muslim 45".
 */
export function parseHadithReferenceQuery(query: string): { collection: string; number: number } | null {
  const match = query.match(/(bukhari|muslim|abudawud|tirmidhi|nasai|ibnmajah|malik|riyad)\s*#?\s*(\d{1,5})/i);
  if (match) {
    return {
      collection: match[1].toLowerCase(),
      number: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Full-text content search across the offline Quran and Hadith daily pools.
 *
 * Scope:
 *   Quran  — quran_daily_pool.json (523 Research-Derived Candidate Units)
 *   Hadith — hadith_daily_pool.json (2,402 Pristine Sahih Narrations)
 *
 * Both pools are fully offline. No network request. No SQLite dependency.
 *
 * Supported query types:
 *   - Surah:Ayah reference   ("2:255", "Surah 2:255")
 *   - Surah number           ("2")
 *   - Surah name             ("Al-Baqarah")
 *   - Translation keyword    (searched in user's preferred language and en)
 *   - Arabic text            (with diacritic normalization)
 *   - HadeethEnc numeric ID  ("131")
 *   - Collection name        ("Bukhari")
 *
 * Results are capped at 25 Quran + 25 Hadith items.
 */
export async function searchContent(
  query: string,
  language: string = 'en',
  filterType?: ContentType,
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const results: SearchResultItem[] = [];
  const normalizedArabicQuery = removeArabicDiacritics(query);
  const quranRef  = parseQuranReferenceQuery(cleanQuery);
  const hadithRef = parseHadithReferenceQuery(cleanQuery);

  // ── Quran search ───────────────────────────────────────────────────────────
  if (!filterType || filterType === 'quran') {
    try {
      const qPool = getQuranDailyPool();
      for (const item of qPool.items) {
        const ref    = item.reference as Record<string, unknown>;
        const arText = item.translations['ar']?.text || '';
        const normAr = removeArabicDiacritics(arText);
        const trans  = item.translations[language]?.text || item.translations['en']?.text || '';
        const sName  = (ref.surah_name as string) || '';

        const matchRef = quranRef
          ? ref.surah_number === quranRef.surah && ref.ayah_number === quranRef.ayah
          : false;

        if (
          matchRef ||
          sName.toLowerCase().includes(cleanQuery) ||
          trans.toLowerCase().includes(cleanQuery) ||
          normAr.includes(normalizedArabicQuery) ||
          String(ref.surah_number) === cleanQuery
        ) {
          if (!results.some(e => e.id === item.content_id)) {
            results.push({
              id:             item.content_id,
              type:           'quran',
              title:          `Surah ${sName}`,
              reference_text: `Surah ${ref.surah_number}:${ref.ayah_number}`,
              excerpt:        trans,
              arabic_text:    arText,
            });
          }
        }
        if (results.filter(r => r.type === 'quran').length >= 25) break;
      }
    } catch (e) {
      console.warn('searchContent: quran daily pool load error:', e);
    }
  }

  // ── Hadith search ──────────────────────────────────────────────────────────
  if (!filterType || filterType === 'hadith') {
    try {
      const hPool = getHadithDailyPool();
      for (const rec of hPool.hadiths) {
        const arText = rec.translations['ar']?.text || '';
        const normAr = removeArabicDiacritics(arText);
        const trans  = rec.translations[language]?.text || rec.translations['en']?.text || '';
        const attr   = rec.attribution || '';
        const attrEn = rec.attribution_en || '';
        const collKey = rec.collection_key || '';
        const hadithNum = rec.hadith_number || rec.hadeethenc_id;
        const hadithNumStr = hadithNum ? String(hadithNum) : '';

        const matchRef = hadithRef
          ? ((attr.toLowerCase().includes(hadithRef.collection) ||
              attrEn.toLowerCase().includes(hadithRef.collection) ||
              collKey.toLowerCase().includes(hadithRef.collection)) &&
             hadithNum === hadithRef.number)
          : false;

        const titleText = (language === 'bn' ? attr : (attrEn || attr)) || 'Hadith';

        if (
          matchRef ||
          attr.toLowerCase().includes(cleanQuery) ||
          attrEn.toLowerCase().includes(cleanQuery) ||
          collKey.toLowerCase().includes(cleanQuery) ||
          (rec.narrator && rec.narrator.toLowerCase().includes(cleanQuery)) ||
          trans.toLowerCase().includes(cleanQuery) ||
          normAr.includes(normalizedArabicQuery) ||
          (hadithNumStr !== '' && hadithNumStr === cleanQuery)
        ) {
          if (!results.some(e => e.id === rec.content_id)) {
            results.push({
              id:             rec.content_id,
              type:           'hadith',
              title:          titleText,
              reference_text: titleText,
              excerpt:        trans,
              arabic_text:    arText,
            });
          }
        }
        if (results.filter(r => r.type === 'hadith').length >= 25) break;
      }
    } catch (e) {
      console.warn('searchContent: hadith daily pool load error:', e);
    }
  }

  return results;
}
