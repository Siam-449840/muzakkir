import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, StatusBarStyle } from 'react-native';
import { colors } from '../../theme/tokens';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  statusBarColor?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  backgroundColor = colors.canvas,
  statusBarStyle = 'dark-content',
  statusBarColor,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor || backgroundColor}
        animated={true}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
