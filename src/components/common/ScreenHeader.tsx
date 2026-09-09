import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, space } from '../../theme/tokens';
import { getA11yLabel } from '../../utils/a11yLabels';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  variant?: 'emerald' | 'canvas';
  style?: ViewStyle;
  lang?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  onBack,
  rightActions,
  variant = 'canvas',
  style,
  lang = 'bn',
}) => {
  const insets = useSafeAreaInsets();
  const isEmerald = variant === 'emerald';

  const bgColor = isEmerald ? colors.primaryDark : colors.canvas;
  const textColor = isEmerald ? '#FAF7F2' : colors.textPrimary;
  const subtitleColor = isEmerald ? colors.goldLight : colors.textMuted;
  const backIconColor = isEmerald ? '#FAF7F2' : colors.primaryDark;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + space.sm,
          borderBottomColor: isEmerald ? 'transparent' : colors.borderLight,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={isEmerald ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        animated={true}
      />
      <View style={styles.contentRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={getA11yLabel('goBack', lang)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={backIconColor} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleColumn}>
          {breadcrumb ? (
            <Text style={[styles.breadcrumbText, { color: subtitleColor }]} numberOfLines={1}>
              {breadcrumb}
            </Text>
          ) : null}
          <Text style={[styles.titleText, { color: textColor }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: subtitleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightActions ? (
          <View style={styles.rightActionsRow}>
            {rightActions}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: space.xs,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: space.sm,
    gap: space.xs,
  },
});
