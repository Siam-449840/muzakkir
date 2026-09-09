import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { AyaMarker } from '../components/common/AyaMarker';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { SearchField } from '../components/common/SearchField';
import { useResponsive } from '../theme/useResponsive';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { getA11yLabel } from '../utils/a11yLabels';
import { getSurahsList, SurahMeta } from '../database/quranRepository';
import { loadUserSettings } from '../database/db';
import { generateDailySchedule } from '../services/contentEngine';
import { ChevronRight, BookOpen, Sparkles } from 'lucide-react-native';
import { UserSettings, CuratedCandidateItem } from '../types';

interface QuranListScreenProps {
  navigation: any;
  onOpenContent?: (contentId: string, contentType: 'quran' | 'hadith') => void;
}

export const QuranListScreen: React.FC<QuranListScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isExpanded } = useResponsive();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [todayQuranItem, setTodayQuranItem] = useState<CuratedCandidateItem | null>(null);

  useEffect(() => {
    getSurahsList().then(list => setSurahs(list));
    loadTodayReminder();
  }, []);

  const loadTodayReminder = async () => {
    try {
      const settings: UserSettings = await loadUserSettings();
      const schedule = await generateDailySchedule(settings);
      const quranSlot = schedule.slots.find(s => s.content_type === 'quran' && s.item);
      if (quranSlot?.item) {
        setTodayQuranItem(quranSlot.item);
      }
    } catch (e) {
      // non-fatal
    }
  };

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const q = searchQuery.toLowerCase().trim();
    return surahs.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.name_translation.toLowerCase().includes(q) ||
        s.name_ar.includes(q) ||
        String(s.number) === q
    );
  }, [surahs, searchQuery]);

  const handleReminderReflect = () => {
    if (!todayQuranItem) return;
    const ref = todayQuranItem.reference as any;
    let surahNum = ref?.surah_number;
    if (!surahNum || isNaN(surahNum)) {
      const parts = todayQuranItem.content_id.split('_');
      surahNum = parts.length >= 3 ? parseInt(parts[1], 10) : 1;
    }
    if (isNaN(surahNum) || !surahNum) surahNum = 1;
    const surahMeta = surahs.find(s => s.number === surahNum);
    navigation.navigate('QuranDetail', {
      surahNumber: surahNum,
      surahName: surahMeta?.name || `Surah ${surahNum}`,
      targetVerseId: todayQuranItem.content_id,
      targetAyahNumber: ref?.ayah_start || ref?.ayah_number || 1,
      targetAyahEnd: ref?.ayah_end || ref?.ayah_number || 1,
    });
  };

  const renderHeader = () => {
    const ref = todayQuranItem?.reference as any;
    const translationText =
      todayQuranItem?.translations?.bn ||
      todayQuranItem?.translations?.en ||
      '';
    const arabicText = todayQuranItem?.translations?.ar || '';

    return (
      <View style={styles.headerContainer}>
        {/* Top Serene Banner with Dark Emerald Background */}
        <View style={[styles.heroBanner, { paddingTop: insets.top + space.md }]}>
          <View style={styles.topNavRow}>
            <View style={styles.navTitleGroup}>
              <BookOpen size={20} color={colors.goldDark} style={{ marginRight: space.sm }} />
              <Text style={styles.heroSuperTitle}>আল কুরআনুল কারীম</Text>
            </View>
            <View style={styles.surahTotalBadge}>
              <Text style={styles.surahTotalText}>১১৪টি সূরা</Text>
            </View>
          </View>

          {/* Daily Quran Card */}
          {todayQuranItem ? (
            <TouchableOpacity
              style={styles.dailyCard}
              activeOpacity={0.8}
              onPress={handleReminderReflect}
            >
              <View style={styles.dailyCardHeader}>
                <Sparkles size={14} color={colors.goldLight} style={{ marginRight: space.xs }} />
                <Text style={styles.dailyCardTitle}>আজকের আয়াত</Text>
                <Text style={styles.dailyCardRef}>
                  {ref?.surah_name} · {toBengaliNumerals(ref?.surah_number)}:{toBengaliNumerals(ref?.ayah_number)}
                </Text>
              </View>

              {arabicText ? (
                <Text style={styles.dailyArabic} numberOfLines={2}>
                  {arabicText}
                </Text>
              ) : null}

              <Text style={styles.dailyTranslation} numberOfLines={3}>
                "{translationText}"
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrapper}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="সূরার নাম, অর্থ বা নম্বর খুঁজুন..."
            accessibilityLabel="সূরা অনুসন্ধান করুন"
          />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>সকল সূরা (১১৪টি)</Text>
        </View>
      </View>
    );
  };

  const surahKeyExtractor = useCallback((item: SurahMeta) => String(item.number), []);

  const renderSurahItem = useCallback(
    ({ item }: { item: SurahMeta }) => {
      const revLabel = item.revelation_type === 'Meccan' ? 'মাক্কী' : 'মাদানী';

      return (
        <TouchableOpacity
          style={styles.surahCard}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`সূরা ${item.name}, ${item.name_translation}, ${toBengaliNumerals(item.total_ayahs)} আয়াত`}
          onPress={() =>
            navigation.navigate('QuranDetail', {
              surahNumber: item.number,
              surahName: item.name,
            })
          }
        >
          {/* Traditional Islamic Aya Marker for Surah Number */}
          <AyaMarker
            number={item.number}
            size={38}
            color="#F4EFE6"
            borderColor={colors.gold}
            textColor={colors.primaryDark}
            style={{ marginRight: space.md }}
          />

          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text style={styles.surahName}>{item.name}</Text>
              <Text style={styles.arabicName}>{item.name_ar}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.translationName}>{item.name_translation}</Text>
              <Text style={styles.dotSeparator}>·</Text>
              <Text style={styles.ayahCount}>{toBengaliNumerals(item.total_ayahs)}টি আয়াত</Text>
              <Text style={styles.dotSeparator}>·</Text>
              <View style={styles.revBadge}>
                <Text style={styles.revText}>{revLabel}</Text>
              </View>
            </View>
          </View>

          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} animated={true} />
      <SafeContentArea>
        <FlatList
          data={filteredSurahs}
          keyExtractor={surahKeyExtractor}
          renderItem={renderSurahItem}
          ListHeaderComponent={renderHeader}
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
                <Text style={styles.emptyTitle}>কোনো সূরা খুঁজে পাওয়া যায়নি</Text>
                <Text style={styles.emptySubtitle}>
                  "{searchQuery}" দিয়ে কোনো সূরা মেলেনি। সঠিক নাম বা নম্বর লিখে অনুসন্ধান করুন।
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
      </SafeContentArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingBottom: space.xxl,
  },
  headerContainer: {
    marginBottom: space.sm,
  },
  heroBanner: {
    backgroundColor: colors.primaryDark,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  navTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSuperTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FAF7F2',
    letterSpacing: 0.3,
  },
  surahTotalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  surahTotalText: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '700',
  },
  dailyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  dailyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  dailyCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldLight,
    flex: 1,
  },
  dailyCardRef: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  dailyArabic: {
    fontSize: 16,
    color: '#FAF7F2',
    textAlign: 'right',
    fontFamily: 'Amiri',
    lineHeight: 26,
    marginBottom: space.xs,
  },
  dailyTranslation: {
    fontSize: 13,
    color: '#FAF7F2',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  searchBarWrapper: {
    paddingHorizontal: space.lg,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  sectionHeaderRow: {
    paddingHorizontal: space.lg,
    marginTop: space.xs,
    marginBottom: space.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  surahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    backgroundColor: colors.surface,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  surahName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  arabicName: {
    fontSize: 17,
    color: colors.primaryDark,
    fontFamily: 'Amiri',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  translationName: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dotSeparator: {
    color: '#D1D5DB',
  },
  ayahCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  revBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  revText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space.md,
  },
  clearSearchBtn: {
    backgroundColor: colors.primarySurface,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(20, 56, 42, 0.15)',
  },
  clearSearchBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
