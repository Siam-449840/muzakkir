import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { colors, space, touchTarget } from '../theme/tokens';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { getA11yLabel } from '../utils/a11yLabels';
import {
  ReaderAppearancePanel,
} from '../components/reader/ReaderAppearancePanel';
import {
  ReaderSettings,
  DEFAULT_HADITH_SETTINGS,
  loadReaderSettings,
  saveReaderSettings,
} from '../utils/readerSettings';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { ReaderAppearanceButton } from '../components/reader/ReaderAppearanceButton';
import { CollapsibleFootnote } from '../components/common/CollapsibleFootnote';
import { formatSectionHeading } from '../utils/sectionTitleFormatter';
import {
  getChapterHadiths,
  getCollectionChapters,
  getHadithById,
  ChapterMeta,
} from '../database/hadithRepository';
import { saveBookmark, removeBookmark, isBookmarked } from '../database/db';
import { shareHadith } from '../utils/share';
import { HadithRecord, Bookmark } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark as BookmarkIcon,
  Share2,
  BookOpen,
  Feather,
} from 'lucide-react-native';

interface HadithDetailScreenProps {
  route: any;
  navigation: any;
}

interface HadithCardContentProps {
  item: HadithRecord;
  collectionName: string;
  isBooked: boolean;
  onToggleBookmark: () => void;
  onShare: () => void;
  readerSettings: ReaderSettings;
  isDark: boolean;
  textPrimaryColor: string;
  showSectionBreadcrumb?: boolean;
}

