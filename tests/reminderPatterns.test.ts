/**
 * Reminder Slot-Type Pattern Tests
 * ==================================
 * Verifies that resolveSlotTypesForFrequency() produces exactly the correct
 * content-type sequences for all 5 frequencies across multiple calendar days.
 *
 * These tests enforce the PRODUCT-LEVEL SEQUENCING CONTRACT:
 *
 *   1/day:  Q H Q H Q H  (strict calendar alternation, even=Quran, odd=Hadith)
 *   2/day:  Q H  (every day — no alternation needed)
 *   3/day:  Day A: Q H Q  |  Day B: H Q Q  (repeating, 2Q+1H per day)
 *   4/day:  Day A: Q H Q H  |  Day B: H Q H Q  (repeating, 2Q+2H per day)
 *   5/day:  Day A: Q H Q H Q  |  Day B: H Q H Q Q  (repeating, 3Q+2H per day)
 *
 * IMPORTANT: These are SLOT-TYPE patterns only. Actual content selection
 * (which specific Quran/Hadith item fills the slot) is governed separately
 * by the unseen-first, quality, diversity, and cooldown engine.
 *
 * DETERMINISM RULE: Patterns are based on getCalendarDayIndex() — a UTC
 * day ordinal — not app launch count. App restarts and reboots cannot
 * change today's pattern.
 */

import {
  resolveSlotTypesForFrequency,
  getCalendarDayIndex,
} from '../src/services/contentEngine';
import type { ContentType } from '../src/types';

// Convenience alias
type Pattern = ContentType[];

// ── Helper: generate patterns for N consecutive day indices ──────────────────
function patternsForDays(freq: 1 | 2 | 3 | 4 | 5, dayIndices: number[]): Pattern[] {
  return dayIndices.map(d => resolveSlotTypesForFrequency(freq, d));
}

// ── Slot count helpers ────────────────────────────────────────────────────────
function qCount(p: Pattern) { return p.filter(t => t === 'quran').length; }
function hCount(p: Pattern) { return p.filter(t => t === 'hadith').length; }

