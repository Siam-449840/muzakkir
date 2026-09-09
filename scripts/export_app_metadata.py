#!/usr/bin/env python3
"""
Exports lightweight metadata indices for the React Native mobile client.
Enables instantaneous cold starts and rapid UI list rendering.
"""

import os
import json
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "assets", "database", "reminder_app.db")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets", "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Surahs List
cursor.execute("""
SELECT surah_number, surah_name, surah_name_ar, surah_name_translation, COUNT(*) as total_ayahs, MIN(juz) as start_juz, revelation_type
FROM quran_verses
GROUP BY surah_number
ORDER BY surah_number ASC;
""")
surah_rows = cursor.fetchall()
surahs = [
    {
        "number": r[0],
        "name": r[1],
        "name_ar": r[2],
        "name_translation": r[3],
        "total_ayahs": r[4],
        "start_juz": r[5],
        "revelation_type": r[6]
    }
    for r in surah_rows
]

with open(os.path.join(OUTPUT_DIR, "surahs.json"), "w", encoding="utf-8") as f:
    json.dump(surahs, f, ensure_ascii=False, indent=2)
print(f"✓ Exported {len(surahs)} surahs to surahs.json")

# 2. Hadith Collections List
cursor.execute("""
SELECT collection_key, collection, COUNT(*) as total_records, authenticity_status
FROM hadith_records
GROUP BY collection_key
ORDER BY total_records DESC;
""")
coll_rows = cursor.fetchall()
collections = [
    {
        "key": r[0],
        "name": r[1],
        "total_records": r[2],
        "authenticity_summary": r[3]
    }
    for r in coll_rows
]

with open(os.path.join(OUTPUT_DIR, "hadith_collections.json"), "w", encoding="utf-8") as f:
    json.dump(collections, f, ensure_ascii=False, indent=2)
print(f"✓ Exported {len(collections)} collections to hadith_collections.json")

# 3. Curated Daily Candidate Pool with text excerpts
cursor.execute("""
SELECT c.content_id, c.content_type, c.notification_suitability, c.reason, c.topic_cluster, c.cooldown_days,
       q.surah_number, q.surah_name, q.surah_name_ar, q.ayah_number,
       qt_ar.text as ar_text, qt_en.text as en_text, qt_bn.text as bn_text, qt_ur.text as ur_text, qt_fr.text as fr_text
FROM curated_daily_pool c
JOIN quran_verses q ON c.content_id = q.id
LEFT JOIN quran_translations qt_ar ON q.id = qt_ar.verse_id AND qt_ar.language_code = 'ar'
LEFT JOIN quran_translations qt_en ON q.id = qt_en.verse_id AND qt_en.language_code = 'en'
LEFT JOIN quran_translations qt_bn ON q.id = qt_bn.verse_id AND qt_bn.language_code = 'bn'
LEFT JOIN quran_translations qt_ur ON q.id = qt_ur.verse_id AND qt_ur.language_code = 'ur'
LEFT JOIN quran_translations qt_fr ON q.id = qt_fr.verse_id AND qt_fr.language_code = 'fr'
WHERE c.content_type = 'quran';
""")
quran_daily_rows = cursor.fetchall()
quran_daily_pool = [
    {
        "content_id": r[0],
        "content_type": "quran",
        "suitability": r[2],
        "reason": r[3],
        "topic": r[4],
        "cooldown_days": r[5],
        "reference": {
            "surah_number": r[6],
            "surah_name": r[7],
            "surah_name_ar": r[8],
            "ayah_number": r[9]
        },
        "translations": {
            "ar": r[10] or "",
            "en": r[11] or "",
            "bn": r[12] or "",
            "ur": r[13] or "",
            "fr": r[14] or ""
        }
    }
    for r in quran_daily_rows
]

