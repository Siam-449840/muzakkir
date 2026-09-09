/**
 * permissionGateService.ts
 *
 * Central authoritative capability manager for Muzakkir.
 * Provides unified, single-source-of-truth runtime verification and request launchers
 * for the 3 core Android reminder capabilities:
 * 1. POST_NOTIFICATIONS (Android 13+ runtime notification delivery)
 * 2. SYSTEM_ALERT_WINDOW (WindowManager TYPE_APPLICATION_OVERLAY floating reminders)
 * 3. SCHEDULE_EXACT_ALARM (Android 12+ RTC_WAKEUP exact timing)
 *
 * Guaranteed real-time checking: Never assumes returning from Settings equals granted.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  canDrawOverlays,
  requestOverlayPermission,
  canScheduleExactAlarms,
  requestExactAlarmPermission,
} from './floatingOverlayService';

export type CapabilityType = 'notifications' | 'overlay' | 'exactAlarm';

export interface PermissionGateStatus {
  allGranted: boolean;
  notifications: boolean;
  overlay: boolean;
  exactAlarm: boolean;
  missing: CapabilityType[];
}

/**
 * Checks whether Android 13+ POST_NOTIFICATIONS (or iOS notification) is granted.
 */
export async function isNotificationGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[permissionGateService] isNotificationGranted error:', err);
    return false;
  }
}

/**
 * Requests notification permission from the OS dialog.
 */
export async function requestNotificationCapability(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return status === 'granted';
  } catch (err) {
    console.warn('[permissionGateService] requestNotificationCapability error:', err);
    return false;
  }
}

/**
 * Checks whether SYSTEM_ALERT_WINDOW ("Display over other apps") is granted.
 * Always true on non-Android platforms (as overlay capability is Android-specific).
 */
export async function isOverlayGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return await canDrawOverlays();
}

/**
 * Opens Android Special App Access screen for "Display over other apps".
 */
export async function requestOverlayCapability(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return await requestOverlayPermission();
}

/**
 * Checks whether SCHEDULE_EXACT_ALARM is authorized (Android 12+ / API 31+).
 * Always true on pre-API 31 and non-Android platforms.
 */
export async function isExactAlarmGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return await canScheduleExactAlarms();
}

/**
 * Opens Android "Alarms & Reminders" special access screen.
 */
export async function requestExactAlarmCapability(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return await requestExactAlarmPermission();
}

/**
 * Authoritative evaluation of all 3 required capabilities.
 * The core reminder engine requires all 3 to be available.
 */
export async function checkAllRequiredCapabilities(): Promise<PermissionGateStatus> {
  const [notifications, overlay, exactAlarm] = await Promise.all([
    isNotificationGranted(),
    isOverlayGranted(),
    isExactAlarmGranted(),
  ]);

  const missing: CapabilityType[] = [];
  if (!notifications) missing.push('notifications');
  if (!overlay) missing.push('overlay');
  if (!exactAlarm) missing.push('exactAlarm');

  return {
    allGranted: missing.length === 0,
    notifications,
    overlay,
    exactAlarm,
    missing,
  };
}
