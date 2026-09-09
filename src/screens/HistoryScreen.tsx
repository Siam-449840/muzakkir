import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { ReminderHistoryItem } from '../types';
import { loadHistory, staticData, getQuranDailyPool } from '../database/db';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { CheckCircle2, Sparkles, Calendar, BookOpen, ScrollText } from 'lucide-react-native';

/**
 * Converts a raw content_id into a human-readable display label.
 */
function formatContentLabel(contentId: string, contentType: 'quran' | 'hadith'): string {
  try {
    if (contentType === 'quran') {
      if (contentId.startsWith('quran_qr_')) {
        const pool = getQuranDailyPool();
        const found = pool?.items?.find((item: any) => item.content_id === contentId);
        if (found?.reference) {
          const ref = found.reference as any;
          const surahInfo = staticData.surahs.find((s: any) => s.number === ref.surah_number);
          const surahName = surahInfo?.name || ref.surah_name || `সূরা ${ref.surah_number}`;
          const start = toBengaliNumerals(ref.ayah_start);
          const end = toBengaliNumerals(ref.ayah_end);
          const ayahText = ref.ayah_start === ref.ayah_end
            ? `আয়াত ${start}`
            : `আয়াত ${start}–${end}`;
          return `${surahName} — ${ayahText}`;
        }
      }
      const parts = contentId.split('_');
      if (parts.length >= 3) {
        const surahNum = parseInt(parts[1], 10);
        const ayahNum = parseInt(parts[2], 10);
        if (!isNaN(surahNum) && !isNaN(ayahNum)) {
          const surahInfo = staticData.surahs.find((s: any) => s.number === surahNum);
          const surahName = surahInfo?.name || `সূরা ${toBengaliNumerals(surahNum)}`;
          return `${surahName} — আয়াত ${toBengaliNumerals(ayahNum)}`;
        }
      }
    }
    if (contentType === 'hadith') {
      const parts = contentId.split('_');
      if (parts.length >= 3) {
        const collKey = parts[1];
        const hadithNum = parts[2];
        const collInfo = staticData.collections.find((c: any) => c.key === collKey);
        const collName = collInfo?.name_bn || collInfo?.name || collKey.charAt(0).toUpperCase() + collKey.slice(1);
        return `${collName} — হাদিস #${toBengaliNumerals(hadithNum)}`;
      }
    }
  } catch {
    // Fall back to raw ID
  }
  return contentId;
}

