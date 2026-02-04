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
  FileWarning,
  ChevronRight,
  BoxSelect,
  Flame,
  ArrowDown,
  Zap,
  Shovel,
  Home,
  FlaskConical,
  Wrench,
  Link2,
  ArrowLeft,
  Shield,
  ClipboardCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafetyPermits } from '@/hooks/useSafetyPermits';
import { PermitType } from '@/types/safety';

interface PermitTypeOption {
  type: PermitType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
}

const PERMIT_TYPE_OPTIONS: PermitTypeOption[] = [
  {
    type: 'confined_space',
    label: 'Confined Space Entry',
    description: 'Entry into tanks, vessels, silos, or other confined spaces',
    icon: BoxSelect,
    color: '#7C3AED',
    route: '/safety/confinedspace',
  },
  {
    type: 'hot_work',
    label: 'Hot Work Permit',
    description: 'Welding, cutting, grinding, or spark-producing operations',
    icon: Flame,
    color: '#F97316',
    route: '/safety/hotwork',
  },
  {
    type: 'fall_protection',
    label: 'Fall Protection',
    description: 'Work at heights requiring fall protection systems',
    icon: ArrowDown,
    color: '#0891B2',
    route: '/safety/fallprotection',
  },
  {
    type: 'electrical',
    label: 'Electrical Safe Work',
    description: 'Work on or near energized electrical equipment',
    icon: Zap,
    color: '#EAB308',
    route: '/safety/electricalsafework',
  },
  {
    type: 'line_break',
    label: 'Line Break Permit',
    description: 'Breaking into pipes, lines, or process equipment',
    icon: Link2,
    color: '#6366F1',
    route: '/safety/linebreak',
  },
  {
    type: 'excavation',
    label: 'Excavation Permit',
    description: 'Trenching, digging, or excavation work',
    icon: Shovel,
    color: '#84CC16',
    route: '/safety/excavation',
  },
  {
    type: 'roof_access',
    label: 'Roof Access',
    description: 'Access to rooftops for maintenance or inspection',
    icon: Home,
    color: '#14B8A6',
    route: '/safety/roofaccess',
  },
  {
    type: 'chemical_handling',
    label: 'Chemical Handling',
    description: 'Handling hazardous chemicals or substances',
    icon: FlaskConical,
    color: '#EC4899',
    route: '/safety/chemicalhandling',
  },
  {
    type: 'temporary_equipment',
    label: 'Temporary Equipment',
    description: 'Installation of temporary equipment or utilities',
    icon: Wrench,
    color: '#8B5CF6',
    route: '/safety/tempequipment',
  },
];

export default function PermitToWorkScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    refetch,
    getPermitStats,
  } = useSafetyPermits();

  const stats = getPermitStats();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreatePermit = useCallback((option: PermitTypeOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Permit to Work Hub',
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
          <View style={[styles.iconContainer, { backgroundColor: '#F9731620' }]}>
            <FileWarning size={32} color="#F97316" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Permit to Work Hub</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create and manage job safety permits for hazardous work activities. All permits require supervisor approval.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Pending Approval</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total</Text>
          </View>
        </View>

        <View style={[styles.approvalNotice, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
          <Shield size={20} color="#F59E0B" />
          <View style={styles.approvalNoticeContent}>
            <Text style={[styles.approvalNoticeTitle, { color: '#F59E0B' }]}>Approval Required</Text>
            <Text style={[styles.approvalNoticeText, { color: colors.textSecondary }]}>
              All permits must be approved by a supervisor before work can begin.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Permit Type</Text>

        <View style={styles.permitTypesContainer}>
          {PERMIT_TYPE_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            const count = stats.byType[option.type] || 0;
            return (
              <Pressable
                key={option.type}
                style={({ pressed }) => [
                  styles.permitTypeCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleCreatePermit(option)}
              >
                <View style={[styles.permitTypeCardIcon, { backgroundColor: option.color + '15' }]}>
                  <IconComponent size={24} color={option.color} />
                </View>
                <View style={styles.permitTypeCardContent}>
                  <Text style={[styles.permitTypeCardTitle, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.permitTypeCardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.permitTypeCardRight}>
                  {count > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: option.color }]}>
                      <Text style={styles.countBadgeText}>{count}</Text>
                    </View>
                  )}
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ClipboardCheck size={20} color={colors.primary} />
          <View style={styles.infoCardContent}>
            <Text style={[styles.infoCardTitle, { color: colors.text }]}>Permit Workflow</Text>
            <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
              1. Select permit type and fill out required information{"\n"}
              2. Submit for supervisor approval{"\n"}
              3. Once approved, work may begin{"\n"}
              4. Complete permit when work is finished
            </Text>
          </View>
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
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
    textAlign: 'center' as const,
  },
  approvalNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  approvalNoticeContent: {
    flex: 1,
  },
  approvalNoticeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  approvalNoticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  permitTypesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  permitTypeCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  permitTypeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  permitTypeCardContent: {
    flex: 1,
  },
  permitTypeCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  permitTypeCardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  permitTypeCardRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 13,
    lineHeight: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  bottomPadding: {
    height: 32,
  },
});
