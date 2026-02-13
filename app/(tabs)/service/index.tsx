import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronRight,
  X,
  Play,
  Pause,
  Calendar,
  User,
  Settings,
  Edit3,
  Trash2,
  Cog,
  CalendarClock,
  Activity,
  AlertCircle,
  ChevronDown,
  MapPin,
  Timer,
  Eye,
  ArrowLeft,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import { type WorkOrder } from '@/constants/dashboardConstants';
import { FREQUENCY_LABELS } from '@/constants/maintenanceConstants';
import {
  useWorkOrdersQuery,
  useWorkOrderMetrics,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useDeleteWorkOrder,
} from '@/hooks/useSupabaseWorkOrders';
import {
  useEquipmentQuery,
  useEquipmentMetrics,
  useUpdateEquipment,
  type ExtendedEquipment,
} from '@/hooks/useSupabaseEquipment';
import {
  usePMSchedulesQuery,
  usePMWorkOrdersQuery,
  usePMComplianceMetrics,
  useStartPMWorkOrder,
  useCompletePMWorkOrder,
  type ExtendedPMSchedule,
  type PMWorkOrder,
} from '@/hooks/useSupabasePMSchedules';
import {
  type DetailedWorkOrder,
  MOCK_DETAILED_WORK_ORDERS,
  generateWorkOrderNumber,
  DEFAULT_LOTO_STEPS,
  PERMIT_TYPES,
  PPE_ITEMS,
  PPE_CATEGORIES,
  type DepartmentType,
  DEPARTMENTS,
} from '@/constants/workOrderDataConstants';
import WorkOrderDetail from '@/components/WorkOrderDetail';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import * as Haptics from 'expo-haptics';

type TabType = 'work_orders' | 'equipment' | 'pm_schedule';
type FilterType = 'all' | 'open' | 'in_progress' | 'completed' | 'overdue';
type EquipmentFilter = 'all' | 'operational' | 'needs_maintenance' | 'down';
type PMFilter = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'overdue';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Status = 'open' | 'in_progress' | 'completed' | 'overdue';
type WOType = 'corrective' | 'preventive' | 'emergency' | 'request';

interface WOFormData {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  type: WOType;
  due_date: string;
  equipment: string;
  location: string;
  facility_id: string;
  assigned_to: string;
  estimatedHours: string;
  lotoRequired: boolean;
  permits: string[];
  ppeRequired: string[];
  tasks: { id: string; description: string }[];
  targetDepartment: DepartmentType;
}

const initialWOFormData: WOFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'open',
  type: 'corrective',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  equipment: '',
  location: '',
  facility_id: 'facility-1',
  assigned_to: '',
  estimatedHours: '',
  lotoRequired: false,
  permits: [],
  ppeRequired: ['safety-glasses', 'safety-shoes'],
  tasks: [],
  targetDepartment: 'maintenance',
};

const priorityColors: Record<Priority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const statusConfig: Record<Status, { icon: typeof Clock; color: string; label: string }> = {
  open: { icon: Clock, color: '#3B82F6', label: 'Open' },
  in_progress: { icon: Wrench, color: '#F59E0B', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: '#10B981', label: 'Completed' },
  overdue: { icon: AlertTriangle, color: '#EF4444', label: 'Overdue' },
};

const equipmentStatusConfig = {
  operational: { color: '#10B981', label: 'Operational' },
  needs_maintenance: { color: '#F59E0B', label: 'Needs Maintenance' },
  down: { color: '#EF4444', label: 'Down' },
  retired: { color: '#6B7280', label: 'Retired' },
};

const pmStatusConfig = {
  scheduled: { color: '#3B82F6', label: 'Scheduled' },
  in_progress: { color: '#F59E0B', label: 'In Progress' },
  completed: { color: '#10B981', label: 'Completed' },
  overdue: { color: '#EF4444', label: 'Overdue' },
  skipped: { color: '#6B7280', label: 'Skipped' },
  cancelled: { color: '#6B7280', label: 'Cancelled' },
};

const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];
const statuses: Status[] = ['open', 'in_progress', 'completed', 'overdue'];
const woTypes: WOType[] = ['corrective', 'preventive', 'emergency', 'request'];

const typeColors: Record<WOType, string> = {
  corrective: '#EF4444',
  preventive: '#3B82F6',
  emergency: '#DC2626',
  request: '#8B5CF6',
};

