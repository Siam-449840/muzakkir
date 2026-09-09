#!/usr/bin/env python3
"""
Ingestion & Validation Pipeline for Islamic Daily Reminder App.
Reads canonical JSON datasets, validates structural integrity,
and generates a normalized, indexed SQLite database for production mobile runtime.
"""

import os
import sys
import json
import sqlite3
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_OUTPUT_DIR = os.path.join(BASE_DIR, "assets", "database")
DB_OUTPUT_PATH = os.path.join(DB_OUTPUT_DIR, "reminder_app.db")

QURAN_SOURCE = os.path.join(BASE_DIR, "master_quran_verified.json")
HADITH_SOURCE = os.path.join(BASE_DIR, "master_hadith_verified.json")
CURATED_QURAN_SOURCE = os.path.join(BASE_DIR, "curated_quran_daily.json")
CURATED_HADITH_SOURCE = os.path.join(BASE_DIR, "curated_hadith_daily.json")
DAILY_CONTENT_SOURCE = os.path.join(BASE_DIR, "daily_content.json")
SOURCES_REGISTRY = os.path.join(BASE_DIR, "sources.json")
TRANSLATION_REGISTRY = os.path.join(BASE_DIR, "translation_sources.json")
TAFSIR_REGISTRY = os.path.join(BASE_DIR, "tafsir_sources.json")

# Controlled category taxonomy
DEFAULT_CATEGORIES = [
    {
        "id": "patience",
        "name_en": "Patience & Perseverance",
        "name_ar": "الصبر والاستقامة",
        "icon": "hourglass-outline",
        "description": "Remaining steadfast through trials, hardships, and worship.",
        "keywords": ["patience", "patient", "persevere", "endurance", "sabr", "steadfast", "trial", "hardship", "bear"]
    },
    {
        "id": "gratitude",
        "name_en": "Gratitude & Contentment",
        "name_ar": "الشكر والرضا",
        "icon": "heart-outline",
        "description": "Recognizing Allah's countless blessings and giving heartfelt thanks.",
        "keywords": ["gratitude", "thank", "grateful", "blessing", "praise", "alhamdulillah", "contentment", "shukr", "bounties", "favours"]
    },
    {
        "id": "tawbah",
        "name_en": "Repentance & Forgiveness",
        "name_ar": "التوبة والمغفرة",
        "icon": "refresh-outline",
        "description": "Turning back to Allah with humility and seeking His boundless forgiveness.",
        "keywords": ["forgive", "forgiveness", "repent", "repentance", "tawbah", "sin", "merciful", "pardon", "astaghfirullah", "turn unto"]
    },
    {
        "id": "prayer",
        "name_en": "Prayer & Remembrance",
        "name_ar": "الصلاة والذكر",
        "icon": "sparkles-outline",
        "description": "Connecting with the Creator through daily Salah and constant Dhikr.",
        "keywords": ["prayer", "salah", "remembrance", "dhikr", "prostration", "sujood", "mosque", "worship", "glorify", "supplicate", "dua"]
    },
    {
        "id": "mercy",
        "name_en": "Mercy & Compassion",
        "name_ar": "الرحمة والشفقة",
        "icon": "water-outline",
        "description": "Reflecting divine mercy and showing kindness toward all creation.",
        "keywords": ["mercy", "compassion", "kindness", "gentle", "rahmah", "care", "affection", "softness", "compassionate"]
    },
    {
        "id": "hope",
        "name_en": "Hope & Trust in Allah",
        "name_ar": "الرجاء والتوكل",
        "icon": "sunny-outline",
        "description": "Placing complete trust (Tawakkul) in Allah's wisdom and eternal promises.",
        "keywords": ["hope", "trust", "tawakkul", "faith", "rely", "promise", "ease", "relief", "light", "despair not"]
    },
    {
        "id": "character",
        "name_en": "Character & Good Conduct",
        "name_ar": "الأخلاق والبر",
        "icon": "ribbon-outline",
        "description": "Embodying honesty, humility, generosity, and prophetic manners.",
        "keywords": ["character", "manners", "conduct", "akhlaq", "honest", "truth", "humility", "generosity", "smile", "righteous", "good"]
    },
    {
        "id": "family",
        "name_en": "Family & Kinship",
        "name_ar": "الأسرة وصلة الرحم",
        "icon": "people-outline",
        "description": "Honoring parents, nurturing children, and upholding ties of kinship.",
        "keywords": ["family", "parents", "mother", "father", "children", "kinship", "relatives", "spouse", "brother", "sister", "kindred"]
    },
    {
        "id": "knowledge",
        "name_en": "Knowledge & Reflection",
        "name_ar": "العلم والتدبر",
        "icon": "book-outline",
        "description": "Seeking beneficial knowledge and contemplating the signs of the Divine.",
        "keywords": ["knowledge", "ilm", "wisdom", "hikmah", "reflect", "contemplate", "ponder", "understand", "learn", "signs"]
    },
    {
        "id": "hereafter",
        "name_en": "The Hereafter & Ultimate Purpose",
        "name_ar": "الآخرة والمصير",
        "icon": "infinite-outline",
        "description": "Remembering the reality of the Akhirah and preparing for the eternal meeting.",
        "keywords": ["hereafter", "akhirah", "paradise", "jannah", "eternal", "resurrection", "meeting", "soul", "day of judgement", "gardens"]
    }
]

