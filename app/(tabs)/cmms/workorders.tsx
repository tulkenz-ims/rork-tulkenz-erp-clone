import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useWorkOrdersQuery,
  useUpdateWorkOrder as useSupabaseUpdateWorkOrder,
  useStartWorkOrder as useSupabaseStartWorkOrder,
  useCompleteWorkOrder as useSupabaseCompleteWorkOrder,
  usePutWorkOrderOnHold as useSupabasePutOnHold,
  useCancelWorkOrder as useSupabaseCancelWorkOrder,
  useAssignWorkOrder as useSupabaseAssignWorkOrder,
  ExtendedWorkOrder,
  WorkOrderSafety,
  WorkOrderTask,
  WorkOrderAttachment,
} from '@/hooks/useSupabaseWorkOrders';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Wrench,
  Calendar,
  MapPin,
  SlidersHorizontal,
  CalendarRange,
  Building2,
  Users,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Play,
  Pause,
  Ban,
  Layers,
  User,
} from 'lucide-react-native';
import WorkOrderDetail from '@/components/WorkOrderDetail';

const DEBOUNCE_DELAY = 300;
const SKELETON_COUNT = 5;

interface DetailedWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  type: 'corrective' | 'preventive' | 'emergency' | 'request';
  source: 'manual' | 'request' | 'pm_schedule';
  sourceId?: string;
  equipment?: string;
  equipmentId?: string;
  location: string;
  facility_id: string;
  requestedBy?: string;
  requestedAt?: string;
  assigned_to?: string;
  assignedName?: string;
  due_date: string;
  started_at?: string;
  completed_at?: string;
  estimatedHours?: number;
  actualHours?: number;
  safety: WorkOrderSafety;
  tasks: WorkOrderTask[];
  attachments: WorkOrderAttachment[];
  notes: string;
  completionNotes?: string;
  created_at: string;
  updated_at: string;
}

function mapExtendedToDetailed(wo: ExtendedWorkOrder): DetailedWorkOrder {
  return {
    id: wo.id,
    workOrderNumber: wo.work_order_number || `WO-${wo.id.slice(-8).toUpperCase()}`,
    title: wo.title || '',
    description: wo.description || '',
    priority: (wo.priority as DetailedWorkOrder['priority']) || 'medium',
    status: (wo.status as DetailedWorkOrder['status']) || 'open',
    type: (wo.type as DetailedWorkOrder['type']) || 'corrective',
    source: (wo.source as DetailedWorkOrder['source']) || 'manual',
    sourceId: wo.source_id || undefined,
    equipment: wo.equipment || undefined,
    equipmentId: wo.equipment_id || undefined,
    location: wo.location || 'Main Facility',
    facility_id: wo.facility_id || '',
    assigned_to: wo.assigned_to || undefined,
    assignedName: wo.assigned_name || undefined,
    due_date: wo.due_date || new Date().toISOString().split('T')[0],
    started_at: wo.started_at || undefined,
    completed_at: wo.completed_at || undefined,
    estimatedHours: wo.estimated_hours || undefined,
    actualHours: wo.actual_hours || undefined,
    safety: wo.safety || {
      lotoRequired: false,
      lotoSteps: [],
      permits: [],
      permitNumbers: {},
      permitExpiry: {},
      ppeRequired: ['safety-glasses', 'safety-shoes'],
    },
    tasks: wo.tasks || [],
    attachments: wo.attachments || [],
    notes: wo.notes || '',
    completionNotes: wo.completion_notes || undefined,
    created_at: wo.created_at || new Date().toISOString(),
    updated_at: wo.updated_at || new Date().toISOString(),
  };
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type TypeFilter = 'all' | 'corrective' | 'preventive' | 'emergency' | 'request';
type DateFieldFilter = 'due_date' | 'created_at';
type SortField = 'due_date' | 'priority' | 'created_at' | 'status' | 'wo_number';
type SortDirection = 'asc' | 'desc';
type GroupByOption = 'none' | 'status' | 'priority' | 'equipment' | 'technician';

interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'due_date', direction: 'asc', label: 'Due Date (Earliest First)' },
  { field: 'due_date', direction: 'desc', label: 'Due Date (Latest First)' },
  { field: 'priority', direction: 'desc', label: 'Priority (Critical First)' },
  { field: 'priority', direction: 'asc', label: 'Priority (Low First)' },
  { field: 'created_at', direction: 'desc', label: 'Created (Newest First)' },
  { field: 'created_at', direction: 'asc', label: 'Created (Oldest First)' },
  { field: 'status', direction: 'asc', label: 'Status (A-Z)' },
  { field: 'status', direction: 'desc', label: 'Status (Z-A)' },
  { field: 'wo_number', direction: 'asc', label: 'WO Number (Ascending)' },
  { field: 'wo_number', direction: 'desc', label: 'WO Number (Descending)' },
];

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { open: 0, in_progress: 1, on_hold: 2, completed: 3, cancelled: 4 };

const GROUP_BY_OPTIONS: { value: GroupByOption; label: string; icon: React.ElementType }[] = [
  { value: 'none', label: 'No Grouping', icon: Layers },
  { value: 'status', label: 'Group by Status', icon: Clock },
  { value: 'priority', label: 'Group by Priority', icon: AlertTriangle },
  { value: 'equipment', label: 'Group by Equipment', icon: Wrench },
  { value: 'technician', label: 'Group by Technician', icon: User },
];