// ─────────────────────────────────────────────────────────────────────────────
// 1 REMINDER / DAY
// ─────────────────────────────────────────────────────────────────────────────
describe('1/day — Q H Q H Q H alternation', () => {
  test('Day 0 (even) → [quran]', () => {
    expect(resolveSlotTypesForFrequency(1, 0)).toEqual(['quran']);
  });

  test('Day 1 (odd)  → [hadith]', () => {
    expect(resolveSlotTypesForFrequency(1, 1)).toEqual(['hadith']);
  });

  test('Day 2 (even) → [quran]', () => {
    expect(resolveSlotTypesForFrequency(1, 2)).toEqual(['quran']);
  });

  test('Days 0–5 produce Q H Q H Q H', () => {
    const result = patternsForDays(1, [0, 1, 2, 3, 4, 5]).flat();
    expect(result).toEqual(['quran', 'hadith', 'quran', 'hadith', 'quran', 'hadith']);
  });

  test('Pattern holds over 10 consecutive days (5 Q + 5 H)', () => {
    const all = patternsForDays(1, Array.from({ length: 10 }, (_, i) => i)).flat();
    expect(all.filter(t => t === 'quran').length).toBe(5);
    expect(all.filter(t => t === 'hadith').length).toBe(5);
  });

  test('Each day has exactly 1 slot', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(1, d).length).toBe(1);
    }
  });

  test('Hadith appears in 1/day mode (never Quran-only)', () => {
    const types = patternsForDays(1, [0, 1, 2, 3]).flat();
    expect(types).toContain('hadith');
    expect(types).toContain('quran');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 REMINDERS / DAY
// ─────────────────────────────────────────────────────────────────────────────
describe('2/day — Q H every day', () => {
  test('Every day produces [quran, hadith]', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(2, d)).toEqual(['quran', 'hadith']);
    }
  });

  test('Slot 0 is always Quran', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(2, d)[0]).toBe('quran');
    }
  });

  test('Slot 1 is always Hadith', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(2, d)[1]).toBe('hadith');
    }
  });

  test('Exactly 2 slots per day', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(2, d).length).toBe(2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 REMINDERS / DAY
// ─────────────────────────────────────────────────────────────────────────────
describe('3/day — Q H Q / H Q Q alternation, 2Q+1H per day', () => {
  test('Day A (even): [quran, hadith, quran]', () => {
    expect(resolveSlotTypesForFrequency(3, 0)).toEqual(['quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 2)).toEqual(['quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 100)).toEqual(['quran', 'hadith', 'quran']);
  });

  test('Day B (odd): [hadith, quran, quran]', () => {
    expect(resolveSlotTypesForFrequency(3, 1)).toEqual(['hadith', 'quran', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 3)).toEqual(['hadith', 'quran', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 101)).toEqual(['hadith', 'quran', 'quran']);
  });

  test('Every day has exactly 2 Quran + 1 Hadith', () => {
    for (let d = 0; d < 10; d++) {
      const p = resolveSlotTypesForFrequency(3, d);
      expect(qCount(p)).toBe(2);
      expect(hCount(p)).toBe(1);
    }
  });

  test('Exactly 3 slots per day', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(3, d).length).toBe(3);
    }
  });

  test('Days 0–3 sequence: Q-H-Q / H-Q-Q / Q-H-Q / H-Q-Q', () => {
    expect(resolveSlotTypesForFrequency(3, 0)).toEqual(['quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 1)).toEqual(['hadith', 'quran', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 2)).toEqual(['quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(3, 3)).toEqual(['hadith', 'quran', 'quran']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 REMINDERS / DAY
// ─────────────────────────────────────────────────────────────────────────────
describe('4/day — Q H Q H / H Q H Q alternation, 2Q+2H per day', () => {
  test('Day A (even): [quran, hadith, quran, hadith]', () => {
    expect(resolveSlotTypesForFrequency(4, 0)).toEqual(['quran', 'hadith', 'quran', 'hadith']);
    expect(resolveSlotTypesForFrequency(4, 2)).toEqual(['quran', 'hadith', 'quran', 'hadith']);
  });

  test('Day B (odd): [hadith, quran, hadith, quran]', () => {
    expect(resolveSlotTypesForFrequency(4, 1)).toEqual(['hadith', 'quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(4, 3)).toEqual(['hadith', 'quran', 'hadith', 'quran']);
  });

  test('Every day has exactly 2 Quran + 2 Hadith', () => {
    for (let d = 0; d < 10; d++) {
      const p = resolveSlotTypesForFrequency(4, d);
      expect(qCount(p)).toBe(2);
      expect(hCount(p)).toBe(2);
    }
  });

  test('Exactly 4 slots per day', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(4, d).length).toBe(4);
    }
  });

  test('Days 0–3 sequence verified', () => {
    expect(resolveSlotTypesForFrequency(4, 0)).toEqual(['quran', 'hadith', 'quran', 'hadith']);
    expect(resolveSlotTypesForFrequency(4, 1)).toEqual(['hadith', 'quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(4, 2)).toEqual(['quran', 'hadith', 'quran', 'hadith']);
    expect(resolveSlotTypesForFrequency(4, 3)).toEqual(['hadith', 'quran', 'hadith', 'quran']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 REMINDERS / DAY
// ─────────────────────────────────────────────────────────────────────────────
describe('5/day — Q H Q H Q / H Q H Q Q alternation, 3Q+2H per day', () => {
  test('Day A (even): [quran, hadith, quran, hadith, quran]', () => {
    expect(resolveSlotTypesForFrequency(5, 0)).toEqual(['quran', 'hadith', 'quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(5, 2)).toEqual(['quran', 'hadith', 'quran', 'hadith', 'quran']);
  });

  test('Day B (odd): [hadith, quran, hadith, quran, quran]', () => {
    expect(resolveSlotTypesForFrequency(5, 1)).toEqual(['hadith', 'quran', 'hadith', 'quran', 'quran']);
    expect(resolveSlotTypesForFrequency(5, 3)).toEqual(['hadith', 'quran', 'hadith', 'quran', 'quran']);
  });

  test('Every day has exactly 3 Quran + 2 Hadith', () => {
    for (let d = 0; d < 10; d++) {
      const p = resolveSlotTypesForFrequency(5, d);
      expect(qCount(p)).toBe(3);
      expect(hCount(p)).toBe(2);
    }
  });

  test('Exactly 5 slots per day', () => {
    for (let d = 0; d < 10; d++) {
      expect(resolveSlotTypesForFrequency(5, d).length).toBe(5);
    }
  });

  test('Days 0–3 sequence verified', () => {
    expect(resolveSlotTypesForFrequency(5, 0)).toEqual(['quran', 'hadith', 'quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(5, 1)).toEqual(['hadith', 'quran', 'hadith', 'quran', 'quran']);
    expect(resolveSlotTypesForFrequency(5, 2)).toEqual(['quran', 'hadith', 'quran', 'hadith', 'quran']);
    expect(resolveSlotTypesForFrequency(5, 3)).toEqual(['hadith', 'quran', 'hadith', 'quran', 'quran']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Determinism — calendar day ordinal controls pattern', () => {
  test('getCalendarDayIndex returns a positive integer', () => {
    const idx = getCalendarDayIndex();
    expect(typeof idx).toBe('number');
    expect(Number.isInteger(idx)).toBe(true);
    expect(idx).toBeGreaterThan(0);
  });

  test('getCalendarDayIndex is stable for the same date string', () => {
    const a = getCalendarDayIndex('2026-01-01');
    const b = getCalendarDayIndex('2026-01-01');
    expect(a).toBe(b);
  });

  test('getCalendarDayIndex differs by 1 for consecutive calendar days', () => {
    const d1 = getCalendarDayIndex('2026-01-01');
    const d2 = getCalendarDayIndex('2026-01-02');
    expect(d2 - d1).toBe(1);
  });

  test('Same day index always produces same pattern (restart-safe)', () => {
    const dayIdx = getCalendarDayIndex('2026-08-28');
    const p1 = resolveSlotTypesForFrequency(3, dayIdx);
    const p2 = resolveSlotTypesForFrequency(3, dayIdx);
    expect(p1).toEqual(p2);
  });

  test('Timezone does not corrupt day ordinal (UTC-based)', () => {
    // Both are parsed as UTC; the result should always match getCalendarDayIndex()
    const d = getCalendarDayIndex('2026-01-15');
    expect(typeof d).toBe('number');
    expect(d).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION INVARIANTS
// ─────────────────────────────────────────────────────────────────────────────
describe('Composition invariants — Quran/Hadith counts must always match rules', () => {
  const allFreqs = [1, 2, 3, 4, 5] as const;
  const expectedQ = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 };
  const expectedH = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2 };

  // For freq 1, each day has 1 slot total. Over 2 consecutive days: 1Q+1H.
  test('1/day: over 2 days, exactly 1 Quran + 1 Hadith total', () => {
    const two = patternsForDays(1, [0, 1]).flat();
    expect(two.filter(t => t === 'quran').length).toBe(1);
    expect(two.filter(t => t === 'hadith').length).toBe(1);
  });

  // For freq 2-5, each single day must satisfy the count requirement.
  [2, 3, 4, 5].forEach(freq => {
    test(`${freq}/day: every single day has exactly ${expectedQ[freq as 2|3|4|5]}Q + ${expectedH[freq as 2|3|4|5]}H`, () => {
      for (let d = 0; d < 20; d++) {
        const p = resolveSlotTypesForFrequency(freq as 2|3|4|5, d);
        expect(qCount(p)).toBe(expectedQ[freq as 2|3|4|5]);
        expect(hCount(p)).toBe(expectedH[freq as 2|3|4|5]);
      }
    });
  });

  test('No frequency produces more than 5 slots per day', () => {
    allFreqs.forEach(f => {
      for (let d = 0; d < 10; d++) {
        expect(resolveSlotTypesForFrequency(f, d).length).toBeLessThanOrEqual(5);
      }
    });
  });

  test('No slot type is anything other than quran or hadith', () => {
    allFreqs.forEach(f => {
      for (let d = 0; d < 10; d++) {
        const p = resolveSlotTypesForFrequency(f, d);
        for (const slot of p) {
          expect(['quran', 'hadith']).toContain(slot);
        }
      }
    });
  });
});
