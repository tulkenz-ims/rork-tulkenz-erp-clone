import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  FileText,
  Truck,
  Clock,
  TrendingDown,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings2,
  Check,
  Square,
  CheckSquare,
  CheckCircle2,
  Minus,
  ClipboardList,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseLowStockAlerts, LowStockAlert } from '@/hooks/useSupabaseLowStockAlerts';
import { useLowStockMaterials, useUpdateMaterial } from '@/hooks/useSupabaseMaterials';
import * as Haptics from 'expo-haptics';

type LowStockAlertSeverity = 'info' | 'warning' | 'critical';

interface LowStockAlertsProps {
  visible: boolean;
  onClose: () => void;
  onMaterialPress?: (materialId: string) => void;
  onCreatePurchaseRequest?: (materialId: string) => void;
  onAdjustReorderPoint?: (materialId: string, newMinLevel: number, newMaxLevel?: number) => Promise<boolean>;
  onAcknowledgeAlerts?: (alertIds: string[]) => Promise<boolean>;
}

interface ReorderPointEditState {
  isOpen: boolean;
  materialId: string;
  materialName: string;
  currentMinLevel: number;
  currentMaxLevel: number;
  suggestedMin: number | null;
  newMinLevel: string;
  newMaxLevel: string;
  isSubmitting: boolean;
  showSuccess: boolean;
}

interface EnhancedLowStockAlert {
  id: string;
  materialId: string;
  materialSku: string;
  materialName: string;
  currentStock: number;
  minLevel: number;
  maxLevel: number;
  percentOfMin: number;
  severity: LowStockAlertSeverity;
  daysUntilStockout: number | null;
  avgDailyUsage: number;
  suggestedReorderQty: number;
  recentWorkOrders: {
    workOrderId: string;
    workOrderNumber: string;
    quantityUsed: number;
    usedAt: string;
  }[];
  pendingPartRequests: {
    requestId: string;
    requestNumber: string;
    quantityRequested: number;
    status: string;
  }[];
  vendor: string | null;
  leadTimeDays: number | null;
  location: string | null;
}

