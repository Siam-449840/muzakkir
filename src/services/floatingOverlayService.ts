/**
 * floatingOverlayService.ts
 *
 * Native bridge client for Android WindowManager TYPE_APPLICATION_OVERLAY floating reminders.
 * Provides runtime permission checking, permission request intent launcher,
 * and floating reminder trigger across any active app.
 */

import { NativeModules, Platform } from 'react-native';

const FloatingOverlay = NativeModules?.FloatingOverlay;

export interface FloatingReminderPayload {
  content_id: string;
  content_type: 'quran' | 'hadith';
  reference: string;
  arabic: string;
  translation: string;
  badge?: string;
  category?: string;
  reflection?: string;
  narrator?: string;
  grade?: string;
  chapter_title?: string;
  section_title?: string;
  note?: string;
  collection_key?: string;
  hadith_number?: string | number;
  surah_number?: string | number;
  ayah_start?: string | number;
  ayah_end?: string | number;
  language?: string;
  dateStr?: string;
  timeStr?: string;
}

/**
 * Checks whether SYSTEM_ALERT_WINDOW ("Display over other apps") permission is granted.
 * Always returns false on iOS (since arbitrary cross-app window overlays are restricted).
 */
export async function canDrawOverlays(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    return await FloatingOverlay.canDrawOverlays();
  } catch (err) {
    console.warn('[FloatingOverlay] canDrawOverlays error:', err);
    return false;
  }
}

/**
 * Launches the Android system settings screen for "Display over other apps"
 * so the user can grant permission directly.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    return await FloatingOverlay.requestOverlayPermission();
  } catch (err) {
    console.warn('[FloatingOverlay] requestOverlayPermission error:', err);
    return false;
  }
}

/**
 * Triggers the native WindowManager overlay floating card over any open app.
 * If permission is not granted, returns false so the caller can fall back to
 * a high-priority heads-up notification.
 */
function sanitizePayload(payload: FloatingReminderPayload) {
  return {
    ...payload,
    hadith_number: payload.hadith_number != null ? String(payload.hadith_number) : undefined,
    surah_number: payload.surah_number != null ? String(payload.surah_number) : undefined,
    ayah_start: payload.ayah_start != null ? String(payload.ayah_start) : undefined,
    ayah_end: payload.ayah_end != null ? String(payload.ayah_end) : undefined,
  };
}

export async function showFloatingReminder(payload: FloatingReminderPayload): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    const hasPermission = await canDrawOverlays();
    if (!hasPermission) {
      return false;
    }
    await FloatingOverlay.showFloatingReminder(sanitizePayload(payload));
    return true;
  } catch (err) {
    console.warn('[FloatingOverlay] showFloatingReminder error:', err);
    return false;
  }
}

/**
 * Dismisses any currently visible native floating reminder overlay.
 */
export async function dismissFloatingReminder(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    await FloatingOverlay.dismissFloatingReminder();
    return true;
  } catch (err) {
    console.warn('[FloatingOverlay] dismissFloatingReminder error:', err);
    return false;
  }
}

/**
 * Checks whether SCHEDULE_EXACT_ALARM is allowed on Android 12+ (API 31+).
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return true;
  }
  try {
    return await FloatingOverlay.canScheduleExactAlarms();
  } catch (err) {
    console.warn('[FloatingOverlay] canScheduleExactAlarms error:', err);
    return false;
  }
}

/**
 * Directs user to Alarms & Reminders system settings if exact alarms are not allowed.
 */
export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    return await FloatingOverlay.requestExactAlarmPermission();
  } catch (err) {
    console.warn('[FloatingOverlay] requestExactAlarmPermission error:', err);
    return false;
  }
}

/**
 * Schedules a native exact alarm via AlarmManager with RTC_WAKEUP.
 * When the alarm fires, ReminderAlarmReceiver triggers the native floating overlay card
 * directly over WhatsApp/YouTube if overlay permission is granted, or falls back to
 * a high-priority heads-up notification if not.
 */
export async function scheduleExactReminderAlarm(
  triggerAtMillis: number,
  payload: FloatingReminderPayload
): Promise<{ scheduled: boolean; exact: boolean }> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return { scheduled: false, exact: false };
  }
  try {
    return await FloatingOverlay.scheduleExactReminderAlarm(triggerAtMillis, sanitizePayload(payload));
  } catch (err) {
    console.warn('[FloatingOverlay] scheduleExactReminderAlarm error:', err);
    return { scheduled: false, exact: false };
  }
}

/**
 * Cancels a previously scheduled exact reminder alarm by contentId.
 */
export async function cancelReminderAlarm(contentId: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    return await FloatingOverlay.cancelReminderAlarm(contentId);
  } catch (err) {
    console.warn('[FloatingOverlay] cancelReminderAlarm error:', err);
    return false;
  }
}

/**
 * Cancels all previously scheduled exact reminder alarms in Android AlarmManager
 * and clears the native persistent alarm storage.
 */
export async function cancelAllReminderAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return false;
  }
  try {
    return await FloatingOverlay.cancelAllReminderAlarms();
  } catch (err) {
    console.warn('[FloatingOverlay] cancelAllReminderAlarms error:', err);
    return false;
  }
}

/**
 * Checks for reminder intent extras when the app is launched via [See More] on the floating card.
 */
export async function getInitialReminderLaunchIntent(): Promise<{
  content_id: string;
  content_type: 'quran' | 'hadith';
  collection_key?: string;
  hadith_number?: string;
  chapter_id?: string;
  section_id?: string;
  chapter_title?: string;
  section_title?: string;
  surah_number?: string;
  ayah_start?: string;
  ayah_end?: string;
} | null> {
  if (Platform.OS !== 'android' || !FloatingOverlay) {
    return null;
  }
  try {
    return await FloatingOverlay.getInitialReminderLaunchIntent();
  } catch (err) {
    console.warn('[FloatingOverlay] getInitialReminderLaunchIntent error:', err);
    return null;
  }
}

/**
 * Subscribes to [See More] clicks from the floating card when the app was already running in background.
 */
export function subscribeToFloatingReminderSeeMore(
  onSeeMore: (
    contentId: string,
    contentType: 'quran' | 'hadith',
    metadata?: {
      collection_key?: string;
      hadith_number?: string;
      chapter_id?: string;
      section_id?: string;
      chapter_title?: string;
      section_title?: string;
      surah_number?: string;
      ayah_start?: string;
      ayah_end?: string;
    }
  ) => void
): { remove: () => void } {
  if (Platform.OS !== 'android') {
    return { remove: () => {} };
  }
  const { DeviceEventEmitter } = require('react-native');
  const subscription = DeviceEventEmitter.addListener(
    'onFloatingReminderSeeMore',
    (data: {
      content_id: string;
      content_type: 'quran' | 'hadith';
      collection_key?: string;
      hadith_number?: string;
      chapter_id?: string;
      section_id?: string;
      chapter_title?: string;
      section_title?: string;
      surah_number?: string;
      ayah_start?: string;
      ayah_end?: string;
    }) => {
      if (data?.content_id) {
        onSeeMore(data.content_id, data.content_type || 'quran', data);
      }
    }
  );
  return subscription;
}


