import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Building2, Package, Wrench, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FacilityCardProps {
  name: string;
  value: number;
  efficiency: number;
  workOrders: number;
  materials: number;
  onPress?: () => void;
}

export default function FacilityCard({
  name,
  value,
  efficiency,
  workOrders,
  materials,
  onPress,
}: FacilityCardProps) {
  const getEfficiencyColor = () => {
    if (efficiency >= 80) return Colors.success;
    if (efficiency >= 60) return Colors.warning;
    return Colors.error;
  };

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
        <View style={styles.iconContainer}>
          <Building2 size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.value}>${value.toLocaleString()}</Text>
        </View>
        <View style={[styles.efficiencyBadge, { backgroundColor: `${getEfficiencyColor()}20` }]}>
          <Text style={[styles.efficiencyText, { color: getEfficiencyColor() }]}>
            {efficiency.toFixed(0)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Package size={14} color={Colors.textTertiary} />
          <Text style={styles.statValue}>{materials}</Text>
          <Text style={styles.statLabel}>Materials</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Wrench size={14} color={Colors.textTertiary} />
          <Text style={styles.statValue}>{workOrders}</Text>
          <Text style={styles.statLabel}>Work Orders</Text>
        </View>
      </View>

      {onPress && (
        <View style={styles.footer}>
          <Text style={styles.viewDetails}>View Details</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </View>
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
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  value: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  efficiencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  efficiencyText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewDetails: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
});
