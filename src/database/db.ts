// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  IMMUTABLE RELIGIOUS TEXT — NON-NEGOTIABLE RULE                         ║
// ║                                                                          ║
// ║  The Quran verses and original Hadith text (Arabic matn) are sacred     ║
// ║  immutable source data. NEVER edit, rewrite, paraphrase, normalize,     ║
// ║  correct, truncate, merge, translate, or otherwise alter the canonical  ║
// ║  Quranic verses or original Hadith text in any way.                     ║
// ║                                                                          ║
// ║  Preserve every character, word, diacritic, punctuation, and            ║
// ║  source/reference exactly as provided in the verified source files.     ║
// ║                                                                          ║
// ║  Any storage, indexing, compression, or database conversion must be     ║
// ║  LOSSLESS and must reproduce the exact original text byte-for-byte.     ║
// ║                                                                          ║
// ║  No AI, code, developer, or automated process may modify the canonical  ║
// ║  religious text. Violation of this rule is unacceptable.                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSettings, Bookmark, ReminderHistoryItem } from '../types';

// ── Tiny metadata — always eager (< 0.1 MB) ───────────────────────────────────
// Used at startup. Stays small regardless of content growth.
import surahsData      from '../../assets/data/surahs.json';
import collectionsData from '../../assets/data/hadith_collections.json';
import categoriesData  from '../../assets/data/categories.json';
import registriesData  from '../../assets/data/registries.json';

// ── Runtime pool types ─────────────────────────────────────────────────────────

export interface QuranDailyItem {
  content_id:        string;
  content_type:      'quran';
  tier:              'A' | 'B';
  tier_rationale?:   string;
  reference:         Record<string, unknown>;
  arabic_word_count?: number;
  suitability:       string;
  translations:      Record<string, { text: string; translator?: string }>;
}

export interface HadithDailyItem {
  content_id:      string;
  content_type:    'hadith';
  hadith_number?:  number;
  collection_key?: string;
  hadeethenc_id?:  number;
  grade:           string;
  grade_bn?:       string;
  grade_ar?:       string;
  attribution:     string;
  attribution_en?: string;
  narrator?:       string;
  source_url?:     string;
  translations:    Record<string, { text: string }>;
}

export interface QuranDailyPool  { metadata: Record<string, unknown>; items: QuranDailyItem[]; }
export interface HadithDailyPool { metadata: Record<string, unknown>; hadiths: HadithDailyItem[]; }

export interface QuranFullVerse {
  content_id:         string;
  reference:          Record<string, unknown>;
  arabic_word_count?: number;
  translations:       Record<string, { text: string; translator?: string }>;
}
export interface QuranSurahChunk { surah: number; verses: QuranFullVerse[]; }

// ── Lazy in-memory caches ──────────────────────────────────────────────────────
// Each pool is loaded ONCE on first access, then held in memory.
// Metro bundles JSON assets separately from the main JS bundle.
// Lazy require() keeps them off the startup heap — loaded only when first needed.

let _quranDailyCache:  QuranDailyPool  | null = null;
let _hadithDailyCache: HadithDailyPool | null = null;
// Surah chunks are keyed 1–114 and evicted if memory pressure occurs (future work).
const _quranSurahCache: Map<number, QuranSurahChunk> = new Map();

/**
 * Daily Quran reminder pool.
 * Source: assets/data/quran_daily_pool.json
 *   2,846 items × 10 languages (Tier A: 1,062  |  Tier B: 1,784)
 * Loaded lazily on first reminder scheduling. Fully offline.
 */
export function getQuranDailyPool(): QuranDailyPool {
  if (!_quranDailyCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _quranDailyCache = require('../../assets/data/quran_daily_pool.json') as QuranDailyPool;
  }
  return _quranDailyCache;
}

/**
 * Daily Hadith reminder pool.
 * Source: assets/data/hadith_daily_pool.json
 *   2,402 Pristine Sahih records with complete Arabic and Bengali text.
 * Loaded lazily on first reminder scheduling. Fully offline.
 */
export function getHadithDailyPool(): HadithDailyPool {
  if (!_hadithDailyCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _hadithDailyCache = require('../../assets/data/hadith_daily_pool.json') as HadithDailyPool;
  }
  return _hadithDailyCache;
}

