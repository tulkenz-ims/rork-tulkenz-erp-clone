import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({ label, value, maxValue = 100, color, showPercentage = true }: ProgressBarProps) {
  const { colors } = useTheme();
  const barColor = color || colors.primary;
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const percentage = Math.min((value / maxValue) * 100, 100);

  useEffect(() => {
    Animated.timing(animatedWidth, { toValue: percentage, duration: 800, useNativeDriver: false }).start();
  }, [percentage, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        {showPercentage && <Text style={[styles.percentage, { color: colors.text }]}>{percentage.toFixed(1)}%</Text>}
      </View>
      <View style={[styles.track, { backgroundColor: colors.backgroundTertiary }]}>
        <Animated.View style={[styles.fill, { width: widthInterpolated, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '500' as const },
  percentage: { fontSize: 13, fontWeight: '600' as const },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
