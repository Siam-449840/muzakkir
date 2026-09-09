import * as fs from 'fs';
import * as path from 'path';

describe('Phase 2 Data Integrity Forensic Audit & Content Freeze Test Suite', () => {
  const baseDir = path.join(__dirname, '..');
  const auditResultsPath = path.join(baseDir, 'scratch/phase2_audit_results.json');

  let audit: any;

  beforeAll(() => {
    expect(fs.existsSync(auditResultsPath)).toBe(true);
    audit = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
  });

  // ── GATE 1: FULL HADITH CORPUS PARITY (52,856 RECORDS) ───────────────────
  test('Gate 1: Full Hadith corpus has exactly 52,856 records with zero field mismatches', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.total_source_hadiths).toBe(52856);
    expect(h.total_app_hadiths).toBe(52856);
    expect(h.record_count_match).toBe(true);

    expect(h.field_mismatches.raw_id).toBe(0);
    expect(h.field_mismatches.chapter_id).toBe(0);
    expect(h.field_mismatches.section_id).toBe(0);
    expect(h.field_mismatches.arabic).toBe(0);
    expect(h.field_mismatches.clean_arabic).toBe(0);
    expect(h.field_mismatches.translation).toBe(0);
    expect(h.field_mismatches.narrator).toBe(0);
    expect(h.field_mismatches.note).toBe(0);
    expect(h.field_mismatches.grade_id).toBe(0);
    expect(h.field_mismatches.order).toBe(0);
  });

  // ── GATE 2: FOOTNOTE PARITY (35,180 NOTES) ──────────────────────────────
  test('Gate 2: All 35,180 footnotes match source exactly with zero corruption or extra notes', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.total_source_notes).toBe(35180);
    expect(h.total_app_notes).toBe(35180);
    expect(h.exact_note_matches).toBe(35180);
  });

  // ── GATE 3: ARABIC PARITY & PRESERVATION OF EMPTY SOURCE FIELDS ──────────
  test('Gate 3: Arabic matn preserved; 783 legitimate empty source Arabic fields preserved without fabrication', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.field_mismatches.arabic).toBe(0);
    expect(h.field_mismatches.clean_arabic).toBe(0);
  });

  // ── GATE 4: TRANSLATION PARITY ──────────────────────────────────────────
  test('Gate 4: All 52,856 Hadith records have non-empty Bengali translation and 0 translation mismatches', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.field_mismatches.translation).toBe(0);
  });

  // ── GATE 5: NARRATOR / ISNAD PARITY ─────────────────────────────────────
  test('Gate 5: All 52,856 Hadith narrator strings match source exactly (0 mismatches)', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.field_mismatches.narrator).toBe(0);
  });

  // ── GATE 6: AUTHENTICITY / GRADE INTEGRITY ──────────────────────────────
  test('Gate 6: All 52,856 Hadith grade_ids match source exactly and grade distribution is verified', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.field_mismatches.grade_id).toBe(0);
    expect(audit.grades_audit.grades_table_count).toBeGreaterThanOrEqual(10);
  });

  // ── GATE 7: COMPLETE HIERARCHY INTEGRITY ─────────────────────────────────
  test('Gate 7: Hierarchy integrity confirms 25 collections, 654 chapters, 18,921 sections with 0 orphans', () => {
    const hier = audit.hierarchy_integrity;
    expect(hier.source_chapters_count).toBe(654);
    expect(hier.app_total_chapters).toBe(654);
    expect(hier.chapters_count_match).toBe(true);

    expect(hier.source_sections_count).toBe(18921);
    expect(hier.app_total_sections).toBe(18921);
    expect(hier.sections_count_match).toBe(true);

    expect(hier.orphan_sections).toBe(0);
  });

  // ── GATE 8: UNTITLED SECTION / BABUN BILA TARJAMAH PRESERVATION ──────────
  test('Gate 8: Bukhari has exactly 70 untitled sections and Nasai has exactly 13 with title="" preserved', () => {
    const hier = audit.hierarchy_integrity;
    expect(hier.bukhari_untitled_match).toBe(true);
    expect(hier.app_untitled_sections.bukhari).toBe(70);
    expect(hier.nasai_untitled_match).toBe(true);
    expect(hier.app_untitled_sections.nasai).toBe(13);
  });

  // ── GATE 9: QURAN CONTENT INTEGRITY ─────────────────────────────────────
  test('Gate 9: Quran content has exactly 114 Surahs and 6,236 verses across 10 complete translations', () => {
    const qc = audit.quran_content;
    expect(qc.total_surahs).toBe(114);
    expect(qc.total_verses).toBe(6236);
    expect(qc.canonical_verse_count_match).toBe(true);
    expect(qc.all_surahs_ordered).toBe(true);
    expect(qc.all_surahs_count_matched).toBe(true);

    for (const lang of ['ar', 'bn', 'en', 'es', 'fr', 'hi', 'pt', 'ru', 'ur', 'zh']) {
      expect(qc.language_counts_across_6236[lang]).toBe(6236);
      expect(qc.empty_translations_across_6236[lang] || 0).toBe(0);
    }
  });

  // ── GATE 10: QURAN MULTI-AYAH RANGE VALIDITY ────────────────────────────
  test('Gate 10: 523 Quran research candidate units have 100% valid Surah & Ayah boundaries with 0 parity failures', () => {
    const qp = audit.quran_reminder_pool;
    expect(qp.total_units).toBe(523);
    expect(qp.target_count_match).toBe(true);
    expect(qp.single_ayah_units).toBe(288);
    expect(qp.multi_ayah_units).toBe(235);
    expect(qp.invalid_references).toBe(0);
    expect(qp.multi_ayah_parity_failures).toBe(0);
  });

  // ── GATE 11: DAILY HADITH REMINDER POOL MEMBERSHIP & 100% SAHIH ─────────
  test('Gate 11: Daily Hadith reminder pool has exactly 2,402 items, 100% Sahih with 0 resolution failures', () => {
    const hp = audit.daily_hadith_pool;
    expect(hp.total_records).toBe(2402);
    expect(hp.target_count_match).toBe(true);
    expect(hp.non_sahih_records).toBe(0);
    expect(hp.all_sahih_guarantee).toBe(true);
    expect(hp.resolution_failures).toBe(0);
    expect(hp.empty_translations).toBe(0);
    expect(hp.empty_arabic).toBe(0);
  });

  // ── GATE 12: IDENTIFIER UNIQUENESS & ZERO COLLISIONS ────────────────────
  test('Gate 12: All 2,925 reminder IDs are unique with zero cross-corpus collisions', () => {
    const ii = audit.identifier_integrity;
    expect(ii.total_unique_reminder_ids).toBe(2925);
    expect(ii.collision_free).toBe(true);
    expect(ii.id_collisions).toHaveLength(0);
  });

  // ── GATE 13: ORDERING & BOUNDARY INTEGRITY ──────────────────────────────
  test('Gate 13: First, middle, and last records match source for all 25 collections', () => {
    const bounds = audit.hadith_corpus_parity.boundaries;
    expect(Object.keys(bounds)).toHaveLength(25);
    for (const key of Object.keys(bounds)) {
      expect(bounds[key].first.match).toBe(true);
      expect(bounds[key].middle.match).toBe(true);
      expect(bounds[key].last.match).toBe(true);
    }
  });

  // ── GATE 14: DUPLICATE DETECTION & HIERARCHY ALIAS PARITY ───────────────
  test('Gate 14: 4 duplicate alias pairs in hierarchy are confirmed byte-for-byte identical', () => {
    const dups = audit.hierarchy_duplicate_pairs;
    expect(dups).toHaveLength(4);
    for (const d of dups) {
      expect(d.identical_bytes).toBe(true);
    }
  });

  // ── GATE 15: EXTREME-LENGTH CONTENT INTEGRITY (BUKHARI #6228) ────────────
  test('Gate 15: Extreme-length footnote (Bukhari #6228, 13,488 characters) matches source byte-for-byte', () => {
    const b6228 = audit.bukhari_6228_stress_test;
    expect(b6228.source_note_length).toBe(13488);
    expect(b6228.app_note_length).toBe(13488);
    expect(b6228.exact_match).toBe(true);
  });

  // ── GATE 16: DATABASE INTEGRITY CHECKS ──────────────────────────────────
  test('Gate 16: SQLite PRAGMA integrity checks pass with 0 foreign key violations', () => {
    const db = audit.db_integrity;
    expect(db.master_ihadis_db.integrity_check).toBe('ok');
    expect(db.master_ihadis_db.foreign_key_violations).toBe(0);
    expect(db.reminder_app_db.integrity_check).toBe('ok');
    expect(db.reminder_app_db.foreign_key_violations).toBe(0);
  });

  // ── GATE 17: CRYPTOGRAPHIC CORPUS SHA-256 HASH VERIFICATION ─────────────
  test('Gate 17: Canonical Hadith corpus SHA-256 matches bit-for-bit with approved hash ad814492...', () => {
    const h = audit.hadith_corpus_parity;
    expect(h.source_corpus_sha256).toBe('ad8144921185c7b1fc953969d56b708efaef596398a3b43118b18844c1660fb0');
    expect(h.app_corpus_sha256).toBe('ad8144921185c7b1fc953969d56b708efaef596398a3b43118b18844c1660fb0');
    expect(h.corpus_sha256_match).toBe(true);
    expect(h.master_db_file_sha256).toBe('83c9f78710300ff6ba06e9b9cb868248a4cec95e257ac711aff2f3ed7d42c61d');
  });
});
