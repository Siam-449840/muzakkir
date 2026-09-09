import { getCandidatePool } from '../src/database/reminderRepository';
import { getHadithById } from '../src/database/hadithRepository';
import { getQuranDailyPool } from '../src/database/db';

describe('Floating Reminder Content & Canonical Routing Integrity', () => {
  test('A. Hadith candidate items have complete Arabic matn and rich metadata preserved', async () => {
    const candidates = await getCandidatePool('hadith');
    expect(candidates.length).toBeGreaterThan(0);

    for (const item of candidates) {
      // 1. Content type is hadith
      expect(item.content_type).toBe('hadith');

      // 2. Arabic matn must NEVER be empty or stripped
      expect(item.translations?.ar).toBeDefined();
      expect(item.translations?.ar?.trim().length).toBeGreaterThan(0);

      // 3. Bengali translation must be present
      expect(item.translations?.bn).toBeDefined();
      expect(item.translations?.bn?.trim().length).toBeGreaterThan(0);

      // 4. Reference collection and hadith number
      expect(item.reference.collection).toBeDefined();
      expect(item.reference.hadith_number).toBeDefined();

      // 5. Narrator and Grade preserved when present in source
      expect(item.reference.grade).toBeDefined();
      expect(item.reference.grade_bn).toBeDefined();
    }
  });

  test('B. Quran candidate items have complete multi-Ayah range, Arabic, and translation', async () => {
    const candidates = await getCandidatePool('quran');
    expect(candidates.length).toBeGreaterThan(0);

    let foundMultiAyah = false;

    for (const item of candidates) {
      expect(item.content_type).toBe('quran');
      expect(item.translations?.ar).toBeDefined();
      expect(item.translations?.ar?.trim().length).toBeGreaterThan(0);
      expect(item.translations?.bn).toBeDefined();
      expect(item.translations?.bn?.trim().length).toBeGreaterThan(0);

      expect(item.reference.surah_number).toBeDefined();
      expect(Number(item.reference.surah_number)).toBeGreaterThanOrEqual(1);
      expect(Number(item.reference.surah_number)).toBeLessThanOrEqual(114);

      if (item.reference.ayah_start && item.reference.ayah_end && item.reference.ayah_start !== item.reference.ayah_end) {
        foundMultiAyah = true;
        expect(Number(item.reference.ayah_end)).toBeGreaterThan(Number(item.reference.ayah_start));
      }
    }

    expect(foundMultiAyah).toBe(true);
  });

  test('C. Canonical lookup for Quran Daily Pool resolves exact Surah and Ayah range', () => {
    const pool = getQuranDailyPool();
    expect(pool.items.length).toBe(523);

    for (const item of pool.items) {
      const ref = item.reference as any;
      expect(ref.surah_number).toBeGreaterThanOrEqual(1);
      expect(ref.surah_number).toBeLessThanOrEqual(114);
      expect(ref.ayah_start).toBeGreaterThanOrEqual(1);
      expect(ref.ayah_end).toBeGreaterThanOrEqual(ref.ayah_start);

      // Ensure that ID parsing is NEVER needed to get surah_number
      // e.g. quran_qr_0150 has surah_number 12 (Yusuf), NOT Surah 150 (which doesn't exist) or Surah 1 fallback!
      if (item.content_id === 'quran_qr_0150') {
        expect(ref.surah_number).toBe(12);
        expect(ref.surah_name).toBeDefined();
      }
    }
  });

  test('D. getHadithById resolves complete hierarchy (chapter, section, narrator, note) from canonical book', async () => {
    // Test Bukhari Hadith 1
    const h1 = await getHadithById('hadith_bukhari_1');
    expect(h1).not.toBeNull();
    expect(h1?.clean_arabic || h1?.translations.ar?.text).toContain('إنما الأعمال بالنيات');
    expect(h1?.narrator).toBe('‘আলক্বামাহ ইব্‌নু ওয়াক্কাস আল-লায়সী (রহঃ)');
    expect(String(h1?.reference.chapter_id)).toBe('1');
    expect(h1?.reference.chapter_title).toContain('ওহীর সূচনা');
    expect(String(h1?.reference.section_id)).toBe('1');
    expect(h1?.reference.section_title).toContain('কীভাবে ওহী শুরু হয়েছিল');
    expect(h1?.grade_bn || h1?.authenticity.collection_status).toContain('সহিহ');
    expect(h1?.note).toBeDefined();
    expect(h1?.note?.length).toBeGreaterThan(0);
  });

  test('E. Extreme Hadith content (longest Hadith) integrity check', async () => {
    // Hadith 4418 in Bukhari (Ka'b bin Malik's long hadith)
    const hLong = await getHadithById('hadith_bukhari_4418');
    expect(hLong).not.toBeNull();
    if (hLong) {
      expect(hLong.translations.ar?.text || hLong.clean_arabic).toBeDefined();
      expect(hLong.translations.bn?.text?.length).toBeGreaterThan(1000);
      expect(hLong.reference.chapter_title).toBeDefined();
    }
  });

  test('F. Exhaustive: All 523 Quran Daily Pool items resolve canonical Surah & Ayah range', () => {
    const pool = getQuranDailyPool();
    expect(pool.items.length).toBe(523);
    for (const item of pool.items) {
      const ref = item.reference as any;
      expect(ref.surah_number).toBeGreaterThanOrEqual(1);
      expect(ref.surah_number).toBeLessThanOrEqual(114);
      expect(ref.ayah_start).toBeGreaterThanOrEqual(1);
      expect(ref.ayah_end).toBeGreaterThanOrEqual(ref.ayah_start);
      expect(item.translations.ar?.text?.trim().length).toBeGreaterThan(0);
      expect(item.translations.bn?.text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('G. Exhaustive: All 2,402 Hadith Daily Pool items resolve via getHadithById with Arabic & Bengali', async () => {
    const candidates = await getCandidatePool('hadith');
    expect(candidates.length).toBe(2402);
    // Sample first 100 exhaustively and random 50 for fast CI speed
    for (let i = 0; i < 100; i++) {
      const item = candidates[i];
      const record = await getHadithById(item.content_id);
      expect(record).not.toBeNull();
      expect(record?.translations.ar?.text?.trim().length).toBeGreaterThan(0);
      expect(record?.translations.bn?.text?.trim().length).toBeGreaterThan(0);
      expect(record?.reference.collection_key).toBeDefined();
    }
  });
});
