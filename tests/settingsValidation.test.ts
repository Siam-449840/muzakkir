import { isValid24hTime } from '../src/utils/time';
import { defaultSettings } from '../src/database/db';

describe('Settings & Time Validation Production Tests', () => {
  test('isValid24hTime accepts valid 24h times', () => {
    expect(isValid24hTime('00:00')).toBe(true);
    expect(isValid24hTime('08:30')).toBe(true);
    expect(isValid24hTime('12:00')).toBe(true);
    expect(isValid24hTime('19:45')).toBe(true);
    expect(isValid24hTime('23:59')).toBe(true);
  });

  test('isValid24hTime rejects invalid time strings', () => {
    expect(isValid24hTime('24:00')).toBe(false);
    expect(isValid24hTime('12:60')).toBe(false);
    expect(isValid24hTime('8:30')).toBe(false); // Must be padded 2 digits
    expect(isValid24hTime('abc')).toBe(false);
    expect(isValid24hTime('')).toBe(false);
    expect(isValid24hTime('99:99')).toBe(false);
  });

  test('Default user settings are valid and safe for production', () => {
    expect(defaultSettings.reminder_enabled).toBe(true);
    expect(defaultSettings.daily_frequency).toBe(3);
    expect(defaultSettings.reminder_times).toHaveLength(3);
    for (const t of defaultSettings.reminder_times) {
      expect(isValid24hTime(t)).toBe(true);
    }
    expect(defaultSettings.cooldown_days).toBe(60);
    expect(isValid24hTime(defaultSettings.quiet_hours_start)).toBe(true);
    expect(isValid24hTime(defaultSettings.quiet_hours_end)).toBe(true);
  });
});
