#!/usr/bin/env python3
"""
scripts/rebuild_hadith_hierarchy.py
===================================
Lossless Full-Fidelity Ingestion & Hierarchy Reconciliation Pipeline
for the authentic iHadis dataset (52,856 Hadiths across 25 Canonical Collections).

Single Source of Truth: assets/hadith_dataset/ihadis_full_dataset.db

Hierarchy Preserved:
  Collection/Book (25 collections)
    └── Chapter / Major Section / Kitab (654 chapters)
          └── Section / Subdivision / Bab (18,921 sections)
                └── Hadith Record (52,856 narrations)
                      └── Every original metadata & reference field

Outputs:
1. assets/data/hadith_collections.json (25 collections with full counts & metadata)
2. assets/data/hadith_hierarchy/{collection_key}.json (Chapters & Sections tree per book)
3. assets/data/hadith_books/{collection_key}.json (Full modular book with chapters & verbatim hadiths)
4. assets/data/hadith_hierarchy_audit.json (Deterministic reconciliation verification ledger)
"""

import os
import sys
import json
import sqlite3
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / 'data_master' / 'hadith_dataset' if (ROOT / 'data_master' / 'hadith_dataset').exists() else ROOT / 'assets' / 'hadith_dataset'
DB_PATH = RAW_DIR / 'ihadis_full_dataset.db'
META_PATH = RAW_DIR / 'metadata.json'

OUT_DATA_DIR = ROOT / 'assets' / 'data'
OUT_BOOKS_DIR = OUT_DATA_DIR / 'hadith_books'
OUT_HIERARCHY_DIR = OUT_DATA_DIR / 'hadith_hierarchy'
OUT_COLLECTIONS = OUT_DATA_DIR / 'hadith_collections.json'
OUT_AUDIT = OUT_DATA_DIR / 'hadith_hierarchy_audit.json'

OUT_BOOKS_DIR.mkdir(parents=True, exist_ok=True)
OUT_HIERARCHY_DIR.mkdir(parents=True, exist_ok=True)

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
    'hadis-somvar': 'Hadith Somvar: authentic thematic compendium',
    'silsila-sahiha': 'Shaykh al-Albani’s compilation of authenticated traditions',
    'dhaif-hadis-sirij': 'Compendium identifying unverified and fabricated traditions',
    'mishkatul-masabih': 'Celebrated classical anthology of prophetic traditions',
    '40-hadith': "Imam an-Nawawi's foundational Forty Hadith encompassing the religion",
    'adabul-mufrad': "Imam Bukhari's dedicated masterpiece on moral etiquette and social conduct",
    'jujul-rafayel-yadain': "Imam Bukhari's treatise on raising hands in prayer",
    'sahih-hadise-qudsi': 'Sacred Hadith (Direct words of Allah communicated to the Prophet)',
    '100-hadith': '100 verified foundational prophetic traditions',
    'miskate-dhaif-hadis': 'Unverified narrations recorded in Mishkat',
    'shamayele-tirmidhi': "Imam Tirmidhi's detailed portrait of the Prophet's character and appearance",
    'targib-wattahrib': 'Narrations on virtues of good deeds and warnings against wrongdoing',
    'fazayele-amal': "Authentic traditions on virtuous deeds",
    'upodesh': 'Moral and spiritual counsel from classical traditions',
    'ramadaner-durbol-hadis': 'Clarification on weak traditions associated with Ramadan',
}

KEY_ALIASES = {
    'abu-dawud': 'abudawud',
    'ibn-majah': 'ibnmajah',
    'muwatta-malik': 'malik',
    'riyadus-salihin': 'riyadussalihin',
}

