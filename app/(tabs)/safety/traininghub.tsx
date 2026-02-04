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
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  Forklift,
  ShieldAlert,
  Heart,
  Biohazard,
  UserPlus,
  RefreshCw,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface TrainingFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  certRequired?: boolean;
}

const TRAINING_FORM_OPTIONS: TrainingFormOption[] = [
  {
    id: 'trainingsignin',
    label: 'Training Sign-In Sheet',
    description: 'Document training session attendance with signatures',
    icon: Users,
    color: '#3B82F6',
    route: '/safety/trainingsignin',
  },
  {
    id: 'trainingmatrix',
    label: 'Training Record Matrix OCR',
    description: 'Track employee training requirements and completion status',
    icon: ClipboardList,
    color: '#8B5CF6',
    route: '/safety/trainingmatrix',
  },
  {
    id: 'forkliftcert',
    label: 'Forklift Certification OCR',
    description: 'Document PIT operator certification and evaluation',
    icon: Forklift,
    color: '#F97316',
    route: '/safety/forkliftcert',
    certRequired: true,
  },
  {
    id: 'confinedspacecert',
    label: 'Confined Space Certification OCR',
    description: 'Track confined space entry authorization and training',
    icon: ShieldAlert,
    color: '#EF4444',
    route: '/safety/confinedspacecert',
    certRequired: true,
  },
  {
    id: 'firstaidcert',
    label: 'First Aid/CPR Certification OCR',
    description: 'Document first aid and CPR certifications',
    icon: Heart,
    color: '#EC4899',
    route: '/safety/firstaidcert',
    certRequired: true,
  },
  {
    id: 'hazmattraining',
    label: 'Hazmat Training Record OCR',
    description: 'Track hazardous materials handling certifications',
    icon: Biohazard,
    color: '#F59E0B',
    route: '/safety/hazmattraining',
    certRequired: true,
  },
  {
    id: 'newemployeesafety',
    label: 'New Employee Safety Orientation OCR',
    description: 'Document new hire safety training completion',
    icon: UserPlus,
    color: '#10B981',
    route: '/safety/newemployeesafety',
  },
  {
    id: 'annualsafetyrefresher',
    label: 'Annual Safety Refresher OCR',
    description: 'Track yearly safety training refresher completion',
    icon: RefreshCw,
    color: '#6366F1',
    route: '/safety/annualsafetyrefresher',
  },
  {
    id: 'jobspecificsafety',
    label: 'Job-Specific Safety Training OCR',
    description: 'Document role-specific safety competencies',
    icon: Briefcase,
    color: '#06B6D4',
    route: '/safety/jobspecificsafety',
  },
];

export default function TrainingHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: TrainingFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Training & Competency',
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
          <View style={[styles.iconContainer, { backgroundColor: '#05966920' }]}>
            <GraduationCap size={32} color="#059669" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Training & Competency</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage employee training records, certifications, and competency verification for workplace safety compliance.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>156</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Certified</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>12</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Expiring Soon</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>3</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Expired</Text>
          </View>
        </View>

        <View style={[styles.tipBanner, { backgroundColor: '#05966915', borderColor: '#05966930' }]}>
          <Award size={20} color="#059669" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#059669' }]}>OCR = Operational Compliance Record</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              These forms create auditable records of training completion and competency verification for regulatory compliance.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Forms</Text>

        <View style={styles.formsContainer}>
          {TRAINING_FORM_OPTIONS.map((option) => {
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
                    {option.certRequired && (
                      <View style={[styles.certBadge, { backgroundColor: '#F59E0B15' }]}>
                        <Text style={[styles.certText, { color: '#F59E0B' }]}>
                          Cert Required
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
  certBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  certText: {
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
