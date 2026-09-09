import { getHadithDailyPool, staticData } from './db';
import { HadithRecord, HadithTranslation } from '../types';

/**
 * Languages with verified Hadith translations from authenticated upstream sources.
 */
export const VERIFIED_HADITH_LANGUAGES: Record<string, string> = {
  ar: 'Arabic (original matn)',
  en: 'English (master corpus)',
  bn: 'Bengali (master corpus)',
  ur: 'Urdu (master corpus)',
  fr: 'French (master corpus)',
  es: 'Spanish (HadeethEnc.com)',
  hi: 'Hindi (HadeethEnc.com)',
  zh: 'Mandarin Chinese (HadeethEnc.com)',
  pt: 'Portuguese (HadeethEnc.com)',
  ru: 'Russian (HadeethEnc.com)',
};

export function isHadithLanguageVerified(langCode: string): boolean {
  return langCode in VERIFIED_HADITH_LANGUAGES;
}

export interface CollectionMeta {
  key: string;
  raw_key?: string;
  id: number;
  name: string;
  name_bn: string;
  name_en: string;
  name_ar?: string;
  abvr_code?: string;
  total_records: number;
  chapters_count: number;
  sections_count: number;
  color_code: string;
  authenticity_summary: string;
  writer?: {
    name_bn?: string;
    des_bn?: string;
    name_en?: string;
    des_en?: string;
  };
}

export interface SectionMeta {
  id: number | string;
  chapter_id: number | string;
  display_label: string;
  title: string;
  arabic_title: string;
  preface?: string;
  order: number;
  hadith_count: number;
}

export interface ChapterMeta {
  id: number | string;
  display_label: string;
  title: string;
  arabic_title: string;
  preface?: string;
  range: string;
  order: number;
  hadith_count: number;
  sections_count: number;
  sections?: SectionMeta[];
}

const HADITH_HIERARCHY_LOADERS: Record<string, () => any> = {
  bukhari: () => require('../../assets/data/hadith_hierarchy/bukhari.json'),
  muslim: () => require('../../assets/data/hadith_hierarchy/muslim.json'),
  nasai: () => require('../../assets/data/hadith_hierarchy/nasai.json'),
  abudawud: () => require('../../assets/data/hadith_hierarchy/abudawud.json'),
  'abu-dawud': () => require('../../assets/data/hadith_hierarchy/abudawud.json'),
  tirmidhi: () => require('../../assets/data/hadith_hierarchy/tirmidhi.json'),
  ibnmajah: () => require('../../assets/data/hadith_hierarchy/ibnmajah.json'),
  'ibn-majah': () => require('../../assets/data/hadith_hierarchy/ibnmajah.json'),
  malik: () => require('../../assets/data/hadith_hierarchy/malik.json'),
  'muwatta-malik': () => require('../../assets/data/hadith_hierarchy/malik.json'),
  riyadussalihin: () => require('../../assets/data/hadith_hierarchy/riyadussalihin.json'),
  'riyadus-salihin': () => require('../../assets/data/hadith_hierarchy/riyadussalihin.json'),
  'bulugul-maram': () => require('../../assets/data/hadith_hierarchy/bulugul-maram.json'),
  'luluwal-marjan': () => require('../../assets/data/hadith_hierarchy/luluwal-marjan.json'),
  'hadis-somvar': () => require('../../assets/data/hadith_hierarchy/hadis-somvar.json'),
  'silsila-sahiha': () => require('../../assets/data/hadith_hierarchy/silsila-sahiha.json'),
  'dhaif-hadis-sirij': () => require('../../assets/data/hadith_hierarchy/dhaif-hadis-sirij.json'),
  'mishkatul-masabih': () => require('../../assets/data/hadith_hierarchy/mishkatul-masabih.json'),
  '40-hadith': () => require('../../assets/data/hadith_hierarchy/40-hadith.json'),
  'adabul-mufrad': () => require('../../assets/data/hadith_hierarchy/adabul-mufrad.json'),
  'jujul-rafayel-yadain': () => require('../../assets/data/hadith_hierarchy/jujul-rafayel-yadain.json'),
  'sahih-hadise-qudsi': () => require('../../assets/data/hadith_hierarchy/sahih-hadise-qudsi.json'),
  '100-hadith': () => require('../../assets/data/hadith_hierarchy/100-hadith.json'),
  'miskate-dhaif-hadis': () => require('../../assets/data/hadith_hierarchy/miskate-dhaif-hadis.json'),
  'shamayele-tirmidhi': () => require('../../assets/data/hadith_hierarchy/shamayele-tirmidhi.json'),
  'targib-wattahrib': () => require('../../assets/data/hadith_hierarchy/targib-wattahrib.json'),
  'fazayele-amal': () => require('../../assets/data/hadith_hierarchy/fazayele-amal.json'),
  upodesh: () => require('../../assets/data/hadith_hierarchy/upodesh.json'),
  'ramadaner-durbol-hadis': () => require('../../assets/data/hadith_hierarchy/ramadaner-durbol-hadis.json'),
};

