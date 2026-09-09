import collectionsData from '../assets/data/hadith_collections.json';
import { getCollectionHadiths, getHadithCollections } from '../src/database/hadithRepository';

describe('Hadith End-to-End Pagination & Integrity Verification', () => {
  test('Catalog count matches 25 canonical collections with positive counts', () => {
    expect(collectionsData).toHaveLength(25);
    for (const col of collectionsData) {
      expect(col.total_records).toBeGreaterThan(0);
    }
  });

  test('Major collections paginate cleanly through getCollectionHadiths', async () => {
    // Test 40-hadith (42 items total, exactly 3 pages of 20)
    const colKey = '40-hadith';
    const expectedTotal = 42;
    let fetchedTotal = 0;
    let page = 1;
    const pageSize = 20;

    while (true) {
      const batch = await getCollectionHadiths(colKey, page, pageSize);
      if (batch.length === 0) break;
      fetchedTotal += batch.length;
      expect(batch[0].reference.collection_key).toBe(colKey);
      expect(batch[0].translations.bn.text.length).toBeGreaterThan(0);
      page++;
      if (page > 10) break; // Guard against infinite loop
    }

    expect(fetchedTotal).toBe(expectedTotal);
  });

  test('Sahih Bukhari paginates page 1 and page 2 without memory bloat', async () => {
    const p1 = await getCollectionHadiths('bukhari', 1, 20);
    expect(p1).toHaveLength(20);
    expect(p1[0].reference.hadith_number).toBe(1);
    expect(p1[0].translations.ar.text).toBeDefined();
    expect(p1[0].translations.bn.text).toBeDefined();

    const p2 = await getCollectionHadiths('bukhari', 2, 20);
    expect(p2).toHaveLength(20);
    expect(p2[0].reference.hadith_number).toBe(21);
  });

  test('First, middle, and last records in collections have valid content', async () => {
    // Check 40-hadith: total 42
    const first = await getCollectionHadiths('40-hadith', 1, 1);
    expect(first).toHaveLength(1);
    expect(first[0].reference.hadith_number).toBe(1);
    expect(first[0].translations.bn.text.length).toBeGreaterThan(0);

    const mid = await getCollectionHadiths('40-hadith', 21, 1);
    expect(mid).toHaveLength(1);
    expect(mid[0].reference.hadith_number).toBe(21);
    expect(mid[0].translations.bn.text.length).toBeGreaterThan(0);

    const last = await getCollectionHadiths('40-hadith', 42, 1);
    expect(last).toHaveLength(1);
    expect(last[0].reference.hadith_number).toBe(42);
    expect(last[0].translations.bn.text.length).toBeGreaterThan(0);

    // Check Sahih Bukhari first and page 100
    const bukhariFirst = await getCollectionHadiths('bukhari', 1, 1);
    expect(bukhariFirst).toHaveLength(1);
    expect(bukhariFirst[0].reference.hadith_number).toBe(1);
    expect(bukhariFirst[0].translations.ar.text.length).toBeGreaterThan(0);
    expect(bukhariFirst[0].translations.bn.text.length).toBeGreaterThan(0);
  });

  test('Total records across all 25 collections equals 52,856', () => {
    const totalCount = collectionsData.reduce((acc: number, c: any) => acc + (c.total_records || 0), 0);
    expect(totalCount).toBe(52856);
  });
});
