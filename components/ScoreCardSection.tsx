import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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

function CircularGauge({ gauge, size, surf, bdr }: {
  gauge: ScoreCardGauge;
  size: number;
  surf: string;
  bdr: string;
}) {
  const strokeWidth = 5;
  const clamped = Math.min(100, Math.max(0, gauge.value));

  const col = gauge.color || (
    clamped >= 80 ? '#00FF88' :
    clamped >= 60 ? '#FFB800' :
    '#FF3344'
  );

  const webStyle = Platform.OS === 'web' ? {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: `conic-gradient(from -90deg, ${col} ${clamped * 3.6}deg, ${bdr} ${clamped * 3.6}deg)`,
  } : null;

  const nativeStyle = Platform.OS !== 'web' ? {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: strokeWidth,
    borderColor: bdr,
    borderTopColor:    clamped > 0  ? col : bdr,
    borderRightColor:  clamped > 25 ? col : bdr,
    borderBottomColor: clamped > 50 ? col : bdr,
    borderLeftColor:   clamped > 75 ? col : bdr,
    transform: [{ rotate: '-90deg' }],
  } : null;

  const innerSize = size - strokeWidth * 2 - 4;

  return (
    <View style={{ alignItems: 'center', width: size + 10 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <View style={(webStyle || nativeStyle) as any} />

        {/* Inner — sharp square punch-out instead of circle */}
        <View style={{
          position: 'absolute',
          width: innerSize,
          height: innerSize,
          backgroundColor: surf,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: innerSize / 2,
        }}>
          <Brackets color={col + '60'} size={5} />
          <Text style={{
            fontSize: size > 60 ? 12 : 10,
            fontWeight: '900',
            color: col,
            fontFamily: MONO,
            letterSpacing: -0.5,
          }}>
            {gauge.displayValue}
          </Text>
        </View>
      </View>

      {/* Label */}
      <Text style={{
        fontSize: 7,
        fontWeight: '700',
        color: '#446688',
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 10,
        letterSpacing: 1,
        fontFamily: MONO,
        textTransform: 'uppercase',
      }} numberOfLines={2}>
        {gauge.label}
      </Text>
    </View>
  );
}

export default function ScoreCardSection({ title, subtitle, gauges, icon, cardStyle }: ScoreCardSectionProps) {
  const { colors } = useTheme();

  const C = {
    surf:  colors.hudSurface,
    bdr:   colors.hudBorder,
    bdrB:  colors.hudBorderBright,
    p:     colors.hudPrimary,
    textD: colors.textTertiary,
  };

  if (!gauges || gauges.length === 0) return null;

  const count = gauges.length;
  const gaugeSize = count <= 3 ? 68 : count <= 4 ? 60 : 52;
  const showHeader = !!title || !!icon;

  return (
    <View style={{ marginBottom: 4 }}>
      {showHeader && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon}
            {title ? (
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.p, letterSpacing: 2.5, fontFamily: MONO }}>
                {title.toUpperCase()}
              </Text>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={{ fontSize: 8, color: C.textD, letterSpacing: 1, fontFamily: MONO }}>{subtitle}</Text>
          ) : null}
        </View>
      )}

      {/* Card — sharp corners, corner brackets */}
      <View style={[{
        backgroundColor: C.surf,
        borderWidth: 1,
        borderColor: C.bdrB,
        padding: 14,
        justifyContent: 'center',
        position: 'relative',
      }, cardStyle]}>
        <Brackets color={C.p + '50'} size={10} />
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {gauges.map((gauge, i) => (
            <CircularGauge
              key={i}
              gauge={gauge}
              size={gaugeSize}
              surf={C.surf}
              bdr={C.bdr}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
