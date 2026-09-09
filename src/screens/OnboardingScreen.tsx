import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { saveUserSettings, defaultSettings } from '../database/db';
import { scheduleNotificationsForSettings } from '../services/notificationService';
import {
  checkAllRequiredCapabilities,
  requestNotificationCapability,
  requestOverlayCapability,
  requestExactAlarmCapability,
  PermissionGateStatus,
} from '../services/permissionGateService';
import { LANGUAGE_OPTIONS, SupportedQuranLanguage, DailyFrequency, UserSettings } from '../types';
import {
  WheelTimePicker,
  formatTime12hDisplay,
  sortTimesChronologically,
  isDuplicateTime,
} from '../components/common/WheelTimePicker';
import { OnboardingFooter } from '../components/onboarding/OnboardingFooter';
import {
  Globe,
  Clock,
  Bell,
  Check,
  Sliders,
  Plus,
  Trash2,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react-native';

export const ONBOARDING_COMPLETE_KEY = '@onboarding_complete_v1';

const DEFAULT_TIMES: Record<DailyFrequency, string[]> = {
  1: ['08:00'],
  2: ['08:00', '19:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['07:30', '12:30', '17:30', '21:00'],
  5: ['06:30', '10:30', '14:30', '18:30', '21:30'],
};

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(0); // 0=lang, 1=frequency, 2=times, 3=permissions
  const [language, setLanguage] = useState<SupportedQuranLanguage>('en');
  const [frequency, setFrequency] = useState<DailyFrequency>(3);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>(DEFAULT_TIMES[3]);

  // Wheel time picker state
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number>(-1); // -1 = adding new slot
  const [pickerInitialTime, setPickerInitialTime] = useState<string>('08:00');

  // Permission Gate State
  const [permStatus, setPermStatus] = useState<PermissionGateStatus>({
    allGranted: false,
    notifications: false,
    overlay: false,
    exactAlarm: false,
    missing: ['notifications', 'overlay', 'exactAlarm'],
  });
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  // Check real runtime capabilities
  const refreshPermissions = useCallback(async () => {
    const status = await checkAllRequiredCapabilities();
    setPermStatus(status);
  }, []);

  useEffect(() => {
    refreshPermissions();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermissions]);

  // ── Step Navigation Handlers ─────────────────────────────────────────────

  const handleSelectPreset = (freq: DailyFrequency) => {
    setIsCustomMode(false);
    setFrequency(freq);
    setReminderTimes([...DEFAULT_TIMES[freq]]);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
  };

  const handleOpenEditSlot = (index: number) => {
    setEditingSlotIndex(index);
    setPickerInitialTime(reminderTimes[index] || '08:00');
    setPickerVisible(true);
  };

  const handleOpenAddSlot = () => {
    setEditingSlotIndex(-1);
    // Smart default: 3 hours after the last slot or 12:00
    let nextTime = '12:00';
    if (reminderTimes.length > 0) {
      const last = reminderTimes[reminderTimes.length - 1];
      const [h, m] = last.split(':').map(Number);
      if (!isNaN(h)) {
        const nextH = (h + 3) % 24;
        nextTime = `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      }
    }
    setPickerInitialTime(nextTime);
    setPickerVisible(true);
  };

  const handleConfirmPickerTime = (canonicalTime24: string) => {
    setPickerVisible(false);

    // Duplicate check
    if (isDuplicateTime(canonicalTime24, reminderTimes, editingSlotIndex)) {
      Alert.alert(
        'Duplicate Time',
        'This reminder time is already configured. Please choose a different time.'
      );
      return;
    }

    let updated: string[];
    if (editingSlotIndex >= 0) {
      // Editing existing slot
      updated = [...reminderTimes];
      updated[editingSlotIndex] = canonicalTime24;
    } else {
      // Adding new slot
      updated = [...reminderTimes, canonicalTime24];
    }

    // Always sort chronologically
    const sorted = sortTimesChronologically(updated);
    setReminderTimes(sorted);
    if (isCustomMode) {
      setFrequency(Math.min(Math.max(sorted.length, 1), 5) as DailyFrequency);
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (reminderTimes.length <= 1) {
      Alert.alert('Required', 'At least one reminder time is required.');
      return;
    }
    const updated = reminderTimes.filter((_, i) => i !== index);
    setReminderTimes(updated);
    if (isCustomMode) {
      setFrequency(Math.min(Math.max(updated.length, 1), 5) as DailyFrequency);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!permStatus.allGranted) {
      Alert.alert(
        'Permissions Required',
        'Please enable all 3 required capabilities to start Muzakkir.'
      );
      return;
    }

    setIsFinishing(true);
    try {
      const normalizedFreq = Math.min(Math.max(reminderTimes.length, 1), 5) as DailyFrequency;
      const settings: UserSettings = {
        ...defaultSettings,
        preferred_language: language,
        daily_frequency: normalizedFreq,
        reminder_times: reminderTimes,
      };

      await saveUserSettings(settings);
      await scheduleNotificationsForSettings(settings);
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');

      onComplete();
    } catch (e) {
      console.warn('[Onboarding] Completion error:', e);
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      onComplete();
    } finally {
      setIsFinishing(false);
    }
  };

  // ── Step 0: Choose Your Language ─────────────────────────────────────────
  const renderLanguageStep = () => (
    <View style={styles.stepWrapper}>
      <View style={[styles.stepHeader, { paddingHorizontal: 24, paddingTop: 10, marginBottom: 12 }]}>
        <View style={styles.iconBadge}>
          <Globe size={28} color={colors.primary} />
        </View>
        <Text style={styles.stepTitle}>Choose Your Language</Text>
        <Text style={styles.stepSubtitle}>
          Quran translations and Hadith content will be displayed in your chosen language.
          Arabic is always shown as the original.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 4 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {LANGUAGE_OPTIONS.map(lang => {
            const isSelected = lang.code === language;
            return (
              <Pressable
                key={lang.code}
                style={[styles.langRow, isSelected && styles.langRowActive]}
                onPress={() => setLanguage(lang.code)}
                accessibilityRole="button"
                accessibilityLabel={`${lang.nativeName}, ${lang.name}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View>
                  <Text style={[styles.langMain, isSelected && styles.langMainActive]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langSub, isSelected && styles.langSubActive]}>
                    {lang.name}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkCircle}>
                    <Check size={16} color="#FAF7F2" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <OnboardingFooter
        showBack={false}
        primaryText="Continue"
        onPrimary={() => setStep(1)}
        primaryAccessibilityLabel="Continue to reminder frequency"
      />
    </View>
  );

  // ── Step 1: Daily Reminders & Custom Mode ────────────────────────────────
  const renderFrequencyStep = () => (
    <View style={styles.stepWrapper}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <View style={styles.iconBadge}>
            <Clock size={32} color={colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Daily Reminders</Text>
          <Text style={styles.stepSubtitle}>
            How many spiritual moments would you like each day? Each reminder delivers
            one Quran verse or Hadith at the time you set.
          </Text>
        </View>

        {/* 1-5 Presets Grid */}
        <View style={styles.freqGrid}>
          {([1, 2, 3, 4, 5] as DailyFrequency[]).map(freq => {
            const isSelected = !isCustomMode && freq === frequency;
            const labels: Record<number, string> = {
              1: 'Once\na day',
              2: 'Twice\na day',
              3: 'Three\ntimes',
              4: 'Four\ntimes',
              5: 'Five\ntimes',
            };
            return (
              <Pressable
                key={freq}
                style={[styles.freqCard, isSelected && styles.freqCardActive]}
                onPress={() => handleSelectPreset(freq)}
                accessibilityRole="button"
                accessibilityLabel={`${labels[freq].replace('\n', ' ')} daily`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.freqNum, isSelected && styles.freqNumActive]}>
                  {freq}
                </Text>
                <Text style={[styles.freqLabel, isSelected && styles.freqLabelActive]}>
                  {labels[freq]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom Mode Option */}
        <Pressable
          style={[styles.customCard, isCustomMode && styles.customCardActive]}
          onPress={handleSelectCustom}
          accessibilityRole="button"
          accessibilityLabel="Custom reminder schedule"
          accessibilityState={{ selected: isCustomMode }}
        >
          <View style={styles.customLeft}>
            <View style={[styles.customIconBadge, isCustomMode && styles.customIconBadgeActive]}>
              <Sliders size={20} color={isCustomMode ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.customTextContainer}>
              <Text style={[styles.customTitle, isCustomMode && styles.customTitleActive]}>
                Custom / কাস্টম
              </Text>
              <Text style={styles.customSubtitle}>
                Configure your own personalized reminder schedule
              </Text>
            </View>
          </View>
          {isCustomMode && (
            <View style={styles.checkCircle}>
              <Check size={16} color="#FAF7F2" />
            </View>
          )}
        </Pressable>

        <Text style={styles.hintText}>
          You can always fine-tune or add reminder slots anytime in Settings.
        </Text>
      </ScrollView>

      <OnboardingFooter
        showBack={true}
        onBack={() => setStep(0)}
        primaryText="Continue"
        onPrimary={() => setStep(2)}
        primaryAccessibilityLabel="Continue to reminder times"
      />
    </View>
  );

  // ── Step 2: Reminder Times (Scroll/Wheel Time Picker) ───────────────────
  const renderReminderTimesStep = () => (
    <View style={styles.stepWrapper}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <View style={styles.iconBadge}>
            <Clock size={32} color={colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Reminder Times</Text>
          <Text style={styles.stepSubtitle}>
            Your daily reminders will arrive at these scheduled times. Tap any slot to adjust with the time wheel.
          </Text>
        </View>

        {/* Slot Cards List */}
        <View style={styles.timesList}>
          {reminderTimes.map((timeStr, idx) => (
            <View key={idx} style={styles.slotCard}>
              <View style={styles.slotLeft}>
                <View style={styles.slotBadge}>
                  <Text style={styles.slotBadgeText}>Slot #{idx + 1}</Text>
                </View>
                <Text style={styles.slotTimeText}>
                  {formatTime12hDisplay(timeStr)}
                </Text>
              </View>

              <View style={styles.slotActions}>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => handleOpenEditSlot(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit slot ${idx + 1}`}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>

                {reminderTimes.length > 1 && (
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleRemoveSlot(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete slot ${idx + 1}`}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Add Slot Button (Custom Mode or anytime user wants to add) */}
        {isCustomMode && (
          <Pressable
            style={styles.addSlotBtn}
            onPress={handleOpenAddSlot}
            accessibilityRole="button"
            accessibilityLabel="Add reminder time"
          >
            <Plus size={18} color={colors.primary} />
            <Text style={styles.addSlotBtnText}>+ সময় যোগ করুন (Add Reminder Time)</Text>
          </Pressable>
        )}
      </ScrollView>

      <OnboardingFooter
        showBack={true}
        onBack={() => setStep(1)}
        primaryText="Continue"
        onPrimary={() => setStep(3)}
        primaryAccessibilityLabel="Continue to permissions"
      />
    </View>
  );

  // ── Step 3: Enable Reminders (Strict Deterministic Permission Gate) ───────
  const renderPermissionsStep = () => (
    <View style={styles.stepWrapper}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <View style={styles.iconBadge}>
            <Shield size={32} color={colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Enable Reminders</Text>
          <Text style={styles.stepSubtitle}>
            Muzakkir needs these 3 Android capabilities to deliver your reflections reliably.
          </Text>
        </View>

        {/* 3 Capability Rows */}
        <View style={styles.capabilitiesContainer}>
          {/* 1. Notifications */}
          <View style={styles.capabilityCard}>
            <View style={styles.capabilityInfo}>
              <View style={styles.capabilityHeader}>
                <Bell size={18} color={colors.primary} />
                <Text style={styles.capabilityTitle}>Notifications</Text>
              </View>
              <Text style={styles.capabilityDesc}>
                Receive your scheduled reminder notifications.
              </Text>
            </View>
            {permStatus.notifications ? (
              <View style={styles.grantedPill}>
                <Check size={14} color="#0A4D3C" />
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            ) : (
              <Pressable
                style={styles.enableBtn}
                onPress={async () => {
                  await requestNotificationCapability();
                  setTimeout(refreshPermissions, 1000);
                }}
                accessibilityRole="button"
                accessibilityLabel="Enable notifications"
              >
                <Text style={styles.enableBtnText}>Enable</Text>
              </Pressable>
            )}
          </View>

          {/* 2. Floating Reminders (Overlay) */}
          <View style={styles.capabilityCard}>
            <View style={styles.capabilityInfo}>
              <View style={styles.capabilityHeader}>
                <Layers size={18} color={colors.primary} />
                <Text style={styles.capabilityTitle}>Floating Reminders</Text>
              </View>
              <Text style={styles.capabilityDesc}>
                Show spiritual reminder cards above other apps.
              </Text>
            </View>
            {permStatus.overlay ? (
              <View style={styles.grantedPill}>
                <Check size={14} color="#0A4D3C" />
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            ) : (
              <Pressable
                style={styles.enableBtn}
                onPress={async () => {
                  await requestOverlayCapability();
                  setTimeout(refreshPermissions, 1500);
                }}
                accessibilityRole="button"
                accessibilityLabel="Enable floating reminders"
              >
                <Text style={styles.enableBtnText}>Enable</Text>
              </Pressable>
            )}
          </View>

          {/* 3. Precise Timing (Exact Alarms) */}
          <View style={styles.capabilityCard}>
            <View style={styles.capabilityInfo}>
              <View style={styles.capabilityHeader}>
                <Clock size={18} color={colors.primary} />
                <Text style={styles.capabilityTitle}>Precise Timing</Text>
              </View>
              <Text style={styles.capabilityDesc}>
                Deliver reflections at your exact chosen times without delay.
              </Text>
            </View>
            {permStatus.exactAlarm ? (
              <View style={styles.grantedPill}>
                <Check size={14} color="#0A4D3C" />
                <Text style={styles.grantedText}>Enabled</Text>
              </View>
            ) : (
              <Pressable
                style={styles.enableBtn}
                onPress={async () => {
                  await requestExactAlarmCapability();
                  setTimeout(refreshPermissions, 1500);
                }}
                accessibilityRole="button"
                accessibilityLabel="Enable precise reminder timing"
              >
                <Text style={styles.enableBtnText}>Enable</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Secondary: Privacy Guarantee */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>🔒 100% Offline & Private</Text>
          <Text style={styles.privacyDesc}>
            No accounts, no user tracking, and no server sync. Your reminders and preferences stay strictly on your device.
          </Text>
        </View>

        {/* Tertiary: Battery Optimization Note */}
        {Platform.OS === 'android' && (
          <View style={styles.batteryBox}>
            <Text style={styles.batteryTitle}>💡 Reliable Delivery Tip</Text>
            <Text style={styles.batteryDesc}>
              If reminders arrive late, consider disabling battery optimization for Muzakkir in Android Settings.
            </Text>
          </View>
        )}
      </ScrollView>

      <OnboardingFooter
        showBack={true}
        onBack={() => setStep(2)}
        primaryText={isFinishing ? 'Starting...' : 'Start Muzakkir'}
        primaryDisabled={isFinishing}
        onPrimary={handleCompleteOnboarding}
        primaryAccessibilityLabel="Start Muzakkir"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Progress Dots */}
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.progressDot, i === step && styles.progressDotActive]}
          />
        ))}
      </View>

      {step === 0 && renderLanguageStep()}
      {step === 1 && renderFrequencyStep()}
      {step === 2 && renderReminderTimesStep()}
      {step === 3 && renderPermissionsStep()}

      {/* Reusable Wheel Time Picker Modal */}
      <WheelTimePicker
        visible={pickerVisible}
        initialTime={pickerInitialTime}
        title={editingSlotIndex >= 0 ? `Edit Slot #${editingSlotIndex + 1}` : 'Add Reminder Time'}
        cancelText="Cancel"
        confirmText="Confirm"
        onConfirm={handleConfirmPickerTime}
        onCancel={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.parchmentBorder,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  stepWrapper: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySurface,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    marginBottom: 12,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  langRowActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  langMain: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langMainActive: {
    color: colors.primaryDark,
  },
  langSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  langSubActive: {
    color: colors.primary,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  freqCard: {
    width: 96,
    minHeight: 88,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqCardActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  freqNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMuted,
  },
  freqNumActive: {
    color: colors.primary,
  },
  freqLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  freqLabelActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.parchmentBorder,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  customCardActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  customLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIconBadgeActive: {
    backgroundColor: colors.primarySurface,
  },
  customTextContainer: {
    flex: 1,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customTitleActive: {
    color: colors.primaryDark,
  },
  customSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  timesList: {
    marginBottom: 16,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.parchmentBorder,
    marginBottom: 10,
  },
  slotLeft: {
    flex: 1,
  },
  slotBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primarySurface,
    marginBottom: 4,
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  slotTimeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.parchment,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
    marginBottom: 16,
  },
  addSlotBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  capabilitiesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  capabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.parchmentBorder,
  },
  capabilityInfo: {
    flex: 1,
    marginRight: 12,
  },
  capabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  capabilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  capabilityDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  grantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  grantedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A4D3C',
  },
  enableBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  privacyBox: {
    backgroundColor: colors.parchment,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    padding: 14,
    marginBottom: 12,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  batteryBox: {
    backgroundColor: '#FFF8EC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8C97A',
    padding: 14,
    marginBottom: 12,
  },
  batteryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A5200',
    marginBottom: 4,
  },
  batteryDesc: {
    fontSize: 12,
    color: '#5A4000',
    lineHeight: 18,
  },
});
