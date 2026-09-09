/**
 * notificationService.ts
 *
 * Schedules a rolling 7-day window of one-time (non-repeating) local notifications
 * so that content changes every calendar day. The window is refreshed on every app
 * resume via App.tsx → scheduleNotificationsForSettings().
 *
 * Quiet-hours rule: if a slot falls inside the quiet window, shift it forward to the
 * NEXT occurrence of quiet_hours_end that is strictly AFTER the original time —
 * never backward. Collisions caused by multiple shifts are resolved with +1-minute
 * offsets per duplicate, preserving the 5-reminder/day maximum.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserSettings, DailySchedule } from '../types';
import { recordHistoryEvent, getHadithDailyPool } from '../database/db';
import { generateDailySchedule } from './contentEngine';
import { resolveHadeethEncTranslation } from '../database/reminderRepository';
import { getHadithById } from '../database/hadithRepository';
import { scheduleExactReminderAlarm, cancelAllReminderAlarms } from './floatingOverlayService';

// Number of future calendar days to pre-schedule.
// iOS allows 64 scheduled local notifications; 5 slots × 7 days = 35 max.
const SCHEDULE_WINDOW_DAYS = 7;

// ── Foreground presentation handler ─────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Required on newer SDK versions for foreground visibility
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Android notification channels ────────────────────────────────────────────

/**
 * Creates two Android channels: one with vibration, one without.
 * Channel selection per notification is done at schedule time via
 * the content's android channelId (see scheduleNotificationsForSettings).
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reminder-vibrate', {
    name: 'Muzakkir Reminders',
    description: 'Daily spiritual Quran & Hadith reflections',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lightColor: '#0A4D3C',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    enableLights: true,
  });

  await Notifications.setNotificationChannelAsync('reminder-silent', {
    name: 'Muzakkir Reminders (Silent)',
    description: 'Daily spiritual Quran & Hadith reflections without vibration',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [],
    enableVibrate: false,
    lightColor: '#0A4D3C',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });
}

// ── Permissions ──────────────────────────────────────────────────────────────

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// ── Quiet-hours helpers ───────────────────────────────────────────────────────

/**
 * Returns true when timeStr (HH:MM) falls inside the quiet-hours window.
 * Correctly handles overnight windows (e.g. 22:00–07:00).
 */
export function isTimeInQuietHours(
  timeStr: string,
  quietStart: string,
  quietEnd: string
): boolean {
  const [h, m] = timeStr.split(':').map(Number);
  const [startH, startM] = quietStart.split(':').map(Number);
  const [endH, endM] = quietEnd.split(':').map(Number);

  const target = h * 60 + m;
  const start  = startH * 60 + startM;
  const end    = endH * 60 + endM;

  // Same-day interval (e.g. 13:00–15:00)
  if (start <= end) return target >= start && target <= end;

  // Overnight interval crossing midnight (e.g. 22:00–07:00)
  return target >= start || target <= end;
}

/**
 * Shifts scheduledDate forward to the NEXT occurrence of quietEndTime
 * that is strictly AFTER scheduledDate. Never moves a reminder backward.
 *
 * Examples (quiet hours 22:00–07:00):
 *   06:30 same day → 07:00 same day   (07:00 > 06:30 ✓)
 *   00:30 same day → 07:00 same day   (07:00 > 00:30 ✓)
 *   22:30 same day → 07:00 next day   (07:00 same day < 22:30, so +1 day)
 *   23:30 same day → 07:00 next day
 */
export function shiftToNextValidTime(scheduledDate: Date, quietEndTime: string): Date {
  const [endH, endM] = quietEndTime.split(':').map(Number);

  // Candidate: quiet_hours_end on the same calendar day
  const sameDay = new Date(scheduledDate);
  sameDay.setHours(endH, endM, 0, 0);

  if (sameDay > scheduledDate) return sameDay;

  // quiet_hours_end has already passed today — move to next calendar day
  const nextDay = new Date(scheduledDate);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(endH, endM, 0, 0);
  return nextDay;
}

