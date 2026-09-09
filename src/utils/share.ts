import { Share } from 'react-native';
import { QuranVerse, HadithRecord } from '../types';

export async function shareQuranVerse(verse: QuranVerse, language: string = 'en'): Promise<void> {
  const arText = verse.translations?.ar?.text || '';
  const transObj = verse.translations?.[language] || verse.translations?.en;
  const transText = transObj?.text || '';
  const translator = transObj?.translator ? ` (${transObj.translator})` : '';

  const ref = `Surah ${verse.reference.surah_name} [${verse.reference.surah_number}:${verse.reference.ayah_number}]`;

  const message = `✨ Daily Quran Reminder ✨\n\n${arText}\n\n"${transText}"${translator}\n\n📍 Reference: ${ref}\n\nShared via Muzakkir App`;

  try {
    await Share.share({
      message,
      title: `Quran Reminder - ${ref}`,
    });
  } catch (error) {
    console.warn('Share error:', error);
  }
}

export async function shareHadith(hadith: HadithRecord, language: string = 'en'): Promise<void> {
  const arText = hadith.translations?.ar?.text || '';
  const transObj = hadith.translations?.[language] || hadith.translations?.en;
  const transText = transObj?.text || '';
  const translator = transObj?.translator ? ` (${transObj.translator})` : '';

  const ref = `${hadith.reference.collection}, Hadith #${hadith.reference.hadith_number}`;
  const auth = hadith.authenticity.collection_status ? `\nStatus: ${hadith.authenticity.collection_status}` : '';

  const message = `✨ Daily Hadith Reminder ✨\n\n${arText}\n\n"${transText}"${translator}\n\n📍 Source: ${ref}${auth}\n\nShared via Muzakkir App`;

  try {
    await Share.share({
      message,
      title: `Hadith Reminder - ${ref}`,
    });
  } catch (error) {
    console.warn('Share error:', error);
  }
}
