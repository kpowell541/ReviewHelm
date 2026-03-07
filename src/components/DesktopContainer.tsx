import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function DesktopContainer({ children, style }: Props) {
  const { isDesktop, contentMaxWidth } = useResponsive();

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
