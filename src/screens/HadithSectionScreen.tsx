import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { SearchField } from '../components/common/SearchField';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { getA11yLabel } from '../utils/a11yLabels';
import { getChapterSections, SectionMeta } from '../database/hadithRepository';
import { formatSectionHeading } from '../utils/sectionTitleFormatter';
import { ChevronRight, BookOpen } from 'lucide-react-native';

interface HadithSectionScreenProps {
  route: any;
  navigation: any;
}

export const HadithSectionScreen: React.FC<HadithSectionScreenProps> = ({ route, navigation }) => {
  const {
    collectionKey = 'bukhari',
    collectionName = 'সহিহ বুখারী',
    chapterId = 1,
    chapterTitle = 'অধ্যায়',
  } = route.params || {};

  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSections() {
      setIsLoading(true);
      try {
        const list = await getChapterSections(collectionKey, chapterId);
        if (isMounted) {
          setSections(list);
        }
      } catch (e) {
        console.warn('[HadithSectionScreen] error loading sections:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [collectionKey, chapterId]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        (s.arabic_title && s.arabic_title.includes(q)) ||
        (s.display_label && s.display_label.includes(q)) ||
        String(s.id).includes(q)
    );
  }, [sections, searchQuery]);

  const sectionKeyExtractor = useCallback((item: SectionMeta) => String(item.id), []);

  const renderSectionItem = useCallback(
    ({ item, index }: { item: SectionMeta; index: number }) => {
      const { heading, hasCustomTitle, subNote } = formatSectionHeading({
        id: item.id,
        display_label: item.display_label,
        title: item.title,
        arabic_title: item.arabic_title,
      });
      const displayNum = toBengaliNumerals(item.id || index + 1);

      return (
        <TouchableOpacity
          style={styles.sectionCard}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`পরিচ্ছেদ ${displayNum}: ${heading}`}
          onPress={() =>
            navigation.navigate('HadithDetail', {
              collectionKey,
              collectionName,
              chapterId,
              chapterTitle,
              targetSectionId: item.id,
            })
          }
        >
          {/* Scholarly Vertical Spine Marker */}
          <View style={styles.spineContainer} accessible={false} importantForAccessibility="no">
            <View style={styles.spineBadge}>
              <Text style={styles.spineText}>{displayNum}</Text>
            </View>
            <View style={styles.spineLine} />
          </View>

          <View style={styles.sectionInfo}>
            <Text style={styles.sectionTitle} numberOfLines={2}>
              {heading}
            </Text>

            {/* Blank Section Scholarly Explanatory Note (Zero Alteration) */}
            {!hasCustomTitle && subNote ? (
              <Text style={styles.blankSectionNote}>{subNote}</Text>
            ) : null}

            {item.arabic_title ? (
              <Text style={styles.sectionArabicTitle} numberOfLines={1}>
                {item.arabic_title}
              </Text>
            ) : null}
          </View>

          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [collectionKey, collectionName, chapterId, chapterTitle, navigation]
  );

  const breadcrumbText = `${collectionName} › অধ্যায় ${toBengaliNumerals(chapterId)}`;

  return (
    <ScreenContainer backgroundColor={colors.canvas} statusBarStyle="light-content" statusBarColor={colors.primaryDark}>
      <ScreenHeader
        title={chapterTitle}
        subtitle={breadcrumbText}
        onBack={() => navigation.goBack()}
        variant="emerald"
        lang="bn"
      />

      <SafeContentArea>
        {/* Full Chapter Direct Read Option */}
        <TouchableOpacity
          style={styles.readFullChapterBanner}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="এই অধ্যায়ের সকল হাদিস একসাথে পড়ুন"
          onPress={() =>
            navigation.navigate('HadithDetail', {
              collectionKey,
              collectionName,
              chapterId,
              chapterTitle,
            })
          }
        >
          <BookOpen size={17} color={colors.primaryDark} style={{ marginRight: space.sm }} />
          <Text style={styles.readFullChapterText}>এই অধ্যায়ের সকল হাদিস একসাথে পড়ুন</Text>
          <ChevronRight size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="পরিচ্ছেদের নাম বা বিষয় খুঁজুন..."
            accessibilityLabel="পরিচ্ছেদ অনুসন্ধান করুন"
            lang="bn"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>পরিচ্ছেদসমূহ লোড হচ্ছে...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSections}
            keyExtractor={sectionKeyExtractor}
            renderItem={renderSectionItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searchQuery.trim().length > 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>কোনো পরিচ্ছেদ খুঁজে পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubtitle}>
                    "{searchQuery}" দিয়ে কোনো পরিচ্ছেদ মেলেনি। সঠিক বিষয়ের নাম লিখে অনুসন্ধান করুন।
                  </Text>
                  <TouchableOpacity
                    style={styles.clearSearchBtn}
                    onPress={() => setSearchQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel={getA11yLabel('clearSearch', 'bn')}
                  >
                    <Text style={styles.clearSearchBtnText}>অনুসন্ধান মুছুন</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </SafeContentArea>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  readFullChapterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    backgroundColor: colors.primarySurface,
    marginHorizontal: space.lg,
    marginTop: space.md,
    marginBottom: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 56, 42, 0.12)',
  },
  readFullChapterText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  searchBarWrapper: {
    paddingHorizontal: space.lg,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  spineContainer: {
    alignItems: 'center',
    marginRight: space.md,
    width: 34,
  },
  spineBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  spineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 4,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  blankSectionNote: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  sectionArabicTitle: {
    fontSize: 13.5,
    color: colors.primary,
    fontFamily: 'Amiri',
    textAlign: 'left',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xxl,
  },
  loadingText: {
    marginTop: space.sm,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: space.lg,
  },
  clearSearchBtn: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 56, 42, 0.15)',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
