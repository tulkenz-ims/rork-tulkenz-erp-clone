import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
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
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmergencyEvents } from '@/hooks/useEmergencyEvents';
import {
  EmergencyEventType,
  EmergencyEventSeverity,
  EMERGENCY_EVENT_TYPE_CONFIG,
  EMERGENCY_SEVERITY_LABELS,
  EMERGENCY_SEVERITY_COLORS,
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

const SEVERITY_OPTIONS: EmergencyEventSeverity[] = ['critical', 'high', 'medium', 'low'];

export default function EmergencyInitiationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { createEvent, isCreating } = useEmergencyEvents();

  const [selectedType, setSelectedType] = useState<EmergencyEventType | null>(null);
  const [severity, setSeverity] = useState<EmergencyEventSeverity>('high');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [isDrill, setIsDrill] = useState(false);
  const [emergencyServicesCalled, setEmergencyServicesCalled] = useState(false);
  const [showOtherTypes, setShowOtherTypes] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  React.useEffect(() => {
    startPulse();
  }, [startPulse]);

  const handleSelectType = useCallback((type: EmergencyEventType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedType(type);
  }, []);

  const handleInitiate = useCallback(async () => {
    if (!selectedType) {
      Alert.alert('Select Emergency Type', 'Please select an emergency type before initiating.');
      return;
    }

    const config = EMERGENCY_EVENT_TYPE_CONFIG[selectedType];

    Alert.alert(
      isDrill ? 'Initiate Emergency Drill?' : 'INITIATE EMERGENCY?',
      isDrill
        ? `Start a ${config.label} drill? This will be logged as a drill exercise.`
        : `This will initiate a ${config.label} emergency event with ${severity.toUpperCase()} severity. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDrill ? 'Start Drill' : 'INITIATE',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const title = `${config.label} ${isDrill ? 'Drill' : 'Emergency'} - ${new Date().toLocaleDateString()}`;
              await createEvent({
                event_type: selectedType,
                severity,
                title,
                description: description || undefined,
                location_details: locationDetails || undefined,
                drill: isDrill,
                departments_affected: [],
                emergency_services_called: emergencyServicesCalled,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                isDrill ? 'Drill Started' : 'Emergency Initiated',
                isDrill
                  ? 'The emergency drill has been started and logged.'
                  : 'The emergency event has been initiated. Proceed with emergency protocols.',
                [{ text: 'View Event Log', onPress: () => router.push('/safety/emergencyeventlog' as any) }]
              );
            } catch (err) {
              console.error('[EmergencyInitiation] Error creating event:', err);
              Alert.alert('Error', 'Failed to initiate emergency event. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedType, severity, description, locationDetails, isDrill, emergencyServicesCalled, createEvent, router]);

  const renderPrimaryButton = (type: EmergencyEventType) => {
    const config = EMERGENCY_EVENT_TYPE_CONFIG[type];
    const IconComp = ICON_MAP[config.icon];
    const isSelected = selectedType === type;

    return (
      <Animated.View
        key={type}
        style={[
          { transform: [{ scale: isSelected ? pulseAnim : 1 }] },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: isSelected ? config.color : config.color + '18',
              borderColor: isSelected ? config.color : config.color + '40',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => handleSelectType(type)}
          testID={`emergency-btn-${type}`}
        >
          <View style={[styles.primaryIconWrap, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : config.color + '25' }]}>
            {IconComp && <IconComp size={36} color={isSelected ? '#FFFFFF' : config.color} />}
          </View>
          <Text style={[styles.primaryLabel, { color: isSelected ? '#FFFFFF' : config.color }]}>
            {config.label}
          </Text>
          <Text style={[styles.primarySub, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]} numberOfLines={2}>
            {config.instructions.split('.')[0]}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderSecondaryButton = (type: EmergencyEventType) => {
    const config = EMERGENCY_EVENT_TYPE_CONFIG[type];
    const IconComp = ICON_MAP[config.icon];
    const isSelected = selectedType === type;

    return (
      <Pressable
        key={type}
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            backgroundColor: isSelected ? config.color + '20' : colors.surface,
            borderColor: isSelected ? config.color : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => handleSelectType(type)}
        testID={`emergency-btn-${type}`}
      >
        <View style={[styles.secondaryIconWrap, { backgroundColor: config.color + '15' }]}>
          {IconComp && <IconComp size={20} color={config.color} />}
        </View>
        <Text style={[styles.secondaryLabel, { color: isSelected ? config.color : colors.text }]} numberOfLines={1}>
          {config.label}
        </Text>
      </Pressable>
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.warningBanner, { backgroundColor: '#DC262615', borderColor: '#DC262640' }]}>
          <TriangleAlert size={22} color="#DC2626" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Emergency Initiation</Text>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Select an emergency type below. Toggle "Drill Mode" for training exercises.
            </Text>
          </View>
        </View>

        <View style={styles.drillToggleRow}>
          <Pressable
            style={[
              styles.drillToggle,
              {
                backgroundColor: !isDrill ? '#DC262615' : colors.surface,
                borderColor: !isDrill ? '#DC2626' : colors.border,
              },
            ]}
            onPress={() => { setIsDrill(false); Haptics.selectionAsync(); }}
          >
            <Siren size={16} color={!isDrill ? '#DC2626' : colors.textSecondary} />
            <Text style={[styles.drillToggleText, { color: !isDrill ? '#DC2626' : colors.textSecondary }]}>
              Live Emergency
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.drillToggle,
              {
                backgroundColor: isDrill ? '#3B82F615' : colors.surface,
                borderColor: isDrill ? '#3B82F6' : colors.border,
              },
            ]}
            onPress={() => { setIsDrill(true); Haptics.selectionAsync(); }}
          >
            <Activity size={16} color={isDrill ? '#3B82F6' : colors.textSecondary} />
            <Text style={[styles.drillToggleText, { color: isDrill ? '#3B82F6' : colors.textSecondary }]}>
              Drill Mode
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Primary Emergencies</Text>
        <View style={styles.primaryGrid}>
          {PRIMARY_TYPES.map(renderPrimaryButton)}
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
          <View style={styles.secondaryGrid}>
            {SECONDARY_TYPES.map(renderSecondaryButton)}
          </View>
        )}

        {selectedType && (
          <View style={[styles.detailsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailsTitle, { color: colors.text }]}>Event Details</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.severityChip,
                    {
                      backgroundColor: severity === s ? EMERGENCY_SEVERITY_COLORS[s] + '20' : colors.background,
                      borderColor: severity === s ? EMERGENCY_SEVERITY_COLORS[s] : colors.border,
                    },
                  ]}
                  onPress={() => { setSeverity(s); Haptics.selectionAsync(); }}
                >
                  <Text
                    style={[
                      styles.severityChipText,
                      { color: severity === s ? EMERGENCY_SEVERITY_COLORS[s] : colors.textSecondary },
                    ]}
                  >
                    {EMERGENCY_SEVERITY_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location Details</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Building A, 2nd Floor, Warehouse"
              placeholderTextColor={colors.textSecondary}
              value={locationDetails}
              onChangeText={setLocationDetails}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional details..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable
              style={[
                styles.servicesToggle,
                {
                  backgroundColor: emergencyServicesCalled ? '#EF444415' : colors.background,
                  borderColor: emergencyServicesCalled ? '#EF4444' : colors.border,
                },
              ]}
              onPress={() => { setEmergencyServicesCalled(!emergencyServicesCalled); Haptics.selectionAsync(); }}
            >
              <Siren size={18} color={emergencyServicesCalled ? '#EF4444' : colors.textSecondary} />
              <Text
                style={[
                  styles.servicesToggleText,
                  { color: emergencyServicesCalled ? '#EF4444' : colors.textSecondary },
                ]}
              >
                Emergency Services Called (911)
              </Text>
            </Pressable>
          </View>
        )}

        {selectedType && (
          <View style={[styles.instructionsCard, { backgroundColor: EMERGENCY_EVENT_TYPE_CONFIG[selectedType].color + '10', borderColor: EMERGENCY_EVENT_TYPE_CONFIG[selectedType].color + '30' }]}>
            <Text style={[styles.instructionsTitle, { color: EMERGENCY_EVENT_TYPE_CONFIG[selectedType].color }]}>
              Quick Reference: {EMERGENCY_EVENT_TYPE_CONFIG[selectedType].label}
            </Text>
            <Text style={[styles.instructionsText, { color: colors.text }]}>
              {EMERGENCY_EVENT_TYPE_CONFIG[selectedType].instructions}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.initiateButton,
            {
              backgroundColor: selectedType
                ? isDrill
                  ? '#3B82F6'
                  : '#DC2626'
                : colors.border,
              opacity: pressed && selectedType ? 0.85 : isCreating ? 0.7 : 1,
            },
          ]}
          onPress={handleInitiate}
          disabled={isCreating || !selectedType}
          testID="initiate-emergency-btn"
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Siren size={22} color="#FFFFFF" />
              <Text style={styles.initiateButtonText}>
                {isDrill ? 'START DRILL' : 'INITIATE EMERGENCY'}
              </Text>
            </>
          )}
        </Pressable>

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
    marginBottom: 16,
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
  drillToggleRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  drillToggle: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  drillToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  primaryGrid: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  primaryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryLabel: {
    fontSize: 20,
    fontWeight: '800' as const,
    flex: 0,
  },
  primarySub: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
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
  secondaryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  secondaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailsSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  severityRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 14,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 14,
  },
  servicesToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  servicesToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  instructionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 19,
  },
  initiateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  initiateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});
