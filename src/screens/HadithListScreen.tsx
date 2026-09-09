import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { ScholarlyMonogram } from '../components/common/ScholarlyMonogram';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { SearchField } from '../components/common/SearchField';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { getA11yLabel } from '../utils/a11yLabels';
import { getHadithCollections, CollectionMeta } from '../database/hadithRepository';
import { BookOpen, AlertTriangle, ChevronRight } from 'lucide-react-native';

interface HadithListScreenProps {
  navigation: any;
  onOpenContent?: (contentId: string, contentType: 'quran' | 'hadith') => void;
}

// Scholarly Arabic monogram abbreviations
const MONOGRAM_MAP: Record<string, string> = {
  bukhari: 'بُ',
  muslim: 'مُ',
  nasai: 'ن',
  abudawud: 'د',
  'abu-dawud': 'د',
  tirmidhi: 'ت',
  ibnmajah: 'جه',
  'ibn-majah': 'جه',
  malik: 'مك',
  'muwatta-malik': 'مك',
  riyadussalihin: 'رض',
  'riyadus-salihin': 'رض',
  'bulugul-maram': 'بلغ',
  'luluwal-marjan': 'مر',
  'mishkatul-masabih': 'مش',
  '40-hadith': '৪০',
  'adabul-mufrad': 'أد',
  'sahih-hadise-qudsi': 'قد',
  '100-hadith': '১০০',
  'shamayele-tirmidhi': 'شم',
  'silsila-sahiha': 'صح',
  'targib-wattahrib': 'تر',
  'dhaif-hadis-sirij': 'ضع',
  'miskate-dhaif-hadis': 'ضع',
  'ramadaner-durbol-hadis': 'ضع',
};

// Warning/research compilations
const WARNING_COLLECTIONS = new Set([
  'dhaif-hadis-sirij',
  'miskate-dhaif-hadis',
  'ramadaner-durbol-hadis',
]);

