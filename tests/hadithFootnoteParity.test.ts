import fs from 'fs';
import path from 'path';

describe('Hadith Footnote Forensic Parity Test Suite', () => {
  const dataDir = path.join(__dirname, '../assets/data');
  const collections = JSON.parse(fs.readFileSync(path.join(dataDir, 'hadith_collections.json'), 'utf8'));

  it('contains exactly 25 canonical collections', () => {
    expect(collections.length).toBe(25);
  });

  it('verifies that all 35,180 footnotes exist with zero corruption across all collections', () => {
    let totalHadiths = 0;
    let totalFootnotes = 0;
    let longestFootnoteLength = 0;
    let longestFootnoteHadith = '';

    for (const col of collections) {
      const bookPath = path.join(dataDir, 'hadith_books', `${col.key}.json`);
      expect(fs.existsSync(bookPath)).toBe(true);

      const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
      totalHadiths += book.hadiths.length;

      for (const h of book.hadiths) {
        if (h.note && typeof h.note === 'string' && h.note.trim().length > 0) {
          totalFootnotes++;
          if (h.note.length > longestFootnoteLength) {
            longestFootnoteLength = h.note.length;
            longestFootnoteHadith = `${col.key} #${h.hadith_number}`;
          }
        }
      }
    }

    expect(totalHadiths).toBe(52856);
    expect(totalFootnotes).toBe(35180);
    // Bukhari Hadith 6228 has the longest scholarly footnote with 13,488 characters
    expect(longestFootnoteLength).toBe(13488);
    expect(longestFootnoteHadith).toBe('bukhari #6228');
  });

  it('verifies boundary hadith footnotes for Sahih Bukhari', () => {
    const bukhariPath = path.join(dataDir, 'hadith_books/bukhari.json');
    const bukhari = JSON.parse(fs.readFileSync(bukhariPath, 'utf8'));

    const h1 = bukhari.hadiths[0];
    expect(h1.hadith_number).toBe(1);
    expect(h1.note).toContain('আধুনিক প্রকাশনী- ১, ইসলামিক ফাউন্ডেশন ১');

    const h740 = bukhari.hadiths.find((h: any) => h.hadith_number === 740);
    expect(h740.note.length).toBe(10036);
    expect(h740.note).toContain('ওয়ালিল বিন হুজর (রাঃ)');
  });

  it('verifies boundary hadith footnotes for Bulugh al-Maram', () => {
    const bulughPath = path.join(dataDir, 'hadith_books/bulugul-maram.json');
    const bulugh = JSON.parse(fs.readFileSync(bulughPath, 'utf8'));

    const h278 = bulugh.hadiths.find((h: any) => h.hadith_number === 278);
    expect(h278.note.length).toBe(9845);
  });
});
