import React, { Platform } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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

const getTrendColor = (trend?: number, green = '#00FF88', red = '#FF3344', dim = '#446688') => {
  if (trend === undefined || trend === 0) return dim;
  if (trend > 0) return green;
  return red;
};

const getTrendIcon = (trend?: number, green = '#00FF88', red = '#FF3344', dim = '#446688', size = 9) => {
  if (trend === undefined || trend === 0) return <Minus size={size} color={dim} />;
  if (trend > 0) return <TrendingUp size={size} color={green} />;
  return <TrendingDown size={size} color={red} />;
};

// Corner brackets
function Brackets({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 1, borderLeftWidth: 1, borderColor: color }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 1, borderRightWidth: 1, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 1, borderRightWidth: 1, borderColor: color }} />
    </>
  );
}

export default function MetricCardsSection({ title, subtitle, icon, cards, compact }: MetricCardsSectionProps) {
  const { colors } = useTheme();

  const C = {
    surf:   colors.hudSurface,
    bdr:    colors.hudBorder,
    bdrB:   colors.hudBorderBright,
    p:      colors.hudPrimary,
    textS:  colors.textSecondary,
    textD:  colors.textTertiary,
    green:  '#00FF88',
    red:    '#FF3344',
  };

  if (compact) {
    return (
      <View style={{ marginBottom: 4 }}>
        {(title || icon) ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {icon}
              {title ? <Text style={{ fontSize: 10, fontWeight: '800', color: C.p, letterSpacing: 2.5, fontFamily: MONO }}>{title.toUpperCase()}</Text> : null}
            </View>
            {subtitle ? <Text style={{ fontSize: 8, color: C.textD, letterSpacing: 1, fontFamily: MONO }}>{subtitle}</Text> : null}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
          {cards.map((card, idx) => {
            const col = card.color || C.p;
            return (
              <View
                key={idx}
                style={{
                  backgroundColor: C.surf,
                  borderWidth: 1,
                  borderColor: col + '40',
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  paddingLeft: 13,
                  minWidth: 110,
                  minHeight: 95,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Brackets color={col + '60'} size={7} />
                {/* Left accent bar */}
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: col }} />
                <Text style={{ fontSize: 7, fontWeight: '700', color: C.textS, marginBottom: 5, letterSpacing: 1.5, fontFamily: MONO }} numberOfLines={1}>
                  {card.label.toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: col, fontFamily: MONO }}>{card.value}</Text>
                  {card.unit ? <Text style={{ fontSize: 10, fontWeight: '700', color: col, fontFamily: MONO }}>{card.unit}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {getTrendIcon(card.trend, C.green, C.red, C.textD)}
                  <Text style={{ fontSize: 8, fontWeight: '600', color: getTrendColor(card.trend, C.green, C.red, C.textD), fontFamily: MONO }}>
                    {card.trendLabel || `${Math.abs(card.trend ?? 0)}%`}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 4 }}>
      {(title || icon) ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {icon}
            {title ? <Text style={{ fontSize: 10, fontWeight: '800', color: C.p, letterSpacing: 2.5, fontFamily: MONO }}>{title.toUpperCase()}</Text> : null}
          </View>
          {subtitle ? <Text style={{ fontSize: 8, color: C.textD, letterSpacing: 1, fontFamily: MONO }}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {cards.map((card, idx) => {
          const col = card.color || C.p;
          return (
            <View
              key={idx}
              style={{
                backgroundColor: C.surf,
                borderWidth: 1,
                borderColor: col + '35',
                paddingVertical: 10,
                paddingHorizontal: 10,
                paddingLeft: 13,
                flexGrow: 1,
                flexBasis: '10%',
                minWidth: 90,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Brackets color={col + '50'} size={6} />
              {/* Left accent bar */}
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: col }} />
              <Text style={{ fontSize: 7, fontWeight: '700', color: C.textS, marginBottom: 5, letterSpacing: 1.5, fontFamily: MONO }} numberOfLines={2}>
                {card.label.toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 5 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: col, fontFamily: MONO }}>{card.value}</Text>
                {card.unit ? <Text style={{ fontSize: 10, fontWeight: '700', color: col, fontFamily: MONO }}>{card.unit}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {getTrendIcon(card.trend, C.green, C.red, C.textD)}
                <Text style={{ fontSize: 8, fontWeight: '600', color: getTrendColor(card.trend, C.green, C.red, C.textD), fontFamily: MONO }}>
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
