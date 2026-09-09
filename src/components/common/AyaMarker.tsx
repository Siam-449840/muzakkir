import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { toBengaliNumerals } from '../../utils/bengaliNumerals';

interface AyaMarkerProps {
  number: number | string;
  size?: number;
  color?: string;
  borderColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * AyaMarker
 *
 * Traditional Islamic Aya rosette for Quran verses.
 * Features a circular gold-accented ring with clear Bengali numerals.
 */
export const AyaMarker: React.FC<AyaMarkerProps> = ({
  number,
  size = 32,
  color = '#FFFDF9',
  borderColor = colors.gold,
  textColor = colors.primaryDark,
  style,
  textStyle,
}) => {
  const displayNum = toBengaliNumerals(number);
  const numDigits = String(displayNum).length;
  const fontScale = numDigits >= 3 ? 0.30 : numDigits === 2 ? 0.36 : 0.40;
  const calculatedFontSize = Math.max(9, Math.round(size * fontScale));
  const r = size / 2;

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={r} cy={r} r={r - 1.5} fill={color} stroke={borderColor} strokeWidth="1.2" />
        <Circle cx={r} cy={r} r={r - 4} fill="none" stroke={borderColor} strokeWidth="0.6" strokeDasharray="2,2" />
      </Svg>
      <View style={styles.textWrapper}>
        <Text
          style={[
            styles.label,
            {
              color: textColor,
              fontSize: calculatedFontSize,
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {displayNum}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
  },
});