/**
 * Quran surah chunk for the full Quran reader.
 * Source: assets/data/quran_full/surah_NNN.json
 *   6,236 verses across 114 surah files × 10 languages.
 * Loaded on-demand when the user opens a specific surah. Fully offline.
 *
 * The chunk file is ~10–1,200 KB depending on surah length.
 * Cached per surah for the session lifetime.
 */
export function getQuranSurahChunk(surahNumber: number): QuranSurahChunk {
  if (_quranSurahCache.has(surahNumber)) {
    return _quranSurahCache.get(surahNumber)!;
  }

  // Require the surah chunk file. Metro pre-registers all assets.
  // The require path must be a string literal resolvable at build time.
  // We use a switch-based dispatcher to keep the paths statically analyzable.
  const chunk = requireSurahChunk(surahNumber);
  _quranSurahCache.set(surahNumber, chunk);
  return chunk;
}

/**
 * Dispatches to the correct surah chunk file.
 * Metro needs static string paths — this switch gives it 114 explicit paths.
 * Generated automatically. Do NOT edit by hand.
 */
function requireSurahChunk(n: number): QuranSurahChunk {
  switch (n) {
    case 1:   return require('../../assets/data/quran_full/surah_001.json');
    case 2:   return require('../../assets/data/quran_full/surah_002.json');
    case 3:   return require('../../assets/data/quran_full/surah_003.json');
    case 4:   return require('../../assets/data/quran_full/surah_004.json');
    case 5:   return require('../../assets/data/quran_full/surah_005.json');
    case 6:   return require('../../assets/data/quran_full/surah_006.json');
    case 7:   return require('../../assets/data/quran_full/surah_007.json');
    case 8:   return require('../../assets/data/quran_full/surah_008.json');
    case 9:   return require('../../assets/data/quran_full/surah_009.json');
    case 10:  return require('../../assets/data/quran_full/surah_010.json');
    case 11:  return require('../../assets/data/quran_full/surah_011.json');
    case 12:  return require('../../assets/data/quran_full/surah_012.json');
    case 13:  return require('../../assets/data/quran_full/surah_013.json');
    case 14:  return require('../../assets/data/quran_full/surah_014.json');
    case 15:  return require('../../assets/data/quran_full/surah_015.json');
    case 16:  return require('../../assets/data/quran_full/surah_016.json');
    case 17:  return require('../../assets/data/quran_full/surah_017.json');
    case 18:  return require('../../assets/data/quran_full/surah_018.json');
    case 19:  return require('../../assets/data/quran_full/surah_019.json');
    case 20:  return require('../../assets/data/quran_full/surah_020.json');
    case 21:  return require('../../assets/data/quran_full/surah_021.json');
    case 22:  return require('../../assets/data/quran_full/surah_022.json');
    case 23:  return require('../../assets/data/quran_full/surah_023.json');
    case 24:  return require('../../assets/data/quran_full/surah_024.json');
    case 25:  return require('../../assets/data/quran_full/surah_025.json');
    case 26:  return require('../../assets/data/quran_full/surah_026.json');
    case 27:  return require('../../assets/data/quran_full/surah_027.json');
    case 28:  return require('../../assets/data/quran_full/surah_028.json');
    case 29:  return require('../../assets/data/quran_full/surah_029.json');
    case 30:  return require('../../assets/data/quran_full/surah_030.json');
    case 31:  return require('../../assets/data/quran_full/surah_031.json');
    case 32:  return require('../../assets/data/quran_full/surah_032.json');
    case 33:  return require('../../assets/data/quran_full/surah_033.json');
    case 34:  return require('../../assets/data/quran_full/surah_034.json');
    case 35:  return require('../../assets/data/quran_full/surah_035.json');
    case 36:  return require('../../assets/data/quran_full/surah_036.json');
    case 37:  return require('../../assets/data/quran_full/surah_037.json');
    case 38:  return require('../../assets/data/quran_full/surah_038.json');
    case 39:  return require('../../assets/data/quran_full/surah_039.json');
    case 40:  return require('../../assets/data/quran_full/surah_040.json');
    case 41:  return require('../../assets/data/quran_full/surah_041.json');
    case 42:  return require('../../assets/data/quran_full/surah_042.json');
    case 43:  return require('../../assets/data/quran_full/surah_043.json');
    case 44:  return require('../../assets/data/quran_full/surah_044.json');
    case 45:  return require('../../assets/data/quran_full/surah_045.json');
    case 46:  return require('../../assets/data/quran_full/surah_046.json');
    case 47:  return require('../../assets/data/quran_full/surah_047.json');
    case 48:  return require('../../assets/data/quran_full/surah_048.json');
    case 49:  return require('../../assets/data/quran_full/surah_049.json');
    case 50:  return require('../../assets/data/quran_full/surah_050.json');
    case 51:  return require('../../assets/data/quran_full/surah_051.json');
    case 52:  return require('../../assets/data/quran_full/surah_052.json');
    case 53:  return require('../../assets/data/quran_full/surah_053.json');
    case 54:  return require('../../assets/data/quran_full/surah_054.json');
    case 55:  return require('../../assets/data/quran_full/surah_055.json');
    case 56:  return require('../../assets/data/quran_full/surah_056.json');
    case 57:  return require('../../assets/data/quran_full/surah_057.json');
    case 58:  return require('../../assets/data/quran_full/surah_058.json');
    case 59:  return require('../../assets/data/quran_full/surah_059.json');
    case 60:  return require('../../assets/data/quran_full/surah_060.json');
    case 61:  return require('../../assets/data/quran_full/surah_061.json');
    case 62:  return require('../../assets/data/quran_full/surah_062.json');
    case 63:  return require('../../assets/data/quran_full/surah_063.json');
    case 64:  return require('../../assets/data/quran_full/surah_064.json');
    case 65:  return require('../../assets/data/quran_full/surah_065.json');
    case 66:  return require('../../assets/data/quran_full/surah_066.json');
    case 67:  return require('../../assets/data/quran_full/surah_067.json');
    case 68:  return require('../../assets/data/quran_full/surah_068.json');
    case 69:  return require('../../assets/data/quran_full/surah_069.json');
    case 70:  return require('../../assets/data/quran_full/surah_070.json');
    case 71:  return require('../../assets/data/quran_full/surah_071.json');
    case 72:  return require('../../assets/data/quran_full/surah_072.json');
    case 73:  return require('../../assets/data/quran_full/surah_073.json');
    case 74:  return require('../../assets/data/quran_full/surah_074.json');
    case 75:  return require('../../assets/data/quran_full/surah_075.json');
    case 76:  return require('../../assets/data/quran_full/surah_076.json');
    case 77:  return require('../../assets/data/quran_full/surah_077.json');
    case 78:  return require('../../assets/data/quran_full/surah_078.json');
    case 79:  return require('../../assets/data/quran_full/surah_079.json');
    case 80:  return require('../../assets/data/quran_full/surah_080.json');
    case 81:  return require('../../assets/data/quran_full/surah_081.json');
    case 82:  return require('../../assets/data/quran_full/surah_082.json');
    case 83:  return require('../../assets/data/quran_full/surah_083.json');
    case 84:  return require('../../assets/data/quran_full/surah_084.json');
    case 85:  return require('../../assets/data/quran_full/surah_085.json');
    case 86:  return require('../../assets/data/quran_full/surah_086.json');
    case 87:  return require('../../assets/data/quran_full/surah_087.json');
    case 88:  return require('../../assets/data/quran_full/surah_088.json');
    case 89:  return require('../../assets/data/quran_full/surah_089.json');
    case 90:  return require('../../assets/data/quran_full/surah_090.json');
    case 91:  return require('../../assets/data/quran_full/surah_091.json');
    case 92:  return require('../../assets/data/quran_full/surah_092.json');
    case 93:  return require('../../assets/data/quran_full/surah_093.json');
    case 94:  return require('../../assets/data/quran_full/surah_094.json');
    case 95:  return require('../../assets/data/quran_full/surah_095.json');
    case 96:  return require('../../assets/data/quran_full/surah_096.json');
    case 97:  return require('../../assets/data/quran_full/surah_097.json');
    case 98:  return require('../../assets/data/quran_full/surah_098.json');
    case 99:  return require('../../assets/data/quran_full/surah_099.json');
    case 100: return require('../../assets/data/quran_full/surah_100.json');
    case 101: return require('../../assets/data/quran_full/surah_101.json');
    case 102: return require('../../assets/data/quran_full/surah_102.json');
    case 103: return require('../../assets/data/quran_full/surah_103.json');
    case 104: return require('../../assets/data/quran_full/surah_104.json');
    case 105: return require('../../assets/data/quran_full/surah_105.json');
    case 106: return require('../../assets/data/quran_full/surah_106.json');
    case 107: return require('../../assets/data/quran_full/surah_107.json');
    case 108: return require('../../assets/data/quran_full/surah_108.json');
    case 109: return require('../../assets/data/quran_full/surah_109.json');
    case 110: return require('../../assets/data/quran_full/surah_110.json');
    case 111: return require('../../assets/data/quran_full/surah_111.json');
    case 112: return require('../../assets/data/quran_full/surah_112.json');
    case 113: return require('../../assets/data/quran_full/surah_113.json');
    case 114: return require('../../assets/data/quran_full/surah_114.json');
    default:
      throw new Error(`[Quran] Surah ${n} is not a valid surah number (1–114).`);
  }
}

