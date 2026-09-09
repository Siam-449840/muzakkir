import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../../theme/useResponsive';
import { contentConstraints } from '../../theme/tokens';

interface SafeContentAreaProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export const SafeContentArea: React.FC<SafeContentAreaProps> = ({
  children,
  style,
  maxWidth = contentConstraints.maxReadingWidth,
}) => {
  const { isExpanded } = useResponsive();

  return (
    <View
      style={[
        styles.area,
        isExpanded && { maxWidth, alignSelf: 'center', width: '100%' },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    width: '100%',
  },
});
