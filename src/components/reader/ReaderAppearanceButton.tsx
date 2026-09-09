import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, space, touchTarget } from '../../theme/tokens';
import { getA11yLabel } from '../../utils/a11yLabels';

interface ReaderAppearanceButtonProps {
  onPress: () => void;
  isDark?: boolean;
  style?: ViewStyle;
  lang?: string;
}

export const ReaderAppearanceButton: React.FC<ReaderAppearanceButtonProps> = ({
  onPress,
  isDark = false,
  style,
  lang = 'bn',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
        style,
      ]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={getA11yLabel('readerSettings', lang)}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isDark ? styles.textDark : styles.textLight]}>
        Aa
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: touchTarget.iconButton,
    height: 36,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
  },
  buttonLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  buttonDark: {
    backgroundColor: '#1E2D26',
    borderColor: colors.goldBorder,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textLight: {
    color: '#FAF7F2',
  },
  textDark: {
    color: colors.goldLight,
  },
});
