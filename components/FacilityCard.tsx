import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Building2, Package, Wrench, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface FacilityCardProps {
  name: string;
  value: number;
  efficiency: number;
  workOrders: number;
  materials: number;
  onPress?: () => void;
}

export default function FacilityCard({ name, value, efficiency, workOrders, materials, onPress }: FacilityCardProps) {
  const { colors } = useTheme();
  const getEfficiencyColor = () => {
    if (efficiency >= 80) return colors.success;
    if (efficiency >= 60) return colors.warning;
    return colors.error;
  };
  const effColor = getEfficiencyColor();
  return (
    <Pressable
      style={({ pressed }) => [styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && onPress && styles.pressed]}
      onPress={onPress} disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.infoBg }]}>
          <Building2 size={20} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>${value.toLocaleString()}</Text>
        </View>
        <View style={[styles.efficiencyBadge, { backgroundColor: `${effColor}20` }]}>
          <Text style={[styles.efficiencyText, { color: effColor }]}>{efficiency.toFixed(0)}%</Text>
        </View>
      </View>
      <View style={[styles.stats, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.stat}>
          <Package size={14} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{materials}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Materials</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Wrench size={14} color={colors.textTertiary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{workOrders}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Work Orders</Text>
        </View>
      </View>
      {onPress && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.viewDetails, { color: colors.primary }]}>View Details</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' as const },
  value: { fontSize: 14, marginTop: 2 },
  efficiencyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  efficiencyText: { fontSize: 13, fontWeight: '700' as const },
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statDivider: { width: 1, height: 24, marginHorizontal: 8 },
  statValue: { fontSize: 15, fontWeight: '600' as const },
  statLabel: { fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  viewDetails: { fontSize: 14, fontWeight: '500' as const },
});
