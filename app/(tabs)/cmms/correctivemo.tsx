import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  FileText,
  ChevronRight,
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  User,
  Settings2,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit3,
  CheckCircle,
  MapPin,
  UserCircle,
  Package,
  Building2,
  FileWarning,
  Layers,
  Cpu,
  Hash,
  FileEdit,
  Save,
  AlertOctagon,
  Link2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useWorkOrdersQuery, useCreateWorkOrder, useCompleteWorkOrder, ExtendedWorkOrder } from '@/hooks/useSupabaseWorkOrders';
import { useWorkOrderDowntimeQuery, useResolveDowntimeEvent, formatDurationMinutes, getReasonInfo } from '@/hooks/useSupabaseDowntime';
import { useEquipmentQuery, ExtendedEquipment } from '@/hooks/useSupabaseEquipment';
import { useEmployees, SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import { FAILURE_CODES, FAILURE_CODE_CATEGORIES, FailureCode, FailureCodeCategory } from '@/constants/failureCodesDataConstants';


interface CorrectiveWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  equipment: string;
  equipmentId?: string;
  location: string;
  department?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  assignedTo?: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  description?: string;
  problemDescription?: string;
  correctiveAction?: string;
  rootCause?: string;
  partsUsed?: PartUsed[];
  laborHours?: LaborEntry[];
  statusHistory?: StatusHistoryEntry[];
}

