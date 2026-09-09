/**
 * arabicNorm.ts
 *
 * Classical Quranic Arabic morphological & orthographic normalizer.
 * Derived from quran_linguistic_parser.py.
 *
 * Removes Tashkeel/Harakat diacritics, Tatweel, Dagger Alif,
 * and standardizes Alif/Hamza variants for robust text matching.
 */

/**
 * Normalizes Arabic text by removing diacritics, tatweel, dagger alif,
 * and standardizing alif variants.
 */
export function cleanArabicNorm(text: string): string {
  if (!text) return '';
  return text
    // Remove Quranic annotation signs, waqf marks, and diacritics
    .replace(/[\u0610-\u061A\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Standardize all Alif variants (Hamza above/below, Madda, Wasla) to bare Alif
    .replace(/[إأآٱ]/g, 'ا')
    // Standardize Alif Maqsura to Yaa
    .replace(/ى/g, 'ي')
    // Standardize Taa Marbuta to Haa
    .replace(/ة/g, 'ه')
    // Normalize Waw with Hamza and Yaa with Hamza
    .replace(/[ؤئ]/g, 'ء')
    .trim();
}

/**
 * Checks whether an Arabic text opens with a speech/dialogue verb (e.g. Qala, Qalu, Qul).
 */
export function startsWithSpeechVerb(text: string): boolean {
  if (!text) return false;
  const norm = cleanArabicNorm(text);
  const firstWord = norm.split(/\s+/)[0] || '';
  return /^(و|ف)?(قال|قالت|قالوا|قالا|قل|يقولون|نادي|قلت|قلنا|قيل)$/.test(firstWord);
}

/**
 * Checks whether an Arabic text opens with a supplication vocative (e.g. Rabbana, Rabbi, Allahumma).
 */
export function startsWithDuaVocative(text: string): boolean {
  if (!text) return false;
  const norm = cleanArabicNorm(text);
  const firstWord = norm.split(/\s+/)[0] || '';
  return /^(و|ف)?(ربنا|ربي|اللهم)$/.test(firstWord);
}
