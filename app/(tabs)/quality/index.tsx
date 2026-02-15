import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  Thermometer,
  ClipboardCheck,
  Package,
  Truck,
  AlertTriangle,
  Lock,
  FlaskConical,
  FileSearch,
  Settings,
  Bug,
  Users,
  FileText,
  Search,
  Ship,
  Siren,
  UserCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ClipboardList,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Timer,
  Bell,
  Wrench,
  Calendar,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseQualityTasks } from '@/hooks/useSupabaseQualityTasks';
import { useSupabaseQuality } from '@/hooks/useSupabaseQuality';
import * as Haptics from 'expo-haptics';
import TaskFeedInbox from '@/components/TaskFeedInbox';
import { supabase } from '@/lib/supabase';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { useOrganization } from '@/contexts/OrganizationContext';

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
}

const QUALITY_FORM_CATEGORIES: FormCategory[] = [
  {
    id: 'daily-monitoring',
    title: 'Daily Monitoring Forms',
    icon: Thermometer,
    color: '#3B82F6',
    forms: [
      { id: 'temperaturelog', title: 'Temperature Log', route: '/quality/temperaturelog' },
      { id: 'ccplog', title: 'CCP Monitoring Log', route: '/quality/ccplog' },
      { id: 'productionlinecheck', title: 'Production Line Check', route: '/quality/productionlinecheck' },
      { id: 'cookingtemplog', title: 'Cooking Temperature Log', route: '/quality/cookingtemplog' },
      { id: 'coolingtemplog', title: 'Cooling Temperature Log', route: '/quality/coolingtemplog' },
      { id: 'metaldetectorlog', title: 'Metal Detector Log', route: '/quality/metaldetectorlog' },
      { id: 'scalecalibration', title: 'Scale Calibration Check', route: '/quality/scalecalibration' },
      { id: 'weightverification', title: 'Weight Verification', route: '/quality/weightverification' },
      { id: 'phtestinglog', title: 'pH/Brix/Moisture Testing', route: '/quality/phtestinglog' },
      { id: 'visualinspection', title: 'Visual Inspection', route: '/quality/visualinspection' },
    ],
  },
  {
    id: 'scheduled-tasks',
    title: 'Scheduled Quality Tasks',
    icon: Calendar,
    color: '#8B5CF6',
    forms: [
      { id: 'hourlylinechecks', title: 'Hourly Line Checks', route: '/quality/hourlylinechecks' },
      { id: 'tasksetup', title: 'Task Schedule Setup', route: '/quality/tasksetup' },
    ],
  },
  {
    id: 'pre-operational',
    title: 'Pre-Operational Forms',
    icon: ClipboardCheck,
    color: '#10B981',
    forms: [
      { id: 'preopinspection', title: 'Pre-Op Inspection', route: '/quality/preopinspection' },
      { id: 'sanitationverification', title: 'Sanitation Verification', route: '/quality/sanitationverification' },
      { id: 'allergenchangeover', title: 'Allergen Changeover', route: '/quality/allergenchangeover' },
      { id: 'linerelease', title: 'Line Release', route: '/quality/linerelease' },
      { id: 'equipmentreadiness', title: 'Equipment Readiness', route: '/quality/equipmentreadiness' },
    ],
  },
  {
    id: 'in-process',
    title: 'In-Process Quality Forms',
    icon: Package,
    color: '#8B5CF6',
    forms: [
      { id: 'firstarticle', title: 'First Article Inspection', route: '/quality/firstarticle' },
      { id: 'labelverification', title: 'Label Verification', route: '/quality/labelverification' },
      { id: 'datecodeverification', title: 'Date Code Verification', route: '/quality/datecodeverification' },
      { id: 'packagingintegrity', title: 'Packaging Integrity', route: '/quality/packagingintegrity' },
      { id: 'sealstrengthlog', title: 'Seal Strength Test', route: '/quality/sealstrengthlog' },
      { id: 'foreignmateriallog', title: 'Foreign Material Check', route: '/quality/foreignmateriallog' },
      { id: 'organoleptic', title: 'Organoleptic Evaluation', route: '/quality/organoleptic' },
    ],
  },
  {
    id: 'cross-department',
    title: 'Cross-Department Documentation',
    icon: Wrench,
    color: '#F97316',
    forms: [
      { id: 'roomhygienelog', title: 'Room Hygiene Log', route: '/quality/roomhygienelog' },
      { id: 'equipmenthygiene', title: 'Equipment Hygiene Sign-off', route: '/quality/equipmenthygiene' },
      { id: 'envswablog', title: 'Environmental Swab Log', route: '/quality/envswablog' },
    ],
  },
  {
    id: 'receiving-supplier',
    title: 'Receiving & Supplier Forms',
    icon: Truck,
    color: '#F59E0B',
    forms: [
      { id: 'incominginspection', title: 'Incoming Inspection', route: '/quality/incominginspection' },
      { id: 'ingredientreceiving', title: 'Ingredient Receiving', route: '/quality/ingredientreceiving' },
      { id: 'coareview', title: 'COA Review', route: '/quality/coareview' },
      { id: 'receivingtemp', title: 'Receiving Temperature', route: '/quality/receivingtemp' },
      { id: 'supplierapproval', title: 'Supplier Approval', route: '/quality/supplierapproval' },
      { id: 'suppliercorrectiveaction', title: 'Supplier SCAR', route: '/quality/suppliercorrectiveaction' },
      { id: 'rejectedmateriallog', title: 'Rejected Material Log', route: '/quality/rejectedmateriallog' },
    ],
  },
  {
    id: 'non-conformance',
    title: 'Non-Conformance & Corrective Action',
    icon: AlertTriangle,
    color: '#EF4444',
    forms: [
      { id: 'ncr', title: 'NCR', route: '/quality/ncr' },
      { id: 'capa', title: 'CAPA', route: '/quality/capa' },
      { id: 'deviation', title: 'Deviation Report', route: '/quality/deviation' },
      { id: 'customercomplaint', title: 'Customer Complaint', route: '/quality/customercomplaint' },
      { id: 'internalcomplaint', title: 'Internal Complaint', route: '/quality/internalcomplaint' },
      { id: 'rootcause', title: 'Root Cause Analysis', route: '/quality/rootcause' },
      { id: 'fivewhys', title: '5 Whys Worksheet', route: '/quality/fivewhys' },
    ],
  },
  {
    id: 'hold-release',
    title: 'Hold & Release Forms',
    icon: Lock,
    color: '#DC2626',
    forms: [
      { id: 'holdtag', title: 'Quality Hold Tag', route: '/quality/holdtag' },
      { id: 'holdrelease', title: 'Hold Release', route: '/quality/holdrelease' },
      { id: 'disposition', title: 'Disposition Form', route: '/quality/disposition' },
      { id: 'reworkauth', title: 'Rework Authorization', route: '/quality/reworkauth' },
      { id: 'reworklog', title: 'Rework Tracking', route: '/quality/reworklog' },
    ],
  },
  {
    id: 'testing-lab',
    title: 'Testing & Laboratory Forms',
    icon: FlaskConical,
    color: '#06B6D4',
    forms: [
      { id: 'microtest', title: 'Micro Testing Request', route: '/quality/microtest' },
      { id: 'atplog', title: 'ATP Testing Log', route: '/quality/atplog' },
      { id: 'allergenswablog', title: 'Allergen Swab Log', route: '/quality/allergenswablog' },
      { id: 'watertestlog', title: 'Water Testing Log', route: '/quality/watertestlog' },
      { id: 'samplecoc', title: 'Sample Chain of Custody', route: '/quality/samplecoc' },
      { id: 'shelflifelog', title: 'Shelf Life Testing', route: '/quality/shelflifelog' },
      { id: 'retainedsamplelog', title: 'Retained Sample Log', route: '/quality/retainedsamplelog' },
    ],
  },
  {
    id: 'traceability',
    title: 'Traceability Forms',
    icon: FileSearch,
    color: '#6366F1',
    forms: [
      { id: 'batchlotrecord', title: 'Batch/Lot Record', route: '/quality/batchlotrecord' },
      { id: 'ingredienttrace', title: 'Ingredient Traceability', route: '/quality/ingredienttrace' },
      { id: 'productionrunsheet', title: 'Production Run Sheet', route: '/quality/productionrunsheet' },
      { id: 'finishedproductrelease', title: 'Finished Product Release', route: '/quality/finishedproductrelease' },
      { id: 'mockrecallexercise', title: 'Mock Recall Exercise', route: '/quality/mockrecallexercise' },
      { id: 'traceabilitytest', title: 'Traceability Test', route: '/quality/traceabilitytest' },
    ],
  },
  {
    id: 'calibration',
    title: 'Calibration & Verification',
    icon: Settings,
    color: '#78716C',
    forms: [
      { id: 'thermometercalibration', title: 'Thermometer Calibration', route: '/quality/thermometercalibration' },
      { id: 'scalecalibrationlog', title: 'Scale Calibration Log', route: '/quality/scalecalibrationlog' },
      { id: 'metaldetectorcalibration', title: 'Metal Detector Calibration', route: '/quality/metaldetectorcalibration' },
      { id: 'phmetercalibration', title: 'pH Meter Calibration', route: '/quality/phmetercalibration' },
      { id: 'equipmentverification', title: 'Equipment Verification', route: '/quality/equipmentverification' },
    ],
  },
  {
    id: 'allergen',
    title: 'Allergen Management',
    icon: AlertCircle,
    color: '#F97316',
    forms: [
      { id: 'allergenmatrix', title: 'Allergen Matrix', route: '/quality/allergenmatrix' },
      { id: 'allergenchangechecklist', title: 'Allergen Changeover Checklist', route: '/quality/allergenchangechecklist' },
      { id: 'allergencleaningverification', title: 'Allergen Cleaning Verification', route: '/quality/allergencleaningverification' },
      { id: 'allergenlabelreview', title: 'Allergen Label Review', route: '/quality/allergenlabelreview' },
    ],
  },
  {
    id: 'environmental',
    title: 'Environmental Monitoring',
    icon: Bug,
    color: '#84CC16',
    forms: [
      { id: 'envmonitorschedule', title: 'Environmental Monitoring Schedule', route: '/quality/envmonitorschedule' },
      { id: 'listerialog', title: 'Listeria Sampling Log', route: '/quality/listerialog' },
      { id: 'salmonellalog', title: 'Salmonella Sampling Log', route: '/quality/salmonellalog' },
      { id: 'zonemapping', title: 'Zone Mapping', route: '/quality/zonemapping' },
      { id: 'positivecorrectiveaction', title: 'Positive Result CA', route: '/quality/positivecorrectiveaction' },
    ],
  },
  {
    id: 'gmp-hygiene',
    title: 'GMP & Hygiene Forms',
    icon: Users,
    color: '#0891B2',
    forms: [
      { id: 'gmpinspection', title: 'GMP Inspection', route: '/quality/gmpinspection' },
      { id: 'employeehygiene', title: 'Employee Hygiene Check', route: '/quality/employeehygiene' },
      { id: 'handwashinglog', title: 'Handwashing Verification', route: '/quality/handwashinglog' },
      { id: 'illnessreport', title: 'Illness/Injury Report', route: '/quality/illnessreport' },
      { id: 'visitorlog', title: 'Visitor Log', route: '/quality/visitorlog' },
      { id: 'glassregister', title: 'Glass & Brittle Register', route: '/quality/glassregister' },
      { id: 'glassbreakage', title: 'Glass Breakage Report', route: '/quality/glassbreakage' },
    ],
  },
  {
    id: 'document-control',
    title: 'Document Control',
    icon: FileText,
    color: '#A855F7',
    forms: [
      { id: 'docchangerequest', title: 'Document Change Request', route: '/quality/docchangerequest' },
      { id: 'docreviewapproval', title: 'Document Review/Approval', route: '/quality/docreviewapproval' },
      { id: 'controlleddoclog', title: 'Controlled Document Log', route: '/quality/controlleddoclog' },
      { id: 'obsoletedoc', title: 'Obsolete Document Disposal', route: '/quality/obsoletedoc' },
      { id: 'trainingsignoff', title: 'Training Sign-Off', route: '/quality/trainingsignoff' },
    ],
  },
  {
    id: 'audit',
    title: 'Audit Forms',
    icon: Search,
    color: '#EC4899',
    forms: [
      { id: 'internalauditchecklist', title: 'Internal Audit Checklist', route: '/quality/internalauditchecklist' },
      { id: 'internalauditreport', title: 'Internal Audit Report', route: '/quality/internalauditreport' },
      { id: 'auditfindingtracking', title: 'Audit Finding Tracking', route: '/quality/auditfindingtracking' },
      { id: 'externalauditprep', title: 'External Audit Prep', route: '/quality/externalauditprep' },
      { id: 'auditcalog', title: 'Audit CA Log', route: '/quality/auditcalog' },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & Distribution',
    icon: Ship,
    color: '#14B8A6',
    forms: [
      { id: 'finishedproductinspection', title: 'Finished Product Inspection', route: '/quality/finishedproductinspection' },
      { id: 'shippingtemplog', title: 'Shipping Temperature Log', route: '/quality/shippingtemplog' },
      { id: 'loadinspection', title: 'Load Inspection', route: '/quality/loadinspection' },
      { id: 'trailerinspection', title: 'Trailer Inspection', route: '/quality/trailerinspection' },
      { id: 'coc', title: 'Certificate of Conformance', route: '/quality/coc' },
    ],
  },
  {
    id: 'recall-crisis',
    title: 'Recall & Crisis',
    icon: Siren,
    color: '#B91C1C',
    forms: [
      { id: 'recallinitiation', title: 'Recall Initiation', route: '/quality/recallinitiation' },
      { id: 'recalleffectiveness', title: 'Recall Effectiveness', route: '/quality/recalleffectiveness' },
      { id: 'consumerinvestigation', title: 'Consumer Investigation', route: '/quality/consumerinvestigation' },
      { id: 'crisiscommlog', title: 'Crisis Communication Log', route: '/quality/crisiscommlog' },
    ],
  },
  {
    id: 'supplier-quality',
    title: 'Supplier Quality',
    icon: UserCheck,
    color: '#059669',
    forms: [
      { id: 'approvedsupplierlist', title: 'Approved Supplier List', route: '/quality/approvedsupplierlist' },
      { id: 'supplieraudit', title: 'Supplier Audit', route: '/quality/supplieraudit' },
      { id: 'supplierscorecard', title: 'Supplier Scorecard', route: '/quality/supplierscorecard' },
      { id: 'supplierperformance', title: 'Supplier Performance', route: '/quality/supplierperformance' },
    ],
  },
];

export default function QualityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { dashboardStats, todaysTasks, pendingSignOffs, getTaskReminderStatus, refetch: refetchTasks } = useSupabaseQualityTasks();
  const { openNCRs, getOverdueCAPAs, refetch: refetchQuality } = useSupabaseQuality();
  
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';

  const handleCreateQualityHistoryRecord = useCallback(async (
    task: TaskFeedDepartmentTask,
    notes: string
  ): Promise<string | null> => {
    try {
      if (!organizationId) {
        console.warn('[Quality] No organization ID available, skipping history record creation');
        return null;
      }
      
      console.log('[Quality] Creating quality inspection record for task:', task.postNumber);
      
      const inspectionNumber = `TF-QA-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('quality_inspections')
        .insert({
          organization_id: organizationId,
          inspection_number: inspectionNumber,
          inspection_type: 'periodic',
          status: 'completed',
          result: 'pass',
          facility_id: facilityId || null,
          product_name: `Task Feed: ${task.postNumber}`,
          inspection_date: new Date().toISOString().split('T')[0],
          notes: `Completed from Task Feed assignment.\n\nPost: ${task.postNumber}\nNotes: ${notes || 'No additional notes'}`,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[Quality] Error creating inspection record:', error.message || error.code || 'Unknown error');
        console.error('[Quality] Error details:', error.details || 'No details');
        console.error('[Quality] Error hint:', error.hint || 'No hint');
        return null;
      }

      console.log('[Quality] Quality inspection record created:', data.id);
      return data.id;
    } catch (err: any) {
      console.error('[Quality] Exception creating inspection record:', err?.message || 'Unknown exception');
      return null;
    }
  }, [organizationId, facilityId]);

  const handleTaskCompleted = useCallback((task: TaskFeedDepartmentTask, moduleHistoryId?: string) => {
    console.log('[Quality] Task completed:', task.postNumber, 'History ID:', moduleHistoryId);
    refetchTasks();
    refetchQuality();
  }, [refetchTasks, refetchQuality]);

  const upcomingTasks = useMemo(() => {
    return todaysTasks.filter(task => {
      if (task.status === 'completed' || task.status === 'skipped') return false;
      const status = getTaskReminderStatus(task);
      return status === 'can_start' || status === 'due_now' || status === 'almost_late';
    }).slice(0, 3);
  }, [todaysTasks, getTaskReminderStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchTasks();
    refetchQuality();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetchTasks, refetchQuality]);

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
    { 
      label: 'Open Tasks', 
      value: dashboardStats.openTasks.toString(), 
      icon: ClipboardList, 
      color: '#F59E0B' 
    },
    { 
      label: 'Completed Today', 
      value: dashboardStats.completedToday.toString(), 
      icon: CheckCircle2, 
      color: '#10B981' 
    },
    { 
      label: 'Pending Review', 
      value: dashboardStats.pendingReview.toString(), 
      icon: Clock, 
      color: '#3B82F6' 
    },
    { 
      label: 'First Pass Yield', 
      value: `${dashboardStats.firstPassYield}%`, 
      icon: TrendingUp, 
      color: '#8B5CF6' 
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'can_start': return '#10B981';
      case 'due_now': return '#F59E0B';
      case 'almost_late': return '#EF4444';
      case 'overdue': return '#DC2626';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'can_start': return 'Available';
      case 'due_now': return 'Due Now';
      case 'almost_late': return 'Almost Late';
      case 'overdue': return 'Overdue';
      default: return 'Scheduled';
    }
  };

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
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <ShieldCheck size={32} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Quality Management</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track quality metrics, scheduled checks, NCRs, and compliance
          </Text>
        </View>

        <TaskFeedInbox
          departmentCode="1004"
          moduleColor="#3B82F6"
          onTaskCompleted={handleTaskCompleted}
          createModuleHistoryRecord={handleCreateQualityHistoryRecord}
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

        {upcomingTasks.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Bell size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks Requiring Attention</Text>
            </View>
            {upcomingTasks.map((task) => {
              const status = getTaskReminderStatus(task);
              const statusColor = getStatusColor(status);
              return (
                <Pressable
                  key={task.id}
                  style={({ pressed }) => [
                    styles.taskCard,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: statusColor,
                      borderLeftWidth: 3,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => handleFormPress('/quality/hourlylinechecks')}
                >
                  <View style={styles.taskHeader}>
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.taskMeta}>
                    <Timer size={14} color={colors.textSecondary} />
                    <Text style={[styles.taskMetaText, { color: colors.textSecondary }]}>
                      Due: {task.due_time} • Window: {task.window_start} - {task.window_end}
                    </Text>
                  </View>
                  {task.line_name && (
                    <Text style={[styles.taskLocation, { color: colors.textTertiary }]}>
                      {task.line_name} • {task.location}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {pendingSignOffs.length > 0 && (
          <View style={styles.upcomingSection}>
            <View style={styles.sectionHeader}>
              <Wrench size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Quality Sign-offs</Text>
            </View>
            {pendingSignOffs.slice(0, 2).map((doc) => (
              <Pressable
                key={doc.id}
                style={({ pressed }) => [
                  styles.taskCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: '#F97316',
                    borderLeftWidth: 3,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleFormPress('/quality/equipmenthygiene')}
              >
                <View style={styles.taskHeader}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
                    {doc.equipment_name} - {doc.doc_type.replace('_', ' ')}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#F97316' + '20' }]}>
                    <Text style={[styles.statusText, { color: '#F97316' }]}>
                      Awaiting QA
                    </Text>
                  </View>
                </View>
                <Text style={[styles.taskLocation, { color: colors.textSecondary }]}>
                  {doc.performed_by} ({doc.performed_by_department}) • {doc.work_date}
                </Text>
                <Text style={[styles.taskLocation, { color: colors.textTertiary }]}>
                  {doc.work_performed}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {(openNCRs.length > 0 || getOverdueCAPAs().length > 0) && (
          <View style={styles.alertSection}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quality Alerts</Text>
            </View>
            <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {openNCRs.length > 0 && (
                <Pressable 
                  style={styles.alertRow}
                  onPress={() => handleFormPress('/quality/ncr')}
                >
                  <View style={[styles.alertDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.alertText, { color: colors.text }]}>
                    {openNCRs.length} Open NCR{openNCRs.length > 1 ? 's' : ''}
                  </Text>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </Pressable>
              )}
              {getOverdueCAPAs().length > 0 && (
                <Pressable 
                  style={[styles.alertRow, { borderTopWidth: openNCRs.length > 0 ? 1 : 0, borderTopColor: colors.border }]}
                  onPress={() => handleFormPress('/quality/capa')}
                >
                  <View style={[styles.alertDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.alertText, { color: colors.text }]}>
                    {getOverdueCAPAs().length} Overdue CAPA{getOverdueCAPAs().length > 1 ? 's' : ''}
                  </Text>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        <Text style={[styles.formsSectionTitle, { color: colors.text }]}>Quality Forms</Text>

        {QUALITY_FORM_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isExpanded = expandedCategories.has(category.id);
          
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
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <IconComponent size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                      {category.forms.length} forms
                    </Text>
                  </View>
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>
              
              {isExpanded && (
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
    marginBottom: 20,
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
  upcomingSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  taskCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  taskMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  taskMetaText: {
    fontSize: 12,
  },
  taskLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  alertSection: {
    marginBottom: 20,
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  alertRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  formsSectionTitle: {
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