/**
 * When multiple slots shift to the same minute, add +1 min per collision
 * so they remain ordered and distinct. Deterministic and collision-free.
 */
function deduplicateTriggerDates(dates: Date[]): Date[] {
  // Key by "YYYY-MM-DD HH:MM"
  const seen = new Map<string, number>();
  return dates.map(date => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return date;
    return new Date(date.getTime() + count * 60_000);
  });
}

// ── Primary scheduling entry point ───────────────────────────────────────────

/**
 * Cancels all existing local notifications and schedules a fresh 7-day rolling
 * window of one-time date-triggered notifications.
 *
 * Call this on:
 *   • First app launch (App.tsx initApp)
 *   • Every app foreground resume (App.tsx AppState listener)
 *   • Any settings change (SettingsScreen persistSettings)
 *
 * Invariant: Day N content ≠ Day N-1 content (enforced by per-day cache in
 * contentEngine + cooldown rules), unless the candidate pool is genuinely exhausted.
 */
export async function scheduleNotificationsForSettings(settings: UserSettings): Promise<void> {
  if (!settings.reminder_enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await cancelAllReminderAlarms();
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await cancelAllReminderAlarms();

  const now = new Date();
  // Choose Android channel based on vibration preference
  const channelId = settings.vibration_enabled ? 'reminder-vibrate' : 'reminder-silent';

  for (let dayOffset = 0; dayOffset < SCHEDULE_WINDOW_DAYS; dayOffset++) {
    // Build the target calendar date (local midnight)
    const targetMidnight = new Date(now);
    targetMidnight.setDate(now.getDate() + dayOffset);
    targetMidnight.setHours(0, 0, 0, 0);
    const dateStr = [
      targetMidnight.getFullYear(),
      String(targetMidnight.getMonth() + 1).padStart(2, '0'),
      String(targetMidnight.getDate()).padStart(2, '0'),
    ].join('-'); // YYYY-MM-DD without timezone drift from toISOString

    // Get content for this specific calendar day (uses per-day cache for stability)
    const daySchedule = await generateDailySchedule(settings, dateStr);
    if (!daySchedule.slots.length) continue;

    // 1. Compute raw trigger Date objects for each slot
    const rawTriggers: Date[] = daySchedule.slots.map(slot => {
      const [h, m] = slot.time.split(':').map(Number);
      const t = new Date(targetMidnight);
      t.setHours(h, m, 0, 0);
      return t;
    });

    // 2. Shift any slots that fall inside quiet hours (forward only)
    const shiftedTriggers: Date[] = rawTriggers.map((trigger, i) => {
      if (
        settings.quiet_hours_enabled &&
        isTimeInQuietHours(
          daySchedule.slots[i].time,
          settings.quiet_hours_start,
          settings.quiet_hours_end
        )
      ) {
        return shiftToNextValidTime(trigger, settings.quiet_hours_end);
      }
      return trigger;
    });

    // 3. Resolve collisions (multiple slots shifted to the same minute)
    const finalTriggers = deduplicateTriggerDates(shiftedTriggers);

    // 4. Schedule each slot
    for (let i = 0; i < daySchedule.slots.length; i++) {
      const slot = daySchedule.slots[i];
      if (!slot.item) continue;

      const triggerDate = finalTriggers[i];
      const secondsUntil = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
      if (secondsUntil <= 0) continue; // already in the past — skip

      const item = slot.item;
      const isQuran = item.content_type === 'quran';
      const userLang = settings.preferred_language;

      // ── Translation resolution ─────────────────────────────────────────────
      // For HadeethEnc records (content_id starts with 'henc_'):
      //   - use resolveHadeethEncTranslation() which returns the user's
      //     preferred language directly when a verified translation exists.
      //   - NO English fallback for the 10 languages HadeethEnc has verified.
      // For all other records (Quran, master Hadith corpus):
      //   - use the standard translation map with preferred → 'en' → 'ar' cascade.
      let notifText = '';
      let resolvedLang = userLang as string;
      let isFallback = false;

      if (!isQuran && item.content_id.startsWith('henc_')) {
        try {
          const pool = getHadithDailyPool();
          const rec = pool.hadiths.find(r => r.content_id === item.content_id);
          if (rec) {
            const resolved = resolveHadeethEncTranslation(
              rec.translations as Record<string, { text: string }>,
              rec.hadeethenc_id ?? 0,
              userLang
            );
            notifText    = resolved.text;
            resolvedLang = resolved.lang;
            isFallback   = resolved.isFallback;
          }
        } catch (e) {
          console.warn('[Notification] Hadith daily pool load error:', e);
        }
      }

      // Fallback for non-HadeethEnc items or unresolvable HadeethEnc records
      if (!notifText) {
        notifText =
          item.translations?.[userLang] ||
          item.translations?.['en']      ||
          item.translations?.['bn']      ||
          item.translations?.['ar']      ||
          '';
      }

      const excerpt = notifText.length > 140 ? notifText.substring(0, 137) + '...' : notifText;

      const isBengali = resolvedLang === 'bn';
      let refStr = '';
      if (isQuran) {
        const surahName = item.reference.surah_name || '';
        const surahNum = item.reference.surah_number;
        const ayahStart = item.reference.ayah_start || item.reference.ayah_number || 1;
        const ayahEnd = item.reference.ayah_end || ayahStart;
        const ayahRangeStr = ayahStart === ayahEnd ? `${ayahStart}` : `${ayahStart}–${ayahEnd}`;
        refStr = isBengali
          ? `সূরা ${surahName} [${surahNum}:${ayahRangeStr}]`
          : `Surah ${surahName} [${surahNum}:${ayahRangeStr}]`;
      } else {
        const coll = item.reference.collection || item.reference.collection_key || 'হাদিস';
        refStr = `${coll}, #${item.reference.hadith_number || 1}`;
      }

      const title = isQuran
        ? (isBengali
            ? `কুরআন • ${refStr}`
            : `Quran • ${refStr}`)
        : (isBengali
            ? `সহিহ হাদিস • ${refStr}`
            : `Hadith • ${refStr}`);

      const defaultBadge = isQuran
        ? (isBengali ? 'কুরআনুল কারীম' : 'The Noble Quran')
        : (isBengali ? 'সহিহ হাদিস' : 'Sahih Hadith');

      const defaultCategory = isBengali ? 'দৈনিক স্মরণ' : 'Daily Reminder';

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: excerpt,
          data: {
            content_id:        item.content_id,
            content_type:      item.content_type,
            slot_index:        slot.slot_index,
            scheduled_date:    dateStr,
            // Carry the resolved language so the detail screen opens the
            // same translated text the notification showed.
            preferred_language: resolvedLang,
            is_fallback_lang:  isFallback,
          },
          // On Android the channel controls sound; on iOS we pass sound explicitly.
          sound: settings.sound_enabled ? 'default' : undefined,
          categoryIdentifier: 'ISLAMIC_REMINDER',
          ...(Platform.OS === 'android'
            ? { android: { channelId } }
            : {}),
        },
        // P0-3 FIX: Use absolute Date trigger so the notification fires at the
        // exact device-local clock time, unaffected by calculation drift or
        // the time elapsed between scheduling and trigger evaluation.
        trigger: { date: triggerDate } as any,
      });

      // Android Native WindowManager Overlay: Schedule exact alarm to launch floating card directly over active apps
      if (Platform.OS === 'android') {
        // Arabic Matn: full authentic text preserved for BOTH Quran and Hadith
        const arabicText = item.translations?.['ar'] || '';

        // Hadith / Quran rich metadata resolution
        let narrator = (item.reference as any)?.narrator || '';
        let gradeBn = (item.reference as any)?.grade_bn || (item.reference as any)?.authenticity_status || '';
        let chapterTitle = (item.reference as any)?.chapter_title || '';
        let sectionTitle = (item.reference as any)?.section_title || '';
        let note = (item.reference as any)?.note || '';

        if (!isQuran && (!narrator || !chapterTitle)) {
          try {
            const fullRecord = await getHadithById(item.content_id);
            if (fullRecord) {
              narrator = narrator || fullRecord.narrator || '';
              gradeBn = gradeBn || fullRecord.grade_bn || fullRecord.authenticity?.collection_status || '';
              chapterTitle = chapterTitle || fullRecord.reference.chapter_title || '';
              sectionTitle = sectionTitle || fullRecord.reference.section_title || '';
              note = note || fullRecord.note || '';
            }
          } catch (e) {
            // non-fatal
          }
        }

        await scheduleExactReminderAlarm(triggerDate.getTime(), {
          content_id: item.content_id,
          content_type: item.content_type as 'quran' | 'hadith',
          reference: refStr,
          arabic: arabicText,
          translation: notifText,
          badge: (item as any).context_badge || defaultBadge,
          category: (item as any).emotive_category || (item as any).topic || defaultCategory,
          reflection: (item as any).practical_reflection,
          narrator,
          grade: gradeBn,
          chapter_title: chapterTitle,
          section_title: sectionTitle,
          note,
          collection_key: String((item.reference as any)?.collection_key || ''),
          hadith_number: String((item.reference as any)?.hadith_number || ''),
          surah_number: String((item.reference as any)?.surah_number || ''),
          ayah_start: String((item.reference as any)?.ayah_start || ''),
          ayah_end: String((item.reference as any)?.ayah_end || ''),
          language: resolvedLang,
          dateStr,
          timeStr: slot.time,
        });
      }

      // Record a 'scheduled' history event (content_id + trigger datetime)
      await recordHistoryEvent({
        content_id:     item.content_id,
        content_type:   item.content_type,
        scheduled_time: triggerDate.toISOString(),
        status:         'scheduled',
      });
    }
  }
}

