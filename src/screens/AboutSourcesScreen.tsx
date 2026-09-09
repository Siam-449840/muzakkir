import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { staticData } from '../database/db';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { ShieldCheck, BookOpen, ExternalLink, ScrollText } from 'lucide-react-native';

interface AboutSourcesScreenProps {
  navigation?: any;
}

export const AboutSourcesScreen: React.FC<AboutSourcesScreenProps> = ({ navigation }) => {
  const sources = staticData.registries.sources || [];
  const translations = staticData.registries.translations || [];

  const handleOpenLink = (url?: string) => {
    if (url && url.startsWith('http')) {
      Linking.openURL(url).catch(err => console.warn('Cannot open url:', err));
    }
  };

  return (
    <ScreenContainer statusBarStyle="dark-content">
      <ScreenHeader
        title="উৎস ও নির্ভরযোগ্যতা"
        subtitle="স্বচ্ছ তথ্য-উৎস, সত্যায়ন ও নির্ভরযোগ্যতা নীতি"
        onBack={navigation ? () => navigation.goBack() : undefined}
        lang="bn"
      />

      <SafeContentArea style={styles.container}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Core Trust & Integrity Statement */}
          <View style={[styles.statementCard, shadows.cardLow]}>
            <View style={styles.statementHeader}>
              <ShieldCheck size={22} color={colors.goldDark} style={{ marginRight: 8 }} />
              <Text style={styles.statementTitle}>উৎস সত্যায়ন ও নির্ভরযোগ্যতা নীতি</Text>
            </View>
            <Text style={styles.statementBody}>
              এই অ্যাপ্লিকেশনে ব্যবহৃত প্রতিটি আয়াত ও হাদিসের টেক্সট আন্তর্জাতিকভাবে স্বীকৃত এবং উন্মুক্ত ইসলামী ডাটাবেস (যেমন Tanzil, King Fahd Complex, iHadis) এর সাথে প্রতিটি অক্ষর মিলিয়ে ফরেনসিক্যালি যাচাই করা হয়েছে।
            </Text>
            <Text style={[styles.statementBody, { marginTop: 8 }]}>
              হাদিসের ক্ষেত্রে কোনো কৃত্রিম বুদ্ধিমত্তা (AI) দ্বারা টেক্সট তৈরি বা পরিবর্তন করা হয় না। প্রতিটি হাদিসের মান (সহিহ, হাসান ইত্যাদি) মূল গ্রন্থে উল্লেখিত সম্মানিত মুহাদ্দিস ও গবেষকগণের যাচাইকৃত বিবরণ অনুযায়ী অবিকল সংরক্ষিত।
            </Text>
            <View style={styles.highlightNotice}>
              <Text style={styles.highlightText}>
                অত্র অ্যাপ্লিকেশনের সমস্ত বিষয়বস্তু সম্পূর্ণ অফলাইনে সংরক্ষিত থাকে এবং কোনো ব্যক্তিগত তথ্য সংগ্রহ বা প্রেরণ করা হয় না।
              </Text>
            </View>
          </View>

          {/* Upstream Sources */}
          <Text style={styles.sectionHeading}>মূল ডাটাবেস উৎসসমূহ</Text>
          {sources.map((src: any) => (
            <View key={src.source_id} style={[styles.itemCard, shadows.cardLow]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{src.title}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>যাচাইকৃত</Text>
                </View>
              </View>
              <Text style={styles.authorLine}>সংকলক / উৎস: {src.author}</Text>
              {src.organization ? <Text style={styles.orgLine}>কর্তৃপক্ষ: {src.organization}</Text> : null}
              <Text style={styles.notesLine}>{src.verification_notes}</Text>
              {src.url && (
                <Pressable
                  onPress={() => handleOpenLink(src.url)}
                  style={styles.linkRow}
                  accessibilityRole="link"
                  accessibilityLabel={`ওয়েবসাইট ব্রাউজ করুন ${src.url}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.linkText}>{src.url}</Text>
                  <ExternalLink size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                </Pressable>
              )}
            </View>
          ))}

          {/* Translation Registry & Translators */}
          <Text style={styles.sectionHeading}>অনুবাদ ও সংস্করণসমূহ</Text>
          <View style={[styles.tableCard, shadows.cardLow]}>
            {translations.map((t: any, idx: number) => (
              <View key={t.translation_id} style={[styles.transRow, idx > 0 && styles.transRowBorder]}>
                <View style={styles.transLeft}>
                  <Text style={styles.transLang}>
                    {t.language} ({t.language_code.toUpperCase()})
                  </Text>
                  <Text style={styles.transTranslator}>
                    {t.translator || t.title}
                  </Text>
                </View>
                <View style={[styles.typeBadgePill, t.content_type === 'quran' ? styles.quranPill : styles.hadithPill]}>
                  {t.content_type === 'quran' ? (
                    <BookOpen size={10} color={colors.primaryDark} style={{ marginRight: 3 }} />
                  ) : (
                    <ScrollText size={10} color={colors.secondary} style={{ marginRight: 3 }} />
                  )}
                  <Text style={[styles.typeBadgePillText, t.content_type === 'quran' ? styles.quranPillText : styles.hadithPillText]}>
                    {t.content_type === 'quran' ? 'কুরআন' : 'হাদিস'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* HadeethEnc Multilingual Hadith Source */}
          <Text style={styles.sectionHeading}>আন্তর্জাতিক হাদিস অনুবাদ উৎস</Text>
          <View style={[styles.itemCard, styles.goldItemCard, shadows.cardLow]}>
            <View style={styles.itemHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookOpen size={18} color={colors.goldDark} style={{ marginRight: 8 }} />
                <Text style={styles.itemTitle}>HadeethEnc.com</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>১০টি ভাষা</Text>
              </View>
            </View>
            <Text style={styles.authorLine}>
              Encyclopedia of Translated Prophetic Hadiths
            </Text>
            <Text style={styles.orgLine}>
              তত্ত্বাবধানে: দাওয়াহ ও গাইডেন্স অ্যাসোসিয়েশন, রাবওয়াহ, রিয়াদ
            </Text>
            <Text style={styles.notesLine}>
              মূল আরবি মাতন অক্ষুণ্ণ রেখে বিজ্ঞ স্কলার ও অনুবাদক প্যানেল দ্বারা পর্যালোচিত প্রাঞ্জল অনুবাদ।
            </Text>

            <Pressable
              onPress={() => handleOpenLink('https://hadeethenc.com')}
              style={styles.linkRow}
              accessibilityRole="link"
              accessibilityLabel="ওয়েবসাইট ব্রাউজ করুন hadeethenc.com"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.linkText}>hadeethenc.com</Text>
              <ExternalLink size={13} color={colors.primary} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          {/* Philosophy & Purpose */}
          <View style={[styles.itemCard, shadows.cardLow, { marginTop: space.sm }]}>
            <Text style={styles.philosophyTitle}>অ্যাপের উদ্দেশ্য ও লক্ষ্য</Text>
            <Text style={styles.philosophyBody}>
              পাঠ → স্মরণ → অনুধ্যান → হৃদয়ঙ্গম → আল্লাহর দিকে প্রত্যাবর্তন → আমল
            </Text>
            <Text style={styles.philosophyNote}>
              দৈনন্দিন কর্মব্যস্ততার মাঝে পবিত্র কুরআন ও সহিহ হাদিসের শিক্ষার সঙ্গে মুসলিম জীবনের যোগসূত্র নিরবচ্ছিন্ন ও অর্থপূর্ণ রাখার নিমিত্তে বিনীত প্রচেষ্টা।
            </Text>
          </View>
        </ScrollView>
      </SafeContentArea>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: space.xxl,
  },
  statementCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: space.md,
    marginBottom: space.md,
  },
  statementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  statementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statementBody: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  highlightNotice: {
    marginTop: space.sm,
    padding: space.sm,
    backgroundColor: colors.goldSurface,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  highlightText: {
    fontSize: 12,
    color: colors.goldDark,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginVertical: space.sm,
    marginLeft: 2,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.md,
    marginBottom: space.sm,
  },
  goldItemCard: {
    borderColor: colors.goldBorder,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
    marginRight: space.xs,
  },
  verifiedBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  authorLine: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  orgLine: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  notesLine: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: radius.sm,
    marginVertical: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    marginTop: 4,
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.sm,
    marginBottom: space.sm,
  },
  transRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
  },
  transRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  transLeft: {
    flex: 1,
    marginRight: space.xs,
  },
  transLang: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transTranslator: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  typeBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  quranPill: {
    backgroundColor: colors.badgeQuranBg,
    borderColor: colors.badgeQuranBorder,
    borderWidth: 1,
  },
  hadithPill: {
    backgroundColor: colors.badgeHadithBg,
    borderColor: colors.badgeHadithBorder,
    borderWidth: 1,
  },
  typeBadgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quranPillText: {
    color: colors.primaryDark,
  },
  hadithPillText: {
    color: colors.secondary,
  },
  philosophyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  philosophyBody: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  philosophyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
});
