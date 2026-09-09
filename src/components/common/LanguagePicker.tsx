import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { touchTarget } from '../../theme/tokens';
import { useResponsive } from '../../theme/useResponsive';
import { getA11yLabel } from '../../utils/a11yLabels';
import { SupportedQuranLanguage, LANGUAGE_OPTIONS } from '../../types';
import { X, Check, Globe } from 'lucide-react-native';

interface LanguagePickerProps {
  visible: boolean;
  selectedLanguage: SupportedQuranLanguage;
  onSelectLanguage: (code: SupportedQuranLanguage) => void;
  onClose: () => void;
  lang?: SupportedQuranLanguage;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  visible,
  selectedLanguage,
  onSelectLanguage,
  onClose,
  lang,
}) => {
  const currentLang = lang || selectedLanguage;
  const { isExpanded, modalWidth } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, isExpanded && styles.backdropTablet]}>
        <View
          style={[
            styles.modalSheet,
            shadows.cardHigh,
            isExpanded && [styles.modalTablet, { width: modalWidth }],
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Globe size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.titleText}>Select Language</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={getA11yLabel('close', currentLang)}
            >
              <X size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.subtitleText}>
            9 verified translation languages. Arabic is the original Quranic text and is always displayed separately.
          </Text>

          {/* Languages List */}
          <ScrollView style={styles.scrollList} contentContainerStyle={{ paddingBottom: 20 }}>
            {LANGUAGE_OPTIONS.map(opt => {
              const isSelected = opt.code === selectedLanguage;
              return (
                <Pressable
                  key={opt.code}
                  onPress={() => {
                    onSelectLanguage(opt.code);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${opt.nativeName}, ${opt.name}`}
                  style={[
                    styles.langItem,
                    isSelected && styles.langItemActive,
                  ]}
                >
                  <View style={styles.langInfo}>
                    <Text style={[styles.nativeText, isSelected && styles.textActive]}>
                      {opt.nativeName}
                    </Text>
                    <Text style={[styles.englishText, isSelected && styles.textActive]}>
                      {opt.name}
                    </Text>
                  </View>

                  <View style={styles.rightBadgeCol}>
                    <View
                      style={[
                        styles.badge,
                        opt.hadithVerified ? styles.badgeVerified : styles.badgeNeutral,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          opt.hadithVerified ? styles.badgeTextVerified : styles.badgeTextNeutral,
                        ]}
                      >
                        {opt.hadithVerified ? 'Quran + Hadith' : 'Quran verified'}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: colors.goldBorder,
    maxHeight: '80%',
    padding: 20,
  },
  modalTablet: {
    borderRadius: 24,
    borderWidth: 1.5,
    maxHeight: '75%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  closeBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: colors.parchment,
  },
  subtitleText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  scrollList: {
    marginTop: 4,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  langItemActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primaryLight,
  },
  langInfo: {
    flex: 1,
  },
  nativeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  englishText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  textActive: {
    color: colors.primaryDark,
  },
  rightBadgeCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeVerified: {
    backgroundColor: '#E8F5EE',
  },
  badgeNeutral: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  badgeTextVerified: {
    color: '#0E845A',
  },
  badgeTextNeutral: {
    color: '#6B7280',
  },
});
