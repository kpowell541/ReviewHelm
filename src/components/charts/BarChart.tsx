import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, fontSizes, spacing } from '../../theme';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarDatum[];
  width?: number;
  barHeight?: number;
  labelWidth?: number;
  valueFormatter?: (value: number) => string;
}

export function BarChart({
  data,
  width = 320,
  barHeight = 24,
  labelWidth = 100,
  valueFormatter,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const countWidth = 64;
  const barAreaWidth = width - labelWidth - countWidth - 8;
  const rowGap = 6;
  const svgHeight = data.length * (barHeight + rowGap);

  if (data.every((d) => d.value === 0)) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data.map((d, i) => {
        const barW = Math.max(2, (d.value / maxValue) * barAreaWidth);
        const y = i * (barHeight + rowGap);
        return (
          <View key={d.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
            <Svg width={barAreaWidth + countWidth} height={barHeight}>
              <Rect
                x={0}
                y={2}
                width={barW}
                height={barHeight - 4}
                rx={4}
                fill={d.color}
              />
              <SvgText
                x={barW + 6}
                y={barHeight / 2 + 4}
                fill={colors.textSecondary}
                fontSize={12}
                fontWeight="600"
              >
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </SvgText>
            </Svg>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 100,
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'right',
  },
});
