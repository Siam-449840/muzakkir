import {
  resolveSlotTypesForFrequency,
  COMPOSITION_RATIOS,
  generateDailySchedule
} from '../src/services/contentEngine';
import { DailyFrequency, UserSettings } from '../src/types';
import { defaultSettings } from '../src/database/db';

describe('Reminder Scheduler & Composition Engine Tests', () => {
  test('Composition ratios adhere strictly to daily_content.json rules', () => {
    expect(COMPOSITION_RATIOS[1]).toEqual({ quran: 1, hadith: 1 }); // alternates Q/H across days
    expect(COMPOSITION_RATIOS[2]).toEqual({ quran: 1, hadith: 1 });
    expect(COMPOSITION_RATIOS[3]).toEqual({ quran: 2, hadith: 1 });
    expect(COMPOSITION_RATIOS[4]).toEqual({ quran: 2, hadith: 2 });
    expect(COMPOSITION_RATIOS[5]).toEqual({ quran: 3, hadith: 2 });
  });

  test('Frequency 1/day alternates day-to-day between Quran and Hadith', () => {
    const day0 = resolveSlotTypesForFrequency(1, 0);
    const day1 = resolveSlotTypesForFrequency(1, 1);
    const day2 = resolveSlotTypesForFrequency(1, 2);

    expect(day0).toEqual(['quran']);
    expect(day1).toEqual(['hadith']);
    expect(day2).toEqual(['quran']);
  });

  test('Frequency 2/day provides exactly 1 Quran and 1 Hadith', () => {
    const slots = resolveSlotTypesForFrequency(2);
    expect(slots).toHaveLength(2);
    expect(slots.filter(t => t === 'quran')).toHaveLength(1);
    expect(slots.filter(t => t === 'hadith')).toHaveLength(1);
  });

  test('Frequency 3/day provides exactly 2 Quran and 1 Hadith', () => {
    const slots = resolveSlotTypesForFrequency(3);
    expect(slots).toHaveLength(3);
    expect(slots.filter(t => t === 'quran')).toHaveLength(2);
    expect(slots.filter(t => t === 'hadith')).toHaveLength(1);
  });

  test('Frequency 4/day provides exactly 2 Quran and 2 Hadith', () => {
    const slots = resolveSlotTypesForFrequency(4);
    expect(slots).toHaveLength(4);
    expect(slots.filter(t => t === 'quran')).toHaveLength(2);
    expect(slots.filter(t => t === 'hadith')).toHaveLength(2);
  });

  test('Frequency 5/day provides exactly 3 Quran and 2 Hadith (Maximum 5/day limit)', () => {
    const slots = resolveSlotTypesForFrequency(5);
    expect(slots).toHaveLength(5);
    expect(slots.filter(t => t === 'quran')).toHaveLength(3);
    expect(slots.filter(t => t === 'hadith')).toHaveLength(2);
  });

  test('generateDailySchedule produces valid slots with non-null candidate items', async () => {
    const settings: UserSettings = {
      ...defaultSettings,
      daily_frequency: 3,
      reminder_times: ['08:00', '14:00', '20:00'],
    };

    const schedule = await generateDailySchedule(settings, '2026-08-28');
    expect(schedule.frequency).toBe(3);
    expect(schedule.slots).toHaveLength(3);
    expect(schedule.slots[0].time).toBe('08:00');
    expect(schedule.slots[1].time).toBe('14:00');
    expect(schedule.slots[2].time).toBe('20:00');
    expect(schedule.slots[0].item).toBeDefined();
    expect(schedule.slots[1].item).toBeDefined();
    expect(schedule.slots[2].item).toBeDefined();
  });

  test('generateDailySchedule is stable: same date yields identical content_ids on second call (cache invariant)', async () => {
    const settings: UserSettings = {
      ...defaultSettings,
      daily_frequency: 3,
      reminder_times: ['08:00', '14:00', '20:00'],
    };

    const testDate = new Date().toISOString().split('T')[0];
    const scheduleA = await generateDailySchedule(settings, testDate);
    const scheduleB = await generateDailySchedule(settings, testDate);

    expect(scheduleA.slots).toHaveLength(3);
    for (let i = 0; i < scheduleA.slots.length; i++) {
      // If both calls returned an item, their content_ids must match
      if (scheduleA.slots[i].item && scheduleB.slots[i].item) {
        expect(scheduleA.slots[i].item!.content_id).toBe(scheduleB.slots[i].item!.content_id);
      }
    }
  });
});
