#!/usr/bin/env python3
"""
Load hadeethenc_multilingual_pool.json → reminder_app.db
=========================================================
Creates the `multilingual_hadith_pool` table and populates it from the
JSON file produced by ingest_hadeethenc.py.

Run AFTER ingest_hadeethenc.py completes.

Usage:
  python3 scripts/ingest_hadeethenc_to_db.py
"""

import os
import sys
import json
import sqlite3
import logging

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(BASE_DIR, "assets", "database", "reminder_app.db")
POOL_PATH = os.path.join(BASE_DIR, "assets", "data", "hadeethenc_multilingual_pool.json")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

TARGET_LANGS = ["ar", "en", "zh", "hi", "es", "fr", "bn", "pt", "ru", "ur"]

DDL = """
CREATE TABLE IF NOT EXISTS multilingual_hadith_pool (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    hadeethenc_id         INTEGER NOT NULL UNIQUE,
    source                TEXT    NOT NULL DEFAULT 'HadeethEnc.com',
    source_url            TEXT    NOT NULL,
    fetch_date            TEXT    NOT NULL,
    api_version           TEXT    NOT NULL DEFAULT 'v1',
    license               TEXT    NOT NULL,
    grade                 TEXT,
    grade_ar              TEXT,
    attribution           TEXT,
    attribution_ar        TEXT,
    hadeeth_ar            TEXT    NOT NULL,
    hadeeth_intro_ar      TEXT,
    ar_text_hash          TEXT    NOT NULL,
    cross_ref_existing_id TEXT,
    translations_json     TEXT    NOT NULL,    -- JSON: {lang: {text, intro}}
    lang_ar               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.ar.text')) VIRTUAL,
    lang_en               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.en.text')) VIRTUAL,
    lang_zh               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.zh.text')) VIRTUAL,
    lang_hi               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.hi.text')) VIRTUAL,
    lang_es               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.es.text')) VIRTUAL,
    lang_fr               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.fr.text')) VIRTUAL,
    lang_bn               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.bn.text')) VIRTUAL,
    lang_pt               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.pt.text')) VIRTUAL,
    lang_ru               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.ru.text')) VIRTUAL,
    lang_ur               TEXT    GENERATED ALWAYS AS (json_extract(translations_json, '$.ur.text')) VIRTUAL
);

CREATE INDEX IF NOT EXISTS idx_mlhp_hadeethenc_id ON multilingual_hadith_pool (hadeethenc_id);
CREATE INDEX IF NOT EXISTS idx_mlhp_grade          ON multilingual_hadith_pool (grade);
CREATE INDEX IF NOT EXISTS idx_mlhp_cross_ref      ON multilingual_hadith_pool (cross_ref_existing_id);
CREATE INDEX IF NOT EXISTS idx_mlhp_ar_hash        ON multilingual_hadith_pool (ar_text_hash);
"""


def load_pool() -> dict:
    if not os.path.exists(POOL_PATH):
        log.error(f"Pool file not found: {POOL_PATH}")
        log.error("Run scripts/ingest_hadeethenc.py first.")
        sys.exit(1)
    with open(POOL_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_record(rec: dict) -> list[str]:
    """Returns list of validation errors for a record (empty = valid)."""
    errors = []
    if not rec.get("hadeethenc_id"):
        errors.append("missing hadeethenc_id")
    if not rec.get("hadeeth_ar", "").strip():
        errors.append("missing hadeeth_ar")
    if not rec.get("grade", "").strip():
        errors.append("missing grade")
    if not rec.get("attribution", "").strip():
        errors.append("missing attribution")
    translations = rec.get("translations", {})
    for lang in TARGET_LANGS:
        if lang not in translations:
            errors.append(f"missing translation: {lang}")
        elif not translations[lang].get("text", "").strip():
            errors.append(f"empty translation text: {lang}")
    return errors


def main():
    log.info(f"Loading pool from: {POOL_PATH}")
    pool = load_pool()

    hadiths = pool.get("hadiths", [])
    metadata = pool.get("metadata", {})

    log.info(f"Pool metadata: {json.dumps({k: v for k, v in metadata.items() if k != 'language_roles'}, indent=2)}")
    log.info(f"Records to load: {len(hadiths)}")

    if not hadiths:
        log.error("Pool is empty — nothing to load")
        sys.exit(1)

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")

    # Create tables and indexes
    conn.executescript(DDL)
    conn.commit()
    log.info("DDL applied")

    inserted = 0
    updated = 0
    rejected = 0

    for rec in hadiths:
        errors = validate_record(rec)
        if errors:
            log.warning(f"  Rejecting ID={rec.get('hadeethenc_id', '?')}: {errors}")
            rejected += 1
            continue

        translations_json = json.dumps(rec["translations"], ensure_ascii=False)

        try:
            existing = conn.execute(
                "SELECT id FROM multilingual_hadith_pool WHERE hadeethenc_id = ?",
                (rec["hadeethenc_id"],)
            ).fetchone()

            if existing:
                conn.execute("""
                    UPDATE multilingual_hadith_pool SET
                        fetch_date = ?, grade = ?, grade_ar = ?,
                        attribution = ?, attribution_ar = ?,
                        hadeeth_ar = ?, hadeeth_intro_ar = ?,
                        ar_text_hash = ?, cross_ref_existing_id = ?,
                        translations_json = ?, source_url = ?
                    WHERE hadeethenc_id = ?
                """, (
                    rec.get("fetch_date", ""),
                    rec.get("grade", ""),
                    rec.get("grade_ar", ""),
                    rec.get("attribution", ""),
                    rec.get("attribution_ar", ""),
                    rec.get("hadeeth_ar", ""),
                    rec.get("hadeeth_intro_ar", ""),
                    rec.get("ar_text_hash", ""),
                    rec.get("cross_ref_existing_id"),
                    translations_json,
                    rec.get("source_url", ""),
                    rec["hadeethenc_id"],
                ))
                updated += 1
            else:
                conn.execute("""
                    INSERT INTO multilingual_hadith_pool (
                        hadeethenc_id, source, source_url, fetch_date, api_version, license,
                        grade, grade_ar, attribution, attribution_ar,
                        hadeeth_ar, hadeeth_intro_ar, ar_text_hash,
                        cross_ref_existing_id, translations_json
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    rec["hadeethenc_id"],
                    rec.get("source", "HadeethEnc.com"),
                    rec.get("source_url", ""),
                    rec.get("fetch_date", ""),
                    rec.get("api_version", "v1"),
                    rec.get("license", ""),
                    rec.get("grade", ""),
                    rec.get("grade_ar", ""),
                    rec.get("attribution", ""),
                    rec.get("attribution_ar", ""),
                    rec.get("hadeeth_ar", ""),
                    rec.get("hadeeth_intro_ar", ""),
                    rec.get("ar_text_hash", ""),
                    rec.get("cross_ref_existing_id"),
                    translations_json,
                ))
                inserted += 1

        except sqlite3.Error as e:
            log.error(f"  DB error for ID={rec.get('hadeethenc_id')}: {e}")
            rejected += 1

    conn.commit()

    # Verify final count
    final_count = conn.execute("SELECT COUNT(*) FROM multilingual_hadith_pool").fetchone()[0]
    conn.close()

    log.info("=" * 60)
    log.info(f"Load complete: {inserted} inserted, {updated} updated, {rejected} rejected")
    log.info(f"Final table size: {final_count} records")
    log.info("NOTE: run `npm test` to verify pool integrity before declaring multilingual support complete.")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
