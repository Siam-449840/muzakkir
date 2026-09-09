import React, { useEffect, useState, useRef } from 'react';
import {
  AppState, AppStateStatus, StatusBar, StyleSheet, View, LogBox,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OnboardingScreen, ONBOARDING_COMPLETE_KEY } from './src/screens/OnboardingScreen';
import { FloatingReminder } from './src/components/reminder/FloatingReminder';
import { colors } from './src/theme/colors';
import { loadUserSettings, saveUserSettings, isBookmarked, saveBookmark } from './src/database/db';
import { getHadithDailyPool, getQuranDailyPool } from './src/database/db';
import {
  setupNotificationChannels,
  requestNotificationPermissions,
  scheduleNotificationsForSettings,
  subscribeToNotificationsReceived,
} from './src/services/notificationService';
import { CuratedCandidateItem } from './src/types';
import { checkAllRequiredCapabilities } from './src/services/permissionGateService';

// Ignore non-critical development warnings
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null); // null = loading

  // Floating reminder state — lives at the App level so it appears on any tab
  const [floatingItem, setFloatingItem] = useState<CuratedCandidateItem | null>(null);
  const [floatingVisible, setFloatingVisible] = useState<boolean>(false);
  const [userLang, setUserLang] = useState<string>('en');

  const lastScheduledDateRef = useRef<string>('');
  const appStateRef = useRef<AppStateStatus>('active');

  // Navigation ref forwarded from RootNavigator
  const openContentRef = useRef<((id: string, type: 'quran' | 'hadith') => void) | null>(null);

  useEffect(() => {
    async function initApp() {
      try {
        // 1. Check first-launch onboarding & required capabilities
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        const permStatus = await checkAllRequiredCapabilities();

        // Main app access requires onboarding completion
        const canEnterMainApp = onboardingDone === 'true';
        setShowOnboarding(!canEnterMainApp);

        // 2. Setup Android notification channels
        await setupNotificationChannels();

        // 3. Load settings
        const settings = await loadUserSettings();
        setUserLang(settings.preferred_language || 'en');

        // 4. If onboarding complete and capabilities available, schedule reminders
        if (canEnterMainApp) {
          await scheduleNotificationsForSettings(settings);
        }

        const today = getTodayStr();
        lastScheduledDateRef.current = today;
      } catch (error) {
        console.warn('App initialization warning:', error);
        setShowOnboarding(true); // default to onboarding/gate on error
      } finally {
        setAppReady(true);
      }
    }

    initApp();
  }, []);

  // Refresh rolling 7-day schedule and verify permissions on app foreground resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState !== 'active') return;
      if (prevState === 'active') return;

      try {
        // Defensive check: If required permissions were revoked in Android Settings, route to gate
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
        const permStatus = await checkAllRequiredCapabilities();

        if (onboardingDone === 'true') {
          if (!permStatus.allGranted) {
            setShowOnboarding(true);
            return;
          } else {
            setShowOnboarding(false);
          }
        }

        const settings = await loadUserSettings();
        const today = getTodayStr();
        const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const dateChanged = lastScheduledDateRef.current !== today;
        const tzChanged = settings.timezone !== currentTz;

        if (dateChanged || tzChanged) {
          const updatedSettings = tzChanged
            ? { ...settings, timezone: currentTz }
            : settings;

          if (tzChanged) {
            await saveUserSettings(updatedSettings);
          }

          await scheduleNotificationsForSettings(updatedSettings);
          lastScheduledDateRef.current = today;
          setUserLang(updatedSettings.preferred_language || 'en');
        }
      } catch (e) {
        console.warn('Rolling schedule refresh / permission check failed:', e);
      }
    });

    return () => subscription.remove();
  }, []);

  // Subscribe to foreground notifications — show FloatingReminder on any tab
  useEffect(() => {
    const fgSub = subscribeToNotificationsReceived(
      async (contentId: string, contentType: 'quran' | 'hadith') => {
        try {
          const item = resolveContentItem(contentId, contentType);
          if (item) {
            setFloatingItem(item);
            setFloatingVisible(true);
          }
        } catch (e) {
          console.warn('[App] FloatingReminder (fg) load error:', e);
        }
      }
    );

    return () => {
      fgSub.remove();
    };
  }, []);

  const handleFloatingReadMore = (item: CuratedCandidateItem) => {
    setFloatingVisible(false);
    if (openContentRef.current) {
      openContentRef.current(item.content_id, item.content_type as 'quran' | 'hadith');
    }
  };

  const handleFloatingBookmark = async (item: CuratedCandidateItem) => {
    const alreadyBookmarked = await isBookmarked(item.content_id);
    if (!alreadyBookmarked) {
      const lang = userLang === 'ar' ? 'en' : userLang;
      const text = item.translations?.[lang] || item.translations?.en || '';
      await saveBookmark({
        content_id: item.content_id,
        content_type: item.content_type as 'quran' | 'hadith',
        created_at: new Date().toISOString(),
        title: item.content_type === 'quran'
          ? `Surah ${item.reference.surah_name} ${item.reference.surah_number}:${item.reference.ayah_number}`
          : `${item.reference.collection} #${item.reference.hadith_number}`,
        reference_text: '',
        excerpt: text,
      });
    }
  };

  // Don't render until onboarding state is determined
  if (!appReady || showOnboarding === null) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        {showOnboarding ? (
          <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        ) : (
          <View style={styles.container}>
            <RootNavigator
              setOpenContentHandler={(handler) => {
                openContentRef.current = handler;
              }}
              onFloatingReminder={(id, type) => {
                const item = resolveContentItem(id, type);
                if (item) {
                  setFloatingItem(item);
                  setFloatingVisible(true);
                }
              }}
            />

            {/* App-level FloatingReminder — visible on any tab */}
            <FloatingReminder
              item={floatingItem}
              visible={floatingVisible}
              language={userLang === 'ar' ? 'en' : userLang}
              onReadMore={handleFloatingReadMore}
              onBookmark={handleFloatingBookmark}
              onDismiss={() => setFloatingVisible(false)}
            />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Resolves a content_id to a CuratedCandidateItem from the offline pools.
 * Quran: from quran_daily_pool.json
 * Hadith: from hadith_daily_pool.json
 */
function resolveContentItem(
  contentId: string,
  contentType: 'quran' | 'hadith'
): CuratedCandidateItem | null {
  try {
    if (contentType === 'quran') {
      const pool = getQuranDailyPool();
      const item = pool.items.find((v) => v.content_id === contentId);
      if (!item) return null;
      // Build flat translations map (lang -> text string)
      const translations: Record<string, string> = {};
      for (const [lang, slot] of Object.entries(item.translations)) {
        translations[lang] = slot.text || '';
      }
      const ref = item.reference as any;
      return {
        content_id: item.content_id,
        content_type: 'quran',
        reference: {
          surah_number: ref.surah_number as number,
          surah_name: ref.surah_name as string,
          surah_name_ar: (ref.surah_name_ar as string) || '',
          ayah_number: ref.ayah_number as number,
          collection: '',
          hadith_number: 0,
          collection_key: '',
        },
        translations,
        suitability: (item.suitability as any) || 'good',
        reason: '',
        topic: '',
      };
    } else {
      const pool = getHadithDailyPool();
      const rec = pool.hadiths.find((h) => h.content_id === contentId);
      if (!rec) return null;
      const translations: Record<string, string> = {};
      for (const [lang, slot] of Object.entries(rec.translations)) {
        translations[lang] = (slot as { text: string }).text || '';
      }
      return {
        content_id: rec.content_id,
        content_type: 'hadith',
        reference: {
          surah_number: 0,
          surah_name: '',
          surah_name_ar: '',
          collection: rec.attribution || '',
          hadith_number: rec.hadith_number || rec.hadeethenc_id || 0,
          collection_key: rec.collection_key || 'hadith',
        },
        translations,
        suitability: 'good' as any,
        reason: '',
        topic: '',
      };
    }
  } catch (e) {
    console.warn('[App] resolveContentItem error:', e);
    return null;
  }
}

function getTodayStr(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