// ── Notification response handlers ───────────────────────────────────────────

/**
 * Checks for the notification that launched the app from a terminated state.
 */
export async function checkInitialNotification(
  onOpen: (contentId: string, contentType: 'quran' | 'hadith') => void
): Promise<void> {
  const lastResponse = await Notifications.getLastNotificationResponseAsync();
  if (lastResponse?.notification?.request?.content?.data) {
    const data = lastResponse.notification.request.content.data;
    if (data.content_id && data.content_type) {
      onOpen(data.content_id as string, data.content_type as 'quran' | 'hadith');
    }
  }
}

/**
 * Subscribes to notification response clicks (background tap + foreground tap).
 */
export function subscribeToNotificationResponses(
  onOpen: (contentId: string, contentType: 'quran' | 'hadith') => void
): { remove: () => void } {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.content_id && data?.content_type) {
      onOpen(data.content_id as string, data.content_type as 'quran' | 'hadith');
    }
  });
}

/**
 * Subscribes to notifications received while the app is in the foreground.
 * Used by App.tsx to trigger the foreground FloatingReminder card.
 */
export function subscribeToNotificationsReceived(
  onReceived: (contentId: string, contentType: 'quran' | 'hadith') => void
): { remove: () => void } {
  return Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    if (data?.content_id && data?.content_type) {
      onReceived(data.content_id as string, data.content_type as 'quran' | 'hadith');
    }
  });
}

/**
 * @deprecated Use scheduleNotificationsForSettings() instead.
 * Kept for backward compatibility with existing call sites and tests.
 */
export async function scheduleDailyNotifications(
  _schedule: DailySchedule,
  settings: UserSettings
): Promise<string[]> {
  await scheduleNotificationsForSettings(settings);
  return [];
}
