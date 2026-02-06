import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Flame,
  Tornado,
  ShieldAlert,
  FlaskConical,
  Wind,
  AlertOctagon,
  HeartPulse,
  Activity,
  Waves,
  ZapOff,
  Building,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Siren,
  TriangleAlert,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  EmergencyEventType,
  EMERGENCY_EVENT_TYPE_CONFIG,
} from '@/types/emergencyEvents';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame,
  Tornado,
  ShieldAlert,
  FlaskConical,
  Wind,
  AlertOctagon,
  HeartPulse,
  Activity,
  Waves,
  ZapOff,
  Building,
  AlertTriangle,
};

const PRIMARY_TYPES: EmergencyEventType[] = ['fire', 'tornado', 'active_shooter'];
const SECONDARY_TYPES: EmergencyEventType[] = [
  'chemical_spill',
  'gas_leak',
  'bomb_threat',
  'medical_emergency',
  'earthquake',
  'flood',
  'power_outage',
  'structural_collapse',
  'other',
];

export default function EmergencyInitiationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [showOtherTypes, setShowOtherTypes] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleInitiate = useCallback((type: EmergencyEventType, drill: boolean) => {
    if (drill) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    console.log('[EmergencyInitiation] Navigating to roll call:', type, drill ? 'DRILL' : 'LIVE');
    router.push({
      pathname: '/headcount/emergencyprotocol',
      params: { type, drill: drill ? 'true' : 'false' },
    });
  }, [router]);

  const renderPrimaryType = (type: EmergencyEventType) => {
    const config = EMERGENCY_EVENT_TYPE_CONFIG[type];
    const IconComp = ICON_MAP[config.icon];

    return (
      <View key={type} style={styles.typeSection}>
        <View style={[styles.typeHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.typeIconWrap, { backgroundColor: config.color + '18' }]}>
            {IconComp && <IconComp size={28} color={config.color} />}
          </View>
          <View style={styles.typeHeaderText}>
            <Text style={[styles.typeLabel, { color: colors.text }]}>{config.label}</Text>
            <Text style={[styles.typeInstruction, { color: colors.textSecondary }]} numberOfLines={1}>
              {config.instructions.split('.')[0]}
            </Text>
          </View>
        </View>
        <View style={styles.typeActions}>
          <Animated.View style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>
            <Pressable
              style={({ pressed }) => [
                styles.liveButton,
                { backgroundColor: config.color, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => handleInitiate(type, false)}
              testID={`emergency-live-${type}`}
            >
              <Siren size={18} color="#FFFFFF" />
              <Text style={styles.liveButtonText}>LIVE EMERGENCY</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </Animated.View>
          <Pressable
            style={({ pressed }) => [
              styles.drillButton,
              { backgroundColor: '#3B82F615', borderColor: '#3B82F640', opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => handleInitiate(type, true)}
            testID={`emergency-drill-${type}`}
          >
            <Activity size={16} color="#3B82F6" />
            <Text style={styles.drillButtonText}>Drill</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSecondaryType = (type: EmergencyEventType) => {
    const config = EMERGENCY_EVENT_TYPE_CONFIG[type];
    const IconComp = ICON_MAP[config.icon];

    return (
      <View key={type} style={[styles.secondaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.secondaryIconWrap, { backgroundColor: config.color + '15' }]}>
          {IconComp && <IconComp size={20} color={config.color} />}
        </View>
        <Text style={[styles.secondaryLabel, { color: colors.text }]} numberOfLines={1}>
          {config.label}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.secondaryLiveBtn, { backgroundColor: config.color, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => handleInitiate(type, false)}
        >
          <Siren size={12} color="#FFFFFF" />
          <Text style={styles.secondaryLiveBtnText}>Live</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryDrillBtn, { borderColor: '#3B82F640', opacity: pressed ? 0.85 : 1 }]}
          onPress={() => handleInitiate(type, true)}
        >
          <Text style={styles.secondaryDrillBtnText}>Drill</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Initiate Emergency',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.warningBanner, { backgroundColor: '#DC262612', borderColor: '#DC262630' }]}>
          <TriangleAlert size={20} color="#DC2626" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Roll Call First, Details Second</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Select a type below to start roll call immediately. Event details can be added once everyone is safe.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Primary Emergencies</Text>
        <View style={styles.primaryList}>
          {PRIMARY_TYPES.map(renderPrimaryType)}
        </View>

        <Pressable
          style={[styles.otherToggle, { borderColor: colors.border }]}
          onPress={() => { setShowOtherTypes(!showOtherTypes); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.otherToggleText, { color: colors.textSecondary }]}>
            Other Emergency Types
          </Text>
          {showOtherTypes ? (
            <ChevronUp size={18} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} />
          )}
        </Pressable>

        {showOtherTypes && (
          <View style={styles.secondaryList}>
            {SECONDARY_TYPES.map(renderSecondaryType)}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  primaryList: {
    gap: 14,
    marginBottom: 20,
  },
  typeSection: {
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden' as const,
  },
  typeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 14,
    paddingBottom: 10,
  },
  typeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  typeHeaderText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '800' as const,
    marginBottom: 2,
  },
  typeInstruction: {
    fontSize: 12,
    lineHeight: 16,
  },
  typeActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  liveButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  liveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  drillButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  drillButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  otherToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  otherToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  secondaryList: {
    gap: 8,
    marginBottom: 16,
  },
  secondaryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondaryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  secondaryLiveBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  secondaryLiveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  secondaryDrillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: '#3B82F610',
  },
  secondaryDrillBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
