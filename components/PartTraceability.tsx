import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Package,
  FileText,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  Wrench,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useInventoryHistoryQuery } from '@/hooks/useSupabaseMaterials';
import { useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import { useSupabasePartRequests } from '@/hooks/useSupabasePartRequests';
import * as Haptics from 'expo-haptics';
import type { Tables } from '@/lib/supabase';

type Material = Tables['materials'];

interface PartTraceabilityProps {
  visible: boolean;
  onClose: () => void;
  material: Material | null;
  onWorkOrderPress?: (workOrderId: string) => void;
}

export default function PartTraceability({
  visible,
  onClose,
  material,
  onWorkOrderPress,
}: PartTraceabilityProps) {
  const { colors } = useTheme();
  
  const { data: inventoryHistory = [], isLoading: historyLoading } = useInventoryHistoryQuery({
    materialId: material?.id,
    action: 'issue',
    limit: 100,
    enabled: !!material?.id && visible,
  });
  
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersQuery({
    enabled: visible,
  });
  
  const { partRequests, isLoading: requestsLoading } = useSupabasePartRequests();
  
  const isLoading = historyLoading || workOrdersLoading || requestsLoading;

  const traceabilityData = useMemo(() => {
    if (!material) return null;

    const workOrderMap = new Map<string, {
      workOrderId: string;
      workOrderNumber: string;
      workOrderTitle: string;
      status: string;
      priority: string;
      totalQuantity: number;
      totalCost: number;
      issues: typeof inventoryHistory;
      latestIssue: string;
    }>();

    inventoryHistory.forEach(issue => {
      const wo = workOrders.find(w => w.id === (issue as any).reference_id);
      const workOrderId = (issue as any).reference_id || issue.id;
      const existing = workOrderMap.get(workOrderId);
      
      const quantityIssued = Math.abs(issue.quantity_change || 0);
      const unitCost = (material as any).unit_cost || material.unit_price || 0;
      const totalCost = quantityIssued * unitCost;
      const issuedAt = issue.created_at || new Date().toISOString();
      
      if (existing) {
        existing.totalQuantity += quantityIssued;
        existing.totalCost += totalCost;
        existing.issues.push(issue);
        if (issuedAt > existing.latestIssue) {
          existing.latestIssue = issuedAt;
        }
      } else {
        workOrderMap.set(workOrderId, {
          workOrderId,
          workOrderNumber: wo?.work_order_number || (issue as any).reference_number || 'N/A',
          workOrderTitle: wo?.title || issue.reason || 'Unknown',
          status: wo?.status || 'unknown',
          priority: wo?.priority || 'medium',
          totalQuantity: quantityIssued,
          totalCost,
          issues: [issue],
          latestIssue: issuedAt,
        });
      }
    });

    const workOrderUsage = Array.from(workOrderMap.values())
      .sort((a, b) => b.latestIssue.localeCompare(a.latestIssue));

    const totalQuantityUsed = workOrderUsage.reduce((sum, wo) => sum + wo.totalQuantity, 0);
    const totalCostSum = workOrderUsage.reduce((sum, wo) => sum + wo.totalCost, 0);

    const usageByMonth: { month: string; quantity: number; cost: number }[] = [];
    const monthMap = new Map<string, { quantity: number; cost: number }>();
    
    inventoryHistory.forEach(issue => {
      const issuedAt = issue.created_at || new Date().toISOString();
      const monthKey = issuedAt.substring(0, 7);
      const quantityIssued = Math.abs(issue.quantity_change || 0);
      const unitCost = (material as any).unit_cost || material.unit_price || 0;
      const totalCost = quantityIssued * unitCost;
      
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.quantity += quantityIssued;
        existing.cost += totalCost;
      } else {
        monthMap.set(monthKey, { quantity: quantityIssued, cost: totalCost });
      }
    });

    Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .forEach(([month, data]) => {
        usageByMonth.push({ month, ...data });
      });

    const pendingRequests = partRequests.filter(pr => 
      pr.status === 'pending_approval' &&
      pr.lines?.some(line => line.material_id === material.id)
    );

    return {
      material,
      totalWorkOrders: workOrderUsage.length,
      totalQuantityUsed,
      totalCost: totalCostSum,
      avgQuantityPerWorkOrder: workOrderUsage.length > 0 
        ? Math.round((totalQuantityUsed / workOrderUsage.length) * 10) / 10 
        : 0,
      lastUsedDate: workOrderUsage[0]?.latestIssue || null,
      workOrderUsage,
      usageByMonth,
      pendingRequests,
    };
  }, [material, inventoryHistory, workOrders, partRequests]);

  const handleWorkOrderPress = (workOrderId: string) => {
    Haptics.selectionAsync();
    onWorkOrderPress?.(workOrderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'open': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (!traceabilityData) return null;

  if (isLoading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading traceability data...</Text>
        </View>
      </Modal>
    );
  }

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
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Package size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Part Traceability</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {traceabilityData.material.name}
              </Text>
              <Text style={[styles.sku, { color: colors.textTertiary }]}>
                SKU: {traceabilityData.material.sku}
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

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FileText size={20} color="#3B82F6" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {traceabilityData.totalWorkOrders}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Work Orders</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Package size={20} color="#10B981" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {traceabilityData.totalQuantityUsed}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total Used</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DollarSign size={20} color="#F59E0B" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${traceabilityData.totalCost.toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Total Cost</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TrendingUp size={20} color="#8B5CF6" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {traceabilityData.avgQuantityPerWorkOrder}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>Avg/WO</Text>
              </View>
            </View>
          </View>

          {traceabilityData.usageByMonth.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Usage Trend</Text>
              <View style={[styles.trendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {traceabilityData.usageByMonth.map((month, index) => (
                  <View 
                    key={month.month} 
                    style={[
                      styles.trendRow,
                      index < traceabilityData.usageByMonth.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                    ]}
                  >
                    <Text style={[styles.trendMonth, { color: colors.text }]}>
                      {formatMonth(month.month)}
                    </Text>
                    <View style={styles.trendValues}>
                      <Text style={[styles.trendQty, { color: colors.textSecondary }]}>
                        {month.quantity} units
                      </Text>
                      <Text style={[styles.trendCost, { color: '#10B981' }]}>
                        ${month.cost.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Work Order History ({traceabilityData.workOrderUsage.length})
            </Text>
            
            {traceabilityData.workOrderUsage.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Wrench size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No work orders have used this part yet
                </Text>
              </View>
            ) : (
              traceabilityData.workOrderUsage.map((wo) => (
                <Pressable
                  key={wo.workOrderId}
                  style={[styles.workOrderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleWorkOrderPress(wo.workOrderId)}
                >
                  <View style={styles.woHeader}>
                    <View style={styles.woInfo}>
                      <View style={styles.woTitleRow}>
                        <Text style={[styles.woNumber, { color: colors.primary }]}>
                          {wo.workOrderNumber}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(wo.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(wo.status) }]}>
                            {wo.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.woTitle, { color: colors.text }]} numberOfLines={1}>
                        {wo.workOrderTitle}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textTertiary} />
                  </View>
                  
                  <View style={styles.woDetails}>
                    <View style={styles.woDetail}>
                      <Package size={14} color={colors.textTertiary} />
                      <Text style={[styles.woDetailText, { color: colors.textSecondary }]}>
                        {wo.totalQuantity} used
                      </Text>
                    </View>
                    <View style={styles.woDetail}>
                      <DollarSign size={14} color={colors.textTertiary} />
                      <Text style={[styles.woDetailText, { color: colors.textSecondary }]}>
                        ${wo.totalCost.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.woDetail}>
                      <Calendar size={14} color={colors.textTertiary} />
                      <Text style={[styles.woDetailText, { color: colors.textSecondary }]}>
                        {formatDate(wo.latestIssue)}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(wo.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(wo.priority) }]}>
                        {wo.priority}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {traceabilityData.pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Pending Requests ({traceabilityData.pendingRequests.length})
              </Text>
              {traceabilityData.pendingRequests.map((pr) => {
                const line = pr.lines?.find(l => l.material_id === material?.id);
                return (
                  <View
                    key={pr.id}
                    style={[styles.pendingCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}
                  >
                    <View style={styles.pendingHeader}>
                      <Text style={[styles.pendingNumber, { color: '#F59E0B' }]}>
                        {pr.request_number}
                      </Text>
                      <Text style={[styles.pendingStatus, { color: colors.textSecondary }]}>
                        Awaiting Approval
                      </Text>
                    </View>
                    <View style={styles.pendingDetails}>
                      <Text style={[styles.pendingWO, { color: colors.text }]}>
                        For: {pr.work_order_number || 'N/A'}
                      </Text>
                      <Text style={[styles.pendingQty, { color: colors.textSecondary }]}>
                        {line?.quantity_requested || 0} requested
                      </Text>
                    </View>
                    <View style={styles.pendingMeta}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[styles.pendingMetaText, { color: colors.textTertiary }]}>
                        {pr.requested_by_name} • {formatDate(pr.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
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
  sku: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
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
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryLabel: {
    fontSize: 10,
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  trendCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  trendMonth: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  trendValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trendQty: {
    fontSize: 13,
  },
  trendCost: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  workOrderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  woHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  woInfo: {
    flex: 1,
  },
  woTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  woNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  woTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  woDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  woDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  woDetailText: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  pendingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pendingStatus: {
    fontSize: 12,
  },
  pendingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingWO: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  pendingQty: {
    fontSize: 13,
  },
  pendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingMetaText: {
    fontSize: 11,
  },
  bottomPadding: {
    height: 40,
  },
});
