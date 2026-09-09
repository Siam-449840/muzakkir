import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { QuranDetailScreen } from '../screens/QuranDetailScreen';
import { HadithChapterScreen } from '../screens/HadithChapterScreen';
import { HadithSectionScreen } from '../screens/HadithSectionScreen';
import { HadithDetailScreen } from '../screens/HadithDetailScreen';
import { BookmarksScreen } from '../screens/BookmarksScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AboutSourcesScreen } from '../screens/AboutSourcesScreen';
import { staticData, recordHistoryEvent, getQuranDailyPool } from '../database/db';
import { getHadithById } from '../database/hadithRepository';
import { checkInitialNotification, subscribeToNotificationResponses } from '../services/notificationService';
import { getInitialReminderLaunchIntent, subscribeToFloatingReminderSeeMore } from '../services/floatingOverlayService';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onFloatingReminder?: (contentId: string, contentType: 'quran' | 'hadith') => void;
  setOpenContentHandler?: (handler: (contentId: string, contentType: 'quran' | 'hadith') => void) => void;
}

export const RootNavigator: React.FC<RootNavigatorProps> = ({ onFloatingReminder, setOpenContentHandler }) => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const handleOpenContent = async (
    contentId: string,
    contentType: 'quran' | 'hadith',
    isFromReminderDeepLink: boolean = false,
    metadata?: any
  ) => {
    if (!contentId || typeof contentId !== 'string' || !contentId.trim()) {
      console.warn('[RootNavigator] handleOpenContent ignored invalid contentId:', contentId);
      return;
    }
    const cleanId = contentId.trim();
    const safeContentType: 'quran' | 'hadith' =
      contentType === 'hadith' || cleanId.startsWith('hadith_') || cleanId.startsWith('henc_')
        ? 'hadith'
        : 'quran';

    // Record 'opened' status — user tapped the notification intentionally
    recordHistoryEvent({
      content_id: cleanId,
      content_type: safeContentType,
      scheduled_time: new Date().toISOString(),
      opened_time: new Date().toISOString(),
      status: 'opened',
    });

    if (!navigationRef.current) return;

    if (safeContentType === 'quran') {
      let targetSurahNumber = 1;
      let targetSurahName = 'Surah Al-Faatiha';
      let targetAyahNumber = 1;
      let targetAyahEnd = 1;
      let targetVerseId = cleanId;

      try {
        const pool = getQuranDailyPool();
        const poolItem = pool.items.find(i => i.content_id === cleanId);
        if (poolItem?.reference) {
          targetSurahNumber = (poolItem.reference as any).surah_number || 1;
          targetSurahName = (poolItem.reference as any).surah_name || `Surah ${targetSurahNumber}`;
          targetAyahNumber = (poolItem.reference as any).ayah_start || (poolItem.reference as any).ayah_number || 1;
          targetAyahEnd = (poolItem.reference as any).ayah_end || targetAyahNumber;
          targetVerseId = `quran_${String(targetSurahNumber).padStart(3, '0')}_${String(targetAyahNumber).padStart(3, '0')}`;
        } else {
          // Check if direct verse ID: e.g. quran_002_255
          const parts = cleanId.split('_');
          if (parts.length >= 3 && parts[0] === 'quran') {
            const sNum = parseInt(parts[1], 10);
            const aNum = parseInt(parts[2], 10);
            if (!isNaN(sNum) && sNum >= 1 && sNum <= 114) {
              targetSurahNumber = sNum;
              targetAyahNumber = !isNaN(aNum) ? aNum : 1;
              targetAyahEnd = targetAyahNumber;
              targetVerseId = `quran_${String(targetSurahNumber).padStart(3, '0')}_${String(targetAyahNumber).padStart(3, '0')}`;
            }
          }
          const surahInfo = staticData.surahs.find((s: any) => s.number === targetSurahNumber);
          if (surahInfo) targetSurahName = surahInfo.name;
        }
      } catch (err) {
        console.warn('[RootNavigator] Quran canonical resolution error:', err);
      }

      if (metadata) {
        if (metadata.surah_number) {
          const sNum = parseInt(metadata.surah_number, 10);
          if (!isNaN(sNum) && sNum >= 1 && sNum <= 114) targetSurahNumber = sNum;
        }
        if (metadata.ayah_start) {
          const aNum = parseInt(metadata.ayah_start, 10);
          if (!isNaN(aNum) && aNum >= 1) targetAyahNumber = aNum;
        }
        if (metadata.ayah_end) {
          const eNum = parseInt(metadata.ayah_end, 10);
          if (!isNaN(eNum) && eNum >= 1) targetAyahEnd = eNum;
        }
      }

      if (isFromReminderDeepLink) {
        // Synthesize Complete Quran Back Stack: [ MainTabs (Quran Tab) -> QuranDetail ]
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs', params: { screen: 'Quran' } },
              {
                name: 'QuranDetail',
                params: {
                  surahNumber: targetSurahNumber,
                  surahName: targetSurahName,
                  targetVerseId,
                  targetAyahNumber,
                  targetAyahEnd,
                },
              },
            ],
          })
        );
      } else {
        // Normal in-app navigation: respect existing navigation stack
        navigationRef.current.navigate('QuranDetail', {
          surahNumber: targetSurahNumber,
          surahName: targetSurahName,
          targetVerseId,
          targetAyahNumber,
          targetAyahEnd,
        });
      }
    } else {
      let collKey = 'bukhari';
      let collName = 'সহিহ বুখারী';
      let chapterId: number | string = 1;
      let chapterTitle = 'অধ্যায়';
      let sectionId: number | string = 1;
      let targetHadithId = cleanId;

      try {
        const hadithRec = await getHadithById(cleanId);
        if (hadithRec) {
          collKey = hadithRec.reference.collection_key || 'bukhari';
          collName = hadithRec.reference.collection || 'হাদিস গ্রন্থ';
          chapterId = hadithRec.reference.chapter_id || 1;
          chapterTitle = hadithRec.reference.chapter_title || 'অধ্যায়';
          sectionId = hadithRec.reference.section_id || 1;
          targetHadithId = hadithRec.id;
        } else {
          // Fallback parsing for legacy IDs
          const parts = cleanId.split('_');
          if (parts.length >= 2) collKey = parts[1];
          const collInfo = staticData.collections.find((c: any) => c.key === collKey);
          if (collInfo) collName = collInfo.name;
        }
      } catch (err) {
        console.warn('[RootNavigator] Hadith canonical resolution error:', err);
      }

      if (metadata) {
        if (metadata.collection_key) collKey = metadata.collection_key;
        if (metadata.chapter_id) chapterId = isNaN(Number(metadata.chapter_id)) ? metadata.chapter_id : Number(metadata.chapter_id);
        if (metadata.section_id) sectionId = isNaN(Number(metadata.section_id)) ? metadata.section_id : Number(metadata.section_id);
        if (metadata.chapter_title) chapterTitle = metadata.chapter_title;
      }

      if (isFromReminderDeepLink) {
        // Minimal deterministic Hadith Back Stack: [ MainTabs (Hadith Tab) -> HadithDetail ]
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: 'MainTabs', params: { screen: 'Hadith' } },
              {
                name: 'HadithDetail',
                params: {
                  collectionKey: collKey,
                  collectionName: collName,
                  chapterId,
                  chapterTitle,
                  targetSectionId: sectionId,
                  targetHadithId,
                },
              },
            ],
          })
        );
      } else {
        // Normal in-app navigation: respect existing navigation stack
        navigationRef.current.navigate('HadithDetail', {
          collectionKey: collKey,
          collectionName: collName,
          chapterId,
          chapterTitle,
          targetSectionId: sectionId,
          targetHadithId,
        });
      }
    }
  };

  const handleNavigationReady = () => {
    // Handle cold-start notification click (when app was terminated)
    checkInitialNotification((id, type) => handleOpenContent(id, type, true));

    // Handle cold-start floating reminder See More click
    getInitialReminderLaunchIntent().then((data) => {
      if (data?.content_id) {
        handleOpenContent(data.content_id, data.content_type || 'quran', true, data);
      }
    });
  };

  useEffect(() => {
    // Handle foreground/background notification clicks
    const subscription = subscribeToNotificationResponses((id, type) => handleOpenContent(id, type, true));
    // Handle background/foreground floating reminder See More clicks
    const floatingSub = subscribeToFloatingReminderSeeMore((id, type, meta) => handleOpenContent(id, type, true, meta));
    return () => {
      subscription.remove();
      floatingSub.remove();
    };
  }, []);

  useEffect(() => {
    if (setOpenContentHandler) {
      setOpenContentHandler((id, type) => handleOpenContent(id, type, false));
    }
  }, [setOpenContentHandler]);

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs">
          {() => <TabNavigator onOpenContent={handleOpenContent} />}
        </Stack.Screen>

        <Stack.Screen
          name="QuranDetail"
          component={QuranDetailScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />

        <Stack.Screen
          name="HadithChapter"
          component={HadithChapterScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name="HadithSection"
          component={HadithSectionScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        <Stack.Screen
          name="HadithDetail"
          component={HadithDetailScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />

        {/* Settings sub-screens */}
        <Stack.Screen name="BookmarksScreen">
          {props => <BookmarksScreen {...props} onOpenContent={handleOpenContent} />}
        </Stack.Screen>

        <Stack.Screen
          name="HistoryScreen"
        >
          {props => <HistoryScreen {...props} onOpenContent={handleOpenContent} />}
        </Stack.Screen>

        <Stack.Screen
          name="SourcesScreen"
          component={AboutSourcesScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
