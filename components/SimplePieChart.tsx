import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Colors from '@/constants/colors';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface SimplePieChartProps {
  data: DataPoint[];
  size?: number;
}

export default function SimplePieChart({ data, size = 140 }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const radius = size / 2;
  const innerRadius = radius * 0.6;
  let currentAngle = -90;

  const createArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = radius + outerR * Math.cos(startRad);
    const y1 = radius + outerR * Math.sin(startRad);
    const x2 = radius + outerR * Math.cos(endRad);
    const y2 = radius + outerR * Math.sin(endRad);
    const x3 = radius + innerR * Math.cos(endRad);
    const y3 = radius + innerR * Math.sin(endRad);
    const x4 = radius + innerR * Math.cos(startRad);
    const y4 = radius + innerR * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            if (angle < 1) return null;

            return (
              <Path
                key={index}
                d={createArcPath(startAngle, endAngle - 0.5, radius - 2, innerRadius)}
                fill={item.color || Colors.chartColors[index % Colors.chartColors.length]}
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.legend}>
        {data.slice(0, 4).map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: item.color || Colors.chartColors[index % Colors.chartColors.length] },
              ]}
            />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.name}
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
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: 70,
  },
});
