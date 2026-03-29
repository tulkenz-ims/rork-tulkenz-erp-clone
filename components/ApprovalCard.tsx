import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ApprovalCardProps {
  type: string;
  count: number;
  value: string;
  urgency: 'high' | 'medium' | 'low';
  icon: LucideIcon;
  color: string;
  onPress?: () => void;
}

export default function ApprovalCard({ type, count, value, urgency, icon: Icon, color, onPress }: ApprovalCardProps) {
  const { colors } = useTheme();
  const getUrgencyColor = () => {
    switch (urgency) {
      case 'high':   return colors.error;
      case 'medium': return colors.warning;
      default:       return colors.success;
    }
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && onPress && styles.pressed]}
      onPress={onPress} disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.type, { color: colors.text }]}>{type}</Text>
        <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>
      </View>
      <View style={styles.rightSection}>
        <View style={[styles.countBadge, { backgroundColor: getUrgencyColor() }]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
        {onPress && <ChevronRight size={18} color={colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  pressed: { opacity: 0.8 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  type: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  value: { fontSize: 13 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
});
