package com.remindme.islamicdailyreminder

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class FloatingOverlayModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "FloatingOverlay"

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        // No-op
    }

    override fun onNewIntent(intent: Intent?) {
        if (intent != null) {
            val contentId = intent.getStringExtra("content_id")
            val contentType = intent.getStringExtra("content_type")
            if (!contentId.isNullOrBlank()) {
                val params = Arguments.createMap().apply {
                    putString("content_id", contentId)
                    putString("content_type", contentType ?: "quran")
                    intent.getStringExtra("collection_key")?.let { putString("collection_key", it) }
                    intent.getStringExtra("hadith_number")?.let { putString("hadith_number", it) }
                    intent.getStringExtra("chapter_id")?.let { putString("chapter_id", it) }
                    intent.getStringExtra("section_id")?.let { putString("section_id", it) }
                    intent.getStringExtra("chapter_title")?.let { putString("chapter_title", it) }
                    intent.getStringExtra("section_title")?.let { putString("section_title", it) }
                    intent.getStringExtra("surah_number")?.let { putString("surah_number", it) }
                    intent.getStringExtra("ayah_start")?.let { putString("ayah_start", it) }
                    intent.getStringExtra("ayah_end")?.let { putString("ayah_end", it) }
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onFloatingReminderSeeMore", params)
            }
        }
    }

    @ReactMethod
    fun getInitialReminderLaunchIntent(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null && activity.intent != null) {
                val contentId = activity.intent.getStringExtra("content_id")
                val contentType = activity.intent.getStringExtra("content_type")
                if (!contentId.isNullOrBlank()) {
                    val map = Arguments.createMap().apply {
                        putString("content_id", contentId)
                        putString("content_type", contentType ?: "quran")
                        activity.intent.getStringExtra("collection_key")?.let { putString("collection_key", it) }
                        activity.intent.getStringExtra("hadith_number")?.let { putString("hadith_number", it) }
                        activity.intent.getStringExtra("chapter_id")?.let { putString("chapter_id", it) }
                        activity.intent.getStringExtra("section_id")?.let { putString("section_id", it) }
                        activity.intent.getStringExtra("chapter_title")?.let { putString("chapter_title", it) }
                        activity.intent.getStringExtra("section_title")?.let { putString("section_title", it) }
                        activity.intent.getStringExtra("surah_number")?.let { putString("surah_number", it) }
                        activity.intent.getStringExtra("ayah_start")?.let { putString("ayah_start", it) }
                        activity.intent.getStringExtra("ayah_end")?.let { putString("ayah_end", it) }
                    }
                    activity.intent.removeExtra("content_id")
                    activity.intent.removeExtra("content_type")
                    activity.intent.removeExtra("collection_key")
                    activity.intent.removeExtra("hadith_number")
                    activity.intent.removeExtra("chapter_id")
                    activity.intent.removeExtra("section_id")
                    activity.intent.removeExtra("chapter_title")
                    activity.intent.removeExtra("section_title")
                    activity.intent.removeExtra("surah_number")
                    activity.intent.removeExtra("ayah_start")
                    activity.intent.removeExtra("ayah_end")
                    promise.resolve(map)
                    return
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                promise.resolve(alarmManager.canScheduleExactAlarms())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestExactAlarmPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                if (!alarmManager.canScheduleExactAlarms()) {
                    val intent = Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    private fun getStringSafe(map: ReadableMap, key: String): String? {
        if (!map.hasKey(key) || map.isNull(key)) return null
        return when (map.getType(key)) {
            com.facebook.react.bridge.ReadableType.String -> map.getString(key)
            com.facebook.react.bridge.ReadableType.Number -> {
                val d = map.getDouble(key)
                if (d == d.toLong().toDouble()) d.toLong().toString() else d.toString()
            }
            com.facebook.react.bridge.ReadableType.Boolean -> map.getBoolean(key).toString()
            else -> null
        }
    }

    @ReactMethod
    fun scheduleExactReminderAlarm(triggerAtMillis: Double, reminderData: ReadableMap, promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val contentId = reminderData.getString("content_id") ?: ""
            val requestCode = contentId.hashCode()
            val language = if (reminderData.hasKey("language")) reminderData.getString("language") ?: "en" else "en"
            val dateStr = if (reminderData.hasKey("dateStr")) reminderData.getString("dateStr") ?: "" else ""
            val timeStr = if (reminderData.hasKey("timeStr")) reminderData.getString("timeStr") ?: "" else ""

            val intent = Intent(reactContext, ReminderAlarmReceiver::class.java).apply {
                action = "com.remindme.islamicdailyreminder.ACTION_REMINDER_ALARM"
                putExtra(ReminderAlarmReceiver.EXTRA_CONTENT_ID, contentId)
                putExtra(ReminderAlarmReceiver.EXTRA_CONTENT_TYPE, reminderData.getString("content_type"))
                putExtra(ReminderAlarmReceiver.EXTRA_REFERENCE, reminderData.getString("reference"))
                putExtra(ReminderAlarmReceiver.EXTRA_ARABIC, reminderData.getString("arabic"))
                putExtra(ReminderAlarmReceiver.EXTRA_TRANSLATION, reminderData.getString("translation"))
                putExtra(ReminderAlarmReceiver.EXTRA_LANGUAGE, language)
                if (reminderData.hasKey("badge")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_BADGE, reminderData.getString("badge"))
                }
                if (reminderData.hasKey("category")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_CATEGORY, reminderData.getString("category"))
                }
                if (reminderData.hasKey("reflection")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_REFLECTION, reminderData.getString("reflection"))
                }
                if (reminderData.hasKey("narrator")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_NARRATOR, reminderData.getString("narrator"))
                }
                if (reminderData.hasKey("grade")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_GRADE, reminderData.getString("grade"))
                }
                if (reminderData.hasKey("chapter_title")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_CHAPTER_TITLE, reminderData.getString("chapter_title"))
                }
                if (reminderData.hasKey("section_title")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_SECTION_TITLE, reminderData.getString("section_title"))
                }
                if (reminderData.hasKey("note")) {
                    putExtra(ReminderAlarmReceiver.EXTRA_NOTE, reminderData.getString("note"))
                }
                if (reminderData.hasKey("collection_key")) {
                    putExtra("extra_collection_key", reminderData.getString("collection_key"))
                }
                getStringSafe(reminderData, "hadith_number")?.let { putExtra("extra_hadith_number", it) }
                getStringSafe(reminderData, "surah_number")?.let { putExtra("extra_surah_number", it) }
                getStringSafe(reminderData, "ayah_start")?.let { putExtra("extra_ayah_start", it) }
                getStringSafe(reminderData, "ayah_end")?.let { putExtra("extra_ayah_end", it) }
                putExtra("extra_scheduled_time", triggerAtMillis.toLong())
            }

            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getBroadcast(reactContext, requestCode, intent, flags)

            val triggerTime = triggerAtMillis.toLong()
            var usedExact = false

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                        usedExact = true
                    } else {
                        // Fallback to windowed alarm for Google Play compliance
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    usedExact = true
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                    usedExact = true
                }
            } catch (e: SecurityException) {
                android.util.Log.w("FloatingOverlayModule", "Exact alarm restricted, falling back to windowed alarm", e)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
            }

            // Persist alarm record to SharedPreferences for reboot and timezone restoration
            val record = AlarmRecord(
                contentId = contentId,
                contentType = reminderData.getString("content_type") ?: "quran",
                reference = reminderData.getString("reference") ?: "",
                arabic = reminderData.getString("arabic") ?: "",
                translation = reminderData.getString("translation") ?: "",
                badge = if (reminderData.hasKey("badge")) reminderData.getString("badge") else null,
                category = if (reminderData.hasKey("category")) reminderData.getString("category") else null,
                reflection = if (reminderData.hasKey("reflection")) reminderData.getString("reflection") else null,
                narrator = if (reminderData.hasKey("narrator")) reminderData.getString("narrator") else null,
                grade = if (reminderData.hasKey("grade")) reminderData.getString("grade") else null,
                chapterTitle = if (reminderData.hasKey("chapter_title")) reminderData.getString("chapter_title") else null,
                sectionTitle = if (reminderData.hasKey("section_title")) reminderData.getString("section_title") else null,
                note = if (reminderData.hasKey("note")) reminderData.getString("note") else null,
                collectionKey = if (reminderData.hasKey("collection_key")) reminderData.getString("collection_key") else null,
                hadithNumber = getStringSafe(reminderData, "hadith_number"),
                surahNumber = getStringSafe(reminderData, "surah_number"),
                ayahStart = getStringSafe(reminderData, "ayah_start"),
                ayahEnd = getStringSafe(reminderData, "ayah_end"),
                language = language,
                triggerAtMillis = triggerTime,
                dateStr = dateStr,
                timeStr = timeStr
            )
            AlarmStorage.saveAlarm(reactContext, record)

            val result = Arguments.createMap().apply {
                putBoolean("scheduled", true)
                putBoolean("exact", usedExact)
                putDouble("triggerTime", triggerAtMillis)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelReminderAlarm(contentId: String, promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val requestCode = contentId.hashCode()
            val intent = Intent(reactContext, ReminderAlarmReceiver::class.java)
            val flags = PendingIntent.FLAG_NO_CREATE or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            val pendingIntent = PendingIntent.getBroadcast(reactContext, requestCode, intent, flags)

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }
            AlarmStorage.removeAlarm(reactContext, contentId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAllReminderAlarms(promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val allAlarms = AlarmStorage.getAllAlarms(reactContext)
            val flags = PendingIntent.FLAG_NO_CREATE or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            for (alarm in allAlarms) {
                val requestCode = alarm.contentId.hashCode()
                val intent = Intent(reactContext, ReminderAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(reactContext, requestCode, intent, flags)
                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent)
                    pendingIntent.cancel()
                }
            }
            AlarmStorage.clearAllAlarms(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun showFloatingReminder(reminderData: ReadableMap, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                promise.reject("PERMISSION_DENIED", "SYSTEM_ALERT_WINDOW permission not granted.")
                return
            }

            val language = if (reminderData.hasKey("language")) reminderData.getString("language") ?: "en" else "en"

            val intent = Intent(reactContext, OverlayReminderService::class.java).apply {
                putExtra(OverlayReminderService.EXTRA_CONTENT_ID, reminderData.getString("content_id"))
                putExtra(OverlayReminderService.EXTRA_CONTENT_TYPE, reminderData.getString("content_type"))
                putExtra(OverlayReminderService.EXTRA_REFERENCE, reminderData.getString("reference"))
                putExtra(OverlayReminderService.EXTRA_ARABIC, reminderData.getString("arabic"))
                putExtra(OverlayReminderService.EXTRA_TRANSLATION, reminderData.getString("translation"))
                putExtra(OverlayReminderService.EXTRA_LANGUAGE, language)
                if (reminderData.hasKey("badge")) {
                    putExtra(OverlayReminderService.EXTRA_BADGE, reminderData.getString("badge"))
                }
                if (reminderData.hasKey("category")) {
                    putExtra(OverlayReminderService.EXTRA_CATEGORY, reminderData.getString("category"))
                }
                if (reminderData.hasKey("reflection")) {
                    putExtra(OverlayReminderService.EXTRA_REFLECTION, reminderData.getString("reflection"))
                }
                if (reminderData.hasKey("narrator")) {
                    putExtra(OverlayReminderService.EXTRA_NARRATOR, reminderData.getString("narrator"))
                }
                if (reminderData.hasKey("grade")) {
                    putExtra(OverlayReminderService.EXTRA_GRADE, reminderData.getString("grade"))
                }
                if (reminderData.hasKey("chapter_title")) {
                    putExtra(OverlayReminderService.EXTRA_CHAPTER_TITLE, reminderData.getString("chapter_title"))
                }
                if (reminderData.hasKey("section_title")) {
                    putExtra(OverlayReminderService.EXTRA_SECTION_TITLE, reminderData.getString("section_title"))
                }
                if (reminderData.hasKey("note")) {
                    putExtra(OverlayReminderService.EXTRA_NOTE, reminderData.getString("note"))
                }
                if (reminderData.hasKey("collection_key")) {
                    putExtra("extra_collection_key", reminderData.getString("collection_key"))
                }
                getStringSafe(reminderData, "hadith_number")?.let { putExtra("extra_hadith_number", it) }
                getStringSafe(reminderData, "surah_number")?.let { putExtra("extra_surah_number", it) }
                getStringSafe(reminderData, "ayah_start")?.let { putExtra("extra_ayah_start", it) }
                getStringSafe(reminderData, "ayah_end")?.let { putExtra("extra_ayah_end", it) }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dismissFloatingReminder(promise: Promise) {
        try {
            val intent = Intent(reactContext, OverlayReminderService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }
}
