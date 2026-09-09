import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface ScholarlyMonogramProps {
  text: string;
  size?: number;
  color?: string;
  borderColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * ScholarlyMonogram
 *
 * An editorial, scholarly book emblem replacing generic hexagons.
 * Features an Islamic geometric dual-rim medallion with refined typography.
 */
export const ScholarlyMonogram: React.FC<ScholarlyMonogramProps> = ({
  text,
  size = 46,
  color = colors.primarySurface,
  borderColor = colors.gold,
  textColor = colors.primaryDark,
  style,
  textStyle,
}) => {
  const innerSize = size - 6;

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no"
    >
      {/* Outer subtle rotated medallion backdrop */}
      <View
        style={[
          styles.outerBox,
          {
            width: size,
            height: size,
            backgroundColor: color,
            borderColor: borderColor,
          },
        ]}
      />
      {/* Inner fine hairline box */}
      <View
        style={[
          styles.innerBox,
          {
            width: innerSize,
            height: innerSize,
            borderColor: borderColor,
          },
        ]}
      >
        <Text
          style={[
            styles.monogramText,
            {
              color: textColor,
              fontSize: Math.max(12, Math.round(size * 0.36)),
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {text}
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
  outerBox: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.95,
  },
  innerBox: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 0.8,
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  monogramText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
