import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Search,
  X,
  Plus,
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Square,
  Filter,
  Wrench,
  FileText,
  ChevronRight,
  AlertCircle,
  Shield,
  Zap,
  Settings,
  Package,
  Gauge,
  HelpCircle,
} from 'lucide-react-native';
import {
  useDowntimeEventsQuery,
  useActiveDowntimeQuery,
  useDowntimeStatsQuery,
  useCreateDowntimeEvent,
  useResolveDowntimeEvent,
  DowntimeEvent,
  DowntimeReason,
  DowntimeImpact,
  calculateDowntimeDuration,
  formatDuration,
} from '@/hooks/useSupabaseDowntime';
import { useEquipmentQuery, ExtendedEquipment } from '@/hooks/useSupabaseEquipment';
import { DOWNTIME_REASONS, DOWNTIME_IMPACTS } from '@/constants/downtimeConstants';

type TabType = 'active' | 'history';
type DateRange = 'today' | 'week' | 'month' | 'all';

const REASON_ICONS: Record<DowntimeReason, React.ElementType> = {
  breakdown: AlertTriangle,
  planned_maintenance: Wrench,
  changeover: Settings,
  no_operator: Clock,
  material_shortage: Package,
  quality_issue: CheckCircle2,
  utility_failure: Zap,
  safety_stop: Shield,
  calibration: Gauge,
  other: HelpCircle,
};

