import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface AlertCardProps {
  type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  icon: LucideIcon;
  onPress?: () => void;
}

export default function AlertCard({
  type,
  message,
  severity,
  icon: Icon,
  onPress,
}: AlertCardProps) {
  const getColors = () => {
    switch (severity) {
      case 'critical':
        return { bg: Colors.errorBg, color: Colors.error, border: Colors.error };
      case 'warning':
        return { bg: Colors.warningBg, color: Colors.warning, border: Colors.warning };
      default:
        return { bg: Colors.infoBg, color: Colors.info, border: Colors.info };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.bg, borderLeftColor: colors.border },
        pressed && onPress && styles.pressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${colors.color}20` }]}>
        <Icon size={18} color={colors.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.type, { color: colors.color }]}>{type}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {onPress && (
        <ChevronRight size={20} color={Colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  type: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: Colors.text,
  },
});
