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
  FlaskConical,
  ChevronRight,
  ArrowLeft,
  FileText,
  ClipboardCheck,
  Package,
  CheckCircle,
  Trash2,
  AlertOctagon,
  UserX,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Skull,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface ChemicalFormOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  osha?: boolean;
}

const CHEMICAL_FORM_OPTIONS: ChemicalFormOption[] = [
  {
    id: 'sdsindex',
    label: 'SDS Master Index',
    description: 'Master index of all Safety Data Sheets in the facility',
    icon: FileText,
    color: '#EAB308',
    route: '/safety/sdsindex',
    osha: true,
  },
  {
    id: 'sdsreceipt',
    label: 'SDS Receipt Acknowledgment',
    description: 'Document employee acknowledgment of SDS training',
    icon: ClipboardCheck,
    color: '#3B82F6',
    route: '/safety/sdsreceipt',
    osha: true,
  },
  {
    id: 'chemicalinventory',
    label: 'Chemical Inventory',
    description: 'Track all chemicals stored and used in the facility',
    icon: Package,
    color: '#8B5CF6',
    route: '/safety/chemicalinventory',
    osha: true,
  },
  {
    id: 'chemicalapproval',
    label: 'Chemical Approval Request',
    description: 'Request approval for new chemicals before purchase',
    icon: CheckCircle,
    color: '#10B981',
    route: '/safety/chemicalapproval',
  },
  {
    id: 'hazwaste',
    label: 'Hazardous Waste Disposal',
    description: 'Document hazardous waste disposal and manifests',
    icon: Trash2,
    color: '#F97316',
    route: '/safety/hazwaste',
    osha: true,
  },
  {
    id: 'spillreport',
    label: 'Spill Report',
    description: 'Document chemical spills and response actions',
    icon: AlertOctagon,
    color: '#EF4444',
    route: '/safety/spillreport',
  },
  {
    id: 'chemicalexposure',
    label: 'Chemical Exposure Report',
    description: 'Report employee exposure to hazardous chemicals',
    icon: UserX,
    color: '#DC2626',
    route: '/safety/chemicalexposure',
    osha: true,
  },
];

export default function ChemicalHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((option: ChemicalFormOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Chemical Safety',
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
          <View style={[styles.iconContainer, { backgroundColor: '#EAB30820' }]}>
            <FlaskConical size={32} color="#EAB308" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Chemical Safety / HazCom</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage Safety Data Sheets, chemical inventories, hazardous waste, and exposure monitoring per OSHA 29 CFR 1910.1200.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>156</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Active SDS</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>12</Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Review Due</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>3</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Pending</Text>
          </View>
        </View>

        <View style={[styles.tipBanner, { backgroundColor: '#EAB30815', borderColor: '#EAB30830' }]}>
          <Skull size={20} color="#EAB308" />
          <View style={styles.tipBannerContent}>
            <Text style={[styles.tipBannerTitle, { color: '#EAB308' }]}>OSHA HazCom Standard</Text>
            <Text style={[styles.tipBannerText, { color: colors.textSecondary }]}>
              29 CFR 1910.1200 requires employers to provide information about hazardous chemicals through labels, SDS, and training.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Chemical Safety Forms</Text>

        <View style={styles.formsContainer}>
          {CHEMICAL_FORM_OPTIONS.map((option) => {
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
