import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { colors, fontSizes, spacing } from '../../theme';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  pct: number;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function PieChart({ data, size = 180 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let currentAngle = 0;

  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sweep = (d.value / total) * 360;
      const path = sweep >= 359.99
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
        : arcPath(cx, cy, r, currentAngle, currentAngle + sweep);
      const slice = { ...d, path };
      currentAngle += sweep;
      return slice;
    });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {slices.map((s) => (
          <Path key={s.label} d={s.path} fill={s.color} />
        ))}
        <SvgText
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fill={colors.textPrimary}
          fontSize={18}
          fontWeight="bold"
        >
          {total}
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel}>
                {d.label} ({d.pct}%)
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
  },
});
