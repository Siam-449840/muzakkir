import collectionsData from '../assets/data/hadith_collections.json';
import {
  getHadithCollections,
  getCollectionChapters,
  getChapterHadiths,
  getHadithById,
} from '../src/database/hadithRepository';
import { getHadithDailyPool } from '../src/database/db';

describe('Hadith Hierarchy & Dataset Forensic Audit', () => {
  // ── GATE 1: CATALOG PARITY ──────────────────────────────────────────────────
  test('Catalog has exactly 25 collections matching 52,856 hadiths, 654 chapters, 18,921 sections', () => {
    expect(collectionsData).toHaveLength(25);

    const totalHadiths = collectionsData.reduce((sum, c) => sum + (c.total_records || 0), 0);
    const totalChapters = collectionsData.reduce((sum, c) => sum + (c.chapters_count || 0), 0);
    const totalSections = collectionsData.reduce((sum, c) => sum + (c.sections_count || 0), 0);

    expect(totalHadiths).toBe(52856);
    expect(totalChapters).toBe(654);
    expect(totalSections).toBe(18921);
  });

  // ── GATE 2: REPOSITORY LEVEL PARITY ─────────────────────────────────────────
  test('getHadithCollections() returns all 25 collections with full metadata', async () => {
    const cols = await getHadithCollections();
    expect(cols).toHaveLength(25);

    for (const c of cols) {
      expect(c.key).toBeDefined();
      expect(c.name_bn).toBeDefined();
      expect(c.total_records).toBeGreaterThan(0);
      expect(c.chapters_count).toBeGreaterThan(0);
      expect(c.sections_count).toBeGreaterThan(0);
    }
  });

  // ── GATE 3: CHAPTER HIERARCHY FOR MAJOR CANONICAL BOOKS ─────────────────────
  test('Bukhari hierarchy resolves to exactly 97 chapters and 3,982 sections', async () => {
    const chapters = await getCollectionChapters('bukhari');
    expect(chapters).toHaveLength(97);

    const totalSections = chapters.reduce((sum, ch) => sum + (ch.sections_count || 0), 0);
    expect(totalSections).toBe(3982);

    // Verify Chapter 1 (Bad' al-Wahy)
    const ch1 = chapters[0];
    expect(ch1.id).toBe(1);
    expect(ch1.title).toContain('ওহীর সূচনা');
    expect(ch1.arabic_title).toContain('بدء الوحى');
    expect(ch1.hadith_count).toBe(7);
    expect(ch1.range).toBe('১ - ৭');
  });

  test('Muslim hierarchy resolves to exactly 57 chapters and 1,340 sections', async () => {
    const chapters = await getCollectionChapters('muslim');
    expect(chapters).toHaveLength(57);

    const totalSections = chapters.reduce((sum, ch) => sum + (ch.sections_count || 0), 0);
    expect(totalSections).toBe(1340);
  });

  test('Tirmidhi hierarchy resolves to exactly 46 chapters and 2,220 sections', async () => {
    const chapters = await getCollectionChapters('tirmidhi');
    expect(chapters).toHaveLength(46);

    const totalSections = chapters.reduce((sum, ch) => sum + (ch.sections_count || 0), 0);
    expect(totalSections).toBe(2220);
  });

  // ── GATE 4: FULL CHAPTER HADITH RETRIEVAL & FIELD FIDELITY ──────────────────
  test('getChapterHadiths returns all hadiths of Bukhari Chapter 1 with full fields', async () => {
    const { chapter, hadiths } = await getChapterHadiths('bukhari', 1);

    expect(chapter).not.toBeNull();
    expect(chapter?.id).toBe(1);
    expect(hadiths).toHaveLength(7);

    // Check Hadith 1: Umar ibn al-Khattab (Actions by Intentions)
    const h1 = hadiths[0];
    expect(h1.reference.hadith_number).toBe(1);
    expect(h1.reference.chapter_id).toBe(1);
    expect(h1.reference.section_id).toBe(1);
    // Narrator
    expect(h1.narrator).toContain('আলক্বামাহ');

    // Section title
    expect(h1.reference.section_title).toContain('ওহী');

    // Arabic Matn
    expect(h1.translations.ar.text).toContain('الأَعْمَالُ');

    // Bengali Translation
    expect(h1.translations.bn.text).toContain('নিয়ত');

    // Authenticity
    expect(h1.grade_bn).toBe('সহিহ');
    expect(h1.grade_color).toBe('#46B891');
  });

  // ── GATE 5: BOUNDARY AND FIELD LOSSLESSNESS ─────────────────────────────────
  test('Boundary hadiths (first, middle, last) retain complete matn and translation', async () => {
    // 1. Bukhari
    const bukhariChaps = await getCollectionChapters('bukhari');
    const { hadiths: bukhariFirst } = await getChapterHadiths('bukhari', bukhariChaps[0].id);
    const { hadiths: bukhariLast } = await getChapterHadiths('bukhari', bukhariChaps[bukhariChaps.length - 1].id);
    expect(bukhariFirst[0].translations.ar.text.length).toBeGreaterThan(20);
    expect(bukhariFirst[0].translations.bn.text.length).toBeGreaterThan(20);
    expect(bukhariLast[bukhariLast.length - 1].translations.ar.text.length).toBeGreaterThan(20);
    expect(bukhariLast[bukhariLast.length - 1].translations.bn.text.length).toBeGreaterThan(20);

    // 2. Muslim (Chapter 0: ভূমিকা, through Chapter 56: তাফসীর)
    const muslimChaps = await getCollectionChapters('muslim');
    const { hadiths: muslimFirst } = await getChapterHadiths('muslim', muslimChaps[0].id);
    const { hadiths: muslimLast } = await getChapterHadiths('muslim', muslimChaps[muslimChaps.length - 1].id);
    expect(muslimFirst[0].translations.ar.text.length).toBeGreaterThan(20);
    expect(muslimFirst[0].translations.bn.text.length).toBeGreaterThan(20);
    expect(muslimLast[muslimLast.length - 1].translations.ar.text.length).toBeGreaterThan(20);
    expect(muslimLast[muslimLast.length - 1].translations.bn.text.length).toBeGreaterThan(20);

    // 3. 40-Hadith Nawawi
    const { hadiths: nawawi } = await getChapterHadiths('40-hadith', 1);
    expect(nawawi).toHaveLength(42);
    expect(nawawi[0].translations.ar.text.length).toBeGreaterThan(20);
    expect(nawawi[41].translations.ar.text.length).toBeGreaterThan(20);
  });

  // ── GATE 6: SEPARATION OF DAILY REMINDER POOL AND FULL LIBRARY ──────────────
  test('Daily Reminder Pool (2,402 records) is strictly isolated from Full Library (52,856 records)', () => {
    const dailyPool = getHadithDailyPool();
    expect(dailyPool.hadiths).toHaveLength(2402);

    for (const h of dailyPool.hadiths) {
      expect(h.content_type).toBe('hadith');
      expect(h.translations.bn.text.length).toBeGreaterThan(10);
      expect(h.grade).toMatch(/Sahih|সহিহ/i);
    }

    // Full library catalog count remains 52,856
    const totalLibraryHadiths = collectionsData.reduce((sum, c) => sum + (c.total_records || 0), 0);
    expect(totalLibraryHadiths).toBe(52856);
    expect(totalLibraryHadiths).not.toBe(dailyPool.hadiths.length);
  });
});
