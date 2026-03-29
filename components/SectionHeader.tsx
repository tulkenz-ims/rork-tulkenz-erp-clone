import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, icon: Icon, iconColor, actionLabel, onAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  const ic = iconColor || colors.primary;
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {Icon && <Icon size={20} color={ic} />}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {actionLabel && onAction && (
        <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]} onPress={onAction}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{actionLabel}</Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700' as const },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionPressed: { opacity: 0.7 },
  actionLabel: { fontSize: 14, fontWeight: '500' as const },
});
