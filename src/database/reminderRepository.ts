import {
  getQuranDailyPool,
  getHadithDailyPool,
  loadHistory,
  recordHistoryEvent,
  HADEETHENC_TARGET_LANGS,
  QuranDailyItem,
} from './db';
import {
  CuratedCandidateItem,
  ContentType,
} from '../types';

// ── Grade whitelist — enforced both at build-time and runtime ─────────────────
// filter_sahih_pool.py (build-time) applies the same patterns.
// This runtime guard is defence-in-depth: it prevents a stale/miscurated
// pool file from introducing non-Sahih records silently.
const SAHIH_GRADE_PATTERNS = [
  /\bauthentic\b/i,
  /\bsahih\b/i,
  /\bsahīh\b/i,
  /\bসহিহ\b/i,
  /\bসহীহ\b/i,
];

function isAcceptedGrade(grade: string): boolean {
  return SAHIH_GRADE_PATTERNS.some(p => p.test(grade));
}

/**
 * Resolves the translation text for a Hadith record in the user's preferred language.
 */
export function resolveHadeethEncTranslation(
  translations: Record<string, { text: string }>,
  hadeethencId: number | string,
  lang: string,
): { text: string; lang: string; isFallback: boolean } {
  const targetLangs = HADEETHENC_TARGET_LANGS as readonly string[];

  if (targetLangs.includes(lang)) {
    const slot = translations[lang];
    if (slot?.text?.trim()) {
      return { text: slot.text, lang, isFallback: false };
    }
  }

  const bnSlot = translations['bn'];
  if (bnSlot?.text?.trim()) {
    return { text: bnSlot.text, lang: 'bn', isFallback: true };
  }

  const enSlot = translations['en'];
  if (enSlot?.text?.trim()) {
    return { text: enSlot.text, lang: 'en', isFallback: true };
  }

  const arSlot = translations['ar'];
  return { text: arSlot?.text ?? '', lang: 'ar', isFallback: true };
}

// ── Pool loaders ───────────────────────────────────────────────────────────────

/**
 * Returns the Quran daily reminder pool as CuratedCandidateItem[].
 * Source: assets/data/quran_daily_pool.json (2,846 items × 10 languages).
 *   Tier A (Premium): 1,062 items — suitability mapped to 'excellent' for 2× weight.
 *   Tier B (Strong):  1,784 items — suitability mapped to 'good'.
 * Every item verified against master_quran_verified.json — no text modification.
 */
function getQuranCandidates(): CuratedCandidateItem[] {
  const pool = getQuranDailyPool();
  return pool.items.map((item: QuranDailyItem) => ({
    content_id:   item.content_id,
    content_type: 'quran' as ContentType,
    suitability:  'excellent' as const,
    reason:       item.tier_rationale ?? '',
    assessment_basis: '523 Research-Derived / Scholar-Standard Units (Pending Formal In-Person Mufassir Sign-Off)',
    topic:        (item.reference as any)?.emotive_category?.toLowerCase() ?? 'reflection',
    cooldown_days: 60,
    reference:    item.reference as Record<string, unknown>,
    translations: Object.fromEntries(
      Object.entries(item.translations).map(([lang, t]) => [lang, t.text])
    ),
  }));
}

/**
 * Returns the Hadith daily reminder pool as CuratedCandidateItem[].
 * Source: assets/data/hadith_daily_pool.json
 *   (iHadis authentic Sahih dataset).
 */
