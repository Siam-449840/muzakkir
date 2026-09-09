import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  AccessibilityInfo,
} from 'react-native';
import { colors } from '../../theme/colors';
import { toBengaliNumerals } from '../../utils/bengaliNumerals';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getA11yLabel } from '../../utils/a11yLabels';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleFootnoteProps {
  noteText: string;
  isDark?: boolean;
  lang?: string;
}

/**
 * CollapsibleFootnote
 *
 * An editorial scholarly commentary block that houses detailed footnotes
 * without disrupting the continuous flow of the Hadith text.
 * Expands on tap with zero data alteration or arbitrary truncation.
 */
export const CollapsibleFootnote: React.FC<CollapsibleFootnoteProps> = ({
  noteText,
  isDark = false,
  lang = 'bn',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!noteText || !noteText.trim()) return null;

  const toggleExpand = async () => {
    try {
      const isReduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      if (!isReduceMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    } catch {
      // safe fallback
    }
    setIsExpanded(prev => !prev);
  };

  const charCount = noteText.length;

  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.7}
        onPress={toggleExpand}
        accessibilityRole="button"
        accessibilityLabel={
          isExpanded
            ? getA11yLabel('footnoteExpanded', lang)
            : getA11yLabel('footnoteCollapsed', lang)
        }
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <BookOpen
            size={16}
            color={isDark ? colors.goldLight : colors.goldDark}
            style={{ marginRight: 8 }}
            accessible={false}
          />
          <Text style={[styles.headerTitle, isDark ? styles.textDark : styles.textLight]}>
            টীকা ও অতিরিক্ত তথ্য {charCount > 1000 ? `(${toBengaliNumerals(Math.round(charCount / 1000))}k বর্ণ)` : ''}
          </Text>
        </View>
        <View style={styles.togglePill}>
          <Text style={[styles.toggleText, isDark ? styles.toggleTextDark : styles.toggleTextLight]}>
            {isExpanded ? 'সংক্ষেপ করুন' : 'বিস্তারিত পড়ুন'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={14} color={isDark ? colors.goldLight : colors.goldDark} />
          ) : (
            <ChevronDown size={14} color={isDark ? colors.goldLight : colors.goldDark} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded full verbatim footnote — zero text truncation */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.divider, isDark ? styles.dividerDark : styles.dividerLight]} />
          <Text style={[styles.fullNoteText, isDark ? styles.textDark : styles.textLight]} selectable>
            {noteText}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  containerLight: {
    backgroundColor: '#FDFBF7',
    borderColor: '#EFE7DA',
  },
  containerDark: {
    backgroundColor: '#16221D',
    borderColor: '#263830',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textLight: {
    color: '#3B362F',
  },
  textDark: {
    color: '#E6ECE9',
  },
  subTextLight: {
    color: '#7D7569',
  },
  subTextDark: {
    color: '#9EAEA5',
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  toggleTextLight: {
    color: colors.goldDark,
  },
  toggleTextDark: {
    color: colors.goldLight,
  },
  teaserText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  dividerLight: {
    backgroundColor: '#EFE7DA',
  },
  dividerDark: {
    backgroundColor: '#263830',
  },
  fullNoteText: {
    fontSize: 13.5,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
});
