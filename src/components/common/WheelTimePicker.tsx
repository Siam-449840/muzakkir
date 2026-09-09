/**
 * WheelTimePicker.tsx
 *
 * Production-grade scroll/wheel time picker for React Native.
 * Features 3 synchronized snap columns:
 * - Hours (1 to 12)
 * - Minutes (00 to 59, exact minute precision)
 * - AM / PM period
 *
 * Provides smooth vertical flicking, deceleration snapping, optical centering band,
 * and deterministic conversion to/from canonical 24-hour HH:MM strings.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // 2 above, 1 selected in center, 2 below
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 220dp

export interface WheelTimePickerProps {
  visible: boolean;
  initialTime?: string; // Canonical 24-hour "HH:MM", e.g. "08:30"
  title?: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: (canonicalTime24: string) => void;
  onCancel: () => void;
}

// ── Utility Functions ─────────────────────────────────────────────────────────

import {
  parseCanonicalTime,
  toCanonical24h,
  formatTime12hDisplay,
  sortTimesChronologically,
  isDuplicateTime,
} from '../../utils/time';

export {
  parseCanonicalTime,
  toCanonical24h,
  formatTime12hDisplay,
  sortTimesChronologically,
  isDuplicateTime,
};

// ── Hours, Minutes, Periods Arrays ───────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59
const PERIODS = ['AM', 'PM'];

// ── Single Wheel Column Component ─────────────────────────────────────────────

interface WheelColumnProps<T> {
  data: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  width?: number | string;
}

function WheelColumn<T>({
  data,
  selectedIndex,
  onSelect,
  renderItem,
  width = '33%',
}: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (!isUserScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_HEIGHT)));
      isUserScrolling.current = false;
      onSelect(index);
    },
    [data.length, onSelect]
  );

  return (
    <View style={[styles.columnWrapper, { width: width as any }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          isUserScrolling.current = true;
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={e => {
          // If momentum scroll is not triggered (e.g. slow release)
          if (Platform.OS === 'android') {
            handleScrollEnd(e);
          }
        }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2, // 2 items padding above & below center
        }}
      >
        {data.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={i}
              style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({
                  y: i * ITEM_HEIGHT,
                  animated: true,
                });
              }}
            >
              {renderItem(item, isSelected)}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Main WheelTimePicker Component ────────────────────────────────────────────

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  visible,
  initialTime = '08:00',
  title = 'রিমাইন্ডার সময় নির্ধারণ',
  cancelText = 'বাতিল',
  confirmText = 'নিশ্চিত করুন',
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16) + 12;

  const parsed = parseCanonicalTime(initialTime);
  const [hourIndex, setHourIndex] = useState<number>(parsed.hour12 - 1);
  const [minuteIndex, setMinuteIndex] = useState<number>(parsed.minute);
  const [periodIndex, setPeriodIndex] = useState<number>(parsed.isPM ? 1 : 0);

  // Sync state whenever picker becomes visible
  useEffect(() => {
    if (visible) {
      const p = parseCanonicalTime(initialTime);
      setHourIndex(p.hour12 - 1);
      setMinuteIndex(p.minute);
      setPeriodIndex(p.isPM ? 1 : 0);
    }
  }, [visible, initialTime]);

  const currentHour12 = HOURS[hourIndex] || 8;
  const currentMinute = MINUTES[minuteIndex] || 0;
  const currentPeriod = PERIODS[periodIndex] || 'AM';
  const currentCanonical = toCanonical24h(currentHour12, currentMinute, currentPeriod === 'PM');

  const handleConfirm = useCallback(() => {
    onConfirm(currentCanonical);
  }, [currentCanonical, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.scrim}
          onPress={onCancel}
          accessibilityLabel="Close picker overlay"
        />

        <View style={[styles.sheetContent, { paddingBottom: bottomPadding }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <View style={styles.previewBadge}>
              <Text style={styles.previewText}>
                {formatTime12hDisplay(currentCanonical)}
              </Text>
            </View>
          </View>

          {/* Wheel Selector Area */}
          <View style={styles.pickerContainer}>
            {/* Center Selection Highlight Band */}
            <View pointerEvents="none" style={styles.selectionHighlight} />

            <WheelColumn
              data={HOURS}
              selectedIndex={hourIndex}
              onSelect={setHourIndex}
              width="34%"
              renderItem={(h, sel) => (
                <Text style={[styles.itemText, sel && styles.itemTextSelected]}>
                  {h}
                </Text>
              )}
            />

            <WheelColumn
              data={MINUTES}
              selectedIndex={minuteIndex}
              onSelect={setMinuteIndex}
              width="34%"
              renderItem={(m, sel) => (
                <Text style={[styles.itemText, sel && styles.itemTextSelected]}>
                  {String(m).padStart(2, '0')}
                </Text>
              )}
            />

            <WheelColumn
              data={PERIODS}
              selectedIndex={periodIndex}
              onSelect={setPeriodIndex}
              width="32%"
              renderItem={(p, sel) => (
                <Text style={[styles.periodText, sel && styles.periodTextSelected]}>
                  {p}
                </Text>
              )}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </Pressable>

            <Pressable
              style={styles.confirmBtn}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  previewText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    overflow: 'hidden',
    marginBottom: 20,
  },
  selectionHighlight: {
    position: 'absolute',
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(10, 77, 60, 0.08)',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: colors.primaryLight,
    zIndex: 1,
  },
  columnWrapper: {
    height: PICKER_HEIGHT,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 24,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  periodText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  periodTextSelected: {
    fontSize: 18,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 0.38,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 0.62,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FAF7F2',
  },
});