interface HistoryScreenProps {
  navigation: any;
  onOpenContent: (contentId: string, contentType: 'quran' | 'hadith') => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation, onOpenContent }) => {
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory().then((list: ReminderHistoryItem[]) => setHistory(list));
    });
    loadHistory().then((list: ReminderHistoryItem[]) => setHistory(list));
    return unsubscribe;
  }, [navigation]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayItems = history.filter(h => h.scheduled_time.startsWith(todayStr));
  const reflectedCount = history.filter(h => h.status === 'reflected' || h.reflected_time).length;

  const renderHistoryItem = ({ item }: { item: ReminderHistoryItem }) => {
    const isQuran = item.content_type === 'quran';
    const dateObj = new Date(item.scheduled_time);
    const rawTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeFormatted = toBengaliNumerals(rawTime);
    const dateFormatted = dateObj.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });

    return (
      <Pressable
        onPress={() => onOpenContent(item.content_id, item.content_type)}
        style={[styles.historyCard, shadows.cardLow]}
        accessibilityLabel={`খুলুন ${formatContentLabel(item.content_id, item.content_type)}`}
        accessibilityRole="button"
      >
        <View style={styles.cardLeftCol}>
          <View style={styles.badgeTimeRow}>
            <View style={[styles.typeBadge, isQuran ? styles.quranBadge : styles.hadithBadge]}>
              {isQuran ? (
                <BookOpen size={11} color={colors.primaryDark} style={{ marginRight: 3 }} />
              ) : (
                <ScrollText size={11} color={colors.secondary} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.typeBadgeText, isQuran ? styles.quranBadgeText : styles.hadithBadgeText]}>
                {isQuran ? 'কুরআন' : 'হাদিস'}
              </Text>
            </View>
            <Text style={styles.historyTime}>{timeFormatted} • {dateFormatted}</Text>
          </View>

          <Text style={styles.contentRefText} numberOfLines={2}>
            {formatContentLabel(item.content_id, item.content_type)}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <CheckCircle2 size={13} color={colors.primaryDark} style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>{item.status === 'reflected' ? 'পঠিত' : 'প্রেরিত'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer statusBarStyle="dark-content">
      <ScreenHeader
        title="রিমাইন্ডারের ইতিহাস"
        subtitle={`${toBengaliNumerals(history.length)}টি প্রেরিত রিমাইন্ডার`}
        onBack={() => navigation.goBack()}
        lang="bn"
      />

      <SafeContentArea style={styles.container}>
        {/* Stats Summary Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statsCard, styles.statsCardGold]}>
            <View style={styles.statIconRow}>
              <Sparkles size={18} color={colors.goldDark} />
              <Text style={styles.statNumber}>{toBengaliNumerals(todayItems.length)}</Text>
            </View>
            <Text style={styles.statLabel}>আজকের রিমাইন্ডার</Text>
            <Text style={styles.statSub}>নির্ধারিত স্মরণ সময়</Text>
          </View>

          <View style={[styles.statsCard, styles.statsCardEmerald]}>
            <View style={styles.statIconRow}>
              <CheckCircle2 size={18} color={colors.primaryDark} />
              <Text style={styles.statNumber}>{toBengaliNumerals(reflectedCount)}</Text>
            </View>
            <Text style={styles.statLabel}>অনুধ্যান সম্পন্ন</Text>
            <Text style={styles.statSub}>হৃদয়ঙ্গমকৃত মুহূর্ত</Text>
          </View>
        </View>

        {/* Philosophy Banner */}
        <View style={styles.philosophyBanner}>
          <Text style={styles.philosophyQuote}>
            "নিশ্চয়ই আল্লাহর স্মরণে হৃদয়সমূহ প্রশান্ত হয়।" (সূরা আর-রাদ ১৩:২৮)
          </Text>
        </View>

        {/* History Log */}
        <FlatList
          data={history}
          keyExtractor={(item, idx) => `${item.content_id}_${idx}`}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Calendar size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>আপনার যাত্রা আজ শুরু হচ্ছে</Text>
              <Text style={styles.emptySubtitle}>
                নির্ধারিত রিমাইন্ডার সময় হলে এবং আপনি তা খুললে, আপনার আধ্যাত্মিক স্মরণের ধারাবাহিক ইতিহাস এখানে যুক্ত হবে।
              </Text>
            </View>
          }
        />
      </SafeContentArea>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    gap: space.sm,
  },
  statsCard: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statsCardGold: {
    backgroundColor: colors.card,
    borderColor: colors.goldBorder,
  },
  statsCardEmerald: {
    backgroundColor: colors.card,
    borderColor: colors.borderLight,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  philosophyBanner: {
    backgroundColor: colors.goldSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    marginHorizontal: space.md,
    marginVertical: space.sm,
    padding: space.sm,
    alignItems: 'center',
  },
  philosophyQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.goldDark,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: space.md,
    paddingBottom: space.xxl,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.md,
    minHeight: touchTarget.min,
    marginBottom: space.sm,
  },
  cardLeftCol: {
    flex: 1,
    marginRight: space.sm,
  },
  badgeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: 8,
  },
  quranBadge: {
    backgroundColor: colors.badgeQuranBg,
    borderColor: colors.badgeQuranBorder,
    borderWidth: 1,
  },
  hadithBadge: {
    backgroundColor: colors.badgeHadithBg,
    borderColor: colors.badgeHadithBorder,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quranBadgeText: {
    color: colors.primaryDark,
  },
  hadithBadgeText: {
    color: colors.secondary,
  },
  historyTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  contentRefText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyContainer: {
    paddingVertical: space.xxxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
