#!/usr/bin/env python3
"""
Post-Ingest SQLite Integrity Audit
====================================
Verifies the multilingual_hadith_pool SQLite table against strict invariants.
Must be run AFTER ingest_hadeethenc.py and ingest_hadeethenc_to_db.py.

Usage:
  python3 scripts/audit_multilingual_db.py [--db-path PATH]

Exit codes:
  0  All checks passed
  1  One or more checks failed
"""

import os
import sys
import json
import sqlite3
import hashlib
from datetime import datetime

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR     = os.path.join(BASE_DIR, "assets", "data")
POOL_JSON_PATH = os.path.join(ASSETS_DIR, "hadeethenc_multilingual_pool.json")
REPORT_PATH    = os.path.join(ASSETS_DIR, "hadeethenc_coverage_report.json")

# DB path: matches ingest_hadeethenc_to_db.py default
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "assets", "database", "reminder_app.db")

TARGET_LANGS = ["ar", "en", "zh", "hi", "es", "fr", "bn", "pt", "ru", "ur"]

PASS = "✅  PASS"
FAIL = "❌  FAIL"
WARN = "⚠️   WARN"


def audit_json_pool(pool_path: str) -> tuple[list[dict], list[str]]:
    """Load and validate the JSON pool file. Returns (records, failures)."""
    failures = []

    if not os.path.exists(pool_path):
        failures.append(f"Pool JSON not found: {pool_path}")
        return [], failures

    with open(pool_path, "r", encoding="utf-8") as f:
        pool = json.load(f)

    records = pool.get("hadiths", [])
    meta    = pool.get("metadata", {})

    # Metadata checks
    if meta.get("source") != "HadeethEnc.com":
        failures.append(f"metadata.source mismatch: {meta.get('source')}")
    if len(meta.get("target_languages", [])) != 10:
        failures.append(f"metadata.target_languages: expected 10, got {len(meta.get('target_languages', []))}")
    if not meta.get("license"):
        failures.append("metadata.license is empty")
    if not meta.get("fetch_date"):
        failures.append("metadata.fetch_date is empty")
    if meta.get("total_records") != len(records):
        failures.append(f"metadata.total_records ({meta.get('total_records')}) ≠ hadiths length ({len(records)})")

    return records, failures


def audit_records(records: list[dict]) -> dict:
    """Run all per-record audits. Returns stats dict."""
    arabic_range = "\u0600-\u06FF"
    import re

    total          = len(records)
    ten_lang_ok    = 0
    missing_fields = 0
    hash_mismatches = 0
    duplicate_text = 0
    duplicate_ids  = 0
    no_arabic      = 0
    ar_matn_mismatch = 0
    per_lang_counts: dict[str, int] = {l: 0 for l in TARGET_LANGS}
    failures: list[str] = []

    seen_ids: set[int] = set()
    target_set = set(TARGET_LANGS)

    for rec in records:
        hid = rec.get("hadeethenc_id")

        # Duplicate ID check
        if hid in seen_ids:
            duplicate_ids += 1
            failures.append(f"Duplicate hadeethenc_id: {hid}")
        else:
            seen_ids.add(hid)

        # Required provenance fields
        required = ["source", "source_url", "fetch_date", "license", "grade", "grade_ar", "attribution", "attribution_ar", "hadeeth_ar"]
        for field in required:
            if not rec.get(field, "").strip():
                missing_fields += 1
                failures.append(f"ID={hid}: empty field '{field}'")
                break

        # Arabic hash integrity
        hadeeth_ar = rec.get("hadeeth_ar", "").strip()
        computed_hash = hashlib.sha256(hadeeth_ar.encode("utf-8")).hexdigest()[:16]
        stored_hash = rec.get("ar_text_hash", "")
        if computed_hash != stored_hash:
            hash_mismatches += 1
            failures.append(f"ID={hid}: ar_text_hash mismatch (stored={stored_hash}, computed={computed_hash})")

        # Arabic script check
        if not re.search(f"[{arabic_range}]", hadeeth_ar):
            no_arabic += 1
            failures.append(f"ID={hid}: hadeeth_ar contains no Arabic script")

        # Translation checks
        translations = rec.get("translations", {})
        available = set(translations.keys())
        all_present = target_set.issubset(available)

        if all_present:
            ten_lang_ok += 1

        for lang in TARGET_LANGS:
            slot = translations.get(lang, {})
            text = slot.get("text", "").strip()
            if text:
                per_lang_counts[lang] += 1

        # ar slot must match hadeeth_ar
        ar_slot_text = translations.get("ar", {}).get("text", "").strip()
        if ar_slot_text != hadeeth_ar:
            ar_matn_mismatch += 1
            failures.append(f"ID={hid}: translations.ar.text ≠ hadeeth_ar")

        # Duplicate text across language slots (machine-translation indicator)
        non_ar_texts = [
            translations.get(l, {}).get("text", "").strip()
            for l in TARGET_LANGS if l != "ar"
        ]
        filled = [t for t in non_ar_texts if t]
        if len(set(filled)) < len(filled):
            duplicate_text += 1
            failures.append(f"ID={hid}: duplicate text across language slots (machine-translation indicator)")

    return {
        "total":              total,
        "ten_lang_ok":        ten_lang_ok,
        "missing_fields":     missing_fields,
        "hash_mismatches":    hash_mismatches,
        "duplicate_ids":      duplicate_ids,
        "no_arabic":          no_arabic,
        "ar_matn_mismatch":   ar_matn_mismatch,
        "duplicate_text":     duplicate_text,
        "per_lang_counts":    per_lang_counts,
        "failures":           failures,
    }