interface GroupedWorkOrders {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon?: React.ElementType;
  items: DetailedWorkOrder[];
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#3B82F6', icon: Clock, bgColor: 'rgba(59, 130, 246, 0.15)' },
  in_progress: { label: 'In Progress', color: '#F59E0B', icon: Wrench, bgColor: 'rgba(245, 158, 11, 0.15)' },
  completed: { label: 'Completed', color: '#10B981', icon: CheckCircle2, bgColor: 'rgba(16, 185, 129, 0.15)' },
  on_hold: { label: 'On Hold', color: '#8B5CF6', icon: PauseCircle, bgColor: 'rgba(139, 92, 246, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#6B7280', icon: XCircle, bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)' },
  high: { label: 'High', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  low: { label: 'Low', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
};

const TYPE_CONFIG = {
  corrective: { label: 'Corrective', color: '#EF4444' },
  preventive: { label: 'Preventive', color: '#3B82F6' },
  emergency: { label: 'Emergency', color: '#DC2626' },
  request: { label: 'Request', color: '#8B5CF6' },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function WorkOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  // Supabase work orders query
  const { 
    data: supabaseWorkOrders, 
    isLoading: isSupabaseLoading,
    refetch: refetchWorkOrders,
    error: queryError,
  } = useWorkOrdersQuery();
  
  // Supabase mutations
  const updateWorkOrderMutation = useSupabaseUpdateWorkOrder();
  const startWorkOrderMutation = useSupabaseStartWorkOrder();
  const completeWorkOrderMutation = useSupabaseCompleteWorkOrder();
  const putOnHoldMutation = useSupabasePutOnHold();
  const cancelWorkOrderMutation = useSupabaseCancelWorkOrder();
  const assignWorkOrderMutation = useSupabaseAssignWorkOrder();

  // Combined mutation loading state
  const isMutating = useMemo(() => {
    return (
      updateWorkOrderMutation.isPending ||
      startWorkOrderMutation.isPending ||
      completeWorkOrderMutation.isPending ||
      putOnHoldMutation.isPending ||
      cancelWorkOrderMutation.isPending ||
      assignWorkOrderMutation.isPending
    );
  }, [
    updateWorkOrderMutation.isPending,
    startWorkOrderMutation.isPending,
    completeWorkOrderMutation.isPending,
    putOnHoldMutation.isPending,
    cancelWorkOrderMutation.isPending,
    assignWorkOrderMutation.isPending,
  ]);

  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const [dateFieldFilter, setDateFieldFilter] = useState<DateFieldFilter>('due_date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<DetailedWorkOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<DetailedWorkOrder[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;
  
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailWorkOrder, setSelectedDetailWorkOrder] = useState<DetailedWorkOrder | null>(null);
  
  // Map Supabase data to DetailedWorkOrder format
  const mappedWorkOrders = useMemo(() => {
    if (!supabaseWorkOrders) return [];
    console.log('[WorkOrders] Mapping', supabaseWorkOrders.length, 'work orders from Supabase');
    return supabaseWorkOrders.map(mapExtendedToDetailed);
  }, [supabaseWorkOrders]);
  
  const searchInputRef = useRef<TextInput>(null);
  const filterAnimation = useRef(new Animated.Value(0)).current;
  
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  // Sync Supabase data to local workOrders state
  useEffect(() => {
    console.log('[WorkOrders] === Supabase Data Sync ===' );
    console.log('[WorkOrders] Supabase work orders:', mappedWorkOrders.length);
    
    setWorkOrders(mappedWorkOrders);
    
    console.log('[WorkOrders] Sync complete:', mappedWorkOrders.length, 'work orders');
  }, [mappedWorkOrders]);

  // Sync loading state with Supabase query
  useEffect(() => {
    if (!isSupabaseLoading) {
      const loadTimer = setTimeout(() => {
        setIsInitialLoading(false);
        console.log('[WorkOrders] Initial loading complete - Supabase data loaded');
      }, 300);
      return () => clearTimeout(loadTimer);
    }
  }, [isSupabaseLoading]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      console.error('[WorkOrders] Query error:', queryError);
      setContextError(queryError.message || 'Failed to load work orders');
    } else {
      setContextError(null);
    }
  }, [queryError]);

