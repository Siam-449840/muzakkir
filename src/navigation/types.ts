export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  QuranDetail: {
    surahNumber: number;
    surahName?: string;
    targetVerseId?: string;
    targetAyahNumber?: number;
    targetAyahEnd?: number;
  };
  HadithChapter: {
    collectionKey: string;
    collectionName?: string;
  };
  HadithSection: {
    collectionKey: string;
    collectionName?: string;
    chapterId: number | string;
    chapterTitle?: string;
  };
  HadithDetail: {
    collectionKey: string;
    collectionName?: string;
    chapterId?: number | string;
    chapterTitle?: string;
    targetSectionId?: number | string;
    targetHadithId?: string;
  };
  BookmarksScreen: undefined;
  HistoryScreen: undefined;
  SourcesScreen: undefined;
};

export type MainTabParamList = {
  Quran: undefined;
  Hadith: undefined;
  Settings: undefined;
};

