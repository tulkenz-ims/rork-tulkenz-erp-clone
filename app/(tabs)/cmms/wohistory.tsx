import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Wrench,
  Calendar,
  SlidersHorizontal,
  CalendarRange,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Download,
  Printer,
  User,
  Timer,
  Package,
  BarChart3,
  TrendingUp,
  History,
  Loader2,
} from 'lucide-react-native';
import { useWorkOrdersQuery, ExtendedWorkOrder } from '@/hooks/useSupabaseWorkOrders';

const DEBOUNCE_DELAY = 300;

type StatusFilter = 'all' | 'completed' | 'cancelled';
type TypeFilter = 'all' | 'corrective' | 'preventive' | 'emergency' | 'request';
type SortField = 'completed_at' | 'created_at' | 'wo_number' | 'actual_hours';
type SortDirection = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'completed_at', direction: 'desc', label: 'Completed (Newest First)' },
  { field: 'completed_at', direction: 'asc', label: 'Completed (Oldest First)' },
  { field: 'created_at', direction: 'desc', label: 'Created (Newest First)' },
  { field: 'created_at', direction: 'asc', label: 'Created (Oldest First)' },
  { field: 'actual_hours', direction: 'desc', label: 'Labor Hours (Most First)' },
  { field: 'actual_hours', direction: 'asc', label: 'Labor Hours (Least First)' },
  { field: 'wo_number', direction: 'asc', label: 'WO Number (A-Z)' },
  { field: 'wo_number', direction: 'desc', label: 'WO Number (Z-A)' },
];

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: '#10B981', icon: CheckCircle2, bgColor: 'rgba(16, 185, 129, 0.15)' },
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

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: formatDateForInput(start),
    end: formatDateForInput(end),
  };
}

