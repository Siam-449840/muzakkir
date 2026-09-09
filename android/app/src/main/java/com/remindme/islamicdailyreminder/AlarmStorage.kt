package com.remindme.islamicdailyreminder

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class AlarmRecord(
    val contentId: String,
    val contentType: String,
    val reference: String,
    val arabic: String,
    val translation: String,
    val badge: String?,
    val category: String?,
    val reflection: String?,
    val narrator: String? = null,
    val grade: String? = null,
    val chapterTitle: String? = null,
    val sectionTitle: String? = null,
    val note: String? = null,
    val collectionKey: String? = null,
    val hadithNumber: String? = null,
    val surahNumber: String? = null,
    val ayahStart: String? = null,
    val ayahEnd: String? = null,
    val language: String,
    val triggerAtMillis: Long,
    val dateStr: String,
    val timeStr: String
) {
    fun toJsonObject(): JSONObject {
        return JSONObject().apply {
            put("contentId", contentId)
            put("contentType", contentType)
            put("reference", reference)
            put("arabic", arabic)
            put("translation", translation)
            put("badge", badge ?: "")
            put("category", category ?: "")
            put("reflection", reflection ?: "")
            put("narrator", narrator ?: "")
            put("grade", grade ?: "")
            put("chapterTitle", chapterTitle ?: "")
            put("sectionTitle", sectionTitle ?: "")
            put("note", note ?: "")
            put("collectionKey", collectionKey ?: "")
            put("hadithNumber", hadithNumber ?: "")
            put("surahNumber", surahNumber ?: "")
            put("ayahStart", ayahStart ?: "")
            put("ayahEnd", ayahEnd ?: "")
            put("language", language)
            put("triggerAtMillis", triggerAtMillis)
            put("dateStr", dateStr)
            put("timeStr", timeStr)
        }
    }

    companion object {
        fun fromJsonObject(obj: JSONObject): AlarmRecord? {
            val contentId = obj.optString("contentId")
            if (contentId.isNullOrBlank()) return null
            return AlarmRecord(
                contentId = contentId,
                contentType = obj.optString("contentType", "quran"),
                reference = obj.optString("reference", ""),
                arabic = obj.optString("arabic", ""),
                translation = obj.optString("translation", ""),
                badge = obj.optString("badge").takeIf { it.isNotEmpty() },
                category = obj.optString("category").takeIf { it.isNotEmpty() },
                reflection = obj.optString("reflection").takeIf { it.isNotEmpty() },
                narrator = obj.optString("narrator").takeIf { it.isNotEmpty() },
                grade = obj.optString("grade").takeIf { it.isNotEmpty() },
                chapterTitle = obj.optString("chapterTitle").takeIf { it.isNotEmpty() },
                sectionTitle = obj.optString("sectionTitle").takeIf { it.isNotEmpty() },
                note = obj.optString("note").takeIf { it.isNotEmpty() },
                collectionKey = obj.optString("collectionKey").takeIf { it.isNotEmpty() },
                hadithNumber = obj.optString("hadithNumber").takeIf { it.isNotEmpty() },
                surahNumber = obj.optString("surahNumber").takeIf { it.isNotEmpty() },
                ayahStart = obj.optString("ayahStart").takeIf { it.isNotEmpty() },
                ayahEnd = obj.optString("ayahEnd").takeIf { it.isNotEmpty() },
                language = obj.optString("language", "en"),
                triggerAtMillis = obj.optLong("triggerAtMillis", 0L),
                dateStr = obj.optString("dateStr", ""),
                timeStr = obj.optString("timeStr", "")
            )
        }
    }
}

object AlarmStorage {
    private const val PREFS_NAME = "com.remindme.islamicdailyreminder.ALARM_STORAGE"
    private const val KEY_ALARMS_JSON = "active_alarms_json"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    fun getAllAlarms(context: Context): List<AlarmRecord> {
        val prefs = getPrefs(context)
        val raw = prefs.getString(KEY_ALARMS_JSON, null) ?: return emptyList()
        val list = mutableListOf<AlarmRecord>()
        try {
            val jsonArray = JSONArray(raw)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val record = AlarmRecord.fromJsonObject(obj)
                if (record != null) {
                    list.add(record)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("AlarmStorage", "Failed to parse stored alarms", e)
        }
        return list
    }

    @Synchronized
    fun getAlarm(context: Context, contentId: String): AlarmRecord? {
        return getAllAlarms(context).firstOrNull { it.contentId == contentId }
    }

    @Synchronized
    fun saveAlarm(context: Context, record: AlarmRecord) {
        val current = getAllAlarms(context).toMutableList()
        // Remove existing with same contentId to prevent duplicates
        current.removeAll { it.contentId == record.contentId }
        current.add(record)
        persistList(context, current)
    }

    @Synchronized
    fun removeAlarm(context: Context, contentId: String) {
        val current = getAllAlarms(context).toMutableList()
        val removed = current.removeAll { it.contentId == contentId }
        if (removed) {
            persistList(context, current)
        }
    }

    @Synchronized
    fun clearAllAlarms(context: Context) {
        getPrefs(context).edit().remove(KEY_ALARMS_JSON).apply()
    }

    private fun persistList(context: Context, list: List<AlarmRecord>) {
        val jsonArray = JSONArray()
        for (item in list) {
            jsonArray.put(item.toJsonObject())
        }
        getPrefs(context).edit().putString(KEY_ALARMS_JSON, jsonArray.toString()).apply()
    }
}
