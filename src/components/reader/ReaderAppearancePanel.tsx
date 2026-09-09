import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, space, radius } from '../../theme/tokens';
import { toBengaliNumerals } from '../../utils/bengaliNumerals';
import { ReaderSettings, ARABIC_FONTS } from '../../utils/readerSettings';
import { useResponsive } from '../../theme/useResponsive';
import { getA11yLabel } from '../../utils/a11yLabels';
import { Minus, Plus, X, Check, BookOpen, Layers, Sun, Moon, Sparkles } from 'lucide-react-native';

interface ReaderAppearancePanelProps {
  visible: boolean;
  onClose: () => void;
  type: 'quran' | 'hadith';
  settings: ReaderSettings;
  onSettingsChange: (newSettings: ReaderSettings) => void;
  lang?: string;
}

export const ReaderAppearancePanel: React.FC<ReaderAppearancePanelProps> = ({
  visible,
  onClose,
  type,
  settings,
  onSettingsChange,
  lang = 'bn',
}) => {
  const { isExpanded } = useResponsive();
  const [activeLayer, setActiveLayer] = useState<'text' | 'reading'>('text');

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const adjustArabic = (delta: number) => {
    const newVal = Math.min(36, Math.max(16, settings.arabicFontSize + delta));
    updateSetting('arabicFontSize', newVal);
  };

  const adjustTranslation = (delta: number) => {
    const newVal = Math.min(26, Math.max(12, settings.translationFontSize + delta));
    updateSetting('translationFontSize', newVal);
  };

  const currentTheme = settings.nightMode ? 'dark' : settings.sepiaMode ? 'sepia' : 'light';

  const setTheme = (theme: 'light' | 'sepia' | 'dark') => {
    if (theme === 'light') {
      onSettingsChange({ ...settings, nightMode: false, sepiaMode: false });
    } else if (theme === 'sepia') {
      onSettingsChange({ ...settings, nightMode: false, sepiaMode: true });
    } else {
      onSettingsChange({ ...settings, nightMode: true, sepiaMode: false });
    }
  };

  const isDark = settings.nightMode;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={[
          styles.backdrop,
          isExpanded && styles.backdropCentered,
        ]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.panelContainer,
            isExpanded && styles.panelTablet,
            isDark ? styles.panelDark : styles.panelLight,
          ]}
          onPress={e => e.stopPropagation()}
        >
          {/* Top Drag Handle Indicator */}
          <View style={styles.dragHandleRow}>
            <View style={[styles.dragHandle, isDark && styles.dragHandleDark]} />
          </View>

          {/* Panel Header */}
          <View style={[styles.panelHeader, isDark && styles.panelHeaderDark]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.aaBadge, isDark && styles.aaBadgeDark]}>
                <Text style={[styles.aaBadgeText, isDark && styles.aaBadgeTextDark]}>Aa</Text>
              </View>
              <Text style={[styles.panelTitle, isDark ? styles.textDark : styles.textLight]}>
                পাঠের রূপ ও ফন্ট
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={getA11yLabel('close', lang)}
              activeOpacity={0.7}
            >
              <X size={20} color={isDark ? colors.goldLight : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Segmented Control Tabs */}
          <View style={[styles.segmentedControl, isDark && styles.segmentedControlDark]}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeLayer === 'text' && (isDark ? styles.segmentTabActiveDark : styles.segmentTabActive),
              ]}
              onPress={() => setActiveLayer('text')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLayer === 'text' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeLayer === 'text'
                    ? (isDark ? styles.segmentTabTextActiveDark : styles.segmentTabTextActive)
                    : (isDark ? styles.segmentTabTextInactiveDark : styles.segmentTabTextInactive),
                ]}
              >
                টেক্সট ও ফন্ট
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeLayer === 'reading' && (isDark ? styles.segmentTabActiveDark : styles.segmentTabActive),
              ]}
              onPress={() => setActiveLayer('reading')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLayer === 'reading' }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeLayer === 'reading'
                    ? (isDark ? styles.segmentTabTextActiveDark : styles.segmentTabTextActive)
                    : (isDark ? styles.segmentTabTextInactiveDark : styles.segmentTabTextInactive),
                ]}
              >
                পাঠের ধরন ও থিম
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Area — Natural Content-Driven Height, Zero Artificial Blank Space */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {activeLayer === 'text' ? (
              <View style={styles.tabContent}>
                {/* 1. Font Size Stepper Card */}
                <View style={[styles.sectionCard, isDark && styles.sectionCardDark]}>
                  {/* Arabic Font Size */}
                  <View style={styles.stepperRow}>
                    <View style={styles.labelCol}>
                      <Text style={[styles.controlLabel, isDark ? styles.textDark : styles.textLight]}>
                        আরবি ফন্ট সাইজ
                      </Text>
                      <Text style={[styles.controlHint, isDark && styles.hintDark]}>
                        মূল আরবি পাঠের আকার
                      </Text>
                    </View>
                    <View style={[styles.stepperPod, isDark && styles.stepperPodDark]}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.arabicFontSize <= 16 && styles.stepperBtnDisabled]}
                        onPress={() => adjustArabic(-2)}
                        disabled={settings.arabicFontSize <= 16}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="আরবি ফন্ট সাইজ কমান"
                        activeOpacity={0.7}
                      >
                        <Minus size={16} color={settings.arabicFontSize <= 16 ? colors.textMuted : colors.primaryDark} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValueText, isDark ? styles.textDark : styles.textLight]}>
                        {toBengaliNumerals(settings.arabicFontSize)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.arabicFontSize >= 36 && styles.stepperBtnDisabled]}
                        onPress={() => adjustArabic(+2)}
                        disabled={settings.arabicFontSize >= 36}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="আরবি ফন্ট সাইজ বাড়ান"
                        activeOpacity={0.7}
                      >
                        <Plus size={16} color={settings.arabicFontSize >= 36 ? colors.textMuted : colors.primaryDark} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, isDark && styles.cardDividerDark]} />

                  {/* Translation Font Size */}
                  <View style={styles.stepperRow}>
                    <View style={styles.labelCol}>
                      <Text style={[styles.controlLabel, isDark ? styles.textDark : styles.textLight]}>
                        অনুবাদ ফন্ট সাইজ
                      </Text>
                      <Text style={[styles.controlHint, isDark && styles.hintDark]}>
                        বাংলা ও নির্বাচিত অনুবাদের আকার
                      </Text>
                    </View>
                    <View style={[styles.stepperPod, isDark && styles.stepperPodDark]}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.translationFontSize <= 12 && styles.stepperBtnDisabled]}
                        onPress={() => adjustTranslation(-1)}
                        disabled={settings.translationFontSize <= 12}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="অনুবাদ ফন্ট সাইজ কমান"
                        activeOpacity={0.7}
                      >
                        <Minus size={16} color={settings.translationFontSize <= 12 ? colors.textMuted : colors.primaryDark} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValueText, isDark ? styles.textDark : styles.textLight]}>
                        {toBengaliNumerals(settings.translationFontSize)}
                      </Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, settings.translationFontSize >= 26 && styles.stepperBtnDisabled]}
                        onPress={() => adjustTranslation(+1)}
                        disabled={settings.translationFontSize >= 26}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="অনুবাদ ফন্ট সাইজ বাড়ান"
                        activeOpacity={0.7}
                      >
                        <Plus size={16} color={settings.translationFontSize >= 26 ? colors.textMuted : colors.primaryDark} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 2. Arabic Font Family — 2-Column Responsive Grid */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                    আরবি ফন্ট শৈলী
                  </Text>
                </View>
                <View style={styles.fontGrid}>
                  {ARABIC_FONTS.map(f => {
                    const isSelected = settings.arabicFont === f.id;
                    const cleanName = f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[
                          styles.fontCard,
                          isDark && styles.fontCardDark,
                          isSelected && (isDark ? styles.fontCardSelectedDark : styles.fontCardSelected),
                        ]}
                        onPress={() => updateSetting('arabicFont', f.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.fontCardHeader}>
                          <Text
                            style={[
                              styles.fontCardTitle,
                              isDark ? styles.textDark : styles.textLight,
                              isSelected && styles.fontCardTitleSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {cleanName}
                          </Text>
                          {isSelected ? (
                            <View style={styles.selectedBadge}>
                              <Check size={12} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          ) : (
                            <View style={[styles.unselectedRadio, isDark && styles.unselectedRadioDark]} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.fontArabicPreview,
                            isDark ? styles.previewDark : styles.previewLight,
                            {
                              fontFamily:
                                f.id === 'Me Quran'
                                  ? 'Me Quran'
                                  : f.id === 'Amiri'
                                  ? 'Amiri'
                                  : f.id === 'Scheherazade'
                                  ? 'Scheherazade'
                                  : Platform.select({ ios: 'Amiri', android: 'serif', default: 'serif' }),
                            },
                          ]}
                          numberOfLines={1}
                        >
                          بِسْمِ ٱللَّهِ
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Text Visibility & Diacritics Card */}
                <View style={[styles.sectionCard, isDark && styles.sectionCardDark, { marginTop: space.sm }]}>
                  <View style={styles.toggleRow}>
                    <View style={styles.labelCol}>
                      <Text style={[styles.controlLabel, isDark ? styles.textDark : styles.textLight]}>
                        আরবি টেক্সট প্রদর্শন
                      </Text>
                      <Text style={[styles.controlHint, isDark && styles.hintDark]}>
                        স্ক্রিনে মূল আরবি মতন অন/অফ
                      </Text>
                    </View>
                    <Switch
                      value={settings.showArabic}
                      onValueChange={v => updateSetting('showArabic', v)}
                      trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel="আরবি টেক্সট প্রদর্শন অন অথবা অফ"
                    />
                  </View>

                  <View style={[styles.cardDivider, isDark && styles.cardDividerDark]} />

                  <View style={styles.toggleRow}>
                    <View style={styles.labelCol}>
                      <Text style={[styles.controlLabel, isDark ? styles.textDark : styles.textLight]}>
                        হরকত / যের-যবর
                      </Text>
                      <Text style={[styles.controlHint, isDark && styles.hintDark]}>
                        সহজ পাঠে যের-যবর লুকানো যাবে
                      </Text>
                    </View>
                    <Switch
                      value={settings.showDiacritics}
                      onValueChange={v => updateSetting('showDiacritics', v)}
                      trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.primary }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel="হরকত যের যবর প্রদর্শন অন অথবা অফ"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.tabContent}>
                {/* 1. Reading Mode Card */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                    পাঠের ধরন
                  </Text>
                </View>
                <View style={styles.readingModeRow}>
                  {/* Continuous Scroll */}
                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      isDark && styles.modeCardDark,
                      settings.readingMode === 'list' && (isDark ? styles.modeCardSelectedDark : styles.modeCardSelected),
                    ]}
                    onPress={() => updateSetting('readingMode', 'list')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: settings.readingMode === 'list' }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modeCardTop}>
                      <BookOpen size={18} color={settings.readingMode === 'list' ? colors.primary : colors.textMuted} />
                      {settings.readingMode === 'list' ? (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={[styles.unselectedRadio, isDark && styles.unselectedRadioDark]} />
                      )}
                    </View>
                    <Text style={[styles.modeCardTitle, isDark ? styles.textDark : styles.textLight]}>
                      ধারাবাহিক
                    </Text>
                    <Text style={[styles.modeCardHint, isDark && styles.hintDark]}>
                      উল্লম্ব স্ক্রল
                    </Text>
                  </TouchableOpacity>

                  {/* Single Page Slide */}
                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      isDark && styles.modeCardDark,
                      settings.readingMode === 'slide' && (isDark ? styles.modeCardSelectedDark : styles.modeCardSelected),
                    ]}
                    onPress={() => updateSetting('readingMode', 'slide')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: settings.readingMode === 'slide' }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modeCardTop}>
                      <Layers size={18} color={settings.readingMode === 'slide' ? colors.primary : colors.textMuted} />
                      {settings.readingMode === 'slide' ? (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={[styles.unselectedRadio, isDark && styles.unselectedRadioDark]} />
                      )}
                    </View>
                    <Text style={[styles.modeCardTitle, isDark ? styles.textDark : styles.textLight]}>
                      একক পাতা
                    </Text>
                    <Text style={[styles.modeCardHint, isDark && styles.hintDark]}>
                      স্লাইড ভিউ
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Color Theme — Mutually Exclusive 3-Way Selector */}
                <View style={[styles.sectionHeader, { marginTop: space.md }]}>
                  <Text style={[styles.sectionTitle, isDark ? styles.textDark : styles.textLight]}>
                    থিম নির্বাচন
                  </Text>
                </View>
                <View style={styles.themeRow}>
                  {/* Light Theme */}
                  <TouchableOpacity
                    style={[
                      styles.themeCard,
                      styles.themeCardLightTone,
                      currentTheme === 'light' && styles.themeCardSelectedLight,
                    ]}
                    onPress={() => setTheme('light')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentTheme === 'light' }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.themeHeader}>
                      <Sun size={16} color="#4A5568" />
                      {currentTheme === 'light' && (
                        <View style={styles.selectedBadge}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.themeLabelLight}>লাইট</Text>
                    <Text style={styles.themeHintLight}>উজ্জ্বল</Text>
                  </TouchableOpacity>

                  {/* Sepia Theme */}
                  <TouchableOpacity
                    style={[
                      styles.themeCard,
                      styles.themeCardSepiaTone,
                      currentTheme === 'sepia' && styles.themeCardSelectedSepia,
                    ]}
                    onPress={() => setTheme('sepia')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentTheme === 'sepia' }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.themeHeader}>
                      <Sparkles size={16} color="#92400E" />
                      {currentTheme === 'sepia' && (
                        <View style={[styles.selectedBadge, { backgroundColor: '#92400E' }]}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.themeLabelSepia}>সেপিয়া</Text>
                    <Text style={styles.themeHintSepia}>পার্চমেন্ট</Text>
                  </TouchableOpacity>

                  {/* Dark Theme */}
                  <TouchableOpacity
                    style={[
                      styles.themeCard,
                      styles.themeCardDarkTone,
                      currentTheme === 'dark' && styles.themeCardSelectedDark,
                    ]}
                    onPress={() => setTheme('dark')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: currentTheme === 'dark' }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.themeHeader}>
                      <Moon size={16} color="#A7F3D0" />
                      {currentTheme === 'dark' && (
                        <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.themeLabelDark}>ডার্ক</Text>
                    <Text style={styles.themeHintDark}>রাত্রী মোড</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  panelContainer: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.xl,
    maxHeight: '80%',
    width: '100%',
  },
  panelTablet: {
    borderRadius: radius.xl,
    maxWidth: 480,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  panelLight: {
    backgroundColor: '#FFFFFF',
  },
  panelDark: {
    backgroundColor: '#16221D',
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  dragHandleDark: {
    backgroundColor: '#334155',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  panelHeaderDark: {
    borderBottomColor: '#23332A',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xs,
    marginRight: space.sm,
  },
  aaBadgeDark: {
    backgroundColor: '#1E3A2F',
  },
  aaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  aaBadgeTextDark: {
    color: '#34D399',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F2',
    borderRadius: radius.md,
    padding: 3,
    marginTop: space.sm,
    marginBottom: space.xs,
    minHeight: 44,
  },
  segmentedControlDark: {
    backgroundColor: '#1C2E25',
  },
  segmentTab: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentTabActiveDark: {
    backgroundColor: '#263E32',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  segmentTabTextActiveDark: {
    color: '#A7F3D0',
    fontWeight: '700',
  },
  segmentTabTextInactive: {
    color: colors.textMuted,
  },
  segmentTabTextInactiveDark: {
    color: '#94A3B8',
  },
  scrollContent: {
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  tabContent: {
    width: '100%',
  },
  sectionCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderWidth: 1,
    borderColor: '#E8EFEA',
  },
  sectionCardDark: {
    backgroundColor: '#1C2C24',
    borderColor: '#2D4438',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EAEFEA',
    marginVertical: space.xs,
  },
  cardDividerDark: {
    backgroundColor: '#2A4034',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs + 2,
    minHeight: 48,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs + 2,
    minHeight: 44,
  },
  labelCol: {
    flex: 1,
    paddingRight: space.sm,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  controlHint: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  hintDark: {
    color: '#94A3B8',
  },
  stepperPod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D1DDD6',
    overflow: 'hidden',
  },
  stepperPodDark: {
    backgroundColor: '#16221D',
    borderColor: '#2E473A',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueText: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    textTransform: 'uppercase',
  },
  fontGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs + 2,
  },
  fontCard: {
    width: '48.5%',
    minHeight: 68,
    backgroundColor: '#F8FAF8',
    borderRadius: radius.md,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 4,
    borderWidth: 1.5,
    borderColor: '#E2EAE5',
    justifyContent: 'center',
  },
  fontCardDark: {
    backgroundColor: '#1C2C24',
    borderColor: '#2B4235',
  },
  fontCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  fontCardSelectedDark: {
    borderColor: colors.primaryLight,
    backgroundColor: '#1E3D2E',
  },
  fontCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fontCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  fontCardTitleSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  selectedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  unselectedRadioDark: {
    borderColor: '#475569',
  },
  fontArabicPreview: {
    fontSize: 17,
    marginTop: 2,
    textAlign: 'left',
  },
  previewLight: {
    color: '#1E293B',
  },
  previewDark: {
    color: '#F1F5F9',
  },
  readingModeRow: {
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  modeCard: {
    flex: 1,
    minHeight: 74,
    backgroundColor: '#F8FAF8',
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1.5,
    borderColor: '#E2EAE5',
    justifyContent: 'center',
  },
  modeCardDark: {
    backgroundColor: '#1C2C24',
    borderColor: '#2B4235',
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDF4',
  },
  modeCardSelectedDark: {
    borderColor: colors.primaryLight,
    backgroundColor: '#1E3D2E',
  },
  modeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modeCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modeCardHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  themeCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  themeCardLightTone: {
    backgroundColor: '#FAF7F2',
    borderColor: '#E7DFD5',
  },
  themeCardSelectedLight: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  themeCardSepiaTone: {
    backgroundColor: '#FBF7EE',
    borderColor: '#E4D5BE',
  },
  themeCardSelectedSepia: {
    borderColor: '#92400E',
    borderWidth: 2,
  },
  themeCardDarkTone: {
    backgroundColor: '#121C17',
    borderColor: '#283E32',
  },
  themeCardSelectedDark: {
    borderColor: '#34D399',
    borderWidth: 2,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeLabelLight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  themeHintLight: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  themeLabelSepia: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
  },
  themeHintSepia: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  themeLabelDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F7FAFC',
  },
  themeHintDark: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  textLight: {
    color: colors.textPrimary,
  },
  textDark: {
    color: '#F7FAFC',
  },
});
