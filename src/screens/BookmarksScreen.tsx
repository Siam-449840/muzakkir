import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Alert } from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { Bookmark } from '../types';
import { loadBookmarks, removeBookmark } from '../database/db';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { Bookmark as BookmarkIcon, Trash2, ChevronRight, BookOpen, ScrollText } from 'lucide-react-native';

interface BookmarksScreenProps {
  navigation: any;
  onOpenContent: (contentId: string, contentType: 'quran' | 'hadith') => void;
}

export const BookmarksScreen: React.FC<BookmarksScreenProps> = ({ navigation, onOpenContent }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'quran' | 'hadith'>('all');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadBookmarks().then((list: Bookmark[]) => setBookmarks(list));
    });
    loadBookmarks().then((list: Bookmark[]) => setBookmarks(list));
    return unsubscribe;
  }, [navigation]);

  const handleRemove = (contentId: string) => {
    Alert.alert(
      'বুকমার্ক মুছবেন?',
      'এই সংরক্ষিত বিষয়টি তালিকা থেকে সরিয়ে ফেলা হবে।',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            await removeBookmark(contentId);
            setBookmarks(prev => prev.filter(b => b.content_id !== contentId));
          },
        },
      ]
    );
  };

  const filteredBookmarks = bookmarks.filter(b => {
    if (activeFilter === 'all') return true;
    return b.content_type === activeFilter;
  });

  const renderBookmarkItem = ({ item }: { item: Bookmark }) => {
    const isQuran = item.content_type === 'quran';

    return (
      <Pressable
        onPress={() => onOpenContent(item.content_id, item.content_type)}
        style={[styles.bookmarkCard, shadows.cardLow]}
        accessibilityRole="button"
        accessibilityLabel={`খুলুন ${item.reference_text}`}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, isQuran ? styles.quranBadge : styles.hadithBadge]}>
              {isQuran ? (
                <BookOpen size={12} color={colors.primaryDark} style={{ marginRight: 4 }} />
              ) : (
                <ScrollText size={12} color={colors.secondary} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.typeBadgeText, isQuran ? styles.quranBadgeText : styles.hadithBadgeText]}>
                {isQuran ? 'কুরআন' : 'হাদিস'}
              </Text>
            </View>
            <Text style={styles.refText} numberOfLines={1}>{item.reference_text}</Text>
          </View>

          <TouchableOpacity
            onPress={() => handleRemove(item.content_id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="বুকমার্ক মুছুন"
          >
            <Trash2 size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.excerptText} numberOfLines={3}>
          "{item.excerpt}"
        </Text>

        <View style={styles.cardBottomRow}>
          <Text style={styles.savedDate}>
            সংরক্ষিত: {new Date(item.created_at).toLocaleDateString('bn-BD')}
          </Text>
          <View style={styles.readMorePill}>
            <Text style={styles.readMoreText}>পড়ুন</Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer statusBarStyle="dark-content">
      <ScreenHeader
        title="সংরক্ষিত আয়াত ও হাদিস"
        subtitle={`${toBengaliNumerals(bookmarks.length)}টি সংরক্ষিত বিষয়বস্তু`}
        onBack={() => navigation.goBack()}
        lang="bn"
      />

      <SafeContentArea style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          {(['all', 'quran', 'hadith'] as const).map(tab => {
            const isSelected = activeFilter === tab;
            const label = tab === 'all' ? 'সকল' : tab === 'quran' ? 'কুরআন' : 'হাদিস';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterTabPill,
                  isSelected ? styles.filterTabActive : styles.filterTabInactive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bookmarks List */}
        <FlatList
          data={filteredBookmarks}
          keyExtractor={item => item.content_id}
          renderItem={renderBookmarkItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <BookmarkIcon size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>কোনো সংরক্ষিত বিষয় নেই</Text>
              <Text style={styles.emptySubtitle}>
                দৈনিক রিমাইন্ডার, কুরআন তিলাওয়াত বা হাদিস পাঠের সময় বুকমার্ক আইকনে চাপ দিলে তা এখানে সংরক্ষিত থাকবে।
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
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterTabPill: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: space.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterTabInactive: {
    backgroundColor: colors.card,
    borderColor: colors.borderLight,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FAF7F2',
    fontWeight: '700',
  },
  listContent: {
    padding: space.md,
    paddingBottom: space.xxl,
  },
  bookmarkCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: space.xs,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
    fontWeight: '700',
  },
  quranBadgeText: {
    color: colors.primaryDark,
  },
  hadithBadgeText: {
    color: colors.secondary,
  },
  refText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  excerptText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: space.sm,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: space.xs,
  },
  savedDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  readMorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: space.xxxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