def audit_sqlite(db_path: str, json_records: list[dict]) -> list[str]:
    """Verify SQLite table contents match JSON pool."""
    failures = []

    if not os.path.exists(db_path):
        failures.append(f"SQLite DB not found: {db_path}")
        return failures

    try:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()

        # Row count
        cur.execute("SELECT COUNT(*) FROM multilingual_hadith_pool")
        db_count = cur.fetchone()[0]
        json_count = len(json_records)
        if db_count != json_count:
            failures.append(f"SQLite row count ({db_count}) ≠ JSON records ({json_count})")
        else:
            print(f"  SQLite row count:      {db_count} ✓")

        # Spot-check hadeeth_ar for first 10 records
        mismatch_spot = 0
        for rec in json_records[:10]:
            hid = rec["hadeethenc_id"]
            cur.execute("SELECT hadeeth_ar FROM multilingual_hadith_pool WHERE hadeethenc_id = ?", (hid,))
            row = cur.fetchone()
            if not row:
                failures.append(f"ID={hid}: not found in SQLite")
                mismatch_spot += 1
            elif row[0].strip() != rec["hadeeth_ar"].strip():
                failures.append(f"ID={hid}: hadeeth_ar mismatch between JSON and SQLite")
                mismatch_spot += 1
        if mismatch_spot == 0:
            print(f"  Spot-check (10 records): hadeeth_ar matches JSON ✓")

        # Verify per-language virtual columns exist and are queryable.
        # NOTE: GENERATED ALWAYS VIRTUAL columns may not appear in PRAGMA table_info
        # in older SQLite versions. Use a direct SELECT to verify each column works.
        lang_col_map = {lang: f"lang_{lang}" for lang in TARGET_LANGS}
        missing_cols = []
        for lang, col in lang_col_map.items():
            try:
                cur.execute(f"SELECT {col} FROM multilingual_hadith_pool LIMIT 1")
            except sqlite3.OperationalError:
                missing_cols.append(col)
                failures.append(f"SQLite: virtual column '{col}' is not queryable")
        if not missing_cols:
            print(f"  Virtual columns:       all 10 lang_* columns queryable ✓")


        # All rows must have non-null lang_ar
        cur.execute("SELECT COUNT(*) FROM multilingual_hadith_pool WHERE lang_ar IS NULL OR lang_ar = ''")
        null_ar = cur.fetchone()[0]
        if null_ar > 0:
            failures.append(f"SQLite: {null_ar} rows have NULL/empty lang_ar")
        else:
            print(f"  NULL lang_ar rows:     0 ✓")

        # Verify all 10 lang columns are non-null for every row
        for lang in TARGET_LANGS:
            col = f"lang_{lang}"
            cur.execute(f"SELECT COUNT(*) FROM multilingual_hadith_pool WHERE {col} IS NULL OR {col} = ''")
            null_count = cur.fetchone()[0]
            if null_count > 0:
                failures.append(f"SQLite: {null_count} rows have NULL/empty {col}")
        print(f"  All 10 lang columns:   non-null check complete ✓")

        conn.close()
    except Exception as e:
        failures.append(f"SQLite audit error: {e}")

    return failures