const HADITH_BOOK_LOADERS: Record<string, () => any> = {
  bukhari: () => require('../../assets/data/hadith_books/bukhari.json'),
  muslim: () => require('../../assets/data/hadith_books/muslim.json'),
  nasai: () => require('../../assets/data/hadith_books/nasai.json'),
  abudawud: () => require('../../assets/data/hadith_books/abudawud.json'),
  'abu-dawud': () => require('../../assets/data/hadith_books/abudawud.json'),
  tirmidhi: () => require('../../assets/data/hadith_books/tirmidhi.json'),
  ibnmajah: () => require('../../assets/data/hadith_books/ibnmajah.json'),
  'ibn-majah': () => require('../../assets/data/hadith_books/ibnmajah.json'),
  malik: () => require('../../assets/data/hadith_books/malik.json'),
  'muwatta-malik': () => require('../../assets/data/hadith_books/malik.json'),
  riyadussalihin: () => require('../../assets/data/hadith_books/riyadussalihin.json'),
  'riyadus-salihin': () => require('../../assets/data/hadith_books/riyadussalihin.json'),
  'bulugul-maram': () => require('../../assets/data/hadith_books/bulugul-maram.json'),
  'luluwal-marjan': () => require('../../assets/data/hadith_books/luluwal-marjan.json'),
  'hadis-somvar': () => require('../../assets/data/hadith_books/hadis-somvar.json'),
  'silsila-sahiha': () => require('../../assets/data/hadith_books/silsila-sahiha.json'),
  'dhaif-hadis-sirij': () => require('../../assets/data/hadith_books/dhaif-hadis-sirij.json'),
  'mishkatul-masabih': () => require('../../assets/data/hadith_books/mishkatul-masabih.json'),
  '40-hadith': () => require('../../assets/data/hadith_books/40-hadith.json'),
  'adabul-mufrad': () => require('../../assets/data/hadith_books/adabul-mufrad.json'),
  'jujul-rafayel-yadain': () => require('../../assets/data/hadith_books/jujul-rafayel-yadain.json'),
  'sahih-hadise-qudsi': () => require('../../assets/data/hadith_books/sahih-hadise-qudsi.json'),
  '100-hadith': () => require('../../assets/data/hadith_books/100-hadith.json'),
  'miskate-dhaif-hadis': () => require('../../assets/data/hadith_books/miskate-dhaif-hadis.json'),
  'shamayele-tirmidhi': () => require('../../assets/data/hadith_books/shamayele-tirmidhi.json'),
  'targib-wattahrib': () => require('../../assets/data/hadith_books/targib-wattahrib.json'),
  'fazayele-amal': () => require('../../assets/data/hadith_books/fazayele-amal.json'),
  upodesh: () => require('../../assets/data/hadith_books/upodesh.json'),
  'ramadaner-durbol-hadis': () => require('../../assets/data/hadith_books/ramadaner-durbol-hadis.json'),
};

/**
 * Dispatches to modular hierarchy metadata JSON for ultra-fast chapter browsing.
 */
function requireHadithHierarchy(key: string): any {
  const loader = HADITH_HIERARCHY_LOADERS[key.toLowerCase().trim()];
  return loader ? loader() : null;
}

/**
 * Dispatches to modular book JSON for fast, offline collection browsing.
 */
