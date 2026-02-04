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
  Shield,
  ChevronRight,
  ArrowLeft,
  ClipboardCheck,
  Ear,
  Wind,
  Footprints,
  FileCheck,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardHat,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface PPEFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  osha?: boolean;
}

const PPE_FORM_OPTIONS: PPEFormOption[] = [
  {
    id: 'ppehazard',
    label: 'PPE Hazard Assessment',
    description: 'Assess workplace hazards to determine required PPE',
    icon: FileCheck,
    color: '#3B82F6',
    route: '/safety/ppehazard',
    osha: true,
  },
  {
    id: 'ppeissue',
    label: 'PPE Issue/Distribution',
    description: 'Document PPE issuance and employee acknowledgment',
    icon: Package,
    color: '#10B981',
    route: '/safety/ppeissue',
  },
  {
    id: 'ppeinspection',
    label: 'PPE Inspection Checklist',
    description: 'Conduct regular inspections of PPE condition',
    icon: ClipboardCheck,
    color: '#8B5CF6',
    route: '/safety/ppeinspection',
  },
  {
    id: 'hearingconservation',
    label: 'Hearing Conservation',
    description: 'Track audiometric testing and hearing protection',
    icon: Ear,
    color: '#F59E0B',
    route: '/safety/hearingconservation',
    osha: true,
  },
  {
    id: 'respiratorfittest',
    label: 'Respirator Fit Test',
    description: 'Document respirator fit testing and clearance',
    icon: Wind,
    color: '#EF4444',
    route: '/safety/respiratorfittest',
    osha: true,
  },
  {
    id: 'safetyfootwear',
    label: 'Safety Footwear Verification',
    description: 'Verify employee safety footwear compliance',
    icon: Footprints,
    color: '#06B6D4',
    route: '/safety/safetyfootwear',
  },
];

export default function PPEHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: PPEFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'PPE Management',
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
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
            <Shield size={32} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>PPE Management</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage personal protective equipment hazard assessments, distribution, inspections, and compliance tracking.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>248</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Compliant</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>18</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Due Soon</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>5</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Overdue</Text>
          </View>
        </View>

        <View style={[styles.tipBanner, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
          <HardHat size={20} color="#8B5CF6" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#8B5CF6' }]}>OSHA PPE Requirements</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              29 CFR 1910.132 requires employers to assess workplace hazards, select appropriate PPE, and ensure proper use and maintenance.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>PPE Forms</Text>

        <View style={styles.formsContainer}>
          {PPE_FORM_OPTIONS.map((option) => {
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
