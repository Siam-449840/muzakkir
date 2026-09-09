import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Pressable,
  TextInput, Alert, Platform, TouchableOpacity, AppState, Linking,
} from 'react-native';
import { colors, space, radius, touchTarget } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { UserSettings, DailyFrequency, SupportedQuranLanguage, LANGUAGE_OPTIONS } from '../types';
import { loadUserSettings, saveUserSettings, defaultSettings } from '../database/db';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { SafeContentArea } from '../components/common/SafeContentArea';
import { LanguagePicker } from '../components/common/LanguagePicker';
import { scheduleNotificationsForSettings, isTimeInQuietHours } from '../services/notificationService';
import {
  showFloatingReminder,
  scheduleExactReminderAlarm,
} from '../services/floatingOverlayService';
import {
  isOverlayGranted,
  requestOverlayCapability,
  isExactAlarmGranted,
  requestExactAlarmCapability,
} from '../services/permissionGateService';
import {
  WheelTimePicker,
  formatTime12hDisplay,
  sortTimesChronologically,
  isDuplicateTime,
} from '../components/common/WheelTimePicker';
import { isValid24hTime } from '../utils/time';
import { toBengaliNumerals } from '../utils/bengaliNumerals';
import {
  Bell, Clock, Globe, Moon, BookMarked,
  History, Shield, ChevronRight, Check, Sliders, Layers, Sparkles, AlertCircle, Plus, Trash2,
} from 'lucide-react-native';