function requireHadithBook(key: string): any {
  const loader = HADITH_BOOK_LOADERS[key.toLowerCase().trim()];
  return loader ? loader() : null;
}

/**
 * Returns Hadith collection metadata covering all 25 canonical books from the authoritative iHadis dataset.
 */
export async function getHadithCollections(): Promise<CollectionMeta[]> {
  try {
    if (staticData.collections && Array.isArray(staticData.collections)) {
      return staticData.collections as CollectionMeta[];
    }
  } catch (e) {
    console.warn('getHadithCollections error:', e);
  }
  return [];
}

/**
 * Returns all chapters (with section counts and hadith ranges) for a given collection.
 * Uses the lightweight hierarchy tree so the chapter list loads in 0ms.
 */
export async function getCollectionChapters(collectionKey: string): Promise<ChapterMeta[]> {
  try {
    const hier = requireHadithHierarchy(collectionKey);
    if (hier?.chapters && Array.isArray(hier.chapters)) {
      return hier.chapters as ChapterMeta[];
    }
    const book = requireHadithBook(collectionKey);
    if (book?.chapters && Array.isArray(book.chapters)) {
      return book.chapters as ChapterMeta[];
    }
  } catch (e) {
    console.warn(`getCollectionChapters('${collectionKey}') error:`, e);
  }
  return [];
}

/**
 * Returns all sections (Babs) for a specific chapter in 0ms using the hierarchy index.
 */
export async function getChapterSections(
  collectionKey: string,
  chapterId: number | string
): Promise<SectionMeta[]> {
  try {
    const hier = requireHadithHierarchy(collectionKey);
    if (hier?.chapters && Array.isArray(hier.chapters)) {
      const ch = hier.chapters.find((c: any) => String(c.id) === String(chapterId));
      if (ch?.sections && Array.isArray(ch.sections)) {
        return ch.sections as SectionMeta[];
      }
    }
    const book = requireHadithBook(collectionKey);
    if (book?.chapters && Array.isArray(book.chapters)) {
      const ch = book.chapters.find((c: any) => String(c.id) === String(chapterId));
      if (ch?.sections && Array.isArray(ch.sections)) {
        return ch.sections as SectionMeta[];
      }
    }
  } catch (e) {
    console.warn(`getChapterSections('${collectionKey}', ${chapterId}) error:`, e);
  }
  return [];
}

// ── Bounded LRU cache for parsed chapter hadiths ──────────────────────────────
// Prevents repeatedly filtering and instantiating large book hadith lists while
// strictly bounding JS heap footprint to at most 10 active chapters.
const MAX_CHAPTER_CACHE_ENTRIES = 6;
const _chapterHadithsCache = new Map<string, { chapter: ChapterMeta | null; hadiths: HadithRecord[] }>();

export function clearChapterHadithsCache(): void {
  _chapterHadithsCache.clear();
}

export function getChapterCacheSize(): number {
  return _chapterHadithsCache.size;
}

/**
 * Returns a specific chapter and all its child hadiths (grouped with full section metadata).
 * Uses bounded LRU caching to eliminate redundant filtering and object allocation.
 */
