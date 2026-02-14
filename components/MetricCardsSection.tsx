import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface MetricCard {
  label: string;
  value: string | number;
  unit?: string;          // e.g. 'hrs', '%', 'WOs'
  trend?: number;         // percent change, negative = down
  trendLabel?: string;    // override trend display
  color?: string;         // accent color for the value
}

interface MetricCardsSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  cards: MetricCard[];
}

export default function MetricCardsSection({ title, subtitle, icon, cards }: MetricCardsSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getTrendColor = (trend?: number) => {
    if (trend === undefined || trend === 0) return '#EF4444';
    if (trend > 0) return '#10B981';
    return '#EF4444';
  };

  const getTrendIcon = (trend?: number) => {
    if (trend === undefined || trend === 0) return <Minus size={10} color="#EF4444" />;
    if (trend > 0) return <TrendingUp size={10} color="#10B981" />;
    return <TrendingDown size={10} color="#EF4444" />;
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Cards Grid */}
      <View style={styles.grid}>
        {cards.map((card, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardLabel} numberOfLines={1}>{card.label}</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.cardValue, card.color ? { color: card.color } : null]}>
                {card.value}
              </Text>
              {card.unit ? (
                <Text style={[styles.cardUnit, card.color ? { color: card.color } : null]}>
                  {card.unit}
                </Text>
              ) : null}
            </View>
            <View style={styles.trendRow}>
              {getTrendIcon(card.trend)}
              <Text style={[styles.trendText, { color: getTrendColor(card.trend) }]}>
                {card.trendLabel || `${Math.abs(card.trend ?? 0)}%`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: '22%',
    flexGrow: 1,
    flexBasis: '22%',
    maxWidth: '25%',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  cardUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
