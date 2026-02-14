import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

// ── Types ──────────────────────────────────────────────────────
export interface ScoreCardGauge {
  label: string;
  value: number;        // 0-100 percentage for the ring
  displayValue: string; // What to show inside the ring (e.g. "75%", "12", "$4K")
  color?: string;       // Override auto color
}

interface ScoreCardSectionProps {
  title: string;
  subtitle?: string;
  gauges: ScoreCardGauge[];
  icon?: React.ReactNode;
}

// ── Circular Gauge ─────────────────────────────────────────────
function CircularGauge({
  gauge,
  size,
  colors,
}: {
  gauge: ScoreCardGauge;
  size: number;
  colors: any;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, gauge.value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Auto color based on value unless overridden
  const gaugeColor = gauge.color || (
    clampedValue >= 80 ? '#10B981' :
    clampedValue >= 60 ? '#F59E0B' :
    clampedValue >= 40 ? '#EF4444' :
    '#EF4444'
  );

  return (
    <View style={{ alignItems: 'center', width: size + 8 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.backgroundTertiary}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Value arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {/* Center text */}
        <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{
            fontSize: size > 60 ? 14 : 11,
            fontWeight: '700',
            color: gaugeColor,
          }}>
            {gauge.displayValue}
          </Text>
        </View>
      </View>
      <Text style={{
        fontSize: 10,
        fontWeight: '500',
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 12,
      }} numberOfLines={2}>
        {gauge.label}
      </Text>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function ScoreCardSection({ title, subtitle, gauges, icon }: ScoreCardSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Determine gauge size based on count
  const gaugeCount = gauges.length;
  const gaugeSize = gaugeCount <= 3 ? 70 : gaugeCount <= 4 ? 62 : 54;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Gauges card */}
      <View style={styles.card}>
        <View style={styles.gaugesRow}>
          {gauges.map((gauge, i) => (
            <CircularGauge
              key={i}
              gauge={gauge}
              size={gaugeSize}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
});