  // Log Supabase connection status
  useEffect(() => {
    console.log('[WorkOrders] === Supabase Status ===' );
    console.log('[WorkOrders] isLoading:', isSupabaseLoading);
    console.log('[WorkOrders] Work orders count:', supabaseWorkOrders?.length || 0);
    console.log('[WorkOrders] Local DetailedWorkOrders:', workOrders.length);
  }, [supabaseWorkOrders, workOrders.length, isSupabaseLoading]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    if (isInitialLoading || refreshing) {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
    }
    return () => pulseAnimation.stop();
  }, [isInitialLoading, refreshing, skeletonOpacity]);

  const uniqueEquipment = useMemo(() => {
    const equipment = new Set<string>();
    workOrders.forEach(wo => {
      if (wo.equipment) equipment.add(wo.equipment);
    });
    console.log('Unique equipment options:', equipment.size);
    return Array.from(equipment).sort();
  }, [workOrders]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    workOrders.forEach(wo => {
      if (wo.location) locations.add(wo.location);
    });
    console.log('Unique location options:', locations.size);
    return Array.from(locations).sort();
  }, [workOrders]);

  const uniqueTechnicians = useMemo(() => {
    const technicians = new Map<string, string>();
    workOrders.forEach(wo => {
      if (wo.assigned_to && wo.assignedName) {
        technicians.set(wo.assigned_to, wo.assignedName);
      }
    });
    console.log('Unique technician options:', technicians.size);
    return Array.from(technicians.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [workOrders]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (startDate || endDate) count++;
    if (equipmentFilter !== 'all') count++;
    if (locationFilter !== 'all') count++;
    if (technicianFilter !== 'all') count++;
    return count;
  }, [statusFilter, priorityFilter, typeFilter, startDate, endDate, equipmentFilter, locationFilter, technicianFilter]);

  useEffect(() => {
    Animated.timing(filterAnimation, {
      toValue: showFilters ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showFilters, filterAnimation]);

  const filteredWorkOrders = useMemo(() => {
    const startTime = Date.now();
    console.log('[WorkOrders] === Real-time Filtering ===' );
    console.log('[WorkOrders] Input: workOrders count:', workOrders.length);
    console.log('[WorkOrders] Active filters:', {
      search: debouncedSearchQuery || '(none)',
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      equipment: equipmentFilter,
      location: locationFilter,
      technician: technicianFilter,
      dateRange: startDate || endDate ? `${startDate || '*'} to ${endDate || '*'}` : '(none)',
    });
    
    const filtered = workOrders.filter((wo) => {
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;
      if (typeFilter !== 'all' && wo.type !== typeFilter) return false;
      
      if (equipmentFilter !== 'all' && wo.equipment !== equipmentFilter) return false;
      if (locationFilter !== 'all' && wo.location !== locationFilter) return false;
      if (technicianFilter !== 'all' && wo.assigned_to !== technicianFilter) return false;
      if (!wo.workOrderNumber) return false;
      
      if (startDate || endDate) {
        const dateValue = dateFieldFilter === 'due_date' ? wo.due_date : wo.created_at;
        if (dateValue) {
          const woDate = new Date(dateValue);
          if (startDate) {
            const start = new Date(startDate);
            if (woDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (woDate > end) return false;
          }
        }
      }

      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        
        // Search across all relevant work order fields
        const searchFields = [
          wo.workOrderNumber,
          wo.title,
          wo.description,
          wo.equipment,
          wo.assignedName,
          wo.assigned_to,
          wo.location,
          wo.facility_id,
          wo.type,
          wo.status,
          wo.priority,
          wo.notes,
          wo.source,
        ];
        
        const matchFound = searchFields.some(field => 
          field?.toLowerCase().includes(query)
        );
        
        if (!matchFound) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'due_date':
          const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'created_at':
          const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = createdA - createdB;
          break;
        case 'priority':
          comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'status':
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'wo_number':
          comparison = (a.workOrderNumber || '').localeCompare(b.workOrderNumber || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const filterTime = Date.now() - startTime;
    console.log('[WorkOrders] Output: filtered count:', sorted.length, `(${filterTime}ms)`);
    console.log('[WorkOrders] Sort:', sortField, sortDirection);
    
    // Log search match details when searching
    if (debouncedSearchQuery.trim()) {
      console.log('[WorkOrders] Search query:', debouncedSearchQuery.trim());
      console.log('[WorkOrders] Search matched:', sorted.length, 'work orders');
    }
    
    // Log breakdown by status for filtered results
    const statusBreakdown = sorted.reduce((acc, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[WorkOrders] Filtered status breakdown:', statusBreakdown);
    
    return sorted;
  }, [debouncedSearchQuery, statusFilter, priorityFilter, typeFilter, equipmentFilter, locationFilter, technicianFilter, startDate, endDate, dateFieldFilter, sortField, sortDirection, workOrders]);

  const listStatistics = useMemo(() => {
    const total = filteredWorkOrders.length;
    const open = filteredWorkOrders.filter(wo => wo.status === 'open').length;
    const inProgress = filteredWorkOrders.filter(wo => wo.status === 'in_progress').length;
    const onHold = filteredWorkOrders.filter(wo => wo.status === 'on_hold').length;
    const completed = filteredWorkOrders.filter(wo => wo.status === 'completed').length;
    const critical = filteredWorkOrders.filter(wo => wo.priority === 'critical').length;
    const high = filteredWorkOrders.filter(wo => wo.priority === 'high').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = filteredWorkOrders.filter(wo => {
      if (wo.status === 'completed' || wo.status === 'cancelled') return false;
      const dueDate = new Date(wo.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    console.log('[WorkOrders] Real-time stats update:', { total, open, inProgress, onHold, completed, overdue, critical, high });
    return { total, open, inProgress, onHold, overdue, critical };
  }, [filteredWorkOrders]);

  const groupedWorkOrders = useMemo((): GroupedWorkOrders[] => {
    if (groupBy === 'none') return [];

    const groups = new Map<string, DetailedWorkOrder[]>();
    
    filteredWorkOrders.forEach(wo => {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = wo.status;
          break;
        case 'priority':
          key = wo.priority;
          break;
        case 'equipment':
          key = wo.equipment || 'Unassigned Equipment';
          break;
        case 'technician':
          key = wo.assignedName || 'Unassigned';
          break;
        default:
          key = 'Other';
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(wo);
    });

    const result: GroupedWorkOrders[] = [];
    
    if (groupBy === 'status') {
      Object.entries(STATUS_ORDER)
        .sort((a, b) => a[1] - b[1])
        .forEach(([status]) => {
          const items = groups.get(status);
          if (items && items.length > 0) {
            const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            result.push({
              key: status,
              label: config.label,
              color: config.color,
              bgColor: config.bgColor,
              icon: config.icon,
              items,
            });
          }
        });
    } else if (groupBy === 'priority') {
      Object.entries(PRIORITY_ORDER)
        .sort((a, b) => a[1] - b[1])
        .forEach(([priority]) => {
          const items = groups.get(priority);
          if (items && items.length > 0) {
            const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
            result.push({
              key: priority,
              label: config.label,
              color: config.color,
              bgColor: config.bgColor,
              icon: AlertTriangle,
              items,
            });
          }
        });
    } else {
      Array.from(groups.entries())
        .sort((a, b) => {
          if (a[0] === 'Unassigned' || a[0] === 'Unassigned Equipment') return 1;
          if (b[0] === 'Unassigned' || b[0] === 'Unassigned Equipment') return -1;
          return a[0].localeCompare(b[0]);
        })
        .forEach(([key, items]) => {
          const isUnassigned = key === 'Unassigned' || key === 'Unassigned Equipment';
          result.push({
            key,
            label: key,
            color: isUnassigned ? '#6B7280' : (groupBy === 'equipment' ? '#3B82F6' : '#10B981'),
            bgColor: isUnassigned ? 'rgba(107, 114, 128, 0.15)' : (groupBy === 'equipment' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
            icon: groupBy === 'equipment' ? Wrench : User,
            items,
          });
        });
    }

    console.log('Grouped work orders by:', groupBy, 'groups:', result.length);
    return result;
  }, [filteredWorkOrders, groupBy]);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  const collapseAllGroups = useCallback(() => {
    const allKeys = groupedWorkOrders.map(g => g.key);
    setCollapsedGroups(new Set(allKeys));
  }, [groupedWorkOrders]);

  const expandAllGroups = useCallback(() => {
    setCollapsedGroups(new Set());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleClearFilters = useCallback(() => {
    console.log('[WorkOrders] Clearing all filters - triggering real-time update');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setEquipmentFilter('all');
    setLocationFilter('all');
    setTechnicianFilter('all');
  }, []);

  const handleSortSelect = useCallback((option: SortOption) => {
    console.log('[WorkOrders] Sort changed - triggering real-time reorder:', option.label);
    setSortField(option.field);
    setSortDirection(option.direction);
    setShowSortModal(false);
  }, []);

  const currentSortLabel = useMemo(() => {
    const option = SORT_OPTIONS.find(o => o.field === sortField && o.direction === sortDirection);
    return option?.label || 'Due Date (Earliest First)';
  }, [sortField, sortDirection]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setContextError(null);
    console.log('[WorkOrders] Refreshing work orders from Supabase...');
    
    try {
      await refetchWorkOrders();
      console.log('[WorkOrders] Refresh complete');
    } catch (error) {
      console.error('[WorkOrders] Refresh error:', error);
      setContextError('Failed to refresh work orders');
    } finally {
      setRefreshing(false);
    }
  }, [refetchWorkOrders]);

  const handleWorkOrderPress = useCallback((wo: DetailedWorkOrder) => {
    console.log('Opening work order:', wo.workOrderNumber);
    setSelectedDetailWorkOrder(wo);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailModal(false);
    setSelectedDetailWorkOrder(null);
    console.log('Closed work order detail');
  }, []);

  const handleUpdateWorkOrder = useCallback((id: string, updates: Partial<DetailedWorkOrder>) => {
    console.log('[WorkOrders] Updating work order:', id, updates);
    
    // Optimistic update for local state
    setWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, ...updates, updated_at: new Date().toISOString().split('T')[0] } : wo
    ));
    if (selectedDetailWorkOrder?.id === id) {
      setSelectedDetailWorkOrder(prev => prev ? { ...prev, ...updates } : null);
    }
    
    // Map to Supabase field names
    const supabaseUpdates: Record<string, unknown> = {};
    
    if (updates.title !== undefined) supabaseUpdates.title = updates.title;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.status !== undefined) supabaseUpdates.status = updates.status;
    if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
    if (updates.assigned_to !== undefined) supabaseUpdates.assigned_to = updates.assigned_to;
    if (updates.assignedName !== undefined) supabaseUpdates.assigned_name = updates.assignedName;
    if (updates.due_date !== undefined) supabaseUpdates.due_date = updates.due_date;
    if (updates.equipment !== undefined) supabaseUpdates.equipment = updates.equipment;
    if (updates.started_at !== undefined) supabaseUpdates.started_at = updates.started_at;
    if (updates.completed_at !== undefined) supabaseUpdates.completed_at = updates.completed_at;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
    if (updates.tasks !== undefined) supabaseUpdates.tasks = updates.tasks;
    if (updates.safety !== undefined) supabaseUpdates.safety = updates.safety;
    if (updates.attachments !== undefined) supabaseUpdates.attachments = updates.attachments;
    
    // Persist to Supabase
    if (Object.keys(supabaseUpdates).length > 0) {
      updateWorkOrderMutation.mutate(
        { id, updates: supabaseUpdates as Partial<ExtendedWorkOrder> },
        {
          onSuccess: () => {
            console.log('[WorkOrders] Successfully persisted to Supabase:', id);
          },
          onError: (error) => {
            console.error('[WorkOrders] Failed to persist to Supabase:', error);
            // Revert optimistic update on error
            refetchWorkOrders();
          },
        }
      );
    }
    
    console.log('[WorkOrders] Update initiated:', id);
  }, [selectedDetailWorkOrder, updateWorkOrderMutation, refetchWorkOrders]);

  const handleStartWork = useCallback((id: string) => {
    console.log('[WorkOrders] Starting work on:', id);
    
    // Optimistic update
    setWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, status: 'in_progress' as const, started_at: new Date().toISOString() } : wo
    ));
    if (selectedDetailWorkOrder?.id === id) {
      setSelectedDetailWorkOrder(prev => prev ? { ...prev, status: 'in_progress' as const, started_at: new Date().toISOString() } : null);
    }
    
    // Persist with dedicated mutation
    startWorkOrderMutation.mutate(id, {
      onSuccess: () => {
        console.log('[WorkOrders] Successfully started work order:', id);
      },
      onError: (error) => {
        console.error('[WorkOrders] Failed to start work order:', error);
        refetchWorkOrders();
      },
    });
  }, [selectedDetailWorkOrder, startWorkOrderMutation, refetchWorkOrders]);

  const handleCompleteWork = useCallback((id: string) => {
    console.log('[WorkOrders] Completing work order:', id);
    
    // Optimistic update
    setWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, status: 'completed' as const, completed_at: new Date().toISOString() } : wo
    ));
    
    // Persist with dedicated mutation
    completeWorkOrderMutation.mutate(
      { workOrderId: id },
      {
        onSuccess: () => {
          console.log('[WorkOrders] Successfully completed work order:', id);
        },
        onError: (error) => {
          console.error('[WorkOrders] Failed to complete work order:', error);
          refetchWorkOrders();
        },
      }
    );
    
    setShowDetailModal(false);
    setSelectedDetailWorkOrder(null);
  }, [completeWorkOrderMutation, refetchWorkOrders]);

  const handleQuickStatusChange = useCallback((wo: DetailedWorkOrder) => {
    setSelectedWorkOrder(wo);
    setShowStatusModal(true);
    console.log('Opening quick status change for:', wo.workOrderNumber);
  }, []);

  const handleQuickAssign = useCallback((wo: DetailedWorkOrder) => {
    setSelectedWorkOrder(wo);
    setShowAssignModal(true);
    console.log('Opening quick assign for:', wo.workOrderNumber);
  }, []);

  const handleStatusUpdate = useCallback((newStatus: DetailedWorkOrder['status']) => {
    if (!selectedWorkOrder) return;
    
    const workOrderId = selectedWorkOrder.id;
    const workOrderNumber = selectedWorkOrder.workOrderNumber;
    console.log('[WorkOrders] Status update:', workOrderNumber, '->', newStatus);
    
    // Optimistic update
    const updates: Partial<DetailedWorkOrder> = {
      status: newStatus,
      started_at: newStatus === 'in_progress' && !selectedWorkOrder.started_at ? new Date().toISOString() : selectedWorkOrder.started_at,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : selectedWorkOrder.completed_at,
    };
    
    setWorkOrders(prev => prev.map(wo => 
      wo.id === workOrderId ? { ...wo, ...updates, updated_at: new Date().toISOString().split('T')[0] } : wo
    ));
    
    // Use dedicated mutations based on status
    const onSuccess = () => {
      console.log('[WorkOrders] Successfully updated status:', workOrderNumber, '->', newStatus);
    };
    const onError = (error: Error) => {
      console.error('[WorkOrders] Failed to update status:', error);
      refetchWorkOrders();
    };
    
    switch (newStatus) {
      case 'in_progress':
        startWorkOrderMutation.mutate(workOrderId, { onSuccess, onError });
        break;
      case 'completed':
        completeWorkOrderMutation.mutate({ workOrderId }, { onSuccess, onError });
        break;
      case 'on_hold':
        putOnHoldMutation.mutate({ workOrderId }, { onSuccess, onError });
        break;
      case 'cancelled':
        cancelWorkOrderMutation.mutate({ workOrderId }, { onSuccess, onError });
        break;
      default:
        // For 'open' or other statuses, use generic update
        updateWorkOrderMutation.mutate(
          { id: workOrderId, updates: { status: newStatus } },
          { onSuccess, onError }
        );
    }
    
    setShowStatusModal(false);
    setSelectedWorkOrder(null);
  }, [selectedWorkOrder, startWorkOrderMutation, completeWorkOrderMutation, putOnHoldMutation, cancelWorkOrderMutation, updateWorkOrderMutation, refetchWorkOrders]);

  const handleAssignTechnician = useCallback((techId: string, techName: string) => {
    if (!selectedWorkOrder) return;
    
    const workOrderId = selectedWorkOrder.id;
    const workOrderNumber = selectedWorkOrder.workOrderNumber;
    console.log('[WorkOrders] Assigning technician:', workOrderNumber, '->', techName);
    
    // Optimistic update
    setWorkOrders(prev => prev.map(wo => 
      wo.id === workOrderId ? { ...wo, assigned_to: techId, assignedName: techName, updated_at: new Date().toISOString().split('T')[0] } : wo
    ));
    
    // Persist with dedicated assignment mutation
    assignWorkOrderMutation.mutate(
      { workOrderId, assignedTo: techId, assignedName: techName },
      {
        onSuccess: () => {
          console.log('[WorkOrders] Successfully assigned:', workOrderNumber, '->', techName);
        },
        onError: (error) => {
          console.error('[WorkOrders] Failed to assign technician:', error);
          refetchWorkOrders();
        },
      }
    );
    
    setShowAssignModal(false);
    setSelectedWorkOrder(null);
  }, [selectedWorkOrder, assignWorkOrderMutation, refetchWorkOrders]);

  const handleQuickDateRange = useCallback((range: 'today' | 'week' | 'month' | 'clear') => {
    const today = new Date();
    
    switch (range) {
      case 'today':
        setStartDate(formatDateForInput(today));
        setEndDate(formatDateForInput(today));
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(formatDateForInput(weekAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(formatDateForInput(monthAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'clear':
        setStartDate('');
        setEndDate('');
        break;
    }
  }, []);

  const filterPanelHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 520],
  });

  const filterPanelOpacity = filterAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const renderFilterChip = (
    label: string,
    value: string,
    currentValue: string,
    onPress: () => void,
    color?: string
  ) => {
    const isActive = value === currentValue;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive 
              ? (color ? `${color}20` : colors.primary + '20')
              : colors.surface,
            borderColor: isActive 
              ? (color || colors.primary)
              : colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterChipText,
            {
              color: isActive 
                ? (color || colors.primary)
                : colors.textSecondary,
              fontWeight: isActive ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDropdownButton = (
    label: string,
    value: string,
    displayValue: string,
    onPress: () => void,
    icon: React.ReactNode
  ) => {
    const isActive = value !== 'all';
    return (
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          {
            backgroundColor: isActive ? colors.primary + '15' : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownButtonContent}>
          {icon}
          <View style={styles.dropdownTextContainer}>
            <Text style={[styles.dropdownLabel, { color: colors.textTertiary }]}>{label}</Text>
            <Text 
              style={[
                styles.dropdownValue, 
                { color: isActive ? colors.primary : colors.text }
              ]} 
              numberOfLines={1}
            >
              {displayValue}
            </Text>
          </View>
        </View>
        <ChevronDown size={18} color={isActive ? colors.primary : colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderSelectionModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  selectedValue === option.value && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text 
                  style={[
                    styles.modalOptionText, 
                    { color: selectedValue === option.value ? colors.primary : colors.text }
                  ]}
                >
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const isOverdue = useCallback((dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }, []);

  const getDaysUntilDue = useCallback((dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const formatDueDate = useCallback((dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) {
      return `${Math.abs(days)}d overdue`;
    } else if (days === 0) {
      return 'Due today';
    } else if (days === 1) {
      return 'Due tomorrow';
    } else if (days <= 7) {
      return `Due in ${days}d`;
    }
    return dueDate;
  }, [getDaysUntilDue]);

  const renderSkeletonCard = useCallback(() => {
    return (
      <Animated.View
        style={[
          styles.woCard,
          styles.skeletonCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: skeletonOpacity,
          },
        ]}
      >
        <View style={styles.woCardHeader}>
          <View style={[styles.skeletonBadge, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonStatusBadge, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.woTitleSection}>
          <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonDescription, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.woDetails}>
          <View style={styles.woDetailRow}>
            <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonText, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.woDetailRow}>
            <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonTextShort, { backgroundColor: colors.border }]} />
          </View>
        </View>
        <View style={[styles.woCardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.woFooterLeft}>
            <View style={[styles.skeletonAvatar, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonName, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.skeletonDate, { backgroundColor: colors.border }]} />
        </View>
      </Animated.View>
    );
  }, [colors, skeletonOpacity]);

  const SkeletonList = useCallback(() => (
    <>
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <View key={`skeleton-${index}`}>
          {renderSkeletonCard()}
        </View>
      ))}
    </>
  ), [renderSkeletonCard]);

  const getNextStatusOptions = useCallback((currentStatus: DetailedWorkOrder['status']) => {
    switch (currentStatus) {
      case 'open':
        return [
          { status: 'in_progress' as const, label: 'Start Work', icon: Play, color: '#F59E0B' },
          { status: 'on_hold' as const, label: 'Put on Hold', icon: Pause, color: '#8B5CF6' },
          { status: 'cancelled' as const, label: 'Cancel', icon: Ban, color: '#6B7280' },
        ];
      case 'in_progress':
        return [
          { status: 'completed' as const, label: 'Complete', icon: CheckCircle2, color: '#10B981' },
          { status: 'on_hold' as const, label: 'Put on Hold', icon: Pause, color: '#8B5CF6' },
          { status: 'open' as const, label: 'Reopen', icon: Clock, color: '#3B82F6' },
        ];
      case 'on_hold':
        return [
          { status: 'in_progress' as const, label: 'Resume Work', icon: Play, color: '#F59E0B' },
          { status: 'open' as const, label: 'Reopen', icon: Clock, color: '#3B82F6' },
          { status: 'cancelled' as const, label: 'Cancel', icon: Ban, color: '#6B7280' },
        ];
      case 'completed':
        return [
          { status: 'in_progress' as const, label: 'Reopen (In Progress)', icon: Play, color: '#F59E0B' },
        ];
      case 'cancelled':
        return [
          { status: 'open' as const, label: 'Reopen', icon: Clock, color: '#3B82F6' },
        ];
      default:
        return [];
    }
  }, []);

  const renderWorkOrderCard = (wo: DetailedWorkOrder) => {
    const statusConfig = STATUS_CONFIG[wo.status];
    const priorityConfig = PRIORITY_CONFIG[wo.priority];
    const typeConfig = TYPE_CONFIG[wo.type];
    const StatusIcon = statusConfig.icon;
    const overdue = wo.status !== 'completed' && wo.status !== 'cancelled' && isOverdue(wo.due_date);
    const daysUntilDue = getDaysUntilDue(wo.due_date);
    const dueSoon = !overdue && daysUntilDue >= 0 && daysUntilDue <= 2 && wo.status !== 'completed' && wo.status !== 'cancelled';
    

    return (
      <TouchableOpacity
        key={wo.id}
        style={[
          styles.woCard, 
          { 
            backgroundColor: colors.surface, 
            borderColor: overdue ? '#EF4444' : colors.border,
            borderLeftWidth: 4,
            borderLeftColor: priorityConfig.color,
          }
        ]}
        onPress={() => handleWorkOrderPress(wo)}
        activeOpacity={0.7}
        testID={`work-order-card-${wo.id}`}
      >
        <View style={styles.woCardHeader}>
          <View style={styles.woNumberContainer}>
            <View style={[styles.woNumberBadge, { backgroundColor: priorityConfig.bgColor }]}>
              {(wo.priority === 'critical' || wo.priority === 'high') && (
                <AlertTriangle size={12} color={priorityConfig.color} />
              )}
              <Text style={[styles.woNumber, { color: priorityConfig.color }]}>
                {wo.workOrderNumber}
              </Text>
            </View>
            <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickStatusChange(wo);
              }}
              activeOpacity={0.7}
              testID={`quick-status-${wo.id}`}
            >
              <StatusIcon size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <ChevronDown size={12} color={statusConfig.color} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.woTitleSection}>
          <Text style={[styles.woTitle, { color: colors.text }]} numberOfLines={2}>
            {wo.title}
          </Text>
          {wo.description && (
            <Text style={[styles.woDescription, { color: colors.textTertiary }]} numberOfLines={2}>
              {wo.description}
            </Text>
          )}
        </View>

        <View style={styles.woDetails}>
          {wo.equipment && (
            <View style={styles.woDetailRow}>
              <View style={[styles.detailIconContainer, { backgroundColor: '#3B82F6' + '15' }]}>
                <Wrench size={12} color="#3B82F6" />
              </View>
              <Text style={[styles.woDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
                {wo.equipment}
              </Text>
            </View>
          )}
          {wo.location && (
            <View style={styles.woDetailRow}>
              <View style={[styles.detailIconContainer, { backgroundColor: '#10B981' + '15' }]}>
                <MapPin size={12} color="#10B981" />
              </View>
              <Text style={[styles.woDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
                {wo.location}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.woCardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.woFooterLeft}>
            {wo.assignedName ? (
              <TouchableOpacity 
                style={styles.assigneeContainer}
                onPress={(e) => {
                  e.stopPropagation();
                  handleQuickAssign(wo);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.assigneeAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.assigneeInitials}>
                    {getInitials(wo.assignedName)}
                  </Text>
                </View>
                <Text style={[styles.assigneeText, { color: colors.text }]} numberOfLines={1}>
                  {wo.assignedName}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.quickAssignButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleQuickAssign(wo);
                }}
                activeOpacity={0.7}
                testID={`quick-assign-${wo.id}`}
              >
                <UserPlus size={14} color={colors.primary} />
                <Text style={[styles.quickAssignText, { color: colors.primary }]}>
                  Assign
                </Text>
              </TouchableOpacity>
            )}
            <View style={[styles.typeChip, { backgroundColor: typeConfig.color + '15', borderColor: typeConfig.color }]}>
              <Text style={[styles.typeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.woFooterRight}>
            <View style={[
              styles.dueDateContainer,
              overdue && styles.overdueDateContainer,
              dueSoon && styles.dueSoonContainer,
            ]}>
              <Calendar 
                size={12} 
                color={overdue ? '#EF4444' : dueSoon ? '#F59E0B' : colors.textTertiary} 
              />
              <Text style={[
                styles.dueDateText, 
                { color: overdue ? '#EF4444' : dueSoon ? '#F59E0B' : colors.textSecondary },
                overdue && styles.overdueDateText,
              ]}>
                {formatDueDate(wo.due_date)}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const equipmentOptions = [
    { value: 'all', label: 'All Equipment' },
    ...uniqueEquipment.map(e => ({ value: e, label: e }))
  ];

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    ...uniqueLocations.map(l => ({ value: l, label: l }))
  ];

  const technicianOptions = [
    { value: 'all', label: 'All Technicians' },
    ...uniqueTechnicians.map(t => ({ value: t.id, label: t.name }))
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'All Work Orders',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/cmms/newworkorder' as any)}
              testID="new-work-order-button"
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[
          styles.searchContainer,
          { 
            backgroundColor: colors.surface,
            borderColor: isSearchFocused ? colors.primary : colors.border,
          },
        ]}>
          <Search size={20} color={isSearchFocused ? colors.primary : colors.textTertiary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search WO#, title, equipment, location, assignee..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            testID="work-order-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { 
              backgroundColor: showFilters || activeFilterCount > 0 
                ? colors.primary + '15' 
                : colors.surface,
              borderColor: showFilters || activeFilterCount > 0 
                ? colors.primary 
                : colors.border,
            },
          ]}
          onPress={() => setShowFilters(!showFilters)}
          testID="filter-toggle-button"
        >
          <SlidersHorizontal 
            size={20} 
            color={showFilters || activeFilterCount > 0 ? colors.primary : colors.textSecondary} 
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.filterPanel,
          { 
            backgroundColor: colors.backgroundSecondary,
            height: filterPanelHeight,
            opacity: filterPanelOpacity,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <ScrollView 
          style={styles.filterPanelScroll}
          contentContainerStyle={styles.filterPanelContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Status</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {renderFilterChip('All', 'all', statusFilter, () => setStatusFilter('all'))}
              {Object.entries(STATUS_CONFIG).map(([key, config]) =>
                renderFilterChip(config.label, key, statusFilter, () => setStatusFilter(key as StatusFilter), config.color)
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Priority</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {renderFilterChip('All', 'all', priorityFilter, () => setPriorityFilter('all'))}
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) =>
                renderFilterChip(config.label, key, priorityFilter, () => setPriorityFilter(key as PriorityFilter), config.color)
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {renderFilterChip('All', 'all', typeFilter, () => setTypeFilter('all'))}
              {Object.entries(TYPE_CONFIG).map(([key, config]) =>
                renderFilterChip(config.label, key, typeFilter, () => setTypeFilter(key as TypeFilter), config.color)
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Date Range</Text>
            </View>
            <View style={styles.dateFieldToggle}>
              <TouchableOpacity
                style={[
                  styles.dateFieldOption,
                  dateFieldFilter === 'due_date' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  { borderColor: colors.border },
                ]}
                onPress={() => setDateFieldFilter('due_date')}
              >
                <Text style={[
                  styles.dateFieldText,
                  { color: dateFieldFilter === 'due_date' ? colors.primary : colors.textSecondary }
                ]}>Due Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateFieldOption,
                  dateFieldFilter === 'created_at' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  { borderColor: colors.border },
                ]}
                onPress={() => setDateFieldFilter('created_at')}
              >
                <Text style={[
                  styles.dateFieldText,
                  { color: dateFieldFilter === 'created_at' ? colors.primary : colors.textSecondary }
                ]}>Created Date</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateRangeRow}>
              <View style={styles.dateInputWrapper}>
                <Text style={[styles.dateInputLabel, { color: colors.textTertiary }]}>From</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: startDate ? colors.primary : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={startDate}
                  onChangeText={setStartDate}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                />
              </View>
              <View style={styles.dateRangeSeparator}>
                <CalendarRange size={18} color={colors.textTertiary} />
              </View>
              <View style={styles.dateInputWrapper}>
                <Text style={[styles.dateInputLabel, { color: colors.textTertiary }]}>To</Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: endDate ? colors.primary : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={endDate}
                  onChangeText={setEndDate}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickDateRow}>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('today')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('week')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('month')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>Last 30 Days</Text>
              </TouchableOpacity>
              {(startDate || endDate) && (
                <TouchableOpacity
                  style={[styles.quickDateChip, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
                  onPress={() => handleQuickDateRange('clear')}
                >
                  <Text style={[styles.quickDateText, { color: colors.error }]}>Clear Dates</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Equipment & Location</Text>
            </View>
            <View style={styles.dropdownRow}>
              {renderDropdownButton(
                'Equipment',
                equipmentFilter,
                equipmentFilter === 'all' ? 'All Equipment' : equipmentFilter,
                () => setShowEquipmentModal(true),
                <Building2 size={18} color={equipmentFilter !== 'all' ? colors.primary : colors.textTertiary} />
              )}
            </View>
            <View style={styles.dropdownRow}>
              {renderDropdownButton(
                'Location',
                locationFilter,
                locationFilter === 'all' ? 'All Locations' : locationFilter,
                () => setShowLocationModal(true),
                <MapPin size={18} color={locationFilter !== 'all' ? colors.primary : colors.textTertiary} />
              )}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHeader}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Assigned Technician</Text>
            </View>
            <View style={styles.dropdownRow}>
              {renderDropdownButton(
                'Technician',
                technicianFilter,
                technicianFilter === 'all' 
                  ? 'All Technicians' 
                  : uniqueTechnicians.find(t => t.id === technicianFilter)?.name || 'All Technicians',
                () => setShowTechnicianModal(true),
                <Users size={18} color={technicianFilter !== 'all' ? colors.primary : colors.textTertiary} />
              )}
            </View>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={[styles.clearFiltersButton, { borderColor: colors.error }]}
              onPress={handleClearFilters}
            >
              <X size={14} color={colors.error} />
              <Text style={[styles.clearFiltersText, { color: colors.error }]}>Clear All Filters ({activeFilterCount})</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, styles.statItemPrimary, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{listStatistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Total</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.open.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.open.color }]}>{listStatistics.open}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.open.color }]}>Open</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.in_progress.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.in_progress.color }]}>{listStatistics.inProgress}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.in_progress.color }]}>In Progress</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.on_hold.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.on_hold.color }]}>{listStatistics.onHold}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.on_hold.color }]}>On Hold</Text>
          </View>
        </View>
        
        <View style={styles.statsRowSecondary}>
          {listStatistics.overdue > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' + '40' }]}>
              <AlertTriangle size={14} color="#EF4444" />
              <Text style={[styles.alertBadgeValue, { color: '#EF4444' }]}>{listStatistics.overdue}</Text>
              <Text style={[styles.alertBadgeLabel, { color: '#EF4444' }]}>Overdue</Text>
            </View>
          )}
          
          {listStatistics.critical > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: PRIORITY_CONFIG.critical.bgColor, borderColor: PRIORITY_CONFIG.critical.color + '40' }]}>
              <AlertTriangle size={14} color={PRIORITY_CONFIG.critical.color} />
              <Text style={[styles.alertBadgeValue, { color: PRIORITY_CONFIG.critical.color }]}>{listStatistics.critical}</Text>
              <Text style={[styles.alertBadgeLabel, { color: PRIORITY_CONFIG.critical.color }]}>Critical</Text>
            </View>
          )}
          
          {listStatistics.overdue === 0 && listStatistics.critical === 0 && (
            <View style={[styles.alertBadge, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '40' }]}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.alertBadgeLabel, { color: '#10B981' }]}>All on Track</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredWorkOrders.length} {filteredWorkOrders.length === 1 ? 'work order' : 'work orders'}
          {debouncedSearchQuery.trim() && ` matching "${debouncedSearchQuery.trim()}"`}
        </Text>
        <View style={styles.resultsActions}>
          <TouchableOpacity
            style={[
              styles.groupByButton, 
              { 
                backgroundColor: groupBy !== 'none' ? colors.primary + '15' : colors.surface, 
                borderColor: groupBy !== 'none' ? colors.primary : colors.border 
              }
            ]}
            onPress={() => setShowGroupByModal(true)}
            testID="group-by-button"
          >
            <Layers size={14} color={groupBy !== 'none' ? colors.primary : colors.textSecondary} />
            {groupBy !== 'none' && (
              <Text style={[styles.groupByButtonText, { color: colors.primary }]} numberOfLines={1}>
                {GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label.replace('Group by ', '')}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSortModal(true)}
            testID="sort-button"
          >
            <ArrowUpDown size={14} color={colors.primary} />
            <Text style={[styles.sortButtonText, { color: colors.text }]} numberOfLines={1}>
              {currentSortLabel}
            </Text>
            <ChevronDown size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {groupBy !== 'none' && groupedWorkOrders.length > 1 && (
        <View style={[styles.groupActionsBar, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
          <Text style={[styles.groupActionsLabel, { color: colors.textSecondary }]}>
            {groupedWorkOrders.length} groups
          </Text>
          <View style={styles.groupActionsButtons}>
            <TouchableOpacity
              style={[styles.groupActionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={expandAllGroups}
            >
              <ChevronDown size={14} color={colors.textSecondary} />
              <Text style={[styles.groupActionText, { color: colors.textSecondary }]}>Expand All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.groupActionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={collapseAllGroups}
            >
              <ChevronUp size={14} color={colors.textSecondary} />
              <Text style={[styles.groupActionText, { color: colors.textSecondary }]}>Collapse All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {(isInitialLoading || isSupabaseLoading) ? (
          <SkeletonList />
        ) : contextError ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.error + '15' }]}>
              <AlertTriangle size={44} color={colors.error} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Unable to Load Work Orders</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {contextError}
            </Text>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.primary }]}
              onPress={handleRefresh}
            >
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredWorkOrders.length > 0 ? (
          groupBy === 'none' ? (
            filteredWorkOrders.map(renderWorkOrderCard)
          ) : (
            groupedWorkOrders.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key);
              const GroupIcon = group.icon;
              return (
                <View key={group.key} style={styles.groupContainer}>
                  <TouchableOpacity
                    style={[
                      styles.groupHeader,
                      { backgroundColor: group.bgColor, borderColor: group.color + '40' },
                    ]}
                    onPress={() => toggleGroupCollapse(group.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupHeaderLeft}>
                      {GroupIcon && (
                        <View style={[styles.groupIconContainer, { backgroundColor: group.color + '25' }]}>
                          <GroupIcon size={16} color={group.color} />
                        </View>
                      )}
                      <View style={styles.groupHeaderText}>
                        <Text style={[styles.groupTitle, { color: group.color }]}>
                          {group.label}
                        </Text>
                        <Text style={[styles.groupCount, { color: group.color + 'CC' }]}>
                          {group.items.length} {group.items.length === 1 ? 'work order' : 'work orders'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.groupChevron, { backgroundColor: group.color + '20' }]}>
                      {isCollapsed ? (
                        <ChevronRight size={18} color={group.color} />
                      ) : (
                        <ChevronDown size={18} color={group.color} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <View style={styles.groupContent}>
                      {group.items.map(renderWorkOrderCard)}
                    </View>
                  )}
                </View>
              );
            })
          )
        ) : workOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Wrench size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Work Orders Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create your first work order to get started with maintenance tracking
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/cmms/newworkorder' as any)}
              testID="empty-state-create-button"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Work Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Search size={40} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {debouncedSearchQuery.trim()
                ? `No work orders match "${debouncedSearchQuery.trim()}"`
                : 'No work orders match your current filters'}
            </Text>
            <View style={styles.emptyStateActions}>
              {(debouncedSearchQuery.trim() || activeFilterCount > 0) && (
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setSearchQuery('');
                    handleClearFilters();
                  }}
                >
                  <X size={16} color={colors.text} />
                  <Text style={[styles.resetButtonTextAlt, { color: colors.text }]}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/cmms/newworkorder' as any)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.resetButtonText}>New Work Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/cmms/newworkorder' as any)}
        activeOpacity={0.8}
        testID="fab-new-work-order"
      >
        <Plus size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {renderSelectionModal(
        showEquipmentModal,
        () => setShowEquipmentModal(false),
        'Select Equipment',
        equipmentOptions,
        equipmentFilter,
        setEquipmentFilter
      )}

      {renderSelectionModal(
        showLocationModal,
        () => setShowLocationModal(false),
        'Select Location',
        locationOptions,
        locationFilter,
        setLocationFilter
      )}

      {renderSelectionModal(
        showTechnicianModal,
        () => setShowTechnicianModal(false),
        'Select Technician',
        technicianOptions,
        technicianFilter,
        setTechnicianFilter
      )}

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
              <TouchableOpacity 
                onPress={() => setShowSortModal(false)} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {SORT_OPTIONS.map((option, index) => {
                const isSelected = option.field === sortField && option.direction === sortDirection;
                return (
                  <TouchableOpacity
                    key={`${option.field}-${option.direction}`}
                    style={[
                      styles.sortOption,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => handleSortSelect(option)}
                  >
                    <View style={styles.sortOptionContent}>
                      {option.direction === 'asc' ? (
                        <ArrowUp size={16} color={isSelected ? colors.primary : colors.textTertiary} />
                      ) : (
                        <ArrowDown size={16} color={isSelected ? colors.primary : colors.textTertiary} />
                      )}
                      <Text 
                        style={[
                          styles.sortOptionText, 
                          { color: isSelected ? colors.primary : colors.text }
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowStatusModal(false);
          setSelectedWorkOrder(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowStatusModal(false);
            setSelectedWorkOrder(null);
          }}
        >
          <View style={[styles.quickActionModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Change Status</Text>
                {selectedWorkOrder && (
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {selectedWorkOrder.workOrderNumber}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedWorkOrder(null);
                }} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedWorkOrder && (
              <View style={styles.currentStatusSection}>
                <Text style={[styles.currentStatusLabel, { color: colors.textTertiary }]}>Current Status</Text>
                <View style={[
                  styles.currentStatusBadge, 
                  { backgroundColor: STATUS_CONFIG[selectedWorkOrder.status].bgColor }
                ]}>
                  {React.createElement(STATUS_CONFIG[selectedWorkOrder.status].icon, {
                    size: 16,
                    color: STATUS_CONFIG[selectedWorkOrder.status].color
                  })}
                  <Text style={[
                    styles.currentStatusText, 
                    { color: STATUS_CONFIG[selectedWorkOrder.status].color }
                  ]}>
                    {STATUS_CONFIG[selectedWorkOrder.status].label}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statusOptionsContainer}>
              <Text style={[styles.statusOptionsTitle, { color: colors.textTertiary }]}>Change to:</Text>
              {selectedWorkOrder && getNextStatusOptions(selectedWorkOrder.status).map((option) => (
                <TouchableOpacity
                  key={option.status}
                  style={[
                    styles.statusOption,
                    { backgroundColor: option.color + '10', borderColor: option.color + '30' },
                    isMutating && styles.disabledOption,
                  ]}
                  onPress={() => handleStatusUpdate(option.status)}
                  activeOpacity={0.7}
                  disabled={isMutating}
                >
                  <View style={[styles.statusOptionIcon, { backgroundColor: option.color + '20' }]}>
                    <option.icon size={18} color={option.color} />
                  </View>
                  <Text style={[styles.statusOptionLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                  {isMutating ? (
                    <View style={styles.mutationLoader}>
                      <Text style={[styles.mutationLoaderText, { color: option.color }]}>...</Text>
                    </View>
                  ) : (
                    <ChevronRight size={18} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Group By Modal */}
      <Modal
        visible={showGroupByModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupByModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowGroupByModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Group By</Text>
              <TouchableOpacity 
                onPress={() => setShowGroupByModal(false)} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {GROUP_BY_OPTIONS.map((option) => {
                const isSelected = option.value === groupBy;
                const OptionIcon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.groupByOption,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => {
                      setGroupBy(option.value);
                      setCollapsedGroups(new Set());
                      setShowGroupByModal(false);
                      console.log('Group by changed to:', option.label);
                    }}
                  >
                    <View style={styles.groupByOptionContent}>
                      <View style={[
                        styles.groupByOptionIcon, 
                        { backgroundColor: isSelected ? colors.primary + '20' : colors.backgroundSecondary }
                      ]}>
                        <OptionIcon size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                      </View>
                      <Text 
                        style={[
                          styles.groupByOptionText, 
                          { color: isSelected ? colors.primary : colors.text }
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Work Order Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseDetail}
      >
        {selectedDetailWorkOrder && (
          <WorkOrderDetail
            workOrder={selectedDetailWorkOrder}
            onClose={handleCloseDetail}
            onUpdate={handleUpdateWorkOrder}
            onStartWork={handleStartWork}
            onCompleteWork={handleCompleteWork}
            canEdit={true}
          />
        )}
      </Modal>

      {/* Quick Assign Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAssignModal(false);
          setSelectedWorkOrder(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setShowAssignModal(false);
            setSelectedWorkOrder(null);
          }}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Assign Technician</Text>
                {selectedWorkOrder && (
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {selectedWorkOrder.workOrderNumber}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedWorkOrder(null);
                }} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedWorkOrder?.assigned_to && (
                <TouchableOpacity
                  style={[
                    styles.technicianOption,
                    { borderBottomColor: colors.border, backgroundColor: colors.error + '08' },
                    isMutating && styles.disabledOption,
                  ]}
                  disabled={isMutating}
                  onPress={() => {
                    if (selectedWorkOrder) {
                      const workOrderId = selectedWorkOrder.id;
                      const workOrderNumber = selectedWorkOrder.workOrderNumber;
                      console.log('[WorkOrders] Unassigning technician:', workOrderNumber);
                      
                      // Optimistic update
                      setWorkOrders(prev => prev.map(wo => 
                        wo.id === workOrderId ? { ...wo, assigned_to: undefined, assignedName: undefined, updated_at: new Date().toISOString().split('T')[0] } : wo
                      ));
                      
                      // Persist unassignment
                      updateWorkOrderMutation.mutate(
                        { id: workOrderId, updates: { assigned_to: undefined, assigned_name: undefined } },
                        {
                          onSuccess: () => {
                            console.log('[WorkOrders] Successfully unassigned:', workOrderNumber);
                          },
                          onError: (error) => {
                            console.error('[WorkOrders] Failed to unassign:', error);
                            refetchWorkOrders();
                          },
                        }
                      );
                      
                      setShowAssignModal(false);
                      setSelectedWorkOrder(null);
                    }
                  }}
                >
                  <View style={[styles.technicianAvatar, { backgroundColor: colors.error + '20' }]}>
                    <X size={16} color={colors.error} />
                  </View>
                  <Text style={[styles.technicianName, { color: colors.error }]}>Unassign</Text>
                </TouchableOpacity>
              )}
              {uniqueTechnicians.map((tech) => {
                const isCurrentAssignee = selectedWorkOrder?.assigned_to === tech.id;
                return (
                  <TouchableOpacity
                    key={tech.id}
                    style={[
                      styles.technicianOption,
                      { borderBottomColor: colors.border },
                      isCurrentAssignee && { backgroundColor: colors.primary + '10' },
                      isMutating && styles.disabledOption,
                    ]}
                    onPress={() => handleAssignTechnician(tech.id, tech.name)}
                    disabled={isMutating}
                  >
                    <View style={[styles.technicianAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.technicianInitials}>{getInitials(tech.name)}</Text>
                    </View>
                    <Text style={[styles.technicianName, { color: isCurrentAssignee ? colors.primary : colors.text }]}>
                      {tech.name}
                    </Text>
                    {isCurrentAssignee && (
                      <View style={styles.currentAssigneeBadge}>
                        <Text style={[styles.currentAssigneeText, { color: colors.primary }]}>Current</Text>
                      </View>
                    )}
                    {isCurrentAssignee && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRowSecondary: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    minWidth: 70,
  },
  statItemPrimary: {
    flex: 1.2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  alertBadgeValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  alertBadgeLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  filterPanel: {
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  filterPanelScroll: {
    flex: 1,
  },
  filterPanelContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterGroupTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipsRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
  },
  dateFieldToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateFieldOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateFieldText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dateInputWrapper: {
    flex: 1,
    gap: 4,
  },
  dateInputLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  dateInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  dateRangeSeparator: {
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickDateRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  dropdownRow: {
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  resultsCount: {
    fontSize: 13,
    flex: 1,
  },
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupByButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  groupByButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    maxWidth: 200,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  groupActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  groupActionsLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  groupActionsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  groupActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  groupActionText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeaderText: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  groupChevron: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupContent: {
    gap: 10,
    paddingLeft: 4,
  },
  groupByOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  groupByOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  groupByOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupByOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sortOptionText: {
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  woCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  woCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  woNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  woNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  woNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  woTitleSection: {
    gap: 4,
  },
  woTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  woDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  woDetails: {
    gap: 8,
    paddingTop: 4,
  },
  woDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  woDetailText: {
    fontSize: 13,
    flex: 1,
  },
  woCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
  },
  woFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: '50%',
  },
  unassignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitials: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  assigneeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  unassignedText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  quickAssignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  quickAssignText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  woFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overdueDateContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  dueSoonContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  overdueDateText: {
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  quickActionModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    overflow: 'hidden',
  },
  currentStatusSection: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  currentStatusLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  currentStatusText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statusOptionsContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  statusOptionsTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  statusOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  technicianOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  technicianAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  technicianInitials: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  technicianName: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  currentAssigneeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  currentAssigneeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  disabledOption: {
    opacity: 0.5,
  },
  mutationLoader: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutationLoaderText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  skeletonCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  skeletonBadge: {
    width: 90,
    height: 28,
    borderRadius: 8,
  },
  skeletonStatusBadge: {
    width: 85,
    height: 28,
    borderRadius: 8,
  },
  skeletonTitle: {
    width: '85%',
    height: 18,
    borderRadius: 6,
  },
  skeletonDescription: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    marginTop: 6,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  skeletonText: {
    width: '70%',
    height: 14,
    borderRadius: 4,
  },
  skeletonTextShort: {
    width: '50%',
    height: 14,
    borderRadius: 4,
  },
  skeletonAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  skeletonName: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
  skeletonDate: {
    width: 70,
    height: 14,
    borderRadius: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyStateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  resetButtonTextAlt: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
