/**
 * Utility for converting ASCII digits (0-9) to Bengali digits (০-৯).
 * Used for numbers in chapter indices, hadith counts, font size indicators, etc.
 */
export function toBengaliNumerals(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bnDigits[parseInt(d, 10)]);
}