interface PartUsed {
  id: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface LaborEntry {
  id: string;
  technician: string;
  date: string;
  hours: number;
  notes?: string;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

interface Equipment {
  id: string;
  name: string;
  tag: string;
  location: string;
  department: string;
  type: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  status: 'operational' | 'down' | 'maintenance';
}

interface WorkOrderFormData {
  title: string;
  equipmentId: string;
  equipment: string;
  location: string;
  department: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  problemDescription: string;
  dueDate: string;
  assignedTo: string;
  initialNotes: string;
  failureCodeId: string;
  failureCode: string;
  failureCodeCategory: string;
}





export default function CorrectiveMaintenanceScreen() {
  const { colors } = useTheme();
  const { data: supabaseWorkOrders = [], refetch: refetchWorkOrders } = useWorkOrdersQuery({ type: 'corrective' });
  const { data: supabaseEquipment = [] } = useEquipmentQuery();
  const { data: supabaseEmployees = [] } = useEmployees({ status: 'active' });
  
  const equipmentList: Equipment[] = useMemo(() => {
    return supabaseEquipment.map((eq: ExtendedEquipment) => ({
      id: eq.id,
      name: eq.name,
      tag: (eq as any).equipment_tag || eq.name,
      location: eq.location || 'Unknown',
      department: (eq as any).department || 'Maintenance',
      type: eq.category || 'General',
      criticality: (eq.criticality as Equipment['criticality']) || 'medium',
      status: (eq.status === 'needs_maintenance' ? 'maintenance' : eq.status === 'retired' ? 'down' : eq.status) as Equipment['status'],
    }));
  }, [supabaseEquipment]);
  
  const technicianList: string[] = useMemo(() => {
    return supabaseEmployees
      .filter((emp: SupabaseEmployee) => emp.status === 'active')
      .map((emp: SupabaseEmployee) => `${emp.first_name} ${emp.last_name}`);
  }, [supabaseEmployees]);
  const createWorkOrderMutation = useCreateWorkOrder();
  const completeWorkOrderMutation = useCompleteWorkOrder();
  const [refreshing, setRefreshing] = useState(false);
  
  // Transform Supabase work orders to CorrectiveWorkOrder format
  const workOrders = useMemo(() => {
    const transformedOrders: CorrectiveWorkOrder[] = supabaseWorkOrders
      .map((wo: ExtendedWorkOrder) => ({
        id: wo.id,
        workOrderNumber: wo.work_order_number || `CWO-${wo.id.substring(0, 8).toUpperCase()}`,
        title: wo.title,
        equipment: wo.equipment || 'Unspecified',
        equipmentId: wo.equipment_id ?? wo.equipment ?? undefined,
        location: wo.location || 'Production Floor',
        department: wo.department || 'Maintenance',
        priority: wo.priority,
        status: wo.status === 'overdue' ? 'open' : wo.status,
        assignedTo: wo.assigned_to ?? wo.assigned_name ?? undefined,
        createdAt: wo.created_at,
        dueDate: wo.due_date,
        completedAt: wo.completed_at ?? undefined,
        description: wo.description,
        problemDescription: wo.description,
        correctiveAction: wo.completion_notes ?? undefined,
        partsUsed: [],
        laborHours: [],
        statusHistory: [
          { id: 'sh1', status: 'open', changedBy: 'System', changedAt: wo.created_at, notes: 'Work order created' },
          ...(wo.started_at ? [{ id: 'sh2', status: 'in_progress', changedBy: wo.assigned_name || 'System', changedAt: wo.started_at, notes: 'Started work' }] : []),
          ...(wo.completed_at ? [{ id: 'sh3', status: 'completed', changedBy: wo.completed_by || 'System', changedAt: wo.completed_at, notes: wo.completion_notes || 'Work completed' }] : []),
        ],
      }));
    return transformedOrders;
  }, [supabaseWorkOrders]);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [dateRangeType, setDateRangeType] = useState<'created' | 'due'>('created');
  const [showFilters, setShowFilters] = useState(false);
  
  // Detail modal state
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<CorrectiveWorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Create/Edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<CorrectiveWorkOrder | null>(null);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: '',
    equipmentId: '',
    equipment: '',
    location: '',
    department: '',
    priority: 'medium',
    problemDescription: '',
    dueDate: '',
    assignedTo: '',
    initialNotes: '',
    failureCodeId: '',
    failureCode: '',
    failureCodeCategory: '',
  });
  const [showFailureCodeSelector, setShowFailureCodeSelector] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WorkOrderFormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Failure Code Selector States
  const [failureCodeSearchQuery, setFailureCodeSearchQuery] = useState('');
  const [expandedFailureCodeId, setExpandedFailureCodeId] = useState<string | null>(null);
  const [failureCodeCategoryFilter, setFailureCodeCategoryFilter] = useState<string>('all');
  const [failureCodeEquipmentTypeFilter, setFailureCodeEquipmentTypeFilter] = useState<string>('all');

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const equipment = [...new Set(workOrders.map(wo => wo.equipment))];
    const technicians = [...new Set(workOrders.filter(wo => wo.assignedTo).map(wo => wo.assignedTo!))];
    return { equipment, technicians };
  }, [workOrders]);

  // Filter and sort work orders
  const filteredWorkOrders = useMemo(() => {
    let filtered = workOrders.filter(wo => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          wo.workOrderNumber.toLowerCase().includes(query) ||
          wo.title.toLowerCase().includes(query) ||
          wo.equipment.toLowerCase().includes(query) ||
          wo.location.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;

      // Equipment filter
      if (equipmentFilter !== 'all' && wo.equipment !== equipmentFilter) return false;

      // Technician filter
      if (technicianFilter !== 'all' && wo.assignedTo !== technicianFilter) return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case 'workOrderNumber':
          aVal = a.workOrderNumber;
          bVal = b.workOrderNumber;
          break;
        case 'equipment':
          aVal = a.equipment;
          bVal = b.equipment;
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder: Record<string, number> = { open: 0, in_progress: 1, on_hold: 2, completed: 3, cancelled: 4 };
          aVal = statusOrder[a.status] ?? 5;
          bVal = statusOrder[b.status] ?? 5;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'dueDate':
          aVal = new Date(a.dueDate).getTime();
          bVal = new Date(b.dueDate).getTime();
          break;
        case 'assignedTo':
          aVal = a.assignedTo || 'zzz';
          bVal = b.assignedTo || 'zzz';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [workOrders, searchQuery, statusFilter, priorityFilter, equipmentFilter, technicianFilter, sortColumn, sortDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (equipmentFilter !== 'all') count++;
    if (technicianFilter !== 'all') count++;
    return count;
  }, [statusFilter, priorityFilter, equipmentFilter, technicianFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setEquipmentFilter('all');
    setTechnicianFilter('all');
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const isOverdue = useCallback((wo: CorrectiveWorkOrder) => {
    if (wo.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(wo.dueDate);
    return dueDate < today;
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return { bg: '#FEF3C7', text: '#D97706' };
      case 'in_progress': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'on_hold': return { bg: '#F3F4F6', text: '#6B7280' };
      case 'completed': return { bg: '#D1FAE5', text: '#059669' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'on_hold': return 'On Hold';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleViewWorkOrder = useCallback((wo: CorrectiveWorkOrder) => {
    console.log('View work order:', wo.workOrderNumber);
    setSelectedWorkOrder(wo);
    setShowDetailModal(true);
  }, []);

  const handleEditWorkOrder = useCallback((wo: CorrectiveWorkOrder) => {
    console.log('Edit work order:', wo.workOrderNumber);
    setEditingWorkOrder(wo);
    setFormData({
      title: wo.title,
      equipmentId: wo.equipmentId || '',
      equipment: wo.equipment,
      location: wo.location,
      department: wo.department || '',
      priority: wo.priority,
      problemDescription: wo.problemDescription || wo.description || '',
      dueDate: wo.dueDate,
      assignedTo: wo.assignedTo || '',
      initialNotes: '',
      failureCodeId: '',
      failureCode: '',
      failureCodeCategory: '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  }, []);

  const handleCompleteWorkOrder = useCallback((wo: CorrectiveWorkOrder) => {
    console.log('[CorrectiveMO] Opening completion flow for:', wo.workOrderNumber);
    setSelectedWorkOrder(wo);
    setShowDetailModal(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchWorkOrders();
      console.log('[CorrectiveMO] Refreshed work orders from Supabase');
    } catch (error) {
      console.error('[CorrectiveMO] Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWorkOrders]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = workOrders.length;
    const open = workOrders.filter(wo => wo.status === 'open').length;
    const inProgress = workOrders.filter((wo: CorrectiveWorkOrder) => wo.status === 'in_progress').length;
    const completed = workOrders.filter(wo => wo.status === 'completed').length;
    const onHold = workOrders.filter(wo => wo.status === 'on_hold').length;
    
    // Calculate overdue (open or in_progress with past due date)
    const overdue = workOrders.filter(wo => {
      if (wo.status === 'completed') return false;
      const dueDate = new Date(wo.dueDate);
      return dueDate < today;
    }).length;

    return { total, open, inProgress, completed, onHold, overdue };
  }, [workOrders]);

  const handleNewWorkOrder = useCallback(() => {
    setEditingWorkOrder(null);
    setFormData({
      title: '',
      equipmentId: '',
      equipment: '',
      location: '',
      department: '',
      priority: 'medium',
      problemDescription: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTo: '',
      initialNotes: '',
      failureCodeId: '',
      failureCode: '',
      failureCodeCategory: '',
    });
    setFormErrors({});
    setShowCreateModal(true);
  }, []);

  const filteredEquipment = useMemo(() => {
    if (!equipmentSearchQuery) return equipmentList;
    const query = equipmentSearchQuery.toLowerCase();
    return equipmentList.filter(eq =>
      eq.name.toLowerCase().includes(query) ||
      eq.tag.toLowerCase().includes(query) ||
      eq.location.toLowerCase().includes(query) ||
      eq.department.toLowerCase().includes(query) ||
      eq.type.toLowerCase().includes(query)
    );
  }, [equipmentSearchQuery, equipmentList]);

  // Get unique equipment types for filter
  const equipmentTypes = useMemo(() => {
    return [...new Set(equipmentList.map(eq => eq.type))].sort();
  }, [equipmentList]);

  // Get selected equipment's type
  const selectedEquipmentType = useMemo(() => {
    if (!formData.equipmentId) return null;
    const equipment = equipmentList.find(eq => eq.id === formData.equipmentId);
    return equipment?.type || null;
  }, [formData.equipmentId, equipmentList]);

  // Filter failure codes based on search, category, and equipment type
  const filteredFailureCodes = useMemo(() => {
    let filtered = FAILURE_CODES.filter(fc => fc.isActive);

    // Search filter
    if (failureCodeSearchQuery) {
      const query = failureCodeSearchQuery.toLowerCase();
      filtered = filtered.filter(fc =>
        fc.code.toLowerCase().includes(query) ||
        fc.name.toLowerCase().includes(query) ||
        fc.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (failureCodeCategoryFilter !== 'all') {
      filtered = filtered.filter(fc => fc.category === failureCodeCategoryFilter);
    }

    // Equipment type filter - map equipment types to relevant failure code categories
    if (failureCodeEquipmentTypeFilter !== 'all') {
      const typeToCategories: Record<string, FailureCodeCategory[]> = {
        'Conveyor': ['mechanical', 'electrical', 'process'],
        'Pump': ['mechanical', 'hydraulic', 'electrical'],
        'Compressor': ['mechanical', 'pneumatic', 'electrical'],
        'Press': ['mechanical', 'hydraulic', 'electrical', 'instrumentation'],
        'Mixer': ['mechanical', 'electrical', 'process'],
        'HVAC': ['mechanical', 'electrical', 'instrumentation'],
        'Electrical': ['electrical', 'instrumentation'],
        'Packaging': ['mechanical', 'electrical', 'instrumentation', 'process'],
        'Boiler': ['mechanical', 'instrumentation', 'process'],
        'Chiller': ['mechanical', 'electrical', 'instrumentation'],
        'Inspection': ['instrumentation', 'electrical'],
        'Material Handling': ['mechanical', 'hydraulic', 'electrical'],
      };
      const relevantCategories = typeToCategories[failureCodeEquipmentTypeFilter] || [];
      if (relevantCategories.length > 0) {
        filtered = filtered.filter(fc => relevantCategories.includes(fc.category));
      }
    }

    return filtered;
  }, [failureCodeSearchQuery, failureCodeCategoryFilter, failureCodeEquipmentTypeFilter]);

  // Check if any failure code filters are active
  const hasActiveFailureCodeFilters = useMemo(() => {
    return failureCodeSearchQuery !== '' || 
           failureCodeCategoryFilter !== 'all' || 
           failureCodeEquipmentTypeFilter !== 'all';
  }, [failureCodeSearchQuery, failureCodeCategoryFilter, failureCodeEquipmentTypeFilter]);

  const groupedFailureCodes = useMemo(() => {
    const groups: { category: typeof FAILURE_CODE_CATEGORIES[0]; codes: FailureCode[] }[] = [];
    
    FAILURE_CODE_CATEGORIES.forEach(cat => {
      const codesInCategory = filteredFailureCodes.filter(fc => fc.category === cat.id);
      if (codesInCategory.length > 0) {
        groups.push({ category: cat, codes: codesInCategory });
      }
    });
    
    return groups;
  }, [filteredFailureCodes]);

  // Clear all failure code filters
  const clearFailureCodeFilters = useCallback(() => {
    setFailureCodeSearchQuery('');
    setFailureCodeCategoryFilter('all');
    setFailureCodeEquipmentTypeFilter('all');
  }, []);

  // Handle selecting a failure code
  const handleSelectFailureCode = useCallback((fc: FailureCode) => {
    const categoryInfo = FAILURE_CODE_CATEGORIES.find(c => c.id === fc.category);
    setFormData(prev => ({
      ...prev,
      failureCodeId: fc.id,
      failureCode: `${fc.code} - ${fc.name}`,
      failureCodeCategory: categoryInfo?.name || fc.category,
    }));
    setShowFailureCodeSelector(false);
    clearFailureCodeFilters();
  }, [clearFailureCodeFilters]);

  // Get category color
  const getFailureCodeCategoryColor = useCallback((category: string) => {
    const categoryInfo = FAILURE_CODE_CATEGORIES.find(c => c.id === category);
    return categoryInfo?.color || '#6B7280';
  }, []);

  const handleSelectEquipment = useCallback((equipment: Equipment) => {
    setFormData(prev => ({
      ...prev,
      equipmentId: equipment.id,
      equipment: equipment.name,
      location: equipment.location,
      department: equipment.department,
    }));
    setShowEquipmentSelector(false);
    setEquipmentSearchQuery('');
    setFormErrors(prev => ({ ...prev, equipment: undefined }));
  }, []);

  const validateForm = useCallback(() => {
    const errors: Partial<Record<keyof WorkOrderFormData, string>> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.equipment) errors.equipment = 'Equipment selection is required';
    if (!formData.problemDescription.trim()) errors.problemDescription = 'Problem description is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSaveWorkOrder = useCallback(() => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    console.log('Saving corrective work order:', formData);
    
    createWorkOrderMutation.mutate({
      title: formData.title,
      description: formData.problemDescription || formData.initialNotes || 'Corrective maintenance work order',
      status: 'open',
      priority: formData.priority,
      type: 'corrective',
      assigned_to: formData.assignedTo || null,
      assigned_name: formData.assignedTo || undefined,
      facility_id: 'facility-1',
      due_date: formData.dueDate,
      equipment: formData.equipment,
      equipment_id: formData.equipmentId || null,
      location: formData.location || undefined,
      started_at: null,
      completed_at: null,
      estimated_hours: null,
      actual_hours: null,
      notes: formData.initialNotes || null,
      completion_notes: null,
    }, {
      onSuccess: (newWorkOrder) => {
        console.log('Corrective work order created:', newWorkOrder);
        setIsSaving(false);
        setShowCreateModal(false);
        setEditingWorkOrder(null);
        setFormData({
          title: '',
          equipmentId: '',
          equipment: '',
          location: '',
          department: '',
          priority: 'medium',
          problemDescription: '',
          dueDate: '',
          assignedTo: '',
          initialNotes: '',
          failureCodeId: '',
          failureCode: '',
          failureCodeCategory: '',
        });
      },
      onError: (error) => {
        console.error('Error creating corrective work order:', error);
        setIsSaving(false);
      },
    });
  }, [formData, validateForm, createWorkOrderMutation]);

  const getEquipmentCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return { bg: '#D1FAE5', text: '#059669' };
      case 'down': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'maintenance': return { bg: '#FEF3C7', text: '#D97706' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'major': return '#F97316';
      case 'moderate': return '#F59E0B';
      case 'minor': return '#22C55E';
      default: return '#6B7280';
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
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIcon, { backgroundColor: '#EF444420' }]}>
                <Wrench size={24} color="#EF4444" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Corrective Maintenance
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Manage repair and breakdown work orders
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.newButton, { backgroundColor: '#3B82F6' }]}
              onPress={handleNewWorkOrder}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.newButtonText}>New Order</Text>
            </Pressable>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {/* Total Orders */}
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
                <FileText size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Orders</Text>
            </Pressable>

            {/* Open */}
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Clock size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.open}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
            </Pressable>

            {/* In Progress */}
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
                <PlayCircle size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.inProgress}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            {/* Completed */}
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                <CheckCircle2 size={20} color="#10B981" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
            </Pressable>

            {/* Overdue - Highlighted */}
            <Pressable
              style={[
                styles.statCard,
                { 
                  backgroundColor: stats.overdue > 0 ? '#EF444410' : colors.surface,
                  borderColor: stats.overdue > 0 ? '#EF4444' : colors.border,
                  borderWidth: stats.overdue > 0 ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
                <AlertTriangle size={20} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: stats.overdue > 0 ? '#EF4444' : colors.text }]}>
                {stats.overdue}
              </Text>
              <Text style={[styles.statLabel, { color: stats.overdue > 0 ? '#EF4444' : colors.textSecondary }]}>
                Overdue
              </Text>
            </Pressable>

            {/* On Hold */}
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: '#6B728020' }]}>
                <Clock size={20} color="#6B7280" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.onHold}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>On Hold</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Summary Banner */}
        {stats.overdue > 0 && (
          <Pressable
            style={[styles.alertBanner, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
          >
            <View style={styles.alertContent}>
              <AlertTriangle size={20} color="#EF4444" />
              <View style={styles.alertTextContainer}>
                <Text style={[styles.alertTitle, { color: '#991B1B' }]}>
                  Attention Required
                </Text>
                <Text style={[styles.alertSubtitle, { color: '#B91C1C' }]}>
                  {stats.overdue} work order{stats.overdue > 1 ? 's are' : ' is'} overdue and require{stats.overdue === 1 ? 's' : ''} immediate attention
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#EF4444" />
          </Pressable>
        )}

        {/* Filter Bar Section */}
        <View style={[styles.filterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search WO#, equipment, description..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Filter Toggle Button */}
          <Pressable
            style={[
              styles.filterToggleButton,
              { backgroundColor: showFilters ? '#3B82F6' : colors.background, borderColor: showFilters ? '#3B82F6' : colors.border }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={showFilters ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.filterToggleText, { color: showFilters ? '#FFFFFF' : colors.text }]}>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
            <ChevronDown 
              size={16} 
              color={showFilters ? '#FFFFFF' : colors.textSecondary} 
              style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {/* Expanded Filter Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              {/* Status Filter */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
                  <View style={styles.filterChipsRow}>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'open', label: 'Open' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'on_hold', label: 'On Hold' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ].map(option => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: statusFilter === option.value ? '#3B82F6' : colors.background,
                            borderColor: statusFilter === option.value ? '#3B82F6' : colors.border,
                          }
                        ]}
                        onPress={() => setStatusFilter(option.value)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: statusFilter === option.value ? '#FFFFFF' : colors.text }
                        ]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Priority Filter */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Priority</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
                  <View style={styles.filterChipsRow}>
                    {[
                      { value: 'all', label: 'All', color: null },
                      { value: 'critical', label: 'Critical', color: '#EF4444' },
                      { value: 'high', label: 'High', color: '#F97316' },
                      { value: 'medium', label: 'Medium', color: '#F59E0B' },
                      { value: 'low', label: 'Low', color: '#22C55E' },
                    ].map(option => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: priorityFilter === option.value 
                              ? (option.color || '#3B82F6') 
                              : colors.background,
                            borderColor: priorityFilter === option.value 
                              ? (option.color || '#3B82F6') 
                              : colors.border,
                          }
                        ]}
                        onPress={() => setPriorityFilter(option.value)}
                      >
                        {option.color && priorityFilter !== option.value && (
                          <View style={[styles.priorityDot, { backgroundColor: option.color }]} />
                        )}
                        <Text style={[
                          styles.filterChipText,
                          { color: priorityFilter === option.value ? '#FFFFFF' : colors.text }
                        ]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Equipment Filter */}
              <View style={styles.filterGroup}>
                <View style={styles.filterLabelRow}>
                  <Settings2 size={14} color={colors.textSecondary} />
                  <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Equipment</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
                  <View style={styles.filterChipsRow}>
                    <Pressable
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: equipmentFilter === 'all' ? '#3B82F6' : colors.background,
                          borderColor: equipmentFilter === 'all' ? '#3B82F6' : colors.border,
                        }
                      ]}
                      onPress={() => setEquipmentFilter('all')}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: equipmentFilter === 'all' ? '#FFFFFF' : colors.text }
                      ]}>All Equipment</Text>
                    </Pressable>
                    {filterOptions.equipment.map(equip => (
                      <Pressable
                        key={equip}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: equipmentFilter === equip ? '#3B82F6' : colors.background,
                            borderColor: equipmentFilter === equip ? '#3B82F6' : colors.border,
                          }
                        ]}
                        onPress={() => setEquipmentFilter(equip)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: equipmentFilter === equip ? '#FFFFFF' : colors.text }
                        ]}>{equip}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Technician Filter */}
              <View style={styles.filterGroup}>
                <View style={styles.filterLabelRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Assigned Technician</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
                  <View style={styles.filterChipsRow}>
                    <Pressable
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: technicianFilter === 'all' ? '#3B82F6' : colors.background,
                          borderColor: technicianFilter === 'all' ? '#3B82F6' : colors.border,
                        }
                      ]}
                      onPress={() => setTechnicianFilter('all')}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: technicianFilter === 'all' ? '#FFFFFF' : colors.text }
                      ]}>All Technicians</Text>
                    </Pressable>
                    {filterOptions.technicians.map(tech => (
                      <Pressable
                        key={tech}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: technicianFilter === tech ? '#3B82F6' : colors.background,
                            borderColor: technicianFilter === tech ? '#3B82F6' : colors.border,
                          }
                        ]}
                        onPress={() => setTechnicianFilter(tech)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: technicianFilter === tech ? '#FFFFFF' : colors.text }
                        ]}>{tech}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Date Range Type Toggle */}
              <View style={styles.filterGroup}>
                <View style={styles.filterLabelRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Date Range By</Text>
                </View>
                <View style={styles.dateToggleRow}>
                  <Pressable
                    style={[
                      styles.dateToggleButton,
                      {
                        backgroundColor: dateRangeType === 'created' ? '#3B82F6' : colors.background,
                        borderColor: dateRangeType === 'created' ? '#3B82F6' : colors.border,
                      }
                    ]}
                    onPress={() => setDateRangeType('created')}
                  >
                    <Text style={[
                      styles.dateToggleText,
                      { color: dateRangeType === 'created' ? '#FFFFFF' : colors.text }
                    ]}>Created Date</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.dateToggleButton,
                      {
                        backgroundColor: dateRangeType === 'due' ? '#3B82F6' : colors.background,
                        borderColor: dateRangeType === 'due' ? '#3B82F6' : colors.border,
                      }
                    ]}
                    onPress={() => setDateRangeType('due')}
                  >
                    <Text style={[
                      styles.dateToggleText,
                      { color: dateRangeType === 'due' ? '#FFFFFF' : colors.text }
                    ]}>Due Date</Text>
                  </Pressable>
                </View>
              </View>

              {/* Clear All Filters Button */}
              {activeFilterCount > 0 && (
                <Pressable
                  style={styles.clearAllButton}
                  onPress={clearAllFilters}
                >
                  <X size={14} color="#EF4444" />
                  <Text style={styles.clearAllText}>Clear All Filters</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Results Summary Bar */}
          <View style={[styles.resultsBar, { borderTopColor: colors.border }]}>
            <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
              Showing <Text style={{ color: colors.text, fontWeight: '600' }}>{filteredWorkOrders.length}</Text> of {workOrders.length} orders
            </Text>
            {activeFilterCount > 0 && (
              <Pressable style={styles.clearInlineButton} onPress={clearAllFilters}>
                <X size={12} color="#3B82F6" />
                <Text style={styles.clearInlineText}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Work Order List Section */}
        <View style={[styles.listSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Column Headers */}
          <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.listHeaderContent}>
              <Pressable 
                style={[styles.headerCell, styles.woNumberCell]} 
                onPress={() => handleSort('workOrderNumber')}
              >
                <Text style={[styles.headerText, { color: colors.textSecondary }]}>WO #</Text>
                {sortColumn === 'workOrderNumber' && (
                  sortDirection === 'asc' 
                    ? <ArrowUp size={12} color="#3B82F6" />
                    : <ArrowDown size={12} color="#3B82F6" />
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.headerCell, styles.equipmentCell]} 
                onPress={() => handleSort('equipment')}
              >
                <Text style={[styles.headerText, { color: colors.textSecondary }]}>Equipment</Text>
                {sortColumn === 'equipment' && (
                  sortDirection === 'asc' 
                    ? <ArrowUp size={12} color="#3B82F6" />
                    : <ArrowDown size={12} color="#3B82F6" />
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.headerCell, styles.priorityCell]} 
                onPress={() => handleSort('priority')}
              >
                <Text style={[styles.headerText, { color: colors.textSecondary }]}>Priority</Text>
                {sortColumn === 'priority' && (
                  sortDirection === 'asc' 
                    ? <ArrowUp size={12} color="#3B82F6" />
                    : <ArrowDown size={12} color="#3B82F6" />
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.headerCell, styles.statusCell]} 
                onPress={() => handleSort('status')}
              >
                <Text style={[styles.headerText, { color: colors.textSecondary }]}>Status</Text>
                {sortColumn === 'status' && (
                  sortDirection === 'asc' 
                    ? <ArrowUp size={12} color="#3B82F6" />
                    : <ArrowDown size={12} color="#3B82F6" />
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.headerCell, styles.dateCell]} 
                onPress={() => handleSort('dueDate')}
              >
                <Text style={[styles.headerText, { color: colors.textSecondary }]}>Due</Text>
                {sortColumn === 'dueDate' && (
                  sortDirection === 'asc' 
                    ? <ArrowUp size={12} color="#3B82F6" />
                    : <ArrowDown size={12} color="#3B82F6" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Work Order Items */}
          {filteredWorkOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Work Orders Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeFilterCount > 0 
                  ? 'Try adjusting your filters to see more results'
                  : 'No corrective maintenance orders have been created yet'}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable style={styles.emptyButton} onPress={clearAllFilters}>
                  <Text style={styles.emptyButtonText}>Clear Filters</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.listContent}>
              {filteredWorkOrders.map((wo, index) => {
                const overdue = isOverdue(wo);
                const priorityColor = getPriorityColor(wo.priority);
                const statusColors = getStatusColor(wo.status);
                
                return (
                  <Pressable
                    key={wo.id}
                    style={[
                      styles.workOrderCard,
                      { 
                        backgroundColor: overdue ? '#FEF2F208' : colors.background,
                        borderColor: overdue ? '#EF444440' : colors.border,
                      },
                      index === filteredWorkOrders.length - 1 && styles.lastCard
                    ]}
                    onPress={() => handleViewWorkOrder(wo)}
                  >
                    {/* Top Row: WO Number, Priority, Status */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeft}>
                        <Text style={[styles.woNumber, { color: '#3B82F6' }]}>
                          {wo.workOrderNumber}
                        </Text>
                        {overdue && (
                          <View style={styles.overdueTag}>
                            <AlertTriangle size={10} color="#EF4444" />
                            <Text style={styles.overdueText}>OVERDUE</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.cardBadges}>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
                          <View style={[styles.priorityDotSmall, { backgroundColor: priorityColor }]} />
                          <Text style={[styles.priorityText, { color: priorityColor }]}>
                            {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                          </Text>
                        </View>
                        
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                          <Text style={[styles.statusText, { color: statusColors.text }]}>
                            {getStatusLabel(wo.status)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Title/Problem Summary */}
                    <Text 
                      style={[styles.woTitle, { color: colors.text }]} 
                      numberOfLines={2}
                    >
                      {wo.title}
                    </Text>

                    {/* Equipment & Location Row */}
                    <View style={styles.cardInfoRow}>
                      <View style={styles.infoItem}>
                        <Settings2 size={13} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {wo.equipment}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <MapPin size={13} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {wo.location}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Dates, Technician, Actions */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                          <Calendar size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            Created: {formatDate(wo.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Clock size={12} color={overdue ? '#EF4444' : colors.textSecondary} />
                          <Text style={[
                            styles.metaText, 
                            { color: overdue ? '#EF4444' : colors.textSecondary },
                            overdue && styles.overdueDate
                          ]}>
                            Due: {formatDate(wo.dueDate)}
                          </Text>
                        </View>
                        {wo.assignedTo && (
                          <View style={styles.metaItem}>
                            <UserCircle size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              {wo.assignedTo}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <Pressable 
                          style={[styles.actionBtn, styles.viewBtn]}
                          onPress={() => handleViewWorkOrder(wo)}
                          hitSlop={8}
                        >
                          <Eye size={14} color="#3B82F6" />
                        </Pressable>
                        <Pressable 
                          style={[styles.actionBtn, styles.editBtn]}
                          onPress={() => handleEditWorkOrder(wo)}
                          hitSlop={8}
                        >
                          <Edit3 size={14} color="#F59E0B" />
                        </Pressable>
                        {wo.status !== 'completed' && (
                          <Pressable 
                            style={[styles.actionBtn, styles.completeBtn]}
                            onPress={() => handleCompleteWorkOrder(wo)}
                            hitSlop={8}
                          >
                            <CheckCircle size={14} color="#10B981" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Work Order Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedWorkOrder && (
          <WorkOrderDetailSheet
            workOrder={selectedWorkOrder}
            onClose={() => setShowDetailModal(false)}
            colors={colors}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            onComplete={(workOrderId, notes) => {
              console.log('[CorrectiveMO] Completing work order via Supabase:', workOrderId);
              completeWorkOrderMutation.mutate(
                { workOrderId, completionNotes: notes },
                {
                  onSuccess: () => {
                    console.log('[CorrectiveMO] Work order completed successfully');
                    refetchWorkOrders();
                  },
                  onError: (error) => {
                    console.error('[CorrectiveMO] Error completing work order:', error);
                  },
                }
              );
            }}
          />
        )}
      </Modal>

      {/* Create/Edit Work Order Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[createStyles.container, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[createStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreateModal(false)} style={createStyles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[createStyles.headerTitle, { color: colors.text }]}>
              {editingWorkOrder ? 'Edit Work Order' : 'New Corrective Work Order'}
            </Text>
            <Pressable 
              style={[createStyles.saveHeaderBtn, isSaving && { opacity: 0.6 }]}
              onPress={handleSaveWorkOrder}
              disabled={isSaving}
            >
              <Save size={20} color="#3B82F6" />
            </Pressable>
          </View>

          <ScrollView style={createStyles.content} showsVerticalScrollIndicator={false}>
            {/* Equipment Selector Section */}
            <View style={[createStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={createStyles.sectionHeader}>
                <Cpu size={18} color="#3B82F6" />
                <Text style={[createStyles.sectionTitle, { color: colors.text }]}>Equipment Selection</Text>
                <Text style={createStyles.requiredBadge}>Required</Text>
              </View>

              {/* Selected Equipment Display or Selector Trigger */}
              {formData.equipment ? (
                <Pressable 
                  style={[createStyles.selectedEquipment, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowEquipmentSelector(true)}
                >
                  <View style={createStyles.selectedEquipmentInfo}>
                    <View style={[createStyles.equipmentIconBox, { backgroundColor: '#3B82F620' }]}>
                      <Settings2 size={20} color="#3B82F6" />
                    </View>
                    <View style={createStyles.selectedEquipmentText}>
                      <Text style={[createStyles.selectedEquipmentName, { color: colors.text }]} numberOfLines={1}>
                        {formData.equipment}
                      </Text>
                      <View style={createStyles.selectedEquipmentMeta}>
                        <View style={createStyles.metaTag}>
                          <MapPin size={11} color={colors.textSecondary} />
                          <Text style={[createStyles.metaTagText, { color: colors.textSecondary }]}>
                            {formData.location}
                          </Text>
                        </View>
                        <View style={createStyles.metaTag}>
                          <Building2 size={11} color={colors.textSecondary} />
                          <Text style={[createStyles.metaTagText, { color: colors.textSecondary }]}>
                            {formData.department}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={createStyles.changeButton}>
                    <Edit3 size={14} color="#3B82F6" />
                    <Text style={createStyles.changeButtonText}>Change</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable 
                  style={[
                    createStyles.equipmentSelectorTrigger, 
                    { backgroundColor: colors.background, borderColor: formErrors.equipment ? '#EF4444' : colors.border }
                  ]}
                  onPress={() => setShowEquipmentSelector(true)}
                >
                  <View style={[createStyles.selectorIcon, { backgroundColor: '#3B82F610' }]}>
                    <Cpu size={24} color="#3B82F6" />
                  </View>
                  <View style={createStyles.selectorContent}>
                    <Text style={[createStyles.selectorTitle, { color: colors.text }]}>Select Equipment</Text>
                    <Text style={[createStyles.selectorSubtitle, { color: colors.textSecondary }]}>
                      Choose the equipment requiring maintenance
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </Pressable>
              )}
              {formErrors.equipment && (
                <Text style={createStyles.errorText}>{formErrors.equipment}</Text>
              )}
            </View>

            {/* Work Order Details Section */}
            <View style={[createStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={createStyles.sectionHeader}>
                <FileEdit size={18} color="#8B5CF6" />
                <Text style={[createStyles.sectionTitle, { color: colors.text }]}>Work Order Details</Text>
              </View>

              {/* Title Field */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Title <Text style={createStyles.required}>*</Text></Text>
                <TextInput
                  style={[
                    createStyles.formInput,
                    { backgroundColor: colors.background, borderColor: formErrors.title ? '#EF4444' : colors.border, color: colors.text }
                  ]}
                  placeholder="Brief description of the issue"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.title}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, title: text }));
                    if (formErrors.title) setFormErrors(prev => ({ ...prev, title: undefined }));
                  }}
                />
                {formErrors.title && <Text style={createStyles.errorText}>{formErrors.title}</Text>}
              </View>

              {/* Problem Description Field */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Problem Description <Text style={createStyles.required}>*</Text></Text>
                <TextInput
                  style={[
                    createStyles.formTextarea,
                    { backgroundColor: colors.background, borderColor: formErrors.problemDescription ? '#EF4444' : colors.border, color: colors.text }
                  ]}
                  placeholder="Detailed description of the problem..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={formData.problemDescription}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, problemDescription: text }));
                    if (formErrors.problemDescription) setFormErrors(prev => ({ ...prev, problemDescription: undefined }));
                  }}
                />
                {formErrors.problemDescription && <Text style={createStyles.errorText}>{formErrors.problemDescription}</Text>}
              </View>

              {/* Priority Selection */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Priority</Text>
                <View style={createStyles.priorityOptions}>
                  {[
                    { value: 'low' as const, label: 'Low', color: '#22C55E' },
                    { value: 'medium' as const, label: 'Medium', color: '#F59E0B' },
                    { value: 'high' as const, label: 'High', color: '#F97316' },
                    { value: 'critical' as const, label: 'Critical', color: '#EF4444' },
                  ].map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[
                        createStyles.priorityOption,
                        { 
                          backgroundColor: formData.priority === opt.value ? opt.color + '20' : colors.background,
                          borderColor: formData.priority === opt.value ? opt.color : colors.border,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, priority: opt.value }))}
                    >
                      <View style={[createStyles.priorityDot, { backgroundColor: opt.color }]} />
                      <Text style={[
                        createStyles.priorityOptionText,
                        { color: formData.priority === opt.value ? opt.color : colors.text }
                      ]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Due Date Field */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Due Date <Text style={createStyles.required}>*</Text></Text>
                <View style={[
                  createStyles.dateInputContainer,
                  { backgroundColor: colors.background, borderColor: formErrors.dueDate ? '#EF4444' : colors.border }
                ]}>
                  <Calendar size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[createStyles.dateInput, { color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.dueDate}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, dueDate: text }));
                      if (formErrors.dueDate) setFormErrors(prev => ({ ...prev, dueDate: undefined }));
                    }}
                  />
                </View>
                {formErrors.dueDate && <Text style={createStyles.errorText}>{formErrors.dueDate}</Text>}
              </View>

              {/* Assigned Technician */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Assign To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={createStyles.technicianOptions}>
                    <Pressable
                      style={[
                        createStyles.technicianOption,
                        { 
                          backgroundColor: !formData.assignedTo ? '#3B82F620' : colors.background,
                          borderColor: !formData.assignedTo ? '#3B82F6' : colors.border,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, assignedTo: '' }))}
                    >
                      <Text style={[
                        createStyles.technicianOptionText,
                        { color: !formData.assignedTo ? '#3B82F6' : colors.textSecondary }
                      ]}>Unassigned</Text>
                    </Pressable>
                    {technicianList.map(tech => (
                      <Pressable
                        key={tech}
                        style={[
                          createStyles.technicianOption,
                          { 
                            backgroundColor: formData.assignedTo === tech ? '#3B82F620' : colors.background,
                            borderColor: formData.assignedTo === tech ? '#3B82F6' : colors.border,
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, assignedTo: tech }))}
                      >
                        <UserCircle size={14} color={formData.assignedTo === tech ? '#3B82F6' : colors.textSecondary} />
                        <Text style={[
                          createStyles.technicianOptionText,
                          { color: formData.assignedTo === tech ? '#3B82F6' : colors.text }
                        ]}>{tech}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Initial Notes */}
              <View style={createStyles.formGroup}>
                <Text style={[createStyles.formLabel, { color: colors.text }]}>Initial Notes</Text>
                <Text style={[createStyles.formHint, { color: colors.textSecondary }]}>
                  Add preliminary observations, safety notes, or instructions
                </Text>
                <TextInput
                  style={[
                    createStyles.formTextarea,
                    createStyles.initialNotesInput,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                  ]}
                  placeholder="Enter any initial notes, safety precautions, or preliminary observations..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.initialNotes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, initialNotes: text }))}
                />
              </View>
            </View>

            {/* Failure Code Link Section */}
            <View style={[createStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={createStyles.sectionHeader}>
                <AlertOctagon size={18} color="#EF4444" />
                <Text style={[createStyles.sectionTitle, { color: colors.text }]}>Failure Code</Text>
                <View style={createStyles.optionalBadge}>
                  <Text style={createStyles.optionalBadgeText}>Optional</Text>
                </View>
              </View>

              <Text style={[createStyles.formHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Link this work order to a failure code for root cause tracking and analysis
              </Text>

              {/* Selected Failure Code Display or Selector Trigger */}
              {formData.failureCode ? (
                <Pressable 
                  style={[createStyles.selectedFailureCode, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowFailureCodeSelector(true)}
                >
                  <View style={createStyles.selectedFailureCodeInfo}>
                    <View style={[createStyles.failureCodeIconBox, { backgroundColor: '#EF444420' }]}>
                      <AlertOctagon size={20} color="#EF4444" />
                    </View>
                    <View style={createStyles.selectedFailureCodeText}>
                      <Text style={[createStyles.selectedFailureCodeName, { color: colors.text }]} numberOfLines={1}>
                        {formData.failureCode}
                      </Text>
                      {formData.failureCodeCategory && (
                        <View style={createStyles.failureCodeMeta}>
                          <View style={[createStyles.categoryTag, { backgroundColor: '#EF444415' }]}>
                            <Text style={[createStyles.categoryTagText, { color: '#EF4444' }]}>
                              {formData.failureCodeCategory}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={createStyles.failureCodeActions}>
                    <Pressable 
                      style={createStyles.changeButton}
                      onPress={() => setShowFailureCodeSelector(true)}
                    >
                      <Edit3 size={14} color="#3B82F6" />
                      <Text style={createStyles.changeButtonText}>Change</Text>
                    </Pressable>
                    <Pressable 
                      style={createStyles.removeButton}
                      onPress={() => setFormData(prev => ({ ...prev, failureCodeId: '', failureCode: '', failureCodeCategory: '' }))}
                    >
                      <X size={14} color="#EF4444" />
                    </Pressable>
                  </View>
                </Pressable>
              ) : (
                <Pressable 
                  style={[createStyles.failureCodeSelectorTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowFailureCodeSelector(true)}
                >
                  <View style={[createStyles.selectorIcon, { backgroundColor: '#EF444410' }]}>
                    <Link2 size={24} color="#EF4444" />
                  </View>
                  <View style={createStyles.selectorContent}>
                    <Text style={[createStyles.selectorTitle, { color: colors.text }]}>Link Failure Code</Text>
                    <Text style={[createStyles.selectorSubtitle, { color: colors.textSecondary }]}>
                      Associate with a failure code for analysis
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Save Button */}
            <Pressable 
              style={[createStyles.saveButton, isSaving && { opacity: 0.7 }]}
              onPress={handleSaveWorkOrder}
              disabled={isSaving}
            >
              {isSaving ? (
                <Text style={createStyles.saveButtonText}>Saving...</Text>
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" />
                  <Text style={createStyles.saveButtonText}>
                    {editingWorkOrder ? 'Update Work Order' : 'Create Work Order'}
                  </Text>
                </>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Equipment Selector Modal */}
          <Modal
            visible={showEquipmentSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowEquipmentSelector(false)}
          >
            <View style={createStyles.equipmentModalOverlay}>
              <View style={[createStyles.equipmentModalContainer, { backgroundColor: colors.surface }]}>
                <View style={[createStyles.equipmentModalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[createStyles.equipmentModalTitle, { color: colors.text }]}>Select Equipment</Text>
                  <Pressable onPress={() => { setShowEquipmentSelector(false); setEquipmentSearchQuery(''); }}>
                    <X size={24} color={colors.text} />
                  </Pressable>
                </View>

                {/* Equipment Search */}
                <View style={[createStyles.equipmentSearchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Search size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[createStyles.equipmentSearchInput, { color: colors.text }]}
                    placeholder="Search equipment by name, tag, location..."
                    placeholderTextColor={colors.textSecondary}
                    value={equipmentSearchQuery}
                    onChangeText={setEquipmentSearchQuery}
                    autoFocus
                  />
                  {equipmentSearchQuery.length > 0 && (
                    <Pressable onPress={() => setEquipmentSearchQuery('')}>
                      <X size={18} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>

                {/* Results Count */}
                <View style={createStyles.equipmentResultsBar}>
                  <Text style={[createStyles.equipmentResultsText, { color: colors.textSecondary }]}>
                    {filteredEquipment.length} equipment found
                  </Text>
                </View>

                {/* Equipment List */}
                <ScrollView style={createStyles.equipmentList} showsVerticalScrollIndicator={false}>
                  {filteredEquipment.map((eq, index) => {
                    const criticalityColor = getEquipmentCriticalityColor(eq.criticality);
                    const statusColors = getEquipmentStatusColor(eq.status);
                    const isSelected = formData.equipmentId === eq.id;

                    return (
                      <Pressable
                        key={eq.id}
                        style={[
                          createStyles.equipmentItem,
                          { 
                            backgroundColor: isSelected ? '#3B82F610' : colors.background,
                            borderColor: isSelected ? '#3B82F6' : colors.border,
                          },
                          index === filteredEquipment.length - 1 && { marginBottom: 20 }
                        ]}
                        onPress={() => handleSelectEquipment(eq)}
                      >
                        <View style={createStyles.equipmentItemLeft}>
                          <View style={[
                            createStyles.equipmentItemIcon,
                            { backgroundColor: isSelected ? '#3B82F620' : '#F3F4F6' }
                          ]}>
                            <Settings2 size={20} color={isSelected ? '#3B82F6' : '#6B7280'} />
                          </View>
                          <View style={createStyles.equipmentItemInfo}>
                            <Text style={[createStyles.equipmentItemName, { color: colors.text }]} numberOfLines={1}>
                              {eq.name}
                            </Text>
                            <View style={createStyles.equipmentItemTags}>
                              <View style={createStyles.equipmentTag}>
                                <Hash size={10} color={colors.textSecondary} />
                                <Text style={[createStyles.equipmentTagText, { color: colors.textSecondary }]}>{eq.tag}</Text>
                              </View>
                              <View style={createStyles.equipmentTag}>
                                <MapPin size={10} color={colors.textSecondary} />
                                <Text style={[createStyles.equipmentTagText, { color: colors.textSecondary }]}>{eq.location}</Text>
                              </View>
                            </View>
                            <View style={createStyles.equipmentItemBadges}>
                              <View style={[createStyles.criticalityBadge, { backgroundColor: criticalityColor + '20' }]}>
                                <View style={[createStyles.criticalityDot, { backgroundColor: criticalityColor }]} />
                                <Text style={[createStyles.criticalityText, { color: criticalityColor }]}>
                                  {eq.criticality.charAt(0).toUpperCase() + eq.criticality.slice(1)}
                                </Text>
                              </View>
                              <View style={[createStyles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                <Text style={[createStyles.statusBadgeText, { color: statusColors.text }]}>
                                  {eq.status.charAt(0).toUpperCase() + eq.status.slice(1)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        {isSelected && (
                          <View style={createStyles.selectedCheck}>
                            <CheckCircle size={20} color="#3B82F6" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}

                  {filteredEquipment.length === 0 && (
                    <View style={createStyles.noEquipmentFound}>
                      <Cpu size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                      <Text style={[createStyles.noEquipmentTitle, { color: colors.text }]}>No Equipment Found</Text>
                      <Text style={[createStyles.noEquipmentSubtitle, { color: colors.textSecondary }]}>
                        Try adjusting your search terms
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Failure Code Selector Modal */}
          <Modal
            visible={showFailureCodeSelector}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowFailureCodeSelector(false)}
          >
            <View style={createStyles.failureCodeModalOverlay}>
              <View style={[createStyles.failureCodeModalContainer, { backgroundColor: colors.surface }]}>
                {/* Modal Header */}
                <View style={[createStyles.failureCodeModalHeader, { borderBottomColor: colors.border }]}>
                  <View style={createStyles.failureCodeModalHeaderLeft}>
                    <View style={[createStyles.failureCodeModalIcon, { backgroundColor: '#EF444420' }]}>
                      <AlertOctagon size={20} color="#EF4444" />
                    </View>
                    <Text style={[createStyles.failureCodeModalTitle, { color: colors.text }]}>Select Failure Code</Text>
                  </View>
                  <Pressable 
                    onPress={() => setShowFailureCodeSelector(false)}
                    style={createStyles.failureCodeModalCloseBtn}
                    hitSlop={8}
                  >
                    <X size={24} color={colors.text} />
                  </Pressable>
                </View>

                {/* Modal Body with Search & Filters */}
                <View style={createStyles.failureCodeModalBody}>
                  {/* Search Input */}
                  <View style={[createStyles.failureCodeSearchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Search size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[createStyles.failureCodeSearchInput, { color: colors.text }]}
                      placeholder="Search failure codes by name or code..."
                      placeholderTextColor={colors.textSecondary}
                      value={failureCodeSearchQuery}
                      onChangeText={setFailureCodeSearchQuery}
                    />
                    {failureCodeSearchQuery.length > 0 && (
                      <Pressable onPress={() => setFailureCodeSearchQuery('')} hitSlop={8}>
                        <X size={18} color={colors.textSecondary} />
                      </Pressable>
                    )}
                  </View>

                  {/* Category Filter */}
                  <View style={createStyles.failureCodeFilterSection}>
                    <Text style={[createStyles.failureCodeFilterLabel, { color: colors.textSecondary }]}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={createStyles.failureCodeFilterScroll}>
                      <View style={createStyles.failureCodeFilterRow}>
                        <Pressable
                          style={[
                            createStyles.failureCodeFilterChip,
                            {
                              backgroundColor: failureCodeCategoryFilter === 'all' ? '#3B82F6' : colors.background,
                              borderColor: failureCodeCategoryFilter === 'all' ? '#3B82F6' : colors.border,
                            }
                          ]}
                          onPress={() => setFailureCodeCategoryFilter('all')}
                        >
                          <Text style={[
                            createStyles.failureCodeFilterChipText,
                            { color: failureCodeCategoryFilter === 'all' ? '#FFFFFF' : colors.text }
                          ]}>All Categories</Text>
                        </Pressable>
                        {FAILURE_CODE_CATEGORIES.map(cat => (
                          <Pressable
                            key={cat.id}
                            style={[
                              createStyles.failureCodeFilterChip,
                              {
                                backgroundColor: failureCodeCategoryFilter === cat.id ? cat.color : colors.background,
                                borderColor: failureCodeCategoryFilter === cat.id ? cat.color : colors.border,
                              }
                            ]}
                            onPress={() => setFailureCodeCategoryFilter(cat.id)}
                          >
                            {failureCodeCategoryFilter !== cat.id && (
                              <View style={[createStyles.failureCodeCategoryDot, { backgroundColor: cat.color }]} />
                            )}
                            <Text style={[
                              createStyles.failureCodeFilterChipText,
                              { color: failureCodeCategoryFilter === cat.id ? '#FFFFFF' : colors.text }
                            ]}>{cat.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Equipment Type Filter (shows relevant failure types) */}
                  <View style={createStyles.failureCodeFilterSection}>
                    <View style={createStyles.failureCodeFilterLabelRow}>
                      <Cpu size={14} color={colors.textSecondary} />
                      <Text style={[createStyles.failureCodeFilterLabel, { color: colors.textSecondary }]}>Equipment Type</Text>
                      {selectedEquipmentType && (
                        <View style={[createStyles.selectedTypeHint, { backgroundColor: '#3B82F610' }]}>
                          <Text style={createStyles.selectedTypeHintText}>Selected: {selectedEquipmentType}</Text>
                        </View>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={createStyles.failureCodeFilterScroll}>
                      <View style={createStyles.failureCodeFilterRow}>
                        <Pressable
                          style={[
                            createStyles.failureCodeFilterChip,
                            {
                              backgroundColor: failureCodeEquipmentTypeFilter === 'all' ? '#3B82F6' : colors.background,
                              borderColor: failureCodeEquipmentTypeFilter === 'all' ? '#3B82F6' : colors.border,
                            }
                          ]}
                          onPress={() => setFailureCodeEquipmentTypeFilter('all')}
                        >
                          <Text style={[
                            createStyles.failureCodeFilterChipText,
                            { color: failureCodeEquipmentTypeFilter === 'all' ? '#FFFFFF' : colors.text }
                          ]}>All Types</Text>
                        </Pressable>
                        {equipmentTypes.map(type => (
                          <Pressable
                            key={type}
                            style={[
                              createStyles.failureCodeFilterChip,
                              {
                                backgroundColor: failureCodeEquipmentTypeFilter === type ? '#3B82F6' : colors.background,
                                borderColor: failureCodeEquipmentTypeFilter === type ? '#3B82F6' : colors.border,
                              },
                              selectedEquipmentType === type && failureCodeEquipmentTypeFilter !== type && {
                                borderColor: '#3B82F680',
                                borderWidth: 2,
                              }
                            ]}
                            onPress={() => setFailureCodeEquipmentTypeFilter(type)}
                          >
                            <Text style={[
                              createStyles.failureCodeFilterChipText,
                              { color: failureCodeEquipmentTypeFilter === type ? '#FFFFFF' : colors.text }
                            ]}>{type}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Clear Filters Button */}
                  {hasActiveFailureCodeFilters && (
                    <Pressable
                      style={createStyles.clearFailureCodeFiltersBtn}
                      onPress={clearFailureCodeFilters}
                    >
                      <X size={14} color="#EF4444" />
                      <Text style={createStyles.clearFailureCodeFiltersBtnText}>Clear All Filters</Text>
                    </Pressable>
                  )}

                  {/* Results Count */}
                  <View style={[createStyles.failureCodeResultsBar, { borderTopColor: colors.border }]}>
                    <Text style={[createStyles.failureCodeResultsText, { color: colors.textSecondary }]}>
                      Showing <Text style={{ color: colors.text, fontWeight: '600' as const }}>{filteredFailureCodes.length}</Text> of {FAILURE_CODES.filter(fc => fc.isActive).length} failure codes
                    </Text>
                  </View>

                  {/* Failure Codes List */}
                  <ScrollView style={createStyles.failureCodeList} showsVerticalScrollIndicator={false}>
                    {filteredFailureCodes.length === 0 ? (
                      <View style={createStyles.failureCodeEmptyState}>
                        <AlertOctagon size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                        <Text style={[createStyles.failureCodeEmptyTitle, { color: colors.text }]}>
                          No Failure Codes Found
                        </Text>
                        <Text style={[createStyles.failureCodeEmptySubtitle, { color: colors.textSecondary }]}>
                          Try adjusting your filters
                        </Text>
                        {hasActiveFailureCodeFilters && (
                          <Pressable
                            style={createStyles.failureCodeEmptyClearBtn}
                            onPress={clearFailureCodeFilters}
                          >
                            <Text style={createStyles.failureCodeEmptyClearBtnText}>Clear Filters</Text>
                          </Pressable>
                        )}
                      </View>
                    ) : (
                      groupedFailureCodes.map((group, groupIndex) => (
                        <View key={group.category.id} style={groupIndex === groupedFailureCodes.length - 1 ? { marginBottom: 20 } : undefined}>
                          {/* Category Section Header */}
                          <View style={[
                            createStyles.categorySectionHeader,
                            { borderBottomColor: colors.border },
                            groupIndex > 0 && { marginTop: 16 }
                          ]}>
                            <View style={[
                              createStyles.categorySectionIconBox,
                              { backgroundColor: group.category.color + '15' }
                            ]}>
                              <AlertOctagon size={16} color={group.category.color} />
                            </View>
                            <View style={createStyles.categorySectionInfo}>
                              <Text style={[createStyles.categorySectionTitle, { color: colors.text }]}>
                                {group.category.name}
                              </Text>
                              <Text style={[createStyles.categorySectionSubtitle, { color: colors.textSecondary }]}>
                                {group.codes.length} failure code{group.codes.length !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <View style={[
                              createStyles.categorySectionBadge,
                              { backgroundColor: group.category.color + '20' }
                            ]}>
                              <Text style={[createStyles.categorySectionBadgeText, { color: group.category.color }]}>
                                {group.codes.length}
                              </Text>
                            </View>
                          </View>

                          {/* Failure Codes in Category */}
                          {group.codes.map((fc, index) => {
                            const categoryColor = getFailureCodeCategoryColor(fc.category);
                            const categoryInfo = FAILURE_CODE_CATEGORIES.find(c => c.id === fc.category);
                            const isSelected = formData.failureCodeId === fc.id;
                            const isExpanded = expandedFailureCodeId === fc.id;

                            return (
                              <View
                                key={fc.id}
                                style={[
                                  createStyles.failureCodeItem,
                                  {
                                    backgroundColor: isSelected ? '#3B82F610' : colors.background,
                                    borderColor: isSelected ? '#3B82F6' : colors.border,
                                  },
                                ]}
                              >
                            <Pressable
                              style={createStyles.failureCodeItemMain}
                              onPress={() => handleSelectFailureCode(fc)}
                            >
                              <View style={createStyles.failureCodeItemLeft}>
                                <View style={[
                                  createStyles.failureCodeItemIcon,
                                  { backgroundColor: categoryColor + '20' }
                                ]}>
                                  <AlertOctagon size={18} color={categoryColor} />
                                </View>
                                <View style={createStyles.failureCodeItemInfo}>
                                  <View style={createStyles.failureCodeItemHeader}>
                                    <Text style={[createStyles.failureCodeItemCode, { color: categoryColor }]}>
                                      {fc.code}
                                    </Text>
                                    <View style={[
                                      createStyles.failureCodeSeverityBadge,
                                      { backgroundColor: getSeverityColor(fc.severity) + '20' }
                                    ]}>
                                      <Text style={[
                                        createStyles.failureCodeSeverityText,
                                        { color: getSeverityColor(fc.severity) }
                                      ]}>
                                        {fc.severity.charAt(0).toUpperCase() + fc.severity.slice(1)}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={[createStyles.failureCodeItemName, { color: colors.text }]} numberOfLines={1}>
                                    {fc.name}
                                  </Text>
                                  <Text style={[createStyles.failureCodeItemDesc, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                                    {fc.description}
                                  </Text>
                                  <View style={createStyles.failureCodeItemMeta}>
                                    <View style={[createStyles.failureCodeCategoryBadge, { backgroundColor: categoryColor + '15' }]}>
                                      <Text style={[createStyles.failureCodeCategoryBadgeText, { color: categoryColor }]}>
                                        {categoryInfo?.name || fc.category}
                                      </Text>
                                    </View>
                                    {fc.averageRepairTime && (
                                      <View style={createStyles.failureCodeMttrBadge}>
                                        <Clock size={10} color={colors.textSecondary} />
                                        <Text style={[createStyles.failureCodeMttrText, { color: colors.textSecondary }]}>
                                          ~{fc.averageRepairTime}h MTTR
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                              {isSelected && (
                                <View style={createStyles.failureCodeSelectedCheck}>
                                  <CheckCircle size={20} color="#3B82F6" />
                                </View>
                              )}
                            </Pressable>

                            {/* Expand/Collapse Hierarchy Toggle */}
                            <Pressable
                              style={[createStyles.hierarchyToggle, { borderTopColor: colors.border }]}
                              onPress={() => setExpandedFailureCodeId(isExpanded ? null : fc.id)}
                            >
                              <Text style={[createStyles.hierarchyToggleText, { color: colors.textSecondary }]}>
                                {isExpanded ? 'Hide' : 'Show'} Cause & Remedy
                              </Text>
                              <ChevronDown 
                                size={14} 
                                color={colors.textSecondary} 
                                style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                              />
                            </Pressable>

                            {/* Expanded Hierarchy Section */}
                            {isExpanded && (
                              <View style={[createStyles.hierarchySection, { borderTopColor: colors.border }]}>
                                {/* Problem */}
                                <View style={createStyles.hierarchyItem}>
                                  <View style={createStyles.hierarchyLabelRow}>
                                    <View style={[createStyles.hierarchyDot, { backgroundColor: '#EF4444' }]} />
                                    <Text style={[createStyles.hierarchyLabel, { color: '#EF4444' }]}>PROBLEM</Text>
                                  </View>
                                  <View style={[createStyles.hierarchyConnector, { backgroundColor: colors.border }]} />
                                  <View style={[createStyles.hierarchyContent, { backgroundColor: '#EF444408' }]}>
                                    <Text style={[createStyles.hierarchyContentText, { color: colors.text }]}>
                                      {fc.name} - {fc.description}
                                    </Text>
                                  </View>
                                </View>

                                {/* Arrow Down */}
                                <View style={createStyles.hierarchyArrow}>
                                  <View style={[createStyles.hierarchyArrowLine, { backgroundColor: colors.border }]} />
                                  <ChevronDown size={16} color={colors.border} />
                                </View>

                                {/* Causes */}
                                <View style={createStyles.hierarchyItem}>
                                  <View style={createStyles.hierarchyLabelRow}>
                                    <View style={[createStyles.hierarchyDot, { backgroundColor: '#F59E0B' }]} />
                                    <Text style={[createStyles.hierarchyLabel, { color: '#F59E0B' }]}>CAUSES</Text>
                                    <View style={[createStyles.hierarchyCountBadge, { backgroundColor: '#F59E0B20' }]}>
                                      <Text style={[createStyles.hierarchyCountText, { color: '#F59E0B' }]}>
                                        {fc.commonCauses.length}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={[createStyles.hierarchyConnector, { backgroundColor: colors.border }]} />
                                  <View style={[createStyles.hierarchyContent, { backgroundColor: '#F59E0B08' }]}>
                                    {fc.commonCauses.map((cause, idx) => (
                                      <View key={idx} style={createStyles.hierarchyListItem}>
                                        <View style={[createStyles.hierarchyBullet, { backgroundColor: '#F59E0B' }]} />
                                        <Text style={[createStyles.hierarchyListText, { color: colors.text }]}>
                                          {cause}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>

                                {/* Arrow Down */}
                                <View style={createStyles.hierarchyArrow}>
                                  <View style={[createStyles.hierarchyArrowLine, { backgroundColor: colors.border }]} />
                                  <ChevronDown size={16} color={colors.border} />
                                </View>

                                {/* Remedies */}
                                <View style={createStyles.hierarchyItem}>
                                  <View style={createStyles.hierarchyLabelRow}>
                                    <View style={[createStyles.hierarchyDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={[createStyles.hierarchyLabel, { color: '#10B981' }]}>REMEDIES</Text>
                                    <View style={[createStyles.hierarchyCountBadge, { backgroundColor: '#10B98120' }]}>
                                      <Text style={[createStyles.hierarchyCountText, { color: '#10B981' }]}>
                                        {fc.recommendedActions.length}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={[createStyles.hierarchyConnector, { backgroundColor: colors.border }]} />
                                  <View style={[createStyles.hierarchyContent, { backgroundColor: '#10B98108' }]}>
                                    {fc.recommendedActions.map((action: string, idx: number) => (
                                      <View key={idx} style={createStyles.hierarchyListItem}>
                                        <View style={[createStyles.hierarchyBullet, { backgroundColor: '#10B981' }]} />
                                        <Text style={[createStyles.hierarchyListText, { color: colors.text }]}>
                                          {action}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              </View>
                            )}
                              </View>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>

                {/* Modal Footer */}
                <View style={[createStyles.failureCodeModalFooter, { borderTopColor: colors.border }]}>
                  <Pressable 
                    style={[createStyles.failureCodeCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowFailureCodeSelector(false)}
                  >
                    <Text style={[createStyles.failureCodeCancelBtnText, { color: colors.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable 
                    style={[createStyles.failureCodeSkipBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, failureCodeId: '', failureCode: '', failureCodeCategory: '' }));
                      setShowFailureCodeSelector(false);
                    }}
                  >
                    <Text style={[createStyles.failureCodeSkipBtnText, { color: colors.textSecondary }]}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Work Order Detail Sheet Component
interface WorkOrderDetailSheetProps {
  workOrder: CorrectiveWorkOrder;
  onClose: () => void;
  colors: any;
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => { bg: string; text: string };
  getStatusLabel: (status: string) => string;
  onComplete?: (workOrderId: string, notes: string) => void;
}

function WorkOrderDetailSheet({ 
  workOrder, 
  onClose, 
  colors, 
  getPriorityColor, 
  getStatusColor, 
  getStatusLabel,
  onComplete,
}: WorkOrderDetailSheetProps) {
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveDowntime, setResolveDowntime] = useState(true);
  
  const { data: downtimeRecord } = useWorkOrderDowntimeQuery(workOrder.id);
  const resolveDowntimeMutation = useResolveDowntimeEvent();
  const hasOngoingDowntime = downtimeRecord !== null && downtimeRecord?.production_stopped === true && downtimeRecord?.status === 'ongoing';
  const hasLinkedDowntime = downtimeRecord !== null;

  const priorityColor = getPriorityColor(workOrder.priority);
  const statusColors = getStatusColor(workOrder.status);
  const totalPartsCost = workOrder.partsUsed?.reduce((sum, p) => sum + p.totalCost, 0) || 0;
  const totalLaborHours = workOrder.laborHours?.reduce((sum, l) => sum + l.hours, 0) || 0;

  const handleCompleteWorkOrder = useCallback(async () => {
    setIsSubmitting(true);
    console.log('[CorrectiveMO] Completing work order:', workOrder.workOrderNumber, 'Notes:', completionNotes);
    
    try {
      if (hasOngoingDowntime && resolveDowntime && downtimeRecord) {
        console.log('[CorrectiveMO] Resolving linked downtime:', downtimeRecord.id);
        await resolveDowntimeMutation.mutateAsync({
          id: downtimeRecord.id,
          resolvedBy: workOrder.assignedTo || 'system',
          resolvedByName: workOrder.assignedTo || 'System',
          notes: `Resolved via work order completion: ${workOrder.workOrderNumber}`,
        });
      }
      
      if (onComplete) {
        onComplete(workOrder.id, completionNotes);
      }
    } catch (error) {
      console.error('[CorrectiveMO] Error completing work order:', error);
    } finally {
      setIsSubmitting(false);
      setShowCompleteModal(false);
      onClose();
    }
  }, [workOrder.id, workOrder.workOrderNumber, workOrder.assignedTo, completionNotes, onClose, onComplete, hasOngoingDowntime, resolveDowntime, downtimeRecord, resolveDowntimeMutation]);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <FileText size={14} color="#F59E0B" />;
      case 'in_progress': return <PlayCircle size={14} color="#3B82F6" />;
      case 'on_hold': return <Clock size={14} color="#6B7280" />;
      case 'completed': return <CheckCircle size={14} color="#10B981" />;
      default: return <Clock size={14} color="#6B7280" />;
    }
  };

  return (
    <View style={[detailStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[detailStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={detailStyles.headerTop}>
          <Pressable onPress={onClose} style={detailStyles.closeButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[detailStyles.headerTitle, { color: colors.text }]}>Work Order Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* WO Number & Badges */}
        <View style={detailStyles.woHeader}>
          <Text style={[detailStyles.woNumber, { color: '#3B82F6' }]}>{workOrder.workOrderNumber}</Text>
          <View style={detailStyles.badgeRow}>
            <View style={[detailStyles.badge, { backgroundColor: priorityColor + '20' }]}>
              <View style={[detailStyles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[detailStyles.badgeText, { color: priorityColor }]}>
                {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
              </Text>
            </View>
            <View style={[detailStyles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[detailStyles.badgeText, { color: statusColors.text }]}>
                {getStatusLabel(workOrder.status)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[detailStyles.woTitle, { color: colors.text }]}>{workOrder.title}</Text>
      </View>

      <ScrollView style={detailStyles.content} showsVerticalScrollIndicator={false}>
        {/* Equipment Info Section */}
        <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={detailStyles.sectionHeader}>
            <Settings2 size={18} color="#3B82F6" />
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Equipment Information</Text>
          </View>
          <View style={detailStyles.infoGrid}>
            <View style={detailStyles.infoRow}>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Equipment</Text>
                <Text style={[detailStyles.infoValue, { color: colors.text }]}>{workOrder.equipment}</Text>
              </View>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Asset ID</Text>
                <Text style={[detailStyles.infoValue, { color: colors.text }]}>{workOrder.equipmentId || 'N/A'}</Text>
              </View>
            </View>
            <View style={detailStyles.infoRow}>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
                <View style={detailStyles.infoWithIcon}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[detailStyles.infoValueText, { color: colors.text }]}>{workOrder.location}</Text>
                </View>
              </View>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Department</Text>
                <View style={detailStyles.infoWithIcon}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={[detailStyles.infoValueText, { color: colors.text }]}>{workOrder.department || 'N/A'}</Text>
                </View>
              </View>
            </View>
            <View style={detailStyles.infoRow}>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                <View style={detailStyles.infoWithIcon}>
                  <UserCircle size={14} color={colors.textSecondary} />
                  <Text style={[detailStyles.infoValueText, { color: colors.text }]}>
                    {workOrder.assignedTo || 'Unassigned'}
                  </Text>
                </View>
              </View>
              <View style={detailStyles.infoItem}>
                <Text style={[detailStyles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
                <View style={detailStyles.infoWithIcon}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[detailStyles.infoValueText, { color: colors.text }]}>
                    {new Date(workOrder.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Problem Description */}
        <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={detailStyles.sectionHeader}>
            <FileWarning size={18} color="#EF4444" />
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Problem Description</Text>
          </View>
          <Text style={[detailStyles.descriptionText, { color: colors.text }]}>
            {workOrder.problemDescription || workOrder.description || 'No description provided.'}
          </Text>
          {workOrder.rootCause && (
            <View style={[detailStyles.rootCauseBox, { backgroundColor: '#FEF3C720', borderColor: '#F59E0B40' }]}>
              <Text style={[detailStyles.rootCauseLabel, { color: '#D97706' }]}>Root Cause</Text>
              <Text style={[detailStyles.rootCauseText, { color: colors.text }]}>{workOrder.rootCause}</Text>
            </View>
          )}
        </View>

        {/* Corrective Action */}
        {workOrder.correctiveAction && (
          <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={detailStyles.sectionHeader}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Corrective Action</Text>
            </View>
            <Text style={[detailStyles.descriptionText, { color: colors.text }]}>
              {workOrder.correctiveAction}
            </Text>
          </View>
        )}

        {/* Linked Downtime Section */}
        {hasLinkedDowntime && downtimeRecord && (
          <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={detailStyles.sectionHeader}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Linked Downtime</Text>
              <View style={[
                detailStyles.downtimeStatusBadge,
                { backgroundColor: downtimeRecord.status === 'ongoing' ? '#FEE2E2' : '#D1FAE5' }
              ]}>
                <Text style={[
                  detailStyles.downtimeStatusText,
                  { color: downtimeRecord.status === 'ongoing' ? '#DC2626' : '#059669' }
                ]}>
                  {downtimeRecord.status === 'ongoing' ? 'Ongoing' : 'Resolved'}
                </Text>
              </View>
            </View>
            <View style={detailStyles.downtimeInfo}>
              <View style={detailStyles.downtimeRow}>
                <Text style={[detailStyles.downtimeLabel, { color: colors.textSecondary }]}>Reason</Text>
                <View style={[detailStyles.downtimeReasonBadge, { backgroundColor: getReasonInfo(downtimeRecord.reason).color + '20' }]}>
                  <Text style={[detailStyles.downtimeReasonText, { color: getReasonInfo(downtimeRecord.reason).color }]}>
                    {getReasonInfo(downtimeRecord.reason).label}
                  </Text>
                </View>
              </View>
              <View style={detailStyles.downtimeRow}>
                <Text style={[detailStyles.downtimeLabel, { color: colors.textSecondary }]}>Started</Text>
                <Text style={[detailStyles.downtimeValue, { color: colors.text }]}>
                  {new Date(downtimeRecord.start_time).toLocaleString()}
                </Text>
              </View>
              {downtimeRecord.status === 'completed' && downtimeRecord.end_time && (
                <View style={detailStyles.downtimeRow}>
                  <Text style={[detailStyles.downtimeLabel, { color: colors.textSecondary }]}>Ended</Text>
                  <Text style={[detailStyles.downtimeValue, { color: colors.text }]}>
                    {new Date(downtimeRecord.end_time).toLocaleString()}
                  </Text>
                </View>
              )}
              {downtimeRecord.duration_minutes && (
                <View style={detailStyles.downtimeRow}>
                  <Text style={[detailStyles.downtimeLabel, { color: colors.textSecondary }]}>Duration</Text>
                  <Text style={[detailStyles.downtimeValue, { color: '#EF4444', fontWeight: '600' as const }]}>
                    {formatDurationMinutes(downtimeRecord.duration_minutes)}
                  </Text>
                </View>
              )}
              {downtimeRecord.production_stopped && (
                <View style={[detailStyles.productionStoppedBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <Text style={detailStyles.productionStoppedText}>Production was stopped</Text>
                </View>
              )}
              {downtimeRecord.notes && (
                <View style={[detailStyles.downtimeNotes, { backgroundColor: colors.background }]}>
                  <Text style={[detailStyles.downtimeNotesText, { color: colors.textSecondary }]}>
                    {downtimeRecord.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Parts Used */}
        <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={detailStyles.sectionHeader}>
            <Package size={18} color="#8B5CF6" />
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Parts Used</Text>
            {(workOrder.partsUsed?.length || 0) > 0 && (
              <View style={[detailStyles.countBadge, { backgroundColor: '#8B5CF620' }]}>
                <Text style={[detailStyles.countText, { color: '#8B5CF6' }]}>{workOrder.partsUsed?.length}</Text>
              </View>
            )}
          </View>
          {!workOrder.partsUsed || workOrder.partsUsed.length === 0 ? (
            <View style={detailStyles.emptyState}>
              <Package size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[detailStyles.emptyText, { color: colors.textSecondary }]}>No parts recorded</Text>
            </View>
          ) : (
            <>
              <View style={detailStyles.partsTable}>
                <View style={[detailStyles.partsHeaderRow, { borderBottomColor: colors.border }]}>
                  <Text style={[detailStyles.partsHeaderCell, detailStyles.partNumberCol, { color: colors.textSecondary }]}>Part #</Text>
                  <Text style={[detailStyles.partsHeaderCell, detailStyles.partNameCol, { color: colors.textSecondary }]}>Description</Text>
                  <Text style={[detailStyles.partsHeaderCell, detailStyles.partQtyCol, { color: colors.textSecondary }]}>Qty</Text>
                  <Text style={[detailStyles.partsHeaderCell, detailStyles.partCostCol, { color: colors.textSecondary }]}>Cost</Text>
                </View>
                {workOrder.partsUsed.map((part, idx) => (
                  <View 
                    key={part.id} 
                    style={[
                      detailStyles.partsRow,
                      idx < workOrder.partsUsed!.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + '40' }
                    ]}
                  >
                    <Text style={[detailStyles.partsCell, detailStyles.partNumberCol, { color: '#3B82F6' }]} numberOfLines={1}>
                      {part.partNumber}
                    </Text>
                    <Text style={[detailStyles.partsCell, detailStyles.partNameCol, { color: colors.text }]} numberOfLines={2}>
                      {part.partName}
                    </Text>
                    <Text style={[detailStyles.partsCell, detailStyles.partQtyCol, { color: colors.text }]}>
                      {part.quantity}
                    </Text>
                    <Text style={[detailStyles.partsCell, detailStyles.partCostCol, { color: colors.text }]}>
                      ${part.totalCost.toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[detailStyles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[detailStyles.totalLabel, { color: colors.textSecondary }]}>Total Parts Cost</Text>
                <Text style={[detailStyles.totalValue, { color: colors.text }]}>${totalPartsCost.toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Labor Hours */}
        <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={detailStyles.sectionHeader}>
            <Clock size={18} color="#F59E0B" />
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Labor Hours</Text>
            <View style={[detailStyles.totalBadge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[detailStyles.totalBadgeText, { color: '#F59E0B' }]}>{totalLaborHours.toFixed(1)} hrs</Text>
            </View>
          </View>
          {!workOrder.laborHours || workOrder.laborHours.length === 0 ? (
            <View style={detailStyles.emptyState}>
              <Clock size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[detailStyles.emptyText, { color: colors.textSecondary }]}>No labor hours recorded</Text>
            </View>
          ) : (
            <View style={detailStyles.laborList}>
              {workOrder.laborHours.map((entry, idx) => (
                <View 
                  key={entry.id} 
                  style={[
                    detailStyles.laborCard,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    idx < workOrder.laborHours!.length - 1 && { marginBottom: 10 }
                  ]}
                >
                  <View style={detailStyles.laborHeader}>
                    <View style={detailStyles.laborTechInfo}>
                      <View style={[detailStyles.laborAvatar, { backgroundColor: '#3B82F620' }]}>
                        <UserCircle size={16} color="#3B82F6" />
                      </View>
                      <Text style={[detailStyles.laborTechName, { color: colors.text }]}>{entry.technician}</Text>
                    </View>
                    <View style={[detailStyles.laborHoursBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={detailStyles.laborHoursText}>{entry.hours} hrs</Text>
                    </View>
                  </View>
                  <View style={detailStyles.laborMeta}>
                    <View style={detailStyles.laborMetaItem}>
                      <Calendar size={12} color={colors.textSecondary} />
                      <Text style={[detailStyles.laborMetaText, { color: colors.textSecondary }]}>
                        {formatDate(entry.date)}
                      </Text>
                    </View>
                  </View>
                  {entry.notes && (
                    <View style={[detailStyles.laborNotes, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[detailStyles.laborNotesText, { color: colors.textSecondary }]}>
                        {entry.notes}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={[detailStyles.laborSummary, { borderTopColor: colors.border }]}>
                <View style={detailStyles.laborSummaryRow}>
                  <Text style={[detailStyles.laborSummaryLabel, { color: colors.textSecondary }]}>Total Entries</Text>
                  <Text style={[detailStyles.laborSummaryValue, { color: colors.text }]}>{workOrder.laborHours.length}</Text>
                </View>
                <View style={detailStyles.laborSummaryRow}>
                  <Text style={[detailStyles.laborSummaryLabel, { color: colors.textSecondary }]}>Total Hours</Text>
                  <Text style={[detailStyles.laborSummaryValueBold, { color: '#F59E0B' }]}>{totalLaborHours.toFixed(1)} hrs</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Status History Timeline */}
        <View style={[detailStyles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={detailStyles.sectionHeader}>
            <Layers size={18} color="#06B6D4" />
            <Text style={[detailStyles.sectionTitle, { color: colors.text }]}>Status History</Text>
            {workOrder.statusHistory && workOrder.statusHistory.length > 0 && (
              <View style={[detailStyles.countBadge, { backgroundColor: '#06B6D420' }]}>
                <Text style={[detailStyles.countText, { color: '#06B6D4' }]}>{workOrder.statusHistory.length}</Text>
              </View>
            )}
          </View>
          {!workOrder.statusHistory || workOrder.statusHistory.length === 0 ? (
            <View style={detailStyles.emptyState}>
              <Layers size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[detailStyles.emptyText, { color: colors.textSecondary }]}>No status history available</Text>
            </View>
          ) : (
            <View style={detailStyles.timeline}>
              {workOrder.statusHistory.map((entry, idx) => {
                const isLast = idx === workOrder.statusHistory!.length - 1;
                const isFirst = idx === 0;
                return (
                  <View key={entry.id} style={detailStyles.timelineItem}>
                    {/* Timeline Line */}
                    <View style={detailStyles.timelineLineContainer}>
                      {!isFirst && (
                        <View style={[detailStyles.timelineLineTop, { backgroundColor: colors.border }]} />
                      )}
                      <View style={[
                        detailStyles.timelineDot,
                        { 
                          backgroundColor: isLast ? '#10B981' : colors.background,
                          borderColor: isLast ? '#10B981' : colors.border,
                        }
                      ]}>
                        {getStatusIcon(entry.status)}
                      </View>
                      {!isLast && (
                        <View style={[detailStyles.timelineLineBottom, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    
                    {/* Timeline Content */}
                    <View style={[
                      detailStyles.timelineContent,
                      { backgroundColor: isLast ? '#10B98108' : 'transparent' },
                      isLast && { borderColor: '#10B98130', borderWidth: 1 }
                    ]}>
                      <View style={detailStyles.timelineHeader}>
                        <Text style={[detailStyles.timelineStatus, { color: colors.text }]}>
                          {entry.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Text>
                        <Text style={[detailStyles.timelineDate, { color: colors.textSecondary }]}>
                          {formatDateTime(entry.changedAt)}
                        </Text>
                      </View>
                      <View style={detailStyles.timelineMetaRow}>
                        <UserCircle size={12} color={colors.textSecondary} />
                        <Text style={[detailStyles.timelineUser, { color: colors.textSecondary }]}>
                          {entry.changedBy}
                        </Text>
                      </View>
                      {entry.notes && (
                        <Text style={[detailStyles.timelineNotes, { color: colors.textSecondary }]}>
                          {entry.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Action Button */}
        {workOrder.status !== 'completed' && (
          <View style={detailStyles.actionSection}>
            <Pressable 
              style={[detailStyles.completeButton, { backgroundColor: '#10B981' }]}
              onPress={() => setShowCompleteModal(true)}
            >
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={detailStyles.completeButtonText}>Complete Work Order</Text>
            </Pressable>
          </View>
        )}

        {workOrder.status === 'completed' && (
          <View style={[detailStyles.completedBanner, { backgroundColor: '#D1FAE520', borderColor: '#10B98140' }]}>
            <CheckCircle size={20} color="#10B981" />
            <View style={detailStyles.completedTextContainer}>
              <Text style={[detailStyles.completedTitle, { color: '#059669' }]}>Work Order Completed</Text>
              {workOrder.completedAt && (
                <Text style={[detailStyles.completedDate, { color: '#10B981' }]}>
                  Completed on {formatDate(workOrder.completedAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Complete Work Order Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={detailStyles.modalOverlay}>
          <View style={[detailStyles.completeModalContainer, { backgroundColor: colors.surface }]}>
            <View style={[detailStyles.completeModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[detailStyles.completeModalTitle, { color: colors.text }]}>Complete Work Order</Text>
              <Pressable onPress={() => setShowCompleteModal(false)} style={detailStyles.modalCloseBtn}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={detailStyles.completeModalContent}>
              <View style={[detailStyles.woSummaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[detailStyles.woSummaryNumber, { color: '#3B82F6' }]}>{workOrder.workOrderNumber}</Text>
                <Text style={[detailStyles.woSummaryTitle, { color: colors.text }]} numberOfLines={2}>
                  {workOrder.title}
                </Text>
                <View style={detailStyles.woSummaryMeta}>
                  <View style={detailStyles.woSummaryMetaItem}>
                    <Settings2 size={12} color={colors.textSecondary} />
                    <Text style={[detailStyles.woSummaryMetaText, { color: colors.textSecondary }]}>
                      {workOrder.equipment}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={detailStyles.completionForm}>
                <Text style={[detailStyles.formLabel, { color: colors.text }]}>Completion Notes</Text>
                <Text style={[detailStyles.formHint, { color: colors.textSecondary }]}>
                  Add any final notes, observations, or follow-up recommendations
                </Text>
                <TextInput
                  style={[
                    detailStyles.notesInput,
                    { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text,
                    }
                  ]}
                  placeholder="Enter completion notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                />
              </View>

              {hasOngoingDowntime && downtimeRecord && (
                <View style={[detailStyles.downtimeResolveCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <View style={detailStyles.downtimeResolveHeader}>
                    <AlertTriangle size={18} color="#DC2626" />
                    <View style={detailStyles.downtimeResolveHeaderText}>
                      <Text style={[detailStyles.downtimeResolveTitle, { color: '#991B1B' }]}>Ongoing Downtime Detected</Text>
                      <Text style={[detailStyles.downtimeResolveSubtitle, { color: '#DC2626' }]}>
                        {getReasonInfo(downtimeRecord.reason).label} • Started {new Date(downtimeRecord.start_time).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={detailStyles.resolveToggle}
                    onPress={() => setResolveDowntime(!resolveDowntime)}
                  >
                    <View style={[
                      detailStyles.resolveCheckbox,
                      resolveDowntime && { backgroundColor: '#10B981', borderColor: '#10B981' },
                      !resolveDowntime && { borderColor: colors.border }
                    ]}>
                      {resolveDowntime && <CheckCircle size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[detailStyles.resolveToggleText, { color: colors.text }]}>
                      Resolve downtime and resume production
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={detailStyles.completionSummary}>
                <View style={[detailStyles.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[detailStyles.summaryLabel, { color: colors.textSecondary }]}>Total Parts Cost</Text>
                  <Text style={[detailStyles.summaryValue, { color: colors.text }]}>
                    ${totalPartsCost.toFixed(2)}
                  </Text>
                </View>
                <View style={[detailStyles.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[detailStyles.summaryLabel, { color: colors.textSecondary }]}>Total Labor Hours</Text>
                  <Text style={[detailStyles.summaryValue, { color: colors.text }]}>
                    {totalLaborHours.toFixed(1)} hrs
                  </Text>
                </View>
              </View>
            </View>

            <View style={[detailStyles.completeModalFooter, { borderTopColor: colors.border }]}>
              <Pressable 
                style={[detailStyles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={[detailStyles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[
                  detailStyles.confirmCompleteBtn,
                  isSubmitting && { opacity: 0.7 }
                ]}
                onPress={handleCompleteWorkOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Text style={detailStyles.confirmBtnText}>Completing...</Text>
                ) : (
                  <>
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={detailStyles.confirmBtnText}>Complete Work Order</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  woNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  woTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  rootCauseBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  rootCauseLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rootCauseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  partsTable: {
    marginTop: 4,
  },
  partsHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  partsHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  partsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
  },
  partsCell: {
    fontSize: 13,
  },
  partNumberCol: {
    width: 90,
  },
  partNameCol: {
    flex: 1,
    paddingRight: 8,
  },
  partQtyCol: {
    width: 40,
    textAlign: 'center',
  },
  partCostCol: {
    width: 60,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  placeholder: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  // Labor Hours Styles
  laborList: {
    gap: 0,
  },
  laborCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  laborHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  laborTechInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laborAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laborTechName: {
    fontSize: 14,
    fontWeight: '600',
  },
  laborHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  laborHoursText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  laborMeta: {
    marginBottom: 8,
  },
  laborMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  laborMetaText: {
    fontSize: 12,
  },
  laborNotes: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  laborNotesText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  laborSummary: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  laborSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  laborSummaryLabel: {
    fontSize: 13,
  },
  laborSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  laborSummaryValueBold: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Timeline Styles
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 70,
  },
  timelineLineContainer: {
    width: 36,
    alignItems: 'center',
  },
  timelineLineTop: {
    width: 2,
    height: 12,
  },
  timelineLineBottom: {
    width: 2,
    flex: 1,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 11,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timelineUser: {
    fontSize: 12,
  },
  timelineNotes: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionSection: {
    marginTop: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 13,
    marginTop: 2,
  },
  downtimeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  downtimeStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downtimeInfo: {
    gap: 10,
  },
  downtimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downtimeLabel: {
    fontSize: 13,
  },
  downtimeValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  downtimeReasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  downtimeReasonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productionStoppedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  productionStoppedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  downtimeNotes: {
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  downtimeNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  downtimeResolveCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  downtimeResolveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  downtimeResolveHeaderText: {
    flex: 1,
  },
  downtimeResolveTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  downtimeResolveSubtitle: {
    fontSize: 12,
  },
  resolveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resolveCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveToggleText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // Complete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  completeModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  completeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  completeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseBtn: {
    padding: 4,
  },
  completeModalContent: {
    padding: 16,
  },
  woSummaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  woSummaryNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  woSummaryTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  woSummaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  woSummaryMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  woSummaryMetaText: {
    fontSize: 12,
  },
  completionForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
  },
  completionSummary: {
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  completeModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmCompleteBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  // List Section Styles
  listSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listHeader: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  listHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  woNumberCell: {
    width: 80,
  },
  equipmentCell: {
    flex: 1,
  },
  priorityCell: {
    width: 70,
    justifyContent: 'center',
  },
  statusCell: {
    width: 80,
    justifyContent: 'center',
  },
  dateCell: {
    width: 50,
    justifyContent: 'flex-end',
  },
  listContent: {
    padding: 12,
  },
  workOrderCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  lastCard: {
    marginBottom: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  woNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  overdueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  priorityDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  woTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
  },
  overdueDate: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    backgroundColor: '#EFF6FF',
  },
  editBtn: {
    backgroundColor: '#FEF3C7',
  },
  completeBtn: {
    backgroundColor: '#D1FAE5',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Filter Section Styles
  filterSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterPanel: {
    marginTop: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipsScroll: {
    flexGrow: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
    marginTop: 4,
  },
  clearAllText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  resultsText: {
    fontSize: 13,
  },
  clearInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearInlineText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
});

const createStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveHeaderBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  selectedEquipment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedEquipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  equipmentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEquipmentText: {
    flex: 1,
  },
  selectedEquipmentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedEquipmentMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTagText: {
    fontSize: 11,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  equipmentSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 14,
  },
  selectorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorContent: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorSubtitle: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  formTextarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  initialNotesInput: {
    minHeight: 80,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  technicianOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  technicianOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  technicianOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  equipmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  equipmentModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  equipmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  equipmentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  equipmentSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  equipmentSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  equipmentResultsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  equipmentResultsText: {
    fontSize: 12,
  },
  equipmentList: {
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  equipmentItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  equipmentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentItemInfo: {
    flex: 1,
  },
  equipmentItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  equipmentItemTags: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  equipmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  equipmentTagText: {
    fontSize: 11,
  },
  equipmentItemBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  criticalityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  criticalityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  selectedCheck: {
    marginLeft: 8,
  },
  noEquipmentFound: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noEquipmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noEquipmentSubtitle: {
    fontSize: 13,
  },
  optionalBadge: {
    backgroundColor: '#6B728020',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  selectedFailureCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectedFailureCodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  failureCodeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFailureCodeText: {
    flex: 1,
  },
  selectedFailureCodeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  failureCodeMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  failureCodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  failureCodeSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 14,
  },
  failureCodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  failureCodeModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 400,
  },
  failureCodeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  failureCodeModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  failureCodeModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureCodeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  failureCodeModalCloseBtn: {
    padding: 4,
  },
  failureCodeModalBody: {
    flex: 1,
    padding: 16,
  },
  failureCodePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  failureCodePlaceholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  failureCodePlaceholderSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  failureCodeModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  failureCodeCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  failureCodeCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  failureCodeSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  failureCodeSkipBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  failureCodeSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  failureCodeSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  failureCodeFilterSection: {
    marginBottom: 12,
  },
  failureCodeFilterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  failureCodeFilterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  failureCodeFilterScroll: {
    flexGrow: 0,
  },
  failureCodeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  failureCodeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  failureCodeFilterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  failureCodeCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedTypeHint: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  selectedTypeHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  clearFailureCodeFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
    marginBottom: 12,
  },
  clearFailureCodeFiltersBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  failureCodeResultsBar: {
    paddingVertical: 10,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  failureCodeResultsText: {
    fontSize: 12,
  },
  failureCodeList: {
    flex: 1,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  categorySectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySectionInfo: {
    flex: 1,
  },
  categorySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  categorySectionSubtitle: {
    fontSize: 11,
  },
  categorySectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categorySectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  failureCodeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  failureCodeItemLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  failureCodeItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureCodeItemInfo: {
    flex: 1,
  },
  failureCodeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  failureCodeItemCode: {
    fontSize: 12,
    fontWeight: '700',
  },
  failureCodeSeverityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  failureCodeSeverityText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  failureCodeItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  failureCodeItemDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  failureCodeItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  failureCodeCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  failureCodeCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  failureCodeMttrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failureCodeMttrText: {
    fontSize: 10,
  },
  failureCodeSelectedCheck: {
    marginLeft: 8,
    marginTop: 10,
  },
  failureCodeEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  failureCodeEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  failureCodeEmptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  failureCodeEmptyClearBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  failureCodeEmptyClearBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  failureCodeItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hierarchyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  hierarchyToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hierarchySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  hierarchyItem: {
    marginBottom: 4,
  },
  hierarchyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  hierarchyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hierarchyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hierarchyCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 4,
  },
  hierarchyCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  hierarchyConnector: {
    width: 2,
    height: 8,
    marginLeft: 3,
    marginBottom: 4,
  },
  hierarchyContent: {
    padding: 10,
    borderRadius: 8,
    marginLeft: 0,
  },
  hierarchyContentText: {
    fontSize: 12,
    lineHeight: 18,
  },
  hierarchyListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  hierarchyBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 5,
  },
  hierarchyListText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  hierarchyArrow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  hierarchyArrowLine: {
    width: 2,
    height: 10,
  },
});
