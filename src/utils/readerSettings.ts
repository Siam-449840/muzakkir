import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReaderSettings {
  showArabic: boolean;
  showDiacritics: boolean;
  arabicFontSize: number;
  translationFontSize: number;
  arabicFont: string;
  nightMode: boolean;
  sepiaMode?: boolean;
  readingMode: 'list' | 'slide';
}

export const DEFAULT_QURAN_SETTINGS: ReaderSettings = {
  showArabic: true,
  showDiacritics: true,
  arabicFontSize: 24,
  translationFontSize: 16,
  arabicFont: 'Me Quran',
  nightMode: false,
  sepiaMode: false,
  readingMode: 'list',
};

export const DEFAULT_HADITH_SETTINGS: ReaderSettings = {
  showArabic: true,
  showDiacritics: true,
  arabicFontSize: 20,
  translationFontSize: 15,
  arabicFont: 'Amiri',
  nightMode: false,
  sepiaMode: false,
  readingMode: 'list',
};

export const ARABIC_FONTS = [
  { id: 'Me Quran', name: 'Me Quran (উসমানী লিপি)' },
  { id: 'Amiri', name: 'Amiri (শাস্ত্রীয় আরবি)' },
  { id: 'Scheherazade', name: 'Scheherazade (সুলভ লিপি)' },
  { id: 'System', name: 'System (ডিফল্ট ফন্ট)' },
];

export async function loadReaderSettings(type: 'quran' | 'hadith'): Promise<ReaderSettings> {
  const defaults = type === 'quran' ? DEFAULT_QURAN_SETTINGS : DEFAULT_HADITH_SETTINGS;
  try {
    const raw = await AsyncStorage.getItem(`@reader_settings_${type}`);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn(`[ReaderSettings] Failed to load ${type} settings:`, e);
  }
  return defaults;
}

export async function saveReaderSettings(type: 'quran' | 'hadith', settings: ReaderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(`@reader_settings_${type}`, JSON.stringify(settings));
  } catch (e) {
    console.warn(`[ReaderSettings] Failed to save ${type} settings:`, e);
  }
}
