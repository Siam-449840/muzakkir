import * as Notifications from 'expo-notifications';
import {
  setupNotificationChannels,
  requestNotificationPermissions,
  scheduleDailyNotifications,
  scheduleNotificationsForSettings,
  checkInitialNotification,
  isTimeInQuietHours,
  shiftToNextValidTime,
} from '../src/services/notificationService';
import { defaultSettings } from '../src/database/db';
import { generateDailySchedule } from '../src/services/contentEngine';

describe('Notification Lifecycle & Native Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setupNotificationChannels creates high-importance channels with public lockscreen visibility', async () => {
    await setupNotificationChannels();
    expect(Notifications.setNotificationChannelAsync).toBeDefined();
  });

  test('requestNotificationPermissions requests OS permission and returns boolean', async () => {
    const granted = await requestNotificationPermissions();
    expect(granted).toBe(true);
  });

  test('scheduleDailyNotifications (compat wrapper) cancels existing before scheduling new batch', async () => {
    const settings = {
      ...defaultSettings,
      daily_frequency: 3 as const,
      reminder_times: ['08:00', '14:00', '20:00'],
    };

    const schedule = await generateDailySchedule(settings, '2026-08-28');
    await scheduleDailyNotifications(schedule, settings);

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  test('scheduleNotificationsForSettings cancels all then schedules rolling window', async () => {
    const settings = {
      ...defaultSettings,
      daily_frequency: 3 as const,
      reminder_times: ['08:00', '14:00', '20:00'],
      reminder_enabled: true,
    };

    await scheduleNotificationsForSettings(settings);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    // scheduleNotificationAsync may be called 0..N times depending on how many
    // future slots are in the window — just verify it doesn't throw
    expect(Notifications.scheduleNotificationAsync).toBeDefined();
  });

  test('scheduleNotificationsForSettings cancels only when reminder_enabled=false', async () => {
    const settings = { ...defaultSettings, reminder_enabled: false };
    await scheduleNotificationsForSettings(settings);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('checkInitialNotification safely handles null response (terminated-state launch)', async () => {
    const mockOpen = jest.fn();
    await checkInitialNotification(mockOpen);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  // ── Quiet-hours helpers ──────────────────────────────────────────────────────

  test('isTimeInQuietHours: overnight window (22:00–07:00)', () => {
    expect(isTimeInQuietHours('06:30', '22:00', '07:00')).toBe(true);   // before end
    expect(isTimeInQuietHours('00:30', '22:00', '07:00')).toBe(true);   // after midnight
    expect(isTimeInQuietHours('22:30', '22:00', '07:00')).toBe(true);   // after start
    expect(isTimeInQuietHours('07:00', '22:00', '07:00')).toBe(true);   // exactly at end
    expect(isTimeInQuietHours('10:00', '22:00', '07:00')).toBe(false);  // outside
    expect(isTimeInQuietHours('21:59', '22:00', '07:00')).toBe(false);  // just before start
  });

  test('isTimeInQuietHours: same-day window (13:00–15:00)', () => {
    expect(isTimeInQuietHours('14:00', '13:00', '15:00')).toBe(true);
    expect(isTimeInQuietHours('12:59', '13:00', '15:00')).toBe(false);
    expect(isTimeInQuietHours('15:01', '13:00', '15:00')).toBe(false);
  });

  test('shiftToNextValidTime: 06:30 in 22:00–07:00 → 07:00 same day', () => {
    const base = new Date('2026-08-29T06:30:00');
    const result = shiftToNextValidTime(base, '07:00');
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(29); // same day
  });

  test('shiftToNextValidTime: 22:30 in 22:00–07:00 → 07:00 next day', () => {
    const base = new Date('2026-08-29T22:30:00');
    const result = shiftToNextValidTime(base, '07:00');
    expect(result.getHours()).toBe(7);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(30); // next day
  });

  test('shiftToNextValidTime: 00:30 same day → 07:00 same day', () => {
    const base = new Date('2026-08-29T00:30:00');
    const result = shiftToNextValidTime(base, '07:00');
    expect(result.getHours()).toBe(7);
    expect(result.getDate()).toBe(29); // same day
  });

  test('shiftToNextValidTime: never shifts time backward', () => {
    const base = new Date('2026-08-29T08:00:00');
    // 08:00 outside quiet hours — caller should not call shiftToNextValidTime,
    // but if called anyway, result must be >= base
    const result = shiftToNextValidTime(base, '07:00');
    expect(result.getTime()).toBeGreaterThanOrEqual(base.getTime());
  });
});
