import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  UserPlus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Monitor,
  GraduationCap,
  Key,
  Users,
  Shield,
  X,
  Calendar,
  Building2,
  ClipboardList,
  Plus,
  Check,
  Milestone,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useOnboardings,
  useOnboardingTemplates,
  useCreateOnboarding,
  useUpdateOnboarding,
  useOnboardingStats,
  WORKFLOW_STAGES,
  DEPARTMENTS,
  FACILITIES,
  SUPERVISORS,
  BUDDIES,
  DEFAULT_MILESTONES,
  DOCUMENT_TYPES,
} from '@/hooks/useSupabaseOnboarding';
import {
  type OnboardingStatus,
  ONBOARDING_STATUS_COLORS,
  ONBOARDING_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
} from '@/constants/onboardingConstants';

type DocumentStatus = 'not_submitted' | 'submitted' | 'pending_review' | 'approved' | 'rejected';
type WorkflowStage = 'pre_boarding' | 'first_day' | 'first_week' | 'first_month' | 'ongoing';
type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
type OnboardingTaskCategory = 'documents' | 'equipment' | 'training' | 'access' | 'orientation' | 'compliance';

interface OnboardingTask {
  id: string;
  name: string;
  description: string;
  category: OnboardingTaskCategory;
  dueDate: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  isRequired: boolean;
  completedAt?: string;
  completedBy?: string;
  estimatedMinutes: number;
}

interface OnboardingDocument {
  id: string;
  documentName: string;
  status: DocumentStatus;
  dueDate: string;
  isRequired: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
}

interface OnboardingNote {
  id: string;
  onboardingId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  noteType: 'general' | 'status_change' | 'milestone';
}

interface WorkflowMilestone {
  id: string;
  name: string;
  stage: WorkflowStage;
  status: MilestoneStatus;
  completedAt?: string;
  completedBy?: string;
}

interface StatusHistoryEntry {
  id: string;
  onboardingId: string;
  fromStatus: OnboardingStatus;
  toStatus: OnboardingStatus;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

interface NewHireOnboarding {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  position: string;
  department: string;
  facilityId: string;
  facilityName: string;
  startDate: string;
  supervisorId?: string;
  supervisorName?: string;
  buddyId?: string;
  buddyName?: string;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  workLocation?: string;
  salary?: number;
  salaryType?: 'hourly' | 'annual';
  status: OnboardingStatus;
  currentStage: WorkflowStage;
  progress: number;
  tasks: OnboardingTask[];
  documents: OnboardingDocument[];
  milestones: WorkflowMilestone[];
  notes: OnboardingNote[];
  statusHistory: StatusHistoryEntry[];
  onHoldReason?: string;
  completedAt?: string;
  updatedAt: string;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  employeeType: 'full_time' | 'part_time' | 'contractor' | 'intern';
  isActive: boolean;
  tasks: OnboardingTask[];
}

const ONBOARDING_STATUS_CONFIG: Record<OnboardingStatus, { label: string; color: string }> = {
  pending: { label: ONBOARDING_STATUS_LABELS.pending, color: ONBOARDING_STATUS_COLORS.pending },
  in_progress: { label: ONBOARDING_STATUS_LABELS.in_progress, color: ONBOARDING_STATUS_COLORS.in_progress },
  completed: { label: ONBOARDING_STATUS_LABELS.completed, color: ONBOARDING_STATUS_COLORS.completed },
  on_hold: { label: ONBOARDING_STATUS_LABELS.on_hold, color: ONBOARDING_STATUS_COLORS.on_hold },
  cancelled: { label: ONBOARDING_STATUS_LABELS.cancelled, color: ONBOARDING_STATUS_COLORS.cancelled },
  not_started: { label: 'Not Started', color: '#6B7280' },
};

const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string }> = {
  not_submitted: { label: 'Not Submitted', color: '#6B7280' },
  submitted: { label: 'Submitted', color: '#3B82F6' },
  pending_review: { label: 'Pending Review', color: '#F59E0B' },
  approved: { label: 'Approved', color: '#10B981' },
  rejected: { label: 'Rejected', color: '#EF4444' },
};

const TASK_CATEGORY_CONFIG: Record<OnboardingTaskCategory, { label: string; color: string }> = {
  documents: { label: TASK_CATEGORY_LABELS.documentation, color: '#3B82F6' },
  equipment: { label: TASK_CATEGORY_LABELS.equipment, color: '#8B5CF6' },
  training: { label: TASK_CATEGORY_LABELS.training, color: '#10B981' },
  access: { label: TASK_CATEGORY_LABELS.access, color: '#F59E0B' },
  orientation: { label: TASK_CATEGORY_LABELS.orientation, color: '#EC4899' },
  compliance: { label: 'Compliance', color: '#EF4444' },
};
import WorkflowTimeline from '@/components/WorkflowTimeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'active' | 'completed' | 'templates';
type FilterStatus = 'all' | OnboardingStatus;
type StageFilter = 'all' | WorkflowStage;

