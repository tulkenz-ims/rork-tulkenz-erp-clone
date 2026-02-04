import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Siren,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  Flame,
  DoorOpen,
  CloudLightning,
  Phone,
  Users,
  Heart,
  Map,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface EmergencyFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  osha?: boolean;
}

const EMERGENCY_FORM_OPTIONS: EmergencyFormOption[] = [
  {
    id: 'emergencyaction',
    label: 'Emergency Action Plan',
    description: 'Employee acknowledgment of emergency action plan procedures',
    icon: FileCheck,
    color: '#DC2626',
    route: '/safety/emergencyaction',
    osha: true,
  },
  {
    id: 'firedrilllog',
    label: 'Fire Drill Log',
    description: 'Record fire drill exercises, evacuation times, and results',
    icon: Flame,
    color: '#F97316',
    route: '/safety/firedrilllog',
    osha: true,
  },
  {
    id: 'evacuationdrill',
    label: 'Evacuation Drill Report',
    description: 'Comprehensive report of evacuation drill performance',
    icon: DoorOpen,
    color: '#059669',
    route: '/safety/evacuationdrill',
  },
  {
    id: 'tornadodrill',
    label: 'Severe Weather Drill',
    description: 'Document tornado and severe weather shelter-in-place drills',
    icon: CloudLightning,
    color: '#6366F1',
    route: '/safety/tornadodrill',
  },
  {
    id: 'emergencycontacts',
    label: 'Emergency Contacts',
    description: 'Maintain emergency contact list for facility',
    icon: Phone,
    color: '#0891B2',
    route: '/safety/emergencycontacts',
  },
  {
    id: 'assemblyheadcount',
    label: 'Assembly Headcount',
    description: 'Track employee headcount at assembly points during emergencies',
    icon: Users,
    color: '#8B5CF6',
    route: '/safety/assemblyheadcount',
  },
  {
    id: 'aedinspection',
    label: 'AED Inspection',
    description: 'Monthly AED inspection and readiness verification',
    icon: Heart,
    color: '#EF4444',
    route: '/safety/aedinspection',
    osha: true,
  },
  {
    id: 'emergencyequipmap',
    label: 'Emergency Equipment Map',
    description: 'Document and map emergency equipment locations',
    icon: Map,
    color: '#10B981',
    route: '/safety/emergencyequipmap',
  },
];

export default function EmergencyHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: EmergencyFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Preparedness',
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
            <Siren size={32} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Emergency Preparedness</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage emergency action plans, drills, contacts, and equipment readiness per OSHA 29 CFR 1910.38.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>4</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Drills YTD</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>2:45</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Avg Evac Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>1</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Due Soon</Text>
          </View>
        </View>

        <View style={[styles.tipBanner, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
          <Siren size={20} color="#EF4444" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#EF4444' }]}>OSHA Emergency Action Plan</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              29 CFR 1910.38 requires employers to have an emergency action plan with procedures for reporting emergencies, evacuation, and employee alarm systems.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Forms</Text>

        <View style={styles.formsContainer}>
          {EMERGENCY_FORM_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.formCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleFormPress(option)}
              >
                <View style={[styles.formCardIcon, { backgroundColor: option.color + '15' }]}>
                  <IconComponent size={24} color={option.color} />
                </View>
                <View style={styles.formCardContent}>
                  <View style={styles.formCardHeader}>
                    <Text style={[styles.formCardTitle, { color: colors.text }]}>
                      {option.label}
                    </Text>
                    {option.osha && (
                      <View style={[styles.oshaBadge, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.oshaText, { color: '#EF4444' }]}>
                          OSHA
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.formCardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {option.description}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

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
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  tipBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  tipBannerContent: {
    flex: 1,
  },
  tipBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  tipBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  formsContainer: {
    gap: 10,
  },
  formCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  formCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  formCardContent: {
    flex: 1,
  },
  formCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap' as const,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  oshaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oshaText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  formCardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  bottomPadding: {
    height: 32,
  },
});
