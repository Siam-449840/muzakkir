import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ScrollView,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { CuratedCandidateItem } from '../../types';
import { colors, space, radius, touchTarget } from '../../theme/tokens';
import { shadows } from '../../theme/shadows';
import { useResponsive } from '../../theme/useResponsive';
import { getA11yLabel } from '../../utils/a11yLabels';
import { BookOpen, Bookmark, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';

interface FloatingReminderProps {
  item: CuratedCandidateItem | null;
  visible: boolean;
  language?: string;
  onReadMore: (item: CuratedCandidateItem) => void;
  onBookmark: (item: CuratedCandidateItem) => void;
  onDismiss: () => void;
}

export const FloatingReminder: React.FC<FloatingReminderProps> = ({
  item,
  visible,
  language = 'bn',
  onReadMore,
  onBookmark,
  onDismiss,
}) => {
  const { floatingCardWidth, floatingCardMaxHeight, insets } = useResponsive();
  const [shouldRender, setShouldRender] = useState<boolean>(visible && Boolean(item));
  const [showFootnote, setShowFootnote] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    let isCancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reducedMotion => {
      if (isCancelled) return;
      if (visible && item) {
        setShowFootnote(false);
        setShouldRender(true);
        if (reducedMotion) {
          fadeAnim.setValue(1);
          translateYAnim.setValue(0);
        } else {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.spring(translateYAnim, {
              toValue: 0,
              friction: 8,
              tension: 50,
              useNativeDriver: true,
            }),
          ]).start();
        }
      } else {
        if (reducedMotion) {
          fadeAnim.setValue(0);
          translateYAnim.setValue(20);
          setShouldRender(false);
        } else {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 20,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) {
              setShouldRender(false);
            }
          });
        }
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [visible, item]);

  if (!shouldRender || !item) return null;

  const isQuran = item.content_type === 'quran';
  const fullText =
    item.translations?.[language] ||
    item.translations?.bn ||
    item.translations?.en ||
    item.translations?.ar ||
    '';

  let refTitle = '';
  if (isQuran) {
    const sName = (item.reference.surah_name as string) || `সূরা ${item.reference.surah_number}`;
    const aStart = item.reference.ayah_start || item.reference.ayah_number;
    const aEnd = item.reference.ayah_end || item.reference.ayah_number;
    const ayahRange = aEnd && aEnd !== aStart ? `${aStart}–${aEnd}` : `${aStart}`;
    refTitle = `${sName} (${item.reference.surah_number}:${ayahRange})`;
  } else {
    const coll = item.reference.collection as string | undefined;
    if (coll && (coll.includes('হাদিস নং') || coll.includes('#'))) {
      refTitle = coll;
    } else if (coll) {
      refTitle = `${coll} #${item.reference.hadith_number || ''}`;
    } else {
      refTitle = `হাদিস #${item.reference.hadith_number || ''}`;
    }
  }

  const categoryLabel = item.topic || item.reference?.emotive_category || 'দৈনিক স্মরণ';
  const reflectionText = item.reference?.practical_reflection || item.reference?.muslim_takeaway;
  const gradeLabel = item.reference.grade_bn || item.reference.grade;
  const chapterSection = [item.reference.chapter_title, item.reference.section_title].filter(Boolean).join(' • ');
  const narrator = item.reference.narrator;
  const footnote = item.reference.note;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Semi-transparent Backdrop with touch-to-dismiss */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityLabel={getA11yLabel('close', language)}
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Centered Responsive Container */}
      <View
        style={[
          styles.centerWrapper,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            paddingBottom: Math.max(insets.bottom + 12, 24),
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.floatingContainer,
            shadows.cardHigh,
            {
              width: floatingCardWidth,
              maxHeight: floatingCardMaxHeight,
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          {/* Top Gold Ornament Bar */}
          <View style={styles.topBar} />

          {/* 1. Anchored Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.typeBadgeRow}>
              <View style={[styles.typeBadge, isQuran ? styles.quranBadge : styles.hadithBadge]}>
                <Text style={[styles.typeBadgeText, isQuran ? styles.quranBadgeText : styles.hadithBadgeText]}>
                  {isQuran ? 'কুরআনুল কারীম' : 'সহিহ হাদিস'}
                </Text>
              </View>
              {gradeLabel ? (
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>{gradeLabel}</Text>
                </View>
              ) : null}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText} numberOfLines={1}>{categoryLabel}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
              accessibilityLabel={getA11yLabel('close', language)}
              accessibilityRole="button"
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Reference Subtitle */}
          <Text style={styles.refText} numberOfLines={1}>{refTitle}</Text>

          {/* 2. Scrollable Middle Content (Shrinkwraps or Scrolls smoothly) */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollInner}
            nestedScrollEnabled={true}
          >
            {/* Chapter & Section hierarchy */}
            {chapterSection ? (
              <Text style={styles.chapterSectionText}>
                {chapterSection}
              </Text>
            ) : null}

            {/* Narrator */}
            {narrator ? (
              <Text style={styles.narratorText}>
                {narrator} থেকে বর্ণিত:
              </Text>
            ) : null}

            {/* Arabic text (Complete matn, no truncation) */}
            {item.translations?.ar ? (
              <Text style={styles.arabicSnippet} selectable>
                {item.translations.ar}
              </Text>
            ) : null}

            {/* Translation text (Complete, no clipping) */}
            <Text style={styles.excerptText} selectable>
              "{fullText}"
            </Text>

            {/* Footnote / Commentary (Expandable, never silently omitted) */}
            {footnote ? (
              <View style={styles.footnoteContainer}>
                <TouchableOpacity
                  onPress={() => setShowFootnote(prev => !prev)}
                  style={styles.footnoteHeader}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="ব্যাখ্যা ও টীকা"
                >
                  <Text style={styles.footnoteHeaderTitle}>
                    {showFootnote ? '📖 টীকা ও ব্যাখ্যা (সংক্ষেপ করুন)' : '📖 প্রাসঙ্গিক টীকা ও ব্যাখ্যা (দেখুন)'}
                  </Text>
                  {showFootnote ? (
                    <ChevronUp size={14} color={colors.primaryDark} />
                  ) : (
                    <ChevronDown size={14} color={colors.primaryDark} />
                  )}
                </TouchableOpacity>
                {showFootnote ? (
                  <Text style={styles.footnoteBodyText} selectable>
                    {footnote}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Reflection box (if present) */}
            {reflectionText ? (
              <View style={styles.reflectionBox}>
                <Sparkles size={13} color={colors.goldDark} style={{ marginRight: 6, marginTop: 2 }} />
                <Text style={styles.reflectionText}>
                  {reflectionText}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* 3. Anchored Bottom Action Bar */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.dismissBtn}
              accessibilityRole="button"
              accessibilityLabel={getA11yLabel('close', language)}
            >
              <Text style={styles.dismissBtnText}>বন্ধ করুন</Text>
            </TouchableOpacity>

            <View style={styles.primaryActionGroup}>
              <TouchableOpacity
                onPress={() => onBookmark(item)}
                style={styles.bookmarkBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={getA11yLabel('bookmark', language)}
              >
                <Bookmark size={18} color={colors.primaryDark} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onReadMore(item)}
                style={styles.readMoreBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="বিস্তারিত পড়ুন"
              >
                <BookOpen size={15} color="#FAF7F2" style={{ marginRight: 6 }} />
                <Text style={styles.readMoreBtnText}>পড়ুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 38, 28, 0.42)',
    zIndex: 9998,
  },
  centerWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  floatingContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1.2,
    borderColor: colors.goldBorder,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    backgroundColor: colors.gold,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
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
    color: colors.goldDark,
  },
  gradeBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldDark,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: 120,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  closeBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  chapterSectionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  narratorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.goldDark,
    marginBottom: 6,
  },
  scrollContent: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 10,
  },
  scrollInner: {
    paddingVertical: 4,
  },
  arabicSnippet: {
    fontSize: 20,
    lineHeight: 38,
    color: colors.primaryDark,
    textAlign: 'right',
    fontFamily: Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
    fontWeight: '600',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  excerptText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    fontStyle: 'normal',
    marginBottom: 8,
  },
  footnoteContainer: {
    backgroundColor: 'rgba(245, 240, 230, 0.65)',
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  footnoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footnoteHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  footnoteBodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  reflectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.goldSurface,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  reflectionText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.goldDark,
    flex: 1,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    marginTop: 2,
  },
  dismissBtn: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookmarkBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readMoreBtn: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  readMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF7F2',
  },
});
