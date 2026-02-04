import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useEquipmentQuery } from '@/hooks/useSupabaseEquipment';
import {
  ChevronDown,
  X,
  Check,
  Download,
  Wrench,
  Calendar,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Timer,
  TrendingDown,
  Cog,
  User,
  FileText,
  History,
} from 'lucide-react-native';
import { useWorkOrdersQuery, type ExtendedWorkOrder } from '@/hooks/useSupabaseWorkOrders';
import { usePMSchedulesQuery, type ExtendedPMSchedule } from '@/hooks/useSupabasePMSchedules';
import { useEquipmentDowntimeQuery, type DowntimeEvent, calculateDowntimeDuration } from '@/hooks/useSupabaseDowntime';
import { useEquipmentPartsUsageQuery, type PartUsageRecord } from '@/hooks/useSupabasePartsUsage';

type TabType = 'workorders' | 'pms' | 'parts' | 'downtime';

type DowntimeWithDuration = DowntimeEvent & { duration_hours: number };

const REASON_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  breakdown: { label: 'Breakdown', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  planned_maintenance: { label: 'Planned Maintenance', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  changeover: { label: 'Changeover', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  no_operator: { label: 'No Operator', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  material_shortage: { label: 'Material Shortage', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
  quality_issue: { label: 'Quality Issue', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  utility_failure: { label: 'Utility Failure', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  safety_stop: { label: 'Safety Stop', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)' },
  calibration: { label: 'Calibration', color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.15)' },
  other: { label: 'Other', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const IMPACT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  production: { label: 'Production', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.15)' },
  quality: { label: 'Quality', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  safety: { label: 'Safety', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  minor: { label: 'Minor', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#3B82F6', icon: Clock },
  in_progress: { label: 'In Progress', color: '#F59E0B', icon: Wrench },
  completed: { label: 'Completed', color: '#10B981', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', color: '#6B7280', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: XCircle },
  scheduled: { label: 'Scheduled', color: '#3B82F6', icon: Calendar },
  overdue: { label: 'Overdue', color: '#DC2626', icon: AlertTriangle },
  skipped: { label: 'Skipped', color: '#6B7280', icon: XCircle },
};

const TYPE_CONFIG = {
  corrective: { label: 'Corrective', color: '#EF4444' },
  preventive: { label: 'Preventive', color: '#3B82F6' },
  emergency: { label: 'Emergency', color: '#DC2626' },
  request: { label: 'Request', color: '#8B5CF6' },
};

export default function EquipmentHistoryScreen() {
  const { colors } = useTheme();
  const { data: equipment = [], refetch: refetchEquipment } = useEquipmentQuery();
  const { data: workOrders = [], refetch: refetchWorkOrders } = useWorkOrdersQuery();
  const { data: pmSchedules = [], refetch: refetchPMs } = usePMSchedulesQuery();
  
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('workorders');
  const [refreshing, setRefreshing] = useState(false);

  const { data: downtimeEvents = [], refetch: refetchDowntime } = useEquipmentDowntimeQuery(selectedEquipmentId || null);
  const { data: partsUsage = [], refetch: refetchParts } = useEquipmentPartsUsageQuery(selectedEquipmentId || null);

  const equipmentList = useMemo(() => {
    return equipment;
  }, [equipment]);

  const selectedEquipment = useMemo(() => {
    return equipmentList.find(e => e.id === selectedEquipmentId);
  }, [equipmentList, selectedEquipmentId]);

  const workOrdersForEquipment = useMemo(() => {
    if (!selectedEquipmentId) return [];
    return workOrders.filter(wo => wo.equipment_id === selectedEquipmentId);
  }, [selectedEquipmentId, workOrders]);

  const pmsForEquipment = useMemo(() => {
    if (!selectedEquipmentId) return [];
    return pmSchedules.filter(pm => pm.equipment_id === selectedEquipmentId);
  }, [selectedEquipmentId, pmSchedules]);

  const partsForEquipment = partsUsage;

  const downtimeForEquipment = useMemo((): DowntimeWithDuration[] => {
    return downtimeEvents.map(dt => ({
      ...dt,
      duration_hours: dt.duration_minutes ? dt.duration_minutes / 60 : calculateDowntimeDuration(dt.start_time, dt.end_time),
    }));
  }, [downtimeEvents]);

  const statistics = useMemo(() => {
    const totalDowntime = downtimeForEquipment.reduce((sum, d) => sum + d.duration_hours, 0);
    const totalPartsCost = partsForEquipment.reduce((sum, p) => sum + p.total_cost, 0);
    const completedPMs = pmsForEquipment.filter(pm => pm.last_completed !== null).length;
    const totalWOs = workOrdersForEquipment.length;

    return {
      totalDowntime,
      totalPartsCost,
      completedPMs,
      totalWOs,
    };
  }, [downtimeForEquipment, partsForEquipment, pmsForEquipment, workOrdersForEquipment]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[EquipmentHistory] Refreshing...');
    await Promise.all([
      refetchEquipment(),
      refetchWorkOrders(),
      refetchPMs(),
      refetchDowntime(),
      refetchParts(),
    ]);
    setRefreshing(false);
  }, [refetchEquipment, refetchWorkOrders, refetchPMs, refetchDowntime, refetchParts]);

  const handleExport = useCallback(async (tab: TabType) => {
    console.log('[EquipmentHistory] Exporting:', tab);
    let csvContent = '';
    const equipmentName = selectedEquipment?.name || 'Unknown';

    switch (tab) {
      case 'workorders':
        csvContent = 'WO Number,Title,Type,Priority,Status,Date\n';
        workOrdersForEquipment.forEach(wo => {
          csvContent += `"${wo.work_order_number}","${wo.title}","${wo.type}","${wo.priority}","${wo.status}","${wo.created_at}"\n`;
        });
        break;
      case 'pms':
        csvContent = 'Name,Frequency,Next Due,Last Completed,Technician\n';
        pmsForEquipment.forEach(pm => {
          csvContent += `"${pm.name}","${pm.frequency}","${pm.next_due}","${pm.last_completed || ''}","${pm.assigned_name || ''}"\n`;
        });
        break;
      case 'parts':
        csvContent = 'Part SKU,Part Name,Quantity,Unit Cost,Total,Work Order,Date\n';
        partsForEquipment.forEach(p => {
          csvContent += `"${p.material_sku}","${p.material_name}",${p.quantity_used},${p.unit_cost},${p.total_cost},"${p.work_order_number}","${p.used_date}"\n`;
        });
        break;
      case 'downtime':
        csvContent = 'Start Time,Duration (hrs),Reason,Impact,Details,Work Order\n';
        downtimeForEquipment.forEach(d => {
          csvContent += `"${d.start_time}",${d.duration_hours.toFixed(2)},"${d.reason}","${d.impact}","${d.reason_detail || ''}","${d.work_order_number || ''}"\n`;
        });
        break;
    }

    try {
      await Share.share({
        message: csvContent,
        title: `${equipmentName} - ${tab} Export`,
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [selectedEquipment, workOrdersForEquipment, pmsForEquipment, partsForEquipment, downtimeForEquipment]);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  const renderTab = (tab: TabType, label: string, icon: React.ReactNode, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          {
            backgroundColor: isActive ? colors.primary + '15' : 'transparent',
            borderBottomColor: isActive ? colors.primary : 'transparent',
          },
        ]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.7}
      >
        {icon}
        <Text
          style={[
            styles.tabText,
            { color: isActive ? colors.primary : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : colors.textTertiary }]}>
            <Text style={styles.tabBadgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderWorkOrderCard = (wo: ExtendedWorkOrder) => {
    const statusConfig = STATUS_CONFIG[wo.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
    const typeConfig = TYPE_CONFIG[wo.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.corrective;
    const StatusIcon = statusConfig.icon;

    return (
      <View
        key={wo.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.woNumberBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Wrench size={12} color={colors.textSecondary} />
            <Text style={[styles.woNumber, { color: colors.text }]}>{wo.work_order_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <StatusIcon size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{wo.title}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
            <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatDate(wo.created_at)}</Text>
          </View>
          {wo.assigned_name && (
            <View style={styles.metaItem}>
              <User size={12} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{wo.assigned_name}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPMCard = (pm: ExtendedPMSchedule) => {
    const pmStatus = pm.active ? 'scheduled' : 'cancelled';
    const statusConfig = STATUS_CONFIG[pmStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
    const StatusIcon = statusConfig.icon;

    return (
      <View
        key={pm.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.woNumberBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <ClipboardList size={12} color={colors.textSecondary} />
            <Text style={[styles.woNumber, { color: colors.text }]}>{pm.equipment_tag || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <StatusIcon size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{pm.name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Next Due: {formatDate(pm.next_due)}
            </Text>
          </View>
          {pm.last_completed && (
            <View style={styles.metaItem}>
              <CheckCircle2 size={12} color="#10B981" />
              <Text style={[styles.metaText, { color: '#10B981' }]}>
                Last: {formatDate(pm.last_completed)}
              </Text>
            </View>
          )}
          {pm.assigned_name && (
            <View style={styles.metaItem}>
              <User size={12} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{pm.assigned_name}</Text>
            </View>
          )}
        </View>
        {pm.estimated_hours && (
          <View style={[styles.laborRow, { borderTopColor: colors.border }]}>
            <Timer size={14} color={colors.primary} />
            <Text style={[styles.laborText, { color: colors.text }]}>{pm.estimated_hours}h estimated</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPartCard = (part: PartUsageRecord) => {
    return (
      <View
        key={part.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.woNumberBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Package size={12} color={colors.textSecondary} />
            <Text style={[styles.woNumber, { color: colors.text }]}>{part.material_sku}</Text>
          </View>
          <Text style={[styles.costText, { color: colors.primary }]}>${(part.total_cost || 0).toFixed(2)}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{part.material_name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={[styles.qtyText, { color: colors.textSecondary }]}>
              Qty: {part.quantity_used} × ${(part.unit_cost || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatDate(part.used_date)}</Text>
          </View>
        </View>
        <View style={[styles.woRefRow, { borderTopColor: colors.border }]}>
          <FileText size={12} color={colors.textTertiary} />
          <Text style={[styles.woRefText, { color: colors.textSecondary }]}>{part.work_order_number || 'N/A'}</Text>
          <Text style={[styles.usedByText, { color: colors.textTertiary }]}>by {part.used_by_name || part.used_by}</Text>
        </View>
      </View>
    );
  };

  const renderDowntimeCard = (dt: DowntimeWithDuration) => {
    const reasonConfig = REASON_CONFIG[dt.reason] || REASON_CONFIG.other;
    const impactConfig = IMPACT_CONFIG[dt.impact] || IMPACT_CONFIG.minor;

    return (
      <View
        key={dt.id}
        style={[
          styles.card, 
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: reasonConfig.color,
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: reasonConfig.bgColor }]}>
            <Text style={[styles.categoryText, { color: reasonConfig.color }]}>{reasonConfig.label}</Text>
          </View>
          <View style={[styles.impactBadge, { backgroundColor: impactConfig.bgColor }]}>
            <Text style={[styles.impactText, { color: impactConfig.color }]}>{impactConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{dt.reason_detail || reasonConfig.label}</Text>
        <View style={styles.downtimeStats}>
          <View style={[styles.durationBox, { backgroundColor: colors.backgroundSecondary }]}>
            <TrendingDown size={16} color="#EF4444" />
            <Text style={[styles.durationValue, { color: colors.text }]}>{dt.duration_hours}h</Text>
            <Text style={[styles.durationLabel, { color: colors.textTertiary }]}>Downtime</Text>
          </View>
          <View style={styles.timeInfo}>
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Start: {formatDateTime(dt.start_time)}
              </Text>
            </View>
            {dt.end_time && (
              <View style={styles.metaItem}>
                <CheckCircle2 size={12} color="#10B981" />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  End: {formatDateTime(dt.end_time)}
                </Text>
              </View>
            )}
          </View>
        </View>
        {dt.work_order_number && (
          <View style={[styles.woRefRow, { borderTopColor: colors.border }]}>
            <Wrench size={12} color={colors.textTertiary} />
            <Text style={[styles.woRefText, { color: colors.primary }]}>{dt.work_order_number}</Text>
          </View>
        )}
        {dt.notes && (
          <Text style={[styles.notesText, { color: colors.textTertiary }]} numberOfLines={2}>{dt.notes}</Text>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (!selectedEquipmentId) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
            <Cog size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Select Equipment</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Choose a piece of equipment above to view its maintenance history
          </Text>
        </View>
      );
    }

    const data = activeTab === 'workorders' ? workOrdersForEquipment :
                 activeTab === 'pms' ? pmsForEquipment :
                 activeTab === 'parts' ? partsForEquipment :
                 downtimeForEquipment;

    if (data.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
            <History size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Records Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No {activeTab === 'workorders' ? 'work orders' : 
                activeTab === 'pms' ? 'PM records' : 
                activeTab === 'parts' ? 'parts usage' : 'downtime events'} for this equipment
          </Text>
        </View>
      );
    }

    return (
      <>
        {activeTab === 'workorders' && workOrdersForEquipment.map(renderWorkOrderCard)}
        {activeTab === 'pms' && pmsForEquipment.map(renderPMCard)}
        {activeTab === 'parts' && partsForEquipment.map(renderPartCard)}
        {activeTab === 'downtime' && downtimeForEquipment.map(renderDowntimeCard)}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Equipment History',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.selectorSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Select Equipment</Text>
        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
          onPress={() => setShowEquipmentModal(true)}
          activeOpacity={0.7}
        >
          <Cog size={20} color={selectedEquipment ? colors.primary : colors.textTertiary} />
          <Text 
            style={[
              styles.selectorText, 
              { color: selectedEquipment ? colors.text : colors.textTertiary }
            ]} 
            numberOfLines={1}
          >
            {selectedEquipment ? selectedEquipment.name : 'Choose equipment...'}
          </Text>
          <ChevronDown size={20} color={colors.textTertiary} />
        </TouchableOpacity>
        {selectedEquipment && (
          <View style={styles.equipmentInfo}>
            <Text style={[styles.equipmentTag, { color: colors.primary }]}>{selectedEquipment.equipment_tag}</Text>
            <Text style={[styles.equipmentLocation, { color: colors.textSecondary }]}>
              {selectedEquipment.location || 'No location'}
            </Text>
          </View>
        )}
      </View>

      {selectedEquipmentId && (
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.statItem, { backgroundColor: '#3B82F6' + '15' }]}>
            <Wrench size={16} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.totalWOs}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Work Orders</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#10B981' + '15' }]}>
            <ClipboardList size={16} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.completedPMs}</Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>PMs Done</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Package size={16} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>${statistics.totalPartsCost.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Parts Cost</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#EF4444' + '15' }]}>
            <TrendingDown size={16} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{statistics.totalDowntime.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Downtime</Text>
          </View>
        </View>
      )}

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {renderTab('workorders', 'Work Orders', <Wrench size={16} color={activeTab === 'workorders' ? colors.primary : colors.textSecondary} />, workOrdersForEquipment.length)}
          {renderTab('pms', 'PMs', <ClipboardList size={16} color={activeTab === 'pms' ? colors.primary : colors.textSecondary} />, pmsForEquipment.length)}
          {renderTab('parts', 'Parts Used', <Package size={16} color={activeTab === 'parts' ? colors.primary : colors.textSecondary} />, partsForEquipment.length)}
          {renderTab('downtime', 'Downtime', <TrendingDown size={16} color={activeTab === 'downtime' ? colors.primary : colors.textSecondary} />, downtimeForEquipment.length)}
        </ScrollView>
        {selectedEquipmentId && (
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => handleExport(activeTab)}
            activeOpacity={0.7}
          >
            <Download size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
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
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showEquipmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEquipmentModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEquipmentModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Equipment</Text>
              <TouchableOpacity onPress={() => setShowEquipmentModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {equipmentList.map((equip) => (
                <TouchableOpacity
                  key={equip.id}
                  style={[
                    styles.equipmentOption,
                    { borderBottomColor: colors.border },
                    selectedEquipmentId === equip.id && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    setSelectedEquipmentId(equip.id);
                    setShowEquipmentModal(false);
                  }}
                >
                  <View style={[styles.equipmentIconSmall, { backgroundColor: colors.backgroundSecondary }]}>
                    <Cog size={20} color={colors.primary} />
                  </View>
                  <View style={styles.equipmentOptionInfo}>
                    <Text style={[styles.equipmentOptionName, { color: colors.text }]}>{equip.name}</Text>
                    <Text style={[styles.equipmentOptionMeta, { color: colors.textSecondary }]}>
                      {equip.equipment_tag} • {equip.location || 'No location'}
                    </Text>
                  </View>
                  {selectedEquipmentId === equip.id && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
  selectorSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  equipmentTag: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  equipmentLocation: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingRight: 8,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 12,
    fontWeight: '700' as const,
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
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  laborRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  laborText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  costText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  woRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  woRefText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  usedByText: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  impactBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  downtimeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationBox: {
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  durationValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  timeInfo: {
    flex: 1,
    gap: 6,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
    fontWeight: '700' as const,
  },
  modalScroll: {
    maxHeight: 400,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  equipmentIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  equipmentOptionInfo: {
    flex: 1,
  },
  equipmentOptionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  equipmentOptionMeta: {
    fontSize: 12,
  },
});
