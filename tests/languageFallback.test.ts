import {
  isHadithLanguageVerified,
  VERIFIED_HADITH_LANGUAGES
} from '../src/database/hadithRepository';
import { LANGUAGE_OPTIONS } from '../src/types';

describe('Multilingual Integrity & Honest Missing Translation Fallback Tests', () => {
  test('Language options list contains 9 translation languages (Arabic is original, not a translation)', () => {
    // Arabic is the original Quranic text — it is never listed as a
    // "translation" language in the UI. The picker shows 9 target languages.
    // Arabic original text is always rendered separately in the reader.
    expect(LANGUAGE_OPTIONS).toHaveLength(9);
    const codes = LANGUAGE_OPTIONS.map(l => l.code);
    expect(codes).not.toContain('ar'); // Arabic = original text, not a translation
    expect(codes).toContain('en');
    expect(codes).toContain('bn');
    expect(codes).toContain('ur');
    expect(codes).toContain('fr');
    expect(codes).toContain('es');
    expect(codes).toContain('pt');
    expect(codes).toContain('hi');
    expect(codes).toContain('zh');
    expect(codes).toContain('ru');
  });

  test('All 10 target languages are Hadith-verified (master corpus + HadeethEnc.com)', () => {
    // Original 5: master corpus (hadith-api / Sunnah.com)
    expect(isHadithLanguageVerified('ar')).toBe(true);
    expect(isHadithLanguageVerified('en')).toBe(true);
    expect(isHadithLanguageVerified('bn')).toBe(true);
    expect(isHadithLanguageVerified('ur')).toBe(true);
    expect(isHadithLanguageVerified('fr')).toBe(true);

    // Additional 5: HadeethEnc.com (scholarly-supervised, grade-verified translations)
    expect(isHadithLanguageVerified('es')).toBe(true);
    expect(isHadithLanguageVerified('pt')).toBe(true);
    expect(isHadithLanguageVerified('hi')).toBe(true);
    expect(isHadithLanguageVerified('zh')).toBe(true);
    expect(isHadithLanguageVerified('ru')).toBe(true);

    // Non-target languages remain unverified
    expect(isHadithLanguageVerified('de')).toBe(false);
    expect(isHadithLanguageVerified('it')).toBe(false);
    expect(isHadithLanguageVerified('sw')).toBe(false);
  });

  test('Language option flags accurately reflect Hadith verification status — all 10 true', () => {
    const allTargetCodes = ['ar', 'en', 'bn', 'ur', 'fr', 'es', 'pt', 'hi', 'zh', 'ru'];
    for (const opt of LANGUAGE_OPTIONS) {
      if (allTargetCodes.includes(opt.code)) {
        expect(opt.hadithVerified).toBe(true);
      }
    }
  });

  test('VERIFIED_HADITH_LANGUAGES registry covers all 10 target codes', () => {
    const required = ['ar', 'en', 'bn', 'ur', 'fr', 'es', 'hi', 'zh', 'pt', 'ru'];
    for (const code of required) {
      expect(VERIFIED_HADITH_LANGUAGES).toHaveProperty(code);
      expect(VERIFIED_HADITH_LANGUAGES[code]).toBeTruthy();
    }
  });

  test('VERIFIED_HADITH_LANGUAGES contains provenance notes for HadeethEnc languages', () => {
    const hadeethEncLangs = ['es', 'hi', 'zh', 'pt', 'ru'];
    for (const code of hadeethEncLangs) {
      expect(VERIFIED_HADITH_LANGUAGES[code]).toContain('HadeethEnc');
    }
  });
});
