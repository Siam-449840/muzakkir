#!/usr/bin/env python3
"""
scripts/import_ihadis_dataset.py
================================
Ingestion pipeline for the full authentic iHadis dataset (52,856 hadiths).
Reads from assets/hadith_dataset/ihadis_full_dataset.db and metadata.json.

Outputs:
1. assets/data/hadith_collections.json (25 collections with full metadata)
2. assets/data/hadith_daily_pool.json (curated concise Sahih hadiths for daily reminders)
3. assets/data/hadith_books/{book_key}.json (modular per-book files for offline browsing)
4. assets/data/ihadis_summary.json (comprehensive coverage and audit ledger)
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / 'data_master' / 'hadith_dataset' if (ROOT / 'data_master' / 'hadith_dataset').exists() else ROOT / 'assets' / 'hadith_dataset'
DB_PATH = RAW_DIR / 'ihadis_full_dataset.db'
META_PATH = RAW_DIR / 'metadata.json'

OUT_DATA_DIR = ROOT / 'assets' / 'data'
OUT_BOOKS_DIR = OUT_DATA_DIR / 'hadith_books'
OUT_COLLECTIONS = OUT_DATA_DIR / 'hadith_collections.json'
OUT_DAILY_POOL = OUT_DATA_DIR / 'hadith_daily_pool.json'
OUT_SUMMARY = OUT_DATA_DIR / 'ihadis_summary.json'

OUT_BOOKS_DIR.mkdir(parents=True, exist_ok=True)

ENGLISH_BOOK_NAMES = {
    'bukhari': 'Sahih al-Bukhari',
    'muslim': 'Sahih Muslim',
    'nasai': "Sunan an-Nasa'i",
    'abu-dawud': 'Sunan Abu Dawud',
    'tirmidhi': 'Jami` at-Tirmidhi',
    'ibn-majah': 'Sunan Ibn Majah',
    'muwatta-malik': 'Muwatta Imam Malik',
    'riyadus-salihin': 'Riyad us-Saliheen',
    'bulugul-maram': 'Bulugh al-Maram',
    'luluwal-marjan': "Al-Lu'lu' wal-Marjan",
    'hadis-somvar': 'Hadith Somvar',
    'silsila-sahiha': 'Silsila Sahiha',
    'dhaif-hadis-sirij': 'Dhaif Hadith Series',
    'mishkatul-masabih': 'Mishkat al-Masabih',
    '40-hadith': '40 Hadith',
    'adabul-mufrad': 'Al-Adab al-Mufrad',
    'jujul-rafayel-yadain': "Juz'ul Raf'il Yadain",
    'sahih-hadise-qudsi': 'Sahih Hadith Qudsi',
    '100-hadith': '100 Hadith',
    'miskate-dhaif-hadis': 'Mishkat Dhaif Hadith',
    'shamayele-tirmidhi': 'Shamayil at-Tirmidhi',
    'targib-wattahrib': 'Sahih at-Targhib wat-Tarhib',
    'fazayele-amal': "Sahih Faza'il-e-A'mal",
    'upodesh': 'Upodesh',
    'ramadaner-durbol-hadis': 'Ramadaner Durbol Hadith',
}

AUTHENTICITY_SUMMARIES = {
    'bukhari': 'Consensus Sahih (Sahihayn — universally accepted by Islamic scholarship)',
    'muslim': 'Consensus Sahih (Sahihayn — universally accepted by Islamic scholarship)',
    'nasai': "Sunan collection containing predominantly Sahih and Hasan narrations",
    'abu-dawud': 'Sunan collection focusing on legal rulings and Sunnah practices',
    'tirmidhi': 'Jami` collection with classical Hadith classification and commentary',
    'ibn-majah': 'Sunan collection covering comprehensive legal and moral subjects',
    'muwatta-malik': "Imam Malik's foundational legal and Hadith compilation of Medina",
    'riyadus-salihin': "Imam an-Nawawi's famous thematic compilation of ethical and spiritual virtues",
    'bulugul-maram': "Ibn Hajar's rigorous compilation of legal evidence narrations",
    'luluwal-marjan': 'Muttafaqun Alayh: agreed upon narrations of Bukhari and Muslim',
    'mishkatul-masabih': 'Celebrated classical anthology of prophetic traditions',
    'adabul-mufrad': "Imam Bukhari's dedicated masterpiece on moral etiquette and social conduct",
    'sahih-hadise-qudsi': 'Sacred Hadith (Direct words of Allah communicated to the Prophet)',
    '40-hadith': "Imam an-Nawawi's foundational Forty Hadith encompassing the religion",
    '100-hadith': '100 verified foundational prophetic traditions',
    'shamayele-tirmidhi': "Imam Tirmidhi's detailed portrait of the Prophet's character and appearance",
    'targib-wattahrib': 'Narrations on virtues of good deeds and warnings against wrongdoing',
}

KEY_ALIASES = {
    'abu-dawud': 'abudawud',
    'ibn-majah': 'ibnmajah',
    'muwatta-malik': 'malik',
    'riyadus-salihin': 'riyadussalihin',
}

SAHIH_GRADE_IDS = {2, 7, 8, 9, 10, 11, 12, 36}

def main():
    print(f"Loading metadata from {META_PATH}...")
    with open(META_PATH, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    books_meta = meta['books']
    grades_list = meta['grades']
    grade_map = {int(g['id']): g for g in grades_list}

    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Build Collections Metadata
    collections = []
    book_stats = {}

    for b in books_meta:
        raw_key = b['book_name']
        folder = f"{raw_key}_bn"

        cursor.execute("SELECT count(*) FROM all_hadiths WHERE book_folder = ?", (folder,))
        count = cursor.fetchone()[0]

        en_name = b.get('title_en') or ENGLISH_BOOK_NAMES.get(raw_key, raw_key.title())
        summary = AUTHENTICITY_SUMMARIES.get(raw_key, f"Authentic classical collection ({count} narrations)")
        coll_key = KEY_ALIASES.get(raw_key, raw_key)

        coll_obj = {
            'key': coll_key,
            'raw_key': raw_key,
            'id': int(b['id']),
            'name': en_name,
            'name_bn': b['title_bn'],
            'name_en': en_name,
            'name_ar': b.get('title_ar', ''),
            'abvr_code': b.get('abvr_code', ''),
            'total_records': count,
            'color_code': b.get('color_code', '#1F4E3D'),
            'authenticity_summary': summary
        }
        collections.append(coll_obj)
        book_stats[raw_key] = count

    collections.sort(key=lambda x: x['id'])

    with open(OUT_COLLECTIONS, 'w', encoding='utf-8') as f:
        json.dump(collections, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(collections)} collections to {OUT_COLLECTIONS}")

    # 2. Extract Per-Book Modular Reader Files & Daily Pool Candidates
    daily_candidates = []
    total_hadiths = 0
    total_sahih = 0

    for b in books_meta:
        raw_key = b['book_name']
        coll_key = KEY_ALIASES.get(raw_key, raw_key)
        folder = f"{raw_key}_bn"

        cursor.execute("""
            SELECT id, display_label, narrator, arabic, translation, grade_id, chapter_id, section_id, note
            FROM all_hadiths
            WHERE book_folder = ?
            ORDER BY CAST(id AS INTEGER)
        """, (folder,))
        rows = cursor.fetchall()

        book_records = []
        for r in rows:
            h_id, label, narrator, arabic, trans, g_id, ch_id, sec_id, note = r
            g_id_int = int(g_id) if str(g_id).isdigit() else 0
            g_obj = grade_map.get(g_id_int, {})
            g_name_en = g_obj.get('name_en', 'Unknown')
            g_name_bn = g_obj.get('name_bn', 'অজানা')

            rec = {
                'id': f"hadith_{coll_key}_{h_id}",
                'raw_id': h_id,
                'hadith_number': int(h_id) if h_id.isdigit() else h_id,
                'display_label': label,
                'narrator': narrator or '',
                'arabic': arabic or '',
                'translation': trans or '',
                'grade_id': g_id_int,
                'grade_en': g_name_en,
                'grade_bn': g_name_bn,
                'chapter_id': ch_id,
                'section_id': sec_id,
                'note': note or ''
            }
            book_records.append(rec)
            total_hadiths += 1

            # Candidate filter:
            # - Grade is Sahih
            # - Non-empty Arabic and Bengali text
            if g_id_int in SAHIH_GRADE_IDS and arabic and trans:
                total_sahih += 1
                trans_len = len(trans.strip())
                ar_len = len(arabic.strip())
                if 25 <= trans_len <= 450 and ar_len >= 15 and h_id.isdigit() and int(h_id) > 0:
                    book_en_title = ENGLISH_BOOK_NAMES.get(raw_key, b.get('title_en', raw_key))
                    h_num = int(h_id)
                    daily_candidates.append({
                        'content_id': f"hadith_{coll_key}_{h_id}",
                        'content_type': 'hadith',
                        'hadeethenc_id': h_num,
                        'hadith_number': h_num,
                        'collection_key': coll_key,
                        'grade': g_name_en if g_name_en != 'Unknown' else 'Sahih',
                        'grade_bn': g_name_bn,
                        'attribution': f"{b['title_bn']}, হাদিস নং {label}",
                        'attribution_en': f"{book_en_title}, #{h_id}",
                        'narrator': narrator or '',
                        'source_url': f"https://ihadis.com/books/{raw_key}/hadiths/{h_id}",
                        'translations': {
                            'ar': {'text': arabic.strip()},
                            'bn': {'text': trans.strip()},
                            'en': {'text': trans.strip()},
                            'ur': {'text': trans.strip()},
                            'fr': {'text': trans.strip()},
                            'es': {'text': trans.strip()},
                            'pt': {'text': trans.strip()},
                            'hi': {'text': trans.strip()},
                            'zh': {'text': trans.strip()},
                            'ru': {'text': trans.strip()},
                        }
                    })

        # Save modular book JSON for fast offline browsing (canonical key only)
        book_out_path = OUT_BOOKS_DIR / f"{raw_key}.json"
        with open(book_out_path, 'w', encoding='utf-8') as f:
            json.dump({
                'book_key': coll_key,
                'raw_key': raw_key,
                'title_bn': b['title_bn'],
                'title_en': ENGLISH_BOOK_NAMES.get(raw_key, b.get('title_en', raw_key)),
                'total_hadiths': len(book_records),
                'hadiths': book_records
            }, f, ensure_ascii=False)

    print(f"Exported modular book files to {OUT_BOOKS_DIR}")
    print(f"Total Hadiths processed: {total_hadiths}")
    print(f"Total Sahih narrations: {total_sahih}")
    print(f"Total Daily Reminder candidates identified: {len(daily_candidates)}")

    # 3. Build Curated Daily Pool (~2,200 units)
    by_book = defaultdict(list)
    for c in daily_candidates:
        by_book[c['collection_key']].append(c)

    selected_pool = []
    quotas = {
        '40-hadith': 42,
        'sahih-hadise-qudsi': 100,
        '100-hadith': 100,
        'shamayele-tirmidhi': 150,
        'adabul-mufrad': 250,
        'riyadussalihin': 300,
        'bukhari': 350,
        'muslim': 300,
        'luluwal-marjan': 200,
        'tirmidhi': 150,
        'abudawud': 150,
        'nasai': 150,
        'ibnmajah': 150,
    }

    for bkey, target_count in quotas.items():
        items = by_book.get(bkey, [])
        selected_pool.extend(items[:target_count])

    for bkey, items in by_book.items():
        if bkey not in quotas:
            selected_pool.extend(items[:30])

    # Streamline translations to ar, bn, en (and alias ur/fr fallback to en/bn)
    for h in selected_pool:
        ar_text = h['translations']['ar']['text']
        bn_text = h['translations']['bn']['text']
        h['translations'] = {
            'ar': {'text': ar_text},
            'bn': {'text': bn_text},
            'en': {'text': bn_text}
        }

    daily_pool_obj = {
        'metadata': {
            'source': "iHadis Official Verified Dataset",
            'dataset_version': "6.0",
            'total_records': len(selected_pool),
            'languages': ['ar', 'bn', 'en'],
            'grade_requirement': "Sahih / Authentic Only (Grade IDs 2, 7, 8, 9, 10, 11, 12, 36)",
            'total_corpus_hadiths': total_hadiths,
            'total_corpus_sahih': total_sahih
        },
        'hadiths': selected_pool
    }

    with open(OUT_DAILY_POOL, 'w', encoding='utf-8') as f:
        json.dump(daily_pool_obj, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(selected_pool)} daily reminder Hadiths to {OUT_DAILY_POOL}")

    # 4. Save Comprehensive Summary
    summary = {
        'total_books': len(collections),
        'total_hadiths': total_hadiths,
        'total_sahih_hadiths': total_sahih,
        'daily_pool_count': len(selected_pool),
        'book_stats': book_stats
    }
    with open(OUT_SUMMARY, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Saved summary report to {OUT_SUMMARY}")

if __name__ == '__main__':
    main()
