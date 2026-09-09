import {
  checkAllRequiredCapabilities,
  isNotificationGranted,
  isOverlayGranted,
  isExactAlarmGranted,
} from '../src/services/permissionGateService';
import * as Notifications from 'expo-notifications';
import * as FloatingOverlay from '../src/services/floatingOverlayService';

jest.mock('../src/services/floatingOverlayService', () => ({
  canDrawOverlays: jest.fn(),
  requestOverlayPermission: jest.fn(),
  canScheduleExactAlarms: jest.fn(),
  requestExactAlarmPermission: jest.fn(),
}));

describe('permissionGateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports allGranted: true only when all 3 capabilities are available', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (FloatingOverlay.canDrawOverlays as jest.Mock).mockResolvedValue(true);
    (FloatingOverlay.canScheduleExactAlarms as jest.Mock).mockResolvedValue(true);

    const status = await checkAllRequiredCapabilities();

    expect(status.allGranted).toBe(true);
    expect(status.notifications).toBe(true);
    expect(status.overlay).toBe(true);
    expect(status.exactAlarm).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it('identifies missing notification permission correctly', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (FloatingOverlay.canDrawOverlays as jest.Mock).mockResolvedValue(true);
    (FloatingOverlay.canScheduleExactAlarms as jest.Mock).mockResolvedValue(true);

    const status = await checkAllRequiredCapabilities();

    expect(status.allGranted).toBe(false);
    expect(status.notifications).toBe(false);
    expect(status.overlay).toBe(true);
    expect(status.exactAlarm).toBe(true);
    expect(status.missing).toEqual(['notifications']);
  });

  it('identifies missing overlay permission correctly', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (FloatingOverlay.canDrawOverlays as jest.Mock).mockResolvedValue(false);
    (FloatingOverlay.canScheduleExactAlarms as jest.Mock).mockResolvedValue(true);

    const status = await checkAllRequiredCapabilities();

    expect(status.allGranted).toBe(false);
    expect(status.missing).toEqual(['overlay']);
  });

  it('identifies missing exact alarm permission correctly', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (FloatingOverlay.canDrawOverlays as jest.Mock).mockResolvedValue(true);
    (FloatingOverlay.canScheduleExactAlarms as jest.Mock).mockResolvedValue(false);

    const status = await checkAllRequiredCapabilities();

    expect(status.allGranted).toBe(false);
    expect(status.missing).toEqual(['exactAlarm']);
  });

  it('identifies multiple missing permissions correctly', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (FloatingOverlay.canDrawOverlays as jest.Mock).mockResolvedValue(false);
    (FloatingOverlay.canScheduleExactAlarms as jest.Mock).mockResolvedValue(false);

    const status = await checkAllRequiredCapabilities();

    expect(status.allGranted).toBe(false);
    expect(status.missing).toEqual(['notifications', 'overlay', 'exactAlarm']);
  });
});
