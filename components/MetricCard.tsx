import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';

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

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = Colors.primary,
  trend,
  trendLabel,
  onPress,
}: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && onPress && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Icon size={20} color={iconColor} />
        </View>
        {trend !== undefined && (
          <View style={[
            styles.trendBadge,
            { backgroundColor: isPositiveTrend ? Colors.successBg : Colors.errorBg }
          ]}>
            {isPositiveTrend ? (
              <TrendingUp size={12} color={Colors.success} />
            ) : (
              <TrendingDown size={12} color={Colors.error} />
            )}
            <Text style={[
              styles.trendText,
              { color: isPositiveTrend ? Colors.success : Colors.error }
            ]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {trendLabel && (
        <Text style={styles.trendLabel}>{trendLabel}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 160,
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  value: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  trendLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 8,
  },
});