const HadithCardContent: React.FC<HadithCardContentProps> = ({
  item,
  collectionName,
  isBooked,
  onToggleBookmark,
  onShare,
  readerSettings,
  isDark,
  textPrimaryColor,
  showSectionBreadcrumb = false,
}) => {
  const arabicText = readerSettings.showDiacritics
    ? item.translations?.ar?.text || ''
    : item.clean_arabic || item.translations?.ar?.text || '';
  const bengaliText = item.translations?.bn?.text || item.translations?.en?.text || '';
  const narratorText = item.narrator;
  const noteText = item.note;
  const gradeLabel = item.grade_bn || item.authenticity?.collection_status || 'সহিহ';
  const gradeColor = item.grade_color || '#0E845A';

  return (
    <>
      {/* Card Top Row: Book Title + Hadith Number + Action Buttons */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.bookPill, { backgroundColor: isDark ? '#192620' : colors.primarySurface }]}>
            <BookOpen size={12} color={isDark ? '#A7F3D0' : colors.primaryDark} style={{ marginRight: 4 }} />
            <Text style={[styles.cardCollectionTitle, { color: isDark ? '#A7F3D0' : colors.primaryDark }]}>
              {collectionName}
            </Text>
          </View>
          <Text style={[styles.hadithNumberText, { color: textPrimaryColor }]}>
            হাদিস #{toBengaliNumerals(item.reference.display_label || item.reference.hadith_number)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={onToggleBookmark}
            style={styles.actionBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={getA11yLabel(isBooked ? 'bookmarked' : 'bookmark', 'bn')}
          >
            <BookmarkIcon
              size={18}
              color={isBooked ? colors.gold : colors.textMuted}
              fill={isBooked ? colors.gold : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onShare}
            style={styles.actionBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={getA11yLabel('share', 'bn')}
          >
            <Share2 size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-row: Scholarly Authenticity Grade Badge (Eliminating Horizontal Overlap) */}
      <View style={styles.gradeBadgeRow}>
        <View
          style={[
            styles.gradeBadge,
            { backgroundColor: `${gradeColor}12`, borderColor: `${gradeColor}40` },
          ]}
        >
          <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>
            {gradeLabel}
          </Text>
        </View>
      </View>

      {/* Section Breadcrumb (Slide Mode) */}
      {showSectionBreadcrumb && item.reference.section_title ? (
        <Text style={styles.slideSectionTitle}>
          {item.reference.section_title}
        </Text>
      ) : null}

      {/* Arabic Matn (Controlled by readerSettings) */}
      {readerSettings.showArabic && arabicText ? (
        <View style={styles.arabicBox}>
          <Text
            style={[
              styles.arabicText,
              {
                fontSize: readerSettings.arabicFontSize,
                lineHeight: Math.round(readerSettings.arabicFontSize * 1.85),
                color: isDark ? '#D1FAE5' : '#064E3B',
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

      {/* Narrator (রাবী) Callout */}
      {narratorText ? (
        <View style={[styles.narratorBox, isDark && styles.narratorBoxDark]}>
          <Feather size={13} color={isDark ? '#FCD34D' : '#92400E'} style={styles.narratorIcon} />
          <Text style={[styles.narratorText, isDark && styles.narratorTextDark]}>
            {narratorText} থেকে বর্ণিত:
          </Text>
        </View>
      ) : null}

      {/* Bengali Translation (Lossless, zero truncation) */}
      <View style={styles.translationBox}>
        <Text
          style={[
            styles.translationText,
            {
              fontSize: readerSettings.translationFontSize,
              lineHeight: Math.round(readerSettings.translationFontSize * 1.7),
              color: textPrimaryColor,
            },
          ]}
        >
          {bengaliText}
        </Text>
      </View>

      {/* Collapsible Scholarly Footnote */}
      {noteText && noteText.trim().length > 0 ? (
        <CollapsibleFootnote noteText={noteText} isDark={isDark} />
      ) : null}
    </>
  );
};

export const HadithDetailScreen: React.FC<HadithDetailScreenProps> = ({ route, navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const {
    collectionKey = 'bukhari',
    collectionName = 'সহিহ বুখারী',
    chapterId: initialChapterId,
    chapterTitle: initialChapterTitle,
    targetSectionId,
    targetHadithId,
  } = route.params || {};

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<number | string | null>(initialChapterId ?? null);
  const [currentChapterMeta, setCurrentChapterMeta] = useState<ChapterMeta | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | string | null>(targetSectionId ?? null);
  const [hadiths, setHadiths] = useState<HadithRecord[]>([]);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [highlightedHadithId, setHighlightedHadithId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings State
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(DEFAULT_HADITH_SETTINGS);

  const listRef = useRef<FlatList<any>>(null);

  // Load preferences
  useEffect(() => {
    loadReaderSettings('hadith').then(s => setReaderSettings(s));
  }, []);

  const handleSettingsChange = (newSettings: ReaderSettings) => {
    setReaderSettings(newSettings);
    saveReaderSettings('hadith', newSettings);
  };

  // 1. Initial Load: Fetch chapter hierarchy and resolve starting chapter
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const chapList = await getCollectionChapters(collectionKey);
        if (!isMounted) return;
        setChapters(chapList);

        let resolvedChapId = initialChapterId;

        // If direct targetHadithId is passed, resolve its exact chapter and section
        if (targetHadithId) {
          const direct = await getHadithById(targetHadithId);
          if (direct?.reference.chapter_id) {
            resolvedChapId = direct.reference.chapter_id;
            if (direct.reference.section_id) {
              setSelectedSectionId(direct.reference.section_id);
            }
          }
        }

        if (!resolvedChapId && chapList.length > 0) {
          resolvedChapId = chapList[0].id;
        }

        if (resolvedChapId != null) {
          setCurrentChapterId(resolvedChapId);
          await loadChapter(resolvedChapId);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('[HadithDetailScreen] init error:', e);
        if (isMounted) {
          setLoadError('হাদিসসমূহ লোড করতে ব্যর্থ হয়েছে।');
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [collectionKey, initialChapterId, targetHadithId]);

  // Load hadiths for a given chapter
  const loadChapter = async (chapId: number | string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { chapter, hadiths: list } = await getChapterHadiths(collectionKey, chapId);
      setCurrentChapterMeta(chapter);
      setHadiths(list);

      const bMap: Record<string, boolean> = {};
      for (const h of list) {
        bMap[h.id] = await isBookmarked(h.id);
      }
      setBookmarkedMap(bMap);

      // Scroll to top
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
      }

      // If targetHadithId is passed, focus on its section
      if (targetHadithId && list.length > 0) {
        const found = list.find(
          h => h.id === targetHadithId || String(h.reference.hadith_number) === String(targetHadithId)
        );
        if (found?.reference.section_id) {
          setSelectedSectionId(found.reference.section_id);
        }
      }
    } catch (e) {
      console.warn(`[HadithDetailScreen] loadChapter(${chapId}) error:`, e);
      setLoadError('হাদিস লোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // Chapter Sections and Section Navigation Helpers
  const chapterSections = useMemo(() => {
    const seen = new Set<string>();
    const secs: { id: string | number; title: string; arabic_title?: string }[] = [];
    for (const h of hadiths) {
      const sid = h.reference.section_id;
      if (sid != null && !seen.has(String(sid))) {
        seen.add(String(sid));
        secs.push({
          id: sid,
          title: h.reference.section_title || `পরিচ্ছেদ ${sid}`,
          arabic_title: h.reference.section_arabic_title,
        });
      }
    }
    return secs;
  }, [hadiths]);

  const activeSectionMeta = useMemo(() => {
    if (selectedSectionId == null) return null;
    return chapterSections.find(s => String(s.id) === String(selectedSectionId)) || null;
  }, [chapterSections, selectedSectionId]);

  const currentSectionIndex = useMemo(() => {
    if (selectedSectionId == null || chapterSections.length === 0) return -1;
    return chapterSections.findIndex(s => String(s.id) === String(selectedSectionId));
  }, [chapterSections, selectedSectionId]);

  const hasPrevSection = currentSectionIndex > 0;
  const hasNextSection = currentSectionIndex >= 0 && currentSectionIndex < chapterSections.length - 1;

  const displayedHadiths = useMemo(() => {
    if (selectedSectionId != null) {
      const secHadiths = hadiths.filter(h => String(h.reference.section_id) === String(selectedSectionId));
      if (secHadiths.length > 0) return secHadiths;
    }
    return hadiths;
  }, [hadiths, selectedSectionId]);

  // Target Hadith Auto-Scroll & Temporary Visual Highlight (Deep links / History / Bookmarks)
  useEffect(() => {
    if (targetHadithId && displayedHadiths.length > 0) {
      const idx = displayedHadiths.findIndex(
        h => h.id === targetHadithId || String(h.reference.hadith_number) === String(targetHadithId)
      );
      if (idx >= 0 && listRef.current) {
        const matchedId = displayedHadiths[idx].id;
        setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({
              index: idx,
              animated: true,
              viewPosition: 0.15,
            });
          } catch {
            // fallback handled by onScrollToIndexFailed
          }
        }, 350);

        setHighlightedHadithId(matchedId);
        setTimeout(() => setHighlightedHadithId(null), 2500);
      }
    }
  }, [targetHadithId, displayedHadiths]);

  // Chapter Navigation Helpers
  const currentChapterIndex = useMemo(() => {
    if (!currentChapterId || chapters.length === 0) return -1;
    return chapters.findIndex(c => String(c.id) === String(currentChapterId));
  }, [chapters, currentChapterId]);

  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1;

  const goToChapter = (chapId: number | string) => {
    setCurrentChapterId(chapId);
    setSelectedSectionId(null);
    loadChapter(chapId);
  };

  const handleToggleBookmark = async (hadith: HadithRecord) => {
    const isBooked = bookmarkedMap[hadith.id];
    if (isBooked) {
      await removeBookmark(hadith.id);
      setBookmarkedMap(prev => ({ ...prev, [hadith.id]: false }));
    } else {
      const transText = hadith.translations?.bn?.text || hadith.translations?.en?.text || '';
      const bookmark: Bookmark = {
        content_id: hadith.id,
        content_type: 'hadith',
        created_at: new Date().toISOString(),
        title: hadith.reference.collection,
        reference_text: `${hadith.reference.collection}, হাদিস #${hadith.reference.hadith_number}`,
        excerpt: transText.slice(0, 160),
      };
      await saveBookmark(bookmark);
      setBookmarkedMap(prev => ({ ...prev, [hadith.id]: true }));
    }
  };

  const isDark = readerSettings.nightMode;
  const isSepia = Boolean(readerSettings.sepiaMode) && !isDark;
  const bgColor = isDark ? '#111815' : isSepia ? '#FAF4EA' : colors.canvas;
  const cardBgColor = isDark ? '#1A231F' : isSepia ? '#F5EFE1' : colors.surface;
  const cardBorderColor = isDark ? '#27352E' : isSepia ? '#E8DDC9' : colors.borderLight;
  const textPrimaryColor = isDark ? '#F1F5F3' : isSepia ? '#2C2216' : colors.textPrimary;
  const textSecondaryColor = isDark ? '#9CA3AF' : '#4B5563';

  const keyExtractor = useCallback((item: HadithRecord) => item.id, []);

  // Render a Hadith in List View
  const renderHadithItem = useCallback(
    ({ item, index }: { item: HadithRecord; index: number }) => {
      const prevHadith = index > 0 ? displayedHadiths[index - 1] : null;
      const isNewSection =
        index === 0 ||
        String(item.reference.section_id || '') !== String(prevHadith?.reference.section_id || '');

      const isBooked = Boolean(bookmarkedMap[item.id]);

      return (
        <View style={styles.hadithWrapper}>
          {/* Section Divider (Zero Alteration principle) */}
          {isNewSection && (item.reference.section_title || item.reference.section_id != null) ? (() => {
            const { heading, hasCustomTitle, subNote } = formatSectionHeading({
              id: item.reference.section_id,
              title: item.reference.section_title,
              arabic_title: item.reference.section_arabic_title,
            });
            return (
              <View style={[styles.sectionDivider, isDark && styles.sectionDividerDark]}>
                <Text style={[styles.sectionDividerText, isDark && styles.sectionDividerTextDark]}>
                  {heading}
                </Text>
                {!hasCustomTitle && subNote ? (
                  <Text style={styles.blankSectionNote}>{subNote}</Text>
                ) : null}
                {item.reference.section_arabic_title ? (
                  <Text style={styles.sectionDividerArabic}>
                    {item.reference.section_arabic_title}
                  </Text>
                ) : null}
              </View>
            );
          })() : null}

          {/* Hadith Card */}
          <View
            style={[
              styles.hadithCard,
              { backgroundColor: cardBgColor, borderColor: cardBorderColor },
              highlightedHadithId === item.id && styles.hadithCardHighlighted,
            ]}
          >
            <HadithCardContent
              item={item}
              collectionName={collectionName}
              isBooked={isBooked}
              onToggleBookmark={() => handleToggleBookmark(item)}
              onShare={() => shareHadith(item, 'bn')}
              readerSettings={readerSettings}
              isDark={isDark}
              textPrimaryColor={textPrimaryColor}
            />
          </View>
        </View>
      );
    },
    [
      displayedHadiths,
      bookmarkedMap,
      isDark,
      cardBgColor,
      cardBorderColor,
      collectionName,
      readerSettings,
      textPrimaryColor,
    ]
  );

  // Render a Hadith in Slide View (1 hadith per horizontal slide)
  const renderSlideItem = useCallback(
    ({ item }: { item: HadithRecord }) => {
      const isBooked = Boolean(bookmarkedMap[item.id]);

      return (
        <View style={{ width: screenWidth, paddingHorizontal: 16 }}>
          <View
            style={[
              styles.hadithCard,
              { backgroundColor: cardBgColor, borderColor: cardBorderColor, minHeight: 400 },
            ]}
          >
            <HadithCardContent
              item={item}
              collectionName={collectionName}
              isBooked={isBooked}
              onToggleBookmark={() => handleToggleBookmark(item)}
              onShare={() => shareHadith(item, 'bn')}
              readerSettings={readerSettings}
              isDark={isDark}
              textPrimaryColor={textPrimaryColor}
              showSectionBreadcrumb={true}
            />
          </View>
        </View>
      );
    },
    [
      bookmarkedMap,
      screenWidth,
      cardBgColor,
      cardBorderColor,
      collectionName,
      readerSettings,
      isDark,
      textPrimaryColor,
    ]
  );

  const renderFooter = () => {
    if (displayedHadiths.length === 0 || readerSettings.readingMode === 'slide') return null;

    if (selectedSectionId != null) {
      return (
        <View style={styles.sectionFooterContainer}>
          <View style={styles.chapterSwitcherRow}>
            <TouchableOpacity
              style={[styles.switcherBtn, !hasPrevSection && styles.switcherBtnDisabled]}
              disabled={!hasPrevSection}
              accessibilityRole="button"
              accessibilityLabel="পূর্ববর্তী পরিচ্ছেদ"
              onPress={() => {
                if (hasPrevSection) {
                  setSelectedSectionId(chapterSections[currentSectionIndex - 1].id);
                  listRef.current?.scrollToOffset({ offset: 0, animated: false });
                }
              }}
            >
              <ChevronLeft size={18} color={hasPrevSection ? '#0E845A' : '#9CA3AF'} />
              <Text style={[styles.switcherBtnText, !hasPrevSection && styles.switcherBtnTextDisabled]}>
                পূর্ববর্তী পরিচ্ছেদ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switcherBtn, !hasNextSection && styles.switcherBtnDisabled]}
              disabled={!hasNextSection}
              accessibilityRole="button"
              accessibilityLabel="পরবর্তী পরিচ্ছেদ"
              onPress={() => {
                if (hasNextSection) {
                  setSelectedSectionId(chapterSections[currentSectionIndex + 1].id);
                  listRef.current?.scrollToOffset({ offset: 0, animated: false });
                }
              }}
            >
              <Text style={[styles.switcherBtnText, !hasNextSection && styles.switcherBtnTextDisabled]}>
                পরবর্তী পরিচ্ছেদ
              </Text>
              <ChevronRight size={18} color={hasNextSection ? '#0E845A' : '#9CA3AF'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.allSectionsFooterBtn, { borderColor: isDark ? '#27352E' : '#D1D5DB' }]}
            accessibilityRole="button"
            accessibilityLabel={`পুরো অধ্যায়ের সকল হাদিস দেখুন, মোট ${toBengaliNumerals(hadiths.length)}টি হাদিস`}
            onPress={() => {
              setSelectedSectionId(null);
              listRef.current?.scrollToOffset({ offset: 0, animated: false });
            }}
          >
            <Text style={[styles.allSectionsFooterText, { color: isDark ? '#6EE7B7' : '#0E845A' }]}>
              পুরো অধ্যায়ের সকল হাদিস দেখুন ({toBengaliNumerals(hadiths.length)}টি)
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.chapterSwitcherRow}>
        <TouchableOpacity
          style={[styles.switcherBtn, !hasPrevChapter && styles.switcherBtnDisabled]}
          disabled={!hasPrevChapter}
          accessibilityRole="button"
          accessibilityLabel="পূর্ববর্তী অধ্যায়"
          onPress={() => hasPrevChapter && goToChapter(chapters[currentChapterIndex - 1].id)}
        >
          <ChevronLeft size={18} color={hasPrevChapter ? '#0E845A' : '#9CA3AF'} />
          <Text style={[styles.switcherBtnText, !hasPrevChapter && styles.switcherBtnTextDisabled]}>
            পূর্ববর্তী অধ্যায়
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherBtn, !hasNextChapter && styles.switcherBtnDisabled]}
          disabled={!hasNextChapter}
          accessibilityRole="button"
          accessibilityLabel="পরবর্তী অধ্যায়"
          onPress={() => hasNextChapter && goToChapter(chapters[currentChapterIndex + 1].id)}
        >
          <Text style={[styles.switcherBtnText, !hasNextChapter && styles.switcherBtnTextDisabled]}>
            পরবর্তী অধ্যায়
          </Text>
          <ChevronRight size={18} color={hasNextChapter ? '#0E845A' : '#9CA3AF'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} animated={true} />
      <ScreenHeader
        title={currentChapterMeta ? currentChapterMeta.title : 'প্রামাণ্য হাদিস'}
        subtitle={collectionName}
        onBack={() => navigation.goBack()}
        variant="emerald"
        lang="bn"
        rightActions={
          <ReaderAppearanceButton
            onPress={() => setSettingsModalOpen(true)}
            isDark={isDark}
            lang="bn"
          />
        }
      />

      {/* Active Section Filter Bar */}
      {activeSectionMeta ? (
        <View
          style={[
            styles.activeSectionBanner,
            {
              backgroundColor: isDark ? '#192620' : '#ECFDF5',
              borderColor: isDark ? '#264234' : '#A7F3D0',
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={[styles.activeSectionTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}
              numberOfLines={2}
            >
              {activeSectionMeta.title}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.allSectionsPill}
            accessibilityRole="button"
            accessibilityLabel="সকল পরিচ্ছেদ দেখুন"
            onPress={() => setSelectedSectionId(null)}
          >
            <Text style={styles.allSectionsPillText}>সকল দেখুন</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Error Message */}
      {loadError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {/* Main Content */}
      <SafeContentArea>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
              হাদিস লোড হচ্ছে...
            </Text>
          </View>
        ) : readerSettings.readingMode === 'slide' ? (
          /* Slide Mode */
          <FlatList
            ref={listRef}
            data={displayedHadiths}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={keyExtractor}
            renderItem={renderSlideItem}
            contentContainerStyle={{ paddingVertical: space.md }}
          />
        ) : (
          /* List Mode */
          <FlatList
            ref={listRef}
            data={displayedHadiths}
            keyExtractor={keyExtractor}
            renderItem={renderHadithItem}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={info => {
              // Ensure items are laid out by jumping to approximate offset first, then performing precise scroll
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
        type="hadith"
        settings={readerSettings}
        onSettingsChange={handleSettingsChange}
        lang="bn"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  hadithWrapper: {
    marginBottom: 14,
  },
  sectionDivider: {
    backgroundColor: '#E8F5EE',
    borderLeftWidth: 4,
    borderLeftColor: '#0D5C3A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionDividerDark: {
    backgroundColor: '#1E2B25',
    borderLeftColor: '#10B981',
  },
  sectionDividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D5C3A',
    lineHeight: 20,
  },
  sectionDividerTextDark: {
    color: '#6EE7B7',
  },
  blankSectionNote: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
    marginBottom: 4,
  },
  sectionDividerArabic: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'left',
    marginTop: 4,
    fontFamily: 'Amiri',
  },
  hadithCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  hadithCardHighlighted: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  cardCollectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  hadithNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gradeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  gradeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  actionBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arabicBox: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  narratorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FBF7EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EAE1D2',
  },
  narratorBoxDark: {
    backgroundColor: '#231F17',
    borderColor: '#3D3425',
  },
  narratorIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  narratorText: {
    flex: 1,
    flexWrap: 'wrap',
    fontSize: 13,
    lineHeight: 20,
    color: '#92400E',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  narratorTextDark: {
    color: '#FCD34D',
  },
  translationBox: {
    marginBottom: 10,
  },
  translationText: {
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    margin: 14,
    borderRadius: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  slideSectionTitle: {
    fontSize: 12,
    color: '#0E845A',
    fontWeight: '600',
    marginBottom: 8,
  },
  chapterSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.min,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  switcherBtnDisabled: {
    opacity: 0.4,
  },
  switcherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E845A',
  },
  switcherBtnTextDisabled: {
    color: '#9CA3AF',
  },

  activeSectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  activeSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  allSectionsPill: {
    backgroundColor: '#0E845A',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  allSectionsPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionFooterContainer: {
    paddingBottom: 24,
  },
  allSectionsFooterBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    minHeight: touchTarget.min,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  allSectionsFooterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