export async function getChapterHadiths(
  collectionKey: string,
  chapterId: number | string
): Promise<{
  chapter: ChapterMeta | null;
  hadiths: HadithRecord[];
}> {
  const normKey = collectionKey.toLowerCase().trim();
  const cacheKey = `${normKey}:${String(chapterId)}`;

  if (_chapterHadithsCache.has(cacheKey)) {
    const cached = _chapterHadithsCache.get(cacheKey)!;
    // Refresh LRU order
    _chapterHadithsCache.delete(cacheKey);
    _chapterHadithsCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const book = requireHadithBook(collectionKey);
    if (!book) return { chapter: null, hadiths: [] };

    const chapters: ChapterMeta[] = book.chapters || [];
    const matchedChap = chapters.find((c: ChapterMeta) => String(c.id) === String(chapterId)) || null;

    const allBookHadiths = book.hadiths || [];
    const filtered = allBookHadiths.filter((h: any) => String(h.chapter_id) === String(chapterId));

    const hadiths: HadithRecord[] = filtered.map((item: any) => ({
      id: item.id || `hadith_${collectionKey}_${item.hadith_number}`,
      type: 'hadith',
      reference: {
        collection: book.title_bn || book.title_en || collectionKey,
        collection_key: collectionKey,
        hadith_number: item.hadith_number,
        chapter_id: item.chapter_id,
        chapter_title: item.chapter_title,
        chapter_arabic_title: item.chapter_arabic_title,
        section_id: item.section_id,
        section_title: item.section_title,
        section_arabic_title: item.section_arabic_title,
        display_label: item.display_label,
      },
      authenticity: {
        collection_status: item.grade_bn || item.grade_en || 'সহিহ হাদিস',
        individual_grades: [],
      },
      translations: {
        ar: { text: item.arabic || '' },
        bn: { text: item.translation || '' },
        en: { text: item.translation || '' },
      },
      narrator: item.narrator,
      note: item.note,
      grade_bn: item.grade_bn,
      grade_en: item.grade_en,
      grade_color: item.grade_color,
      clean_arabic: item.clean_arabic,
    }));

    const result = { chapter: matchedChap, hadiths };

    // Evict oldest if capacity exceeded
    if (_chapterHadithsCache.size >= MAX_CHAPTER_CACHE_ENTRIES) {
      const oldestKey = _chapterHadithsCache.keys().next().value;
      if (oldestKey !== undefined) {
        _chapterHadithsCache.delete(oldestKey);
      }
    }
    _chapterHadithsCache.set(cacheKey, result);

    return result;
  } catch (e) {
    console.warn(`getChapterHadiths('${collectionKey}', ${chapterId}) error:`, e);
    return { chapter: null, hadiths: [] };
  }
}

/**
 * Returns a single Hadith record by content_id (e.g. 'hadith_bukhari_1').
 * Preserves full collection, chapter, and section breadcrumbs.
 */
export async function getHadithById(hadithId: string): Promise<HadithRecord | null> {
  try {
    // 1. Check daily reminder pool first
    const pool = getHadithDailyPool();
    const dailyMatch = pool.hadiths.find(h => h.content_id === hadithId);
    if (dailyMatch) {
      const collKey = dailyMatch.collection_key || 'bukhari';
      const bookData = requireHadithBook(collKey);
      const rawNum = String(dailyMatch.hadith_number || dailyMatch.hadeethenc_id || '');
      const bookMatch = bookData?.hadiths?.find(
        (h: any) =>
          h.id === hadithId ||
          String(h.hadith_number) === rawNum ||
          String(h.raw_id) === rawNum
      );

      const translations: Record<string, HadithTranslation> = {};
      for (const [lang, slot] of Object.entries(dailyMatch.translations)) {
        translations[lang] = { text: (slot as { text: string }).text };
      }
      if (bookMatch?.arabic && !translations.ar?.text) {
        translations.ar = { text: bookMatch.arabic };
      }
      if (bookMatch?.translation && !translations.bn?.text) {
        translations.bn = { text: bookMatch.translation };
      }

      return {
        id: dailyMatch.content_id,
        type: 'hadith',
        reference: {
          collection: bookData?.title_bn || bookData?.title_en || dailyMatch.attribution,
          collection_key: collKey,
          hadith_number: bookMatch?.hadith_number || dailyMatch.hadith_number || dailyMatch.hadeethenc_id || 1,
          chapter_id: bookMatch?.chapter_id,
          chapter_title: bookMatch?.chapter_title,
          chapter_arabic_title: bookMatch?.chapter_arabic_title,
          section_id: bookMatch?.section_id,
          section_title: bookMatch?.section_title,
          section_arabic_title: bookMatch?.section_arabic_title,
          display_label: bookMatch?.display_label,
        },
        authenticity: {
          collection_status: bookMatch?.grade_bn || dailyMatch.grade_bn || dailyMatch.grade || 'সহিহ হাদিস',
          individual_grades: [],
        },
        translations,
        narrator: bookMatch?.narrator || dailyMatch.narrator,
        note: bookMatch?.note || '',
        grade_bn: bookMatch?.grade_bn || dailyMatch.grade_bn,
        grade_en: bookMatch?.grade_en || dailyMatch.grade,
        grade_color: bookMatch?.grade_color,
        clean_arabic: bookMatch?.clean_arabic,
      };
    }

    // 2. Look up in modular book JSON
    const parts = hadithId.split('_');
    if (parts.length >= 3 && parts[0] === 'hadith') {
      const collKey = parts[1];
      const rawNum = parts.slice(2).join('_');
      const bookData = requireHadithBook(collKey);
      if (bookData?.hadiths) {
        const item = bookData.hadiths.find(
          (h: any) =>
            String(h.hadith_number) === rawNum ||
            h.id === hadithId ||
            String(h.raw_id) === rawNum
        );
        if (item) {
          return {
            id: item.id || hadithId,
            type: 'hadith',
            reference: {
              collection: bookData.title_bn || bookData.title_en || collKey,
              collection_key: collKey,
              hadith_number: item.hadith_number || rawNum,
              chapter_id: item.chapter_id,
              chapter_title: item.chapter_title,
              chapter_arabic_title: item.chapter_arabic_title,
              section_id: item.section_id,
              section_title: item.section_title,
              section_arabic_title: item.section_arabic_title,
              display_label: item.display_label,
            },
            authenticity: {
              collection_status: item.grade_bn || item.grade_en || 'সহিহ হাদিস',
              individual_grades: [],
            },
            translations: {
              ar: { text: item.arabic || '' },
              bn: { text: item.translation || '' },
              en: { text: item.translation || '' },
            },
            narrator: item.narrator,
            note: item.note,
            grade_bn: item.grade_bn,
            grade_en: item.grade_en,
            grade_color: item.grade_color,
          };
        }
      }
    }
  } catch (e) {
    console.warn('getHadithById error:', e);
  }

  return null;
}