def print_section(title: str) -> None:
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Post-ingest multilingual Hadith integrity audit")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Path to SQLite DB")
    args = parser.parse_args()

    print("\n" + "═" * 60)
    print("  POST-INGEST MULTILINGUAL HADITH INTEGRITY AUDIT")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 60)

    all_failures = []

    # ── JSON Pool Audit ──────────────────────────────────────────────────────
    print_section("1. JSON Pool File Validation")
    json_records, json_meta_failures = audit_json_pool(POOL_JSON_PATH)
    all_failures.extend(json_meta_failures)
    if json_meta_failures:
        for f in json_meta_failures:
            print(f"  {FAIL}: {f}")
    else:
        print(f"  {PASS}: Pool JSON metadata valid")
    print(f"  Total records in JSON: {len(json_records)}")

    if not json_records:
        print(f"\n  {FAIL}: No records found. Cannot continue.")
        sys.exit(1)

    # ── Per-Record Audit ─────────────────────────────────────────────────────
    print_section("2. Per-Record Content Audit")
    stats = audit_records(json_records)

    check_map = {
        "missing_fields":   "No records with missing required fields",
        "hash_mismatches":  "No ar_text_hash mismatches",
        "duplicate_ids":    "No duplicate hadeethenc_id values",
        "no_arabic":        "No Arabic-script violations",
        "ar_matn_mismatch": "No translations.ar vs hadeeth_ar mismatches",
        "duplicate_text":   "No duplicate text across language slots",
    }
    for key, label in check_map.items():
        count = stats[key]
        status = PASS if count == 0 else FAIL
        suffix = "" if count == 0 else f" ({count} violations)"
        print(f"  {status}: {label}{suffix}")
        if count > 0:
            all_failures.extend(stats["failures"])

    # ── 10-Language Coverage ────────────────────────────────────────────────
    print_section("3. 10-Language Coverage Statistics")
    total = stats["total"]
    print(f"  Total records:               {total}")
    print(f"  Records with ALL 10 langs:   {stats['ten_lang_ok']} ({stats['ten_lang_ok']/max(total,1)*100:.1f}%)")
    print()
    for lang in TARGET_LANGS:
        count = stats["per_lang_counts"][lang]
        pct   = count / max(total, 1) * 100
        missing = total - count
        status = PASS if missing == 0 else FAIL
        tag    = f"(missing: {missing})" if missing > 0 else "✓"
        print(f"  {lang.upper().ljust(4)} {str(count).rjust(6)} / {total}  {pct:.1f}%  {tag}")
        if missing > 0:
            all_failures.append(f"lang={lang}: {missing} records missing")

    if stats["ten_lang_ok"] < total:
        all_failures.append(
            f"{total - stats['ten_lang_ok']} records do NOT have all 10 languages"
        )

    # ── SQLite Audit ─────────────────────────────────────────────────────────
    print_section("4. SQLite Database Audit")
    sqlite_failures = audit_sqlite(args.db_path, json_records)
    all_failures.extend(sqlite_failures)
    if sqlite_failures:
        for f in sqlite_failures:
            print(f"  {FAIL}: {f}")
    else:
        print(f"  {PASS}: SQLite integrity verified")

    # ── Attribution/License ──────────────────────────────────────────────────
    print_section("5. Attribution & License Compliance")
    if json_records:
        rec0 = json_records[0]
        checks = [
            ("source = HadeethEnc.com", rec0.get("source") == "HadeethEnc.com"),
            ("license field present",   bool(rec0.get("license"))),
            ("license includes 'no modification'",  "no modification" in (rec0.get("license") or "").lower()),
            ("license includes attribution requirement",  "attribution" in (rec0.get("license") or "").lower()),
            ("source_url starts with https://",     (rec0.get("source_url") or "").startswith("https://")),
            ("fetch_date in YYYY-MM-DD format",     bool(__import__("re").match(r"^\d{4}-\d{2}-\d{2}$", rec0.get("fetch_date", "")))),
        ]
        for label, ok in checks:
            status = PASS if ok else FAIL
            print(f"  {status}: {label}")
            if not ok:
                all_failures.append(f"Attribution check failed: {label}")

    # ── Final Report ─────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    if not all_failures:
        print(f"  {PASS} ALL AUDIT CHECKS PASSED")
        print(f"  Final 10-language Hadith pool: {total} records")
        print("═" * 60 + "\n")

        # Write final counts to report
        if os.path.exists(REPORT_PATH):
            with open(REPORT_PATH, "r", encoding="utf-8") as f:
                rpt = json.load(f)
            rpt["audit_result"] = "PASSED"
            rpt["audit_timestamp"] = datetime.now().isoformat()
            rpt["audit_counts"] = {
                "total_pool":       total,
                "all_10_lang":      stats["ten_lang_ok"],
                "per_lang":         stats["per_lang_counts"],
                "rejected_phase2":  rpt.get("summary", {}).get("records_rejected_phase2", 0),
                "duplicate_count":  stats["duplicate_ids"],
                "cross_ref":        sum(1 for r in json_records if r.get("cross_ref_existing_id")),
            }
            with open(REPORT_PATH, "w", encoding="utf-8") as f:
                json.dump(rpt, f, ensure_ascii=False, indent=2)
            print(f"  Audit results written to: {REPORT_PATH}")

        sys.exit(0)
    else:
        print(f"  {FAIL} {len(all_failures)} AUDIT CHECK(S) FAILED")
        print(f"\n  Failures:")
        for failure in all_failures[:20]:
            print(f"    • {failure}")
        if len(all_failures) > 20:
            print(f"    ... and {len(all_failures) - 20} more")
        print("═" * 60 + "\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
