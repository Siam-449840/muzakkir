import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResponsiveLayoutInfo {
  width: number;
  height: number;
  isCompact: boolean;    // < 360dp width (narrow devices)
  isMedium: boolean;     // 360dp - 599dp (standard/flagship phones in portrait)
  isExpanded: boolean;   // >= 600dp (tablets, foldables, wide landscape)
  isLandscape: boolean;
  readableWidth: number; // Max 680dp for optimal reading line length
  modalWidth: number;    // Max 480dp for centered dialogs on tablets
  floatingCardWidth: number; // Responsive floating reminder width (88-92% on phones, max 520dp on tablets)
  floatingCardMaxHeight: number; // 70-75% of usable window height
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function useResponsive(): ResponsiveLayoutInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const isCompact = width < 360;
  const isMedium = width >= 360 && width < 600;
  const isExpanded = width >= 600;

  const readableWidth = Math.min(width, 680);
  const modalWidth = Math.min(width - 32, 480);

  // Floating card responsive geometry:
  // Phones: 90% of usable screen width (clamped between 280dp and 480dp)
  // Tablets / Large screens: Capped at 520dp with safe margins
  const floatingCardWidth = isExpanded
    ? Math.min(Math.round(width * 0.70), 520)
    : Math.max(280, Math.min(Math.round(width * 0.90), 480));

  // Max 72% of usable screen height
  const floatingCardMaxHeight = Math.round(height * 0.72);

  return {
    width,
    height,
    isCompact,
    isMedium,
    isExpanded,
    isLandscape,
    readableWidth,
    modalWidth,
    floatingCardWidth,
    floatingCardMaxHeight,
    insets,
  };
}
