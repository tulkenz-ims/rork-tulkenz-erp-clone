import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface MetricCard {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
}

interface MetricCardsSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  cards: MetricCard[];
  compact?: boolean;  // smaller cards, single scrollable row
}

export default function MetricCardsSection({ title, subtitle, icon, cards, compact }: MetricCardsSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getTrendColor = (trend?: number) => {
    if (trend === undefined || trend === 0) return '#EF4444';
    if (trend > 0) return '#10B981';
    return '#EF4444';
  };

  const getTrendIcon = (trend?: number, size = 10) => {
    if (trend === undefined || trend === 0) return <Minus size={size} color="#EF4444" />;
    if (trend > 0) return <TrendingUp size={size} color="#10B981" />;
    return <TrendingDown size={size} color="#EF4444" />;
  };

  if (compact) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {icon}
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactScroll}>
          {cards.map((card, idx) => (
            <View key={idx} style={styles.compactCard}>
              <Text style={styles.compactLabel} numberOfLines={1}>{card.label}</Text>
              <View style={styles.compactValueRow}>
                <Text style={[styles.compactValue, card.color ? { color: card.color } : null]}>
                  {card.value}
                </Text>
                {card.unit ? (
                  <Text style={[styles.compactUnit, card.color ? { color: card.color } : null]}>
                    {card.unit}
                  </Text>
                ) : null}
              </View>
              <View style={styles.compactTrendRow}>
                {getTrendIcon(card.trend, 10)}
                <Text style={[styles.compactTrendText, { color: getTrendColor(card.trend) }]}>
                  {card.trendLabel || `${Math.abs(card.trend ?? 0)}%`}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
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
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textTertiary },

  // ── Standard grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  cardLabel: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  cardUnit: { fontSize: 12, fontWeight: '500', color: colors.text },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontSize: 11, fontWeight: '500' },

  // ── Compact scrollable row ──
  compactScroll: { gap: 8, paddingRight: 8 },
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minWidth: 110,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textAlign: 'center' },
  compactValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
  compactValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  compactUnit: { fontSize: 12, fontWeight: '500', color: colors.text },
  compactTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactTrendText: { fontSize: 11, fontWeight: '500' },
});
