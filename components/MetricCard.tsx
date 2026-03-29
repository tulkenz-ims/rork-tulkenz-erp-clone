import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  onPress?: () => void;
}

export default function MetricCard({ title, value, subtitle, icon: Icon, iconColor, trend, trendLabel, onPress }: MetricCardProps) {
  const { colors } = useTheme();
  const ic = iconColor || colors.primary;
  const isPositiveTrend = trend !== undefined && trend >= 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && onPress && styles.pressed]}
      onPress={onPress} disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${ic}20` }]}>
          <Icon size={20} color={ic} />
        </View>
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: isPositiveTrend ? colors.successBg : colors.errorBg }]}>
            {isPositiveTrend
              ? <TrendingUp size={12} color={colors.success} />
              : <TrendingDown size={12} color={colors.error} />}
            <Text style={[styles.trendText, { color: isPositiveTrend ? colors.success : colors.error }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
      {trendLabel && <Text style={[styles.trendLabel, { color: colors.textTertiary }]}>{trendLabel}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, padding: 16, borderWidth: 1, minWidth: 160, flex: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  trendText: { fontSize: 12, fontWeight: '600' as const },
  value: { fontSize: 28, fontWeight: '700' as const, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '500' as const },
  subtitle: { fontSize: 12, marginTop: 4 },
  trendLabel: { fontSize: 11, marginTop: 8 },
});
