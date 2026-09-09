/**
 * iHadis Dataset & Daily Reminder Pool Integrity Tests
 * ====================================================
 * Validates the full iHadis dataset and daily reminder pool:
 *   - 25 Canonical Collections & Metadata
 *   - 2,402 Curated Sahih Hadiths in Daily Reminder Pool
 *   - Multilingual text completeness (Arabic, Bengali, English)
 *   - Grade filter enforcement (Sahih / Authentic only)
 *   - Reminder repository candidate pool integration
 *   - Modular collection book reader offline availability
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCandidatePool } from '../src/database/reminderRepository';
import { getHadithCollections, getCollectionHadiths, getHadithById } from '../src/database/hadithRepository';

const DAILY_POOL_PATH = path.join(__dirname, '..', 'assets', 'data', 'hadith_daily_pool.json');
const COLLECTIONS_PATH = path.join(__dirname, '..', 'assets', 'data', 'hadith_collections.json');
const BOOKS_DIR = path.join(__dirname, '..', 'assets', 'data', 'hadith_books');

describe('iHadis Dataset & Collections Catalog', () => {
  test('hadith_collections.json exists and contains 25 canonical books', () => {
    expect(fs.existsSync(COLLECTIONS_PATH)).toBe(true);
    const collections = JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf-8'));
    expect(collections.length).toBe(25);

    const keys = collections.map((c: any) => c.key);
    expect(keys).toContain('bukhari');
    expect(keys).toContain('muslim');
    expect(keys).toContain('abudawud');
    expect(keys).toContain('tirmidhi');
    expect(keys).toContain('nasai');
    expect(keys).toContain('ibnmajah');
    expect(keys).toContain('malik');
    expect(keys).toContain('riyadussalihin');
    expect(keys).toContain('40-hadith');
  });

  test('Every collection has valid title, arabic title, and total hadith count', async () => {
    const collections = await getHadithCollections();
    expect(collections.length).toBe(25);

    for (const c of collections) {
      expect(c.key).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.name_ar).toBeTruthy();
      expect(c.total_records).toBeGreaterThan(0);
    }
  });

  test('Every collection has a modular reader JSON file in assets/data/hadith_books/', async () => {
    const collections = await getHadithCollections();
    for (const c of collections) {
      const bookPath = path.join(BOOKS_DIR, `${c.key}.json`);
      expect(fs.existsSync(bookPath)).toBe(true);
    }
  });
});

describe('iHadis Daily Reminder Pool (hadith_daily_pool.json)', () => {
  let poolData: any;

  beforeAll(() => {
    expect(fs.existsSync(DAILY_POOL_PATH)).toBe(true);
    poolData = JSON.parse(fs.readFileSync(DAILY_POOL_PATH, 'utf-8'));
  });

  test('Pool contains exactly 2,402 curated Sahih hadiths', () => {
    expect(poolData.hadiths.length).toBe(2402);
    expect(poolData.metadata.total_records).toBe(2402);
  });

  test('Every hadith has a strictly Sahih / Authentic grade', () => {
    const SAHIH_REGEX = /\b(sahih|sahīh|authentic|সহিহ|সহীহ)\b/i;
    for (const h of poolData.hadiths) {
      const grade = h.grade || h.grade_bn || '';
      expect(SAHIH_REGEX.test(grade)).toBe(true);
      // Ensure no weak or fabricated hadiths exist
      expect(grade.toLowerCase()).not.toContain('daif');
      expect(grade.toLowerCase()).not.toContain("da'if");
      expect(grade.toLowerCase()).not.toContain('mawdu');
      expect(grade).not.toContain('দূর্বল');
      expect(grade).not.toContain('জাল');
    }
  });

  test('Every hadith has genuine Arabic matn text', () => {
    const ARABIC_REGEX = /[\u0600-\u06FF]/;
    for (const h of poolData.hadiths) {
      const arText = h.translations?.ar?.text;
      expect(arText).toBeDefined();
      expect(typeof arText).toBe('string');
      expect(arText.length).toBeGreaterThan(15);
      expect(ARABIC_REGEX.test(arText)).toBe(true);
    }
  });

  test('Every hadith has genuine Bengali translation text', () => {
    const BENGALI_REGEX = /[\u0980-\u09FF]/;
    for (const h of poolData.hadiths) {
      const bnText = h.translations?.bn?.text;
      expect(bnText).toBeDefined();
      expect(typeof bnText).toBe('string');
      expect(bnText.length).toBeGreaterThan(15);
      expect(BENGALI_REGEX.test(bnText)).toBe(true);
    }
  });

  test('Every hadith has attribution and hadith number', () => {
    for (const h of poolData.hadiths) {
      expect(h.content_id).toMatch(/^hadith_/);
      expect(h.attribution).toBeTruthy();
      expect(h.hadith_number).toBeGreaterThan(0);
      expect(h.collection_key).toBeTruthy();
    }
  });
});

describe('Reminder Repository & Hadith Candidate Integration', () => {
  test('getCandidatePool("hadith") returns all 2,402 candidates', async () => {
    const candidates = await getCandidatePool('hadith');
    expect(candidates.length).toBe(2402);
  });

  test('Candidates use hadith_ content_id format and have translations', async () => {
    const candidates = await getCandidatePool('hadith');
    for (const c of candidates) {
      expect(c.content_type).toBe('hadith');
      expect(c.content_id.startsWith('hadith_')).toBe(true);
      expect(c.translations?.ar).toBeTruthy();
      expect(c.translations?.bn).toBeTruthy();
      expect(c.translations?.en).toBeTruthy();
      expect(c.reference.hadith_number).toBeDefined();
    }
  });

  test('Offline Hadith reader resolves Bukhari hadith #1', async () => {
    const hadith = await getHadithById('hadith_bukhari_1');
    expect(hadith).toBeDefined();
    expect(hadith?.reference.hadith_number).toBe(1);
    expect(hadith?.translations['ar']?.text).toContain('الأَعْمَالُ بِالنِّيَّاتِ');
  });

  test('Offline Hadith reader loads collections items', async () => {
    const items = await getCollectionHadiths('bukhari', 1, 10);
    expect(items.length).toBe(10);
    expect(items[0].reference.hadith_number).toBe(1);
  });
});