/**
 * Collection-based Hadith browsing from the complete modular book dataset.
 * Supports pagination across all 52,856 Hadiths.
 */
export async function getCollectionHadiths(
  collectionKey: string,
  page: number = 1,
  pageSize: number = 30,
  _language: string = 'en',
): Promise<HadithRecord[]> {
  try {
    const bookData = requireHadithBook(collectionKey);
    if (bookData?.hadiths && Array.isArray(bookData.hadiths)) {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageItems = bookData.hadiths.slice(start, end);

      return pageItems.map((item: any) => ({
        id: item.id || `hadith_${collectionKey}_${item.hadith_number}`,
        type: 'hadith',
        reference: {
          collection: bookData.title_bn || bookData.title_en || collectionKey,
          collection_key: collectionKey,
          hadith_number: item.hadith_number,
          chapter_id: item.chapter_id,
          chapter_title: item.chapter_title,
          chapter_arabic_title: item.chapter_arabic_title,
          section_id: item.section_id,
          section_title: item.section_title,
          section_arabic_title: item.section_arabic_title,
          display_label: item.display_label,
        },
        authenticity: {
          collection_status: item.grade_bn || item.grade_en || 'সহিহ হাদিস',
          individual_grades: [],
        },
        translations: {
          ar: { text: item.arabic || '' },
          bn: { text: item.translation || '' },
          en: { text: item.translation || '' },
        },
        narrator: item.narrator,
        note: item.note,
        grade_bn: item.grade_bn,
        grade_en: item.grade_en,
        grade_color: item.grade_color,
      }));
    }

    // Fallback: search daily pool
    const pool = getHadithDailyPool();
    const matching = pool.hadiths.filter(h => {
      const coll = (h.collection_key || '').toLowerCase();
      const attr = (h.attribution || '').toLowerCase();
      return coll === collectionKey.toLowerCase() || attr.includes(collectionKey.toLowerCase());
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return matching.slice(start, end).map(rec => ({
      id: rec.content_id,
      type: 'hadith',
      reference: {
        collection: rec.attribution,
        collection_key: collectionKey,
        hadith_number: rec.hadith_number || rec.hadeethenc_id || 1,
      },
      authenticity: {
        collection_status: rec.grade,
        individual_grades: [],
      },
      translations: {
        ar: { text: rec.translations?.ar?.text || '' },
        bn: { text: rec.translations?.bn?.text || '' },
        en: { text: rec.translations?.en?.text || rec.translations?.bn?.text || '' },
      },
    }));
  } catch (e) {
    console.warn(`getCollectionHadiths('${collectionKey}'): error:`, e);
    return [];
  }
}
