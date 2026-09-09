import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';
import { QuranListScreen } from '../screens/QuranListScreen';
import { HadithListScreen } from '../screens/HadithListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, space } from '../theme/tokens';
import {
  BookOpen,
  ScrollText,
  Settings as SettingsIcon,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabNavigatorProps {
  onOpenContent: (contentId: string, contentType: 'quran' | 'hadith') => void;
}

export const TabNavigator: React.FC<TabNavigatorProps> = ({ onOpenContent }) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);
  const tabHeight = 56 + bottomInset;

  return (
    <Tab.Navigator
      initialRouteName="Quran"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#1A140D',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Quran"
        options={{
          tabBarLabel: 'কুরআন',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconActiveWrapper]}>
              <BookOpen size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      >
        {props => <QuranListScreen {...props} onOpenContent={onOpenContent} />}
      </Tab.Screen>

      <Tab.Screen
        name="Hadith"
        options={{
          tabBarLabel: 'হাদিস',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconActiveWrapper]}>
              <ScrollText size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      >
        {props => <HadithListScreen {...props} onOpenContent={onOpenContent} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'সেটিংস',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconActiveWrapper]}>
              <SettingsIcon size={20} color={focused ? colors.primary : color} strokeWidth={focused ? 2.3 : 1.8} />
            </View>
          ),
        }}
      >
        {props => <SettingsScreen {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveWrapper: {
    backgroundColor: colors.primarySurface,
  },
});