const DEFAULT_TIME_PRESETS: Record<DailyFrequency, string[]> = {
  1: ['08:00'],
  2: ['08:00', '19:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['07:30', '12:30', '17:30', '21:00'],
  5: ['06:30', '10:30', '14:30', '18:30', '21:30'],
};

interface SettingsScreenProps {
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<UserSettings>(defaultSettings);
  const [langPickerVisible, setLangPickerVisible] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Wheel time picker state
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerEditIndex, setPickerEditIndex] = useState<number>(-1); // -1 = adding new
  const [pickerInitialTime, setPickerInitialTime] = useState<string>('08:00');

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean>(false);
  const [hasExactAlarmPermission, setHasExactAlarmPermission] = useState<boolean>(true);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const overlayPerm = await isOverlayGranted();
      setHasOverlayPermission(overlayPerm);
      const exactAlarmPerm = await isExactAlarmGranted();
      setHasExactAlarmPermission(exactAlarmPerm);
    }
  }, []);

  useEffect(() => {
    loadUserSettings().then((s: UserSettings) => {
      setSettings(s);
      setSavedSettings(s);
      const preset = DEFAULT_TIME_PRESETS[s.daily_frequency];
      const matchesPreset = preset && JSON.stringify(s.reminder_times) === JSON.stringify(preset);
      setIsCustomMode(!matchesPreset);
    });
    checkPermission();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermission]);

  const ensureOverlayPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    const perm = await isOverlayGranted();
    if (!perm) {
      Alert.alert(
        'অন্য অ্যাপের ওপর প্রদর্শনের অনুমতি প্রয়োজন',
        'আপনার নির্ধারিত সময়ে কুরআনিক ও হাদিসের রিমাইন্ডার প্রদর্শন করতে অনুগ্রহ করে "Display over other apps" অনুমতিটি চালু করুন।',
        [
          { text: 'বাতিল', style: 'cancel' },
          {
            text: 'সেটিংসে যান',
            onPress: async () => {
              await requestOverlayCapability();
              setTimeout(checkPermission, 1500);
            },
          },
        ]
      );
      return false;
    }
    return true;
  };

  const handleTestOverlay = async () => {
    if (!(await ensureOverlayPermission())) return;

    await showFloatingReminder({
      content_id: "quran_001_001",
      content_type: "quran",
      reference: "সূরা আল-ফাতিহা ১:১",
      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      translation: "শুরু করছি আল্লাহর নামে যিনি পরম করুণাময়, অতি দয়ালু।",
      badge: "কুরআনুল কারীম",
      category: "রহমত ও অনুধ্যান",
      reflection: "আজকের দিনে এই আয়াত কীভাবে আপনার অন্তরে তাওয়াক্কুল ও রহমত জাগ্রত করছে?",
      surah_number: 1,
      ayah_start: 1,
      ayah_end: 1,
      language: "bn",
    });
  };

  const handleTestHadithOverlay = async () => {
    if (!(await ensureOverlayPermission())) return;

    await showFloatingReminder({
      content_id: "hadith_bukhari_1",
      content_type: "hadith",
      reference: "সহিহ বুখারী, হাদিস ১",
      arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ.",
      translation: "কাজের ফলাফল নিয়তের ওপর নির্ভরশীল। প্রত্যেকে যা নিয়ত করবে তাই পাবে। সুতরাং যার হিজরত হবে দুনিয়া লাভের উদ্দেশ্যে কিংবা কোনো নারীকে বিয়ে করার উদ্দেশ্যে, তবে তার হিজরত সেই উদ্দেশ্যেই গণ্য হবে যার জন্য সে হিজরত করেছে।",
      badge: "সহিহ হাদিস",
      category: "নিয়তের গুরুত্ব",
      reflection: "প্রত্যেক নেক আমল শুরু করার পূর্বে নিজের নিয়তকে একমাত্র আল্লাহর সন্তুষ্টির জন্য খাঁটি করুন।",
      narrator: "আমীরুল মুমিনীন উমর ইবনুল খাত্তাব (রাঃ)",
      grade: "সহিহ",
      chapter_title: "ওহীর সূচনা",
      section_title: "কীভাবে রাসূলুল্লাহর (সাঃ) ওপর ওহীর সূচনা হয়েছিল",
      note: "ইমাম বুখারী (রহ.) নিয়তের ইখলাসকে সকল আমলের প্রাণ হিসেবে প্রতিষ্ঠিত করতে এই হাদিস দিয়ে তাঁর জামে সহিহ গ্রন্থটি শুরু করেছেন।",
      collection_key: "bukhari",
      hadith_number: 1,
      language: "bn",
    });
  };

  const handleTestTimedOverlay = async () => {
    if (!(await ensureOverlayPermission())) return;

    const triggerMs = Date.now() + 10000;
    await scheduleExactReminderAlarm(triggerMs, {
      content_id: "quran_qr_0001",
      content_type: "quran",
      reference: "সূরা আল-ফাতিহা ১:১–৭",
      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ۝ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ مَٰলِكِ يَوْمِ ٱلدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ ٱهْدِنَا ٱلصِّরَٰطَ ٱلْمُسْتَقِيمَ ۝ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
      translation: "১. শুরু করছি আল্লাহর নামে যিনি পরম করুণাময়, অতি দয়ালু।\n২. সমস্ত প্রশংসা আল্লাহর জন্য, যিনি সকল সৃষ্টির পালনকর্তা।\n৩. যিনি পরম করুণাময়, অতি দয়ালু।\n৪. বিচার দিবসের মালিক।\n৫. আমরা একমাত্র তোমারই ইবাদত করি এবং শুধুমাত্র তোমারই কাছে সাহায্য প্রার্থনা করি।\n৬. আমাদেরকে সরল সঠিক পথ প্রদর্শন করুন।\n৭. তাদের পথ, যাদেরকে তুমি নেয়ামত দান করেছ; তাদের পথ নয়, যারা গজবগ্রস্ত ও পথভ্রষ্ট হয়েছে।",
      badge: "কুরআনুল কারীম",
      category: "উম্মুল কিতাব",
      reflection: "প্রতিদিন সালাতে আমরা এই আয়াতগুলো পাঠ করি—এটি বান্দা ও তার রবের মাঝে এক গভীর চুক্তি।",
      surah_number: 1,
      ayah_start: 1,
      ayah_end: 7,
      language: "bn",
    });
    Alert.alert(
      "১০ সেকেন্ডের রিয়েল টাইমার সক্রিয়",
      "ঠিক ১০ সেকেন্ড পর AlarmManager কার্ডটি ভাসিয়ে তুলবে। আপনি এখন যেকোনো অন্য অ্যাপে (হোমস্ক্রিন, WhatsApp ইত্যাদি) গিয়ে দেখতে পারেন।"
    );
  };

  const handleFrequencyChange = (freq: DailyFrequency) => {
    setIsCustomMode(false);
    const times = DEFAULT_TIME_PRESETS[freq] || DEFAULT_TIME_PRESETS[3];
    setSettings(prev => ({
      ...prev,
      daily_frequency: freq,
      reminder_times: [...times],
    }));
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
  };

  const handleOpenAddPicker = () => {
    setIsCustomMode(true);
    setPickerEditIndex(-1);
    let newTime = '12:00';
    if (settings.reminder_times.length > 0) {
      const last = settings.reminder_times[settings.reminder_times.length - 1];
      const [h, m] = last.split(':').map(Number);
      if (!isNaN(h)) {
        const nextH = (h + 3) % 24;
        newTime = `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      }
    }
    setPickerInitialTime(newTime);
    setPickerVisible(true);
  };

  const handleOpenEditPicker = (index: number) => {
    setPickerEditIndex(index);
    setPickerInitialTime(settings.reminder_times[index] || '08:00');
    setPickerVisible(true);
  };

  const handlePickerConfirm = (canonicalTime24: string) => {
    setPickerVisible(false);
    if (isDuplicateTime(canonicalTime24, settings.reminder_times, pickerEditIndex)) {
      Alert.alert(
        'সময়টি ইতিমধ্যে নির্ধারিত',
        'এই রিমাইন্ডার সময়টি ইতিমধ্যে তালিকায় রয়েছে। অনুগ্রহ করে অন্য একটি সময় নির্বাচন করুন।'
      );
      return;
    }

    let updated: string[];
    if (pickerEditIndex >= 0) {
      updated = [...settings.reminder_times];
      updated[pickerEditIndex] = canonicalTime24;
    } else {
      updated = [...settings.reminder_times, canonicalTime24];
    }

    const sorted = sortTimesChronologically(updated);
    setSettings(prev => ({
      ...prev,
      daily_frequency: Math.min(Math.max(sorted.length, 1), 5) as DailyFrequency,
      reminder_times: sorted,
    }));
  };

  const handleRemoveSlot = (index: number) => {
    if (settings.reminder_times.length <= 1) {
      Alert.alert('সতর্কতা', 'কমপক্ষে একটি রিমাইন্ডার সময় আবশ্যক।');
      return;
    }
    setIsCustomMode(true);
    const times = settings.reminder_times.filter((_, i) => i !== index);
    setSettings(prev => ({
      ...prev,
      daily_frequency: Math.min(Math.max(times.length, 1), 5) as DailyFrequency,
      reminder_times: times,
    }));
  };

  const handleSave = useCallback(async (): Promise<boolean> => {
    // 1. Validate 24-hr format
    const invalidSlot = settings.reminder_times.find(t => !isValid24hTime(t.trim()));
    if (invalidSlot) {
      Alert.alert(
        'ভুল সময় বিন্যাস',
        `"${invalidSlot}" একটি সঠিক সময় নয়। অনুগ্রহ করে ২৪-ঘণ্টা বিন্যাসে (HH:MM, যেমন: 08:30 বা 19:45) লিখুন।`
      );
      return false;
    }

    // 2. Deduplicate identical times and sort chronologically
    const uniqueSorted = Array.from(
      new Set(settings.reminder_times.map(t => t.trim()))
    ).sort((a, b) => {
      const [hA, mA] = a.split(':').map(Number);
      const [hB, mB] = b.split(':').map(Number);
      return hA * 60 + mA - (hB * 60 + mB);
    });

    if (uniqueSorted.length === 0) {
      Alert.alert('সতর্কতা', 'অনুগ্রহ করে অন্তত একটি সঠিক রিমাইন্ডার সময় নির্ধারণ করুন।');
      return false;
    }

    const normalizedFreq = Math.min(Math.max(uniqueSorted.length, 1), 5) as DailyFrequency;

    const finalSettings: UserSettings = {
      ...settings,
      daily_frequency: normalizedFreq,
      reminder_times: uniqueSorted,
    };

    setSaving(true);
    try {
      await saveUserSettings(finalSettings);
      await scheduleNotificationsForSettings(finalSettings);
      setSettings(finalSettings);
      setSavedSettings(finalSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      return true;
    } catch (e) {
      Alert.alert('সংরক্ষণ ব্যর্থ', 'সেটিংস সংরক্ষণ করা সম্ভব হয়নি। পুনরায় চেষ্টা করুন।');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  // Prompt before navigating back if there are uncommitted settings
  useEffect(() => {
    if (!navigation?.addListener) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        'সংরক্ষণ না করা পরিবর্তন রয়েছে',
        'আপনার করা পরিবর্তনগুলো সংরক্ষণ করতে চান নাকি পরিত্যাগ করবেন?',
        [
          {
            text: 'পরিত্যাগ করুন',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'সংরক্ষণ করুন',
            onPress: async () => {
              const ok = await handleSave();
              if (ok) {
                navigation.dispatch(e.data.action);
              }
            },
          },
          {
            text: 'ফিরে যান',
            style: 'cancel',
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, isDirty, handleSave]);

  const PRIVACY_POLICY_URL = 'https://gist.github.com/Siam-449840/a4d6a1f86d6a7013b96de354b72a5307';

  const navLink = (label: string, icon: React.ReactNode, screenName: string) => (
    <Pressable
      style={styles.navLinkRow}
      onPress={() => navigation?.navigate(screenName)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.navLinkLeft}>
        <View style={styles.navLinkIconCircle}>{icon}</View>
        <Text style={styles.navLinkLabel}>{label}</Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );

  const externalLink = (label: string, icon: React.ReactNode, url: string) => (
    <Pressable
      style={styles.navLinkRow}
      onPress={() => Linking.openURL(url).catch(err => console.warn('Could not open URL:', err))}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <View style={styles.navLinkLeft}>
        <View style={styles.navLinkIconCircle}>{icon}</View>
        <Text style={styles.navLinkLabel}>{label}</Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <ScreenContainer statusBarStyle="dark-content">
      <ScreenHeader
        title="সেটিংস ও পছন্দসমূহ"
        subtitle="দৈনিক রিমাইন্ডার ও ব্যক্তিগত কাস্টমাইজেশন"
        lang="bn"
      />

      <SafeContentArea style={styles.container}>
        {/* Save Bar / Status */}
        {isDirty ? (
          <TouchableOpacity
            style={[styles.saveBanner, saving && styles.saveBannerSaving]}
            onPress={() => handleSave()}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Check size={16} color="#FAF7F2" />
            <Text style={styles.saveBannerText}>
              {saving ? 'সংরক্ষণ করা হচ্ছে…' : 'পরিবর্তন সংরক্ষণ করুন'}
            </Text>
          </TouchableOpacity>
        ) : saveSuccess ? (
          <View style={[styles.saveBanner, styles.saveBannerSuccess]}>
            <Check size={16} color="#FAF7F2" />
            <Text style={styles.saveBannerText}>সেটিংস সফলভাবে সংরক্ষিত ও কার্যকর হয়েছে</Text>
          </View>
        ) : (
          <View style={styles.cleanStatusRow}>
            <Check size={14} color="#1A6B3C" />
            <Text style={styles.cleanStatusText}>সব সেটিংস সংরক্ষিত রয়েছে</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── ১. দৈনিক রিমাইন্ডার ও সময়সূচি ───────────────────────────── */}
          <Text style={styles.sectionLabel}>১. দৈনিক রিমাইন্ডার ও সময়সূচি</Text>

          <View style={[styles.card, shadows.cardLow]}>
            <View style={styles.cardHeader}>
              <Sliders size={16} color={colors.primaryDark} />
              <Text style={styles.cardTitle}>দৈনিক পুনরাবৃত্তি সংখ্যা</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              প্রতিদিন কয়টি আধ্যাত্মিক মুহূর্ত স্মরণ করতে চান (১–৫ বার অথবা কাস্টম):
            </Text>
            <View style={styles.freqRow}>
              {([1, 2, 3, 4, 5] as DailyFrequency[]).map(freq => {
                const isSelected = !isCustomMode && settings.daily_frequency === freq && settings.reminder_times.length === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => handleFrequencyChange(freq)}
                    style={[styles.freqBtn, isSelected && styles.freqBtnActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.freqBtnText, isSelected && styles.freqBtnTextActive]}>
                      {toBengaliNumerals(freq)} বার
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={handleSelectCustom}
                style={[styles.freqBtn, isCustomMode && styles.freqBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isCustomMode }}
              >
                <Text style={[styles.freqBtnText, isCustomMode && styles.freqBtnTextActive]}>
                  কাস্টম
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, shadows.cardLow]}>
            <View style={styles.cardHeader}>
              <Clock size={16} color={colors.primaryDark} />
              <Text style={styles.cardTitle}>নির্দিষ্ট রিমাইন্ডারের সময়</Text>
            </View>
            <Text style={styles.cardSubtitle}>প্রতিটি স্লটের সময় নির্ধারণ বা পরিবর্তন করতে ট্যাপ করুন:</Text>

            {settings.reminder_times.map((time: string, idx: number) => {
              const isValid = isValid24hTime(time);
              const inQuiet =
                settings.quiet_hours_enabled &&
                isValid &&
                isTimeInQuietHours(time, settings.quiet_hours_start, settings.quiet_hours_end);
              return (
                <View key={idx} style={styles.timeSlotWrapper}>
                  <View style={styles.timeSlotRow}>
                    <Text style={styles.slotLabel}>স্লট {toBengaliNumerals(idx + 1)}</Text>
                    <View style={styles.slotInputGroup}>
                      <TouchableOpacity
                        style={styles.timePickerTrigger}
                        onPress={() => handleOpenEditPicker(idx)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`স্লট ${idx + 1} সময় পরিবর্তন করুন, বর্তমান সময় ${formatTime12hDisplay(time)}`}
                      >
                        <Text style={styles.timePickerTriggerText}>
                          {formatTime12hDisplay(time)}
                        </Text>
                      </TouchableOpacity>
                      {settings.reminder_times.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteSlotBtn}
                          onPress={() => handleRemoveSlot(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`স্লট ${idx + 1} মুছে ফেলুন`}
                        >
                          <Trash2 size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {inQuiet && (
                    <View style={styles.quietNoticeRow}>
                      <AlertCircle size={13} color={colors.goldDark} style={{ marginRight: 4 }} />
                      <Text style={styles.quietWarnText}>
                        স্লট {toBengaliNumerals(idx + 1)} ({time}) নীরব সময়ে পড়ছে — তা স্বয়ংক্রিয়ভাবে {settings.quiet_hours_end}-এ স্থানান্তরিত হবে।
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Slot Button */}
            <TouchableOpacity
              style={styles.addSlotBtn}
              onPress={handleOpenAddPicker}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="নতুন রিমাইন্ডার স্লট যোগ করুন"
            >
              <Plus size={15} color={colors.primaryDark} style={{ marginRight: 6 }} />
              <Text style={styles.addSlotBtnText}>নতুন সময় যোগ করুন</Text>
            </TouchableOpacity>
          </View>

          {/* ── ২. ভাষা ও অনুবাদ ────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>২. ভাষা ও অনুবাদ</Text>

          <View style={[styles.card, shadows.cardLow]}>
            <View style={styles.cardHeader}>
              <Globe size={16} color={colors.primaryDark} />
              <Text style={styles.cardTitle}>কুরআনের অনুবাদের ভাষা</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              কুরআনের আয়াতসমূহ আপনার নির্বাচিত অনুবাদ ভাষায় প্রদর্শিত হবে। হাদিস শরিফ বিশুদ্ধ আরবি মূলসহ প্রাঞ্জল বাংলায় উপস্থাপিত হয়। মূল আরবি টেক্সট সবসময় অপরিবর্তিত থাকবে।
            </Text>
            <TouchableOpacity
              onPress={() => setLangPickerVisible(true)}
              style={styles.langSelectorBox}
              accessibilityRole="button"
            >
              <Text style={styles.langSelectorText}>
                {LANGUAGE_OPTIONS.find(l => l.code === settings.preferred_language)?.nativeName || settings.preferred_language.toUpperCase()} ({settings.preferred_language.toUpperCase()}) — পরিবর্তন করতে স্পর্শ করুন
              </Text>
              <ChevronRight size={16} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* ── ৩. নোটিফিকেশন ও নীরব সময় ───────────────────────────────── */}
          <Text style={styles.sectionLabel}>৩. নোটিফিকেশন ও নীরব সময়</Text>

          <View style={[styles.card, shadows.cardLow]}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.toggleTitle}>নোটিফিকেশন সাউন্ড</Text>
                <Text style={styles.toggleSubtitle}>রিমাইন্ডার আসার সময় মৃদু অডিও শব্দ</Text>
              </View>
              <Switch
                value={settings.sound_enabled}
                onValueChange={val => setSettings(prev => ({ ...prev, sound_enabled: val }))}
                trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
                thumbColor={settings.sound_enabled ? colors.primaryDark : '#FFFFFF'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.toggleTitle}>কম্পন সংকেত</Text>
                <Text style={styles.toggleSubtitle}>মৃদু স্পর্শ সংবেদনশীল প্রতিক্রিয়া</Text>
              </View>
              <Switch
                value={settings.vibration_enabled}
                onValueChange={val => setSettings(prev => ({ ...prev, vibration_enabled: val }))}
                trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
                thumbColor={settings.vibration_enabled ? colors.primaryDark : '#FFFFFF'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <View style={styles.cardHeader}>
                  <Moon size={15} color={colors.primaryDark} />
                  <Text style={styles.cardTitle}>নীরব সময়</Text>
                </View>
                <Text style={styles.toggleSubtitle}>
                  ঘুমের সময় রিমাইন্ডার বন্ধ থাকবে এবং ঘুম ভাঙার সময়ে তা প্রদর্শিত হবে।
                </Text>
              </View>
              <Switch
                value={settings.quiet_hours_enabled}
                onValueChange={val => setSettings(prev => ({ ...prev, quiet_hours_enabled: val }))}
                trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
                thumbColor={settings.quiet_hours_enabled ? colors.primaryDark : '#FFFFFF'}
              />
            </View>

            {settings.quiet_hours_enabled && (
              <View style={styles.quietRow}>
                <View style={styles.quietCol}>
                  <Text style={styles.quietLabel}>ঘুমের শুরু (HH:MM)</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={settings.quiet_hours_start}
                    maxLength={5}
                    onChangeText={val => setSettings(prev => ({ ...prev, quiet_hours_start: val }))}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.quietCol}>
                  <Text style={styles.quietLabel}>ঘুমের শেষ (HH:MM)</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={settings.quiet_hours_end}
                    maxLength={5}
                    onChangeText={val => setSettings(prev => ({ ...prev, quiet_hours_end: val }))}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}
          </View>

          {/* ── ৪. ফ্লোটিং স্ক্রিন রিমাইন্ডার (Android) ─────────────────────── */}
          {Platform.OS === 'android' && (
            <>
              <Text style={styles.sectionLabel}>৪. ফ্লোটিং স্ক্রিন রিমাইন্ডার</Text>
              <View style={[styles.card, shadows.cardLow]}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLeft}>
                    <View style={styles.cardHeader}>
                      <Layers size={16} color={colors.primaryDark} />
                      <Text style={styles.cardTitle}>অন্য অ্যাপের ওপর প্রদর্শন</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      {hasOverlayPermission
                        ? 'সক্রিয়: নির্ধারিত সময়ে সরাসরি অন্যান্য অ্যাপ বা হোমস্ক্রিনের ওপর স্মরণ কার্ড ভেসে উঠবে।'
                        : 'অন্যান্য অ্যাপ্লিকেশনের ওপর ফ্লোটিং রিমাইন্ডার কার্ড দেখানোর জন্য এই অনুমতিটি প্রয়োজন।'}
                    </Text>
                  </View>
                  {!hasOverlayPermission ? (
                    <TouchableOpacity
                      style={styles.grantBtn}
                      onPress={async () => {
                        await requestOverlayCapability();
                        setTimeout(checkPermission, 1500);
                      }}
                    >
                      <Text style={styles.grantBtnText}>অনুমতি দিন</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.grantedBadge}>
                      <Check size={14} color="#1A6B3C" />
                      <Text style={styles.grantedText}>সক্রিয়</Text>
                    </View>
                  )}
                </View>

                {!hasExactAlarmPermission && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.switchRow}>
                      <View style={styles.switchLeft}>
                        <View style={styles.cardHeader}>
                          <Clock size={16} color={colors.primaryDark} />
                          <Text style={styles.cardTitle}>নিখুঁত সময়ের অ্যালার্ম</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>
                          Android ডিভাইসে সেকেন্ডের নিখুঁত হিসেবে রিমাইন্ডার চালুর জন্য প্রয়োজন।
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={async () => {
                          await requestExactAlarmCapability();
                          setTimeout(checkPermission, 1500);
                        }}
                      >
                        <Text style={styles.grantBtnText}>অনুমতি দিন</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={styles.divider} />

                {/* Test Controls */}
                <Text style={styles.testSectionTitle}>পরীক্ষামূলক ফ্লোটিং কার্ড যাচাই:</Text>

                <View style={styles.testButtonsContainer}>
                  <TouchableOpacity
                    style={styles.testBtnSecondary}
                    onPress={handleTestOverlay}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.testBtnSecondaryText}>কুরআন ফ্লোটিং কার্ড পরীক্ষা</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testBtnSecondary}
                    onPress={handleTestHadithOverlay}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.testBtnSecondaryText}>হাদিস ফ্লোটিং কার্ড পরীক্ষা</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testBtnPrimary}
                    onPress={handleTestTimedOverlay}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={14} color="#FAF7F2" style={{ marginRight: 6 }} />
                    <Text style={styles.testBtnPrimaryText}>১০ সেকেন্ডের রিয়েল টাইমার পরীক্ষা</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ── ৫. আপনার সংরক্ষিত তথ্য ──────────────────────────────────── */}
          <Text style={styles.sectionLabel}>৫. আপনার সংরক্ষিত তথ্য</Text>

          <View style={[styles.card, shadows.cardLow]}>
            {navLink('সংরক্ষিত আয়াত ও হাদিস', <BookMarked size={16} color={colors.primaryDark} />, 'BookmarksScreen')}
            <View style={styles.divider} />
            {navLink('রিমাইন্ডারের ইতিহাস', <History size={16} color={colors.primaryDark} />, 'HistoryScreen')}
          </View>

          {/* ── ৬. নির্ভরযোগ্যতা ও বিশ্বাস ──────────────────────────────── */}
          <Text style={styles.sectionLabel}>৬. নির্ভরযোগ্যতা ও বিশ্বাস</Text>

          <View style={[styles.card, shadows.cardLow]}>
            {navLink('উৎস ও নির্ভরযোগ্যতা নীতি', <Shield size={16} color={colors.primaryDark} />, 'SourcesScreen')}
            <View style={styles.divider} />
            {externalLink('গোপনীয়তা নীতি (Privacy Policy)', <Shield size={16} color={colors.primaryDark} />, PRIVACY_POLICY_URL)}
            <View style={styles.divider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutText}>
                কুরআন ও হাদিসের সকল টেক্সট, অনুবাদ এবং আপনার রিমাইন্ডার শিডিউল সম্পূর্ণ অফলাইনে ডিভাইসে সংরক্ষিত থাকে। তিলাওয়াত শোনার সময় ইন্টারনেট থেকে অডিও স্ট্রিম করা হয়। অ্যাপটি কোনো ব্যক্তিগত তথ্য সংগ্রহ বা ট্র্যাক করে না।
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeContentArea>

      {/* Language Picker Modal */}
      <LanguagePicker
        visible={langPickerVisible}
        selectedLanguage={settings.preferred_language}
        onSelectLanguage={(lang: SupportedQuranLanguage) => {
          setSettings(prev => ({ ...prev, preferred_language: lang }));
          setLangPickerVisible(false);
        }}
        onClose={() => setLangPickerVisible(false)}
        lang="bn"
      />

      {/* Wheel Time Picker Modal */}
      <WheelTimePicker
        visible={pickerVisible}
        initialTime={pickerInitialTime}
        title={pickerEditIndex >= 0 ? `স্লট ${toBengaliNumerals(pickerEditIndex + 1)} সময় পরিবর্তন` : 'নতুন রিমাইন্ডার সময় যোগ করুন'}
        cancelText="বাতিল"
        confirmText="নিশ্চিত করুন"
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.min,
    backgroundColor: colors.primaryDark,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  saveBannerSaving: {
    backgroundColor: colors.textSecondary,
  },
  saveBannerSuccess: {
    backgroundColor: '#1A6B3C',
  },
  saveBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  cleanStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8F5',
    paddingVertical: 8,
    paddingHorizontal: space.md,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EFE7',
  },
  cleanStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A6B3C',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: space.xxl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: space.sm,
    marginTop: space.md,
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: space.sm,
  },
  freqRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqBtnActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  freqBtnTextActive: {
    color: '#FAF7F2',
    fontWeight: '700',
  },
  timeSlotWrapper: {
    marginBottom: space.xs,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  slotLabel: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.textPrimary,
    width: 80,
    textAlign: 'center',
    fontWeight: '600',
  },
  timeInputInvalid: {
    borderColor: '#C53030',
    backgroundColor: '#FFF5F5',
  },
  slotInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  timePickerTrigger: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  deleteSlotBtn: {
    padding: 6,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    marginTop: space.sm,
    minHeight: 44,
  },
  addSlotBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  quietNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  quietWarnText: {
    fontSize: 11,
    color: colors.goldDark,
    flex: 1,
    lineHeight: 16,
  },
  langSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min,
    padding: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  langSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
    marginRight: space.sm,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: space.sm,
  },
  quietRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.sm,
    paddingTop: space.xs,
  },
  quietCol: {
    flex: 1,
  },
  quietLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  grantBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#E6F4EA',
    minHeight: 44,
  },
  grantedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6B3C',
    marginLeft: 4,
  },
  testSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: space.xs,
  },
  testButtonsContainer: {
    gap: space.xs,
  },
  testBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  testBtnPrimary: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.sm,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  testBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF7F2',
  },
  navLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    minHeight: 48,
  },
  navLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navLinkIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.parchmentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  navLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aboutRow: {
    paddingVertical: space.xs,
  },
  aboutText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
