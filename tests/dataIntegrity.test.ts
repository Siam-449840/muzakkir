import surahsData from '../assets/data/surahs.json';
import collectionsData from '../assets/data/hadith_collections.json';
import quranPoolData from '../assets/data/quran_daily_pool.json';
import hadithPoolData from '../assets/data/hadith_daily_pool.json';
import registriesData from '../assets/data/registries.json';
import categoriesData from '../assets/data/categories.json';

describe('Data Integrity & Structural Verification Tests', () => {
  test('Surahs catalog contains exactly 114 Surahs in order', () => {
    expect(surahsData).toHaveLength(114);
    expect(surahsData[0].number).toBe(1);
    expect(surahsData[0].name).toBe('Al-Faatiha');
    expect(surahsData[113].number).toBe(114);
    expect(surahsData[113].name).toBe('An-Naas');
  });

  test('Hadith collections catalog contains all 25 canonical collections', () => {
    expect(collectionsData.length).toBe(25);
    const keys = collectionsData.map((c: any) => c.key);
    expect(keys).toContain('bukhari');
    expect(keys).toContain('muslim');
    expect(keys).toContain('abudawud');
    expect(keys).toContain('tirmidhi');
    expect(keys).toContain('nasai');
    expect(keys).toContain('ibnmajah');
    expect(keys).toContain('malik');
    expect(keys).toContain('riyadussalihin');
  });

  test('Active daily candidate pools have zero orphan references and exact counts', () => {
    const qItems = (quranPoolData as any).items;
    const hItems = (hadithPoolData as any).hadiths;

    expect(qItems).toHaveLength(523);
    expect(hItems).toHaveLength(2402);

    // Verify all Quran items have valid references and content_ids
    for (const q of qItems) {
      expect(q.content_id).toMatch(/^quran_qr_\d{4}$/);
      expect(q.reference.surah_number).toBeGreaterThanOrEqual(1);
      expect(q.reference.surah_number).toBeLessThanOrEqual(114);
      expect(q.translations.ar).toBeDefined();
    }

    // Verify all Hadith items have valid references and content_ids
    for (const h of hItems) {
      expect(h.content_id).toMatch(/^hadith_/);
      expect(h.attribution || h.collection_key).toBeDefined();
      expect(h.translations.ar).toBeDefined();
    }
  });

  test('Categories taxonomy contains 10 controlled spiritual domains', () => {
    expect(categoriesData).toHaveLength(10);
    const catIds = categoriesData.map((c: any) => c.id);
    expect(catIds).toContain('patience');
    expect(catIds).toContain('gratitude');
    expect(catIds).toContain('tawbah');
    expect(catIds).toContain('prayer');
    expect(catIds).toContain('mercy');
    expect(catIds).toContain('hope');
  });

  test('Registries bundle contains sources, translations, and classical Tafsir editions', () => {
    expect(registriesData.sources.length).toBeGreaterThanOrEqual(4);
    expect(registriesData.translations.length).toBeGreaterThanOrEqual(19);
    expect(registriesData.tafsir_editions.length).toBeGreaterThanOrEqual(13);
  });
});
