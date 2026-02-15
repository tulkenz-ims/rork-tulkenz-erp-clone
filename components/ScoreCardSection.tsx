import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
  cardStyle?: any;
}

// ── Circular Gauge (View-based, no SVG) ────────────────────────
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
  const clampedValue = Math.min(100, Math.max(0, gauge.value));

  // Auto color based on value unless overridden
  const gaugeColor = gauge.color || (
    clampedValue >= 80 ? '#10B981' :
    clampedValue >= 60 ? '#F59E0B' :
    '#EF4444'
  );

  const trackColor = colors.backgroundTertiary || '#2A2E38';

  // Use conic-gradient on web for smooth gauge rendering
  const webRingStyle = Platform.OS === 'web'
    ? {
        width: size,
        height: size,
        borderRadius: size / 2,
        background: `conic-gradient(from -90deg, ${gaugeColor} ${clampedValue * 3.6}deg, ${trackColor} ${clampedValue * 3.6}deg)`,
      }
    : null;

  // Fallback for native: simple border-based ring
  const nativeRingStyle = Platform.OS !== 'web'
    ? {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: trackColor,
        borderTopColor: clampedValue > 0 ? gaugeColor : trackColor,
        borderRightColor: clampedValue > 25 ? gaugeColor : trackColor,
        borderBottomColor: clampedValue > 50 ? gaugeColor : trackColor,
        borderLeftColor: clampedValue > 75 ? gaugeColor : trackColor,
        transform: [{ rotate: '-90deg' }],
      }
    : null;

  return (
    <View style={{ alignItems: 'center', width: size + 8 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {/* Outer ring */}
        <View style={(webRingStyle || nativeRingStyle) as any} />
        {/* Inner circle (punch out center) */}
        <View style={{
          position: 'absolute',
          width: size - (strokeWidth * 2) - 2,
          height: size - (strokeWidth * 2) - 2,
          borderRadius: (size - (strokeWidth * 2) - 2) / 2,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
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
export default function ScoreCardSection({ title, subtitle, gauges, icon, cardStyle }: ScoreCardSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const gaugeCount = gauges.length;
  const gaugeSize = gaugeCount <= 3 ? 70 : gaugeCount <= 4 ? 62 : 54;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={[styles.card, cardStyle]}>
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
    justifyContent: 'center',
  },
  gaugesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
});