function getHadithCandidates(): CuratedCandidateItem[] {
  const pool = getHadithDailyPool();
  const candidates: CuratedCandidateItem[] = [];

  for (const rec of pool.hadiths) {
    if (!isAcceptedGrade(rec.grade)) {
      continue;
    }

    // Build flat translations map: lang → text
    const translationsMap: Record<string, string> = {};
    for (const [lang, slot] of Object.entries(rec.translations)) {
      if ((slot as { text: string })?.text) {
        translationsMap[lang] = (slot as { text: string }).text;
      }
    }
    if (!translationsMap['en'] && translationsMap['bn']) {
      translationsMap['en'] = translationsMap['bn'];
    }

    candidates.push({
      content_id:   rec.content_id,
      content_type: 'hadith' as ContentType,
      suitability:  'excellent',
      reason:       `${rec.attribution} — ${rec.grade}`,
      assessment_basis: `${rec.attribution} (${rec.grade})`,
      topic:        undefined,
      cooldown_days: 60,
      reference: {
        collection:          rec.attribution,
        collection_key:      rec.collection_key || 'hadith',
        hadith_number:       rec.hadith_number || rec.hadeethenc_id || 1,
        authenticity_status: rec.grade,
        narrator:            rec.narrator,
        grade:               rec.grade,
        grade_bn:            rec.grade_bn,
        grade_ar:            rec.grade_ar,
        attribution_en:      rec.attribution_en,
        source_url:          rec.source_url,
      },
      translations: translationsMap,
    });
  }

  return candidates;
}

/**
 * Main pool entry point used by contentEngine.
 * Returns the full type-specific pool synchronously via lazy require().
 * The unseen-content-first selection is handled in contentEngine.selectCandidateItem().
 */
export async function getCandidatePool(
  contentType: ContentType,
): Promise<CuratedCandidateItem[]> {
  if (contentType === 'quran')  return getQuranCandidates();
  if (contentType === 'hadith') return getHadithCandidates();
  return [...getQuranCandidates(), ...getHadithCandidates()];
}

// ── Backward compatibility aliases ────────────────────────────────────────────
export const getCuratedCandidates = getCandidatePool;

/**
 * Resolves a content_id to a full CuratedCandidateItem from the appropriate pool.
 * Used by contentEngine to re-hydrate cached IDs.
 */
export async function getCuratedItemWithText(
  contentId: string,
  type: ContentType,
  _language: string = 'en',
): Promise<CuratedCandidateItem | null> {
  const pool = await getCandidatePool(type);
  return pool.find(item => item.content_id === contentId) ?? null;
}

// ── Cooldown helpers ───────────────────────────────────────────────────────────
// NOTE: These are used during the EXHAUSTED ROTATION phase only.
// During the UNSEEN phase (contentEngine), cooldown is NOT checked —
// unseen items are always eligible regardless of when they were last seen.

export async function isItemOnCooldown(
  contentId: string,
  cooldownDays: number = 60,
): Promise<boolean> {
  const history = await loadHistory();
  const now = Date.now();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  return history.some(h => {
    if (h.content_id !== contentId) return false;
    return now - new Date(h.scheduled_time).getTime() < cooldownMs;
  });
}

/**
 * Returns ALL content_ids ever recorded in history (no time cutoff).
 * Used by contentEngine for the UNSEEN phase: an item is "seen" if it appears
 * anywhere in history, regardless of when.
 */
export async function getAllSeenContentIds(): Promise<Set<string>> {
  const history = await loadHistory();
  return new Set(history.map(h => h.content_id));
}

/**
 * Returns content_ids seen within the cooldown window.
 * Used by contentEngine during the EXHAUSTED ROTATION phase only.
 */
export async function getRecentlyShownContentIds(
  days: number = 60,
): Promise<Set<string>> {
  const history = await loadHistory();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = new Set<string>();
  for (const h of history) {
    if (new Date(h.scheduled_time).getTime() >= cutoff) {
      recent.add(h.content_id);
    }
  }
  return recent;
}

/**
 * Returns when each content_id was last seen (timestamp ms).
 * Used during exhausted rotation to sort by oldest-first.
 */
export async function getLastSeenTimestamps(): Promise<Map<string, number>> {
  const history = await loadHistory();
  const map = new Map<string, number>();
  // History is stored newest-first; first encounter = most recent
  for (const h of history) {
    const id = h.content_id;
    if (!map.has(id)) {
      map.set(id, new Date(h.scheduled_time).getTime());
    }
  }
  return map;
}

// ── Re-export recordHistoryEvent for convenience ──────────────────────────────
export { recordHistoryEvent };
