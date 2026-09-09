import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DailyFrequency,
  ContentType,
  DailySchedule,
  ReminderSlot,
  UserSettings,
  CuratedCandidateItem
} from '../types';
import {
  getCandidatePool,
  getAllSeenContentIds,
  getLastSeenTimestamps,
} from '../database/reminderRepository';

// ── Per-day content cache ──────────────────────────────────────────────────
// Key: @scheduled_content_v1
// Shape: Record<"YYYY-MM-DD", Record<string, string>>  →  { date → { slotIndex → content_id } }
//
// Purpose: once a content_id is committed for a (date, slot) pair it is
// reused on every reschedule within that day, so changing a setting at
// 23:58 does not silently deliver different content tomorrow.

const CACHE_KEY = '@scheduled_content_v1';
type DaySlotCache = Record<string, Record<string, string>>;

async function loadContentCache(): Promise<DaySlotCache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DaySlotCache) : {};
  } catch {
    return {};
  }
}

async function saveContentCache(cache: DaySlotCache): Promise<void> {
  try {
    // Prune entries older than 8 days to keep storage bounded
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 8);
    const cutoffStr = [
      cutoff.getFullYear(),
      String(cutoff.getMonth() + 1).padStart(2, '0'),
      String(cutoff.getDate()).padStart(2, '0'),
    ].join('-');

    const pruned: DaySlotCache = {};
    for (const [date, slots] of Object.entries(cache)) {
      if (date >= cutoffStr) pruned[date] = slots;
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  } catch {
    // Non-fatal — next call will re-build
  }
}

/**
 * Resolves a previously-cached content_id back to a full CuratedCandidateItem
 * by scanning the candidate pool. Returns null when the id is no longer in pool.
 */
async function resolveItemFromPool(
  contentId: string,
  contentType: ContentType
): Promise<CuratedCandidateItem | null> {
  const pool = await getCandidatePool(contentType);
  return pool.find(item => item.content_id === contentId) ?? null;
}
// ────────────────────────────────────────────────────────────────────────────

export const COMPOSITION_RATIOS: Record<DailyFrequency, { quran: number; hadith: number }> = {
  1: { quran: 1, hadith: 1 }, // Alternates Q/H day-to-day: even days=Quran, odd days=Hadith
  2: { quran: 1, hadith: 1 },
  3: { quran: 2, hadith: 1 },
  4: { quran: 2, hadith: 2 },
  5: { quran: 3, hadith: 2 },
};

/**
 * Calculates calendar day index from date string (YYYY-MM-DD) deterministically.
 * Guarantees that day-to-day alternation is strictly based on the calendar date,
 * NOT app launch count, app restarts, or device reboots.
 */
export function getCalendarDayIndex(dateString?: string): number {
  const targetDate = dateString ? new Date(dateString) : new Date();
  const utcDate = Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate());
  return Math.floor(utcDate / (1000 * 60 * 60 * 24));
}

/**
 * Deterministically resolves the content types for each slot of the day.
 */
/**
 * Deterministically resolves the content-TYPE sequence for each notification slot.
 *
 * PRODUCT RULES (deterministic by calendar day — not app launch count):
 *
 *   1/day:  Even days → Quran,  Odd days → Hadith
 *           Sequence over 6 days: Q H Q H Q H
 *
 *   2/day:  Every day → Quran, Hadith
 *
 *   3/day:  Day A (even) → Q H Q
 *           Day B (odd)  → H Q Q
 *           Per-day totals always: 2 Quran + 1 Hadith
 *
 *   4/day:  Day A (even) → Q H Q H
 *           Day B (odd)  → H Q H Q
 *           Per-day totals always: 2 Quran + 2 Hadith
 *
 *   5/day:  Day A (even) → Q H Q H Q
 *           Day B (odd)  → H Q H Q Q
 *           Per-day totals always: 3 Quran + 2 Hadith
 *
 * These are SLOT-TYPE patterns only. Actual content selection is always:
 *   unseen-first → quality/diversity → cooldown-gated rotation.
 *
 * The dayIndex must be getCalendarDayIndex() — a stable day ordinal derived
 * from the UTC date. It is immune to app restarts, reboots, and timezone shifts.
 */
