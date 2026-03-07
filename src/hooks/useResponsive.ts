import { Platform, useWindowDimensions } from 'react-native';

const DESKTOP_BREAKPOINT = 768;
const DESKTOP_CONTENT_WIDTH = 720;

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  return {
    isDesktop,
    contentMaxWidth: isDesktop ? DESKTOP_CONTENT_WIDTH : undefined,
    screenWidth: width,
  };
}