export default function ServiceScreen() {
  const { colors } = useTheme();
  const { data: employees = [] } = useEmployees();
  const router = useRouter();
  
  const { data: workOrdersData = [], refetch: refetchWO } = useWorkOrdersQuery();
  const { data: equipmentData = [], refetch: refetchEquip } = useEquipmentQuery();
  const { data: pmSchedulesData = [], refetch: refetchPMSchedules } = usePMSchedulesQuery({ active: true });
  const { data: pmWorkOrdersData = [], refetch: refetchPMWO } = usePMWorkOrdersQuery();
  
  const { data: woMetrics } = useWorkOrderMetrics();
  const { data: equipMetrics } = useEquipmentMetrics();
  const { data: pmMetrics } = usePMComplianceMetrics();
  
  const createWorkOrderMutation = useCreateWorkOrder();
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const updateEquipmentMutation = useUpdateEquipment();
  const startPMWorkOrderMutation = useStartPMWorkOrder();
  const completePMWorkOrderMutation = useCompletePMWorkOrder();
  
  const workOrders: WorkOrder[] = useMemo(() => {
    return workOrdersData.map(wo => ({
      id: wo.id,
      title: wo.title || '',
      description: wo.description || '',
      priority: (wo.priority as Priority) || 'medium',
      status: (wo.status as Status) || 'open',
      due_date: wo.due_date || new Date().toISOString().split('T')[0],
      equipment: wo.equipment || undefined,
      facility_id: wo.facility_id || 'facility-1',
      assigned_to: wo.assigned_to || undefined,
      created_at: wo.created_at || new Date().toISOString().split('T')[0],
    }));
  }, [workOrdersData]);
  
  type Equipment = ExtendedEquipment & {
    asset_tag: string;
    facility_name: string;
    meter_reading?: number;
    meter_unit?: string;
    specifications?: Record<string, string>;
  };
  
  const equipment: Equipment[] = useMemo(() => {
    return equipmentData.map(eq => ({
      ...eq,
      asset_tag: eq.equipment_tag || '',
      facility_name: eq.facility_id || 'Main Facility',
      meter_reading: undefined,
      meter_unit: undefined,
      specifications: eq.specifications as Record<string, string> | undefined,
    }));
  }, [equipmentData]);
  
  const pmSchedules: ExtendedPMSchedule[] = pmSchedulesData;
  
  const pmWorkOrders: PMWorkOrder[] = useMemo(() => {
    return pmWorkOrdersData.map(pm => ({
      ...pm,
      tasks: (pm.tasks || []) as { task_id: string; description: string; completed: boolean; completed_at?: string; notes?: string }[],
      parts_used: pm.parts_used || [],
    }));
  }, [pmWorkOrdersData]);
  
  const stats = useMemo(() => ({
    openWorkOrders: woMetrics?.open || 0,
    inProgressWorkOrders: woMetrics?.inProgress || 0,
    completedWorkOrders: woMetrics?.completed || 0,
    overdueWorkOrders: woMetrics?.overdue || 0,
    totalEquipment: equipMetrics?.total || 0,
    operationalEquipment: equipMetrics?.operational || 0,
    needsMaintenanceEquipment: equipMetrics?.needsMaintenance || 0,
    downEquipment: equipMetrics?.down || 0,
    upcomingPMs: pmMetrics?.dueThisWeek || 0,
    inProgressPMs: pmWorkOrders.filter(pm => pm.status === 'in_progress').length,
    overduePMs: pmMetrics?.overdue || 0,
    completedPMs: pmMetrics?.completedThisMonth || 0,
  }), [woMetrics, equipMetrics, pmMetrics, pmWorkOrders]);
  const { canCreate, canEdit, canDelete, canAssign, hasAccess, isLoading: permissionsLoading } = useModulePermissions('work_orders');

  const [activeTab, setActiveTab] = useState<TabType>('work_orders');
  const [woFilter, setWOFilter] = useState<FilterType>('all');
  const [equipFilter, setEquipFilter] = useState<EquipmentFilter>('all');
  const [pmFilter, setPMFilter] = useState<PMFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showWOModal, setShowWOModal] = useState(false);
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);
  const [woFormData, setWOFormData] = useState<WOFormData>(initialWOFormData);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedPM, setSelectedPM] = useState<PMWorkOrder | null>(null);
  const [showCompletePMModal, setShowCompletePMModal] = useState(false);
  const [completePMData, setCompletePMData] = useState({ laborHours: '', notes: '' });
  const [detailedWorkOrders, setDetailedWorkOrders] = useState<DetailedWorkOrder[]>(MOCK_DETAILED_WORK_ORDERS);
  const [showDetailedWO, setShowDetailedWO] = useState<DetailedWorkOrder | null>(null);
  const [formStep, setFormStep] = useState<'basic' | 'safety' | 'tasks'>('basic');
  const [newTaskText, setNewTaskText] = useState('');

  const filteredWorkOrders = useMemo(() => {
    if (woFilter === 'all') return workOrders;
    return workOrders.filter((wo) => wo.status === woFilter);
  }, [workOrders, woFilter]);

  const filteredEquipment = useMemo(() => {
    if (equipFilter === 'all') return equipment;
    return equipment.filter((e) => e.status === equipFilter);
  }, [equipment, equipFilter]);

  const filteredPMWorkOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let filtered = pmWorkOrders.map(pm => ({
      ...pm,
      status: (pm.status === 'scheduled' && pm.scheduled_date < today) ? 'overdue' as const : pm.status,
    }));
    
    if (pmFilter === 'all') return filtered;
    return filtered.filter((pm) => pm.status === pmFilter);
  }, [pmWorkOrders, pmFilter]);

  const technicians = useMemo(() => {
    return employees.filter(e => 
      e.role === 'technician' || e.role === 'mechanic' || e.role === 'supervisor'
    );
  }, [employees]);

  const overduePMs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return pmWorkOrders.filter(pm => 
      pm.status === 'scheduled' && pm.scheduled_date < today
    );
  }, [pmWorkOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchWO(),
        refetchEquip(),
        refetchPMSchedules(),
        refetchPMWO(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWO, refetchEquip, refetchPMSchedules, refetchPMWO]);

  const handleOpenWOModal = useCallback((item?: WorkOrder) => {
    if (item && !canEdit) return;
    if (!item && !canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item) {
      setEditingWO(item);
      const existingDetailed = detailedWorkOrders.find(dwo => dwo.title === item.title);
      setWOFormData({
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: item.status,
        type: existingDetailed?.type || 'corrective',
        due_date: item.due_date,
        equipment: item.equipment || '',
        location: existingDetailed?.location || '',
        facility_id: item.facility_id,
        assigned_to: item.assigned_to || '',
        estimatedHours: existingDetailed?.estimatedHours?.toString() || '',
        lotoRequired: existingDetailed?.safety.lotoRequired || false,
        permits: existingDetailed?.safety.permits || [],
        ppeRequired: existingDetailed?.safety.ppeRequired || ['safety-glasses', 'safety-shoes'],
        tasks: existingDetailed?.tasks.map(t => ({ id: t.id, description: t.description })) || [],
        targetDepartment: existingDetailed?.currentDepartment || 'maintenance',
      });
    } else {
      setEditingWO(null);
      setWOFormData(initialWOFormData);
    }
    setFormStep('basic');
    setNewTaskText('');
    setShowWOModal(true);
  }, [canCreate, canEdit, detailedWorkOrders]);

  const handleCloseWOModal = useCallback(() => {
    setShowWOModal(false);
    setEditingWO(null);
    setWOFormData(initialWOFormData);
    setFormStep('basic');
    setNewTaskText('');
  }, []);

  const handleSaveWO = useCallback(async () => {
    if (!woFormData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const workOrderData = {
      title: woFormData.title.trim(),
      description: woFormData.description.trim(),
      priority: woFormData.priority,
      status: woFormData.status === 'overdue' ? 'open' : woFormData.status,
      due_date: woFormData.due_date,
      equipment: woFormData.equipment.trim() || undefined,
      facility_id: woFormData.facility_id,
      assigned_to: woFormData.assigned_to || undefined,
      type: woFormData.type,
      location: woFormData.location.trim() || undefined,
      estimated_hours: woFormData.estimatedHours ? parseFloat(woFormData.estimatedHours) : undefined,
    };
    
    try {
      if (editingWO) {
        await updateWorkOrderMutation.mutateAsync({ id: editingWO.id, updates: workOrderData });
        const existingDetailedIdx = detailedWorkOrders.findIndex(dwo => dwo.title === editingWO.title);
        if (existingDetailedIdx >= 0) {
          const updatedDetailed: DetailedWorkOrder = {
            ...detailedWorkOrders[existingDetailedIdx],
            title: woFormData.title.trim(),
            description: woFormData.description.trim(),
            priority: woFormData.priority,
            status: woFormData.status === 'overdue' ? 'open' : woFormData.status,
            type: woFormData.type,
            equipment: woFormData.equipment.trim() || undefined,
            location: woFormData.location.trim(),
            due_date: woFormData.due_date,
            assigned_to: woFormData.assigned_to || undefined,
            assignedName: woFormData.assigned_to ? employees.find(e => e.id === woFormData.assigned_to)?.first_name + ' ' + employees.find(e => e.id === woFormData.assigned_to)?.last_name : 'Unassigned',
            estimatedHours: woFormData.estimatedHours ? parseFloat(woFormData.estimatedHours) : undefined,
            currentDepartment: woFormData.targetDepartment,
            safety: {
              lotoRequired: woFormData.lotoRequired,
              lotoSteps: woFormData.lotoRequired ? DEFAULT_LOTO_STEPS : [],
              permits: woFormData.permits,
              permitNumbers: {},
              permitExpiry: {},
              ppeRequired: woFormData.ppeRequired,
            },
            tasks: woFormData.tasks.map((t, idx) => ({
              id: t.id,
              order: idx + 1,
              description: t.description,
              completed: false,
            })),
            updated_at: new Date().toISOString().split('T')[0],
          };
          setDetailedWorkOrders(prev => prev.map((dwo, idx) => idx === existingDetailedIdx ? updatedDetailed : dwo));
        }
      } else {
        await createWorkOrderMutation.mutateAsync(workOrderData as Parameters<typeof createWorkOrderMutation.mutateAsync>[0]);
        const newDetailedWO: DetailedWorkOrder = {
          id: `dwo-${Date.now()}`,
          workOrderNumber: generateWorkOrderNumber(),
          title: woFormData.title.trim(),
          description: woFormData.description.trim(),
          priority: woFormData.priority,
          status: 'open',
          type: woFormData.type,
          source: 'manual',
          equipment: woFormData.equipment.trim() || undefined,
          location: woFormData.location.trim(),
          facility_id: woFormData.facility_id,
          assigned_to: woFormData.assigned_to || undefined,
          assignedName: woFormData.assigned_to ? employees.find(e => e.id === woFormData.assigned_to)?.first_name + ' ' + employees.find(e => e.id === woFormData.assigned_to)?.last_name : 'Unassigned',
          due_date: woFormData.due_date,
          estimatedHours: woFormData.estimatedHours ? parseFloat(woFormData.estimatedHours) : undefined,
          currentDepartment: woFormData.targetDepartment,
          requiredDepartments: [woFormData.targetDepartment],
          safety: {
            lotoRequired: woFormData.lotoRequired,
            lotoSteps: woFormData.lotoRequired ? DEFAULT_LOTO_STEPS : [],
            permits: woFormData.permits,
            permitNumbers: {},
            permitExpiry: {},
            ppeRequired: woFormData.ppeRequired,
          },
          tasks: woFormData.tasks.map((t, idx) => ({
            id: t.id,
            order: idx + 1,
            description: t.description,
            completed: false,
          })),
          attachments: [],
          notes: '',
          created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0],
        };
        setDetailedWorkOrders(prev => [...prev, newDetailedWO]);
      }
      handleCloseWOModal();
    } catch (error) {
      console.error('[handleSaveWO] Error:', error);
      Alert.alert('Error', 'Failed to save work order');
    }
  }, [woFormData, editingWO, createWorkOrderMutation, updateWorkOrderMutation, handleCloseWOModal, detailedWorkOrders, employees]);

  const handleDeleteWO = useCallback((item: WorkOrder) => {
    if (!canDelete) return;
    Alert.alert('Delete Work Order', `Are you sure you want to delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try {
            await deleteWorkOrderMutation.mutateAsync(item.id);
          } catch (error) {
            console.error('[handleDeleteWO] Error:', error);
            Alert.alert('Error', 'Failed to delete work order');
          }
        },
      },
    ]);
  }, [deleteWorkOrderMutation, canDelete]);

  const handleStatusChange = useCallback(async (item: WorkOrder, newStatus: Status) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateWorkOrderMutation.mutateAsync({ id: item.id, updates: { status: newStatus } });
      setSelectedWO(null);
    } catch (error) {
      console.error('[handleStatusChange] Error:', error);
      Alert.alert('Error', 'Failed to update work order status');
    }
  }, [updateWorkOrderMutation, canEdit]);

  const handleStartPM = useCallback(async (pm: PMWorkOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startPMWorkOrderMutation.mutateAsync(pm.id);
    } catch (error) {
      console.error('[handleStartPM] Error:', error);
      Alert.alert('Error', 'Failed to start PM work order');
    }
  }, [startPMWorkOrderMutation]);

  const handleOpenCompletePM = useCallback((pm: PMWorkOrder) => {
    setSelectedPM(pm);
    setCompletePMData({ laborHours: '', notes: '' });
    setShowCompletePMModal(true);
  }, []);

  const handleCompletePM = useCallback(async () => {
    if (!selectedPM) return;
    const hours = parseFloat(completePMData.laborHours) || 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await completePMWorkOrderMutation.mutateAsync({
        pmWorkOrderId: selectedPM.id,
        laborHours: hours,
        completionNotes: completePMData.notes,
      });
      setShowCompletePMModal(false);
      setSelectedPM(null);
    } catch (error) {
      console.error('[handleCompletePM] Error:', error);
      Alert.alert('Error', 'Failed to complete PM work order');
    }
  }, [selectedPM, completePMData, completePMWorkOrderMutation]);

  const handleEquipmentStatusChange = useCallback(async (equip: Equipment, newStatus: Equipment['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateEquipmentMutation.mutateAsync({ id: equip.id, updates: { status: newStatus } });
      setSelectedEquipment(null);
    } catch (error) {
      console.error('[handleEquipmentStatusChange] Error:', error);
      Alert.alert('Error', 'Failed to update equipment status');
    }
  }, [updateEquipmentMutation]);

  const getAssigneeName = useCallback((assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    const employee = employees.find(e => e.id === assigneeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned';
  }, [employees]);

  const handleUpdateDetailedWO = useCallback((id: string, updates: Partial<DetailedWorkOrder>) => {
    setDetailedWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, ...updates, updated_at: new Date().toISOString().split('T')[0] } : wo
    ));
    if (showDetailedWO?.id === id) {
      setShowDetailedWO(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [showDetailedWO]);

  const handleStartDetailedWork = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleUpdateDetailedWO(id, { 
      status: 'in_progress', 
      started_at: new Date().toISOString() 
    });
  }, [handleUpdateDetailedWO]);

  const handleCompleteDetailedWork = useCallback((id: string) => {
    Alert.alert('Complete Work Order', 'Are you sure you want to complete this work order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleUpdateDetailedWO(id, { 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          });
        },
      },
    ]);
  }, [handleUpdateDetailedWO]);

  const handleViewDetailedWO = useCallback((order: WorkOrder) => {
    const existingDetailed = detailedWorkOrders.find(dwo => dwo.title === order.title);
    if (existingDetailed) {
      setShowDetailedWO(existingDetailed);
    } else {
      const newDetailedWO: DetailedWorkOrder = {
        id: `dwo-${Date.now()}`,
        workOrderNumber: generateWorkOrderNumber(),
        title: order.title,
        description: order.description,
        priority: order.priority,
        status: order.status === 'overdue' ? 'open' : order.status,
        type: 'corrective',
        source: 'manual',
        equipment: order.equipment,
        location: '',
        facility_id: order.facility_id,
        assigned_to: order.assigned_to,
        assignedName: getAssigneeName(order.assigned_to),
        due_date: order.due_date,
        safety: {
          lotoRequired: false,
          lotoSteps: DEFAULT_LOTO_STEPS,
          permits: [],
          permitNumbers: {},
          permitExpiry: {},
          ppeRequired: ['safety-glasses', 'safety-shoes'],
        },
        tasks: [],
        attachments: [],
        notes: '',
        created_at: order.created_at,
        updated_at: order.created_at,
      };
      setDetailedWorkOrders(prev => [...prev, newDetailedWO]);
      setShowDetailedWO(newDetailedWO);
    }
  }, [detailedWorkOrders, getAssigneeName]);

  const handleAddTask = useCallback(() => {
    if (!newTaskText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWOFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { id: `task-${Date.now()}`, description: newTaskText.trim() }],
    }));
    setNewTaskText('');
  }, [newTaskText]);

  const handleRemoveTask = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWOFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
  }, []);

  const handleToggleFormPermit = useCallback((permitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWOFormData(prev => ({
      ...prev,
      permits: prev.permits.includes(permitId)
        ? prev.permits.filter(p => p !== permitId)
        : [...prev.permits, permitId],
    }));
  }, []);

  const handleToggleFormPPE = useCallback((ppeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWOFormData(prev => ({
      ...prev,
      ppeRequired: prev.ppeRequired.includes(ppeId)
        ? prev.ppeRequired.filter(p => p !== ppeId)
        : [...prev.ppeRequired, ppeId],
    }));
  }, []);

  const renderMetricsBar = () => {
    if (activeTab === 'work_orders') {
      return (
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.open.color}15` }]}>
            <Clock size={20} color={statusConfig.open.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.openWorkOrders}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.in_progress.color}15` }]}>
            <Wrench size={20} color={statusConfig.in_progress.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.inProgressWorkOrders}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.completed.color}15` }]}>
            <CheckCircle2 size={20} color={statusConfig.completed.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.completedWorkOrders}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Done</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${statusConfig.overdue.color}15` }]}>
            <AlertTriangle size={20} color={statusConfig.overdue.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.overdueWorkOrders}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
        </View>
      );
    }
    if (activeTab === 'equipment') {
      return (
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: `${equipmentStatusConfig.operational.color}15` }]}>
            <Activity size={20} color={equipmentStatusConfig.operational.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.operationalEquipment}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Operational</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${equipmentStatusConfig.needs_maintenance.color}15` }]}>
            <AlertCircle size={20} color={equipmentStatusConfig.needs_maintenance.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.needsMaintenanceEquipment}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Needs PM</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: `${equipmentStatusConfig.down.color}15` }]}>
            <AlertTriangle size={20} color={equipmentStatusConfig.down.color} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.downEquipment}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Down</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#6366F115' }]}>
            <Cog size={20} color="#6366F1" />
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.totalEquipment}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: `${pmStatusConfig.scheduled.color}15` }]}>
          <CalendarClock size={20} color={pmStatusConfig.scheduled.color} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{stats.upcomingPMs}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Scheduled</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: `${pmStatusConfig.in_progress.color}15` }]}>
          <Wrench size={20} color={pmStatusConfig.in_progress.color} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{stats.inProgressPMs}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>In Progress</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: `${pmStatusConfig.overdue.color}15` }]}>
          <AlertTriangle size={20} color={pmStatusConfig.overdue.color} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{stats.overduePMs}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: `${pmStatusConfig.completed.color}15` }]}>
          <CheckCircle2 size={20} color={pmStatusConfig.completed.color} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{stats.completedPMs}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
      </View>
    );
  };

  const renderWorkOrdersTab = () => (
    <>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'open', 'in_progress', 'completed', 'overdue'] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, { backgroundColor: woFilter === f ? colors.primary : colors.surface, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setWOFilter(f); }}
            >
              <Text style={[styles.filterText, { color: woFilter === f ? '#FFFFFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Work Orders</Text>
          {canCreate && (
            <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => handleOpenWOModal()}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>New</Text>
            </Pressable>
          )}
        </View>

        {filteredWorkOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Wrench size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No work orders found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {woFilter === 'all' ? 'Create your first work order' : `No ${woFilter.replace('_', ' ')} work orders`}
            </Text>
          </View>
        ) : (
          filteredWorkOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            const statusColor = statusConfig[order.status].color;
            const priorityColor = priorityColors[order.priority];
            return (
              <Pressable
                key={order.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setSelectedWO(selectedWO?.id === order.id ? null : order)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                    <Text style={[styles.priorityText, { color: priorityColor }]}>{order.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <StatusIcon size={14} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusConfig[order.status].label}</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{order.title}</Text>
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{order.description}</Text>
                <View style={styles.cardMeta}>
                  {order.equipment && (
                    <View style={styles.metaItem}>
                      <Settings size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>{order.equipment}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <User size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>{getAssigneeName(order.assigned_to)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>Due: {order.due_date}</Text>
                  </View>
                </View>
                {selectedWO?.id === order.id && (canEdit || canDelete) && (
                  <View style={[styles.actionsPanel, { borderTopColor: colors.border }]}>
                    <View style={styles.quickActions}>
                      {canEdit && order.status === 'open' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${statusConfig.in_progress.color}15` }]} onPress={() => handleStatusChange(order, 'in_progress')}>
                          <Play size={16} color={statusConfig.in_progress.color} />
                          <Text style={[styles.quickActionText, { color: statusConfig.in_progress.color }]}>Start</Text>
                        </Pressable>
                      )}
                      {canEdit && order.status === 'in_progress' && (
                        <>
                          <Pressable style={[styles.quickAction, { backgroundColor: `${statusConfig.completed.color}15` }]} onPress={() => handleStatusChange(order, 'completed')}>
                            <CheckCircle2 size={16} color={statusConfig.completed.color} />
                            <Text style={[styles.quickActionText, { color: statusConfig.completed.color }]}>Complete</Text>
                          </Pressable>
                          <Pressable style={[styles.quickAction, { backgroundColor: `${statusConfig.open.color}15` }]} onPress={() => handleStatusChange(order, 'open')}>
                            <Pause size={16} color={statusConfig.open.color} />
                            <Text style={[styles.quickActionText, { color: statusConfig.open.color }]}>Pause</Text>
                          </Pressable>
                        </>
                      )}
                      {canEdit && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${colors.info}15` }]} onPress={() => handleOpenWOModal(order)}>
                          <Edit3 size={16} color={colors.info} />
                          <Text style={[styles.quickActionText, { color: colors.info }]}>Edit</Text>
                        </Pressable>
                      )}
                      {canDelete && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${colors.error}15` }]} onPress={() => handleDeleteWO(order)}>
                          <Trash2 size={16} color={colors.error} />
                          <Text style={[styles.quickActionText, { color: colors.error }]}>Delete</Text>
                        </Pressable>
                      )}
                      <Pressable style={[styles.quickAction, { backgroundColor: `${colors.primary}15` }]} onPress={() => handleViewDetailedWO(order)}>
                        <Eye size={16} color={colors.primary} />
                        <Text style={[styles.quickActionText, { color: colors.primary }]}>Full Details</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text style={[styles.dateText, { color: colors.textTertiary }]}>Created: {order.created_at}</Text>
                  <ChevronRight size={20} color={colors.textTertiary} style={{ transform: [{ rotate: selectedWO?.id === order.id ? '90deg' : '0deg' }] }} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </>
  );

  const renderEquipmentTab = () => (
    <>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'operational', 'needs_maintenance', 'down'] as EquipmentFilter[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, { backgroundColor: equipFilter === f ? colors.primary : colors.surface, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setEquipFilter(f); }}
            >
              <Text style={[styles.filterText, { color: equipFilter === f ? '#FFFFFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Registry</Text>
        </View>

        {filteredEquipment.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Cog size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No equipment found</Text>
          </View>
        ) : (
          filteredEquipment.map((equip) => {
            const statusColor = equipmentStatusConfig[equip.status]?.color || '#6B7280';
            const statusLabel = equipmentStatusConfig[equip.status]?.label || equip.status;
            return (
              <Pressable
                key={equip.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setSelectedEquipment(selectedEquipment?.id === equip.id ? null : equip)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.tagBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{equip.asset_tag}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{equip.name}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Cog size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>{equip.category}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>{equip.location}</Text>
                  </View>
                </View>
                {equip.manufacturer && (
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>
                    {equip.manufacturer} {equip.model}
                  </Text>
                )}
                {equip.last_pm_date && (
                  <View style={styles.pmInfo}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={[styles.pmInfoText, { color: colors.textTertiary }]}>
                      Last PM: {equip.last_pm_date} | Next: {equip.next_pm_date || 'Not scheduled'}
                    </Text>
                  </View>
                )}

                {selectedEquipment?.id === equip.id && (
                  <View style={[styles.actionsPanel, { borderTopColor: colors.border }]}>
                    <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Change Status:</Text>
                    <View style={styles.quickActions}>
                      {equip.status !== 'operational' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${equipmentStatusConfig.operational.color}15` }]} onPress={() => handleEquipmentStatusChange(equip, 'operational')}>
                          <Activity size={16} color={equipmentStatusConfig.operational.color} />
                          <Text style={[styles.quickActionText, { color: equipmentStatusConfig.operational.color }]}>Operational</Text>
                        </Pressable>
                      )}
                      {equip.status !== 'needs_maintenance' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${equipmentStatusConfig.needs_maintenance.color}15` }]} onPress={() => handleEquipmentStatusChange(equip, 'needs_maintenance')}>
                          <AlertCircle size={16} color={equipmentStatusConfig.needs_maintenance.color} />
                          <Text style={[styles.quickActionText, { color: equipmentStatusConfig.needs_maintenance.color }]}>Needs PM</Text>
                        </Pressable>
                      )}
                      {equip.status !== 'down' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${equipmentStatusConfig.down.color}15` }]} onPress={() => handleEquipmentStatusChange(equip, 'down')}>
                          <AlertTriangle size={16} color={equipmentStatusConfig.down.color} />
                          <Text style={[styles.quickActionText, { color: equipmentStatusConfig.down.color }]}>Down</Text>
                        </Pressable>
                      )}
                    </View>
                    {equip.specifications && (
                      <View style={styles.specsSection}>
                        <Text style={[styles.specsTitle, { color: colors.text }]}>Specifications</Text>
                        {Object.entries(equip.specifications).map(([key, value]) => (
                          <View key={key} style={styles.specRow}>
                            <Text style={[styles.specKey, { color: colors.textSecondary }]}>{key}:</Text>
                            <Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                    {equip.meter_reading ? `${equip.meter_reading.toLocaleString()} ${equip.meter_unit}` : equip.facility_name}
                  </Text>
                  <ChevronDown size={20} color={colors.textTertiary} style={{ transform: [{ rotate: selectedEquipment?.id === equip.id ? '180deg' : '0deg' }] }} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </>
  );

  const renderPMScheduleTab = () => (
    <>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'scheduled', 'in_progress', 'overdue', 'completed'] as PMFilter[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, { backgroundColor: pmFilter === f ? colors.primary : colors.surface, borderColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setPMFilter(f); }}
            >
              <Text style={[styles.filterText, { color: pmFilter === f ? '#FFFFFF' : colors.textSecondary }]}>
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {overduePMs.length > 0 && pmFilter === 'all' && (
        <View style={[styles.alertBanner, { backgroundColor: `${colors.error}15`, borderColor: colors.error }]}>
          <AlertTriangle size={18} color={colors.error} />
          <Text style={[styles.alertText, { color: colors.error }]}>
            {overduePMs.length} overdue PM{overduePMs.length > 1 ? 's' : ''} require attention
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>PM Work Orders</Text>
        </View>

        {filteredPMWorkOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CalendarClock size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No PM work orders</Text>
          </View>
        ) : (
          filteredPMWorkOrders.map((pm) => {
            const statusColor = pmStatusConfig[pm.status]?.color || '#6B7280';
            const statusLabel = pmStatusConfig[pm.status]?.label || pm.status;
            const priorityColor = priorityColors[pm.priority];
            const schedule = pmSchedules.find(s => s.id === pm.pm_schedule_id);
            const completedTasks = pm.tasks.filter(t => t.completed).length;
            const totalTasks = pm.tasks.length;

            return (
              <Pressable
                key={pm.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setSelectedPM(selectedPM?.id === pm.id ? null : pm)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                    <Text style={[styles.priorityText, { color: priorityColor }]}>{pm.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{pm.title}</Text>
                <View style={[styles.equipmentTag, { backgroundColor: `${colors.primary}10` }]}>
                  <Cog size={14} color={colors.primary} />
                  <Text style={[styles.equipmentTagText, { color: colors.primary }]}>{pm.equipment_name} ({pm.equipment_tag})</Text>
                </View>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>Due: {pm.scheduled_date}</Text>
                  </View>
                  {pm.assigned_name && (
                    <View style={styles.metaItem}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>{pm.assigned_name}</Text>
                    </View>
                  )}
                  {schedule && (
                    <View style={styles.metaItem}>
                      <Timer size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>{FREQUENCY_LABELS[schedule.frequency]}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.progressContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[styles.progressBar, { backgroundColor: statusColor, width: `${(completedTasks / totalTasks) * 100}%` }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {completedTasks}/{totalTasks} tasks completed
                </Text>

                {selectedPM?.id === pm.id && (
                  <View style={[styles.actionsPanel, { borderTopColor: colors.border }]}>
                    <View style={styles.quickActions}>
                      {pm.status === 'scheduled' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${pmStatusConfig.in_progress.color}15` }]} onPress={() => handleStartPM(pm)}>
                          <Play size={16} color={pmStatusConfig.in_progress.color} />
                          <Text style={[styles.quickActionText, { color: pmStatusConfig.in_progress.color }]}>Start PM</Text>
                        </Pressable>
                      )}
                      {pm.status === 'in_progress' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${pmStatusConfig.completed.color}15` }]} onPress={() => handleOpenCompletePM(pm)}>
                          <CheckCircle2 size={16} color={pmStatusConfig.completed.color} />
                          <Text style={[styles.quickActionText, { color: pmStatusConfig.completed.color }]}>Complete PM</Text>
                        </Pressable>
                      )}
                      {pm.status === 'overdue' && (
                        <Pressable style={[styles.quickAction, { backgroundColor: `${pmStatusConfig.in_progress.color}15` }]} onPress={() => handleStartPM(pm)}>
                          <Play size={16} color={pmStatusConfig.in_progress.color} />
                          <Text style={[styles.quickActionText, { color: pmStatusConfig.in_progress.color }]}>Start Now</Text>
                        </Pressable>
                      )}
                    </View>

                    <Text style={[styles.taskListTitle, { color: colors.text }]}>Tasks</Text>
                    {pm.tasks.map((task, idx) => (
                      <View key={task.task_id} style={styles.pmTaskItem}>
                        <View style={[styles.taskCheckbox, { borderColor: task.completed ? pmStatusConfig.completed.color : colors.border, backgroundColor: task.completed ? pmStatusConfig.completed.color : 'transparent' }]}>
                          {task.completed && <CheckCircle2 size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.taskText, { color: task.completed ? colors.textTertiary : colors.text, textDecorationLine: task.completed ? 'line-through' : 'none' }]}>
                          {idx + 1}. {task.description}
                        </Text>
                      </View>
                    ))}

                    {pm.completion_notes && (
                      <View style={styles.notesSection}>
                        <Text style={[styles.notesTitle, { color: colors.textSecondary }]}>Completion Notes</Text>
                        <Text style={[styles.notesText, { color: colors.text }]}>{pm.completion_notes}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                    {pm.labor_hours ? `${pm.labor_hours} hrs labor` : `Est. ${schedule?.estimated_hours || '?'} hrs`}
                  </Text>
                  <ChevronDown size={20} color={colors.textTertiary} style={{ transform: [{ rotate: selectedPM?.id === pm.id ? '180deg' : '0deg' }] }} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </>
  );

  const renderFormField = (label: string, value: string, onChange: (text: string) => void, options?: { placeholder?: string; multiline?: boolean }) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }, options?.multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChange}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  const renderPickerField = (label: string, value: string, options: { value: string; label: string; color?: string }[], onChange: (val: string) => void) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.pickerOption, { backgroundColor: value === opt.value ? (opt.color || colors.primary) : colors.backgroundSecondary, borderColor: value === opt.value ? (opt.color || colors.primary) : colors.border }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.pickerText, { color: value === opt.value ? '#FFFFFF' : colors.text }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (permissionsLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Wrench size={48} color={colors.textTertiary} />
        <Text style={[styles.noAccessTitle, { color: colors.text }]}>Access Restricted</Text>
        <Text style={[styles.noAccessText, { color: colors.textSecondary }]}>You do not have permission to view Service.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Service</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'work_orders' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab('work_orders'); }}
        >
          <Wrench size={18} color={activeTab === 'work_orders' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'work_orders' ? colors.primary : colors.textSecondary }]}>Work Orders</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'equipment' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab('equipment'); }}
        >
          <Cog size={18} color={activeTab === 'equipment' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'equipment' ? colors.primary : colors.textSecondary }]}>Equipment</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'pm_schedule' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => { Haptics.selectionAsync(); setActiveTab('pm_schedule'); }}
        >
          <CalendarClock size={18} color={activeTab === 'pm_schedule' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'pm_schedule' ? colors.primary : colors.textSecondary }]}>PM Schedule</Text>
          {stats.overduePMs > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>{stats.overduePMs}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {renderMetricsBar()}
        {activeTab === 'work_orders' && renderWorkOrdersTab()}
        {activeTab === 'equipment' && renderEquipmentTab()}
        {activeTab === 'pm_schedule' && renderPMScheduleTab()}
      </ScrollView>

      <Modal visible={showWOModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseWOModal}>
        <KeyboardAvoidingView style={[styles.modalContainer, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingWO ? 'Edit Work Order' : 'New Work Order'}</Text>
            <Pressable onPress={handleCloseWOModal} style={styles.closeButton}><X size={24} color={colors.textSecondary} /></Pressable>
          </View>
          
          <View style={[styles.formSteps, { borderBottomColor: colors.border }]}>
            <Pressable 
              style={[styles.formStepTab, formStep === 'basic' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setFormStep('basic')}
            >
              <Text style={[styles.formStepText, { color: formStep === 'basic' ? colors.primary : colors.textSecondary }]}>Basic Info</Text>
            </Pressable>
            <Pressable 
              style={[styles.formStepTab, formStep === 'safety' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setFormStep('safety')}
            >
              <Text style={[styles.formStepText, { color: formStep === 'safety' ? colors.primary : colors.textSecondary }]}>Safety</Text>
            </Pressable>
            <Pressable 
              style={[styles.formStepTab, formStep === 'tasks' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setFormStep('tasks')}
            >
              <Text style={[styles.formStepText, { color: formStep === 'tasks' ? colors.primary : colors.textSecondary }]}>Tasks</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {formStep === 'basic' && (
              <>
                {renderFormField('Title *', woFormData.title, (text) => setWOFormData(prev => ({ ...prev, title: text })), { placeholder: 'Work order title' })}
                {renderFormField('Description', woFormData.description, (text) => setWOFormData(prev => ({ ...prev, description: text })), { placeholder: 'Describe the work', multiline: true })}
                
                {renderPickerField('Type', woFormData.type, woTypes.map(t => ({ 
                  value: t, 
                  label: t.charAt(0).toUpperCase() + t.slice(1), 
                  color: typeColors[t] 
                })), (val) => setWOFormData(prev => ({ ...prev, type: val as WOType })))}
                
                {renderPickerField('Priority', woFormData.priority, priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1), color: priorityColors[p] })), (val) => setWOFormData(prev => ({ ...prev, priority: val as Priority })))}
                
                {renderFormField('Equipment', woFormData.equipment, (text) => setWOFormData(prev => ({ ...prev, equipment: text })), { placeholder: 'Equipment name or ID' })}
                {renderFormField('Location', woFormData.location, (text) => setWOFormData(prev => ({ ...prev, location: text })), { placeholder: 'Work location' })}
                {renderFormField('Due Date', woFormData.due_date, (text) => setWOFormData(prev => ({ ...prev, due_date: text })), { placeholder: 'YYYY-MM-DD' })}
                {renderFormField('Estimated Hours', woFormData.estimatedHours, (text) => setWOFormData(prev => ({ ...prev, estimatedHours: text })), { placeholder: 'Hours to complete' })}
                
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Target Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                    {DEPARTMENTS.map((dept) => (
                      <Pressable 
                        key={dept.id} 
                        style={[styles.pickerOption, { 
                          backgroundColor: woFormData.targetDepartment === dept.id ? dept.color : colors.backgroundSecondary, 
                          borderColor: woFormData.targetDepartment === dept.id ? dept.color : colors.border 
                        }]} 
                        onPress={() => setWOFormData(prev => ({ ...prev, targetDepartment: dept.id }))}
                      >
                        <Text style={[styles.pickerText, { color: woFormData.targetDepartment === dept.id ? '#FFFFFF' : colors.text }]}>{dept.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {editingWO && renderPickerField('Status', woFormData.status, statuses.map(s => ({ value: s, label: statusConfig[s].label, color: statusConfig[s].color })), (val) => setWOFormData(prev => ({ ...prev, status: val as Status })))}
                
                {canAssign && (
                  <View style={styles.formField}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Assign To</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                      <Pressable style={[styles.pickerOption, { backgroundColor: !woFormData.assigned_to ? colors.primary : colors.backgroundSecondary, borderColor: !woFormData.assigned_to ? colors.primary : colors.border }]} onPress={() => setWOFormData(prev => ({ ...prev, assigned_to: '' }))}>
                        <Text style={[styles.pickerText, { color: !woFormData.assigned_to ? '#FFFFFF' : colors.text }]}>Unassigned</Text>
                      </Pressable>
                      {technicians.map((tech) => (
                        <Pressable key={tech.id} style={[styles.pickerOption, { backgroundColor: woFormData.assigned_to === tech.id ? colors.primary : colors.backgroundSecondary, borderColor: woFormData.assigned_to === tech.id ? colors.primary : colors.border }]} onPress={() => setWOFormData(prev => ({ ...prev, assigned_to: tech.id }))}>
                          <Text style={[styles.pickerText, { color: woFormData.assigned_to === tech.id ? '#FFFFFF' : colors.text }]}>{tech.first_name} {tech.last_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            {formStep === 'safety' && (
              <>
                <View style={[styles.safetySection, { borderColor: colors.border }]}>
                  <View style={styles.safetyHeader}>
                    <View style={styles.safetyHeaderLeft}>
                      <AlertTriangle size={20} color="#EF4444" />
                      <Text style={[styles.safetySectionTitle, { color: colors.text }]}>LOTO Required</Text>
                    </View>
                    <Pressable
                      style={[styles.toggle, { backgroundColor: woFormData.lotoRequired ? '#EF4444' : colors.border }]}
                      onPress={() => setWOFormData(prev => ({ ...prev, lotoRequired: !prev.lotoRequired }))}
                    >
                      <View style={[styles.toggleThumb, { transform: [{ translateX: woFormData.lotoRequired ? 20 : 0 }] }]} />
                    </Pressable>
                  </View>
                  {woFormData.lotoRequired && (
                    <Text style={[styles.safetyNote, { color: colors.textSecondary }]}>
                      Lock Out / Tag Out procedure will be required before work begins
                    </Text>
                  )}
                </View>

                <View style={[styles.safetySection, { borderColor: colors.border }]}>
                  <Text style={[styles.safetySectionTitle, { color: colors.text }]}>Permits Required</Text>
                  <View style={styles.permitGrid}>
                    {PERMIT_TYPES.map(permit => {
                      const isSelected = woFormData.permits.includes(permit.id);
                      return (
                        <Pressable
                          key={permit.id}
                          style={[styles.permitChip, { 
                            backgroundColor: isSelected ? permit.color + '20' : colors.backgroundSecondary,
                            borderColor: isSelected ? permit.color : colors.border
                          }]}
                          onPress={() => handleToggleFormPermit(permit.id)}
                        >
                          <View style={[styles.permitChipCode, { backgroundColor: permit.color }]}>
                            <Text style={styles.permitChipCodeText}>{permit.code}</Text>
                          </View>
                          <Text style={[styles.permitChipName, { color: isSelected ? permit.color : colors.text }]} numberOfLines={1}>
                            {permit.name}
                          </Text>
                          {isSelected && <CheckCircle2 size={16} color={permit.color} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.safetySection, { borderColor: colors.border }]}>
                  <Text style={[styles.safetySectionTitle, { color: colors.text }]}>PPE Required</Text>
                  {PPE_CATEGORIES.map(category => {
                    const categoryItems = PPE_ITEMS.filter(p => p.category === category.id);
                    const selectedCount = categoryItems.filter(p => woFormData.ppeRequired.includes(p.id)).length;
                    if (categoryItems.length === 0) return null;
                    return (
                      <View key={category.id} style={styles.ppeCategoryBlock}>
                        <Text style={[styles.ppeCategoryName, { color: colors.textSecondary }]}>
                          {category.name} {selectedCount > 0 && `(${selectedCount})`}
                        </Text>
                        <View style={styles.ppeChipsRow}>
                          {categoryItems.map(ppe => {
                            const isSelected = woFormData.ppeRequired.includes(ppe.id);
                            return (
                              <Pressable
                                key={ppe.id}
                                style={[styles.ppeChip, { 
                                  backgroundColor: isSelected ? '#F59E0B20' : colors.backgroundSecondary,
                                  borderColor: isSelected ? '#F59E0B' : colors.border
                                }]}
                                onPress={() => handleToggleFormPPE(ppe.id)}
                              >
                                <Text style={[styles.ppeChipText, { color: isSelected ? '#F59E0B' : colors.text }]}>
                                  {ppe.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {formStep === 'tasks' && (
              <>
                <View style={styles.addTaskContainer}>
                  <TextInput
                    style={[styles.taskInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    value={newTaskText}
                    onChangeText={setNewTaskText}
                    placeholder="Add a task..."
                    placeholderTextColor={colors.textTertiary}
                    onSubmitEditing={handleAddTask}
                  />
                  <Pressable 
                    style={[styles.addTaskButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddTask}
                  >
                    <Plus size={20} color="#FFFFFF" />
                  </Pressable>
                </View>

                {woFormData.tasks.length === 0 ? (
                  <View style={[styles.emptyTasks, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <CheckCircle2 size={32} color={colors.textTertiary} />
                    <Text style={[styles.emptyTasksText, { color: colors.textSecondary }]}>No tasks added yet</Text>
                    <Text style={[styles.emptyTasksHint, { color: colors.textTertiary }]}>Add tasks to track work progress</Text>
                  </View>
                ) : (
                  <View style={styles.tasksList}>
                    {woFormData.tasks.map((task, index) => (
                      <View key={task.id} style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.taskNumber, { backgroundColor: colors.primary }]}>
                          <Text style={styles.taskNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.taskDescription, { color: colors.text }]}>{task.description}</Text>
                        <Pressable onPress={() => handleRemoveTask(task.id)} style={styles.removeTaskButton}>
                          <Trash2 size={18} color={colors.error} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              {formStep !== 'basic' && (
                <Pressable 
                  style={[styles.cancelButton, { borderColor: colors.border }]} 
                  onPress={() => setFormStep(formStep === 'tasks' ? 'safety' : 'basic')}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Back</Text>
                </Pressable>
              )}
              {formStep === 'basic' && (
                <Pressable style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleCloseWOModal}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
              )}
              {formStep !== 'tasks' ? (
                <Pressable 
                  style={[styles.saveButton, { backgroundColor: colors.primary }]} 
                  onPress={() => setFormStep(formStep === 'basic' ? 'safety' : 'tasks')}
                >
                  <Text style={styles.saveButtonText}>Next</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable style={[styles.saveButton, { backgroundColor: colors.success || '#10B981' }]} onPress={handleSaveWO}>
                  <Text style={styles.saveButtonText}>{editingWO ? 'Update' : 'Create'}</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCompletePMModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCompletePMModal(false)}>
        <KeyboardAvoidingView style={[styles.modalContainer, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Complete PM</Text>
            <Pressable onPress={() => setShowCompletePMModal(false)} style={styles.closeButton}><X size={24} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedPM && (
              <View style={[styles.pmSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.pmSummaryTitle, { color: colors.text }]}>{selectedPM.title}</Text>
                <Text style={[styles.pmSummaryEquip, { color: colors.textSecondary }]}>{selectedPM.equipment_name}</Text>
              </View>
            )}
            {renderFormField('Labor Hours', completePMData.laborHours, (text) => setCompletePMData(prev => ({ ...prev, laborHours: text })), { placeholder: 'Enter total hours worked' })}
            {renderFormField('Completion Notes', completePMData.notes, (text) => setCompletePMData(prev => ({ ...prev, notes: text })), { placeholder: 'Add any notes about the work performed', multiline: true })}
            <View style={styles.modalActions}>
              <Pressable style={[styles.cancelButton, { borderColor: colors.border }]} onPress={() => setShowCompletePMModal(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: pmStatusConfig.completed.color }]} onPress={handleCompletePM}>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Complete PM</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!showDetailedWO} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowDetailedWO(null)}>
        {showDetailedWO && (
          <WorkOrderDetail
            workOrder={showDetailedWO}
            onClose={() => setShowDetailedWO(null)}
            onUpdate={handleUpdateDetailedWO}
            onStartWork={handleStartDetailedWork}
            onCompleteWork={handleCompleteDetailedWork}
            canEdit={canEdit}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600' as const },
  headerSpacer: { width: 40 },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, marginTop: 12 },
  noAccessTitle: { fontSize: 20, fontWeight: '600' as const, marginTop: 16 },
  noAccessText: { fontSize: 14, textAlign: 'center' as const, marginTop: 8, paddingHorizontal: 32 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingTop: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabText: { fontSize: 13, fontWeight: '500' as const },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' as const },
  scrollContent: { padding: 16, paddingBottom: 100 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: '22%', padding: 12, borderRadius: 12, alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 22, fontWeight: '700' as const },
  metricLabel: { fontSize: 10, fontWeight: '500' as const },
  filterRow: { marginBottom: 16 },
  filterScroll: { gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  emptyCard: { padding: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 8 },
  emptyText: { fontSize: 14 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: '500' as const, flex: 1 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 10, fontWeight: '700' as const },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600' as const },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500' as const },
  cardTitle: { fontSize: 16, fontWeight: '600' as const },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  subText: { fontSize: 13 },
  equipmentTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  equipmentTagText: { fontSize: 12, fontWeight: '500' as const },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  pmInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pmInfoText: { fontSize: 12 },
  progressContainer: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, marginTop: 4 },
  actionsPanel: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, gap: 12 },
  actionLabel: { fontSize: 12, fontWeight: '500' as const },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  quickActionText: { fontSize: 13, fontWeight: '500' as const },
  specsSection: { marginTop: 8 },
  specsTitle: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  specKey: { fontSize: 12 },
  specValue: { fontSize: 12, fontWeight: '500' as const },
  taskListTitle: { fontSize: 14, fontWeight: '600' as const, marginTop: 8 },
  pmTaskItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  taskCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskText: { flex: 1, fontSize: 13, lineHeight: 18 },
  notesSection: { marginTop: 12, padding: 10, borderRadius: 8 },
  notesTitle: { fontSize: 12, fontWeight: '500' as const, marginBottom: 4 },
  notesText: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  dateText: { fontSize: 11 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '600' as const },
  closeButton: { padding: 4 },
  modalContent: { flex: 1, padding: 16 },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 8 },
  formInput: { borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' as const },
  pickerScroll: { flexDirection: 'row' },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 8, borderWidth: 1 },
  pickerText: { fontSize: 13, fontWeight: '500' as const },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 40 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' as const },
  saveButton: { flex: 2, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },
  formSteps: { flexDirection: 'row', borderBottomWidth: 1 },
  formStepTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  formStepText: { fontSize: 14, fontWeight: '500' as const },
  safetySection: { marginBottom: 20, padding: 14, borderRadius: 12, borderWidth: 1 },
  safetyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  safetyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  safetySectionTitle: { fontSize: 15, fontWeight: '600' as const },
  safetyNote: { fontSize: 13, marginTop: 8 },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 4 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  permitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  permitChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  permitChipCode: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  permitChipCodeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' as const },
  permitChipName: { fontSize: 12, fontWeight: '500' as const, maxWidth: 100 },
  ppeCategoryBlock: { marginTop: 12 },
  ppeCategoryName: { fontSize: 12, fontWeight: '500' as const, marginBottom: 8 },
  ppeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ppeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  ppeChipText: { fontSize: 12 },
  addTaskContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  taskInput: { flex: 1, borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1 },
  addTaskButton: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyTasks: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTasksText: { fontSize: 15, fontWeight: '500' as const },
  emptyTasksHint: { fontSize: 13 },
  tasksList: { gap: 10 },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  taskNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  taskNumberText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' as const },
  taskDescription: { flex: 1, fontSize: 14 },
  removeTaskButton: { padding: 4 },
  pmSummary: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  pmSummaryTitle: { fontSize: 16, fontWeight: '600' as const },
  pmSummaryEquip: { fontSize: 14, marginTop: 4 },
});