/**
 * The 10 canonical language codes for both Quran and HadeethEnc Hadith pools.
 */
export const HADEETHENC_TARGET_LANGS = [
  'ar', 'en', 'zh', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'ur',
] as const;

export type HadeethEncLang = (typeof HADEETHENC_TARGET_LANGS)[number];

// ── Backward-compatible staticData shim ───────────────────────────────────────
// Components that import staticData.surahs / .collections / .categories continue
// to work. The 'dailyPool' key is intentionally absent — callers must migrate
// to getQuranDailyPool() and getHadithDailyPool().
export const staticData = {
  surahs:      surahsData,
  collections: collectionsData,
  categories:  categoriesData,
  registries:  registriesData,
};

// ── History / settings / bookmarks — AsyncStorage (unchanged) ─────────────────
const SETTINGS_KEY  = '@reminder_user_settings_v1';
const BOOKMARKS_KEY = '@reminder_bookmarks_v1';
const HISTORY_KEY   = '@reminder_history_v1';

export const defaultSettings: UserSettings = {
  reminder_enabled:   true,
  daily_frequency:    3,
  reminder_times:     ['08:00', '14:00', '20:00'],
  timezone:           Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  preferred_language: 'en',
  ui_language:        'bn',
  hadith_enabled:     true,
  quran_enabled:      true,
  sound_enabled:      true,
  vibration_enabled:  true,
  quiet_hours_enabled: true,
  quiet_hours_start:  '22:00',
  quiet_hours_end:    '07:00',
  cooldown_days:      60,
  theme:              'warm_ivory',
};

