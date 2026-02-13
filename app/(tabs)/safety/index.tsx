import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  AlertTriangle,
  FileWarning,
  Users,
  Calendar,
  ChevronRight,
  HardHat,
  Lock,
  Search,
  ClipboardCheck,
  GraduationCap,
  Shield,
  FlaskConical,
  Siren,
  UserCheck,
  Activity,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

interface FormItem {
  id: string;
  title: string;
  route: string;
}

interface FormCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  forms: FormItem[];
  directRoute?: string;
}

const SAFETY_FORM_CATEGORIES: FormCategory[] = [
  {
    id: 'lotoprogram',
    title: 'LOTO Program',
    icon: Lock,
    color: '#DC2626',
    forms: [
      { id: 'lotoprogram', title: 'LOTO Program Overview', route: '/safety/lotoprogram' },
      { id: 'lotopermit', title: 'Create LOTO Permit', route: '/safety/lotopermit' },
      { id: 'lotoauth', title: 'LOTO Authorization Records', route: '/safety/lotoauth' },
    ],
  },
  {
    id: 'permits',
    title: 'Permit to Work / Job Safety',
    icon: FileWarning,
    color: '#F97316',
    directRoute: '/safety/permittowork',
    forms: [],
  },
  {
    id: 'incidents',
    title: 'Incident & Investigation',
    icon: Search,
    color: '#F97316',
    directRoute: '/safety/incidenthub',
    forms: [],
  },
  {
    id: 'inspections',
    title: 'Inspections & Audits',
    icon: ClipboardCheck,
    color: '#3B82F6',
    directRoute: '/safety/inspectionshub',
    forms: [],
  },
  {
    id: 'training',
    title: 'Training & Competency',
    icon: GraduationCap,
    color: '#059669',
    directRoute: '/safety/traininghub',
    forms: [],
  },
  {
    id: 'ppe',
    title: 'PPE Management',
    icon: Shield,
    color: '#8B5CF6',
    directRoute: '/safety/ppehub',
    forms: [],
  },
  {
    id: 'chemical',
    title: 'Chemical Safety / Hazard Communication',
    icon: FlaskConical,
    color: '#EAB308',
    forms: [
      { id: 'sdsindex', title: 'SDS Master Index', route: '/safety/sdsindex' },
      { id: 'sdsreceipt', title: 'SDS Receipt Acknowledgment', route: '/safety/sdsreceipt' },
      { id: 'chemicalinventory', title: 'Chemical Inventory', route: '/safety/chemicalinventory' },
      { id: 'chemicalapproval', title: 'Chemical Approval Request', route: '/safety/chemicalapproval' },
      { id: 'hazwaste', title: 'Hazardous Waste Disposal', route: '/safety/hazwaste' },
      { id: 'spillreport', title: 'Spill Report', route: '/safety/spillreport' },
      { id: 'chemicalexposure', title: 'Chemical Exposure Report', route: '/safety/chemicalexposure' },
    ],
  },
  {
    id: 'emergency',
    title: 'Emergency Preparedness',
    icon: Siren,
    color: '#EF4444',
    directRoute: '/safety/emergencyhub',
    forms: [],
  },
  {
    id: 'contractor',
    title: 'Contractor & Visitor Safety',
    icon: UserCheck,
    color: '#0891B2',
    forms: [
      { id: 'contractorprequal', title: 'Contractor Pre-Qualification', route: '/safety/contractorprequal' },
      { id: 'contractororientation', title: 'Contractor Orientation', route: '/safety/contractororientation' },
      { id: 'contractorsignin', title: 'Contractor Sign-In/Out', route: '/safety/contractorsignin' },
      { id: 'visitorsafety', title: 'Visitor Safety Acknowledgment', route: '/safety/visitorsafety' },
      { id: 'contractorworkauth', title: 'Contractor Work Auth', route: '/safety/contractorworkauth' },
      { id: 'contractorinsurance', title: 'Contractor Insurance', route: '/safety/contractorinsurance' },
    ],
  },
  {
    id: 'ergonomics',
    title: 'Ergonomics & Industrial Hygiene',
    icon: Activity,
    color: '#6366F1',
    forms: [
      { id: 'ergonomicassessment', title: 'Ergonomic Assessment', route: '/safety/ergonomicassessment' },
      { id: 'workstationevaluation', title: 'Workstation Evaluation', route: '/safety/workstationevaluation' },
      { id: 'noisemonitoring', title: 'Noise Monitoring', route: '/safety/noisemonitoring' },
      { id: 'heatstress', title: 'Heat Stress Monitoring', route: '/safety/heatstress' },
      { id: 'airquality', title: 'Air Quality Check', route: '/safety/airquality' },
      { id: 'repetitivemotion', title: 'Repetitive Motion Risk', route: '/safety/repetitivemotion' },
    ],
  },
  {
    id: 'behavior',
    title: 'Behavior-Based Safety',
    icon: Eye,
    color: '#10B981',
    forms: [
      { id: 'safetyobservation', title: 'Safety Observation Card', route: '/safety/safetyobservation' },
      { id: 'peersafetyaudit', title: 'Peer Safety Audit', route: '/safety/peersafetyaudit' },
      { id: 'safetysuggestion', title: 'Safety Suggestion', route: '/safety/safetysuggestion' },
      { id: 'safetycommittee', title: 'Safety Committee Minutes', route: '/safety/safetycommittee' },
      { id: 'safetyrecognition', title: 'Safety Recognition', route: '/safety/safetyrecognition' },
    ],
  },
  {
    id: 'regulatory',
    title: 'Regulatory Compliance',
    icon: FileText,
    color: '#7C3AED',
    forms: [
      { id: 'osha300a', title: 'OSHA 300A Summary', route: '/safety/osha300a' },
      { id: 'workerscomp', title: 'Workers Comp Claim', route: '/safety/workerscomp' },
      { id: 'returntowork', title: 'Return-to-Work Form', route: '/safety/returntowork' },
      { id: 'medicalrestriction', title: 'Medical Restriction', route: '/safety/medicalrestriction' },
      { id: 'drugalcoholtest', title: 'Drug/Alcohol Test COC', route: '/safety/drugalcoholtest' },
      { id: 'psmcompliance', title: 'PSM Compliance', route: '/safety/psmcompliance' },
      { id: 'firesuppression', title: 'Fire Suppression Impairment', route: '/safety/firesuppression' },
    ],
  },
];