export default function DowntimeTrackingScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDowntimeModal, setShowNewDowntimeModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);

  const [filterReason, setFilterReason] = useState<DowntimeReason | 'all'>('all');
  const [filterImpact, setFilterImpact] = useState<DowntimeImpact | 'all'>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const [resumedAt, setResumedAt] = useState<Date>(new Date());
  const [validationError, setValidationError] = useState<string | null>(null);

  const [newDowntime, setNewDowntime] = useState({
    equipment_id: '',
    equipment_name: '',
    equipment_tag: '',
    reason: '' as DowntimeReason | '',
    reason_detail: '',
    impact: '' as DowntimeImpact | '',
    notes: '',
    work_order_number: '',
  });

  const dateFilters = useMemo(() => {
    const now = new Date();
    if (dateRange === 'all') return {};
    
    let dateFrom: string;
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFrom = today.toISOString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom = weekAgo.toISOString();
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFrom = monthAgo.toISOString();
    }
    
    return { dateFrom };
  }, [dateRange]);

  const { data: allEvents = [], isLoading: eventsLoading } = useDowntimeEventsQuery({
    ...dateFilters,
    reason: filterReason !== 'all' ? filterReason : undefined,
    impact: filterImpact !== 'all' ? filterImpact : undefined,
    equipmentId: filterEquipment !== 'all' ? filterEquipment : undefined,
  });
  
  const { data: activeDowntime = [], isLoading: activeLoading } = useActiveDowntimeQuery();
  const { data: statsData } = useDowntimeStatsQuery(dateFilters);
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipmentQuery();

  const createDowntimeMutation = useCreateDowntimeEvent({
    onSuccess: () => {
      setShowNewDowntimeModal(false);
      setNewDowntime({
        equipment_id: '',
        equipment_name: '',
        equipment_tag: '',
        reason: '',
        reason_detail: '',
        impact: '',
        notes: '',
        work_order_number: '',
      });
      console.log('[Downtime] New downtime logged successfully');
    },
    onError: (error) => {
      console.error('[Downtime] Failed to create downtime:', error);
    },
  });

  const resolveDowntimeMutation = useResolveDowntimeEvent({
    onSuccess: () => {
      console.log('[Downtime] Downtime resolved successfully');
    },
    onError: (error) => {
      console.error('[Downtime] Failed to resolve downtime:', error);
    },
  });

  const equipmentList = useMemo(() => {
    return [...equipment].sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment]);

  const hasOngoingDowntime = activeDowntime.some(dt => dt.production_stopped === true);

  const calculateResumedDuration = useCallback((startTime: string, resumeTime: Date): string => {
    const start = new Date(startTime);
    const diffMs = resumeTime.getTime() - start.getTime();
    
    if (diffMs < 0) return '0m';
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  const isResumedAtValid = useCallback((startTime: string, resumeTime: Date): boolean => {
    const start = new Date(startTime);
    return resumeTime.getTime() > start.getTime();
  }, []);

  const historicalDowntime = useMemo(() => {
    let filtered = allEvents.filter(dt => dt.status === 'completed');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dt =>
        dt.equipment_name.toLowerCase().includes(query) ||
        dt.equipment_tag.toLowerCase().includes(query) ||
        dt.reason_detail?.toLowerCase().includes(query) ||
        dt.work_order_number?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [allEvents, searchQuery]);

  const stats = useMemo(() => {
    const totalHours = (statsData?.totalDowntimeMinutes || 0) / 60;
    
    const byEquipment: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    allEvents.forEach(dt => {
      const hours = calculateDowntimeDuration(dt.start_time, dt.end_time);
      byEquipment[dt.equipment_name] = (byEquipment[dt.equipment_name] || 0) + hours;
      byReason[dt.reason] = (byReason[dt.reason] || 0) + hours;
    });

    const topEquipment = Object.entries(byEquipment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topReasons = Object.entries(byReason)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalHours,
      eventCount: statsData?.totalEvents || allEvents.length,
      activeCount: activeDowntime.length,
      topEquipment,
      topReasons,
    };
  }, [allEvents, statsData, activeDowntime]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['downtime_events'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleLogDowntime = useCallback(() => {
    if (!newDowntime.equipment_id || !newDowntime.reason || !newDowntime.impact) {
      return;
    }

    createDowntimeMutation.mutate({
      equipmentId: newDowntime.equipment_id,
      equipmentName: newDowntime.equipment_name,
      equipmentTag: newDowntime.equipment_tag,
      reason: newDowntime.reason as DowntimeReason,
      reasonDetail: newDowntime.reason_detail,
      impact: newDowntime.impact as DowntimeImpact,
      notes: newDowntime.notes,
      workOrderNumber: newDowntime.work_order_number || undefined,
      reportedBy: user?.id || 'current-user',
      reportedByName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Current User' : 'Current User',
      productionStopped: newDowntime.impact === 'production',
    });
  }, [newDowntime, createDowntimeMutation, user]);

  const handleEndDowntime = useCallback((dt: DowntimeEvent) => {
    if (dt.production_stopped && !isResumedAtValid(dt.start_time, resumedAt)) {
      setValidationError('Resumed time must be after the downtime start time');
      return;
    }

    resolveDowntimeMutation.mutate({
      id: dt.id,
      resolvedBy: user?.id || 'current-user',
      resolvedByName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Current User' : 'Current User',
      endTime: dt.production_stopped ? resumedAt.toISOString() : undefined,
    });
  }, [resolveDowntimeMutation, user, resumedAt, isResumedAtValid]);

  const selectEquipment = useCallback((eq: ExtendedEquipment) => {
    setNewDowntime(prev => ({
      ...prev,
      equipment_id: eq.id,
      equipment_name: eq.name,
      equipment_tag: eq.equipment_tag || eq.id.slice(-8).toUpperCase(),
    }));
    setShowEquipmentModal(false);
  }, []);

  const getReasonConfig = (reason: DowntimeReason) => {
    return DOWNTIME_REASONS.find(r => r.value === reason) || DOWNTIME_REASONS[DOWNTIME_REASONS.length - 1];
  };

  const getImpactConfig = (impact: DowntimeImpact) => {
    return DOWNTIME_IMPACTS.find(i => i.value === impact) || DOWNTIME_IMPACTS[DOWNTIME_IMPACTS.length - 1];
  };

  const _isLoading = eventsLoading || activeLoading;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center' as const,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center' as const,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center' as const,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    badge: {
      backgroundColor: '#DC2626',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    filterBar: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: colors.text,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    dateRangeRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 8,
      backgroundColor: colors.surface,
    },
    dateChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    dateChipActive: {
      backgroundColor: colors.primary,
    },
    dateChipText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    dateChipTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    activeCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#DC2626',
    },
    activeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start' as const,
      marginBottom: 12,
    },
    activeEquipment: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    activeTag: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    timerContainer: {
      alignItems: 'flex-end' as const,
    },
    timerValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#DC2626',
    },
    timerLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    activeDetails: {
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      gap: 8,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    reasonBadge: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      gap: 4,
    },
    reasonText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    impactBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    impactText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    endButton: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: '#10B981',
      borderRadius: 8,
      paddingVertical: 10,
      marginTop: 12,
      gap: 6,
    },
    endButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    historyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start' as const,
      marginBottom: 8,
    },
    historyEquipment: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    historyTag: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    historyDuration: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    historyMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    historyDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    woLink: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      gap: 4,
      marginTop: 8,
    },
    woLinkText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center' as const,
    },
    fab: {
      position: 'absolute' as const,
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center' as const,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 16,
    },
    formGroup: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 8,
    },
    formRequired: {
      color: '#DC2626',
    },
    selectButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectButtonText: {
      fontSize: 14,
      color: colors.text,
    },
    selectButtonPlaceholder: {
      color: colors.textSecondary,
    },
    textInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center' as const,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center' as const,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    listModal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    listItemSelected: {
      backgroundColor: `${colors.primary}15`,
    },
    listItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    listItemText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    listItemSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    checkIcon: {
      width: 24,
    },
    summarySection: {
      marginTop: 8,
    },
    summaryCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    summaryTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    summaryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center' as const,
      paddingVertical: 4,
    },
    summaryItemName: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    summaryItemValue: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    durationDisplay: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      marginTop: 12,
      padding: 12,
      backgroundColor: `${colors.primary}10`,
      borderRadius: 8,
      gap: 8,
    },
    durationLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    durationValue: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.primary,
    },
    validationErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center' as const,
      marginTop: 8,
      padding: 10,
      backgroundColor: '#DC262615',
      borderRadius: 8,
      gap: 8,
    },
    validationErrorText: {
      fontSize: 13,
      color: '#DC2626',
      flex: 1,
    },
    endButtonDisabled: {
      backgroundColor: '#9CA3AF',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 40,
    },
  });

  const renderActiveDowntime = () => {
    if (activeLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading active downtime...</Text>
        </View>
      );
    }

    if (activeDowntime.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <CheckCircle2 size={48} color="#10B981" />
          </View>
          <Text style={styles.emptyTitle}>All Systems Operational</Text>
          <Text style={styles.emptyText}>No equipment is currently down</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currently Down ({activeDowntime.length})</Text>
        {activeDowntime.map(dt => {
          const duration = calculateDowntimeDuration(dt.start_time, undefined);
          const reasonConfig = getReasonConfig(dt.reason);
          const impactConfig = getImpactConfig(dt.impact);
          const ReasonIcon = REASON_ICONS[dt.reason];

          return (
            <View key={dt.id} style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View>
                  <Text style={styles.activeEquipment}>{dt.equipment_name}</Text>
                  <Text style={styles.activeTag}>{dt.equipment_tag}</Text>
                </View>
                <View style={styles.timerContainer}>
                  <Text style={styles.timerValue}>{formatDuration(duration)}</Text>
                  <Text style={styles.timerLabel}>DOWNTIME</Text>
                </View>
              </View>

              <View style={styles.activeDetails}>
                <View style={styles.detailRow}>
                  <View style={[styles.reasonBadge, { backgroundColor: `${reasonConfig.color}20` }]}>
                    <ReasonIcon size={14} color={reasonConfig.color} />
                    <Text style={[styles.reasonText, { color: reasonConfig.color }]}>
                      {reasonConfig.label}
                    </Text>
                  </View>
                  <View style={[styles.impactBadge, { backgroundColor: `${impactConfig.color}20` }]}>
                    <Text style={[styles.impactText, { color: impactConfig.color }]}>
                      {impactConfig.label.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {dt.reason_detail && (
                  <Text style={styles.detailText}>{dt.reason_detail}</Text>
                )}

                {dt.work_order_number && (
                  <TouchableOpacity style={styles.woLink}>
                    <FileText size={14} color={colors.primary} />
                    <Text style={styles.woLinkText}>{dt.work_order_number}</Text>
                    <ChevronRight size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {hasOngoingDowntime && dt.production_stopped && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.formLabel, { marginBottom: 8 }]}>Production Resumed At <Text style={styles.formRequired}>*</Text></Text>
                  <DateTimePicker
                    value={resumedAt}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setResumedAt(selectedDate);
                        setValidationError(null);
                      }
                    }}
                  />
                  <View style={styles.durationDisplay}>
                    <Clock size={16} color={colors.primary} />
                    <Text style={styles.durationLabel}>Duration:</Text>
                    <Text style={styles.durationValue}>
                      {calculateResumedDuration(dt.start_time, resumedAt)}
                    </Text>
                  </View>
                  {validationError && (
                    <View style={styles.validationErrorContainer}>
                      <AlertCircle size={16} color="#DC2626" />
                      <Text style={styles.validationErrorText}>{validationError}</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.endButton,
                  (dt.production_stopped && !isResumedAtValid(dt.start_time, resumedAt)) && styles.endButtonDisabled,
                  resolveDowntimeMutation.isPending && styles.endButtonDisabled
                ]}
                onPress={() => handleEndDowntime(dt)}
                disabled={resolveDowntimeMutation.isPending}
              >
                <Square size={16} color="#FFFFFF" />
                <Text style={styles.endButtonText}>
                  {resolveDowntimeMutation.isPending ? 'Ending...' : 'End Downtime'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderHistoricalDowntime = () => {
    if (eventsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading history...</Text>
        </View>
      );
    }

    if (historicalDowntime.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Clock size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        {historicalDowntime.map(dt => {
          const duration = calculateDowntimeDuration(dt.start_time, dt.end_time);
          const reasonConfig = getReasonConfig(dt.reason);
          const impactConfig = getImpactConfig(dt.impact);
          const ReasonIcon = REASON_ICONS[dt.reason];

          return (
            <View key={dt.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyEquipment}>{dt.equipment_name}</Text>
                  <Text style={styles.historyTag}>{dt.equipment_tag}</Text>
                </View>
                <Text style={styles.historyDuration}>{formatDuration(duration)}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.reasonBadge, { backgroundColor: `${reasonConfig.color}20` }]}>
                  <ReasonIcon size={12} color={reasonConfig.color} />
                  <Text style={[styles.reasonText, { color: reasonConfig.color, fontSize: 11 }]}>
                    {reasonConfig.label}
                  </Text>
                </View>
                <View style={[styles.impactBadge, { backgroundColor: `${impactConfig.color}20` }]}>
                  <Text style={[styles.impactText, { color: impactConfig.color, fontSize: 10 }]}>
                    {impactConfig.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              {dt.reason_detail && (
                <Text style={[styles.detailText, { marginTop: 8 }]}>{dt.reason_detail}</Text>
              )}

              <View style={styles.historyMeta}>
                <Text style={styles.historyDate}>
                  {new Date(dt.start_time).toLocaleDateString()} {new Date(dt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {dt.resolved_by_name && (
                  <Text style={styles.historyDate}>Resolved by {dt.resolved_by_name}</Text>
                )}
              </View>

              {dt.work_order_number && (
                <TouchableOpacity style={styles.woLink}>
                  <FileText size={14} color={colors.primary} />
                  <Text style={styles.woLinkText}>{dt.work_order_number}</Text>
                  <ChevronRight size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const isFormValid = newDowntime.equipment_id && newDowntime.reason && newDowntime.impact;
  const hasActiveFilters = filterReason !== 'all' || filterImpact !== 'all' || filterEquipment !== 'all';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Downtime Tracking' }} />

      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#DC262615' }]}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(stats.totalHours)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.eventCount}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                Active
              </Text>
              {stats.activeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{stats.activeCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'history' && (
        <>
          <View style={styles.filterBar}>
            <View style={styles.searchContainer}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search equipment, WO#..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={20} color={hasActiveFilters ? '#FFFFFF' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateRangeRow}>
            {(['today', 'week', 'month', 'all'] as DateRange[]).map(range => (
              <TouchableOpacity
                key={range}
                style={[styles.dateChip, dateRange === range && styles.dateChipActive]}
                onPress={() => setDateRange(range)}
              >
                <Text style={[styles.dateChipText, dateRange === range && styles.dateChipTextActive]}>
                  {range === 'today' ? 'Today' : range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'active' ? renderActiveDowntime() : renderHistoricalDowntime()}

        {activeTab === 'active' && stats.topEquipment.length > 0 && (
          <View style={[styles.section, styles.summarySection]}>
            <Text style={styles.sectionTitle}>This Month Summary</Text>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>TOP EQUIPMENT BY DOWNTIME</Text>
              {stats.topEquipment.map(([name, hours], idx) => (
                <View key={idx} style={styles.summaryItem}>
                  <Text style={styles.summaryItemName}>{name}</Text>
                  <Text style={styles.summaryItemValue}>{formatDuration(hours)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>TOP REASONS</Text>
              {stats.topReasons.map(([reason, hours], idx) => {
                const config = getReasonConfig(reason as DowntimeReason);
                return (
                  <View key={idx} style={styles.summaryItem}>
                    <Text style={styles.summaryItemName}>{config.label}</Text>
                    <Text style={styles.summaryItemValue}>{formatDuration(hours)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewDowntimeModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={showNewDowntimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewDowntimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Downtime</Text>
              <TouchableOpacity onPress={() => setShowNewDowntimeModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Equipment <Text style={styles.formRequired}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowEquipmentModal(true)}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !newDowntime.equipment_id && styles.selectButtonPlaceholder
                  ]}>
                    {newDowntime.equipment_name || 'Select equipment'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Reason <Text style={styles.formRequired}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowReasonModal(true)}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !newDowntime.reason && styles.selectButtonPlaceholder
                  ]}>
                    {newDowntime.reason ? getReasonConfig(newDowntime.reason as DowntimeReason).label : 'Select reason'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason Detail</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the issue..."
                  placeholderTextColor={colors.textSecondary}
                  value={newDowntime.reason_detail}
                  onChangeText={(text) => setNewDowntime(prev => ({ ...prev, reason_detail: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Impact <Text style={styles.formRequired}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowImpactModal(true)}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !newDowntime.impact && styles.selectButtonPlaceholder
                  ]}>
                    {newDowntime.impact ? getImpactConfig(newDowntime.impact as DowntimeImpact).label : 'Select impact'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Related Work Order</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="WO-2026-XXXX"
                  placeholderTextColor={colors.textSecondary}
                  value={newDowntime.work_order_number}
                  onChangeText={(text) => setNewDowntime(prev => ({ ...prev, work_order_number: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  value={newDowntime.notes}
                  onChangeText={(text) => setNewDowntime(prev => ({ ...prev, notes: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewDowntimeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (!isFormValid || createDowntimeMutation.isPending) && styles.submitButtonDisabled
                ]}
                onPress={handleLogDowntime}
                disabled={!isFormValid || createDowntimeMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createDowntimeMutation.isPending ? 'Creating...' : 'Start Downtime'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEquipmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEquipmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Equipment</Text>
              <TouchableOpacity onPress={() => setShowEquipmentModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {equipmentLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : equipmentList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No equipment found</Text>
                </View>
              ) : (
                equipmentList.map(eq => (
                  <TouchableOpacity
                    key={eq.id}
                    style={[
                      styles.listItem,
                      newDowntime.equipment_id === eq.id && styles.listItemSelected
                    ]}
                    onPress={() => selectEquipment(eq)}
                  >
                    <View style={[styles.listItemIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Wrench size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemText}>{eq.name}</Text>
                      <Text style={styles.listItemSubtext}>
                        {eq.equipment_tag || eq.id.slice(-8).toUpperCase()} • {eq.location || 'No location'}
                      </Text>
                    </View>
                    {newDowntime.equipment_id === eq.id && (
                      <CheckCircle2 size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reason</Text>
              <TouchableOpacity onPress={() => setShowReasonModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {DOWNTIME_REASONS.map(reason => {
                const Icon = REASON_ICONS[reason.value];
                return (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.listItem,
                      newDowntime.reason === reason.value && styles.listItemSelected
                    ]}
                    onPress={() => {
                      setNewDowntime(prev => ({ ...prev, reason: reason.value }));
                      setShowReasonModal(false);
                    }}
                  >
                    <View style={[styles.listItemIcon, { backgroundColor: reason.color + '20' }]}>
                      <Icon size={18} color={reason.color} />
                    </View>
                    <Text style={styles.listItemText}>{reason.label}</Text>
                    {newDowntime.reason === reason.value && (
                      <CheckCircle2 size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showImpactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImpactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Impact</Text>
              <TouchableOpacity onPress={() => setShowImpactModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {DOWNTIME_IMPACTS.map(impact => (
                <TouchableOpacity
                  key={impact.value}
                  style={[
                    styles.listItem,
                    newDowntime.impact === impact.value && styles.listItemSelected
                  ]}
                  onPress={() => {
                    setNewDowntime(prev => ({ ...prev, impact: impact.value }));
                    setShowImpactModal(false);
                  }}
                >
                  <View style={[styles.listItemIcon, { backgroundColor: impact.color + '20' }]}>
                    <AlertCircle size={18} color={impact.color} />
                  </View>
                  <Text style={styles.listItemText}>{impact.label}</Text>
                  {newDowntime.impact === impact.value && (
                    <CheckCircle2 size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Impact</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.dateChip, filterImpact === 'all' && styles.dateChipActive]}
                    onPress={() => setFilterImpact('all')}
                  >
                    <Text style={[styles.dateChipText, filterImpact === 'all' && styles.dateChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {DOWNTIME_IMPACTS.map(impact => (
                    <TouchableOpacity
                      key={impact.value}
                      style={[styles.dateChip, filterImpact === impact.value && styles.dateChipActive]}
                      onPress={() => setFilterImpact(impact.value)}
                    >
                      <Text style={[styles.dateChipText, filterImpact === impact.value && styles.dateChipTextActive]}>
                        {impact.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Reason Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.dateChip, filterReason === 'all' && styles.dateChipActive]}
                    onPress={() => setFilterReason('all')}
                  >
                    <Text style={[styles.dateChipText, filterReason === 'all' && styles.dateChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {DOWNTIME_REASONS.slice(0, 5).map(reason => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[styles.dateChip, filterReason === reason.value && styles.dateChipActive]}
                      onPress={() => setFilterReason(reason.value)}
                    >
                      <Text style={[styles.dateChipText, filterReason === reason.value && styles.dateChipTextActive]}>
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setFilterReason('all');
                  setFilterImpact('all');
                  setFilterEquipment('all');
                }}
              >
                <Text style={styles.cancelButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.submitButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
