import React, { useState, useCallback, useMemo } from 'react';
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
  ListOrdered,
  FileText,
  Tornado,
  ShieldAlert,
  Activity,
  CircleDot,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmergencyEvents } from '@/hooks/useEmergencyEvents';
import {
  EMERGENCY_EVENT_TYPE_CONFIG,
  EMERGENCY_EVENT_STATUS_COLORS,
  EMERGENCY_EVENT_STATUS_LABELS,
} from '@/types/emergencyEvents';
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

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame, Tornado, ShieldAlert,
};

export default function EmergencyHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { events, isLoading, refetch } = useEmergencyEvents();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const stats = useMemo(() => {
    const active = events.filter((e) => e.status === 'initiated' || e.status === 'in_progress');
    const drillsYTD = events.filter((e) => {
      const year = new Date(e.initiated_at).getFullYear();
      return e.drill && year === new Date().getFullYear();
    }).length;
    const resolvedCount = events.filter((e) => e.status === 'resolved' || e.status === 'all_clear').length;
    return { active, drillsYTD, resolved: resolvedCount, total: events.length };
  }, [events]);

  const handleFormPress = useCallback((option: EmergencyFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  const handleNavigate = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Hub',
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
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.initiateCard,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => handleNavigate('/safety/emergencyinitiation')}
          testID="initiate-emergency-hub"
        >
          <View style={styles.initiateIconWrap}>
            <Siren size={30} color="#FFFFFF" />
          </View>
          <View style={styles.initiateContent}>
            <Text style={styles.initiateTitle}>Initiate Emergency</Text>
            <Text style={styles.initiateSub}>Roll call first — add details once everyone is safe</Text>
          </View>
          <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => handleNavigate('/safety/emergencyeventlog')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#6366F115' }]}>
              <ListOrdered size={20} color="#6366F1" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Event Log</Text>
            <Text style={[styles.quickActionCount, { color: colors.textSecondary }]}>{stats.total}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.quickAction,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => handleNavigate('/safety/emergencyeventlog')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B98115' }]}>
              <FileText size={20} color="#10B981" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>Reports</Text>
            <Text style={[styles.quickActionCount, { color: colors.textSecondary }]}>{stats.resolved}</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EF444412', borderColor: '#EF444425' }]}>
            <Siren size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.active.length}</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F612', borderColor: '#3B82F625' }]}>
            <Activity size={18} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.drillsYTD}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Drills YTD</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B98112', borderColor: '#10B98125' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.resolved}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Resolved</Text>
          </View>
        </View>

        {stats.active.length > 0 && (
          <View style={styles.activeSection}>
            <View style={styles.activeSectionHeader}>
              <View style={styles.activeDot} />
              <Text style={[styles.activeSectionTitle, { color: '#EF4444' }]}>Active Events</Text>
            </View>
            {stats.active.map((event) => {
              const config = EMERGENCY_EVENT_TYPE_CONFIG[event.event_type];
              const statusColor = EMERGENCY_EVENT_STATUS_COLORS[event.status];
              return (
                <Pressable
                  key={event.id}
                  style={({ pressed }) => [
                    styles.activeEventCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: statusColor + '40',
                      borderLeftColor: config.color,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => handleNavigate(`/safety/emergencyeventdetail?id=${event.id}`)}
                >
                  <View style={styles.activeEventRow}>
                    <View style={[styles.activeEventIcon, { backgroundColor: config.color + '15' }]}>
                      <CircleDot size={18} color={config.color} />
                    </View>
                    <View style={styles.activeEventText}>
                      <Text style={[styles.activeEventTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                      <View style={styles.activeEventMeta}>
                        <View style={[styles.activeStatusPill, { backgroundColor: statusColor + '18' }]}>
                          <View style={[styles.activeStatusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.activeStatusText, { color: statusColor }]}>
                            {EMERGENCY_EVENT_STATUS_LABELS[event.status]}
                          </Text>
                        </View>
                        {event.drill && (
                          <View style={[styles.drillMini, { backgroundColor: '#3B82F615' }]}>
                            <Text style={styles.drillMiniText}>DRILL</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={[styles.tipBanner, { backgroundColor: '#EF444412', borderColor: '#EF444425' }]}>
          <Siren size={18} color="#EF4444" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#EF4444' }]}>OSHA Emergency Action Plan</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              29 CFR 1910.38 requires employers to have an emergency action plan with procedures for reporting emergencies, evacuation, and employee alarm systems.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Forms & Tools</Text>

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
                  <IconComponent size={22} color={option.color} />
                </View>
                <View style={styles.formCardContent}>
                  <View style={styles.formCardHeader}>
                    <Text style={[styles.formCardTitle, { color: colors.text }]}>
                      {option.label}
                    </Text>
                    {option.osha && (
                      <View style={[styles.oshaBadge, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.oshaText, { color: '#EF4444' }]}>OSHA</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.formCardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {option.description}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  initiateCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  initiateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  initiateContent: {
    flex: 1,
  },
  initiateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800' as const,
    marginBottom: 2,
  },
  initiateSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  quickActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 14,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  quickActionCount: {
    fontSize: 16,
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  activeSection: {
    marginBottom: 16,
    gap: 8,
  },
  activeSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activeSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  activeEventCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden' as const,
  },
  activeEventRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    gap: 10,
  },
  activeEventIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activeEventText: {
    flex: 1,
    gap: 4,
  },
  activeEventTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  activeEventMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  activeStatusPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  drillMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  drillMiniText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#3B82F6',
    letterSpacing: 0.3,
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
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 3,
  },
  tipBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
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
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  formCardContent: {
    flex: 1,
  },
  formCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 3,
    flexWrap: 'wrap' as const,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  oshaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  oshaText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  formCardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 32,
  },
});