def main():
    print(f"Connecting to authoritative database: {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Load Writers
    cursor.execute("SELECT id, name_bn, des_bn, name_en, des_en FROM writers;")
    writers_map = {}
    for r in cursor.fetchall():
        writers_map[str(r[0])] = {
            'name_bn': r[1],
            'des_bn': r[2],
            'name_en': r[3],
            'des_en': r[4]
        }

    # Load Grades
    cursor.execute("SELECT id, name_bn, description_bn, name_en, description_en, color FROM grades;")
    grades_map = {}
    for r in cursor.fetchall():
        grades_map[int(r[0])] = {
            'name_bn': r[1] or '',
            'description_bn': r[2] or '',
            'name_en': r[3] or '',
            'description_en': r[4] or '',
            'color': r[5] or '#1F4E3D'
        }

    # Load Books
    cursor.execute("""
        SELECT id, book_name, title_bn, title_en, title_ar, number_of_hadis_bn, abvr_code, book_descr_bn, color_code, writer_id
        FROM books
        ORDER BY CAST(id AS INTEGER);
    """)
    books_rows = cursor.fetchall()

    collections = []
    audit_report = {
        'total_collections': len(books_rows),
        'total_chapters': 0,
        'total_sections': 0,
        'total_hadiths': 0,
        'collections_audit': []
    }

    total_chapters_all = 0
    total_sections_all = 0
    total_hadiths_all = 0

    for b in books_rows:
        bid, raw_key, title_bn, title_en, title_ar, num_bn, abvr_code, descr_bn, color_code, writer_id = b
        folder = f"{raw_key}_bn"
        coll_key = KEY_ALIASES.get(raw_key, raw_key)
        en_name = title_en or ENGLISH_BOOK_NAMES.get(raw_key, raw_key.title())
        summary = AUTHENTICITY_SUMMARIES.get(raw_key, f"Authentic classical collection")
        writer_obj = writers_map.get(str(writer_id), {})

        # 1. Fetch Chapters for this book
        cursor.execute("""
            SELECT id, display_label, title, arabic_title, preface, [range], [order]
            FROM all_chapters
            WHERE book_folder = ?
            ORDER BY CAST([order] AS INTEGER), CAST(id AS INTEGER);
        """, (folder,))
        chapter_rows = cursor.fetchall()

        # 2. Fetch Sections for this book
        cursor.execute("""
            SELECT id, chapter_id, display_label, title, arabic_title, preface, [order]
            FROM all_sections
            WHERE book_folder = ?
            ORDER BY CAST(chapter_id AS INTEGER), CAST([order] AS INTEGER), CAST(id AS INTEGER);
        """, (folder,))
        section_rows = cursor.fetchall()

        # 3. Fetch Hadiths for this book
        cursor.execute("""
            SELECT id, display_label, canonical, chapter_id, section_id, narrator, translation, arabic, clean_arabic, note, grade_id, [order]
            FROM all_hadiths
            WHERE book_folder = ?
            ORDER BY CAST([order] AS INTEGER), CAST(id AS INTEGER);
        """, (folder,))
        hadith_rows = cursor.fetchall()

        c_count = len(chapter_rows)
        s_count = len(section_rows)
        h_count = len(hadith_rows)

        total_chapters_all += c_count
        total_sections_all += s_count
        total_hadiths_all += h_count

        # Build Section lookup: (chapter_id) -> list of sections
        sections_by_chapter = defaultdict(list)
        section_lookup = {}
        for s in section_rows:
            sid, ch_id, s_disp, s_title, s_ar_title, s_pref, s_ord = s
            sec_obj = {
                'id': int(sid) if str(sid).isdigit() else sid,
                'chapter_id': int(ch_id) if str(ch_id).isdigit() else ch_id,
                'display_label': s_disp or '',
                'title': s_title or '',
                'arabic_title': s_ar_title or '',
                'preface': s_pref or '',
                'order': int(s_ord) if str(s_ord).isdigit() else 0,
                'hadith_count': 0
            }
            sections_by_chapter[str(ch_id)].append(sec_obj)
            section_lookup[str(sid)] = sec_obj

        # Count hadiths per chapter and section
        chapter_hadith_counts = defaultdict(int)
        section_hadith_counts = defaultdict(int)
        for h in hadith_rows:
            ch_id = str(h[3])
            sec_id = str(h[4]) if h[4] is not None else ''
            chapter_hadith_counts[ch_id] += 1
            if sec_id:
                section_hadith_counts[sec_id] += 1

        # Build Chapters list
        chapters_list = []
        chapter_lookup = {}
        for c in chapter_rows:
            cid, c_disp, c_title, c_ar_title, c_pref, c_range, c_ord = c
            str_cid = str(cid)
            child_sections = sections_by_chapter.get(str_cid, [])
            for sec in child_sections:
                sec['hadith_count'] = section_hadith_counts[str(sec['id'])]

            chap_obj = {
                'id': int(cid) if str(cid).isdigit() else cid,
                'display_label': c_disp or '',
                'title': c_title or '',
                'arabic_title': c_ar_title or '',
                'preface': c_pref or '',
                'range': c_range or '',
                'order': int(c_ord) if str(c_ord).isdigit() else 0,
                'hadith_count': chapter_hadith_counts[str_cid],
                'sections_count': len(child_sections),
                'sections': child_sections
            }
            chapters_list.append(chap_obj)
            chapter_lookup[str_cid] = chap_obj

        # Build Hadiths records with full metadata and preserved canonical text
        hadiths_list = []
        for h in hadith_rows:
            hid, disp_label, canonical, ch_id, sec_id, narrator, trans, ar, clean_ar, note, g_id, ord_val = h
            str_ch = str(ch_id)
            str_sec = str(sec_id) if sec_id is not None else ''
            chap_meta = chapter_lookup.get(str_ch, {})
            sec_meta = section_lookup.get(str_sec, {})

            g_id_int = int(g_id) if str(g_id).isdigit() else 0
            grade_meta = grades_map.get(g_id_int, {})

            h_rec = {
                'id': f"hadith_{coll_key}_{hid}",
                'raw_id': str(hid),
                'hadith_number': int(hid) if str(hid).isdigit() else hid,
                'display_label': disp_label or '',
                'canonical': canonical or '',
                'chapter_id': int(ch_id) if str(ch_id).isdigit() else ch_id,
                'chapter_title': chap_meta.get('title', ''),
                'chapter_arabic_title': chap_meta.get('arabic_title', ''),
                'section_id': int(sec_id) if str_sec.isdigit() else (sec_id if sec_id else None),
                'section_title': sec_meta.get('title', ''),
                'section_arabic_title': sec_meta.get('arabic_title', ''),
                'narrator': narrator or '',
                'arabic': ar or '',
                'clean_arabic': clean_ar or '',
                'translation': trans or '',
                'note': note or '',
                'grade_id': g_id_int,
                'grade_bn': grade_meta.get('name_bn', 'সহিহ হাদিস' if coll_key in ['bukhari', 'muslim'] else ''),
                'grade_en': grade_meta.get('name_en', 'Sahih' if coll_key in ['bukhari', 'muslim'] else ''),
                'grade_color': grade_meta.get('color', '#2E7D32'),
                'order': int(ord_val) if str(ord_val).isdigit() else 0
            }
            hadiths_list.append(h_rec)

        # 4. Save Hierarchy Tree (lightweight metadata for instant chapter browsing)
        hierarchy_payload = {
            'book_key': coll_key,
            'raw_key': raw_key,
            'id': int(bid),
            'title_bn': title_bn,
            'title_en': en_name,
            'title_ar': title_ar or '',
            'total_hadiths': h_count,
            'total_chapters': c_count,
            'total_sections': s_count,
            'chapters': chapters_list
        }
        with open(OUT_HIERARCHY_DIR / f"{coll_key}.json", 'w', encoding='utf-8') as f:
            json.dump(hierarchy_payload, f, ensure_ascii=False, indent=2)

        # 5. Save Full Book JSON (chapters metadata + verbatim hadith records)
        book_payload = {
            'book_key': coll_key,
            'raw_key': raw_key,
            'id': int(bid),
            'title_bn': title_bn,
            'title_en': en_name,
            'title_ar': title_ar or '',
            'total_hadiths': h_count,
            'total_chapters': c_count,
            'total_sections': s_count,
            'chapters': chapters_list,
            'hadiths': hadiths_list
        }
        with open(OUT_BOOKS_DIR / f"{coll_key}.json", 'w', encoding='utf-8') as f:
            json.dump(book_payload, f, ensure_ascii=False, indent=2)

        # Alias support if coll_key differs from raw_key
        if coll_key != raw_key:
            with open(OUT_BOOKS_DIR / f"{raw_key}.json", 'w', encoding='utf-8') as f:
                json.dump(book_payload, f, ensure_ascii=False, indent=2)
            with open(OUT_HIERARCHY_DIR / f"{raw_key}.json", 'w', encoding='utf-8') as f:
                json.dump(hierarchy_payload, f, ensure_ascii=False, indent=2)

        # 6. Build Collection Registry Object
        coll_obj = {
            'key': coll_key,
            'raw_key': raw_key,
            'id': int(bid),
            'name': en_name,
            'name_bn': title_bn,
            'name_en': en_name,
            'name_ar': title_ar or '',
            'abvr_code': abvr_code or '',
            'total_records': h_count,
            'chapters_count': c_count,
            'sections_count': s_count,
            'color_code': color_code or '#1F4E3D',
            'authenticity_summary': summary,
            'writer': writer_obj
        }
        collections.append(coll_obj)

        audit_report['collections_audit'].append({
            'id': int(bid),
            'key': coll_key,
            'name': en_name,
            'chapters': c_count,
            'sections': s_count,
            'hadiths': h_count,
            'first_id': hadiths_list[0]['raw_id'] if hadiths_list else None,
            'last_id': hadiths_list[-1]['raw_id'] if hadiths_list else None,
            'first_arabic_len': len(hadiths_list[0]['arabic']) if hadiths_list else 0,
            'first_trans_len': len(hadiths_list[0]['translation']) if hadiths_list else 0,
        })
        print(f"[{bid:>2}/25] {en_name:<25}: {c_count:>3} chapters, {s_count:>5} sections, {h_count:>5} hadiths")

    collections.sort(key=lambda x: x['id'])
    with open(OUT_COLLECTIONS, 'w', encoding='utf-8') as f:
        json.dump(collections, f, ensure_ascii=False, indent=2)

    audit_report['total_chapters'] = total_chapters_all
    audit_report['total_sections'] = total_sections_all
    audit_report['total_hadiths'] = total_hadiths_all
    with open(OUT_AUDIT, 'w', encoding='utf-8') as f:
        json.dump(audit_report, f, ensure_ascii=False, indent=2)

    print("\n" + "="*80)
    print("RECONCILIATION SUMMARY:")
    print(f"  Total Collections : {len(collections)} (Target: 25)")
    print(f"  Total Chapters    : {total_chapters_all} (Target: 654)")
    print(f"  Total Sections    : {total_sections_all} (Target: 18,921)")
    print(f"  Total Hadiths     : {total_hadiths_all} (Target: 52,856)")
    print("="*80)
    conn.close()

if __name__ == '__main__':
    main()