export default function SafetyScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';
  const { user } = useUser();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const router = useRouter();

  const handleCreateSafetyHistoryRecord = useCallback(async (
    task: TaskFeedDepartmentTask,
    notes: string
  ): Promise<string | null> => {
    try {
      if (!organizationId) {
        console.warn('[Safety] No organization ID available, skipping history record creation');
        return null;
      }

      console.log('[Safety] Creating safety history record for task:', task.postNumber);

      const employeeName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'System';

      const { data, error } = await supabase
        .from('task_verifications')
        .insert({
          organization_id: organizationId,
          department_code: '1005',
          department_name: 'Safety',
          facility_code: facilityId || null,
          category_id: 'safety-task-feed',
          category_name: 'Task Feed Completion',
          action: `Safety Task: ${task.postNumber}`,
          notes: `Completed from Task Feed assignment.\n\nPost: ${task.postNumber}\nNotes: ${notes || 'No additional notes'}`,
          employee_name: employeeName || 'System',
          status: 'verified',
          source_type: 'task_feed_completion',
          source_id: task.id,
          source_number: task.postNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('[Safety] Error creating history record:', error);
        return null;
      }

      console.log('[Safety] Created history record:', data?.id);
      return data?.id || null;
    } catch (err) {
      console.error('[Safety] Error in createModuleHistoryRecord:', err);
      return null;
    }
  }, [organizationId, facilityId, user]);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask, moduleHistoryId?: string) => {
    console.log('[Safety] Task completed:', task.postNumber, 'History ID:', moduleHistoryId);
  }, []);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }, [router]);

  const toggleCategory = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const stats = [
    { label: 'Days Without Incident', value: '127', icon: Calendar, color: '#10B981' },
    { label: 'Open Reports', value: '4', icon: FileWarning, color: '#F59E0B' },
    { label: 'Near Misses (MTD)', value: '2', icon: AlertTriangle, color: '#EF4444' },
    { label: 'Training Due', value: '8', icon: Users, color: '#3B82F6' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
            <HardHat size={32} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Safety Management</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track incidents, near misses, safety training, and compliance
          </Text>
        </View>

        <TaskFeedInbox
          departmentCode="1005"
          moduleColor="#EF4444"
          onTaskCompleted={handleTaskCompleted}
          createModuleHistoryRecord={handleCreateSafetyHistoryRecord}
          maxVisible={3}
        />

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View 
                key={index} 
                style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                  <IconComponent size={18} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Forms</Text>

        {SAFETY_FORM_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isExpanded = expandedCategories.has(category.id);
          const hasDirectRoute = !!category.directRoute;
          
          return (
            <View key={category.id} style={styles.categoryContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.categoryHeader,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                onPress={() => {
                  if (hasDirectRoute) {
                    handleFormPress(category.directRoute!);
                  } else {
                    toggleCategory(category.id);
                  }
                }}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <IconComponent size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                    {!hasDirectRoute && (
                      <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                        {category.forms.length} forms
                      </Text>
                    )}
                  </View>
                </View>
                {hasDirectRoute ? (
                  <ChevronRight size={20} color={colors.textSecondary} />
                ) : isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>
              
              {isExpanded && !hasDirectRoute && category.forms.length > 0 && (
                <View style={[styles.formsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {category.forms.map((form, index) => (
                    <Pressable
                      key={form.id}
                      style={({ pressed }) => [
                        styles.formItem,
                        index < category.forms.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleFormPress(form.route)}
                    >
                      <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
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
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  formsContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  formItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 32,
  },
});
