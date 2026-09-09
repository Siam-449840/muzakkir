package com.remindme.islamicdailyreminder

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import java.util.Calendar
import java.util.TimeZone

class ReminderAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                handleBootOrPackageReplaced(context)
            }
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_DATE_CHANGED -> {
                handleTimezoneOrTimeChanged(context)
            }
            ACTION_REMINDER_ALARM -> {
                handleReminderAlarm(context, intent)
            }
            ACTION_SCHEDULE_TEST_ALARM -> {
                handleScheduleTestAlarm(context, intent)
            }
            else -> {
                android.util.Log.w("ReminderAlarmReceiver", "Ignoring unknown action: $action")
            }
        }
    }

    private fun handleScheduleTestAlarm(context: Context, intent: Intent) {
        val callingUid = android.os.Binder.getCallingUid()
        val appUid = context.applicationInfo.uid
        val isPrivileged = callingUid == android.os.Process.SHELL_UID ||
                           callingUid == android.os.Process.ROOT_UID ||
                           callingUid == appUid ||
                           BuildConfig.DEBUG
        if (!isPrivileged) {
            android.util.Log.w("ReminderSecurity", "REJECTED_UNAUTHORIZED_TEST_ALARM: callingUid=$callingUid")
            return
        }
        val delaySeconds = intent.getIntExtra("delay_seconds", 10)
        val now = System.currentTimeMillis()
        val triggerTime = now + (delaySeconds * 1000L)
        val testContentId = intent.getStringExtra("content_id") ?: "quran_test_alarm_${System.currentTimeMillis()}"
        val testReference = intent.getStringExtra("reference") ?: "Surah Al-Baqarah 2:255"
        val testArabic = intent.getStringExtra("arabic") ?: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ"
        val testTranslation = intent.getStringExtra("translation")
            ?: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence."
        val testLanguage = intent.getStringExtra("language") ?: "en"

        val record = AlarmRecord(
            contentId = testContentId,
            contentType = "quran",
            reference = testReference,
            arabic = testArabic,
            translation = testTranslation,
            badge = "কুরআনুল কারীম · স্মরণ",
            category = "Daily Reminder",
            reflection = "Test reflection to verify exact alarm and overlay pipeline under battery saving.",
            narrator = null,
            grade = null,
            chapterTitle = "Al-Baqarah",
            sectionTitle = "Ayat al-Kursi",
            note = null,
            collectionKey = null,
            hadithNumber = null,
            surahNumber = "2",
            ayahStart = "255",
            ayahEnd = "255",
            language = testLanguage,
            triggerAtMillis = triggerTime,
            dateStr = "",
            timeStr = ""
        )

        AlarmStorage.saveAlarm(context, record)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        scheduleNativeAlarm(context, alarmManager, record)

        val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
        val powerSave = pm?.isPowerSaveMode ?: false
        val idleMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) pm?.isDeviceIdleMode ?: false else false
        val interactive = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) pm?.isInteractive ?: true else true

        android.util.Log.i(
            "ReminderDiagnostics",
            "TEST_ALARM_SCHEDULED: id=$testContentId, delay=${delaySeconds}s, triggerAt=$triggerTime, powerSave=$powerSave, idleMode=$idleMode, interactive=$interactive"
        )
    }

    private fun handleBootOrPackageReplaced(context: Context) {
        val allAlarms = AlarmStorage.getAllAlarms(context)
        val now = System.currentTimeMillis()
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        var restoredCount = 0

        for (alarm in allAlarms) {
            if (alarm.triggerAtMillis > now) {
                scheduleNativeAlarm(context, alarmManager, alarm)
                restoredCount++
            } else {
                AlarmStorage.removeAlarm(context, alarm.contentId)
            }
        }

        android.util.Log.i(
            "ReminderTelemetry",
            "BOOT_RESTORE_COMPLETE: totalTracked=${allAlarms.size}, restoredFuture=$restoredCount"
        )
    }

    private fun handleTimezoneOrTimeChanged(context: Context) {
        val allAlarms = AlarmStorage.getAllAlarms(context)
        val now = System.currentTimeMillis()
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val tz = TimeZone.getDefault()
        var rescheduledCount = 0

        for (alarm in allAlarms) {
            if (alarm.dateStr.isNotBlank() && alarm.timeStr.isNotBlank()) {
                val newTrigger = computeTriggerMillis(alarm.dateStr, alarm.timeStr, tz)
                if (newTrigger > now) {
                    val updated = alarm.copy(triggerAtMillis = newTrigger)
                    AlarmStorage.saveAlarm(context, updated)
                    scheduleNativeAlarm(context, alarmManager, updated)
                    rescheduledCount++
                } else {
                    AlarmStorage.removeAlarm(context, alarm.contentId)
                }
            } else if (alarm.triggerAtMillis > now) {
                scheduleNativeAlarm(context, alarmManager, alarm)
                rescheduledCount++
            }
        }

        android.util.Log.i(
            "ReminderTelemetry",
            "TIMEZONE_RESCHEDULE_COMPLETE: timezone=${tz.id}, rescheduled=$rescheduledCount"
        )
    }

    private fun computeTriggerMillis(dateStr: String, timeStr: String, timeZone: TimeZone): Long {
        return try {
            val dateParts = dateStr.split("-").map { it.toInt() }
            val timeParts = timeStr.split(":").map { it.toInt() }
            if (dateParts.size == 3 && timeParts.size >= 2) {
                val cal = Calendar.getInstance(timeZone)
                cal.set(Calendar.YEAR, dateParts[0])
                cal.set(Calendar.MONTH, dateParts[1] - 1)
                cal.set(Calendar.DAY_OF_MONTH, dateParts[2])
                cal.set(Calendar.HOUR_OF_DAY, timeParts[0])
                cal.set(Calendar.MINUTE, timeParts[1])
                cal.set(Calendar.SECOND, 0)
                cal.set(Calendar.MILLISECOND, 0)
                cal.timeInMillis
            } else {
                0L
            }
        } catch (e: Exception) {
            0L
        }
    }

    private fun scheduleNativeAlarm(context: Context, alarmManager: AlarmManager, record: AlarmRecord) {
        val requestCode = record.contentId.hashCode()
        val intent = Intent(context, ReminderAlarmReceiver::class.java).apply {
            action = ACTION_REMINDER_ALARM
            putExtra(EXTRA_CONTENT_ID, record.contentId)
            putExtra(EXTRA_CONTENT_TYPE, record.contentType)
            putExtra(EXTRA_REFERENCE, record.reference)
            putExtra(EXTRA_ARABIC, record.arabic)
            putExtra(EXTRA_TRANSLATION, record.translation)
            putExtra(EXTRA_BADGE, record.badge)
            putExtra(EXTRA_CATEGORY, record.category)
            putExtra(EXTRA_REFLECTION, record.reflection)
            putExtra(EXTRA_NARRATOR, record.narrator)
            putExtra(EXTRA_GRADE, record.grade)
            putExtra(EXTRA_CHAPTER_TITLE, record.chapterTitle)
            putExtra(EXTRA_SECTION_TITLE, record.sectionTitle)
            putExtra(EXTRA_NOTE, record.note)
            putExtra(EXTRA_COLLECTION_KEY, record.collectionKey)
            putExtra(EXTRA_HADITH_NUMBER, record.hadithNumber)
            putExtra(EXTRA_SURAH_NUMBER, record.surahNumber)
            putExtra(EXTRA_AYAH_START, record.ayahStart)
            putExtra(EXTRA_AYAH_END, record.ayahEnd)
            putExtra(EXTRA_LANGUAGE, record.language)
            putExtra("extra_scheduled_time", record.triggerAtMillis)
        }

        val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
            }
        } catch (e: SecurityException) {
            android.util.Log.w("ReminderAlarmReceiver", "Exact alarm permission restricted, falling back to windowed alarm", e)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, record.triggerAtMillis, pendingIntent)
            }
        }
    }

    private fun handleReminderAlarm(context: Context, intent: Intent) {
        val contentId = intent.getStringExtra(EXTRA_CONTENT_ID) ?: ""

        // Validate contentId format first
        if (contentId.isBlank() || !isValidContentId(contentId)) {
            android.util.Log.w(
                "ReminderTelemetry",
                "REJECTED_MALFORMED_ALARM: invalid contentId='$contentId'"
            )
            return
        }

        // SECURITY CHECK: Verify this alarm was legitimately scheduled by Muzakkir in AlarmStorage
        val storedAlarm = AlarmStorage.getAlarm(context, contentId)
        if (storedAlarm == null) {
            android.util.Log.w(
                "ReminderSecurity",
                "REJECTED_UNSCHEDULED_ALARM: contentId='$contentId' not found in AlarmStorage. External/spoofed broadcast dropped."
            )
            return
        }

        // Clean up this fired alarm from AlarmStorage immediately
        AlarmStorage.removeAlarm(context, contentId)

        // Authoritative content loaded strictly from stored AlarmRecord (immune to external intent tampering)
        val contentType = storedAlarm.contentType
        val reference = storedAlarm.reference
        val arabic = storedAlarm.arabic
        val translation = storedAlarm.translation
        val badge = storedAlarm.badge
        val language = storedAlarm.language
        val defaultCategory = if (language == "bn") "দৈনিক স্মরণ" else "Daily Reminder"
        val category = storedAlarm.category ?: defaultCategory
        val reflection = storedAlarm.reflection
        val narrator = storedAlarm.narrator
        val grade = storedAlarm.grade
        val chapterTitle = storedAlarm.chapterTitle
        val sectionTitle = storedAlarm.sectionTitle
        val note = storedAlarm.note
        val collectionKey = storedAlarm.collectionKey
        val hadithNumber = storedAlarm.hadithNumber
        val surahNumber = storedAlarm.surahNumber
        val ayahStart = storedAlarm.ayahStart
        val ayahEnd = storedAlarm.ayahEnd
        val scheduledTime = storedAlarm.triggerAtMillis
        val receiveTime = System.currentTimeMillis()
        val alarmDeviationMs = if (scheduledTime > 0) receiveTime - scheduledTime else 0L

        if (translation.isBlank()) {
            android.util.Log.w(
                "ReminderTelemetry",
                "REJECTED_EMPTY_TRANSLATION: contentId='$contentId'"
            )
            return
        }

        val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
        val powerSave = pm?.isPowerSaveMode ?: false
        val idleMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) pm?.isDeviceIdleMode ?: false else false
        val interactive = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) pm?.isInteractive ?: true else true

        // Check if user has granted "Display over other apps" (SYSTEM_ALERT_WINDOW)
        val canDrawOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }

        android.util.Log.i(
            "ReminderTelemetry",
            "ALARM_RECEIVED: id=$contentId, lang=$language, scheduled=$scheduledTime, received=$receiveTime, deviation=${alarmDeviationMs}ms"
        )
        android.util.Log.i(
            "ReminderDiagnostics",
            "ALARM_RECEIVED: id=$contentId, scheduled=$scheduledTime, received=$receiveTime, deviation=${alarmDeviationMs}ms, powerSave=$powerSave, idleMode=$idleMode, interactive=$interactive, canDrawOverlay=$canDrawOverlay"
        )

        val forceFallback = intent.getBooleanExtra("extra_force_fallback", false)
        if (canDrawOverlay && !forceFallback) {
            val overlayIntent = Intent(context, OverlayReminderService::class.java).apply {
                putExtra(OverlayReminderService.EXTRA_CONTENT_ID, contentId)
                putExtra(OverlayReminderService.EXTRA_CONTENT_TYPE, contentType)
                putExtra(OverlayReminderService.EXTRA_REFERENCE, reference)
                putExtra(OverlayReminderService.EXTRA_ARABIC, arabic)
                putExtra(OverlayReminderService.EXTRA_TRANSLATION, translation)
                putExtra(OverlayReminderService.EXTRA_BADGE, badge)
                putExtra(OverlayReminderService.EXTRA_CATEGORY, category)
                putExtra(OverlayReminderService.EXTRA_REFLECTION, reflection)
                putExtra(OverlayReminderService.EXTRA_NARRATOR, narrator)
                putExtra(OverlayReminderService.EXTRA_GRADE, grade)
                putExtra(OverlayReminderService.EXTRA_CHAPTER_TITLE, chapterTitle)
                putExtra(OverlayReminderService.EXTRA_SECTION_TITLE, sectionTitle)
                putExtra(OverlayReminderService.EXTRA_NOTE, note)
                putExtra("extra_collection_key", collectionKey)
                putExtra("extra_hadith_number", hadithNumber)
                putExtra("extra_surah_number", surahNumber)
                putExtra("extra_ayah_start", ayahStart)
                putExtra("extra_ayah_end", ayahEnd)
                putExtra(OverlayReminderService.EXTRA_LANGUAGE, language)
                putExtra("extra_scheduled_time", scheduledTime)
                putExtra("extra_receive_time", receiveTime)
            }
            try {
                android.util.Log.i("ReminderDiagnostics", "FGS_START_DISPATCH: id=$contentId, target=OverlayReminderService")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(overlayIntent)
                } else {
                    context.startService(overlayIntent)
                }
                android.util.Log.i("ReminderDiagnostics", "FGS_START_DISPATCH_SUCCESS: id=$contentId")
            } catch (e: Exception) {
                android.util.Log.e("ReminderDiagnostics", "FGS_START_DISPATCH_FAILED: id=$contentId, exception=${e.javaClass.simpleName}, message=${e.message}", e)
                android.util.Log.e("ReminderAlarmReceiver", "Failed to start overlay service, falling back to notification", e)
                showFallbackNotification(
                    context = context,
                    contentId = contentId,
                    contentType = contentType,
                    reference = reference,
                    translation = translation,
                    badge = badge,
                    language = language,
                    collectionKey = collectionKey,
                    hadithNumber = hadithNumber,
                    chapterTitle = chapterTitle,
                    sectionTitle = sectionTitle,
                    surahNumber = surahNumber,
                    ayahStart = ayahStart,
                    ayahEnd = ayahEnd
                )
            }
        } else {
            android.util.Log.i("ReminderDiagnostics", "FALLBACK_NOTIFICATION_DIRECT: id=$contentId, canDrawOverlay=$canDrawOverlay, forceFallback=$forceFallback")
            showFallbackNotification(
                context = context,
                contentId = contentId,
                contentType = contentType,
                reference = reference,
                translation = translation,
                badge = badge,
                language = language,
                collectionKey = collectionKey,
                hadithNumber = hadithNumber,
                chapterTitle = chapterTitle,
                sectionTitle = sectionTitle,
                surahNumber = surahNumber,
                ayahStart = ayahStart,
                ayahEnd = ayahEnd
            )
        }
    }

    private fun isValidContentId(contentId: String): Boolean {
        return contentId.startsWith("quran_") ||
               contentId.startsWith("hadith_") ||
               contentId.startsWith("henc_")
    }

    companion object {
        const val ACTION_REMINDER_ALARM = "com.remindme.islamicdailyreminder.ACTION_REMINDER_ALARM"
        const val ACTION_SCHEDULE_TEST_ALARM = "com.remindme.islamicdailyreminder.ACTION_SCHEDULE_TEST_ALARM"
        const val EXTRA_CONTENT_ID = "extra_content_id"
        const val EXTRA_CONTENT_TYPE = "extra_content_type"
        const val EXTRA_REFERENCE = "extra_reference"
        const val EXTRA_ARABIC = "extra_arabic"
        const val EXTRA_TRANSLATION = "extra_translation"
        const val EXTRA_BADGE = "extra_badge"
        const val EXTRA_CATEGORY = "extra_category"
        const val EXTRA_REFLECTION = "extra_reflection"
        const val EXTRA_NARRATOR = "extra_narrator"
        const val EXTRA_GRADE = "extra_grade"
        const val EXTRA_CHAPTER_TITLE = "extra_chapter_title"
        const val EXTRA_SECTION_TITLE = "extra_section_title"
        const val EXTRA_NOTE = "extra_note"
        const val EXTRA_COLLECTION_KEY = "extra_collection_key"
        const val EXTRA_HADITH_NUMBER = "extra_hadith_number"
        const val EXTRA_SURAH_NUMBER = "extra_surah_number"
        const val EXTRA_AYAH_START = "extra_ayah_start"
        const val EXTRA_AYAH_END = "extra_ayah_end"
        const val EXTRA_LANGUAGE = "extra_language"

        fun showFallbackNotification(
            context: Context,
            contentId: String,
            contentType: String,
            reference: String,
            translation: String,
            badge: String? = null,
            language: String = "en",
            collectionKey: String? = null,
            hadithNumber: String? = null,
            chapterTitle: String? = null,
            sectionTitle: String? = null,
            surahNumber: String? = null,
            ayahStart: String? = null,
            ayahEnd: String? = null
        ) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val channelId = "reminder-vibrate"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channelName = if (language == "bn") "মুযাক্কির স্মরণ" else "Muzakkir Reminders"
                val channelDesc = if (language == "bn") "দৈনিক কুরআন ও সহিহ হাদিস স্মরণ" else "Daily spiritual Quran & Hadith reflections"
                val channel = NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = channelDesc
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 250, 250)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("content_id", contentId)
                putExtra("content_type", contentType)
                collectionKey?.let { putExtra("collection_key", it) }
                hadithNumber?.let { putExtra("hadith_number", it) }
                chapterTitle?.let { putExtra("chapter_title", it) }
                sectionTitle?.let { putExtra("section_title", it) }
                surahNumber?.let { putExtra("surah_number", it) }
                ayahStart?.let { putExtra("ayah_start", it) }
                ayahEnd?.let { putExtra("ayah_end", it) }
            } ?: return

            val pendingIntent = PendingIntent.getActivity(
                context,
                contentId.hashCode(),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val title = if (language == "bn") {
                if (contentType == "quran") "কুরআনুল কারীম • $reference" else "সহিহ হাদিস • $reference"
            } else {
                if (contentType == "quran") "The Noble Quran • $reference" else "Sahih Hadith • $reference"
            }

            val actionText = if (language == "bn") "পড়ুন (See More)" else "Read More"
            val excerpt = if (translation.length > 140) translation.take(137) + "..." else translation

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.notification_icon)
                .setContentTitle(title)
                .setContentText(excerpt)
                .setStyle(NotificationCompat.BigTextStyle().bigText(translation))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .addAction(0, actionText, pendingIntent)
                .build()

            notificationManager.notify(contentId.hashCode(), notification)
        }
    }
}
