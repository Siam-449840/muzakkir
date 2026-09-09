# Google Play Console — Foreground Service (`specialUse`) Declaration Guide

**Application:** Muzakkir – Islamic Reminder  
**Package Name:** `com.remindme.islamicdailyreminder`  
**Target SDK:** 36 (Android 16)  
**Declared FGS Type:** `specialUse`  
**Manifest Property:** `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE`  
**Subtype Value:** `Displays floating reminder cards over active apps at exact scheduled times.`  

---

> [!IMPORTANT]
> **No Automatic Approval**:
> Google Play policy requires rigorous manual human review for all apps requesting `FOREGROUND_SERVICE_SPECIAL_USE`. SpecialUse approval is **not automatic**. You must clearly articulate the user-facing benefit, explain why standard foreground service types are insufficient, and provide a direct video demonstration showing the exact user flow.

---

## 1. Play Console Declaration Form Fields (Copy & Paste)

When prompted in Google Play Console under **Policy and programs** &rarr; **App content** &rarr; **Foreground service permissions**:

### Field 1: Why does your app need the foreground service?
```text
Muzakkir is an Islamic daily reminder application that delivers scheduled Quranic verses and authentic Hadith reflections to users at their chosen times of day.

When a scheduled reminder time arrives while the user is using another app or on their home screen, Muzakkir launches a brief, respectful floating reminder card (using Android's SYSTEM_ALERT_WINDOW permission) directly over the active screen. 

Under Android 14+ (API 34+), displaying a system overlay from a background AlarmManager broadcast receiver requires a momentary foreground service to host the overlay window and manage its lifecycle without being killed by aggressive OEM process management or Doze mode. The service runs only for the brief duration the reminder card is visible (typically 10–15 seconds) and calls stopSelf() immediately when the user dismisses the card or taps 'See More'.
```

### Field 2: Why can't the task be handled by another foreground service type?
```text
Google Play's standard predefined foreground service types (camera, connectedDevice, dataSync, health, location, mediaPlayback, mediaProjection, microphone, phoneCall, remoteMessaging, shortService, systemExempted) do not match this use case:

1. It is NOT dataSync: The app is completely offline and does not sync remote data.
2. It is NOT mediaPlayback: The reminder is an interactive visual floating card presenting text reflections, not background media.
3. It is NOT shortService: shortService has a strict timeout that does not accommodate user interaction with interactive overlay views.

Therefore, 'specialUse' is the only technically accurate foreground service type that covers timed, interactive system alert overlays for spiritual remembrance.
```

### Field 3: User Impact & Experience
```text
The user explicitly configures their preferred daily reminder times (e.g., 08:00, 14:00, 20:00) during onboarding and in Settings. The floating overlay provides immediate spiritual value by presenting a meaningful verse without forcing the user to switch apps or lose their current task context. If the user disables 'Display over other apps' in Settings, the service is never invoked, and standard system tray notifications are used instead.
```

---

## 2. Video Demonstration Script & Requirements

Google Play reviewers **require** a public or unlisted video link showing the exact functionality in action.

### Video Recording Steps:
1. **Device:** Physical Android phone running Android 14, 15, or 16 (e.g. your OnePlus device).
2. **Step 1 — Show Onboarding & Permission Grant:**
   - Launch Muzakkir from a fresh install or open Settings.
   - Show the toggle for "অন্য অ্যাপের ওপর প্রদর্শন" (Display over other apps).
   - Navigate to Android System Settings and toggle `Allow display over other apps` to ON.
3. **Step 2 — Schedule a Timed Reminder:**
   - In Muzakkir Settings, scroll to the test section: **পরীক্ষামূলক ফ্লোটিং কার্ড যাচাই**.
   - Tap **"১০ সেকেন্ডের রিয়েল টাইমার পরীক্ষা"** (or schedule a reminder for 1 minute ahead).
4. **Step 3 — Exit the App:**
   - Press the **Home** button or open another application (such as Chrome or Notes).
   - Show the device operating normally outside of Muzakkir.
5. **Step 4 — Observe Floating Card Appearance:**
   - At the exact scheduled second, the floating reminder card smoothly animates onto the screen.
   - The card displays the Quran/Hadith text, reflection prompt, and action buttons.
6. **Step 5 — Dismissal & Clean Exit:**
   - Tap **"পড়েছি"** (Dismiss) or swipe down the notification shade to show the service has terminated and the notification has cleared.
7. **Video Submission:**
   - Upload as an **Unlisted** YouTube video or public Google Drive link (accessible to anyone with the link).
   - Ensure video duration is under 2 minutes, clear, and without background music.
