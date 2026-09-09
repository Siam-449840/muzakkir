import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, space, radius, touchTarget } from '../../theme/tokens';
import { getA11yLabel } from '../../utils/a11yLabels';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
  onClear?: () => void;
  style?: ViewStyle;
  testID?: string;
  lang?: string;
}

/**
 * SearchField
 *
 * Unified, accessible search input primitive for the Muzakkir app.
 * Adheres to central design tokens: 44dp touch target, tactile ivory/parchment
 * border, clear dismissal button, and consistent typography.
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onClear,
  style,
  testID,
  lang = 'bn',
}) => {
  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  const resolvedInputA11y = accessibilityLabel || getA11yLabel('searchInput', lang);

  return (
    <View style={[styles.container, style]}>
      <Search
        size={18}
        color={colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={resolvedInputA11y}
        accessibilityRole="search"
        testID={testID}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel={getA11yLabel('searchClear', lang)}
          activeOpacity={0.7}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  searchIcon: {
    marginRight: space.sm,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '400',
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
  },
  clearButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space.xs,
  },
});