const CATEGORY_ICONS: Record<OnboardingTaskCategory, React.ComponentType<{ size: number; color: string }>> = {
  documents: FileText,
  equipment: Monitor,
  training: GraduationCap,
  access: Key,
  orientation: Users,
  compliance: Shield,
};

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedOnboarding, setSelectedOnboarding] = useState<NewHireOnboarding | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [newHireModalVisible, setNewHireModalVisible] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<'tasks' | 'documents' | 'milestones' | 'notes'>('tasks');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteIsPrivate, setNoteIsPrivate] = useState(false);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [selectedNewStatus, setSelectedNewStatus] = useState<OnboardingStatus | null>(null);
  const [createStep, setCreateStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [newHireForm, setNewHireForm] = useState({
    employeeName: '',
    employeeEmail: '',
    employeePhone: '',
    position: '',
    department: '',
    facilityId: '',
    startDate: '',
    supervisorId: '',
    buddyId: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contractor' | 'intern',
    workLocation: '',
    salary: '',
    salaryType: 'annual' as 'hourly' | 'annual',
  });

  const { data: onboardingsData, isLoading, refetch } = useOnboardings();
  const { data: templatesData } = useOnboardingTemplates();
  const createOnboardingMutation = useCreateOnboarding();
  const updateOnboardingMutation = useUpdateOnboarding();
  const stats = useOnboardingStats();
  
  const [onboardings, setOnboardings] = useState<NewHireOnboarding[]>([]);

  useEffect(() => {
    if (onboardingsData) {
      setOnboardings(onboardingsData);
      console.log('[OnboardingScreen] Loaded', onboardingsData.length, 'onboardings');
    }
  }, [onboardingsData]);

  const templates = useMemo(() => templatesData || [], [templatesData]);

  const filteredOnboardings = useMemo(() => {
    let filtered = onboardings;

    if (viewMode === 'active') {
      filtered = filtered.filter(o => o.status !== 'completed');
    } else if (viewMode === 'completed') {
      filtered = filtered.filter(o => o.status === 'completed');
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(o => o.currentStage === stageFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.employeeName.toLowerCase().includes(query) ||
        o.position.toLowerCase().includes(query) ||
        o.department.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [onboardings, viewMode, statusFilter, stageFilter, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      console.log('[OnboardingScreen] Refreshed onboardings');
    } catch (error) {
      console.error('[OnboardingScreen] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const openDetailModal = useCallback((onboarding: NewHireOnboarding) => {
    setSelectedOnboarding(onboarding);
    setActiveTaskTab('milestones');
    setDetailModalVisible(true);
    console.log('Opening onboarding detail for:', onboarding.employeeName);
  }, []);

  const handleMilestoneStatusChange = useCallback((milestoneId: string, newStatus: MilestoneStatus) => {
    if (!selectedOnboarding) return;

    setOnboardings(prev => prev.map(o => {
      if (o.id !== selectedOnboarding.id) return o;
      
      const updatedMilestones = o.milestones.map(m => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          completedBy: newStatus === 'completed' ? 'Current User' : undefined,
        };
      });

      const completedCount = updatedMilestones.filter(m => m.status === 'completed').length;
      const progress = Math.round((completedCount / updatedMilestones.length) * 100);

      const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.id === o.currentStage);
      let newStage = o.currentStage;
      
      for (let i = currentStageIndex; i < WORKFLOW_STAGES.length; i++) {
        const stageMilestones = updatedMilestones.filter(m => m.stage === WORKFLOW_STAGES[i].id);
        const allCompleted = stageMilestones.every(m => m.status === 'completed');
        if (allCompleted && i < WORKFLOW_STAGES.length - 1) {
          newStage = WORKFLOW_STAGES[i + 1].id;
        } else {
          break;
        }
      }

      return {
        ...o,
        milestones: updatedMilestones,
        progress,
        currentStage: newStage,
        status: progress === 100 ? 'completed' : o.status === 'not_started' ? 'in_progress' : o.status,
        updatedAt: new Date().toISOString(),
      };
    }));

    setSelectedOnboarding(prev => {
      if (!prev) return null;
      const updatedMilestones = prev.milestones.map(m => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          completedBy: newStatus === 'completed' ? 'Current User' : undefined,
        };
      });
      const completedCount = updatedMilestones.filter(m => m.status === 'completed').length;
      const progress = Math.round((completedCount / updatedMilestones.length) * 100);
      return { ...prev, milestones: updatedMilestones, progress };
    });

    console.log('Milestone status updated:', milestoneId, newStatus);
  }, [selectedOnboarding]);

  const handleTaskStatusChange = useCallback((taskId: string, newStatus: 'completed' | 'in_progress') => {
    if (!selectedOnboarding) return;

    setOnboardings(prev => prev.map(o => {
      if (o.id !== selectedOnboarding.id) return o;
      
      const updatedTasks = o.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          completedBy: newStatus === 'completed' ? 'Current User' : undefined,
        };
      });

      const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);

      return {
        ...o,
        tasks: updatedTasks,
        progress,
        status: progress === 100 ? 'completed' : o.status === 'not_started' ? 'in_progress' : o.status,
        updatedAt: new Date().toISOString(),
      };
    }));

    setSelectedOnboarding(prev => {
      if (!prev) return null;
      const updatedTasks = prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          completedBy: newStatus === 'completed' ? 'Current User' : undefined,
        };
      });
      const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      return { ...prev, tasks: updatedTasks, progress };
    });

    console.log('Task status updated:', taskId, newStatus);
  }, [selectedOnboarding]);

  const handleDocumentApproval = useCallback((docId: string, approved: boolean) => {
    if (!selectedOnboarding) return;

    const newStatus: DocumentStatus = approved ? 'approved' : 'rejected';

    setOnboardings(prev => prev.map(o => {
      if (o.id !== selectedOnboarding.id) return o;
      
      const updatedDocs: OnboardingDocument[] = o.documents.map(d => {
        if (d.id !== docId) return d;
        return {
          ...d,
          status: newStatus,
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Current User',
        };
      });

      return { ...o, documents: updatedDocs, updatedAt: new Date().toISOString() };
    }));

    setSelectedOnboarding(prev => {
      if (!prev) return null;
      const updatedDocs: OnboardingDocument[] = prev.documents.map(d => {
        if (d.id !== docId) return d;
        return {
          ...d,
          status: newStatus,
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Current User',
        };
      });
      return { ...prev, documents: updatedDocs };
    });

    Alert.alert('Success', `Document ${approved ? 'approved' : 'rejected'} successfully`);
  }, [selectedOnboarding]);

  const handleAddNote = useCallback(() => {
    if (!selectedOnboarding || !newNote.trim()) return;

    const note: OnboardingNote = {
      id: `note-${Date.now()}`,
      onboardingId: selectedOnboarding.id,
      content: newNote.trim(),
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      isPrivate: noteIsPrivate,
      noteType: 'general',
    };

    setOnboardings(prev => prev.map(o => {
      if (o.id !== selectedOnboarding.id) return o;
      return { ...o, notes: [...o.notes, note], updatedAt: new Date().toISOString() };
    }));

    setSelectedOnboarding(prev => {
      if (!prev) return null;
      return { ...prev, notes: [...prev.notes, note] };
    });

    setNewNote('');
    setNoteIsPrivate(false);
    setNoteModalVisible(false);
    console.log('Note added:', note.content);
  }, [selectedOnboarding, newNote, noteIsPrivate]);

  const handleStatusChange = useCallback(() => {
    if (!selectedOnboarding || !selectedNewStatus) return;

    const statusHistoryEntry = {
      id: `sh-${Date.now()}`,
      onboardingId: selectedOnboarding.id,
      fromStatus: selectedOnboarding.status,
      toStatus: selectedNewStatus,
      changedBy: 'Current User',
      changedAt: new Date().toISOString(),
      reason: statusChangeReason || undefined,
    };

    const statusNote: OnboardingNote = {
      id: `note-${Date.now()}`,
      onboardingId: selectedOnboarding.id,
      content: `Status changed from ${ONBOARDING_STATUS_CONFIG[selectedOnboarding.status].label} to ${ONBOARDING_STATUS_CONFIG[selectedNewStatus].label}${statusChangeReason ? `: ${statusChangeReason}` : ''}`,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      isPrivate: false,
      noteType: 'status_change',
    };

    setOnboardings(prev => prev.map(o => {
      if (o.id !== selectedOnboarding.id) return o;
      return {
        ...o,
        status: selectedNewStatus,
        onHoldReason: selectedNewStatus === 'on_hold' ? statusChangeReason : undefined,
        statusHistory: [...o.statusHistory, statusHistoryEntry],
        notes: [...o.notes, statusNote],
        updatedAt: new Date().toISOString(),
        completedAt: selectedNewStatus === 'completed' ? new Date().toISOString() : o.completedAt,
      };
    }));

    setSelectedOnboarding(prev => {
      if (!prev) return null;
      return {
        ...prev,
        status: selectedNewStatus,
        onHoldReason: selectedNewStatus === 'on_hold' ? statusChangeReason : undefined,
        statusHistory: [...prev.statusHistory, statusHistoryEntry],
        notes: [...prev.notes, statusNote],
      };
    });

    setStatusModalVisible(false);
    setSelectedNewStatus(null);
    setStatusChangeReason('');
    Alert.alert('Success', 'Onboarding status updated');
  }, [selectedOnboarding, selectedNewStatus, statusChangeReason]);

  const resetNewHireForm = useCallback(() => {
    setNewHireForm({
      employeeName: '',
      employeeEmail: '',
      employeePhone: '',
      position: '',
      department: '',
      facilityId: '',
      startDate: '',
      supervisorId: '',
      buddyId: '',
      employmentType: 'full_time',
      workLocation: '',
      salary: '',
      salaryType: 'annual',
    });
    setSelectedTemplateId(null);
    setCreateStep(1);
  }, []);

  const handleCreateOnboarding = useCallback(async () => {
    if (!selectedTemplateId) {
      Alert.alert('Error', 'Please select a template');
      return;
    }

    if (!newHireForm.employeeName || !newHireForm.employeeEmail || !newHireForm.position || !newHireForm.department || !newHireForm.startDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const result = await createOnboardingMutation.mutateAsync({
        employee_name: newHireForm.employeeName,
        employee_email: newHireForm.employeeEmail,
        employee_phone: newHireForm.employeePhone || undefined,
        position: newHireForm.position,
        department: newHireForm.department,
        facility_id: newHireForm.facilityId || 'fac-1',
        start_date: newHireForm.startDate,
        template_id: selectedTemplateId,
        supervisor_id: newHireForm.supervisorId || undefined,
        buddy_id: newHireForm.buddyId || undefined,
        employment_type: newHireForm.employmentType,
        work_location: newHireForm.workLocation || undefined,
        salary: newHireForm.salary ? parseFloat(newHireForm.salary) : undefined,
        salary_type: newHireForm.salaryType,
      });

      setOnboardings(prev => [result, ...prev]);
      setNewHireModalVisible(false);
      resetNewHireForm();
      Alert.alert('Success', `Onboarding created for ${newHireForm.employeeName}`);
      console.log('[OnboardingScreen] New onboarding created:', result.id);
    } catch (error) {
      console.error('[OnboardingScreen] Error creating onboarding:', error);
      Alert.alert('Error', 'Failed to create onboarding. Please try again.');
    }
  }, [selectedTemplateId, newHireForm, resetNewHireForm, createOnboardingMutation]);

  const handleUpdateOnboarding = useCallback(async () => {
    if (!selectedOnboarding) return;

    const supervisor = SUPERVISORS.find(s => s.id === newHireForm.supervisorId);
    const buddy = BUDDIES.find(b => b.id === newHireForm.buddyId);
    const facility = FACILITIES.find(f => f.id === newHireForm.facilityId);

    try {
      await updateOnboardingMutation.mutateAsync({
        id: selectedOnboarding.id,
        updates: {
          position: newHireForm.position || undefined,
          department: newHireForm.department || undefined,
          facility_id: newHireForm.facilityId || undefined,
          supervisor_id: newHireForm.supervisorId || undefined,
          buddy_id: newHireForm.buddyId || undefined,
          work_location: newHireForm.workLocation || undefined,
        },
      });

      setOnboardings(prev => prev.map(o => {
        if (o.id !== selectedOnboarding.id) return o;
        return {
          ...o,
          position: newHireForm.position || o.position,
          department: newHireForm.department || o.department,
          facilityId: newHireForm.facilityId || o.facilityId,
          facilityName: facility?.name || o.facilityName,
          supervisorId: newHireForm.supervisorId || o.supervisorId,
          supervisorName: supervisor?.name || o.supervisorName,
          buddyId: newHireForm.buddyId || o.buddyId,
          buddyName: buddy?.name || o.buddyName,
          workLocation: newHireForm.workLocation || o.workLocation,
          updatedAt: new Date().toISOString(),
        };
      }));

      setSelectedOnboarding(prev => {
        if (!prev) return null;
        return {
          ...prev,
          position: newHireForm.position || prev.position,
          department: newHireForm.department || prev.department,
          facilityId: newHireForm.facilityId || prev.facilityId,
          facilityName: facility?.name || prev.facilityName,
          supervisorId: newHireForm.supervisorId || prev.supervisorId,
          supervisorName: supervisor?.name || prev.supervisorName,
          buddyId: newHireForm.buddyId || prev.buddyId,
          buddyName: buddy?.name || prev.buddyName,
          workLocation: newHireForm.workLocation || prev.workLocation,
        };
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Onboarding details updated');
      console.log('[OnboardingScreen] Onboarding updated:', selectedOnboarding.id);
    } catch (error) {
      console.error('[OnboardingScreen] Error updating onboarding:', error);
      Alert.alert('Error', 'Failed to update onboarding. Please try again.');
    }
  }, [selectedOnboarding, newHireForm, updateOnboardingMutation]);

  const openEditModal = useCallback(() => {
    if (!selectedOnboarding) return;
    setNewHireForm({
      employeeName: selectedOnboarding.employeeName,
      employeeEmail: selectedOnboarding.employeeEmail,
      employeePhone: selectedOnboarding.employeePhone || '',
      position: selectedOnboarding.position,
      department: selectedOnboarding.department,
      facilityId: selectedOnboarding.facilityId,
      startDate: selectedOnboarding.startDate,
      supervisorId: selectedOnboarding.supervisorId || '',
      buddyId: selectedOnboarding.buddyId || '',
      employmentType: selectedOnboarding.employmentType,
      workLocation: selectedOnboarding.workLocation || '',
      salary: selectedOnboarding.salary?.toString() || '',
      salaryType: selectedOnboarding.salaryType || 'annual',
    });
    setEditModalVisible(true);
  }, [selectedOnboarding]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntilStart = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const styles = createStyles(colors);

  const renderStatCard = (
    title: string,
    value: string | number,
    subtitle: string,
    color: string,
    Icon: React.ComponentType<{ size: number; color: string }>
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Icon size={20} color={color} />
        <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statCardTitle}>{title}</Text>
      <Text style={styles.statCardSubtitle}>{subtitle}</Text>
    </View>
  );

  const getStageConfig = (stageId: WorkflowStage) => {
    return WORKFLOW_STAGES.find(s => s.id === stageId) || WORKFLOW_STAGES[0];
  };

  const renderOnboardingCard = (onboarding: NewHireOnboarding) => {
    const statusConfig = ONBOARDING_STATUS_CONFIG[onboarding.status];
    const stageConfig = getStageConfig(onboarding.currentStage);
    const daysUntilStart = getDaysUntilStart(onboarding.startDate);
    const isStartingSoon = daysUntilStart <= 3 && daysUntilStart >= 0;
    const completedMilestones = onboarding.milestones?.filter(m => m.status === 'completed').length || 0;
    const totalMilestones = onboarding.milestones?.length || 0;

    return (
      <Pressable
        key={onboarding.id}
        style={styles.onboardingCard}
        onPress={() => openDetailModal(onboarding)}
      >
        <View style={styles.onboardingCardHeader}>
          <View style={styles.onboardingInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.employeeName}>{onboarding.employeeName}</Text>
              {isStartingSoon && onboarding.status !== 'completed' && (
                <View style={[styles.urgentBadge, { backgroundColor: '#FEF3C7' }]}>
                  <AlertCircle size={12} color="#D97706" />
                  <Text style={styles.urgentText}>Starting Soon</Text>
                </View>
              )}
            </View>
            <Text style={styles.positionText}>{onboarding.position}</Text>
            <View style={styles.metaRow}>
              <Building2 size={14} color={colors.textTertiary} />
              <Text style={styles.metaText}>{onboarding.department}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Calendar size={14} color={colors.textTertiary} />
              <Text style={styles.metaText}>Starts {formatDate(onboarding.startDate)}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>

        <View style={styles.stageIndicatorRow}>
          <View style={[styles.stagePill, { backgroundColor: stageConfig.color + '20' }]}>
            <Target size={12} color={stageConfig.color} />
            <Text style={[styles.stagePillText, { color: stageConfig.color }]}>
              {stageConfig.name}
            </Text>
          </View>
          {totalMilestones > 0 && (
            <View style={styles.milestoneSummary}>
              <Milestone size={12} color={colors.textTertiary} />
              <Text style={styles.milestoneSummaryText}>
                {completedMilestones}/{totalMilestones} milestones
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={[styles.progressValue, { color: statusConfig.color }]}>
              {onboarding.progress}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${onboarding.progress}%`, backgroundColor: statusConfig.color },
              ]}
            />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <View style={styles.taskSummary}>
            <Text style={styles.taskSummaryText}>
              {onboarding.tasks.filter(t => t.status === 'completed').length}/{onboarding.tasks.length} tasks
            </Text>
            {onboarding.documents.filter(d => d.status === 'pending_review').length > 0 && (
              <View style={styles.docsBadge}>
                <FileText size={12} color="#F59E0B" />
                <Text style={styles.docsText}>
                  {onboarding.documents.filter(d => d.status === 'pending_review').length} pending
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderTemplateCard = (template: OnboardingTemplate) => (
    <Pressable key={template.id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateIcon}>
          <ClipboardList size={24} color={colors.primary} />
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateType}>
            {template.employeeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: template.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[styles.activeText, { color: template.isActive ? '#059669' : '#DC2626' }]}>
            {template.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.templateDescription} numberOfLines={2}>
        {template.description}
      </Text>
      <View style={styles.templateStats}>
        <View style={styles.templateStat}>
          <CheckCircle size={14} color={colors.textTertiary} />
          <Text style={styles.templateStatText}>{template.tasks.length} tasks</Text>
        </View>
        <View style={styles.templateStat}>
          <Clock size={14} color={colors.textTertiary} />
          <Text style={styles.templateStatText}>
            ~{Math.round(template.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60)}h total
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderTaskItem = (task: OnboardingTask) => {
    const categoryConfig = TASK_CATEGORY_CONFIG[task.category];
    const CategoryIcon = CATEGORY_ICONS[task.category];
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <View key={task.id} style={[styles.taskItem, isOverdue && styles.taskItemOverdue]}>
        <Pressable
          style={[
            styles.taskCheckbox,
            task.status === 'completed' && { backgroundColor: '#10B981', borderColor: '#10B981' },
          ]}
          onPress={() => handleTaskStatusChange(
            task.id,
            task.status === 'completed' ? 'in_progress' : 'completed'
          )}
        >
          {task.status === 'completed' && <Check size={14} color="#FFF" />}
        </Pressable>
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[
              styles.taskName,
              task.status === 'completed' && styles.taskNameCompleted
            ]}>
              {task.name}
            </Text>
            {task.isRequired && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <Text style={styles.taskDescription} numberOfLines={1}>
            {task.description}
          </Text>
          <View style={styles.taskMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
              <CategoryIcon size={12} color={categoryConfig.color} />
              <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
            <Text style={[styles.dueDateText, isOverdue && { color: '#EF4444' }]}>
              Due: {formatDate(task.dueDate)}
            </Text>
          </View>
          {task.assignedTo && (
            <Text style={styles.assignedText}>Assigned: {task.assignedTo}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderDocumentItem = (doc: OnboardingDocument) => {
    const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status];
    const isOverdue = new Date(doc.dueDate) < new Date() && doc.status === 'not_submitted';

    return (
      <View key={doc.id} style={[styles.documentItem, isOverdue && styles.documentItemOverdue]}>
        <View style={styles.documentIcon}>
          <FileText size={20} color={statusConfig.color} />
        </View>
        <View style={styles.documentContent}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentName}>{doc.documentName}</Text>
            {doc.isRequired && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <View style={styles.documentMeta}>
            <View style={[styles.docStatusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Text style={[styles.docStatusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={[styles.docDueText, isOverdue && { color: '#EF4444' }]}>
              Due: {formatDate(doc.dueDate)}
            </Text>
          </View>
          {doc.status === 'pending_review' && (
            <View style={styles.documentActions}>
              <Pressable
                style={[styles.docActionBtn, styles.approveBtn]}
                onPress={() => handleDocumentApproval(doc.id, true)}
              >
                <Check size={14} color="#FFF" />
                <Text style={styles.docActionText}>Approve</Text>
              </Pressable>
              <Pressable
                style={[styles.docActionBtn, styles.rejectBtn]}
                onPress={() => handleDocumentApproval(doc.id, false)}
              >
                <X size={14} color="#FFF" />
                <Text style={styles.docActionText}>Reject</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          {renderStatCard('Active', stats.activeCount, 'In progress', '#3B82F6', UserPlus)}
          {renderStatCard('Completed', stats.completedCount, 'This month', '#10B981', CheckCircle)}
          {renderStatCard('Milestones', `${stats.milestoneCompletion}%`, 'Completion rate', '#8B5CF6', Milestone)}
          {renderStatCard('Pending Docs', stats.pendingDocuments, 'Need review', '#F59E0B', FileText)}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading onboardings...</Text>
          </View>
        )}

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, position, department..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.viewTabs}>
          {(['active', 'completed', 'templates'] as ViewMode[]).map(mode => (
            <Pressable
              key={mode}
              style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                {mode === 'active' ? 'Active' : mode === 'completed' ? 'Completed' : 'Templates'}
              </Text>
              {mode === 'active' && stats.activeCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{stats.activeCount}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {viewMode !== 'templates' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              {(['all', 'not_started', 'in_progress', 'on_hold'] as FilterStatus[]).map(status => (
                <Pressable
                  key={status}
                  style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                    {status === 'all' ? 'All Status' : ONBOARDING_STATUS_CONFIG[status].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              <Pressable
                style={[styles.filterChip, stageFilter === 'all' && styles.filterChipActive]}
                onPress={() => setStageFilter('all')}
              >
                <Text style={[styles.filterChipText, stageFilter === 'all' && styles.filterChipTextActive]}>
                  All Stages
                </Text>
              </Pressable>
              {WORKFLOW_STAGES.map(stage => (
                <Pressable
                  key={stage.id}
                  style={[styles.filterChip, stageFilter === stage.id && styles.filterChipActive]}
                  onPress={() => setStageFilter(stage.id)}
                >
                  <View style={[styles.stageFilterDot, { backgroundColor: stage.color }]} />
                  <Text style={[styles.filterChipText, stageFilter === stage.id && styles.filterChipTextActive]}>
                    {stage.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.listSection}>
          {viewMode === 'templates' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Onboarding Templates</Text>
                <Pressable style={styles.addButton}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addButtonText}>New Template</Text>
                </Pressable>
              </View>
              {templates.map(renderTemplateCard)}
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {viewMode === 'active' ? 'Active Onboardings' : 'Completed Onboardings'}
                </Text>
                <Pressable style={styles.addButton} onPress={() => setNewHireModalVisible(true)}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addButtonText}>New Hire</Text>
                </Pressable>
              </View>
              {filteredOnboardings.length === 0 ? (
                <View style={styles.emptyState}>
                  <UserPlus size={48} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>No onboardings found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? 'Try adjusting your search' : 'Start by adding a new hire'}
                  </Text>
                </View>
              ) : (
                filteredOnboardings.map(renderOnboardingCard)
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedOnboarding && (
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>{selectedOnboarding.employeeName}</Text>
                <Text style={styles.modalSubtitle}>{selectedOnboarding.position}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setDetailModalVisible(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={[styles.detailHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.detailInfo}>
                <View style={styles.detailRow}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{selectedOnboarding.department}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>Starts {formatDate(selectedOnboarding.startDate)}</Text>
                </View>
                {selectedOnboarding.supervisorName && (
                  <View style={styles.detailRow}>
                    <Users size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>Supervisor: {selectedOnboarding.supervisorName}</Text>
                  </View>
                )}
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressCircleValue}>{selectedOnboarding.progress}%</Text>
                <Text style={styles.progressCircleLabel}>Complete</Text>
              </View>
            </View>

            <View style={styles.detailTabs}>
              <Pressable
                style={[styles.detailTab, activeTaskTab === 'milestones' && styles.detailTabActive]}
                onPress={() => setActiveTaskTab('milestones')}
              >
                <Milestone size={18} color={activeTaskTab === 'milestones' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.detailTabText, activeTaskTab === 'milestones' && styles.detailTabTextActive]}>
                  Workflow ({selectedOnboarding.milestones?.length || 0})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.detailTab, activeTaskTab === 'tasks' && styles.detailTabActive]}
                onPress={() => setActiveTaskTab('tasks')}
              >
                <ClipboardList size={18} color={activeTaskTab === 'tasks' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.detailTabText, activeTaskTab === 'tasks' && styles.detailTabTextActive]}>
                  Tasks ({selectedOnboarding.tasks.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.detailTab, activeTaskTab === 'documents' && styles.detailTabActive]}
                onPress={() => setActiveTaskTab('documents')}
              >
                <FileText size={18} color={activeTaskTab === 'documents' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.detailTabText, activeTaskTab === 'documents' && styles.detailTabTextActive]}>
                  Docs ({selectedOnboarding.documents.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.detailTab, activeTaskTab === 'notes' && styles.detailTabActive]}
                onPress={() => setActiveTaskTab('notes')}
              >
                <FileText size={18} color={activeTaskTab === 'notes' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.detailTabText, activeTaskTab === 'notes' && styles.detailTabTextActive]}>
                  Notes ({selectedOnboarding.notes.length})
                </Text>
              </Pressable>
            </View>

            <View style={styles.actionButtonsRow}>
              <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]} onPress={openEditModal}>
                <FileText size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit Details</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: '#F59E0B15' }]} onPress={() => setStatusModalVisible(true)}>
                <AlertCircle size={16} color="#F59E0B" />
                <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Change Status</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {activeTaskTab === 'milestones' ? (
                <View style={styles.workflowContainer}>
                  {selectedOnboarding.milestones?.length === 0 ? (
                    <View style={styles.emptyTasks}>
                      <Text style={styles.emptyTasksText}>No milestones configured</Text>
                    </View>
                  ) : (
                    <WorkflowTimeline
                      currentStage={selectedOnboarding.currentStage}
                      milestones={selectedOnboarding.milestones || []}
                      startDate={selectedOnboarding.startDate}
                      onMilestonePress={(milestone) => {
                        if (milestone.status !== 'completed') {
                          Alert.alert(
                            'Complete Milestone',
                            `Mark "${milestone.name}" as completed?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Complete',
                                onPress: () => handleMilestoneStatusChange(milestone.id, 'completed'),
                              },
                            ]
                          );
                        }
                      }}
                    />
                  )}
                </View>
              ) : activeTaskTab === 'tasks' ? (
                <View style={styles.tasksList}>
                  {selectedOnboarding.tasks.length === 0 ? (
                    <View style={styles.emptyTasks}>
                      <Text style={styles.emptyTasksText}>No tasks assigned yet</Text>
                    </View>
                  ) : (
                    selectedOnboarding.tasks.map(renderTaskItem)
                  )}
                </View>
              ) : activeTaskTab === 'documents' ? (
                <View style={styles.documentsList}>
                  {selectedOnboarding.documents.length === 0 ? (
                    <View style={styles.emptyTasks}>
                      <Text style={styles.emptyTasksText}>No documents required</Text>
                    </View>
                  ) : (
                    selectedOnboarding.documents.map(renderDocumentItem)
                  )}
                </View>
              ) : (
                <View style={styles.notesList}>
                  <Pressable style={styles.addNoteBtn} onPress={() => setNoteModalVisible(true)}>
                    <Plus size={16} color={colors.primary} />
                    <Text style={styles.addNoteBtnText}>Add Note</Text>
                  </Pressable>
                  {selectedOnboarding.notes.length === 0 ? (
                    <View style={styles.emptyTasks}>
                      <Text style={styles.emptyTasksText}>No notes yet</Text>
                    </View>
                  ) : (
                    [...selectedOnboarding.notes].reverse().map(note => (
                      <View key={note.id} style={[styles.noteItem, note.isPrivate && styles.noteItemPrivate]}>
                        <View style={styles.noteHeader}>
                          <Text style={styles.noteAuthor}>{note.createdBy}</Text>
                          {note.isPrivate && (
                            <View style={styles.privateBadge}>
                              <Text style={styles.privateBadgeText}>Private</Text>
                            </View>
                          )}
                          <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                        </View>
                        <Text style={styles.noteContent}>{note.content}</Text>
                        {note.noteType !== 'general' && (
                          <View style={[styles.noteTypeBadge, { backgroundColor: note.noteType === 'status_change' ? '#3B82F620' : '#10B98120' }]}>
                            <Text style={[styles.noteTypeText, { color: note.noteType === 'status_change' ? '#3B82F6' : '#10B981' }]}>
                              {note.noteType.replace('_', ' ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal
        visible={newHireModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setNewHireModalVisible(false); resetNewHireForm(); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>Initiate Onboarding</Text>
                <Text style={styles.modalSubtitle}>Step {createStep} of 2</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => { setNewHireModalVisible(false); resetNewHireForm(); }}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, createStep >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, createStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, createStep >= 2 && styles.stepDotActive]} />
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.formContent}>
              {createStep === 1 ? (
                <>
                  <Text style={styles.formLabel}>Select Template *</Text>
                  {templates.filter(t => t.isActive).map(template => (
                    <Pressable
                      key={template.id}
                      style={[styles.templateOption, selectedTemplateId === template.id && styles.templateOptionSelected]}
                      onPress={() => setSelectedTemplateId(template.id)}
                    >
                      <View style={styles.templateOptionInfo}>
                        <Text style={styles.templateOptionName}>{template.name}</Text>
                        <Text style={styles.templateOptionDesc}>{template.tasks.length} tasks • {template.employeeType.replace('_', ' ')}</Text>
                      </View>
                      {selectedTemplateId === template.id ? (
                        <CheckCircle size={20} color={colors.primary} />
                      ) : (
                        <ChevronRight size={20} color={colors.textTertiary} />
                      )}
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Text style={styles.formSectionTitle}>Employee Information</Text>
                  
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.textTertiary}
                    value={newHireForm.employeeName}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, employeeName: text }))}
                  />

                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter email"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newHireForm.employeeEmail}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, employeeEmail: text }))}
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    value={newHireForm.employeePhone}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, employeePhone: text }))}
                  />

                  <Text style={styles.formSectionTitle}>Position Details</Text>

                  <Text style={styles.inputLabel}>Position/Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter position"
                    placeholderTextColor={colors.textTertiary}
                    value={newHireForm.position}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, position: text }))}
                  />

                  <Text style={styles.inputLabel}>Department *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {DEPARTMENTS.map(dept => (
                      <Pressable
                        key={dept}
                        style={[styles.selectChip, newHireForm.department === dept && styles.selectChipActive]}
                        onPress={() => setNewHireForm(prev => ({ ...prev, department: dept }))}
                      >
                        <Text style={[styles.selectChipText, newHireForm.department === dept && styles.selectChipTextActive]}>{dept}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Start Date *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    value={newHireForm.startDate}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, startDate: text }))}
                  />

                  <Text style={styles.inputLabel}>Facility</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {FACILITIES.map(fac => (
                      <Pressable
                        key={fac.id}
                        style={[styles.selectChip, newHireForm.facilityId === fac.id && styles.selectChipActive]}
                        onPress={() => setNewHireForm(prev => ({ ...prev, facilityId: fac.id }))}
                      >
                        <Text style={[styles.selectChipText, newHireForm.facilityId === fac.id && styles.selectChipTextActive]}>{fac.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Work Location</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., Building A - Floor 2"
                    placeholderTextColor={colors.textTertiary}
                    value={newHireForm.workLocation}
                    onChangeText={(text) => setNewHireForm(prev => ({ ...prev, workLocation: text }))}
                  />

                  <Text style={styles.formSectionTitle}>Assignment</Text>

                  <Text style={styles.inputLabel}>Supervisor</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {SUPERVISORS.map(sup => (
                      <Pressable
                        key={sup.id}
                        style={[styles.selectChip, newHireForm.supervisorId === sup.id && styles.selectChipActive]}
                        onPress={() => setNewHireForm(prev => ({ ...prev, supervisorId: sup.id }))}
                      >
                        <Text style={[styles.selectChipText, newHireForm.supervisorId === sup.id && styles.selectChipTextActive]}>{sup.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Onboarding Buddy</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {BUDDIES.map(buddy => (
                      <Pressable
                        key={buddy.id}
                        style={[styles.selectChip, newHireForm.buddyId === buddy.id && styles.selectChipActive]}
                        onPress={() => setNewHireForm(prev => ({ ...prev, buddyId: buddy.id }))}
                      >
                        <Text style={[styles.selectChipText, newHireForm.buddyId === buddy.id && styles.selectChipTextActive]}>{buddy.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.formSectionTitle}>Compensation (Optional)</Text>

                  <View style={styles.salaryRow}>
                    <View style={styles.salaryInputWrap}>
                      <Text style={styles.inputLabel}>Salary</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Amount"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={newHireForm.salary}
                        onChangeText={(text) => setNewHireForm(prev => ({ ...prev, salary: text }))}
                      />
                    </View>
                    <View style={styles.salaryTypeWrap}>
                      <Text style={styles.inputLabel}>Type</Text>
                      <View style={styles.salaryTypeRow}>
                        <Pressable
                          style={[styles.salaryTypeBtn, newHireForm.salaryType === 'annual' && styles.salaryTypeBtnActive]}
                          onPress={() => setNewHireForm(prev => ({ ...prev, salaryType: 'annual' }))}
                        >
                          <Text style={[styles.salaryTypeBtnText, newHireForm.salaryType === 'annual' && styles.salaryTypeBtnTextActive]}>Annual</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.salaryTypeBtn, newHireForm.salaryType === 'hourly' && styles.salaryTypeBtnActive]}
                          onPress={() => setNewHireForm(prev => ({ ...prev, salaryType: 'hourly' }))}
                        >
                          <Text style={[styles.salaryTypeBtnText, newHireForm.salaryType === 'hourly' && styles.salaryTypeBtnTextActive]}>Hourly</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.formFooter}>
              {createStep === 2 && (
                <Pressable style={styles.backBtn} onPress={() => setCreateStep(1)}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.continueBtn, !selectedTemplateId && createStep === 1 && styles.continueBtnDisabled]}
                onPress={() => {
                  if (createStep === 1) {
                    if (selectedTemplateId) setCreateStep(2);
                  } else {
                    handleCreateOnboarding();
                  }
                }}
                disabled={!selectedTemplateId && createStep === 1}
              >
                <Text style={styles.continueBtnText}>{createStep === 1 ? 'Continue' : 'Create Onboarding'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={noteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.overlayModal}>
          <View style={[styles.overlayModalContent, { backgroundColor: colors.surface }]}>
            <Text style={styles.overlayModalTitle}>Add Note</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.background }]}
              placeholder="Enter your note..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              value={newNote}
              onChangeText={setNewNote}
            />
            <Pressable style={styles.privateToggle} onPress={() => setNoteIsPrivate(!noteIsPrivate)}>
              <View style={[styles.checkbox, noteIsPrivate && styles.checkboxChecked]}>
                {noteIsPrivate && <Check size={12} color="#FFF" />}
              </View>
              <Text style={styles.privateToggleText}>Private note (only visible to HR)</Text>
            </Pressable>
            <View style={styles.overlayModalActions}>
              <Pressable style={styles.cancelModalBtn} onPress={() => { setNoteModalVisible(false); setNewNote(''); }}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmModalBtn} onPress={handleAddNote}>
                <Text style={styles.confirmModalBtnText}>Add Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={statusModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.overlayModal}>
          <View style={[styles.overlayModalContent, { backgroundColor: colors.surface }]}>
            <Text style={styles.overlayModalTitle}>Change Status</Text>
            {selectedOnboarding && (
              <Text style={styles.currentStatusText}>
                Current: {ONBOARDING_STATUS_CONFIG[selectedOnboarding.status].label}
              </Text>
            )}
            <View style={styles.statusOptions}>
              {(['not_started', 'in_progress', 'on_hold', 'completed'] as OnboardingStatus[]).map(status => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedNewStatus === status && styles.statusOptionSelected,
                    selectedOnboarding?.status === status && styles.statusOptionDisabled,
                  ]}
                  onPress={() => selectedOnboarding?.status !== status && setSelectedNewStatus(status)}
                  disabled={selectedOnboarding?.status === status}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: ONBOARDING_STATUS_CONFIG[status].color }]} />
                  <Text style={styles.statusOptionText}>{ONBOARDING_STATUS_CONFIG[status].label}</Text>
                </Pressable>
              ))}
            </View>
            {(selectedNewStatus === 'on_hold' || selectedNewStatus === 'completed') && (
              <>
                <Text style={styles.inputLabel}>{selectedNewStatus === 'on_hold' ? 'Reason for hold' : 'Completion notes'}</Text>
                <TextInput
                  style={[styles.reasonInput, { backgroundColor: colors.background }]}
                  placeholder="Enter reason..."
                  placeholderTextColor={colors.textTertiary}
                  value={statusChangeReason}
                  onChangeText={setStatusChangeReason}
                />
              </>
            )}
            <View style={styles.overlayModalActions}>
              <Pressable style={styles.cancelModalBtn} onPress={() => { setStatusModalVisible(false); setSelectedNewStatus(null); setStatusChangeReason(''); }}>
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmModalBtn, !selectedNewStatus && styles.confirmModalBtnDisabled]}
                onPress={handleStatusChange}
                disabled={!selectedNewStatus}
              >
                <Text style={styles.confirmModalBtnText}>Update Status</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>Edit Onboarding</Text>
                <Text style={styles.modalSubtitle}>{selectedOnboarding?.employeeName}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setEditModalVisible(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.formContent}>
              <Text style={styles.inputLabel}>Position/Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter position"
                placeholderTextColor={colors.textTertiary}
                value={newHireForm.position}
                onChangeText={(text) => setNewHireForm(prev => ({ ...prev, position: text }))}
              />

              <Text style={styles.inputLabel}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {DEPARTMENTS.map(dept => (
                  <Pressable
                    key={dept}
                    style={[styles.selectChip, newHireForm.department === dept && styles.selectChipActive]}
                    onPress={() => setNewHireForm(prev => ({ ...prev, department: dept }))}
                  >
                    <Text style={[styles.selectChipText, newHireForm.department === dept && styles.selectChipTextActive]}>{dept}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Facility</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {FACILITIES.map(fac => (
                  <Pressable
                    key={fac.id}
                    style={[styles.selectChip, newHireForm.facilityId === fac.id && styles.selectChipActive]}
                    onPress={() => setNewHireForm(prev => ({ ...prev, facilityId: fac.id }))}
                  >
                    <Text style={[styles.selectChipText, newHireForm.facilityId === fac.id && styles.selectChipTextActive]}>{fac.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Work Location</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Building A - Floor 2"
                placeholderTextColor={colors.textTertiary}
                value={newHireForm.workLocation}
                onChangeText={(text) => setNewHireForm(prev => ({ ...prev, workLocation: text }))}
              />

              <Text style={styles.inputLabel}>Supervisor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {SUPERVISORS.map(sup => (
                  <Pressable
                    key={sup.id}
                    style={[styles.selectChip, newHireForm.supervisorId === sup.id && styles.selectChipActive]}
                    onPress={() => setNewHireForm(prev => ({ ...prev, supervisorId: sup.id }))}
                  >
                    <Text style={[styles.selectChipText, newHireForm.supervisorId === sup.id && styles.selectChipTextActive]}>{sup.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Onboarding Buddy</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {BUDDIES.map(buddy => (
                  <Pressable
                    key={buddy.id}
                    style={[styles.selectChip, newHireForm.buddyId === buddy.id && styles.selectChipActive]}
                    onPress={() => setNewHireForm(prev => ({ ...prev, buddyId: buddy.id }))}
                  >
                    <Text style={[styles.selectChipText, newHireForm.buddyId === buddy.id && styles.selectChipTextActive]}>{buddy.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.formFooter}>
              <Pressable style={styles.backBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.backBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.continueBtn} onPress={handleUpdateOnboarding}>
                <Text style={styles.continueBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: (SCREEN_WIDTH - 44) / 2,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
    },
    statCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    statCardValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    statCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    statCardSubtitle: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    searchSection: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    viewTabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    viewTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      gap: 6,
    },
    viewTabActive: {
      backgroundColor: colors.primary,
    },
    viewTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    viewTabTextActive: {
      color: '#FFF',
    },
    tabBadge: {
      backgroundColor: '#FFF',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    filterScroll: {
      marginBottom: 16,
    },
    filterContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.primary,
    },
    listSection: {
      paddingHorizontal: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    onboardingCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    onboardingCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    onboardingInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    employeeName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    urgentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    urgentText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#D97706',
    },
    positionText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    metaDivider: {
      color: colors.textTertiary,
    },
    progressSection: {
      marginBottom: 12,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: '700',
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    taskSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    taskSummaryText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    docsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    docsText: {
      fontSize: 11,
      color: '#F59E0B',
      fontWeight: '500',
    },
    templateCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    templateIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    templateType: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    activeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    activeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    templateDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 12,
    },
    templateStats: {
      flexDirection: 'row',
      gap: 16,
    },
    templateStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    templateStatText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderContent: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalClose: {
      padding: 4,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailInfo: {
      flex: 1,
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressCircleValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    progressCircleLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    detailTabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    detailTabActive: {
      borderBottomColor: colors.primary,
    },
    detailTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    detailTabTextActive: {
      color: colors.primary,
    },
    modalScroll: {
      flex: 1,
    },
    tasksList: {
      padding: 16,
      gap: 12,
    },
    taskItem: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    taskItemOverdue: {
      borderLeftWidth: 3,
      borderLeftColor: '#EF4444',
    },
    taskCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    taskContent: {
      flex: 1,
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    taskName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    taskNameCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    requiredBadge: {
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    requiredText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#DC2626',
    },
    taskDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    taskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '600',
    },
    dueDateText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    assignedText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    documentsList: {
      padding: 16,
      gap: 12,
    },
    documentItem: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    documentItemOverdue: {
      borderLeftWidth: 3,
      borderLeftColor: '#EF4444',
    },
    documentIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.border + '50',
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentContent: {
      flex: 1,
    },
    documentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    documentName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    documentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    docStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    docStatusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    docDueText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    documentActions: {
      flexDirection: 'row',
      gap: 8,
    },
    docActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    approveBtn: {
      backgroundColor: '#10B981',
    },
    rejectBtn: {
      backgroundColor: '#EF4444',
    },
    docActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFF',
    },
    emptyTasks: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyTasksText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    formContent: {
      padding: 16,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    templateOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    templateOptionInfo: {
      flex: 1,
    },
    templateOptionName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    templateOptionDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    formNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },
    formNoteText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    stageIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    stagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    stagePillText: {
      fontSize: 12,
      fontWeight: '600',
    },
    milestoneSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    milestoneSummaryText: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    stageFilterDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 4,
    },
    workflowContainer: {
      padding: 16,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    notesList: {
      padding: 16,
      gap: 12,
    },
    addNoteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      marginBottom: 8,
    },
    addNoteBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    noteItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    noteItemPrivate: {
      borderLeftColor: '#F59E0B',
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    noteAuthor: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    privateBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    privateBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#D97706',
    },
    noteDate: {
      fontSize: 12,
      color: colors.textTertiary,
      marginLeft: 'auto',
    },
    noteContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    noteTypeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 8,
    },
    noteTypeText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    overlayModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    overlayModalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 20,
    },
    overlayModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    noteInput: {
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    privateToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    privateToggleText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    overlayModalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    cancelModalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.border,
      alignItems: 'center',
    },
    cancelModalBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    confirmModalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    confirmModalBtnDisabled: {
      opacity: 0.5,
    },
    confirmModalBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFF',
    },
    currentStatusText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    statusOptions: {
      gap: 8,
      marginBottom: 16,
    },
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    statusOptionSelected: {
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    statusOptionDisabled: {
      opacity: 0.4,
    },
    statusOptionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    reasonInput: {
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 0,
    },
    stepDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    stepDotActive: {
      backgroundColor: colors.primary,
    },
    stepLine: {
      width: 60,
      height: 2,
      backgroundColor: colors.border,
    },
    stepLineActive: {
      backgroundColor: colors.primary,
    },
    templateOptionSelected: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    formSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 12,
    },
    formInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipScroll: {
      marginBottom: 4,
    },
    selectChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    selectChipActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
    },
    selectChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    selectChipTextActive: {
      color: colors.primary,
    },
    salaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    salaryInputWrap: {
      flex: 1,
    },
    salaryTypeWrap: {
      flex: 1,
    },
    salaryTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    salaryTypeBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    salaryTypeBtnActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
    },
    salaryTypeBtnText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    salaryTypeBtnTextActive: {
      color: colors.primary,
    },
    formFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    backBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
    },
    backBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    continueBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    continueBtnDisabled: {
      opacity: 0.5,
    },
    continueBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFF',
    },
  });
