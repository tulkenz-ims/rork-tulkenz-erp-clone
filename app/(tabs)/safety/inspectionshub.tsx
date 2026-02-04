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
  ClipboardCheck,
  ChevronRight,
  ArrowLeft,
  Footprints,
  Calendar,
  Flame,
  DoorOpen,
  Droplets,
  BriefcaseMedical,
  Forklift,
  ArrowUpFromLine,
  Shield,
  Zap,
  Snowflake,
  Cylinder,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface InspectionFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  frequency?: string;
}

const INSPECTION_FORM_OPTIONS: InspectionFormOption[] = [
  {
    id: 'dailysafetywalk',
    label: 'Daily Safety Walk',
    description: 'Comprehensive daily facility safety walkthrough inspection',
    icon: Footprints,
    color: '#3B82F6',
    route: '/safety/dailysafetywalk',
    frequency: 'Daily',
  },
  {
    id: 'monthlysafety',
    label: 'Monthly Safety Inspection',
    description: 'Detailed monthly safety audit and compliance check',
    icon: Calendar,
    color: '#8B5CF6',
    route: '/safety/monthlysafety',
    frequency: 'Monthly',
  },
  {
    id: 'fireextinguisher',
    label: 'Fire Extinguisher Inspection',
    description: 'Monthly fire extinguisher visual and functional inspection',
    icon: Flame,
    color: '#EF4444',
    route: '/safety/fireextinguisher',
    frequency: 'Monthly',
  },
  {
    id: 'emergencyexit',
    label: 'Emergency Exit Inspection',
    description: 'Inspect exit routes, signage, and door functionality',
    icon: DoorOpen,
    color: '#F97316',
    route: '/safety/emergencyexit',
    frequency: 'Monthly',
  },
  {
    id: 'eyewash',
    label: 'Eyewash/Safety Shower',
    description: 'Weekly eyewash station and safety shower inspection',
    icon: Droplets,
    color: '#06B6D4',
    route: '/safety/eyewash',
    frequency: 'Weekly',
  },
  {
    id: 'firstaidkit',
    label: 'First Aid Kit Inspection',
    description: 'Monthly first aid kit inventory and expiration check',
    icon: BriefcaseMedical,
    color: '#EC4899',
    route: '/safety/firstaidkit',
    frequency: 'Monthly',
  },
  {
    id: 'forkliftpreshift',
    label: 'Forklift Pre-Shift',
    description: 'Pre-shift powered industrial truck inspection',
    icon: Forklift,
    color: '#F59E0B',
    route: '/safety/forkliftpreshift',
    frequency: 'Per Shift',
  },
  {
    id: 'ladderinspection',
    label: 'Ladder Inspection',
    description: 'Portable ladder condition and safety inspection',
    icon: ArrowUpFromLine,
    color: '#10B981',
    route: '/safety/ladderinspection',
    frequency: 'Monthly',
  },
  {
    id: 'fallprotectionequip',
    label: 'Fall Protection Equipment',
    description: 'Harness, lanyard, and anchor point inspection',
    icon: Shield,
    color: '#6366F1',
    route: '/safety/fallprotectionequip',
    frequency: 'Before Use',
  },
  {
    id: 'electricalpanel',
    label: 'Electrical Panel Inspection',
    description: 'Electrical panel clearance and condition audit',
    icon: Zap,
    color: '#FBBF24',
    route: '/safety/electricalpanel',
    frequency: 'Monthly',
  },
  {
    id: 'ammoniasystem',
    label: 'Ammonia System Inspection',
    description: 'Ammonia refrigeration system safety check',
    icon: Snowflake,
    color: '#0EA5E9',
    route: '/safety/ammoniasystem',
    frequency: 'Weekly',
  },
  {
    id: 'compressedgas',
    label: 'Compressed Gas Cylinder',
    description: 'Cylinder storage, securing, and condition inspection',
    icon: Cylinder,
    color: '#84CC16',
    route: '/safety/compressedgas',
    frequency: 'Monthly',
  },
];

export default function InspectionsHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: InspectionFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Inspections & Audits',
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
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
            <ClipboardCheck size={32} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Inspections & Audits</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Conduct safety inspections, equipment checks, and compliance audits to maintain a safe workplace.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>24</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Completed (MTD)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>6</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Due This Week</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>2</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Overdue</Text>
          </View>
        </View>

        <View style={[styles.tipBanner, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
          <ClipboardCheck size={20} color="#3B82F6" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#3B82F6' }]}>Inspection Best Practices</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              Complete inspections at consistent times. Document all findings with photos when possible.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Inspection Type</Text>

        <View style={styles.formsContainer}>
          {INSPECTION_FORM_OPTIONS.map((option) => {
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
                    {option.frequency && (
                      <View style={[styles.frequencyBadge, { backgroundColor: option.color + '15' }]}>
                        <Text style={[styles.frequencyText, { color: option.color }]}>
                          {option.frequency}
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
  frequencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frequencyText: {
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
