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
import { getCollectionChapters, ChapterMeta } from '../database/hadithRepository';
import { ChevronRight } from 'lucide-react-native';

interface HadithChapterScreenProps {
  route: any;
  navigation: any;
}

export const HadithChapterScreen: React.FC<HadithChapterScreenProps> = ({ route, navigation }) => {
  const { collectionKey = 'bukhari', collectionName = 'সহিহ বুখারী' } = route.params || {};

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalHadiths, setTotalHadiths] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const list = await getCollectionChapters(collectionKey);
        if (isMounted) {
          setChapters(list);
          const total = list.reduce((sum, c) => sum + (c.hadith_count || 0), 0);
          setTotalHadiths(total);
        }
      } catch (e) {
        console.warn('[HadithChapterScreen] error loading chapters:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [collectionKey]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        (c.arabic_title && c.arabic_title.includes(q)) ||
        (c.display_label && c.display_label.includes(q)) ||
        String(c.id).includes(q)
    );
  }, [chapters, searchQuery]);

  const chapterKeyExtractor = useCallback((item: ChapterMeta) => String(item.id), []);

  const renderChapterItem = useCallback(
    ({ item, index }: { item: ChapterMeta; index: number }) => {
      const displayNum = toBengaliNumerals(item.display_label || item.id || index + 1);

      return (
        <TouchableOpacity
          style={styles.chapterCard}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`অধ্যায় ${displayNum}: ${item.title}, হাদিস ${toBengaliNumerals(item.range)}`}
          onPress={() =>
            navigation.navigate('HadithSection', {
              collectionKey,
              collectionName,
              chapterId: item.id,
              chapterTitle: item.title,
            })
          }
        >
          {/* Scholarly Tabular Numeral Index */}
          <View style={styles.indexBox}>
            <Text style={styles.indexText}>{displayNum}</Text>
          </View>

          <View style={styles.chapterInfo}>
            <Text style={styles.chapterTitleBn} numberOfLines={2}>
              {item.title}
            </Text>
            {item.arabic_title ? (
              <Text style={styles.arabicTitle} numberOfLines={1}>
                {item.arabic_title}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.rangePill}>
                <Text style={styles.rangeText}>
                  হাদিস {toBengaliNumerals(item.range)}
                </Text>
              </View>
              <Text style={styles.hadithCountText}>
                {toBengaliNumerals(item.hadith_count || 0)}টি হাদিস
              </Text>
            </View>
          </View>

          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [collectionKey, collectionName, navigation]
  );

  const subtitleText = `${toBengaliNumerals(chapters.length)}টি অধ্যায় · ${toBengaliNumerals(totalHadiths)}টি হাদিস`;

  return (
    <ScreenContainer backgroundColor={colors.canvas} statusBarStyle="light-content" statusBarColor={colors.primaryDark}>
      <ScreenHeader
        title={collectionName}
        subtitle={subtitleText}
        onBack={() => navigation.goBack()}
        variant="emerald"
        lang="bn"
      />

      <SafeContentArea>
        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="অধ্যায়ের নাম বা নম্বর খুঁজুন..."
            accessibilityLabel="অধ্যায় অনুসন্ধান করুন"
            lang="bn"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>অধ্যায়সমূহ লোড হচ্ছে...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredChapters}
            keyExtractor={chapterKeyExtractor}
            renderItem={renderChapterItem}
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
                  <Text style={styles.emptyTitle}>কোনো অধ্যায় খুঁজে পাওয়া যায়নি</Text>
                  <Text style={styles.emptySubtitle}>
                    "{searchQuery}" দিয়ে কোনো অধ্যায় মেলেনি। সঠিক নাম বা নম্বর লিখে অনুসন্ধান করুন।
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
  searchBarWrapper: {
    paddingHorizontal: space.lg,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  chapterCard: {
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
  indexBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.md,
  },
  indexText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitleBn: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
    lineHeight: 20,
  },
  arabicTitle: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Amiri',
    marginBottom: 4,
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  rangePill: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  rangeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  hadithCountText: {
    fontSize: 11.5,
    color: colors.textMuted,
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