export async function loadUserSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw), ui_language: 'bn' };
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return defaultSettings;
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load bookmarks:', e);
  }
  return [];
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  try {
    const list = await loadBookmarks();
    const filtered = list.filter(b => b.content_id !== bookmark.content_id);
    filtered.unshift(bookmark);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save bookmark:', e);
  }
}

export async function removeBookmark(content_id: string): Promise<void> {
  try {
    const list = await loadBookmarks();
    const filtered = list.filter(b => b.content_id !== content_id);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove bookmark:', e);
  }
}

export async function isBookmarked(content_id: string): Promise<boolean> {
  try {
    const list = await loadBookmarks();
    return list.some(b => b.content_id === content_id);
  } catch {
    return false;
  }
}

export async function loadHistory(): Promise<ReminderHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [];
}

export async function recordHistoryEvent(item: ReminderHistoryItem): Promise<void> {
  try {
    const list = await loadHistory();
    list.unshift(item);

    // Retain all history — needed for unseen-content-first rule (see contentEngine.ts).
    // An item is "seen" if it appears ANYWHERE in history (no time cutoff).
    // Bounded by 10,000-item hard cap. At 5/day that's 2,000 days = 5.5 years —
    // far beyond the pool exhaustion point (3,545 total unique items).
    const HARD_CAP = 10_000;
    const trimmed = list.slice(0, HARD_CAP);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to record history:', e);
  }
}
