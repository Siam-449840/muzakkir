import { searchContent } from '../src/database/searchRepository';

describe('Search Engine & Multilingual Query Tests', () => {
  test('Finds Quran verses by Surah name (e.g. "Faatiha" or "Baqarah")', async () => {
    const results = await searchContent('Faatiha', 'en', 'quran');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('quran');
    expect(results[0].title).toContain('Faatiha');
  });

  test('Finds Quran verses by topic keyword (e.g. "Mercy" or "Patience")', async () => {
    const results = await searchContent('Mercy', 'en', 'quran');
    expect(results.length).toBeGreaterThan(0);
    const hasMercy = results.some(r => r.excerpt.toLowerCase().includes('mercy') || r.title.toLowerCase().includes('mercy'));
    expect(hasMercy).toBe(true);
  });

  test('Finds Hadith narrations by source attribution (e.g. "Bukhari")', async () => {
    // 313 of the 699 HadeethEnc Sahih records cite Bukhari as their source.
    // searchContent matches on attribution field — this correctly returns results.
    const results = await searchContent('Bukhari', 'en', 'hadith');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('hadith');
    expect(results[0].title.toLowerCase()).toContain('bukhari');
  });

  test('Finds Hadith by numeric ID or hadith number (e.g. "1")', async () => {
    const results = await searchContent('1', 'en', 'hadith');
    expect(results.length).toBeGreaterThan(0);
    const hasHadith = results.some(r => r.id.startsWith('hadith_'));
    expect(hasHadith).toBe(true);
  });

  test('Returns empty array for blank query', async () => {
    const results = await searchContent('   ', 'en');
    expect(results).toEqual([]);
  });
});