cursor.execute("""
SELECT c.content_id, c.content_type, c.notification_suitability, c.reason, c.topic_cluster, c.cooldown_days,
       h.collection, h.collection_key, h.hadith_number, h.authenticity_status,
       ht_ar.text as ar_text, ht_en.text as en_text, ht_bn.text as bn_text, ht_ur.text as ur_text, ht_fr.text as fr_text
FROM curated_daily_pool c
JOIN hadith_records h ON c.content_id = h.id
LEFT JOIN hadith_translations ht_ar ON h.id = ht_ar.hadith_id AND ht_ar.language_code = 'ar'
LEFT JOIN hadith_translations ht_en ON h.id = ht_en.hadith_id AND ht_en.language_code = 'en'
LEFT JOIN hadith_translations ht_bn ON h.id = ht_bn.hadith_id AND ht_bn.language_code = 'bn'
LEFT JOIN hadith_translations ht_ur ON h.id = ht_ur.hadith_id AND ht_ur.language_code = 'ur'
LEFT JOIN hadith_translations ht_fr ON h.id = ht_fr.hadith_id AND ht_fr.language_code = 'fr'
WHERE c.content_type = 'hadith';
""")
hadith_daily_rows = cursor.fetchall()
hadith_daily_pool = [
    {
        "content_id": r[0],
        "content_type": "hadith",
        "suitability": r[2],
        "reason": r[3],
        "topic": r[4],
        "cooldown_days": r[5],
        "reference": {
            "collection": r[6],
            "collection_key": r[7],
            "hadith_number": r[8],
            "authenticity_status": r[9]
        },
        "translations": {
            "ar": r[10] or "",
            "en": r[11] or "",
            "bn": r[12] or "",
            "ur": r[13] or "",
            "fr": r[14] or ""
        }
    }
    for r in hadith_daily_rows
]

daily_pool_meta = {
    "quran_count": len(quran_daily_pool),
    "hadith_count": len(hadith_daily_pool),
    "quran_items": quran_daily_pool,
    "hadith_items": hadith_daily_pool
}

with open(os.path.join(OUTPUT_DIR, "curated_daily_pool.json"), "w", encoding="utf-8") as f:
    json.dump(daily_pool_meta, f, ensure_ascii=False)
print(f"✓ Exported curated daily pool ({len(quran_daily_pool)} Quran, {len(hadith_daily_pool)} Hadith) to curated_daily_pool.json")

# 4. Categories Taxonomy
cursor.execute("SELECT id, name_en, name_ar, icon, description, keywords_json FROM categories;")
cat_rows = cursor.fetchall()
categories = [
    {
        "id": r[0],
        "name_en": r[1],
        "name_ar": r[2],
        "icon": r[3],
        "description": r[4],
        "keywords": json.loads(r[5])
    }
    for r in cat_rows
]
with open(os.path.join(OUTPUT_DIR, "categories.json"), "w", encoding="utf-8") as f:
    json.dump(categories, f, ensure_ascii=False, indent=2)
print(f"✓ Exported {len(categories)} categories to categories.json")

# 5. Registries
cursor.execute("SELECT source_id, source_type, title, author, organization, url, edition, language, license, verification_status, verification_notes FROM sources_registry;")
s_rows = cursor.fetchall()
sources_list = [
    {
        "source_id": r[0],
        "source_type": r[1],
        "title": r[2],
        "author": r[3],
        "organization": r[4],
        "url": r[5],
        "edition": r[6],
        "language": r[7],
        "license": r[8],
        "verification_status": r[9],
        "verification_notes": r[10]
    }
    for r in s_rows
]

cursor.execute("SELECT translation_id, content_type, language, language_code, is_original_text, translator, title, source_url, attribution, verification_notes FROM translation_registry;")
t_rows = cursor.fetchall()
trans_list = [
    {
        "translation_id": r[0],
        "content_type": r[1],
        "language": r[2],
        "language_code": r[3],
        "is_original_text": bool(r[4]),
        "translator": r[5],
        "title": r[6],
        "source_url": r[7],
        "attribution": r[8],
        "verification_notes": r[9]
    }
    for r in t_rows
]

cursor.execute("SELECT tafsir_id, edition_numeric_id, name, author, language, slug, source_host, fetch_pattern, verification_notes FROM tafsir_registry;")
tf_rows = cursor.fetchall()
tafsir_list = [
    {
        "tafsir_id": r[0],
        "edition_numeric_id": r[1],
        "name": r[2],
        "author": r[3],
        "language": r[4],
        "slug": r[5],
        "source_host": r[6],
        "fetch_pattern": r[7],
        "verification_notes": r[8]
    }
    for r in tf_rows
]

registries_bundle = {
    "sources": sources_list,
    "translations": trans_list,
    "tafsir_editions": tafsir_list
}

with open(os.path.join(OUTPUT_DIR, "registries.json"), "w", encoding="utf-8") as f:
    json.dump(registries_bundle, f, ensure_ascii=False, indent=2)
print(f"✓ Exported registries bundle to registries.json")

conn.close()
print("✨ Metadata export complete!")
