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
  Search,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Heart,
  Clipboard,
  Target,
  Users,
  Building2,
  Truck,
  FileCheck,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface IncidentFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
}

const INCIDENT_FORM_OPTIONS: IncidentFormOption[] = [
  {
    id: 'incidentreport',
    label: 'Incident Report',
    description: 'Report workplace injuries, illnesses, or safety events',
    icon: AlertTriangle,
    color: '#EF4444',
    route: '/safety/incidentreport',
  },
  {
    id: 'nearmiss',
    label: 'Near-Miss Report',
    description: 'Report close calls and potential hazards before they cause harm',
    icon: AlertCircle,
    color: '#F59E0B',
    route: '/safety/nearmiss',
  },
  {
    id: 'firstaidlog',
    label: 'First Aid Log',
    description: 'Document minor injuries and first aid treatment provided',
    icon: Heart,
    color: '#EC4899',
    route: '/safety/firstaidlog',
  },
  {
    id: 'accidentinvestigation',
    label: 'Accident Investigation',
    description: 'Conduct thorough investigation of workplace accidents',
    icon: Clipboard,
    color: '#8B5CF6',
    route: '/safety/accidentinvestigation',
  },
  {
    id: 'rootcausesafety',
    label: 'Root Cause Analysis',
    description: 'Identify underlying causes and contributing factors',
    icon: Target,
    color: '#6366F1',
    route: '/safety/rootcausesafety',
  },
  {
    id: 'witnessstatement',
    label: 'Witness Statement',
    description: 'Collect statements from witnesses to incidents',
    icon: Users,
    color: '#0891B2',
    route: '/safety/witnessstatement',
  },
  {
    id: 'propertydamage',
    label: 'Property Damage Report',
    description: 'Document damage to equipment, facilities, or property',
    icon: Building2,
    color: '#84CC16',
    route: '/safety/propertydamage',
  },
  {
    id: 'vehicleincident',
    label: 'Vehicle/Forklift Incident',
    description: 'Report vehicle or powered equipment incidents',
    icon: Truck,
    color: '#14B8A6',
    route: '/safety/vehicleincident',
  },
  {
    id: 'osha300',
    label: 'OSHA 300 Log',
    description: 'Log of work-related injuries and illnesses',
    icon: FileSpreadsheet,
    color: '#3B82F6',
    route: '/safety/osha300',
  },
  {
    id: 'osha301',
    label: 'OSHA 301 Form',
    description: 'Injury and illness incident report form',
    icon: FileCheck,
    color: '#7C3AED',
    route: '/safety/osha301',
  },
];

export default function IncidentHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: IncidentFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Incident & Investigation Hub',
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
            <Search size={32} color="#F97316" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Incident & Investigation</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Report, investigate, and document workplace incidents, near-misses, and safety events.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>4</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Open Cases</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>2</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Near Misses (MTD)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>127</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Days Safe</Text>
          </View>
        </View>

        <View style={[styles.alertBanner, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <View style={styles.alertBannerContent}>
            <Text style={[styles.alertBannerTitle, { color: '#EF4444' }]}>Report Incidents Promptly</Text>
            <Text style={[styles.alertBannerText, { color: colors.textSecondary }]}>
              All incidents must be reported within 24 hours. Serious incidents require immediate notification.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Form Type</Text>

        <View style={styles.formsContainer}>
          {INCIDENT_FORM_OPTIONS.map((option) => {
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
                  <Text style={[styles.formCardTitle, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.formCardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {option.description}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileText size={20} color={colors.primary} />
          <View style={styles.infoCardContent}>
            <Text style={[styles.infoCardTitle, { color: colors.text }]}>Investigation Process</Text>
            <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
              1. Report the incident immediately{"\n"}
              2. Secure the scene and preserve evidence{"\n"}
              3. Collect witness statements{"\n"}
              4. Conduct root cause analysis{"\n"}
              5. Implement corrective actions
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
  alertBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  alertBannerContent: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertBannerText: {
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
    marginBottom: 20,
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
  formCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  formCardDescription: {
    fontSize: 12,
    lineHeight: 16,
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
