#!/usr/bin/env python3
"""
filter_sahih_pool.py
────────────────────
Filters hadeethenc_multilingual_pool.json to produce
hadeethenc_sahih_pool.json containing ONLY records whose grade is
explicitly Sahih/Authentic.

Accounting:
  741 preliminary 10-language candidates
  → N accepted  (Sahih/Authentic)
  → M excluded  (Hasan / Good / ambiguous)
  → 0 rejected  (Phase 2 text/provenance failures)

Grade whitelist: any grade that contains the substring "authentic",
"sahih", or "sahīh" (case-insensitive) AND does NOT consist solely
of "Good hadith" or "Good chain of narrators".

DO NOT relabel any grade. DO NOT exclude based on anything other
than the exact grade string from HadeethEnc. DO NOT modify any
translation text.
"""
import json
import os
import re
from collections import Counter
from datetime import date

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_PATH = os.path.join(BASE_DIR, "assets", "data", "hadeethenc_multilingual_pool.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "assets", "data", "hadeethenc_sahih_pool.json")

# ── Grade classification ───────────────────────────────────────────────────────

# ACCEPTED: grade contains "authentic" or "sahih" (case-insensitive)
SAHIH_PATTERNS = [
    re.compile(r'\bauthentic\b', re.IGNORECASE),
    re.compile(r'\bsahih\b',     re.IGNORECASE),
    re.compile(r'\bsahīh\b',     re.IGNORECASE),
]

# EXCLUDED despite containing Sahih/Authentic substring:
# None — "Hasan Sahih" contains "Sahih" and is included per classification.
# The purely Hasan grades ("Hasan", "Good hadith") will naturally not match
# the SAHIH_PATTERNS and be excluded.

def is_sahih_grade(grade: str) -> bool:
    """Returns True if the grade is explicitly Sahih/Authentic."""
    return any(p.search(grade) for p in SAHIH_PATTERNS)


def main():
    with open(INPUT_PATH, encoding="utf-8") as f:
        pool = json.load(f)

    all_hadiths = pool["hadiths"]
    preliminary_count = len(all_hadiths)

    accepted = []
    excluded = []

    for rec in all_hadiths:
        grade = rec.get("grade", "").strip()
        if is_sahih_grade(grade):
            accepted.append(rec)
        else:
            excluded.append({
                "hadeethenc_id": rec["hadeethenc_id"],
                "grade":         grade,
                "grade_ar":      rec.get("grade_ar", ""),
                "attribution":   rec.get("attribution", ""),
            })

    excluded_by_grade = dict(Counter(r["grade"] for r in excluded))

    # Build output
    output = {
        "metadata": {
            **pool["metadata"],
            "grade_filter": {
                "filter_applied": True,
                "filter_description":
                    "Only Sahih/Authentic grades retained for the Daily Reminder pool. "
                    "Hasan / Good / ambiguous grades excluded. "
                    "No grade labels were modified.",
                "filter_date":           str(date.today()),
                "preliminary_10lang_candidates": preliminary_count,
                "phase2_rejected":               0,    # 741/741 passed Phase 2
                "grade_excluded":                len(excluded),
                "final_sahih_pool_size":         len(accepted),
                "excluded_grade_breakdown":      excluded_by_grade,
                "accepted_criterion":
                    "Grade string contains 'authentic', 'sahih', or 'sahīh' (case-insensitive). "
                    "Applied to the English grade field as provided by HadeethEnc.",
            },
            "total_records": len(accepted),
        },
        "hadiths": accepted,
    }

    tmp = OUTPUT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    os.replace(tmp, OUTPUT_PATH)

    # ── Print exact accounting ─────────────────────────────────────────────
    print("=" * 64)
    print("  GRADE FILTER — EXACT RECONCILIATION")
    print("=" * 64)
    print(f"  Preliminary 10-language candidates (Phase 1):  {preliminary_count}")
    print(f"  Phase 2 rejected (text/provenance failures):   0")
    print(f"  Grade-excluded (Hasan / Good / ambiguous):     {len(excluded)}")
    print(f"  ─────────────────────────────────────────────")
    print(f"  FINAL Sahih/Authentic 10-language pool:        {len(accepted)}")
    print()
    print("  Excluded grade breakdown:")
    for grade, count in sorted(excluded_by_grade.items(), key=lambda x: -x[1]):
        print(f"    {count:3d}  {grade}")
    print()
    print(f"  Output: {OUTPUT_PATH}")
    print("=" * 64)


if __name__ == "__main__":
    main()