export function resolveSlotTypesForFrequency(
  frequency: number,
  dayIndex: number = 0,
): ContentType[] {
  const isEven = dayIndex % 2 === 0;

  switch (frequency) {
    case 1:
      // Q H Q H Q H ... (strict calendar alternation)
      return isEven ? ['quran'] : ['hadith'];

    case 2:
      // Q H — every day
      return ['quran', 'hadith'];

    case 3:
      // Day A: Q H Q  |  Day B: H Q Q
      // Per day: 2 Quran + 1 Hadith
      return isEven
        ? ['quran', 'hadith', 'quran']
        : ['hadith', 'quran', 'quran'];

    case 4:
      // Day A: Q H Q H  |  Day B: H Q H Q
      // Per day: 2 Quran + 2 Hadith
      return isEven
        ? ['quran', 'hadith', 'quran', 'hadith']
        : ['hadith', 'quran', 'hadith', 'quran'];

    case 5:
      // Day A: Q H Q H Q  |  Day B: H Q H Q Q
      // Per day: 3 Quran + 2 Hadith
      return isEven
        ? ['quran', 'hadith', 'quran', 'hadith', 'quran']
        : ['hadith', 'quran', 'hadith', 'quran', 'quran'];

    default: {
      const types: ContentType[] = [];
      for (let i = 0; i < frequency; i++) {
        if (isEven) {
          types.push(i % 2 === 0 ? 'quran' : 'hadith');
        } else {
          types.push(i % 2 === 0 ? 'hadith' : 'quran');
        }
      }
      return types.length > 0 ? types : ['quran', 'hadith', 'quran'];
    }
  }
}

/**
 * UNSEEN-CONTENT-FIRST selection.
 *
 * Core product rule: NEVER show a seen item while unseen eligible items remain.
 *
 * Phase 1 — UNSEEN:
 *   eligible = pool items NOT in all-time history (ANY appearance disqualifies)
 *   excludedIds = items already chosen earlier in today's schedule
 *   topic diversity = avoid repeating the same topic as recent slots
 *   cooldown NOT checked — unseen items are always eligible
 *   pick: weighted-random from unseen eligible
 *
 * Phase 2 — EXHAUSTED ROTATION (only when every pool item has been seen):
 *   eligible = pool items where daysSinceSeen >= cooldownDays
 *   sort: oldest-first (longest since shown = highest priority)
 *   topic diversity applied
 *   pick: first eligible after diversity filter (deterministic: oldest first)
 *
 * Phase 3 — ABSOLUTE FALLBACK (nothing passes cooldown — should not occur at
 *   pool sizes > 60 items with default 60-day cooldown):
 *   return pool item with the oldest last-seen timestamp
 *
 * @param contentType  'quran' or 'hadith'
 * @param cooldownDays Used ONLY in exhausted rotation. Default 60.
 * @param recentTopics Topics shown in recent slots (for diversity). Optional.
 * @param excludedIds  Content IDs already chosen for today's earlier slots.
 */
export async function selectCandidateItem(
  contentType: ContentType,
  cooldownDays: number = 60,
  recentTopics: string[] = [],
  excludedIds: Set<string> = new Set()
): Promise<CuratedCandidateItem | null> {
  const pool = await getCandidatePool(contentType);
  if (pool.length === 0) return null;

  // All items ever seen (all-time — no cutoff)
  const seenIds = await getAllSeenContentIds();

  // ── PHASE 1: UNSEEN ────────────────────────────────────────────────────────
  const unseen = pool.filter(
    item => !seenIds.has(item.content_id) && !excludedIds.has(item.content_id)
  );

  if (unseen.length > 0) {
    const diverse = applyTopicDiversity(unseen, recentTopics);
    return pickWeightedRandom(diverse.length > 0 ? diverse : unseen);
  }

  // ── PHASE 2: EXHAUSTED ROTATION ───────────────────────────────────────────
  // Every item has been seen at least once. Now use oldest-first with cooldown.
  const lastSeen = await getLastSeenTimestamps();
  const now = Date.now();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

  const cooldownEligible = pool
    .filter(item => {
      if (excludedIds.has(item.content_id)) return false;
      const ts = lastSeen.get(item.content_id);
      if (ts === undefined) return true; // never seen (shouldn't happen after phase 1)
      return (now - ts) >= cooldownMs;
    })
    .sort((a, b) => {
      const tsA = lastSeen.get(a.content_id) ?? 0;
      const tsB = lastSeen.get(b.content_id) ?? 0;
      return tsA - tsB; // oldest first
    });

  if (cooldownEligible.length > 0) {
    const diverse = applyTopicDiversity(cooldownEligible, recentTopics);
    // Oldest-first: take the first after diversity filter, not random
    return (diverse.length > 0 ? diverse : cooldownEligible)[0];
  }

  // ── PHASE 3: ABSOLUTE FALLBACK ────────────────────────────────────────────
  // Nothing clears cooldown — return the item with oldest last-seen timestamp.
  // This should never occur with a pool of ~700+ items and 60-day cooldown.
  const fallback = [...pool]
    .filter(item => !excludedIds.has(item.content_id))
    .sort((a, b) => {
      const tsA = lastSeen.get(a.content_id) ?? 0;
      const tsB = lastSeen.get(b.content_id) ?? 0;
      return tsA - tsB;
    });

  return fallback[0] ?? pool[0] ?? null;
}