export const HadithListScreen: React.FC<HadithListScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    getHadithCollections().then(cols => setCollections(cols));
  }, []);

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase().trim();
    return collections.filter(
      c =>
        c.name_bn.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.writer?.name_bn && c.writer.name_bn.toLowerCase().includes(q))
    );
  }, [collections, searchQuery]);

  const canonicalBooks = useMemo(
    () => filteredCollections.filter(c => !WARNING_COLLECTIONS.has(c.key)),
    [filteredCollections]
  );
  const warningBooks = useMemo(
    () => filteredCollections.filter(c => WARNING_COLLECTIONS.has(c.key)),
    [filteredCollections]
  );

  const renderBookItem = (item: CollectionMeta) => {
    const isWarning = WARNING_COLLECTIONS.has(item.key);
    const monogram = MONOGRAM_MAP[item.key] || item.name_bn.slice(0, 1);

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.bookCard, isWarning && styles.bookCardWarning]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name_bn}, ${item.writer?.name_bn || item.name}, ${toBengaliNumerals(item.total_records)} হাদিস`}
        onPress={() =>
          navigation.navigate('HadithChapter', {
            collectionKey: item.key,
            collectionName: item.name_bn,
          })
        }
      >
        <ScholarlyMonogram
          text={monogram}
          size={46}
          color={isWarning ? colors.gradeDaifBg : '#F4EFE6'}
          borderColor={isWarning ? colors.gradeDaif : colors.gold}
          textColor={isWarning ? colors.gradeDaif : colors.primaryDark}
          style={{ marginRight: space.md }}
        />

        <View style={styles.bookInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.bookTitleBn}>{item.name_bn}</Text>
            {isWarning ? (
              <View style={styles.warningPill}>
                <AlertTriangle size={11} color={colors.gradeDaif} style={{ marginRight: 3 }} />
                <Text style={styles.warningPillText}>সতর্কীকরণ সংকলন</Text>
              </View>
            ) : (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{toBengaliNumerals(item.total_records)} হাদিস</Text>
              </View>
            )}
          </View>

          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.writer?.name_bn || item.name}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {toBengaliNumerals(item.chapters_count || 0)} অধ্যায় · {toBengaliNumerals(item.sections_count || 0)} পরিচ্ছেদ
            </Text>
            {isWarning && (
              <Text style={styles.warningNote}>দুর্বল বর্ণনা চিহ্নিতকরণে</Text>
            )}
          </View>
        </View>

        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} animated={true} />
      <SafeContentArea>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + space.md }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Editorial Masthead */}
          <View style={styles.masthead}>
            <View style={styles.mastheadTop}>
              <BookOpen size={18} color={colors.goldDark} style={{ marginRight: space.xs }} />
              <Text style={styles.mastheadSuper}>হাদিস সংকলন</Text>
            </View>
            <Text style={styles.mastheadTitle}>প্রামাণ্য হাদিস পাঠাগার</Text>
            <Text style={styles.mastheadSubtitle}>
              ২৫টি নির্ভরযোগ্য গ্রন্থ · ৫২,৮৫৬টি বিশুদ্ধ বর্ণনা
            </Text>
          </View>

          {/* Daily Hadith Reflection Ribbon */}
          <View style={styles.dailyRibbon}>
            <Text style={styles.dailyRibbonQuote}>
              "নবী (ﷺ) বলেছেনঃ ঈমানের ষাটেরও অধিক শাখা আছে। আর লজ্জা হচ্ছে ঈমানের একটি শাখা।"
            </Text>
            <Text style={styles.dailyRibbonRef}>— সহিহ বুখারী, হাদিস ৯</Text>
          </View>

          {/* Search Bar */}
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="হাদিস গ্রন্থ বা সংকলকের নাম খুঁজুন..."
            accessibilityLabel="হাদিস গ্রন্থ অনুসন্ধান করুন"
            style={{ marginBottom: space.md }}
          />

          {filteredCollections.length === 0 && searchQuery.trim().length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>কোনো হাদিস গ্রন্থ খুঁজে পাওয়া যায়নি</Text>
              <Text style={styles.emptySubtitle}>
                "{searchQuery}" দিয়ে কোনো গ্রন্থ মেলেনি। সঠিক গ্রন্থের নাম বা সংকলক লিখে অনুসন্ধান করুন।
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
          ) : (
            <>
              {/* Primary Collections */}
              {canonicalBooks.length > 0 && (
                <>
                  <View style={styles.sectionHeadingRow}>
                    <Text style={styles.sectionHeading}>সিহাহ সিত্তাহ ও মূল গ্রন্থাবলী</Text>
                    <Text style={styles.sectionCount}>{toBengaliNumerals(canonicalBooks.length)}টি গ্রন্থ</Text>
                  </View>
                  {canonicalBooks.map(renderBookItem)}
                </>
              )}

              {/* Warning / Research Compilations */}
              {warningBooks.length > 0 && (
                <>
                  <View style={[styles.sectionHeadingRow, { marginTop: space.lg }]}>
                    <Text style={styles.sectionHeadingWarning}>তাহক্বীক্ব ও তাহযীর সংকলন (সতর্কতামূলক)</Text>
                    <Text style={styles.sectionCountWarning}>{toBengaliNumerals(warningBooks.length)}টি সংকলন</Text>
                  </View>
                  <Text style={styles.warningDisclaimer}>
                    গবেষণা ও অপ্রমাণিত বর্ণনা থেকে সতর্ক থাকার উদ্দেশ্যে সংকলিত
                  </Text>
                  {warningBooks.map(renderBookItem)}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeContentArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxxl,
  },
  masthead: {
    marginBottom: space.md,
  },
  mastheadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mastheadSuper: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDark,
    letterSpacing: 0.3,
  },
  mastheadTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  mastheadSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  dailyRibbon: {
    backgroundColor: colors.goldSurface,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
  },
  dailyRibbonQuote: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  dailyRibbonRef: {
    fontSize: 11.5,
    color: colors.goldDark,
    fontWeight: '700',
    marginTop: space.xs,
    textAlign: 'right',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sectionHeadingWarning: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gradeDaif,
  },
  sectionCountWarning: {
    fontSize: 12,
    color: colors.gradeDaif,
  },
  warningDisclaimer: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: space.sm,
  },
  bookCard: {
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
  bookCardWarning: {
    borderColor: colors.gradeDaifBorder,
    backgroundColor: '#FFFDFD',
  },
  bookInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bookTitleBn: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  countPillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gradeDaifBg,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  warningPillText: {
    fontSize: 10,
    color: colors.gradeDaif,
    fontWeight: '700',
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: space.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  warningNote: {
    fontSize: 10.5,
    color: colors.gradeDaif,
    fontStyle: 'italic',
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
