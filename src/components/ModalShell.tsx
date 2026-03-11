import React from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isDesktop?: boolean;
}

export function ModalShell({
  visible,
  onClose,
  title,
  children,
  isDesktop: isDesktopProp,
}: ModalShellProps) {
  const responsive = useResponsive();
  const isDesktop = isDesktopProp ?? responsive.isDesktop;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={[styles.overlay, isDesktop && styles.overlayDesktop]}
        accessible={false}
      >
        <View
          style={[styles.card, isDesktop && styles.cardDesktop]}
          accessibilityViewIsModal={true}
          accessibilityRole="none"
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  cardDesktop: {
    width: 520,
    maxHeight: '80%',
    borderRadius: radius.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
});