/**
 * Weighted-random pick from a pool.
 * Excellent-suitability items get 2× weight; good-suitability items 1×.
 * This preserves the original quality-first bias while maintaining randomness.
 */
function pickWeightedRandom(pool: CuratedCandidateItem[]): CuratedCandidateItem {
  const weighted: CuratedCandidateItem[] = [];
  for (const item of pool) {
    weighted.push(item);
    if (item.suitability === 'excellent') weighted.push(item); // 2× weight
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/**
 * Returns items whose topic does not appear in recentTopics.
 * If all items share a recent topic, returns the full array (no exclusion).
 * This prevents infinite loops when the pool is very small.
 */
function applyTopicDiversity(
  pool: CuratedCandidateItem[],
  recentTopics: string[]
): CuratedCandidateItem[] {
  if (recentTopics.length === 0) return pool;
  const recentSet = new Set(recentTopics.filter(Boolean));
  const diverse = pool.filter(item => !item.topic || !recentSet.has(item.topic));
  return diverse.length > 0 ? diverse : pool;
}

/**
 * Generates the full daily schedule for a given calendar date.
 *
 * Cache contract:
 *   • On first call for a date → selects content normally, writes to cache.
 *   • On subsequent calls for same date → reads from cache and resolves items,
 *     guaranteeing identical content regardless of reschedule trigger.
 *   • Cache is pruned to 8 days to remain bounded.
 *
 * Invariant: Day N content ≠ Day N+1 content (enforced by cooldown rules;
 * graceful reuse only when the candidate pool is genuinely exhausted).
 */
export async function generateDailySchedule(
  settings: UserSettings,
  dateString?: string
): Promise<DailySchedule> {
  const today = dateString || new Date().toISOString().split('T')[0];
  const calendarDayIndex = getCalendarDayIndex(today);

  const times = settings.reminder_times || ['08:00', '14:00', '20:00'];
  const slotCount = times.length > 0 ? times.length : settings.daily_frequency || 3;
  const slotTypes = resolveSlotTypesForFrequency(slotCount, calendarDayIndex);

  // Load per-day cache — may already have content committed for this date
  const cache = await loadContentCache();
  const dayCache: Record<string, string> = cache[today] ?? {};
  let cacheModified = false;

  const slots: ReminderSlot[] = [];
  const chosenIds = new Set<string>();
  const chosenTopics: string[] = []; // for topic diversity across slots

  // Seed chosenIds from cache so later slots don't duplicate earlier ones
  for (const cachedId of Object.values(dayCache)) {
    chosenIds.add(cachedId);
  }

  for (let i = 0; i < slotCount; i++) {
    const slotKey = String(i + 1);
    const contentType = slotTypes[i] || 'quran';
    const time = times[i] || '08:00';

    let item: CuratedCandidateItem | null = null;

    // Check cache first: reuse a committed selection for this (date, slot)
    const cachedId = dayCache[slotKey];
    if (cachedId) {
      item = await resolveItemFromPool(cachedId, contentType);
      // If the cached item is no longer in the pool (data changed), fall through
    }

    // Cache miss or stale — run normal selection
    if (!item) {
      // Temporarily remove other cached ids so we can pick fresh for this slot
      const otherCachedIds = new Set<string>();
      Object.entries(dayCache).forEach(([k, v]) => {
        if (k !== slotKey) otherCachedIds.add(v);
      });
      const excludeSet = new Set<string>([...chosenIds, ...otherCachedIds]);

      item = await selectCandidateItem(
        contentType,
        settings.cooldown_days || 60,
        chosenTopics,
        excludeSet
      );

      if (item) {
        dayCache[slotKey] = item.content_id;
        chosenIds.add(item.content_id);
        if (item.topic) chosenTopics.push(item.topic);
        cacheModified = true;
      }
    } else {
      // Cache hit — ensure chosen set and topic diversity stays consistent
      chosenIds.add(item.content_id);
      if (item.topic) chosenTopics.push(item.topic);
    }

    slots.push({
      slot_index: i + 1,
      time,
      content_type: contentType,
      item,
      delivered: false,
      opened: false,
      reflected: false,
    });
  }

  // Persist updated cache only when new selections were made
  if (cacheModified) {
    cache[today] = dayCache;
    await saveContentCache(cache);
  }

  return {
    date: today,
    frequency: (Math.min(Math.max(slotCount, 1), 5)) as DailyFrequency,
    slots,
  };
}
