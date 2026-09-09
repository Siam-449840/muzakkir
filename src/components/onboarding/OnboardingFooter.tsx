/**
 * OnboardingFooter.tsx
 *
 * Production-grade, unified navigation footer for the Muzakkir onboarding flow.
 * Anchored solidly inside SafeArea insets with >=48dp touch targets, equal vertical rhythm,
 * and graceful expansion for high font scale (130%+).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { ChevronRight } from 'lucide-react-native';

export interface OnboardingFooterProps {
  showBack?: boolean;
  backText?: string;
  onBack?: () => void;
  primaryText: string;
  primaryIcon?: React.ReactNode;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryAccessibilityLabel?: string;
}

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  showBack = true,
  backText = 'Back',
  onBack,
  primaryText,
  primaryIcon,
  onPrimary,
  primaryDisabled = false,
  primaryAccessibilityLabel,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.footerContainer, { paddingBottom: bottomPadding }]}>
      {showBack ? (
        <View style={styles.twoButtonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backText}
          >
            <Text style={styles.backButtonText} numberOfLines={1} adjustsFontSizeToFit>
              {backText}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              primaryDisabled && styles.primaryButtonDisabled,
              pressed && !primaryDisabled && styles.primaryButtonPressed,
            ]}
            onPress={primaryDisabled ? undefined : onPrimary}
            disabled={primaryDisabled}
            accessibilityRole="button"
            accessibilityLabel={primaryAccessibilityLabel || primaryText}
            accessibilityState={{ disabled: primaryDisabled }}
          >
            <Text
              style={[
                styles.primaryButtonText,
                primaryDisabled && styles.primaryButtonTextDisabled,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {primaryText}
            </Text>
            {primaryIcon ? (
              primaryIcon
            ) : (
              <ChevronRight
                size={18}
                color={primaryDisabled ? colors.textMuted : '#FAF7F2'}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButtonFull,
            primaryDisabled && styles.primaryButtonDisabled,
            pressed && !primaryDisabled && styles.primaryButtonPressed,
          ]}
          onPress={primaryDisabled ? undefined : onPrimary}
          disabled={primaryDisabled}
          accessibilityRole="button"
          accessibilityLabel={primaryAccessibilityLabel || primaryText}
          accessibilityState={{ disabled: primaryDisabled }}
        >
          <Text
            style={[
              styles.primaryButtonText,
              primaryDisabled && styles.primaryButtonTextDisabled,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {primaryText}
          </Text>
          {primaryIcon ? (
            primaryIcon
          ) : (
            <ChevronRight
              size={18}
              color={primaryDisabled ? colors.textMuted : '#FAF7F2'}
            />
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.parchmentBorder,
  },
  twoButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flex: 0.38,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: colors.parchment,
    opacity: 0.85,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 0.62,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    gap: 8,
  },
  primaryButtonFull: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    gap: 8,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.parchmentBorder,
    borderColor: colors.borderLight,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  primaryButtonTextDisabled: {
    color: colors.textMuted,
  },
});
