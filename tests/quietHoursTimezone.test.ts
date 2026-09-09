import { isTimeInQuietHours } from '../src/services/notificationService';
import { formatTime12h, getNextReminderSlot, formatTimeRemaining } from '../src/utils/time';

describe('Quiet Hours & Timezone Calculator Tests', () => {
  test('Correctly identifies times within quiet hours spanning midnight (22:00 to 07:00)', () => {
    const start = '22:00';
    const end = '07:00';

    expect(isTimeInQuietHours('23:30', start, end)).toBe(true);
    expect(isTimeInQuietHours('02:00', start, end)).toBe(true);
    expect(isTimeInQuietHours('06:59', start, end)).toBe(true);
    expect(isTimeInQuietHours('22:00', start, end)).toBe(true);
    expect(isTimeInQuietHours('07:00', start, end)).toBe(true);

    // Active daytime hours should NOT be quiet
    expect(isTimeInQuietHours('08:00', start, end)).toBe(false);
    expect(isTimeInQuietHours('12:30', start, end)).toBe(false);
    expect(isTimeInQuietHours('19:00', start, end)).toBe(false);
    expect(isTimeInQuietHours('21:59', start, end)).toBe(false);
  });

  test('Correctly identifies times within daytime quiet hours (13:00 to 15:00)', () => {
    const start = '13:00';
    const end = '15:00';

    expect(isTimeInQuietHours('14:00', start, end)).toBe(true);
    expect(isTimeInQuietHours('13:00', start, end)).toBe(true);
    expect(isTimeInQuietHours('15:00', start, end)).toBe(true);

    expect(isTimeInQuietHours('12:59', start, end)).toBe(false);
    expect(isTimeInQuietHours('16:00', start, end)).toBe(false);
  });

  test('formatTime12h converts 24h format to clean 12h display', () => {
    expect(formatTime12h('08:00')).toBe('8:00 AM');
    expect(formatTime12h('12:30')).toBe('12:30 PM');
    expect(formatTime12h('14:45')).toBe('2:45 PM');
    expect(formatTime12h('20:00')).toBe('8:00 PM');
    expect(formatTime12h('00:15')).toBe('12:15 AM');
  });

  test('getNextReminderSlot calculates correct upcoming slot', () => {
    const times = ['08:00', '14:00', '20:00'];
    const next = getNextReminderSlot(times);
    expect(next.nextIndex).toBeGreaterThanOrEqual(0);
    expect(next.nextIndex).toBeLessThan(3);
    expect(times).toContain(next.nextTime);
  });
});
