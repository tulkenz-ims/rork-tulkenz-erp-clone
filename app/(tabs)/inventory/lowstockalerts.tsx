import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  AlertOctagon,
  TrendingDown,
  ShoppingCart,
  Package,
  Clock,
  Truck,
  Building2,
  ClipboardList,
  Eye,
  BellOff,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { Tables } from '@/lib/supabase';
import { getDepartmentFromMaterialNumber, getAllDepartments } from '@/constants/inventoryDepartmentCodes';
import * as Haptics from 'expo-haptics';

type Material = Tables['materials'];
type AlertSeverity = 'critical' | 'warning' | 'approaching' | 'on_order';
type FilterType = 'all' | 'critical' | 'warning' | 'approaching';

interface ReorderAlert {
  material: Material;
  severity: AlertSeverity;
  daysUntilStockout: number | null;
  suggestedOrderQty: number;
  percentOfReorder: number;
}

export default function ReorderAlertsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [snoozedItems, setSnoozedItems] = useState<Set<string>>(new Set());
  const [showDeptFilter, setShowDeptFilter] = useState(false);

  const { data: materials = [], isLoading, refetch } = useMaterialsQuery({
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'name', ascending: true },
  });

  const departments = getAllDepartments();

  const alerts = useMemo((): ReorderAlert[] => {
    const result: ReorderAlert[] = [];

    materials.forEach(material => {
      if (snoozedItems.has(material.id)) return;
      if (material.min_level <= 0) return;
      
      const percentOfReorder = Math.round((material.on_hand / material.min_level) * 100);
      
      let severity: AlertSeverity | null = null;
      
      if (material.on_hand === 0) {
        severity = 'critical';
      } else if (material.on_hand <= material.min_level) {
        severity = 'warning';
      } else if (material.on_hand <= material.min_level * 1.25) {
        severity = 'approaching';
      }

      if (severity) {
        const suggestedOrderQty = Math.max(material.max_level - material.on_hand, material.min_level * 2);

        result.push({
          material,
          severity,
          daysUntilStockout: null,
          suggestedOrderQty,
          percentOfReorder,
        });
      }
    });

    return result.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, approaching: 2, on_order: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.percentOfReorder - b.percentOfReorder;
    });
  }, [materials, snoozedItems]);

  const filteredAlerts = useMemo(() => {
    let result = alerts;

    if (filterType !== 'all') {
      result = result.filter(a => a.severity === filterType);
    }

    if (selectedDepartment !== null) {
      result = result.filter(a => a.material.inventory_department === selectedDepartment);
    }

    return result;
  }, [alerts, filterType, selectedDepartment]);

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    approaching: alerts.filter(a => a.severity === 'approaching').length,
    total: alerts.length,
  }), [alerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      console.log('[ReorderAlertsScreen] Refreshed materials data from Supabase');
    } catch (error) {
      console.error('[ReorderAlertsScreen] Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const toggleExpand = useCallback((itemId: string) => {
    Haptics.selectionAsync();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleCreatePurchaseRequest = useCallback((alert: ReorderAlert) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Create Purchase Request',
      `Create a purchase request for ${alert.suggestedOrderQty} ${alert.material.unit_of_measure} of ${alert.material.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            console.log('[ReorderAlertsScreen] Creating PR for:', alert.material.name, 'Qty:', alert.suggestedOrderQty);
            router.push('/procurement' as any);
          }
        },
      ]
    );
  }, [router]);

  const handleViewItem = useCallback((materialId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/inventory/itemrecords' as any);
  }, [router]);

  const handleSnoozeAlert = useCallback((materialId: string, duration: '1day' | '1week') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const durationText = duration === '1day' ? '1 day' : '1 week';
    Alert.alert(
      'Snooze Alert',
      `Snooze this alert for ${durationText}? You won't see it until then.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Snooze', 
          onPress: () => {
            setSnoozedItems(prev => new Set([...prev, materialId]));
            console.log(`[ReorderAlertsScreen] Snoozed alert for ${materialId} for ${durationText}`);
          }
        },
      ]
    );
  }, []);

  const getSeverityConfig = useCallback((severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return { 
          label: 'Out of Stock', 
          color: '#EF4444', 
          bgColor: 'rgba(239, 68, 68, 0.12)',
          icon: AlertOctagon,
        };
      case 'warning':
        return { 
          label: 'Below Reorder', 
          color: '#F59E0B', 
          bgColor: 'rgba(245, 158, 11, 0.12)',
          icon: AlertTriangle,
        };
      case 'approaching':
        return { 
          label: 'Approaching', 
          color: '#3B82F6', 
          bgColor: 'rgba(59, 130, 246, 0.12)',
          icon: TrendingDown,
        };
      case 'on_order':
        return { 
          label: 'On Order', 
          color: '#10B981', 
          bgColor: 'rgba(16, 185, 129, 0.12)',
          icon: ShoppingCart,
        };
    }
  }, []);

  const renderAlertCard = useCallback((alert: ReorderAlert) => {
    const config = getSeverityConfig(alert.severity);
    const IconComponent = config.icon;
    const dept = getDepartmentFromMaterialNumber(alert.material.material_number);
    const isExpanded = expandedItems.has(alert.material.id);

    return (
      <View 
        key={alert.material.id} 
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
        <Pressable style={styles.alertHeader} onPress={() => toggleExpand(alert.material.id)}>
          <View style={styles.alertMain}>
            <View style={styles.alertTitleRow}>
              <View style={[styles.severityBadge, { backgroundColor: config.bgColor }]}>
                <IconComponent size={12} color={config.color} />
                <Text style={[styles.severityText, { color: config.color }]}>{config.label}</Text>
              </View>
              {alert.daysUntilStockout !== null && alert.daysUntilStockout <= 7 && (
                <View style={[styles.urgentBadge, { backgroundColor: '#EF444415' }]}>
                  <Clock size={10} color="#EF4444" />
                  <Text style={[styles.urgentText, { color: '#EF4444' }]}>
                    {alert.daysUntilStockout === 0 ? 'Now' : `${alert.daysUntilStockout}d left`}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.materialInfoRow}>
              <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
                <Text style={styles.deptBadgeText}>{dept?.shortName || 'UNK'}</Text>
              </View>
              <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                {alert.material.material_number}
              </Text>
            </View>
            
            <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={2}>
              {alert.material.name}
            </Text>
          </View>

          <View style={styles.alertRight}>
            <View style={styles.quantityDisplay}>
              <Text style={[styles.quantityCurrent, { color: config.color }]}>
                {alert.material.on_hand}
              </Text>
              <Text style={[styles.quantityDivider, { color: colors.textTertiary }]}>/</Text>
              <Text style={[styles.quantityMin, { color: colors.textTertiary }]}>
                {alert.material.min_level}
              </Text>
            </View>
            <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>
              on hand / reorder
            </Text>
            {isExpanded ? (
              <ChevronUp size={18} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={18} color={colors.textTertiary} />
            )}
          </View>
        </Pressable>

        {isExpanded && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <ShoppingCart size={14} color={colors.textTertiary} />
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Suggested Order</Text>
                <Text style={[styles.detailValue, { color: '#10B981' }]}>
                  {alert.suggestedOrderQty} {alert.material.unit_of_measure}
                </Text>
              </View>
              
              {alert.material.vendor && (
                <View style={styles.detailItem}>
                  <Building2 size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Vendor</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                    {alert.material.vendor}
                  </Text>
                </View>
              )}
              
              {alert.material.lead_time_days !== null && alert.material.lead_time_days > 0 && (
                <View style={styles.detailItem}>
                  <Truck size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Lead Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {alert.material.lead_time_days} days
                  </Text>
                </View>
              )}
              
              {alert.material.location && (
                <View style={styles.detailItem}>
                  <Package size={14} color={colors.textTertiary} />
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {alert.material.location}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                onPress={() => handleCreatePurchaseRequest(alert)}
              >
                <ClipboardList size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Create Purchase Request</Text>
              </Pressable>
            </View>

            <View style={styles.secondaryActions}>
              <Pressable
                style={[styles.secondaryAction, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleViewItem(alert.material.id)}
              >
                <Eye size={14} color={colors.textSecondary} />
                <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>View Details</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryAction, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleSnoozeAlert(alert.material.id, '1day')}
              >
                <BellOff size={14} color={colors.textSecondary} />
                <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>Snooze 1 Day</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryAction, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleSnoozeAlert(alert.material.id, '1week')}
              >
                <BellOff size={14} color={colors.textSecondary} />
                <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>Snooze 1 Week</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }, [colors, expandedItems, getSeverityConfig, toggleExpand, handleCreatePurchaseRequest, handleViewItem, handleSnoozeAlert]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.summarySection}>
        <Pressable
          style={[
            styles.summaryCard,
            styles.criticalCard,
            { 
              backgroundColor: filterType === 'critical' ? '#EF444420' : colors.surface, 
              borderColor: filterType === 'critical' ? '#EF4444' : colors.border,
            }
          ]}
          onPress={() => setFilterType(filterType === 'critical' ? 'all' : 'critical')}
        >
          <AlertOctagon size={20} color="#EF4444" />
          <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{stats.critical}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Out of Stock</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summaryCard,
            { 
              backgroundColor: filterType === 'warning' ? '#F59E0B20' : colors.surface, 
              borderColor: filterType === 'warning' ? '#F59E0B' : colors.border,
            }
          ]}
          onPress={() => setFilterType(filterType === 'warning' ? 'all' : 'warning')}
        >
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{stats.warning}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Below Reorder</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summaryCard,
            { 
              backgroundColor: filterType === 'approaching' ? '#3B82F620' : colors.surface, 
              borderColor: filterType === 'approaching' ? '#3B82F6' : colors.border,
            }
          ]}
          onPress={() => setFilterType(filterType === 'approaching' ? 'all' : 'approaching')}
        >
          <TrendingDown size={20} color="#3B82F6" />
          <Text style={[styles.summaryCount, { color: '#3B82F6' }]}>{stats.approaching}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Approaching</Text>
        </Pressable>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.filterLeft}>
          <Text style={[styles.resultText, { color: colors.textSecondary }]}>
            {filteredAlerts.length} alerts
          </Text>
          {filterType !== 'all' && (
            <Pressable
              style={[styles.clearFilterBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.clearFilterText, { color: colors.primary }]}>Clear filter</Text>
            </Pressable>
          )}
        </View>
        
        <Pressable
          style={[
            styles.deptFilterBtn,
            { 
              backgroundColor: selectedDepartment !== null ? colors.primary + '15' : colors.surface,
              borderColor: selectedDepartment !== null ? colors.primary : colors.border,
            }
          ]}
          onPress={() => setShowDeptFilter(!showDeptFilter)}
        >
          <Filter size={14} color={selectedDepartment !== null ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.deptFilterText,
            { color: selectedDepartment !== null ? colors.primary : colors.textSecondary }
          ]}>
            {selectedDepartment !== null 
              ? departments.find(d => d.code === selectedDepartment)?.shortName || 'Dept'
              : 'Department'}
          </Text>
          <ChevronDown size={14} color={selectedDepartment !== null ? colors.primary : colors.textSecondary} />
        </Pressable>
      </View>

      {showDeptFilter && (
        <View style={[styles.deptDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[
              styles.deptOption,
              selectedDepartment === null && { backgroundColor: colors.primary + '15' }
            ]}
            onPress={() => {
              setSelectedDepartment(null);
              setShowDeptFilter(false);
            }}
          >
            <Text style={[
              styles.deptOptionText,
              { color: selectedDepartment === null ? colors.primary : colors.text }
            ]}>
              All Departments
            </Text>
          </Pressable>
          {departments.map(dept => (
            <Pressable
              key={dept.code}
              style={[
                styles.deptOption,
                selectedDepartment === dept.code && { backgroundColor: dept.color + '15' }
              ]}
              onPress={() => {
                setSelectedDepartment(dept.code);
                setShowDeptFilter(false);
              }}
            >
              <View style={[styles.deptColorDot, { backgroundColor: dept.color }]} />
              <Text style={[
                styles.deptOptionText,
                { color: selectedDepartment === dept.code ? dept.color : colors.text }
              ]}>
                {dept.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading...</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Fetching inventory data from Supabase
            </Text>
          </View>
        ) : filteredAlerts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Package size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {stats.total === 0 ? 'All Stock Levels Healthy' : 'No Matching Alerts'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {stats.total === 0 
                ? 'All inventory items are above their reorder points.'
                : 'Try changing your filter selection.'}
            </Text>
          </View>
        ) : (
          filteredAlerts.map(renderAlertCard)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  criticalCard: {},
  summaryCount: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    textAlign: 'center' as const,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 13,
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  deptFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deptFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  deptDropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deptOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  deptColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deptOptionText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  alertMain: {
    flex: 1,
    marginRight: 12,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  materialInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deptBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700' as const,
  },
  materialNumber: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  alertRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  quantityDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quantityCurrent: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  quantityDivider: {
    fontSize: 14,
    marginHorizontal: 2,
  },
  quantityMin: {
    fontSize: 14,
  },
  quantityLabel: {
    fontSize: 9,
    marginBottom: 4,
  },
  expandedSection: {
    padding: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
  },
  actionButtons: {
    marginBottom: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  secondaryActionText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