export default function WOHistoryScreen() {
  const { colors } = useTheme();
  
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<ExtendedWorkOrder | null>(null);
  
  const [sortField, setSortField] = useState<SortField>('completed_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const searchInputRef = useRef<TextInput>(null);
  const filterAnimation = useRef(new Animated.Value(0)).current;
  
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  const { data: historicalWorkOrdersRaw = [], isLoading, refetch } = useWorkOrdersQuery({
    status: ['completed', 'cancelled'],
    orderBy: { column: 'completed_at', ascending: false },
  });

  const historicalWorkOrders = useMemo(() => {
    return historicalWorkOrdersRaw.map(wo => ({
      ...wo,
      completed_at: wo.completed_at || wo.updated_at,
    }));
  }, [historicalWorkOrdersRaw]);

  const uniqueEquipment = useMemo(() => {
    const equipment = new Set<string>();
    historicalWorkOrders.forEach(wo => {
      if (wo.equipment) equipment.add(wo.equipment);
    });
    return Array.from(equipment).sort();
  }, [historicalWorkOrders]);

  const uniqueTechnicians = useMemo(() => {
    const technicians = new Map<string, string>();
    historicalWorkOrders.forEach(wo => {
      if (wo.assigned_to && wo.assigned_name) {
        technicians.set(wo.assigned_to, wo.assigned_name);
      }
    });
    return Array.from(technicians.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [historicalWorkOrders]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (equipmentFilter !== 'all') count++;
    if (technicianFilter !== 'all') count++;
    return count;
  }, [statusFilter, typeFilter, equipmentFilter, technicianFilter]);

  useEffect(() => {
    Animated.timing(filterAnimation, {
      toValue: showFilters ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showFilters, filterAnimation]);

  const filteredWorkOrders = useMemo(() => {
    console.log('[WOHistory] Filtering work orders...');
    
    const filtered = historicalWorkOrders.filter((wo) => {
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
      if (typeFilter !== 'all' && wo.type !== typeFilter) return false;
      if (equipmentFilter !== 'all' && wo.equipment !== equipmentFilter) return false;
      if (technicianFilter !== 'all' && wo.assigned_to !== technicianFilter) return false;
      
      if (startDate || endDate) {
        const completedDate = wo.completed_at ? new Date(wo.completed_at) : new Date(wo.updated_at);
        if (startDate) {
          const start = new Date(startDate);
          if (completedDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (completedDate > end) return false;
        }
      }

      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const searchFields = [
          wo.work_order_number,
          wo.title,
          wo.description,
          wo.equipment,
          wo.assigned_name,
          wo.location,
          wo.type,
          wo.notes,
          wo.completion_notes,
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
        case 'completed_at':
          const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'created_at':
          const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = createdA - createdB;
          break;
        case 'actual_hours':
          comparison = (a.actual_hours || 0) - (b.actual_hours || 0);
          break;
        case 'wo_number':
          comparison = (a.work_order_number || '').localeCompare(b.work_order_number || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    console.log('[WOHistory] Filtered count:', sorted.length);
    return sorted;
  }, [debouncedSearchQuery, statusFilter, typeFilter, equipmentFilter, technicianFilter, startDate, endDate, sortField, sortDirection, historicalWorkOrders]);

  const statistics = useMemo(() => {
    const total = filteredWorkOrders.length;
    const completed = filteredWorkOrders.filter(wo => wo.status === 'completed').length;
    const cancelled = filteredWorkOrders.filter(wo => wo.status === 'cancelled').length;
    
    const totalHours = filteredWorkOrders.reduce((sum, wo) => sum + (wo.actual_hours || 0), 0);
    const avgHours = total > 0 ? totalHours / total : 0;
    
    const byType = {
      corrective: filteredWorkOrders.filter(wo => wo.type === 'corrective').length,
      preventive: filteredWorkOrders.filter(wo => wo.type === 'preventive').length,
      emergency: filteredWorkOrders.filter(wo => wo.type === 'emergency').length,
      request: filteredWorkOrders.filter(wo => wo.type === 'request').length,
    };

    return { total, completed, cancelled, totalHours, avgHours, byType };
  }, [filteredWorkOrders]);

  const currentSortLabel = useMemo(() => {
    const option = SORT_OPTIONS.find(o => o.field === sortField && o.direction === sortDirection);
    return option?.label || 'Completed (Newest First)';
  }, [sortField, sortDirection]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setEquipmentFilter('all');
    setTechnicianFilter('all');
    const defaults = getDefaultDateRange();
    setStartDate(defaults.start);
    setEndDate(defaults.end);
  }, []);

  const handleSortSelect = useCallback((option: SortOption) => {
    setSortField(option.field);
    setSortDirection(option.direction);
    setShowSortModal(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[WOHistory] Refreshing...');
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleWorkOrderPress = useCallback((wo: ExtendedWorkOrder) => {
    console.log('[WOHistory] Opening work order:', wo.work_order_number);
    setSelectedWorkOrder(wo);
    setShowDetailModal(true);
  }, []);

  const handleExportCSV = useCallback(async () => {
    console.log('[WOHistory] Exporting CSV...');
    
    const headers = ['WO Number', 'Title', 'Type', 'Priority', 'Status', 'Equipment', 'Technician', 'Created', 'Completed', 'Labor Hours', 'Parts Used'];
    const rows = filteredWorkOrders.map(wo => [
      wo.work_order_number || '',
      wo.title,
      wo.type,
      wo.priority,
      wo.status,
      wo.equipment || '',
      wo.assigned_name || '',
      wo.created_at,
      wo.completed_at || '',
      wo.actual_hours?.toString() || '0',
      '0',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    try {
      await Share.share({
        message: csvContent,
        title: 'Work Order History Export',
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [filteredWorkOrders]);

  const handleQuickDateRange = useCallback((range: 'week' | 'month' | '90days' | 'year' | 'all') => {
    const today = new Date();
    
    switch (range) {
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
      case '90days':
        const ninetyAgo = new Date(today);
        ninetyAgo.setDate(ninetyAgo.getDate() - 90);
        setStartDate(formatDateForInput(ninetyAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        setStartDate(formatDateForInput(yearAgo));
        setEndDate(formatDateForInput(today));
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const filterPanelHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 380],
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

  const renderWorkOrderCard = (wo: ExtendedWorkOrder) => {
    const statusConfig = STATUS_CONFIG[wo.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed;
    const priorityConfig = PRIORITY_CONFIG[wo.priority];
    const typeConfig = TYPE_CONFIG[wo.type];
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        key={wo.id}
        style={[
          styles.woCard, 
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: statusConfig.color,
          }
        ]}
        onPress={() => handleWorkOrderPress(wo)}
        activeOpacity={0.7}
        testID={`wo-history-card-${wo.id}`}
      >
        <View style={styles.woCardHeader}>
          <View style={styles.woNumberContainer}>
            <View style={[styles.woNumberBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <History size={12} color={colors.textSecondary} />
              <Text style={[styles.woNumber, { color: colors.text }]}>
                {wo.work_order_number}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.woTitleSection}>
          <Text style={[styles.woTitle, { color: colors.text }]} numberOfLines={2}>
            {wo.title}
          </Text>
          {wo.description && (
            <Text style={[styles.woDescription, { color: colors.textTertiary }]} numberOfLines={1}>
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
          
          <View style={styles.woMetricsRow}>
            <View style={styles.woMetric}>
              <Timer size={12} color={colors.textTertiary} />
              <Text style={[styles.woMetricText, { color: colors.textSecondary }]}>
                {wo.actual_hours || 0}h
              </Text>
            </View>
            <View style={styles.woMetric}>
              <Package size={12} color={colors.textTertiary} />
              <Text style={[styles.woMetricText, { color: colors.textSecondary }]}>
                0 parts
              </Text>
            </View>
            <View style={[styles.typeChip, { backgroundColor: typeConfig.color + '15', borderColor: typeConfig.color }]}>
              <Text style={[styles.typeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>
            <View style={[styles.priorityChip, { backgroundColor: priorityConfig.bgColor }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.woCardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.woFooterLeft}>
            {wo.assigned_name ? (
              <View style={styles.assigneeContainer}>
                <View style={[styles.assigneeAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.assigneeInitials}>
                    {getInitials(wo.assigned_name)}
                  </Text>
                </View>
                <Text style={[styles.assigneeText, { color: colors.text }]} numberOfLines={1}>
                  {wo.assigned_name}
                </Text>
              </View>
            ) : (
              <Text style={[styles.noAssigneeText, { color: colors.textTertiary }]}>
                Unassigned
              </Text>
            )}
          </View>
          <View style={styles.woFooterRight}>
            <View style={styles.dateContainer}>
              <Calendar size={12} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(wo.completed_at ?? undefined)}
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

  const technicianOptions = [
    { value: 'all', label: 'All Technicians' },
    ...uniqueTechnicians.map(t => ({ value: t.id, label: t.name }))
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Work Order History',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary + '15' }]}
              onPress={handleExportCSV}
              testID="export-csv-button"
            >
              <Download size={20} color={colors.primary} />
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
            placeholder="Search WO#, title, equipment, technician..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            testID="wo-history-search-input"
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
            <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {renderFilterChip('All', 'all', statusFilter, () => setStatusFilter('all'))}
              {renderFilterChip('Completed', 'completed', statusFilter, () => setStatusFilter('completed'), STATUS_CONFIG.completed.color)}
              {renderFilterChip('Cancelled', 'cancelled', statusFilter, () => setStatusFilter('cancelled'), STATUS_CONFIG.cancelled.color)}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
              {renderFilterChip('All', 'all', typeFilter, () => setTypeFilter('all'))}
              {Object.entries(TYPE_CONFIG).map(([key, config]) =>
                renderFilterChip(config.label, key, typeFilter, () => setTypeFilter(key as TypeFilter), config.color)
              )}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Date Range</Text>
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
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('90days')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>Last 90 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('year')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>Last Year</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickDateRange('all')}
              >
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>All Time</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Equipment & Technician</Text>
            <View style={styles.dropdownRow}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: equipmentFilter !== 'all' ? colors.primary + '15' : colors.surface,
                    borderColor: equipmentFilter !== 'all' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShowEquipmentModal(true)}
              >
                <Wrench size={16} color={equipmentFilter !== 'all' ? colors.primary : colors.textTertiary} />
                <Text 
                  style={[styles.dropdownText, { color: equipmentFilter !== 'all' ? colors.primary : colors.text }]} 
                  numberOfLines={1}
                >
                  {equipmentFilter === 'all' ? 'All Equipment' : equipmentFilter}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: technicianFilter !== 'all' ? colors.primary + '15' : colors.surface,
                    borderColor: technicianFilter !== 'all' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShowTechnicianModal(true)}
              >
                <User size={16} color={technicianFilter !== 'all' ? colors.primary : colors.textTertiary} />
                <Text 
                  style={[styles.dropdownText, { color: technicianFilter !== 'all' ? colors.primary : colors.text }]} 
                  numberOfLines={1}
                >
                  {technicianFilter === 'all' 
                    ? 'All Technicians' 
                    : uniqueTechnicians.find(t => t.id === technicianFilter)?.name || 'All Technicians'}
                </Text>
                <ChevronDown size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={[styles.clearFiltersButton, { borderColor: colors.error }]}
              onPress={handleClearFilters}
            >
              <X size={14} color={colors.error} />
              <Text style={[styles.clearFiltersText, { color: colors.error }]}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <BarChart3 size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Total</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.completed.bgColor }]}>
            <CheckCircle2 size={16} color={STATUS_CONFIG.completed.color} />
            <Text style={[styles.statValue, { color: STATUS_CONFIG.completed.color }]}>{statistics.completed}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.completed.color }]}>Completed</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: '#3B82F6' + '15' }]}>
            <Timer size={16} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.totalHours.toFixed(0)}h</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total Hours</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <TrendingUp size={16} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{statistics.avgHours.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Avg/WO</Text>
          </View>
        </View>
        
        <View style={styles.typeBreakdownRow}>
          {Object.entries(statistics.byType).map(([type, count]) => {
            if (count === 0) return null;
            const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
            return (
              <View key={type} style={[styles.typeBreakdownItem, { backgroundColor: config.color + '15' }]}>
                <Text style={[styles.typeBreakdownValue, { color: config.color }]}>{count}</Text>
                <Text style={[styles.typeBreakdownLabel, { color: config.color }]}>{config.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredWorkOrders.length} {filteredWorkOrders.length === 1 ? 'record' : 'records'}
        </Text>
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
        {isLoading ? (
          <View style={styles.emptyState}>
            <Loader2 size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Loading history...</Text>
          </View>
        ) : filteredWorkOrders.length > 0 ? (
          filteredWorkOrders.map(renderWorkOrderCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <History size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Historical Records</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {debouncedSearchQuery.trim()
                ? `No completed work orders match "${debouncedSearchQuery.trim()}"`
                : 'No completed or cancelled work orders match your filters'}
            </Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.primary }]}
                onPress={handleClearFilters}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={styles.resetButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {renderSelectionModal(
        showEquipmentModal,
        () => setShowEquipmentModal(false),
        'Select Equipment',
        equipmentOptions,
        equipmentFilter,
        setEquipmentFilter
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
              {SORT_OPTIONS.map((option) => {
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

      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedWorkOrder && (
          <View style={[styles.detailModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.detailModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.detailModalTitle, { color: colors.text }]}>
                  {selectedWorkOrder.work_order_number}
                </Text>
                <Text style={[styles.detailModalSubtitle, { color: colors.textSecondary }]}>
                  Work Order Details
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.detailCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowDetailModal(false)}
              >
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.detailCardTitle, { color: colors.text }]}>{selectedWorkOrder.title}</Text>
                  <Text style={[styles.detailCardDescription, { color: colors.textSecondary }]}>
                    {selectedWorkOrder.description}
                  </Text>
                  
                  <View style={styles.detailBadgesRow}>
                    <View style={[styles.detailBadge, { backgroundColor: STATUS_CONFIG[selectedWorkOrder.status as keyof typeof STATUS_CONFIG]?.bgColor || STATUS_CONFIG.completed.bgColor }]}>
                      <Text style={[styles.detailBadgeText, { color: STATUS_CONFIG[selectedWorkOrder.status as keyof typeof STATUS_CONFIG]?.color || STATUS_CONFIG.completed.color }]}>
                        {STATUS_CONFIG[selectedWorkOrder.status as keyof typeof STATUS_CONFIG]?.label || 'Completed'}
                      </Text>
                    </View>
                    <View style={[styles.detailBadge, { backgroundColor: TYPE_CONFIG[selectedWorkOrder.type].color + '15' }]}>
                      <Text style={[styles.detailBadgeText, { color: TYPE_CONFIG[selectedWorkOrder.type].color }]}>
                        {TYPE_CONFIG[selectedWorkOrder.type].label}
                      </Text>
                    </View>
                    <View style={[styles.detailBadge, { backgroundColor: PRIORITY_CONFIG[selectedWorkOrder.priority].bgColor }]}>
                      <Text style={[styles.detailBadgeText, { color: PRIORITY_CONFIG[selectedWorkOrder.priority].color }]}>
                        {PRIORITY_CONFIG[selectedWorkOrder.priority].label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Details</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWorkOrder.equipment || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWorkOrder.location || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedWorkOrder.assigned_name || 'Unassigned'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Created</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedWorkOrder.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Completed</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedWorkOrder.completed_at ?? undefined)}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Labor Summary</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.laborSummaryRow}>
                    <View style={styles.laborItem}>
                      <Timer size={20} color={colors.primary} />
                      <Text style={[styles.laborValue, { color: colors.text }]}>{selectedWorkOrder.estimated_hours || 0}h</Text>
                      <Text style={[styles.laborLabel, { color: colors.textTertiary }]}>Estimated</Text>
                    </View>
                    <View style={styles.laborItem}>
                      <Clock size={20} color="#10B981" />
                      <Text style={[styles.laborValue, { color: colors.text }]}>{selectedWorkOrder.actual_hours || 0}h</Text>
                      <Text style={[styles.laborLabel, { color: colors.textTertiary }]}>Actual</Text>
                    </View>
                    <View style={styles.laborItem}>
                      <Package size={20} color="#8B5CF6" />
                      <Text style={[styles.laborValue, { color: colors.text }]}>{(selectedWorkOrder as any).partsUsed || 0}</Text>
                      <Text style={[styles.laborLabel, { color: colors.textTertiary }]}>Parts Used</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {selectedWorkOrder.tasks && selectedWorkOrder.tasks.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Tasks Completed</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {selectedWorkOrder.tasks.map((task, index) => (
                      <View key={task.id} style={[styles.taskRow, index < (selectedWorkOrder.tasks?.length ?? 0) - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                        <View style={[styles.taskCheckbox, { backgroundColor: task.completed ? '#10B981' + '20' : colors.backgroundSecondary }]}>
                          {task.completed ? (
                            <CheckCircle2 size={16} color="#10B981" />
                          ) : (
                            <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
                          )}
                        </View>
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskText, { color: colors.text }]}>{task.description}</Text>
                          {task.completedAt && (
                            <Text style={[styles.taskMeta, { color: colors.textTertiary }]}>
                              {task.completedBy} • {formatDate(task.completedAt)}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {selectedWorkOrder.completion_notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Completion Notes</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                      {selectedWorkOrder.completion_notes}
                    </Text>
                  </View>
                </View>
              )}
              
              {selectedWorkOrder.notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                      {selectedWorkOrder.notes}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={{ height: 40 }} />
            </ScrollView>
            
            <View style={[styles.detailModalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  console.log('[WOHistory] Print work order:', selectedWorkOrder.work_order_number);
                }}
              >
                <Printer size={18} color={colors.text} />
                <Text style={[styles.footerButtonText, { color: colors.text }]}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.footerButtonTextPrimary}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
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
    flexDirection: 'row',
    gap: 10,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500' as const,
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
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  typeBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  typeBreakdownValue: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  typeBreakdownLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    maxWidth: 220,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
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
  woMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  woMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  woMetricText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
    flex: 1,
  },
  assigneeContainer: {
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
  },
  noAssigneeText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  woFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    gap: 8,
    marginTop: 16,
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
  detailModalContainer: {
    flex: 1,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailModalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  detailCardTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  detailCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  laborSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  laborItem: {
    alignItems: 'center',
    gap: 6,
  },
  laborValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  laborLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    lineHeight: 20,
  },
  taskMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  footerButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
