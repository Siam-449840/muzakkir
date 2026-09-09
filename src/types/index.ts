// Core TypeScript Models for Muzakkir App

export type ContentType = 'quran' | 'hadith';

export type SupportedQuranLanguage = 'ar' | 'en' | 'bn' | 'zh' | 'hi' | 'es' | 'fr' | 'pt' | 'ru' | 'ur';

/**
 * After HadeethEnc ingestion, all 10 content languages are supported for Hadith.
 * Arabic = original matn; all others = supervised translations.
 */
export type SupportedHadithLanguage =
  | 'ar'   // original
  | 'en' | 'zh' | 'hi' | 'es' | 'fr' | 'bn' | 'pt' | 'ru' | 'ur'; // translations

/** Ordered list of the 10 canonical content language codes. */
export const MULTILINGUAL_TARGET_LANGS: readonly SupportedHadithLanguage[] = [
  'ar', 'en', 'zh', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'ur',
] as const;

export type AnyLanguageCode = SupportedQuranLanguage | string;

export interface LanguageOption {
  code: SupportedQuranLanguage;
  name: string;
  nativeName: string;
  hadithVerified: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English',              nativeName: 'English',    hadithVerified: true },
  { code: 'bn', name: 'Bengali',              nativeName: 'বাংলা',      hadithVerified: true },
  { code: 'ur', name: 'Urdu',                 nativeName: 'اردو',       hadithVerified: true },
  { code: 'fr', name: 'French',               nativeName: 'Français',   hadithVerified: true },
  { code: 'es', name: 'Spanish',              nativeName: 'Español',   hadithVerified: true },
  { code: 'pt', name: 'Portuguese',           nativeName: 'Português',  hadithVerified: true },
  { code: 'hi', name: 'Hindi',                nativeName: 'हिन्दी',    hadithVerified: true },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文',       hadithVerified: true },
  { code: 'ru', name: 'Russian',              nativeName: 'Русский',   hadithVerified: true },
];
// Arabic is the original Quranic text — not a translation.
// It is always displayed as the original in the reader and is never
// presented as a "translation" language in the UI.

export interface QuranReference {
  surah_number: number;
  surah_name: string;
  surah_name_ar: string;
  surah_name_translation: string;
  ayah_number: number;
  juz?: number;
  revelation_type?: 'Mecca' | 'Medina' | string;
}

export interface QuranTranslation {
  text: string;
  translator?: string;
  source?: string;
  source_url?: string;
}

export interface QuranVerse {
  id: string; // e.g. "quran_001_001"
  type: 'quran';
  reference: QuranReference;
  arabic_word_count?: number;
  is_short_form?: boolean;
  translations: Record<string, QuranTranslation>;
}

export interface HadithReference {
  collection: string;
  collection_key: string;
  hadith_number: number | string;
  book_number?: number;
  in_book_hadith_number?: number;
  chapter_id?: number | string;
  chapter_title?: string;
  chapter_arabic_title?: string;
  chapter_range?: string;
  section_id?: number | string;
  section_title?: string;
  section_arabic_title?: string;
  display_label?: string;
}

export interface HadithAuthenticityGrade {
  grade?: string;
  graded_by?: string;
}

export interface HadithAuthenticity {
  collection_status: string;
  individual_grades?: HadithAuthenticityGrade[];
}

export interface HadithTranslation {
  text: string;
  intro?: string;
  translator?: string;
  source?: string;
}

export interface HadithRecord {
  id: string; // e.g. "hadith_bukhari_1"
  type: 'hadith';
  reference: HadithReference;
  authenticity: HadithAuthenticity;
  english_word_count?: number;
  is_short_form?: boolean;
  translations: Record<string, HadithTranslation>;
  narrator?: string;
  note?: string;
  grade_bn?: string;
  grade_en?: string;
  grade_color?: string;
  clean_arabic?: string;
}

/**
 * A single language slot within a MultilingualHadithRecord.
 * text = the translated Hadith text (exact HadeethEnc wording, not modified)
 * intro = narrator introduction in that language
 */
export interface MultilingualTranslation {
  text:  string;
  intro: string;
}

/**
 * A fully multilingual Hadith record from HadeethEnc.com with all 10
 * content languages present and individually verified.
 *
 * Provenance fields are mandatory; the record is rejected during ingestion
 * if any are missing or empty.
 *
 * IMPORTANT: Do NOT modify translations[].text — HadeethEnc license prohibits
 * any alteration of the source text.
 */
export interface MultilingualHadithRecord {
  /** Stable numeric ID assigned by HadeethEnc (do not confuse with internal DB id). */
  hadeethenc_id:         number;