export default function LowStockAlerts({
  visible,
  onClose,
  onMaterialPress,
  onCreatePurchaseRequest,
  onAdjustReorderPoint,
  onAcknowledgeAlerts,
}: LowStockAlertsProps) {
  const { colors } = useTheme();
  const { userProfile } = useUser();
  
  const {
    activeAlerts,
    acknowledgeAlert,
  } = useSupabaseLowStockAlerts();
  
  const { data: lowStockMaterials = [] } = useLowStockMaterials();
  const updateMaterialMutation = useUpdateMaterial();
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<LowStockAlertSeverity | 'all'>('all');
  const [reorderPointEdit, setReorderPointEdit] = useState<ReorderPointEditState>({
    isOpen: false,
    materialId: '',
    materialName: '',
    currentMinLevel: 0,
    currentMaxLevel: 0,
    suggestedMin: null,
    newMinLevel: '',
    newMaxLevel: '',
    isSubmitting: false,
    showSuccess: false,
  });
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const alerts = useMemo((): EnhancedLowStockAlert[] => {
    if (activeAlerts.length > 0) {
      return activeAlerts.map((alert: LowStockAlert) => {
        const percentOfMin = alert.percent_of_min ?? 
          (alert.min_level > 0 ? Math.round((alert.current_stock / alert.min_level) * 100) : 0);
        
        const avgDailyUsage = 0;
        const daysUntilStockout = avgDailyUsage > 0 
          ? Math.floor(alert.current_stock / avgDailyUsage) 
          : null;

        return {
          id: alert.id,
          materialId: alert.material_id,
          materialSku: alert.material_sku,
          materialName: alert.material_name,
          currentStock: alert.current_stock,
          minLevel: alert.min_level,
          maxLevel: alert.min_level * 2,
          percentOfMin,
          severity: alert.severity,
          daysUntilStockout,
          avgDailyUsage,
          suggestedReorderQty: Math.max((alert.min_level * 2) - alert.current_stock, alert.min_level),
          recentWorkOrders: [],
          pendingPartRequests: alert.pending_po_id ? [{
            requestId: alert.pending_po_id,
            requestNumber: alert.pending_po_number || 'Unknown',
            quantityRequested: alert.pending_po_qty || 0,
            status: 'pending',
          }] : [],
          vendor: null,
          leadTimeDays: null,
          location: alert.facility_name || null,
        };
      }).sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.percentOfMin - b.percentOfMin;
      });
    }

    return lowStockMaterials.map(m => {
      const percentOfMin = m.min_level > 0 ? Math.round((m.on_hand / m.min_level) * 100) : 0;
      
      let severity: LowStockAlertSeverity = 'info';
      if (m.on_hand === 0) {
        severity = 'critical';
      } else if (percentOfMin <= 50) {
        severity = 'warning';
      }

      const avgDailyUsage = (m as { avg_daily_usage?: number }).avg_daily_usage || 0;
      const daysUntilStockout = avgDailyUsage > 0 
        ? Math.floor(m.on_hand / avgDailyUsage) 
        : null;

      const suggestedReorderQty = (m as { suggested_reorder_qty?: number }).suggested_reorder_qty || 
        Math.max(m.max_level - m.on_hand, m.min_level * 2);

      return {
        id: `alert-${m.id}`,
        materialId: m.id,
        materialSku: m.sku,
        materialName: m.name,
        currentStock: m.on_hand,
        minLevel: m.min_level,
        maxLevel: m.max_level,
        percentOfMin,
        severity,
        daysUntilStockout,
        avgDailyUsage,
        suggestedReorderQty,
        recentWorkOrders: [],
        pendingPartRequests: [],
        vendor: m.vendor || null,
        leadTimeDays: m.lead_time_days || null,
        location: m.location || null,
      };
    }).sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.percentOfMin - b.percentOfMin;
    });
  }, [activeAlerts, lowStockMaterials]);

  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (filterSeverity !== 'all') {
      filtered = alerts.filter(a => a.severity === filterSeverity);
    }
    return filtered.filter(a => !acknowledgedAlerts.has(a.id));
  }, [alerts, filterSeverity, acknowledgedAlerts]);

  const selectableAlertIds = useMemo(() => 
    filteredAlerts.map(a => a.id), 
    [filteredAlerts]
  );

  const allSelected = useMemo(() => 
    selectableAlertIds.length > 0 && selectableAlertIds.every(id => selectedAlerts.has(id)),
    [selectableAlertIds, selectedAlerts]
  );

  const someSelected = useMemo(() => 
    selectableAlertIds.some(id => selectedAlerts.has(id)) && !allSelected,
    [selectableAlertIds, selectedAlerts, allSelected]
  );

  const selectedCount = useMemo(() => 
    selectableAlertIds.filter(id => selectedAlerts.has(id)).length,
    [selectableAlertIds, selectedAlerts]
  );

  const stats = useMemo(() => ({
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  const toggleExpanded = (alertId: string) => {
    Haptics.selectionAsync();
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const handleMaterialPress = (materialId: string) => {
    Haptics.selectionAsync();
    onMaterialPress?.(materialId);
  };

  const handleCreatePR = (materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreatePurchaseRequest?.(materialId);
  };

  const toggleAlertSelection = useCallback((alertId: string) => {
    Haptics.selectionAsync();
    setSelectedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (allSelected) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(selectableAlertIds));
    }
  }, [allSelected, selectableAlertIds]);

  const toggleSelectionMode = useCallback(() => {
    Haptics.selectionAsync();
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedAlerts(new Set());
    }
  }, [selectionMode]);

  const acknowledgeAlerts = useCallback(async (alertIds: string[]) => {
    if (alertIds.length === 0) return;
    
    setIsAcknowledging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (onAcknowledgeAlerts) {
        const success = await onAcknowledgeAlerts(alertIds);
        if (success) {
          setAcknowledgedAlerts(prev => {
            const next = new Set(prev);
            alertIds.forEach(id => next.add(id));
            return next;
          });
          setSelectedAlerts(new Set());
          setSelectionMode(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log(`Acknowledged ${alertIds.length} alerts`);
        } else {
          Alert.alert('Error', 'Failed to acknowledge alerts. Please try again.');
        }
      } else {
        const userId = userProfile?.id || 'unknown';
        const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown User';
        
        for (const alertId of alertIds) {
          if (!alertId.startsWith('alert-')) {
            await acknowledgeAlert({
              alertId,
              acknowledgedBy: userId,
              acknowledgedByName: userName,
            });
          }
        }
        
        setAcknowledgedAlerts(prev => {
          const next = new Set(prev);
          alertIds.forEach(id => next.add(id));
          return next;
        });
        setSelectedAlerts(new Set());
        setSelectionMode(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log(`[LowStockAlerts] Acknowledged ${alertIds.length} alerts`);
      }
    } catch (error) {
      console.error('[LowStockAlerts] Error acknowledging alerts:', error);
      Alert.alert('Error', 'Failed to acknowledge alerts. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  }, [onAcknowledgeAlerts, acknowledgeAlert, userProfile]);

  const handleAcknowledgeSelected = useCallback(() => {
    const selectedIds = Array.from(selectedAlerts).filter(id => selectableAlertIds.includes(id));
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      'Acknowledge Alerts',
      `Are you sure you want to acknowledge ${selectedIds.length} alert${selectedIds.length > 1 ? 's' : ''}? They will be hidden from this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Acknowledge', onPress: () => acknowledgeAlerts(selectedIds) },
      ]
    );
  }, [selectedAlerts, selectableAlertIds, acknowledgeAlerts]);

  const handleAcknowledgeSingle = useCallback((alertId: string) => {
    Haptics.selectionAsync();
    Alert.alert(
      'Acknowledge Alert',
      'Are you sure you want to acknowledge this alert? It will be hidden from this list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Acknowledge', onPress: () => acknowledgeAlerts([alertId]) },
      ]
    );
  }, [acknowledgeAlerts]);

  const openReorderPointEdit = useCallback((alert: EnhancedLowStockAlert) => {
    Haptics.selectionAsync();
    const material = lowStockMaterials.find(m => m.id === alert.materialId);
    const suggestedMin = material ? (material as { suggested_min?: number }).suggested_min : null;
    setReorderPointEdit({
      isOpen: true,
      materialId: alert.materialId,
      materialName: alert.materialName,
      currentMinLevel: alert.minLevel,
      currentMaxLevel: alert.maxLevel,
      suggestedMin: suggestedMin || null,
      newMinLevel: String(alert.minLevel),
      newMaxLevel: String(alert.maxLevel),
      isSubmitting: false,
      showSuccess: false,
    });
  }, [lowStockMaterials]);

  const closeReorderPointEdit = useCallback(() => {
    setReorderPointEdit(prev => ({
      ...prev,
      isOpen: false,
      isSubmitting: false,
      showSuccess: false,
    }));
  }, []);

  const handleReorderPointSubmit = useCallback(async () => {
    const newMin = parseInt(reorderPointEdit.newMinLevel, 10);
    const newMax = parseInt(reorderPointEdit.newMaxLevel, 10);

    if (isNaN(newMin) || newMin < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid minimum level (0 or greater).');
      return;
    }

    if (isNaN(newMax) || newMax < newMin) {
      Alert.alert('Invalid Input', 'Maximum level must be greater than or equal to minimum level.');
      return;
    }

    setReorderPointEdit(prev => ({ ...prev, isSubmitting: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (onAdjustReorderPoint) {
        const success = await onAdjustReorderPoint(reorderPointEdit.materialId, newMin, newMax);
        if (success) {
          setReorderPointEdit(prev => ({ ...prev, showSuccess: true, isSubmitting: false }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            closeReorderPointEdit();
          }, 1500);
        } else {
          setReorderPointEdit(prev => ({ ...prev, isSubmitting: false }));
          Alert.alert('Error', 'Failed to update reorder point. Please try again.');
        }
      } else {
        await updateMaterialMutation.mutateAsync({
          id: reorderPointEdit.materialId,
          updates: {
            min_level: newMin,
            max_level: newMax,
          },
        });
        setReorderPointEdit(prev => ({ ...prev, showSuccess: true, isSubmitting: false }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log(`[LowStockAlerts] Reorder point updated for ${reorderPointEdit.materialName}: Min=${newMin}, Max=${newMax}`);
        setTimeout(() => {
          closeReorderPointEdit();
        }, 1500);
      }
    } catch (error) {
      console.error('[LowStockAlerts] Error updating reorder point:', error);
      setReorderPointEdit(prev => ({ ...prev, isSubmitting: false }));
      Alert.alert('Error', 'Failed to update reorder point. Please try again.');
    }
  }, [reorderPointEdit, onAdjustReorderPoint, updateMaterialMutation, closeReorderPointEdit]);

  const applySuggestedMin = useCallback(() => {
    if (reorderPointEdit.suggestedMin !== null) {
      Haptics.selectionAsync();
      setReorderPointEdit(prev => ({
        ...prev,
        newMinLevel: String(prev.suggestedMin),
      }));
    }
  }, [reorderPointEdit.suggestedMin]);

  const getSeverityConfig = (severity: LowStockAlertSeverity) => {
    switch (severity) {
      case 'critical':
        return { color: '#EF4444', icon: AlertTriangle, label: 'Critical' };
      case 'warning':
        return { color: '#F59E0B', icon: AlertCircle, label: 'Warning' };
      case 'info':
        return { color: '#3B82F6', icon: Info, label: 'Low Stock' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
              <AlertTriangle size={24} color="#EF4444" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Low Stock Alerts</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {stats.total} items need attention
              </Text>
            </View>
          </View>
          <Pressable 
            onPress={onClose} 
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            hitSlop={8}
          >
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            style={[
              styles.selectModeButton,
              selectionMode && { backgroundColor: colors.primary + '20' }
            ]}
            onPress={toggleSelectionMode}
          >
            {selectionMode ? (
              <CheckSquare size={18} color={colors.primary} />
            ) : (
              <Square size={18} color={colors.textSecondary} />
            )}
          </Pressable>
          
          {selectionMode && filteredAlerts.length > 0 && (
            <Pressable
              style={[
                styles.selectAllButton,
                allSelected && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={toggleSelectAll}
            >
              {allSelected ? (
                <CheckSquare size={16} color={colors.primary} />
              ) : someSelected ? (
                <Minus size={16} color={colors.primary} />
              ) : (
                <Square size={16} color={colors.textSecondary} />
              )}
              <Text style={[
                styles.selectAllText,
                { color: allSelected || someSelected ? colors.primary : colors.textSecondary }
              ]}>
                {allSelected ? 'Deselect' : 'Select All'}
              </Text>
            </Pressable>
          )}
          
          <Pressable
            style={[
              styles.statPill,
              filterSeverity === 'all' && { backgroundColor: colors.primary + '20' }
            ]}
            onPress={() => setFilterSeverity('all')}
          >
            <Text style={[
              styles.statPillText,
              { color: filterSeverity === 'all' ? colors.primary : colors.textSecondary }
            ]}>
              All ({stats.total})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.statPill,
              filterSeverity === 'critical' && { backgroundColor: '#EF444420' }
            ]}
            onPress={() => setFilterSeverity('critical')}
          >
            <View style={[styles.severityDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[
              styles.statPillText,
              { color: filterSeverity === 'critical' ? '#EF4444' : colors.textSecondary }
            ]}>
              Critical ({stats.critical})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.statPill,
              filterSeverity === 'warning' && { backgroundColor: '#F59E0B20' }
            ]}
            onPress={() => setFilterSeverity('warning')}
          >
            <View style={[styles.severityDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[
              styles.statPillText,
              { color: filterSeverity === 'warning' ? '#F59E0B' : colors.textSecondary }
            ]}>
              Warning ({stats.warning})
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.statPill,
              filterSeverity === 'info' && { backgroundColor: '#3B82F620' }
            ]}
            onPress={() => setFilterSeverity('info')}
          >
            <View style={[styles.severityDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[
              styles.statPillText,
              { color: filterSeverity === 'info' ? '#3B82F6' : colors.textSecondary }
            ]}>
              Info ({stats.info})
            </Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredAlerts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Package size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Alerts</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filterSeverity === 'all' 
                  ? 'All inventory levels are healthy'
                  : `No ${filterSeverity} alerts at this time`
                }
              </Text>
            </View>
          ) : (
            filteredAlerts.map((alert) => {
              const config = getSeverityConfig(alert.severity);
              const IconComponent = config.icon;
              const isExpanded = expandedAlerts.has(alert.id);

              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border,
                      borderLeftColor: config.color,
                      borderLeftWidth: 4,
                    }
                  ]}
                >
                  <Pressable
                    style={styles.alertHeader}
                    onPress={() => selectionMode ? toggleAlertSelection(alert.id) : toggleExpanded(alert.id)}
                    onLongPress={() => {
                      if (!selectionMode) {
                        setSelectionMode(true);
                        toggleAlertSelection(alert.id);
                      }
                    }}
                  >
                    {selectionMode && (
                      <Pressable
                        style={styles.checkboxContainer}
                        onPress={() => toggleAlertSelection(alert.id)}
                        hitSlop={8}
                      >
                        {selectedAlerts.has(alert.id) ? (
                          <CheckSquare size={22} color={colors.primary} />
                        ) : (
                          <Square size={22} color={colors.textTertiary} />
                        )}
                      </Pressable>
                    )}
                    <View style={[styles.alertMain, selectionMode && styles.alertMainWithCheckbox]}>
                      <View style={[styles.severityBadge, { backgroundColor: config.color + '20' }]}>
                        <IconComponent size={14} color={config.color} />
                        <Text style={[styles.severityText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                      <Text style={[styles.alertName, { color: colors.text }]} numberOfLines={1}>
                        {alert.materialName}
                      </Text>
                      <Text style={[styles.alertSku, { color: colors.textTertiary }]}>
                        {alert.materialSku} • {alert.location || 'No location'}
                      </Text>
                    </View>
                    <View style={styles.alertSummary}>
                      <View style={styles.stockInfo}>
                        <Text style={[styles.stockCurrent, { color: config.color }]}>
                          {alert.currentStock}
                        </Text>
                        <Text style={[styles.stockMin, { color: colors.textTertiary }]}>
                          / {alert.minLevel} min
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color={colors.textTertiary} />
                      ) : (
                        <ChevronDown size={20} color={colors.textTertiary} />
                      )}
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={[styles.alertDetails, { borderTopColor: colors.border }]}>
                      <View style={styles.detailsGrid}>
                        {alert.daysUntilStockout !== null && (
                          <View style={styles.detailItem}>
                            <Clock size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                              Stockout in
                            </Text>
                            <Text style={[
                              styles.detailValue, 
                              { color: alert.daysUntilStockout <= 3 ? '#EF4444' : colors.text }
                            ]}>
                              {alert.daysUntilStockout} days
                            </Text>
                          </View>
                        )}
                        <View style={styles.detailItem}>
                          <TrendingDown size={14} color={colors.textTertiary} />
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                            Avg Usage
                          </Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>
                            {alert.avgDailyUsage}/day
                          </Text>
                        </View>
                        {alert.leadTimeDays && (
                          <View style={styles.detailItem}>
                            <Truck size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                              Lead Time
                            </Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                              {alert.leadTimeDays} days
                            </Text>
                          </View>
                        )}
                        <View style={styles.detailItem}>
                          <ShoppingCart size={14} color={colors.textTertiary} />
                          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                            Suggested Order
                          </Text>
                          <Text style={[styles.detailValue, { color: '#10B981' }]}>
                            {alert.suggestedReorderQty} units
                          </Text>
                        </View>
                      </View>

                      {alert.vendor && (
                        <View style={[styles.vendorRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.vendorLabel, { color: colors.textTertiary }]}>
                            Vendor:
                          </Text>
                          <Text style={[styles.vendorName, { color: colors.text }]}>
                            {alert.vendor}
                          </Text>
                        </View>
                      )}

                      {alert.recentWorkOrders.length > 0 && (
                        <View style={[styles.recentSection, { borderTopColor: colors.border }]}>
                          <Text style={[styles.recentTitle, { color: colors.textSecondary }]}>
                            Recent Work Orders Using This Part
                          </Text>
                          {alert.recentWorkOrders.slice(0, 3).map((wo, idx) => (
                            <View 
                              key={`${wo.workOrderId}-${idx}`} 
                              style={styles.recentItem}
                            >
                              <FileText size={12} color={colors.textTertiary} />
                              <Text style={[styles.recentWO, { color: colors.primary }]}>
                                {wo.workOrderNumber}
                              </Text>
                              <Text style={[styles.recentQty, { color: colors.textSecondary }]}>
                                {wo.quantityUsed} used
                              </Text>
                              <Text style={[styles.recentDate, { color: colors.textTertiary }]}>
                                {formatDate(wo.usedAt)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {alert.pendingPartRequests.length > 0 && (
                        <View style={[styles.pendingSection, { backgroundColor: '#F59E0B10' }]}>
                          <AlertCircle size={14} color="#F59E0B" />
                          <Text style={[styles.pendingText, { color: '#F59E0B' }]}>
                            {alert.pendingPartRequests.length} pending request(s) for{' '}
                            {alert.pendingPartRequests.reduce((sum, pr) => sum + pr.quantityRequested, 0)} units
                          </Text>
                        </View>
                      )}

                      <View style={styles.actionButtons}>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                          onPress={() => handleMaterialPress(alert.materialId)}
                        >
                          <Package size={16} color={colors.primary} />
                          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                            View Part
                          </Text>
                          <ChevronRight size={16} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: '#3B82F615' }]}
                          onPress={() => handleCreatePR(alert.materialId)}
                        >
                          <ClipboardList size={16} color="#3B82F6" />
                          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                            Create PR
                          </Text>
                          <ChevronRight size={16} color="#3B82F6" />
                        </Pressable>
                      </View>
                      <View style={styles.secondaryActions}>
                        <Pressable
                          style={[styles.adjustReorderButton, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}
                          onPress={() => openReorderPointEdit(alert)}
                        >
                          <Settings2 size={16} color="#8B5CF6" />
                          <Text style={[styles.adjustReorderButtonText, { color: '#8B5CF6' }]}>
                            Adjust Reorder Point
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.acknowledgeButton, { backgroundColor: '#6B728015', borderColor: '#6B728030' }]}
                          onPress={() => handleAcknowledgeSingle(alert.id)}
                        >
                          <CheckCircle2 size={16} color="#6B7280" />
                          <Text style={[styles.acknowledgeButtonText, { color: '#6B7280' }]}>
                            Acknowledge
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {selectionMode && selectedCount > 0 && (
          <View style={[styles.bulkActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.bulkActionInfo}>
              <CheckSquare size={18} color={colors.primary} />
              <Text style={[styles.bulkActionText, { color: colors.text }]}>
                {selectedCount} selected
              </Text>
            </View>
            <Pressable
              style={[
                styles.bulkAcknowledgeButton,
                { backgroundColor: colors.primary },
                isAcknowledging && { opacity: 0.7 }
              ]}
              onPress={handleAcknowledgeSelected}
              disabled={isAcknowledging}
            >
              {isAcknowledging ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.bulkAcknowledgeText}>Acknowledge Selected</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <Modal
          visible={reorderPointEdit.isOpen}
          animationType="fade"
          transparent
          onRequestClose={closeReorderPointEdit}
        >
          <Pressable 
            style={styles.reorderModalOverlay} 
            onPress={closeReorderPointEdit}
          >
            <Pressable 
              style={[styles.reorderModalContent, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              {reorderPointEdit.showSuccess ? (
                <View style={styles.successContainer}>
                  <View style={[styles.successIcon, { backgroundColor: '#10B98120' }]}>
                    <Check size={32} color="#10B981" />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Reorder Point Updated
                  </Text>
                  <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                    {reorderPointEdit.materialName}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.reorderModalHeader, { borderBottomColor: colors.border }]}>
                    <View style={[styles.reorderModalIcon, { backgroundColor: '#8B5CF620' }]}>
                      <Settings2 size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.reorderModalHeaderText}>
                      <Text style={[styles.reorderModalTitle, { color: colors.text }]}>
                        Adjust Reorder Point
                      </Text>
                      <Text style={[styles.reorderModalMaterial, { color: colors.textSecondary }]} numberOfLines={1}>
                        {reorderPointEdit.materialName}
                      </Text>
                    </View>
                    <Pressable 
                      onPress={closeReorderPointEdit}
                      hitSlop={8}
                      style={[styles.reorderModalClose, { backgroundColor: colors.background }]}
                    >
                      <X size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={styles.reorderModalBody}>
                    <View style={[styles.currentLevelsRow, { backgroundColor: colors.background }]}>
                      <View style={styles.currentLevelItem}>
                        <Text style={[styles.currentLevelLabel, { color: colors.textTertiary }]}>Current Min</Text>
                        <Text style={[styles.currentLevelValue, { color: colors.text }]}>{reorderPointEdit.currentMinLevel}</Text>
                      </View>
                      <View style={[styles.currentLevelDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.currentLevelItem}>
                        <Text style={[styles.currentLevelLabel, { color: colors.textTertiary }]}>Current Max</Text>
                        <Text style={[styles.currentLevelValue, { color: colors.text }]}>{reorderPointEdit.currentMaxLevel}</Text>
                      </View>
                    </View>

                    {reorderPointEdit.suggestedMin !== null && reorderPointEdit.suggestedMin !== reorderPointEdit.currentMinLevel && (
                      <Pressable 
                        style={[styles.suggestedRow, { backgroundColor: '#3B82F610', borderColor: '#3B82F630' }]}
                        onPress={applySuggestedMin}
                      >
                        <Info size={14} color="#3B82F6" />
                        <Text style={[styles.suggestedText, { color: '#3B82F6' }]}>
                          Suggested min level: {reorderPointEdit.suggestedMin}
                        </Text>
                        <Text style={[styles.suggestedApply, { color: '#3B82F6' }]}>Apply</Text>
                      </Pressable>
                    )}

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>New Minimum Level</Text>
                      <TextInput
                        style={[
                          styles.reorderInput,
                          { 
                            backgroundColor: colors.background, 
                            color: colors.text,
                            borderColor: colors.border,
                          }
                        ]}
                        value={reorderPointEdit.newMinLevel}
                        onChangeText={(text) => setReorderPointEdit(prev => ({ ...prev, newMinLevel: text }))}
                        keyboardType="numeric"
                        placeholder="Enter minimum level"
                        placeholderTextColor={colors.textTertiary}
                        editable={!reorderPointEdit.isSubmitting}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>New Maximum Level</Text>
                      <TextInput
                        style={[
                          styles.reorderInput,
                          { 
                            backgroundColor: colors.background, 
                            color: colors.text,
                            borderColor: colors.border,
                          }
                        ]}
                        value={reorderPointEdit.newMaxLevel}
                        onChangeText={(text) => setReorderPointEdit(prev => ({ ...prev, newMaxLevel: text }))}
                        keyboardType="numeric"
                        placeholder="Enter maximum level"
                        placeholderTextColor={colors.textTertiary}
                        editable={!reorderPointEdit.isSubmitting}
                      />
                    </View>
                  </View>

                  <View style={[styles.reorderModalFooter, { borderTopColor: colors.border }]}>
                    <Pressable
                      style={[styles.reorderCancelButton, { backgroundColor: colors.background }]}
                      onPress={closeReorderPointEdit}
                      disabled={reorderPointEdit.isSubmitting}
                    >
                      <Text style={[styles.reorderCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.reorderConfirmButton, 
                        { backgroundColor: '#8B5CF6' },
                        reorderPointEdit.isSubmitting && { opacity: 0.7 }
                      ]}
                      onPress={handleReorderPointSubmit}
                      disabled={reorderPointEdit.isSubmitting}
                    >
                      {reorderPointEdit.isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Check size={16} color="#FFFFFF" />
                          <Text style={styles.reorderConfirmText}>Update</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    padding: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  alertMain: {
    flex: 1,
    marginRight: 12,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    marginBottom: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  alertSku: {
    fontSize: 12,
  },
  alertSummary: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stockCurrent: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  stockMin: {
    fontSize: 12,
    marginLeft: 4,
  },
  alertDetails: {
    padding: 14,
    borderTopWidth: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    gap: 8,
  },
  vendorLabel: {
    fontSize: 12,
  },
  vendorName: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  recentSection: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recentWO: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  recentQty: {
    fontSize: 11,
  },
  recentDate: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  pendingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 100,
  },
  selectModeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  alertMainWithCheckbox: {
    marginRight: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  acknowledgeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  acknowledgeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  bulkActionBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  bulkActionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bulkAcknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  bulkAcknowledgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  adjustReorderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  adjustReorderButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  reorderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reorderModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reorderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  reorderModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderModalHeaderText: {
    flex: 1,
  },
  reorderModalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  reorderModalMaterial: {
    fontSize: 13,
    marginTop: 2,
  },
  reorderModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderModalBody: {
    padding: 16,
    gap: 16,
  },
  currentLevelsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
  },
  currentLevelItem: {
    flex: 1,
    alignItems: 'center',
  },
  currentLevelLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  currentLevelValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  currentLevelDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  suggestedText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  suggestedApply: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  reorderInput: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  reorderModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  reorderCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  reorderConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  reorderConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  successContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  successSubtitle: {
    fontSize: 14,
  },
});
