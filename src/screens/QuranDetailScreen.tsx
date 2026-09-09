import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { ReaderAppearanceButton } from '../components/reader/ReaderAppearanceButton';
import { AyaMarker } from '../components/common/AyaMarker';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { getA11yLabel } from '../utils/a11yLabels';
import { ReaderAppearancePanel } from '../components/reader/ReaderAppearancePanel';
import {
  ReaderSettings,
  DEFAULT_QURAN_SETTINGS,
  loadReaderSettings,
  saveReaderSettings,
} from '../utils/readerSettings';
import { QuranVerse, SupportedQuranLanguage, Bookmark, UserSettings } from '../types';
import { getSurahVerses } from '../database/quranRepository';
import { loadUserSettings, saveBookmark, removeBookmark, isBookmarked } from '../database/db';
import { shareQuranVerse } from '../utils/share';
import { removeArabicDiacritics } from '../database/searchRepository';
import {
  playVerseAudio,
  preloadNextVerseAudio,
  stopAudio,
  enterSurahMode,
  exitSurahMode,
} from '../services/audioService';
import {
  Bookmark as BookmarkIcon,
  Share2,
  Play,
  StopCircle,
} from 'lucide-react-native';

interface QuranDetailScreenProps {
  route: any;
  navigation: any;
}

