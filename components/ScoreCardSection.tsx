import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const HUD = {
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  green:        '#00ff88',
  amber:        '#ffb800',
  red:          '#ff2d55',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

export interface ScoreCardGauge {
  label: string;
  value: number;        // 0–100
  displayValue: string;
  color?: string;
}

interface ScoreCardSectionProps {
  title: string;
  subtitle?: string;
  gauges: ScoreCardGauge[];
  icon?: React.ReactNode;
  cardStyle?: any;
}

function CircularGauge({ gauge, size }: { gauge: ScoreCardGauge; size: number }) {
  const strokeWidth = 5;
  const clamped = Math.min(100, Math.max(0, gauge.value));

  const col = gauge.color || (
    clamped >= 80 ? HUD.green :
    clamped >= 60 ? HUD.amber :
    HUD.red
  );

  const trackColor = HUD.border;

  const webStyle = Platform.OS === 'web' ? {
    width: size, height: size, borderRadius: size / 2,
    background: `conic-gradient(from -90deg, ${col} ${clamped * 3.6}deg, ${trackColor} ${clamped * 3.6}deg)`,
  } : null;

  const nativeStyle = Platform.OS !== 'web' ? {
    width: size, height: size, borderRadius: size / 2,
    borderWidth: strokeWidth,
    borderColor: trackColor,
    borderTopColor:    clamped > 0  ? col : trackColor,
    borderRightColor:  clamped > 25 ? col : trackColor,
    borderBottomColor: clamped > 50 ? col : trackColor,
    borderLeftColor:   clamped > 75 ? col : trackColor,
    transform: [{ rotate: '-90deg' }],
  } : null;

  const innerSize = size - strokeWidth * 2 - 4;

  return (
    <View style={{ alignItems: 'center', width: size + 10 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <View style={(webStyle || nativeStyle) as any} />
        {/* Inner punch-out */}
        <View style={{
          position: 'absolute',
          width: innerSize, height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: HUD.bgCardAlt,
          justifyContent: 'center', alignItems: 'center',
          shadowColor: col, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25, shadowRadius: 4,
        }}>
          <Text style={{ fontSize: size > 60 ? 13 : 10, fontWeight: '900', color: col, letterSpacing: -0.3 }}>
            {gauge.displayValue}
          </Text>
        </View>
      </View>
      <Text style={S.gaugeLabel} numberOfLines={2}>{gauge.label}</Text>
    </View>
  );
}

export default function ScoreCardSection({ title, subtitle, gauges, icon, cardStyle }: ScoreCardSectionProps) {
  if (!gauges || gauges.length === 0) return null;

  const count = gauges.length;
  const gaugeSize = count <= 3 ? 68 : count <= 4 ? 60 : 52;

  // Hide header if both title and icon are empty/null
  const showHeader = !!title || !!icon;

  return (
    <View style={S.container}>
      {showHeader && (
        <View style={S.header}>
          <View style={S.headerLeft}>
            {icon}
            {title ? <Text style={S.title}>{title}</Text> : null}
          </View>
          {subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
      <View style={[S.card, cardStyle]}>
        <View style={S.gaugesRow}>
          {gauges.map((gauge, i) => (
            <CircularGauge key={i} gauge={gauge} size={gaugeSize} />
          ))}
        </View>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { marginBottom: 4 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:       { fontSize: 11, fontWeight: '900', color: HUD.cyan, letterSpacing: 2, textTransform: 'uppercase' },
  subtitle:    { fontSize: 9, color: HUD.textDim, fontWeight: '600', letterSpacing: 0.8 },
  card:        { backgroundColor: HUD.bgCardAlt, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: HUD.borderBright, justifyContent: 'center' },
  gaugesRow:   { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  gaugeLabel:  { fontSize: 8, fontWeight: '700', color: HUD.textSec, textAlign: 'center', marginTop: 6, lineHeight: 11, letterSpacing: 0.3, textTransform: 'uppercase' },
});
