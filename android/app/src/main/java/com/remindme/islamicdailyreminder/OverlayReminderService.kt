package com.remindme.islamicdailyreminder

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class OverlayReminderService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val language = intent?.getStringExtra(EXTRA_LANGUAGE) ?: "en"

        // Promote to foreground service immediately to comply with Android 8.0+ and Android 14+ background execution rules
        startServiceForegroundNotification(language)

        if (intent == null) {
            stopForegroundCompat()
            stopSelf()
            return START_NOT_STICKY
        }

        val contentId = intent.getStringExtra(EXTRA_CONTENT_ID) ?: ""
        val translation = intent.getStringExtra(EXTRA_TRANSLATION) ?: ""

        // Validate payload: abort cleanly if content is blank
        if (contentId.isBlank() || translation.isBlank()) {
            android.util.Log.w("OverlayReminderService", "Aborting overlay with blank contentId or translation")
            stopForegroundCompat()
            stopSelf()
            return START_NOT_STICKY
        }

        // Ensure permission is granted before trying to add overlay; fall back gracefully to notification
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            android.util.Log.w("OverlayReminderService", "SYSTEM_ALERT_WINDOW not granted, falling back to notification")
            ReminderAlarmReceiver.showFallbackNotification(
                context = this,
                contentId = contentId,
                contentType = intent.getStringExtra(EXTRA_CONTENT_TYPE) ?: "quran",
                reference = intent.getStringExtra(EXTRA_REFERENCE) ?: "",
                translation = translation,
                badge = intent.getStringExtra(EXTRA_BADGE),
                language = language,
                collectionKey = intent.getStringExtra("extra_collection_key"),
                hadithNumber = intent.getStringExtra("extra_hadith_number"),
                chapterTitle = intent.getStringExtra(EXTRA_CHAPTER_TITLE),
                sectionTitle = intent.getStringExtra(EXTRA_SECTION_TITLE),
                surahNumber = intent.getStringExtra("extra_surah_number"),
                ayahStart = intent.getStringExtra("extra_ayah_start"),
                ayahEnd = intent.getStringExtra("extra_ayah_end")
            )
            stopForegroundCompat()
            stopSelf()
            return START_NOT_STICKY
        }

        val contentType = intent.getStringExtra(EXTRA_CONTENT_TYPE) ?: "quran"
        val reference = intent.getStringExtra(EXTRA_REFERENCE) ?: ""
        val arabic = intent.getStringExtra(EXTRA_ARABIC) ?: ""
        val badge = intent.getStringExtra(EXTRA_BADGE)
        val defaultCategory = if (language == "bn") "দৈনিক স্মরণ" else "Daily Reminder"
        val category = intent.getStringExtra(EXTRA_CATEGORY) ?: defaultCategory
        val reflection = intent.getStringExtra(EXTRA_REFLECTION)
        val narrator = intent.getStringExtra(EXTRA_NARRATOR)
        val grade = intent.getStringExtra(EXTRA_GRADE)
        val chapterTitle = intent.getStringExtra(EXTRA_CHAPTER_TITLE)
        val sectionTitle = intent.getStringExtra(EXTRA_SECTION_TITLE)
        val note = intent.getStringExtra(EXTRA_NOTE)
        val collectionKey = intent.getStringExtra("extra_collection_key")
        val hadithNumber = intent.getStringExtra("extra_hadith_number")
        val surahNumber = intent.getStringExtra("extra_surah_number")
        val ayahStart = intent.getStringExtra("extra_ayah_start")
        val ayahEnd = intent.getStringExtra("extra_ayah_end")
        val scheduledTime = intent.getLongExtra("extra_scheduled_time", 0L)
        val receiveTime = intent.getLongExtra("extra_receive_time", System.currentTimeMillis())

        showOverlay(
            contentId = contentId,
            contentType = contentType,
            reference = reference,
            arabic = arabic,
            translation = translation,
            badge = badge,
            category = category,
            reflection = reflection,
            narrator = narrator,
            grade = grade,
            chapterTitle = chapterTitle,
            sectionTitle = sectionTitle,
            note = note,
            collectionKey = collectionKey,
            hadithNumber = hadithNumber,
            surahNumber = surahNumber,
            ayahStart = ayahStart,
            ayahEnd = ayahEnd,
            language = language,
            scheduledTime = scheduledTime,
            receiveTime = receiveTime
        )

        return START_NOT_STICKY
    }

    private fun startServiceForegroundNotification(language: String = "en") {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "reminder_overlay_foreground_service"
            val channelName = if (language == "bn") "ভাসমান স্মরণ কার্ড" else "Floating Overlay Active"
            val channelDesc = if (language == "bn") "স্ক্রিনের ওপর মুযাক্কির স্মরণ কার্ড প্রদর্শন" else "Shows floating reminder cards over active apps"
            val channel = NotificationChannel(
                channelId,
                channelName,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = channelDesc
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)

            val title = if (language == "bn") "মুযাক্কির" else "Muzakkir"
            val text = if (language == "bn") "স্মরণ কার্ড প্রদর্শিত হচ্ছে..." else "Reminder card is active"

            val notification: Notification = NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.notification_icon)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val serviceType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                } else {
                    0
                }
                androidx.core.app.ServiceCompat.startForeground(
                    this,
                    FOREGROUND_NOTIFICATION_ID,
                    notification,
                    serviceType
                )
            } else {
                startForeground(FOREGROUND_NOTIFICATION_ID, notification)
            }
        }
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    private fun getUsableScreenDimensions(): Pair<Int, Int> {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val metrics = wm.currentWindowMetrics
            val windowBounds = metrics.bounds
            val insets = metrics.windowInsets.getInsetsIgnoringVisibility(
                WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()
            )
            val usableWidth = windowBounds.width() - insets.left - insets.right
            val usableHeight = windowBounds.height() - insets.top - insets.bottom
            return Pair(usableWidth, usableHeight)
        } else {
            val dm = DisplayMetrics()
            @Suppress("DEPRECATION")
            wm.defaultDisplay.getMetrics(dm)
            return Pair(dm.widthPixels, dm.heightPixels)
        }
    }

    data class CardBounds(
        val minWidthPx: Int,
        val maxWidthPx: Int,
        val minHeightPx: Int,
        val maxHeightPx: Int
    )

    private fun computeCardBounds(): CardBounds {
        val (usableWidth, usableHeight) = getUsableScreenDimensions()
        val isLandscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        val smallestWidthDp = resources.configuration.smallestScreenWidthDp
        val isTablet = smallestWidthDp >= 600
        val density = resources.displayMetrics.density

        val minWidthPx: Int
        val maxWidthPx: Int

        if (isTablet) {
            val targetW = (usableWidth * 0.75).toInt()
            maxWidthPx = Math.min((520 * density).toInt(), targetW)
            minWidthPx = Math.min((360 * density).toInt(), maxWidthPx)
        } else if (isLandscape) {
            val targetW = (usableWidth * 0.65).toInt()
            val minClamp = (280 * density).toInt()
            val maxClamp = (480 * density).toInt()
            minWidthPx = Math.min(minClamp, usableWidth)
            maxWidthPx = Math.max(minWidthPx, Math.min(maxClamp, targetW))
        } else {
            val targetW = (usableWidth * 0.90).toInt()
            val minClamp = (280 * density).toInt()
            val maxClamp = (480 * density).toInt()
            minWidthPx = Math.min(minClamp, usableWidth)
            maxWidthPx = Math.max(minWidthPx, Math.min(maxClamp, targetW))
        }

        val minHeightPx = Math.max((140 * density).toInt(), (usableHeight * 0.20).toInt())
        val maxHeightPx = (usableHeight * 0.72).toInt()

        return CardBounds(minWidthPx, maxWidthPx, minHeightPx, maxHeightPx)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        overlayView?.findViewById<BoundedCardLayout>(R.id.card_container)?.let { card ->
            val bounds = computeCardBounds()
            card.minWidthPx = bounds.minWidthPx
            card.maxWidthPx = bounds.maxWidthPx
            card.minHeightPx = bounds.minHeightPx
            card.maxHeightPx = bounds.maxHeightPx
            card.requestLayout()
        }
    }

    private fun showOverlay(
        contentId: String,
        contentType: String,
        reference: String,
        arabic: String,
        translation: String,
        badge: String?,
        category: String?,
        reflection: String?,
        narrator: String?,
        grade: String?,
        chapterTitle: String?,
        sectionTitle: String?,
        note: String?,
        collectionKey: String?,
        hadithNumber: String?,
        surahNumber: String?,
        ayahStart: String?,
        ayahEnd: String?,
        language: String = "en",
        scheduledTime: Long = 0L,
        receiveTime: Long = System.currentTimeMillis()
    ) {
        removeOverlay()

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
        overlayView = inflater.inflate(R.layout.floating_reminder_card, null)

        // Configure BoundedCardLayout with exact frozen geometry bounds
        val bounds = computeCardBounds()
        val cardContainer = overlayView?.findViewById<BoundedCardLayout>(R.id.card_container)
        cardContainer?.let { card ->
            card.minWidthPx = bounds.minWidthPx
            card.maxWidthPx = bounds.maxWidthPx
            card.minHeightPx = bounds.minHeightPx
            card.maxHeightPx = bounds.maxHeightPx
        }

        // Populate Views
        val tvReference = overlayView?.findViewById<TextView>(R.id.tv_reference)
        val tvChapterSection = overlayView?.findViewById<TextView>(R.id.tv_chapter_section)
        val tvArabic = overlayView?.findViewById<TextView>(R.id.tv_arabic)
        val tvTranslation = overlayView?.findViewById<TextView>(R.id.tv_translation)
        val tvNarrator = overlayView?.findViewById<TextView>(R.id.tv_narrator)
        val tvFootnote = overlayView?.findViewById<TextView>(R.id.tv_footnote)
        val tvBadge = overlayView?.findViewById<TextView>(R.id.tv_badge)
        val tvGrade = overlayView?.findViewById<TextView>(R.id.tv_grade)
        val tvCategory = overlayView?.findViewById<TextView>(R.id.tv_category)
        val tvReflection = overlayView?.findViewById<TextView>(R.id.tv_reflection)
        val btnClose = overlayView?.findViewById<TextView>(R.id.btn_close)
        val btnSeeMore = overlayView?.findViewById<Button>(R.id.btn_see_more)
        val backdrop = overlayView?.findViewById<FrameLayout>(R.id.overlay_backdrop)

        tvReference?.text = reference
        tvTranslation?.text = translation

        // Arabic Matn: Visible for BOTH Quran and Hadith whenever present
        if (!arabic.isNullOrBlank()) {
            tvArabic?.visibility = View.VISIBLE
            tvArabic?.text = arabic
        } else {
            tvArabic?.visibility = View.GONE
        }

        // Narrator attribution (Hadith)
        if (!narrator.isNullOrBlank()) {
            tvNarrator?.visibility = View.VISIBLE
            val narratorPrefix = if (language == "bn") "বর্ণনায়: " else "Narrated by: "
            tvNarrator?.text = "$narratorPrefix$narrator"
        } else {
            tvNarrator?.visibility = View.GONE
        }

        // Authenticity Grade Pill
        if (!grade.isNullOrBlank()) {
            tvGrade?.visibility = View.VISIBLE
            tvGrade?.text = grade
        } else {
            tvGrade?.visibility = View.GONE
        }

        // Chapter & Section context
        val hasChapter = !chapterTitle.isNullOrBlank()
        val hasSection = !sectionTitle.isNullOrBlank()
        if (hasChapter || hasSection) {
            tvChapterSection?.visibility = View.VISIBLE
            val chapPrefix = if (language == "bn") "অধ্যায়: " else "Chapter: "
            val secPrefix = if (language == "bn") "অনুচ্ছেদ: " else "Section: "
            tvChapterSection?.text = when {
                hasChapter && hasSection -> "$chapPrefix$chapterTitle • $secPrefix$sectionTitle"
                hasChapter -> "$chapPrefix$chapterTitle"
                else -> "$secPrefix$sectionTitle"
            }
        } else {
            tvChapterSection?.visibility = View.GONE
        }

        // Footnote / Scholarly Note
        if (!note.isNullOrBlank()) {
            tvFootnote?.visibility = View.VISIBLE
            val notePrefix = if (language == "bn") "[টীকা] " else "[Note] "
            tvFootnote?.text = "$notePrefix$note"
        } else {
            tvFootnote?.visibility = View.GONE
        }

        // Unified Identity Badge (Single semantic unit)
        val unifiedBadge = if (language == "bn") {
            if (contentType == "hadith") "সহিহ হাদিস · দৈনিক স্মরণ" else "কুরআনুল কারীম · দৈনিক স্মরণ"
        } else {
            if (contentType == "hadith") "Sahih Hadith · Daily Reminder" else "The Noble Quran · Daily Reminder"
        }
        tvBadge?.visibility = View.VISIBLE
        tvBadge?.text = unifiedBadge
        tvCategory?.visibility = View.GONE

        // Localized button texts and accessibility descriptions
        if (language == "bn") {
            btnSeeMore?.text = "আরও পড়ুন"
            btnClose?.contentDescription = "স্মরণ কার্ড বন্ধ করুন"
            btnSeeMore?.contentDescription = "সম্পূর্ণ বিস্তারিত পড়তে অ্যাপ খুলুন"
        } else {
            btnSeeMore?.text = "Read More"
            btnClose?.contentDescription = "Close reminder"
            btnSeeMore?.contentDescription = "Read full details in app"
        }

        // Reflection Box
        if (!reflection.isNullOrBlank()) {
            tvReflection?.visibility = View.VISIBLE
            tvReflection?.text = reflection
        } else {
            tvReflection?.visibility = View.GONE
        }

        // Dismiss callbacks
        val dismissAction = View.OnClickListener {
            removeOverlay()
            stopForegroundCompat()
            stopSelf()
        }

        btnClose?.setOnClickListener(dismissAction)
        backdrop?.setOnClickListener(dismissAction)
        // Prevent click on card container from dismissing backdrop
        cardContainer?.setOnClickListener { /* consume click */ }

        // See More navigation — preserve task stack without FLAG_ACTIVITY_CLEAR_TOP
        btnSeeMore?.setOnClickListener {
            removeOverlay()
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("content_id", contentId)
                putExtra("content_type", contentType)
                collectionKey?.let { putExtra("collection_key", it) }
                hadithNumber?.let { putExtra("hadith_number", it) }
                chapterTitle?.let { putExtra("chapter_title", it) }
                sectionTitle?.let { putExtra("section_title", it) }
                surahNumber?.let { putExtra("surah_number", it) }
                ayahStart?.let { putExtra("ayah_start", it) }
                ayahEnd?.let { putExtra("ayah_end", it) }
            }
            if (launchIntent != null) {
                try {
                    startActivity(launchIntent)
                } catch (e: Exception) {
                    android.util.Log.e("OverlayReminderService", "Failed to launch app activity from overlay", e)
                }
            }
            stopForegroundCompat()
            stopSelf()
        }

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        try {
            windowManager?.addView(overlayView, params)
            val renderTime = System.currentTimeMillis()
            val renderLatencyMs = renderTime - receiveTime
            val totalDeviationMs = if (scheduledTime > 0) renderTime - scheduledTime else 0L

            android.util.Log.i(
                "ReminderTelemetry",
                "OVERLAY_ATTACHED: renderTime=$renderTime, renderLatencyMs=${renderLatencyMs}ms, totalDeviationFromScheduled=${totalDeviationMs}ms"
            )
        } catch (e: Exception) {
            android.util.Log.e("OverlayReminderService", "Failed to add overlay view, falling back to notification", e)
            ReminderAlarmReceiver.showFallbackNotification(
                context = this,
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
            removeOverlay()
            stopForegroundCompat()
            stopSelf()
        }
    }

    @Synchronized
    private fun removeOverlay() {
        if (overlayView != null && windowManager != null) {
            try {
                if (overlayView?.isAttachedToWindow == true) {
                    windowManager?.removeView(overlayView)
                }
            } catch (e: Exception) {
                android.util.Log.w("OverlayReminderService", "Safe cleanup on overlay removeView", e)
            }
            overlayView = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
        stopForegroundCompat()
    }

    companion object {
        const val FOREGROUND_NOTIFICATION_ID = 9981
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
        const val EXTRA_LANGUAGE = "extra_language"
    }
}
