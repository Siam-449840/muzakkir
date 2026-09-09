// Jest unified mock module
// Maps: expo-notifications, expo-sqlite, expo-av (legacy), expo-audio,
//       @react-native-async-storage/async-storage, react-native, lucide-react-native,
//       @react-navigation/*

const asyncStorageStore = {};

// ── expo-av mock (primary — audioService.ts now imports from expo-av) ────────
const mockSound = {
  playAsync: jest.fn().mockResolvedValue({}),
  pauseAsync: jest.fn().mockResolvedValue({}),
  stopAsync: jest.fn().mockResolvedValue({}),
  unloadAsync: jest.fn().mockResolvedValue({}),
  setOnPlaybackStatusUpdate: jest.fn(),
};

const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  InterruptionModeIOS: { DoNotMix: 0 },
  InterruptionModeAndroid: { DoNotMix: 1 },
};

// ── expo-audio mock (kept so any lingering imports don’t hard-crash) ─────────
const createAudioPlayer = jest.fn().mockReturnValue({
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn(),
});
const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

// ── expo-notifications mock ───────────────────────────────────────────────────
const setNotificationHandler = jest.fn();
const setNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const scheduleNotificationAsync = jest.fn().mockImplementation(() =>
  Promise.resolve(`mock-notif-${Date.now()}`)
);
const cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const addNotificationResponseReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
const addNotificationReceivedListener = jest.fn().mockReturnValue({ remove: jest.fn() });
const getLastNotificationResponseAsync = jest.fn().mockResolvedValue(null);
const AndroidImportance = { HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, MAX: 5 };
const AndroidNotificationVisibility = { PUBLIC: 1, PRIVATE: 0, SECRET: -1 };

// ── expo-sqlite mock ──────────────────────────────────────────────────────────
const openDatabaseAsync = jest.fn().mockResolvedValue({
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  execAsync: jest.fn().mockResolvedValue(undefined),
  closeAsync: jest.fn().mockResolvedValue(undefined),
});

// ── AsyncStorage mock (in-memory) ─────────────────────────────────────────────
const asyncStorageMock = {
  getItem: jest.fn((key) => Promise.resolve(asyncStorageStore[key] || null)),
  setItem: jest.fn((key, val) => { asyncStorageStore[key] = val; return Promise.resolve(); }),
  removeItem: jest.fn((key) => { delete asyncStorageStore[key]; return Promise.resolve(); }),
  clear: jest.fn(() => { for (const k in asyncStorageStore) delete asyncStorageStore[k]; return Promise.resolve(); }),
};

// ── React Native mock ─────────────────────────────────────────────────────────
const Platform = { OS: 'android', select: (objs) => objs.android || objs.default };
const Share = { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }) };
const StyleSheet = { create: (styles) => styles, flatten: (s) => s };
const Animated = {
  Value: jest.fn().mockImplementation((val) => ({ interpolate: jest.fn().mockReturnValue({}), setValue: jest.fn(), __getValue: () => val })),
  timing: jest.fn().mockReturnValue({ start: jest.fn((cb) => cb?.()) }),
  spring: jest.fn().mockReturnValue({ start: jest.fn((cb) => cb?.()) }),
  parallel: jest.fn().mockReturnValue({ start: jest.fn((cb) => cb?.()) }),
  sequence: jest.fn().mockReturnValue({ start: jest.fn((cb) => cb?.()) }),
  View: 'Animated.View',
};
const LogBox = { ignoreLogs: jest.fn() };

module.exports = {
  // expo-av (primary audio — audioService.ts now imports from here)
  Audio,

  // expo-audio stubs (kept for backward compat with any residual imports)
  createAudioPlayer,
  setAudioModeAsync,

  // expo-notifications
  setNotificationHandler,
  setNotificationChannelAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  addNotificationResponseReceivedListener,
  addNotificationReceivedListener,
  getLastNotificationResponseAsync,
  AndroidImportance,
  AndroidNotificationVisibility,

  // expo-sqlite
  openDatabaseAsync,

  // async-storage
  ...asyncStorageMock,
  default: asyncStorageMock,

  // react-native
  Platform,
  Share,
  StyleSheet,
  NativeModules: {
    FloatingOverlay: {
      canDrawOverlays: jest.fn().mockResolvedValue(true),
      requestOverlayPermission: jest.fn().mockResolvedValue(true),
      showFloatingReminder: jest.fn().mockResolvedValue(true),
      dismissFloatingReminder: jest.fn().mockResolvedValue(true),
      canScheduleExactAlarms: jest.fn().mockResolvedValue(true),
      requestExactAlarmPermission: jest.fn().mockResolvedValue(true),
      scheduleExactReminderAlarm: jest.fn().mockResolvedValue({ scheduled: true, exact: true }),
      cancelReminderAlarm: jest.fn().mockResolvedValue(true),
      cancelAllReminderAlarms: jest.fn().mockResolvedValue(true),
      getInitialReminderLaunchIntent: jest.fn().mockResolvedValue(null),
    },
  },
  DeviceEventEmitter: {
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    emit: jest.fn(),
  },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Modal: 'Modal',
  Switch: 'Switch',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  TouchableOpacity: 'TouchableOpacity',
  RefreshControl: 'RefreshControl',
  Animated,
  LogBox,

  // lucide-react-native (icon stubs)
  Bell: 'Bell',
  Clock: 'Clock',
  Globe: 'Globe',
  Moon: 'Moon',
  BookOpen: 'BookOpen',
  Bookmark: 'Bookmark',
  Search: 'Search',
  Settings: 'Settings',
  ChevronRight: 'ChevronRight',
  Share2: 'Share2',
  X: 'X',

  // @react-navigation stubs
  useNavigation: jest.fn().mockReturnValue({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: jest.fn().mockReturnValue({ params: {} }),
  createNativeStackNavigator: jest.fn(),
  NavigationContainer: 'NavigationContainer',
};
