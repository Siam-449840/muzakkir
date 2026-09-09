import {
  getCalendarDayIndex,
  resolveSlotTypesForFrequency,
  generateDailySchedule
} from '../src/services/contentEngine';
import { defaultSettings } from '../src/database/db';
import { UserSettings } from '../src/types';

describe('Deterministic Calendar-Day Scheduling Tests', () => {
  test('getCalendarDayIndex produces deterministic consecutive integers for sequential calendar dates', () => {
    const day1Index = getCalendarDayIndex('2026-08-28');
    const day2Index = getCalendarDayIndex('2026-08-29');
    const day3Index = getCalendarDayIndex('2026-08-30');

    expect(day2Index).toBe(day1Index + 1);
    expect(day3Index).toBe(day2Index + 1);
  });

  test('1/day frequency strictly alternates between Quran and Hadith based on calendar date', async () => {
    const settings: UserSettings = {
      ...defaultSettings,
      daily_frequency: 1,
      reminder_times: ['08:00'],
    };

    const scheduleDay1 = await generateDailySchedule(settings, '2026-08-28');
    const scheduleDay2 = await generateDailySchedule(settings, '2026-08-29');
    const scheduleDay3 = await generateDailySchedule(settings, '2026-08-30');

    expect(scheduleDay1.slots[0].content_type).not.toEqual(scheduleDay2.slots[0].content_type);
    expect(scheduleDay1.slots[0].content_type).toEqual(scheduleDay3.slots[0].content_type);
  });

  test('Reboot / multiple schedule calls on the same date produce the exact same slot types', async () => {
    const settings: UserSettings = {
      ...defaultSettings,
      daily_frequency: 1,
      reminder_times: ['08:00'],
    };

    const run1 = await generateDailySchedule(settings, '2026-08-28');
    const run2 = await generateDailySchedule(settings, '2026-08-28');

    expect(run1.slots[0].content_type).toBe(run2.slots[0].content_type);
  });
});