export const QuranDetailScreen: React.FC<QuranDetailScreenProps> = ({ route, navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const {
    surahNumber = 1,
    surahName = 'Surah Al-Fatihah',
    targetVerseId,
    targetAyahNumber,
    targetAyahEnd,
  } = route.params || {};

  const [verses, setVerses] = useState<QuranVerse[]>([]);
  const [currentLang, setCurrentLang] = useState<SupportedQuranLanguage>('bn');
  const [uiLang, setUiLang] = useState<string>('bn');
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [highlightedVerseId, setHighlightedVerseId] = useState<string | null>(null);

  // Settings State
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_QURAN_SETTINGS);

  // Audio Playback State
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState<number | null>(null);
  const [surahPlaybackActive, setSurahPlaybackActive] = useState<boolean>(false);
  const [surahPlaybackPaused, setSurahPlaybackPaused] = useState<boolean>(false);
  const currentAyahRef = useRef<number>(0);
  const surahPlaybackRef = useRef<boolean>(false);
  const advancingRef = useRef<boolean>(false);

  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    loadReaderSettings('quran').then(s => setReaderSettings(s));
    loadUserSettings().then((u: UserSettings) => {
      const prefLang = u.preferred_language || 'bn';
      const appUiLang = u.ui_language || 'bn';
      setCurrentLang(prefLang);
      setUiLang(appUiLang);
      loadVerses(prefLang);
    });
  }, [surahNumber]);

  const handleSettingsChange = (newSettings: ReaderSettings) => {
    setReaderSettings(newSettings);
    saveReaderSettings('quran', newSettings);
  };

  useEffect(() => {
    if ((targetVerseId || targetAyahNumber) && verses.length > 0) {
      const idx = verses.findIndex(
        v => v.id === targetVerseId ||
             (targetAyahNumber && v.reference.ayah_number === targetAyahNumber)
      );
      const matchedId = idx >= 0 ? verses[idx].id : null;
      if (idx >= 0 && listRef.current) {
        setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({
              index: idx,
              animated: true,
              viewPosition: 0.15,
            });
          } catch (e) {
            // fallback
          }
        }, 350);

        setHighlightedVerseId(matchedId);
        setTimeout(() => setHighlightedVerseId(null), 2500);
      }
    }
  }, [targetVerseId, targetAyahNumber, verses]);

  const loadVerses = async (lang: SupportedQuranLanguage) => {
    const list = await getSurahVerses(surahNumber, lang);
    setVerses(list);

    const map: Record<string, boolean> = {};
    for (const v of list) {
      map[v.id] = await isBookmarked(v.id);
    }
    setBookmarkedMap(map);
  };

  const handleToggleBookmark = async (verse: QuranVerse) => {
    const isBooked = bookmarkedMap[verse.id];
    if (isBooked) {
      await removeBookmark(verse.id);
      setBookmarkedMap(prev => ({ ...prev, [verse.id]: false }));
    } else {
      const bookmark: Bookmark = {
        content_id: verse.id,
        content_type: 'quran',
        created_at: new Date().toISOString(),
        title: `সূরা ${verse.reference.surah_name}`,
        reference_text: `সূরা ${verse.reference.surah_number}:${verse.reference.ayah_number}`,
        excerpt: verse.translations?.[currentLang]?.text || verse.translations?.bn?.text || verse.translations?.en?.text || '',
      };
      await saveBookmark(bookmark);
      setBookmarkedMap(prev => ({ ...prev, [verse.id]: true }));
    }
  };

  // Sequential Playback
  const playNextAyah = useCallback(
    async (ayahIndex: number) => {
      if (!surahPlaybackRef.current || ayahIndex >= verses.length) {
        surahPlaybackRef.current = false;
        advancingRef.current = false;
        exitSurahMode();
        setSurahPlaybackActive(false);
        setSurahPlaybackPaused(false);
        setCurrentPlayingAyah(null);
        return;
      }

      advancingRef.current = true;
      const verse = verses[ayahIndex];
      const ayahNum = verse.reference.ayah_number;
      currentAyahRef.current = ayahIndex;
      setCurrentPlayingAyah(ayahNum);

      if (readerSettings.readingMode === 'list') {
        try {
          listRef.current?.scrollToIndex({
            index: ayahIndex,
            animated: true,
            viewPosition: 0.25,
          });
        } catch {
          // non-fatal
        }
      }

      const success = await playVerseAudio(surahNumber, ayahNum, async () => {
        if (surahPlaybackRef.current) {
          playNextAyah(ayahIndex + 1);
        }
      });

      if (!success) {
        surahPlaybackRef.current = false;
        setSurahPlaybackActive(false);
        setCurrentPlayingAyah(null);
        Alert.alert(
          uiLang === 'en' ? 'Playback Error' : 'তেলাওয়াত ত্রুটি',
          uiLang === 'en'
            ? 'An active internet connection is required to stream recitation.'
            : 'তেলাওয়াত শুনতে একটি সক্রিয় ইন্টারনেট সংযোগ প্রয়োজন।'
        );
        advancingRef.current = false;
        return;
      }

      // Proactively prepare the next verse in the background for continuous playback
      if (ayahIndex + 1 < verses.length && surahPlaybackRef.current) {
        const nextAyahNum = verses[ayahIndex + 1].reference.ayah_number;
        preloadNextVerseAudio(surahNumber, nextAyahNum);
      }
      advancingRef.current = false;
    },
    [verses, surahNumber, readerSettings.readingMode, uiLang]
  );

  // Audio lifecycle cleanup on screen unmount
  useEffect(() => {
    return () => {
      surahPlaybackRef.current = false;
      advancingRef.current = false;
      exitSurahMode();
      stopAudio();
    };
  }, []);

  const handlePlaySingleVerse = async (ayahNumber: number) => {
    if (currentPlayingAyah === ayahNumber) {
      // User tapped the currently playing ayah -> STOP it immediately!
      await stopAudio();
      setCurrentPlayingAyah(null);
      return;
    }
    if (surahPlaybackActive) {
      surahPlaybackRef.current = false;
      advancingRef.current = false;
      exitSurahMode();
      setSurahPlaybackActive(false);
      setSurahPlaybackPaused(false);
    }
    setCurrentPlayingAyah(ayahNumber);
    await playVerseAudio(surahNumber, ayahNumber, () => {
      setCurrentPlayingAyah(null);
    });
  };

  const handlePlayFullSurah = async () => {
    if (surahPlaybackActive) {
      surahPlaybackRef.current = false;
      advancingRef.current = false;
      exitSurahMode();
      await stopAudio();
      setSurahPlaybackActive(false);
      setSurahPlaybackPaused(false);
      setCurrentPlayingAyah(null);
    } else {
      surahPlaybackRef.current = true;
      setSurahPlaybackActive(true);
      setSurahPlaybackPaused(false);
      enterSurahMode();
      await playNextAyah(0);
    }
  };

  const isDark = readerSettings.nightMode;
  const isSepia = Boolean(readerSettings.sepiaMode) && !isDark;

  const bgColor = isDark ? '#111815' : isSepia ? '#FAF4EA' : colors.canvas;
  const cardBgColor = isDark ? '#1A231F' : isSepia ? '#F5EFE1' : colors.surface;
  const cardBorderColor = isDark ? '#27352E' : isSepia ? '#E8DDC9' : colors.borderLight;
  const textPrimaryColor = isDark ? '#F1F5F3' : isSepia ? '#2C2216' : colors.textPrimary;
  const keyExtractor = useCallback((item: QuranVerse) => item.id, []);

  // Render Ayah Card (List View)
  const renderVerseItem = useCallback(
    ({ item }: { item: QuranVerse }) => {
      const isBooked = Boolean(bookmarkedMap[item.id]);
      const transObj = item.translations?.[currentLang] || item.translations?.bn || item.translations?.en;
      const transText = transObj?.text || '';
      const rawArabic = item.translations?.ar?.text || '';
      const arabicText = readerSettings.showDiacritics ? rawArabic : removeArabicDiacritics(rawArabic);

      const isHighlighted = highlightedVerseId === item.id;
      const isCurrentlyPlaying = currentPlayingAyah === item.reference.ayah_number;

      return (
        <View
          style={[
            styles.verseRow,
            {
              borderBottomColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : isSepia
                ? 'rgba(44, 34, 22, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
            isHighlighted && styles.verseRowHighlighted,
            isCurrentlyPlaying && (isDark ? styles.verseRowPlayingDark : styles.verseRowPlayingLight),
          ]}
        >
          <View style={styles.verseHeaderRow}>
            <AyaMarker
              number={item.reference.ayah_number}
              size={36}
              color={isCurrentlyPlaying ? '#EBF4F0' : isDark ? '#1F2E27' : '#FAF7F2'}
              borderColor={isCurrentlyPlaying ? colors.primary : colors.gold}
              textColor={isCurrentlyPlaying ? colors.primaryDark : isDark ? '#A7F3D0' : colors.primaryDark}
            />

            <View style={styles.verseActionsRow}>
              {/* Play / Stop Single Ayah */}
              <TouchableOpacity
                onPress={() => handlePlaySingleVerse(item.reference.ayah_number)}
                style={styles.actionIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={
                  isCurrentlyPlaying
                    ? `${getA11yLabel('pause', currentLang)} (${item.reference.ayah_number})`
                    : `${getA11yLabel('play', currentLang)} (${item.reference.ayah_number})`
                }
              >
                {isCurrentlyPlaying ? (
                  <StopCircle size={18} color={colors.primary} />
                ) : (
                  <Play size={18} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Bookmark */}
              <TouchableOpacity
                onPress={() => handleToggleBookmark(item)}
                style={styles.actionIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={getA11yLabel(isBooked ? 'bookmarked' : 'bookmark', currentLang)}
              >
                <BookmarkIcon
                  size={18}
                  color={isBooked ? colors.gold : colors.textMuted}
                  fill={isBooked ? colors.gold : 'transparent'}
                />
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPress={() => shareQuranVerse(item, currentLang)}
                style={styles.actionIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={getA11yLabel('share', currentLang)}
              >
                <Share2 size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Arabic Ayah */}
          {readerSettings.showArabic && arabicText ? (
            <View style={styles.arabicBox}>
              <Text
                style={[
                  styles.arabicText,
                  {
                    fontSize: readerSettings.arabicFontSize,
                    lineHeight: Math.round(readerSettings.arabicFontSize * 1.9),
                    color: isDark ? '#D1FAE5' : colors.primaryDark,
                    fontFamily:
                      readerSettings.arabicFont === 'Amiri'
                        ? 'Amiri'
                        : Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
                  },
                ]}
              >
                {arabicText}
              </Text>
            </View>
          ) : null}

          {/* Translation */}
          <View style={styles.translationBox}>
            <Text
              style={[
                styles.translationText,
                {
                  fontSize: readerSettings.translationFontSize,
                  lineHeight: Math.round(readerSettings.translationFontSize * 1.68),
                  color: textPrimaryColor,
                },
              ]}
            >
              {transText}
            </Text>
          </View>
        </View>
      );
    },
    [
      bookmarkedMap,
      currentLang,
      readerSettings,
      highlightedVerseId,
      currentPlayingAyah,
      isDark,
      isSepia,
      textPrimaryColor,
    ]
  );

  // Render Ayah Card (Slide View)
  const renderSlideItem = useCallback(
    ({ item }: { item: QuranVerse }) => {
      const isBooked = Boolean(bookmarkedMap[item.id]);
      const transObj = item.translations?.[currentLang] || item.translations?.bn || item.translations?.en;
      const transText = transObj?.text || '';
      const rawArabic = item.translations?.ar?.text || '';
      const arabicText = readerSettings.showDiacritics ? rawArabic : removeArabicDiacritics(rawArabic);

      return (
        <View style={{ width: screenWidth, paddingHorizontal: space.lg }}>
          <View
            style={[
              styles.slideCard,
              { backgroundColor: cardBgColor, borderColor: cardBorderColor, minHeight: 360 },
            ]}
          >
            <View style={styles.verseHeaderRow}>
              <AyaMarker
                number={item.reference.ayah_number}
                size={36}
                color={isDark ? '#1F2E27' : '#FAF7F2'}
                borderColor={colors.gold}
                textColor={isDark ? '#A7F3D0' : colors.primaryDark}
              />

              <View style={styles.verseActionsRow}>
                <TouchableOpacity
                  onPress={() => handlePlaySingleVerse(item.reference.ayah_number)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    currentPlayingAyah === item.reference.ayah_number
                      ? `${getA11yLabel('pause', currentLang)} (${item.reference.ayah_number})`
                      : `${getA11yLabel('play', currentLang)} (${item.reference.ayah_number})`
                  }
                >
                  {currentPlayingAyah === item.reference.ayah_number ? (
                    <StopCircle size={18} color={colors.primary} />
                  ) : (
                    <Play size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleBookmark(item)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={getA11yLabel(isBooked ? 'bookmarked' : 'bookmark', currentLang)}
                >
                  <BookmarkIcon
                    size={18}
                    color={isBooked ? colors.gold : colors.textMuted}
                    fill={isBooked ? colors.gold : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => shareQuranVerse(item, currentLang)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={getA11yLabel('share', currentLang)}
                >
                  <Share2 size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {readerSettings.showArabic && arabicText ? (
              <View style={styles.arabicBox}>
                <Text
                  style={[
                    styles.arabicText,
                    {
                      fontSize: readerSettings.arabicFontSize,
                      lineHeight: Math.round(readerSettings.arabicFontSize * 1.9),
                      color: isDark ? '#D1FAE5' : colors.primaryDark,
                    },
                  ]}
                >
                  {arabicText}
                </Text>
              </View>
            ) : null}

            <Text
              style={[
                styles.translationText,
                {
                  fontSize: readerSettings.translationFontSize,
                  lineHeight: Math.round(readerSettings.translationFontSize * 1.68),
                  color: textPrimaryColor,
                  marginTop: space.md,
                },
              ]}
            >
              {transText}
            </Text>
          </View>
        </View>
      );
    },
    [
      bookmarkedMap,
      currentLang,
      readerSettings,
      screenWidth,
      cardBgColor,
      cardBorderColor,
      isDark,
      textPrimaryColor,
      currentPlayingAyah,
    ]
  );

  // Header Bismillah (Except Surah 9)
  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      {surahNumber !== 9 && (
        <View style={styles.bismillahBox}>
          <Text style={styles.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
        </View>
      )}

      {/* Audio Sequential Player Bar */}
      <View style={[styles.audioPlayerBar, isDark && styles.audioPlayerBarDark]}>
        <TouchableOpacity
          style={styles.playSurahBtn}
          onPress={handlePlayFullSurah}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            surahPlaybackActive ? getA11yLabel('pause', currentLang) : getA11yLabel('play', currentLang)
          }
        >
          {surahPlaybackActive ? (
            <StopCircle size={18} color="#FFFFFF" style={{ marginRight: space.xs }} />
          ) : (
            <Play size={18} color="#FFFFFF" style={{ marginRight: space.xs }} />
          )}
          <Text style={styles.playSurahText}>
            {surahPlaybackActive
              ? uiLang === 'en'
                ? 'Stop recitation'
                : uiLang === 'ar'
                ? 'إيقاف التلاوة'
                : 'তেলাওয়াত বন্ধ করুন'
              : uiLang === 'en'
              ? 'Listen to full Surah'
              : uiLang === 'ar'
              ? 'استمع إلى السورة كاملة'
              : 'পূর্ণ সূরা তেলাওয়াত শুনুন'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const subtitleText = `সূরা ${toBengaliNumerals(surahNumber)} · ${toBengaliNumerals(verses.length)}টি আয়াত`;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} animated={true} />
      <ScreenHeader
        title={surahName}
        subtitle={subtitleText}
        onBack={() => navigation.goBack()}
        variant="emerald"
        lang={uiLang}
        rightActions={
          <ReaderAppearanceButton
            onPress={() => setSettingsModalOpen(true)}
            isDark={isDark}
            lang={uiLang}
          />
        }
      />

      <SafeContentArea>
        {readerSettings.readingMode === 'slide' ? (
          <FlatList
            ref={listRef}
            data={verses}
            horizontal
            pagingEnabled
            keyExtractor={keyExtractor}
            renderItem={renderSlideItem}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: space.md }}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={verses}
            keyExtractor={keyExtractor}
            renderItem={renderVerseItem}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={info => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
              setTimeout(() => {
                try {
                  listRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.15,
                  });
                } catch {
                  listRef.current?.scrollToOffset({
                    offset: info.averageItemLength * info.index,
                    animated: true,
                  });
                }
              }, 120);
            }}
          />
        )}
      </SafeContentArea>

      {/* Reader Appearance Panel */}
      <ReaderAppearancePanel
        visible={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        type="quran"
        settings={readerSettings}
        onSettingsChange={handleSettingsChange}
        lang={currentLang}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: space.xxxl,
  },
  listHeaderContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    marginBottom: space.sm,
  },
  bismillahBox: {
    alignItems: 'center',
    paddingVertical: space.md,
    marginBottom: space.xs,
  },
  bismillahText: {
    fontSize: 24,
    color: colors.primary,
    fontFamily: 'Amiri',
    textAlign: 'center',
  },
  audioPlayerBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  audioPlayerBarDark: {
    backgroundColor: '#1E2D26',
    borderColor: '#2D3E35',
  },
  playSurahBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.min,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  playSurahText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Continuous Sacred Reading Surface
  verseRow: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  verseRowHighlighted: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderRadius: radius.sm,
  },
  verseRowPlayingLight: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.sm,
  },
  verseRowPlayingDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
    borderRadius: radius.sm,
  },
  slideCard: {
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    minHeight: 360,
  },
  verseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  verseActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  actionIconBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arabicBox: {
    paddingVertical: space.sm,
    marginBottom: space.xs,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translationBox: {
    marginTop: space.xs,
  },
  translationText: {
    fontWeight: '400',
  },
});
