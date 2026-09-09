# Privacy Policy for Muzakkir – Islamic Reminder

**Last Updated:** September 10, 2026  
**Effective Date:** September 10, 2026  
**Application:** Muzakkir – Islamic Reminder (`com.remindme.islamicdailyreminder`)  

---

## 1. Introduction

Welcome to **Muzakkir – Islamic Reminder** ("Muzakkir", "we", "our", or "us"). We are deeply committed to protecting your privacy. Muzakkir is designed as a focused, respectful spiritual companion that delivers scheduled Quranic verses and authentic Hadith reminders to help you maintain remembrance throughout your day.

This Privacy Policy explains how our application handles information, our strict on-device data architecture, and the network interactions necessary for Quran audio recitation streaming.

---

## 2. Information We Handle and Where It Lives

### A. Local, On-Device Data (100% Offline Storage)
Muzakkir operates on a local-first architecture:
- **Spiritual Texts & Translations:** All Quranic verses, Hadith narrations, translations across all 10 supported languages, chapter titles, and reflections are bundled directly into the application package and stored locally on your device.
- **User Preferences:** Your selected reminder times, daily frequency, preferred translation language, and quiet hours are stored locally in your device's private storage (`AsyncStorage` and Android `SharedPreferences`).
- **Bookmarks & History:** Any verses or Hadiths you bookmark or your reminder history remain strictly on your local device.
- **No User Accounts:** You do not create an account, log in, or provide any personal details (such as your name, email address, phone number, or age) to use Muzakkir.

### B. Quran Audio Streaming (Network Usage & CDN Disclosure)
When you choose to listen to Quran recitations within the app:
- **Audio Source:** Audio recitation files stream on-demand over an encrypted HTTPS connection from the public Islamic audio repository `https://everyayah.com`.
- **Server Access Logs:** When your device requests an audio file from the CDN, standard internet communication protocols apply. The content delivery network (CDN) may log standard network connection metadata (such as your device's IP address, user-agent string, and the specific audio URL requested) as part of standard server operation, routing, and security.
- **Zero Identification:** Muzakkir does **not** transmit any account identifier, device identifier, advertising ID, or personal data with these audio requests.

---

## 3. Third-Party Trackers and Advertising

- **Zero Advertising:** Muzakkir contains no advertisements, sponsored content, or ad-tracking networks (no Google AdMob, Unity, Facebook Audience Network, or similar services).
- **Zero Third-Party Analytics:** We do not track your reading habits, screen views, or interaction time with third-party tracking frameworks.
- **Zero Data Sale or Sharing:** We do not sell, rent, monetize, or trade any user information with any third party.

---

## 4. Android Device Permissions & Rationale

Muzakkir requests only the specific Android permissions necessary to deliver timed spiritual reminders as configured by you:

| Permission | Technical Name | Exact Purpose & Usage |
| :--- | :--- | :--- |
| **Notifications** | `POST_NOTIFICATIONS` | Delivers scheduled daily reminders to your Android notification tray. |
| **Exact Alarms** | `SCHEDULE_EXACT_ALARM` | Ensures daily reminders trigger at the exact user-specified minutes (e.g., 08:00, 14:00, 20:00) even when your phone is in battery-saving Doze mode. |
| **Display Over Other Apps** | `SYSTEM_ALERT_WINDOW` | Enables the optional floating reminder card to appear over your current screen for a few seconds at your scheduled reminder time. This is entirely user-controlled and can be toggled on or off in Settings. |
| **Foreground Service** | `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_SPECIAL_USE` | Required by Android 14+ to display the floating reminder card immediately at the exact alarm trigger time when you are outside the app. Stops immediately upon card dismissal. |
| **Reboot Rescheduling** | `RECEIVE_BOOT_COMPLETED` | Automatically recalculates and restores your active reminder alarms in the Android system after your device reboots. |
| **Vibration & Wake Lock** | `VIBRATE`, `WAKE_LOCK` | Provides gentle haptic feedback and briefly keeps the processor awake for milliseconds to deliver the reminder accurately. |

Muzakkir **does not** request or use microphone (`RECORD_AUDIO`), broad device storage (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`), location, contacts, phone state, or camera permissions.

---

## 5. Data Retention and Deletion

Because all your settings, bookmarks, and history are stored exclusively in your device's local application sandbox:
- You retain complete control over your data.
- Clearing the application cache/data from Android System Settings or uninstalling the app permanently deletes all your stored preferences, bookmarks, and history from your device.
- Because we do not store your data on remote servers, there is no remote server data to request deletion for.

---

## 6. Children's Privacy

Muzakkir is suitable for users of all ages and complies with the Google Play Families Policy and the Children’s Online Privacy Protection Act (COPPA). We do not knowingly solicit or collect personal information from children under 13. If you believe any personal data has inadvertently been collected, please contact us immediately.

---

## 7. Changes to This Privacy Policy

We may periodically update this Privacy Policy to reflect technical or legal improvements. When changes occur, the updated policy will be posted with a revised "Last Updated" date.

---

## 8. Contact Us

If you have any questions, suggestions, or concerns regarding this Privacy Policy or our data practices, please reach out to us:

- **Developer:** Muzakkir Developer Team  
- **Email:** `ishtiaqueibnmalek@gmail.com` (or contact via our official repository / developer listing on Google Play)  
- **Official Repository / Documentation:** `https://github.com/Siam-449840/muzakkir`  