  // ── Provenance (all mandatory) ─────────────────────────────────────────
  source:                string;   // "HadeethEnc.com"
  source_url:            string;   // canonical API URL for this record
  fetch_date:            string;   // YYYY-MM-DD
  api_version:           string;   // "v1"
  license:               string;   // full license statement

  // ── Authenticity ───────────────────────────────────────────────────────
  grade:                 string;   // English authenticity grade e.g. "Authentic"
  grade_ar:              string;   // Arabic authenticity grade e.g. "صحيح"
  attribution:           string;   // English collection attribution
  attribution_ar:        string;   // Arabic collection attribution

  // ── Arabic original ────────────────────────────────────────────────────
  hadeeth_ar:            string;   // Full Arabic matn (never translated or modified)
  hadeeth_intro_ar:      string;   // Arabic narrator intro
  ar_text_hash:          string;   // SHA-256[:16] of hadeeth_ar for cross-reference

  // ── Cross-reference ────────────────────────────────────────────────────
  /** content_id from existing master corpus if exact Arabic hash match found; null otherwise. */
  cross_ref_existing_id: string | null;

  // ── Translations (all 10 TARGET_LANGS required) ────────────────────────
  /**
   * All 10 target language slots.
   * 'ar' is the original matn; the rest are supervised translations.
   * DO NOT modify these texts — HadeethEnc license prohibits alterations.
   */
  translations: Record<SupportedHadithLanguage, MultilingualTranslation>;
}

export type CandidateSuitability = 'excellent' | 'good' | 'conditional' | 'not_suitable';

export interface CuratedCandidateItem {
  content_id: string;
  content_type: ContentType;
  suitability: CandidateSuitability;
  reason: string;
  assessment_basis?: string;
  topic?: string;
  cooldown_days?: number;
  reference: {
    surah_number?: number;
    surah_name?: string;
    surah_name_ar?: string;
    ayah_number?: number;
    ayah_start?: number;
    ayah_end?: number;
    ayah_count?: number;
    speaker?: string;
    context_badge?: string;
    emotive_category?: string;
    practical_reflection?: string;
    muslim_takeaway?: string;
    collection?: string;
    collection_key?: string;
    hadith_number?: number;
    authenticity_status?: string;
    narrator?: string;
    grade?: string;
    grade_bn?: string;
    grade_ar?: string;
    chapter_title?: string;
    section_title?: string;
    note?: string;
    attribution_en?: string;
    source_url?: string;
  };
  translations?: Record<string, string>;
}

export type DailyFrequency = 1 | 2 | 3 | 4 | 5;

export interface UserSettings {
  reminder_enabled: boolean;
  daily_frequency: DailyFrequency;
  reminder_times: string[]; // e.g. ["08:00", "14:00", "20:00"]
  timezone: string;
  preferred_language: SupportedQuranLanguage;
  ui_language: string;
  hadith_enabled: boolean;
  quran_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "22:00"
  quiet_hours_end: string;   // "07:00"
  cooldown_days: number;     // default: 60
  theme: string;
}

export interface ReminderSlot {
  slot_index: number;
  time: string; // "08:00"
  content_type: ContentType;
  item?: CuratedCandidateItem | null;
  delivered: boolean;
  opened: boolean;
  reflected: boolean;
}

export interface DailySchedule {
  date: string; // "YYYY-MM-DD"
  frequency: DailyFrequency;
  slots: ReminderSlot[];
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  icon: string;
  description: string;
  keywords: string[];
}

export interface SourceRegistryItem {
  source_id: string;
  source_type: string;
  title: string;
  author?: string;
  organization?: string;
  url?: string;
  edition?: string;
  language?: string;
  license?: string;
  verification_status?: string;
  verification_notes?: string;
}

export interface TranslationRegistryItem {
  translation_id: string;
  content_type: string;
  language: string;
  language_code: string;
  is_original_text: boolean;
  translator?: string;
  title?: string;
  source_url?: string;
  attribution?: string;
  verification_notes?: string;
}

export interface Bookmark {
  id?: number;
  content_id: string;
  content_type: ContentType;
  created_at: string;
  note?: string;
  title: string;
  reference_text: string;
  excerpt: string;
}

export interface ReminderHistoryItem {
  id?: number;
  content_id: string;
  content_type: ContentType;
  scheduled_time: string;
  delivered_time?: string;
  opened_time?: string;
  reflected_time?: string;
  status: 'scheduled' | 'delivered' | 'opened' | 'reflected';
}
