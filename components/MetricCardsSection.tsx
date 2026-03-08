import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';

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
  compact?: boolean;
}

const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  green:        '#00ff88',
  amber:        '#ffb800',
  red:          '#ff2d55',
  purple:       '#7b61ff',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

const getTrendColor = (trend?: number) => {
  if (trend === undefined || trend === 0) return HUD.textDim;
  if (trend > 0) return HUD.green;
  return HUD.red;
};

const getTrendIcon = (trend?: number, size = 9) => {
  if (trend === undefined || trend === 0) return <Minus size={size} color={HUD.textDim} />;
  if (trend > 0) return <TrendingUp size={size} color={HUD.green} />;
  return <TrendingDown size={size} color={HUD.red} />;
};

export default function MetricCardsSection({ title, subtitle, icon, cards, compact }: MetricCardsSectionProps) {
  if (compact) {
    return (
      <View style={S.container}>
        {(title || icon) ? (
          <View style={S.header}>
            <View style={S.titleRow}>
              {icon}
              {title ? <Text style={S.title}>{title}</Text> : null}
            </View>
            {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.compactScroll}>
          {cards.map((card, idx) => (
            <View key={idx} style={[S.compactCard, { borderColor: (card.color || HUD.cyan) + '35', shadowColor: card.color || HUD.cyan }]}>
              <View style={[S.compactBar, { backgroundColor: card.color || HUD.cyan }]} />
              <Text style={S.compactLabel} numberOfLines={1}>{card.label}</Text>
              <View style={S.compactValueRow}>
                <Text style={[S.compactValue, { color: card.color || HUD.cyan }]}>{card.value}</Text>
                {card.unit ? <Text style={[S.compactUnit, { color: card.color || HUD.cyan }]}>{card.unit}</Text> : null}
              </View>
              <View style={S.compactTrendRow}>
                {getTrendIcon(card.trend, 9)}
                <Text style={[S.compactTrendText, { color: getTrendColor(card.trend) }]}>
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
    <View style={S.container}>
      {(title || icon) ? (
        <View style={S.header}>
          <View style={S.titleRow}>
            {icon}
            {title ? <Text style={S.title}>{title}</Text> : null}
          </View>
          {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={S.grid}>
        {cards.map((card, idx) => {
          const col = card.color || HUD.cyan;
          return (
            <View key={idx} style={[S.card, { borderColor: col + '35', shadowColor: col }]}>
              <View style={[S.cardBar, { backgroundColor: col }]} />
              <Text style={S.cardLabel} numberOfLines={2}>{card.label}</Text>
              <View style={S.valueRow}>
                <Text style={[S.cardValue, { color: col }]}>{card.value}</Text>
                {card.unit ? <Text style={[S.cardUnit, { color: col }]}>{card.unit}</Text> : null}
              </View>
              <View style={S.trendRow}>
                {getTrendIcon(card.trend)}
                <Text style={[S.trendText, { color: getTrendColor(card.trend) }]}>
                  {card.trendLabel || `${Math.abs(card.trend ?? 0)}%`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: { marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', color: HUD.cyan, letterSpacing: 2, textTransform: 'uppercase' },
  subtitle: { fontSize: 9, color: HUD.textDim, fontWeight: '600', letterSpacing: 0.8 },

  // Standard grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: {
    backgroundColor: HUD.bgCardAlt,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingLeft: 13,
    flexGrow: 1,
    flexBasis: '10%',
    minWidth: 90,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  cardLabel: { fontSize: 8, fontWeight: '700', color: HUD.textSec, marginBottom: 5, letterSpacing: 0.3, textTransform: 'uppercase' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 5 },
  cardValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  cardUnit: { fontSize: 10, fontWeight: '700' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontSize: 9, fontWeight: '600' },

  // Compact scrollable row
  compactScroll: { gap: 8, paddingRight: 8 },
  compactCard: {
    backgroundColor: HUD.bgCardAlt,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    paddingLeft: 15,
    minWidth: 110,
    minHeight: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  compactBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  compactLabel: { fontSize: 8, fontWeight: '700', color: HUD.textSec, marginBottom: 5, letterSpacing: 0.3, textTransform: 'uppercase' },
  compactValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
  compactValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  compactUnit: { fontSize: 10, fontWeight: '700' },
  compactTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactTrendText: { fontSize: 9, fontWeight: '600' },
});