def init_database(conn):
    cursor = conn.cursor()
    
    # 1. Quran Verses Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quran_verses (
        id TEXT PRIMARY KEY,
        surah_number INTEGER NOT NULL,
        surah_name TEXT NOT NULL,
        surah_name_ar TEXT NOT NULL,
        surah_name_translation TEXT NOT NULL,
        ayah_number INTEGER NOT NULL,
        juz INTEGER NOT NULL,
        revelation_type TEXT NOT NULL,
        arabic_word_count INTEGER NOT NULL,
        is_short_form INTEGER NOT NULL
    );
    """)

    # 2. Quran Translations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quran_translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        verse_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        text TEXT NOT NULL,
        translator TEXT,
        source TEXT,
        FOREIGN KEY (verse_id) REFERENCES quran_verses(id)
    );
    """)

    # 3. Hadith Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hadith_records (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        collection_key TEXT NOT NULL,
        hadith_number INTEGER NOT NULL,
        book_number INTEGER,
        in_book_hadith_number INTEGER,
        authenticity_status TEXT NOT NULL,
        individual_grades_json TEXT,
        english_word_count INTEGER,
        is_short_form INTEGER NOT NULL
    );
    """)

    # 4. Hadith Translations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hadith_translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hadith_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        text TEXT NOT NULL,
        translator TEXT,
        source TEXT,
        FOREIGN KEY (hadith_id) REFERENCES hadith_records(id)
    );
    """)

    # 5. Curated Daily Candidate Pool Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS curated_daily_pool (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        notification_suitability TEXT NOT NULL,
        assessment_basis TEXT,
        reason TEXT,
        topic_cluster TEXT,
        cooldown_days INTEGER DEFAULT 60
    );
    """)

    # 6. Categories / Controlled Taxonomy Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT NOT NULL,
        keywords_json TEXT NOT NULL
    );
    """)

    # 7. Sources Registry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sources_registry (
        source_id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        organization TEXT,
        url TEXT,
        edition TEXT,
        language TEXT,
        license TEXT,
        verification_status TEXT,
        verification_notes TEXT
    );
    """)

    # 8. Translation Registry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS translation_registry (
        translation_id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        language TEXT NOT NULL,
        language_code TEXT NOT NULL,
        is_original_text INTEGER NOT NULL,
        translator TEXT,
        title TEXT,
        source_url TEXT,
        attribution TEXT,
        verification_notes TEXT
    );
    """)

    # 9. Tafsir Registry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tafsir_registry (
        tafsir_id TEXT PRIMARY KEY,
        edition_numeric_id INTEGER,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        language TEXT NOT NULL,
        slug TEXT NOT NULL,
        source_host TEXT,
        fetch_pattern TEXT,
        verification_notes TEXT
    );
    """)

    # 10. User Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    # 11. Reminder History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reminder_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        delivered_time TEXT,
        opened_time TEXT,
        reflected_time TEXT,
        status TEXT NOT NULL
    );
    """)

    # 12. Bookmarks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        note TEXT
    );
    """)

    # Create Indices for instant lookups
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quran_surah_ayah ON quran_verses(surah_number, ayah_number);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_quran_trans_verse_lang ON quran_translations(verse_id, language_code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hadith_coll_num ON hadith_records(collection_key, hadith_number);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hadith_trans_id_lang ON hadith_translations(hadith_id, language_code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_curated_type_suitability ON curated_daily_pool(content_type, notification_suitability);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_content ON reminder_history(content_id);")

    conn.commit()
    print("✓ SQLite schema and indices initialized successfully.")

def ingest_quran(conn):
    print("-> Ingesting master_quran_verified.json...")
    with open(QURAN_SOURCE, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data.get("records", [])
    cursor = conn.cursor()

    verse_rows = []
    trans_rows = []

    for r in records:
        v_id = r["id"]
        ref = r["reference"]
        verse_rows.append((
            v_id,
            ref["surah_number"],
            ref["surah_name"],
            ref.get("surah_name_ar", ""),
            ref.get("surah_name_translation", ""),
            ref["ayah_number"],
            ref.get("juz", 1),
            ref.get("revelation_type", "Mecca"),
            r.get("arabic_word_count", 0),
            1 if r.get("is_short_form", False) else 0
        ))

        for lang_code, trans in r.get("translations", {}).items():
            trans_rows.append((
                v_id,
                lang_code,
                trans.get("text", ""),
                trans.get("translator", ""),
                trans.get("source", "")
            ))

    cursor.executemany("""
    INSERT OR REPLACE INTO quran_verses 
    (id, surah_number, surah_name, surah_name_ar, surah_name_translation, ayah_number, juz, revelation_type, arabic_word_count, is_short_form)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, verse_rows)

    cursor.executemany("""
    INSERT INTO quran_translations (verse_id, language_code, text, translator, source)
    VALUES (?, ?, ?, ?, ?);
    """, trans_rows)

    conn.commit()
    print(f"✓ Quran ingested: {len(verse_rows)} verses, {len(trans_rows)} translations.")

