import {
  searchContent,
  removeArabicDiacritics,
  parseQuranReferenceQuery,
  parseHadithReferenceQuery
} from '../src/database/searchRepository';

describe('Arabic Diacritics Normalization & Multilingual Reference Search Tests', () => {
  test('removeArabicDiacritics strips Tashkeel, Tanween, Shaddah, and normalizes Alif', () => {
    const vowelled = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
    const unvowelled = removeArabicDiacritics(vowelled);

    expect(unvowelled).not.toContain('\u064E'); // No Fatha
    expect(unvowelled).not.toContain('\u0650'); // No Kasra
    expect(unvowelled).not.toContain('\u0651'); // No Shaddah
    expect(unvowelled).toContain('بسم الله الرحمن الرحيم');
  });

  test('parseQuranReferenceQuery correctly parses various reference formats', () => {
    expect(parseQuranReferenceQuery('2:255')).toEqual({ surah: 2, ayah: 255 });
    expect(parseQuranReferenceQuery('Surah 1:1')).toEqual({ surah: 1, ayah: 1 });
    expect(parseQuranReferenceQuery('114:6')).toEqual({ surah: 114, ayah: 6 });
    expect(parseQuranReferenceQuery('invalid query')).toBeNull();
  });

  test('parseHadithReferenceQuery correctly parses collection and number formats', () => {
    expect(parseHadithReferenceQuery('Bukhari 13')).toEqual({ collection: 'bukhari', number: 13 });
    expect(parseHadithReferenceQuery('muslim #45')).toEqual({ collection: 'muslim', number: 45 });
    expect(parseHadithReferenceQuery('Tirmidhi 1')).toEqual({ collection: 'tirmidhi', number: 1 });
  });

  test('searchContent finds Quran verse by exact reference "1:1"', async () => {
    const results = await searchContent('1:1', 'en', 'quran');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].reference_text).toBe('Surah 1:1');
  });

  test('searchContent finds Hadith by canonical reference "Bukhari 13"', async () => {
    const results = await searchContent('Bukhari 13', 'en', 'hadith');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('bukhari');
  });

  test('searchContent returns empty for non-existent reference "Bukhari 99999"', async () => {
    const results = await searchContent('Bukhari 99999', 'en', 'hadith');
    expect(results.length).toBe(0);
  });

  test('searchContent matches Arabic text with or without diacritics', async () => {
    const vowelledQuery = 'الرَّحِيمِ';
    const unvowelledQuery = 'الرحيم';

    const resVowelled = await searchContent(vowelledQuery, 'en');
    const resUnvowelled = await searchContent(unvowelledQuery, 'en');

    expect(resVowelled.length).toBeGreaterThan(0);
    expect(resUnvowelled.length).toBeGreaterThan(0);
  });

  test('searchContent supports Bengali translation queries (e.g. "রহমত")', async () => {
    const results = await searchContent('রহমত', 'bn');
    expect(results.length).toBeGreaterThan(0);
  });
});
