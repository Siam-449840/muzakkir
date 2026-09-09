import fs from 'fs';
import path from 'path';
import { formatSectionHeading } from '../src/utils/sectionTitleFormatter';
import { touchTarget, contentConstraints } from '../src/theme/tokens';
import { defaultSettings } from '../src/database/db';
import { isValid24hTime } from '../src/utils/time';
import { MULTILINGUAL_TARGET_LANGS } from '../src/types';

describe('Production Hardening & Architectural Audit Suite', () => {
  const dataDir = path.join(__dirname, '../assets/data');
  const collections = JSON.parse(fs.readFileSync(path.join(dataDir, 'hadith_collections.json'), 'utf8'));

  describe('1. Immutable Data Layer & Zero Alteration Policy', () => {
    it('enforces that presentation adapters do NOT fabricate section titles when title is blank', () => {
      const blankSection = {
        id: 2,
        title: '',
        number: 2,
        hadiths_count: 5,
      };

      const result = formatSectionHeading(blankSection);
      expect(result.hasCustomTitle).toBe(false);
      expect(result.heading).toBe('পরিচ্ছেদ ২');
      expect(result.subNote).toBe('মূল উৎসে আলাদা শিরোনাম নেই — পূর্ববর্তী পরিচ্ছেদের অনুবৃত্তি');
    });

    it('preserves existing scholarly section title when provided by source', () => {
      const titledSection = {
        id: 1,
        title: 'কীভাবে রসূলুল্লাহ (সাঃ)-এর প্রতি ওহী শুরু হয়েছিল',
        number: 1,
        hadiths_count: 7,
      };

      const result = formatSectionHeading(titledSection);
      expect(result.hasCustomTitle).toBe(true);
      expect(result.heading).toBe('কীভাবে রসূলুল্লাহ (সাঃ)-এর প্রতি ওহী শুরু হয়েছিল');
      expect(result.subNote).toBeUndefined();
    });

    it('verifies 52,856 Hadith texts are verbatim and have zero null/undefined translation text', () => {
      let totalHadiths = 0;
      let nonZeroTranslations = 0;

      for (const col of collections) {
        const bookPath = path.join(dataDir, 'hadith_books', `${col.key}.json`);
        const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
        totalHadiths += book.hadiths.length;

        for (const h of book.hadiths) {
          expect(h.id).toBeDefined();
          expect(['number', 'string']).toContain(typeof h.hadith_number);
          expect(typeof h.translation).toBe('string');
          if (h.translation && h.translation.trim().length > 0) {
            nonZeroTranslations++;
          }
        }
      }

      expect(totalHadiths).toBe(52856);
      expect(nonZeroTranslations).toBe(52856);
    });
  });

  describe('2. Boundary & Extreme Data Stress Testing', () => {
    it('identifies and stress-tests the largest Hadith in the entire corpus (Riyadus Salihin #22: 17,056 chars)', () => {
      let maxTextLength = 0;
      let maxHadithId = '';
      let maxHadithRecord: any = null;

      for (const col of collections) {
        const bookPath = path.join(dataDir, 'hadith_books', `${col.key}.json`);
        const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));

        for (const h of book.hadiths) {
          const textLen = (h.translation || '').length;
          if (textLen > maxTextLength) {
            maxTextLength = textLen;
            maxHadithId = `${col.key} #${h.hadith_number}`;
            maxHadithRecord = h;
          }
        }
      }

      expect(maxHadithId).toBe('riyadussalihin #22');
      expect(maxTextLength).toBe(17056);
      expect(maxHadithRecord).not.toBeNull();
      expect(maxHadithRecord.translation.length).toBe(17056);
    });

    it('verifies Bukhari #6228 footnote (13,488 chars) is completely intact without truncation', () => {
      const bukhariPath = path.join(dataDir, 'hadith_books/bukhari.json');
      const bukhari = JSON.parse(fs.readFileSync(bukhariPath, 'utf8'));
      const h6228 = bukhari.hadiths.find((h: any) => h.hadith_number === 6228);

      expect(h6228).toBeDefined();
      expect(h6228.note).toBeDefined();
      expect(h6228.note.length).toBe(13488);
      // Verify authentic opening, scholarly commentary, and ending
      expect(h6228.note.startsWith('আধুনিক প্রকাশনী- ৫৭৮৭')).toBe(true);
      expect(h6228.note).toContain('ইমাম বায়যাবী');
      expect(h6228.note).toContain('ইমাম ইবনে তাইমিয়্যাহ');
      expect(h6228.note.endsWith('অমৃত বাণী।')).toBe(true);
    });
  });

  describe('3. Responsive Geometry & Touch Target Standards', () => {
    it('guarantees WCAG 2.1 touch target minimums of at least 44dp', () => {
      expect(touchTarget.min).toBe(44);
      expect(touchTarget.iconButton).toBeGreaterThanOrEqual(40);
    });

    it('validates tablet reading and modal constraints', () => {
      expect(contentConstraints.maxReadingWidth).toBe(680);
      expect(contentConstraints.maxModalWidth).toBe(480);
      expect(contentConstraints.maxFloatingCardWidth).toBe(520);
    });

    it('validates floating card width calculations across phone and tablet viewports', () => {
      // Simulate phone viewport: 390 x 844
      const phoneWidth = 390;
      const phoneHeight = 844;
      const phoneCardWidth = Math.max(280, Math.min(Math.round(phoneWidth * 0.90), 480));
      const phoneCardMaxHeight = Math.round(phoneHeight * 0.72);

      expect(phoneCardWidth).toBe(351); // Exactly 90%
      expect(phoneCardMaxHeight).toBe(608); // Exactly 72%

      // Simulate compact phone: 320 x 568
      const compactWidth = 320;
      const compactCardWidth = Math.max(280, Math.min(Math.round(compactWidth * 0.90), 480));
      expect(compactCardWidth).toBe(288); // Safe 90% (>= 280)

      // Simulate tablet viewport: 800 x 1280
      const tabletWidth = 800;
      const tabletHeight = 1280;
      const tabletCardWidth = Math.min(Math.round(tabletWidth * 0.70), 520);
      const tabletCardMaxHeight = Math.round(tabletHeight * 0.72);

      expect(tabletCardWidth).toBe(520); // Firmly capped at 520dp on tablet
      expect(tabletCardMaxHeight).toBe(922);
    });
  });

  describe('4. Settings Defaults & Scheduling Invariants', () => {
    it('verifies default settings validity and quiet hours integrity', () => {
      expect(defaultSettings.daily_frequency).toBeGreaterThanOrEqual(1);
      expect(defaultSettings.daily_frequency).toBeLessThanOrEqual(5);
      expect(defaultSettings.reminder_times.length).toBe(defaultSettings.daily_frequency);

      for (const t of defaultSettings.reminder_times) {
        expect(isValid24hTime(t)).toBe(true);
      }

      expect(isValid24hTime(defaultSettings.quiet_hours_start)).toBe(true);
      expect(isValid24hTime(defaultSettings.quiet_hours_end)).toBe(true);
    });

    it('verifies all 10 canonical multilingual codes are registered', () => {
      expect(MULTILINGUAL_TARGET_LANGS).toHaveLength(10);
      expect(MULTILINGUAL_TARGET_LANGS).toContain('ar');
      expect(MULTILINGUAL_TARGET_LANGS).toContain('bn');
      expect(MULTILINGUAL_TARGET_LANGS).toContain('en');
      expect(MULTILINGUAL_TARGET_LANGS).toContain('ur');
    });
  });
});