def ingest_hadith(conn):
    print("-> Ingesting master_hadith_verified.json...")
    start_time = time.time()
    with open(HADITH_SOURCE, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data.get("records", [])
    cursor = conn.cursor()

    hadith_rows = []
    trans_rows = []

    for r in records:
        h_id = r["id"]
        ref = r["reference"]
        auth = r.get("authenticity", {})
        grades_json = json.dumps(auth.get("individual_grades", []))

        hadith_rows.append((
            h_id,
            ref.get("collection", ""),
            ref.get("collection_key", ""),
            ref.get("hadith_number", 0),
            ref.get("book_number"),
            ref.get("in_book_hadith_number"),
            auth.get("collection_status", "Sahih"),
            grades_json,
            r.get("english_word_count", 0),
            1 if r.get("is_short_form", False) else 0
        ))

        for lang_code, trans in r.get("translations", {}).items():
            trans_rows.append((
                h_id,
                lang_code,
                trans.get("text", ""),
                trans.get("translator", ""),
                trans.get("source", "")
            ))

    cursor.executemany("""
    INSERT OR REPLACE INTO hadith_records 
    (id, collection, collection_key, hadith_number, book_number, in_book_hadith_number, authenticity_status, individual_grades_json, english_word_count, is_short_form)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, hadith_rows)

    cursor.executemany("""
    INSERT INTO hadith_translations (hadith_id, language_code, text, translator, source)
    VALUES (?, ?, ?, ?, ?);
    """, trans_rows)

    conn.commit()
    elapsed = time.time() - start_time
    print(f"✓ Hadith ingested: {len(hadith_rows)} records, {len(trans_rows)} translations in {elapsed:.2f}s.")

def determine_topic_cluster(text, extra_text=""):
    combined = (text + " " + extra_text).lower()
    for cat in DEFAULT_CATEGORIES:
        for kw in cat["keywords"]:
            if kw in combined:
                return cat["id"]
    return "reflection"

def ingest_curated_pools(conn):
    print("-> Ingesting curated daily candidate pools...")
    cursor = conn.cursor()
    pool_rows = []

    # Quran candidates
    with open(CURATED_QURAN_SOURCE, "r", encoding="utf-8") as f:
        cq = json.load(f)

    with open(QURAN_SOURCE, "r", encoding="utf-8") as f:
        mq = json.load(f)
    quran_map = {r["id"]: r.get("translations", {}).get("en", {}).get("text", "") for r in mq["records"]}

    for item in cq:
        cid = item["content_id"]
        ed = item.get("editorial_selection", {})
        suitability = ed.get("notification_suitability", "good")
        reason = ed.get("reason", "")
        basis = ed.get("assessment_basis", "")
        en_text = quran_map.get(cid, "")
        topic = determine_topic_cluster(reason, en_text)

        pool_rows.append((
            cid,
            "quran",
            suitability,
            basis,
            reason,
            topic,
            60
        ))

    # Hadith candidates
    with open(CURATED_HADITH_SOURCE, "r", encoding="utf-8") as f:
        ch = json.load(f)

    with open(HADITH_SOURCE, "r", encoding="utf-8") as f:
        mh = json.load(f)
    hadith_map = {r["id"]: r.get("translations", {}).get("en", {}).get("text", "") for r in mh["records"]}

    for item in ch:
        cid = item["content_id"]
        ed = item.get("editorial_selection", {})
        suitability = ed.get("notification_suitability", "good")
        reason = ed.get("reason", "")
        basis = ed.get("assessment_basis", "")
        en_text = hadith_map.get(cid, "")
        topic = determine_topic_cluster(reason, en_text)

        pool_rows.append((
            cid,
            "hadith",
            suitability,
            basis,
            reason,
            topic,
            60
        ))

    cursor.executemany("""
    INSERT OR REPLACE INTO curated_daily_pool
    (content_id, content_type, notification_suitability, assessment_basis, reason, topic_cluster, cooldown_days)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, pool_rows)

    conn.commit()
    print(f"✓ Curated daily pool ingested: {len(pool_rows)} candidate items ({len(cq)} Quran, {len(ch)} Hadith).")

def ingest_categories(conn):
    print("-> Ingesting controlled category taxonomy...")
    cursor = conn.cursor()
    rows = []
    for cat in DEFAULT_CATEGORIES:
        rows.append((
            cat["id"],
            cat["name_en"],
            cat["name_ar"],
            cat["icon"],
            cat["description"],
            json.dumps(cat["keywords"])
        ))

    cursor.executemany("""
    INSERT OR REPLACE INTO categories (id, name_en, name_ar, icon, description, keywords_json)
    VALUES (?, ?, ?, ?, ?, ?);
    """, rows)
    conn.commit()
    print(f"✓ Categories ingested: {len(rows)} topic domains.")

def ingest_registries(conn):
    print("-> Ingesting sources, translations, and tafsir registries...")
    cursor = conn.cursor()

    # Sources
    with open(SOURCES_REGISTRY, "r", encoding="utf-8") as f:
        sources = json.load(f)
    s_rows = []
    for s in sources:
        s_rows.append((
            s.get("source_id"),
            s.get("source_type", ""),
            s.get("title", ""),
            s.get("author", ""),
            s.get("organization", ""),
            s.get("url", ""),
            s.get("edition", ""),
            s.get("language", ""),
            s.get("license", ""),
            s.get("verification_status", ""),
            s.get("verification_notes", "")
        ))
    cursor.executemany("""
    INSERT OR REPLACE INTO sources_registry
    (source_id, source_type, title, author, organization, url, edition, language, license, verification_status, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, s_rows)

    # Translations
    with open(TRANSLATION_REGISTRY, "r", encoding="utf-8") as f:
        translations = json.load(f)
    t_rows = []
    for t in translations:
        t_rows.append((
            t.get("translation_id"),
            t.get("content_type", ""),
            t.get("language", ""),
            t.get("language_code", ""),
            1 if t.get("is_original_text", False) else 0,
            t.get("translator", ""),
            t.get("title", ""),
            t.get("source_url", ""),
            t.get("attribution", ""),
            t.get("verification_notes", "")
        ))
    cursor.executemany("""
    INSERT OR REPLACE INTO translation_registry
    (translation_id, content_type, language, language_code, is_original_text, translator, title, source_url, attribution, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, t_rows)

    # Tafsirs
    with open(TAFSIR_REGISTRY, "r", encoding="utf-8") as f:
        tafsirs = json.load(f)
    tf_rows = []
    for tf in tafsirs:
        tf_rows.append((
            tf.get("tafsir_id"),
            tf.get("edition_numeric_id"),
            tf.get("name", ""),
            tf.get("author", ""),
            tf.get("language", ""),
            tf.get("slug", ""),
            tf.get("source_host", ""),
            tf.get("fetch_pattern", ""),
            tf.get("verification_notes", "")
        ))
    cursor.executemany("""
    INSERT OR REPLACE INTO tafsir_registry
    (tafsir_id, edition_numeric_id, name, author, language, slug, source_host, fetch_pattern, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, tf_rows)

    # Initialize default user settings
    default_settings = [
        ("reminder_enabled", "true"),
        ("daily_frequency", "3"),
        ("reminder_times", json.dumps(["08:00", "14:00", "20:00"])),
        ("timezone", "UTC"),
        ("preferred_language", "en"),
        ("ui_language", "en"),
        ("hadith_enabled", "true"),
        ("quran_enabled", "true"),
        ("sound_enabled", "true"),
        ("vibration_enabled", "true"),
        ("quiet_hours_enabled", "true"),
        ("quiet_hours_start", "22:00"),
        ("quiet_hours_end", "07:00"),
        ("cooldown_days", "60"),
        ("theme", "warm_ivory")
    ]
    cursor.executemany("INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?);", default_settings)

    conn.commit()
    print(f"✓ Registries ingested: {len(s_rows)} sources, {len(t_rows)} translations, {len(tf_rows)} tafsir editions.")

def validate_integrity(conn):
    print("-> Validating database structural integrity...")
    cursor = conn.cursor()

    # 1. Check orphan references in curated_daily_pool
    cursor.execute("""
    SELECT content_id FROM curated_daily_pool 
    WHERE content_type = 'quran' AND content_id NOT IN (SELECT id FROM quran_verses);
    """)
    orphan_quran = cursor.fetchall()

    cursor.execute("""
    SELECT content_id FROM curated_daily_pool 
    WHERE content_type = 'hadith' AND content_id NOT IN (SELECT id FROM hadith_records);
    """)
    orphan_hadith = cursor.fetchall()

    if orphan_quran:
        print(f"❌ ERROR: {len(orphan_quran)} orphan Quran candidate records found!")
        sys.exit(1)
    if orphan_hadith:
        print(f"❌ ERROR: {len(orphan_hadith)} orphan Hadith candidate records found!")
        sys.exit(1)

    print("✓ 0 orphan candidate references found.")

    # 2. Check counts
    cursor.execute("SELECT COUNT(*) FROM quran_verses;")
    q_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM hadith_records;")
    h_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM curated_daily_pool;")
    c_count = cursor.fetchone()[0]

    print(f"✓ Integrity verified: {q_count} Quran verses, {h_count} Hadiths, {c_count} Curated candidate items in SQLite.")
    print("✓ Structural validation passed with 0 errors.")

def main():
    print("============================================================")
    print("ISLAMIC DAILY REMINDER — SQLITE INGESTION & VALIDATION")
    print("============================================================")
    
    os.makedirs(DB_OUTPUT_DIR, exist_ok=True)
    if os.path.exists(DB_OUTPUT_PATH):
        os.remove(DB_OUTPUT_PATH)
        print(f"Cleared existing database at {DB_OUTPUT_PATH}")

    conn = sqlite3.connect(DB_OUTPUT_PATH)
    try:
        init_database(conn)
        ingest_quran(conn)
        ingest_hadith(conn)
        ingest_curated_pools(conn)
        ingest_categories(conn)
        ingest_registries(conn)
        validate_integrity(conn)

        db_size_mb = os.path.getsize(DB_OUTPUT_PATH) / (1024 * 1024)
        print(f"\n✨ Database successfully created at: {DB_OUTPUT_PATH} ({db_size_mb:.2f} MB)")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
