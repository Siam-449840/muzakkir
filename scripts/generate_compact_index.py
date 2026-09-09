#!/usr/bin/env python3
"""
Generates compact daily candidate pool index for instantaneous client bootstrap.
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, "assets", "data", "curated_daily_pool.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "assets", "data", "curated_daily_pool_index.json")

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

compact_q = [
    {
        "content_id": item["content_id"],
        "suitability": item["suitability"],
        "reason": item["reason"],
        "topic": item["topic"],
        "surah_number": item["reference"]["surah_number"],
        "surah_name": item["reference"]["surah_name"],
        "surah_name_ar": item["reference"]["surah_name_ar"],
        "ayah_number": item["reference"]["ayah_number"]
    }
    for item in data["quran_items"]
]

compact_h = [
    {
        "content_id": item["content_id"],
        "suitability": item["suitability"],
        "reason": item["reason"],
        "topic": item["topic"],
        "collection": item["reference"]["collection"],
        "collection_key": item["reference"]["collection_key"],
        "hadith_number": item["reference"]["hadith_number"],
        "authenticity_status": item["reference"]["authenticity_status"]
    }
    for item in data["hadith_items"]
]

compact_meta = {
    "quran_count": len(compact_q),
    "hadith_count": len(compact_h),
    "quran_candidates": compact_q,
    "hadith_candidates": compact_h
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(compact_meta, f, ensure_ascii=False)

print(f"✓ Created compact daily candidate index ({len(compact_q)} Quran, {len(compact_h)} Hadith) at {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE)/1024:.1f} KB)")
