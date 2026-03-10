import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, radius } from '../theme';

interface FilterChipsProps<T extends string> {
  chips: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
}

export function FilterChips<T extends string>({
  chips,
  selected,
  onSelect,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
        const active = chip.key === selected;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            style={[
              styles.chip,
              active ? styles.chipActive : styles.chipInactive,
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.textSecondary },
                active && { fontWeight: '600' },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSizes.sm,
  },
});
