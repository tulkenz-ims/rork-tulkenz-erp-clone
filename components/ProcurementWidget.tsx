import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShoppingCart,
  FileCheck,
  PackageCheck,
  ChevronRight,
  Clock,
  AlertCircle,
  TrendingUp,
  Truck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { PO_TYPE_LABELS, PO_STATUS_COLORS } from '@/types/procurement';
import { useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';

interface ProcurementWidgetProps {
  onNavigate?: (route: string) => void;
}

export default function ProcurementWidget({ onNavigate }: ProcurementWidgetProps) {
  const router = useRouter();

  const { data: allPurchaseOrders = [], isLoading } = useProcurementPurchaseOrdersQuery();

  const procurementStats = useMemo(() => {
    const pendingApprovals = allPurchaseOrders.filter(
      po => po.status === 'pending_approval'
    );
    const pendingApprovalValue = pendingApprovals.reduce((sum, po) => sum + (po.total || 0), 0);

    const receivingQueue = allPurchaseOrders.filter(
      po => po.status === 'approved' || po.status === 'ordered'
    );
    const receivingQueueValue = receivingQueue.reduce((sum, po) => sum + (po.total || 0), 0);

    const recentPOs = [...allPurchaseOrders]
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 3);

    const drafts = allPurchaseOrders.filter(po => po.status === 'draft');

    const thisMonthPOs = allPurchaseOrders.filter(po => {
      const poDate = new Date(po.created_at || '');
      const now = new Date();
      return poDate.getMonth() === now.getMonth() && poDate.getFullYear() === now.getFullYear();
    });
    const thisMonthTotal = thisMonthPOs.reduce((sum, po) => sum + (po.total || 0), 0);

    return {
      pendingApprovals,
      pendingApprovalCount: pendingApprovals.length,
      pendingApprovalValue,
      receivingQueue,
      receivingQueueCount: receivingQueue.length,
      receivingQueueValue,
      recentPOs,
      draftsCount: drafts.length,
      thisMonthTotal,
      thisMonthCount: thisMonthPOs.length,
    };
  }, [allPurchaseOrders]);

  const handleNavigate = useCallback((route: string) => {
    Haptics.selectionAsync();
    if (onNavigate) {
      onNavigate(route);
    } else {
      router.push(route as any);
    }
  }, [router, onNavigate]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    return PO_STATUS_COLORS[status as keyof typeof PO_STATUS_COLORS] || Colors.textSecondary;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <ShoppingCart size={18} color={Colors.primary} />
            <Text style={styles.headerTitle}>Procurement</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading procurement data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ShoppingCart size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Procurement</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
          onPress={() => handleNavigate('/procurement')}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={16} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Pressable
          style={({ pressed }) => [styles.statCard, styles.statCardPending, pressed && styles.pressed]}
          onPress={() => handleNavigate('/procurement/poapprovals')}
        >
          <View style={styles.statIconBox}>
            <FileCheck size={20} color="#F59E0B" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{procurementStats.pendingApprovalCount}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
            {procurementStats.pendingApprovalValue > 0 && (
              <Text style={styles.statSubValue}>
                {formatCurrency(procurementStats.pendingApprovalValue)}
              </Text>
            )}
          </View>
          {procurementStats.pendingApprovalCount > 0 && (
            <View style={styles.alertBadge}>
              <AlertCircle size={14} color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.statCard, styles.statCardReceiving, pressed && styles.pressed]}
          onPress={() => handleNavigate('/procurement/receive')}
        >
          <View style={styles.statIconBox}>
            <PackageCheck size={20} color="#3B82F6" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{procurementStats.receivingQueueCount}</Text>
            <Text style={styles.statLabel}>Ready to Receive</Text>
            {procurementStats.receivingQueueValue > 0 && (
              <Text style={styles.statSubValue}>
                {formatCurrency(procurementStats.receivingQueueValue)}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.monthlyCard}>
        <View style={styles.monthlyHeader}>
          <TrendingUp size={16} color={Colors.success} />
          <Text style={styles.monthlyTitle}>This Month</Text>
        </View>
        <View style={styles.monthlyStats}>
          <View style={styles.monthlyStat}>
            <Text style={styles.monthlyValue}>{procurementStats.thisMonthCount}</Text>
            <Text style={styles.monthlyLabel}>POs Created</Text>
          </View>
          <View style={styles.monthlyDivider} />
          <View style={styles.monthlyStat}>
            <Text style={[styles.monthlyValue, { color: Colors.success }]}>
              {formatCurrency(procurementStats.thisMonthTotal)}
            </Text>
            <Text style={styles.monthlyLabel}>Total Value</Text>
          </View>
          <View style={styles.monthlyDivider} />
          <View style={styles.monthlyStat}>
            <Text style={[styles.monthlyValue, { color: Colors.textSecondary }]}>
              {procurementStats.draftsCount}
            </Text>
            <Text style={styles.monthlyLabel}>Drafts</Text>
          </View>
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>Recent POs</Text>
        {procurementStats.recentPOs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No purchase orders yet</Text>
          </View>
        ) : (
          procurementStats.recentPOs.map((po, index) => (
            <Pressable
              key={po.id}
              style={({ pressed }) => [
                styles.recentItem,
                index === procurementStats.recentPOs.length - 1 && styles.recentItemLast,
                pressed && styles.pressed,
              ]}
              onPress={() => handleNavigate('/procurement/polist')}
            >
              <View style={styles.recentItemLeft}>
                <View style={[styles.poTypeBadge, { backgroundColor: `${getStatusColor(po.status || '')}20` }]}>
                  <Text style={[styles.poTypeText, { color: getStatusColor(po.status || '') }]}>
                    {PO_TYPE_LABELS[po.po_type as keyof typeof PO_TYPE_LABELS] || po.po_type}
                  </Text>
                </View>
                <View style={styles.recentItemInfo}>
                  <Text style={styles.recentItemTitle}>{po.po_number}</Text>
                  <Text style={styles.recentItemSubtitle}>{po.vendor_name || 'No vendor'}</Text>
                </View>
              </View>
              <View style={styles.recentItemRight}>
                <Text style={styles.recentItemAmount}>{formatCurrency(po.total || 0)}</Text>
                <View style={styles.recentItemDateRow}>
                  <Clock size={10} color={Colors.textTertiary} />
                  <Text style={styles.recentItemDate}>{formatDate(po.created_at)}</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          onPress={() => handleNavigate('/procurement/pocreate-material')}
        >
          <Truck size={16} color={Colors.primary} />
          <Text style={styles.quickActionText}>New Material PO</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
          onPress={() => handleNavigate('/procurement/vendors')}
        >
          <ShoppingCart size={16} color={Colors.primary} />
          <Text style={styles.quickActionText}>Vendors</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  pressed: {
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    position: 'relative' as const,
  },
  statCardPending: {
    backgroundColor: '#FEF3C720',
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  statCardReceiving: {
    backgroundColor: '#DBEAFE20',
    borderWidth: 1,
    borderColor: '#3B82F630',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statSubValue: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  alertBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthlyCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  monthlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  monthlyTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  monthlyStat: {
    alignItems: 'center',
  },
  monthlyValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  monthlyLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  monthlyDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  recentSection: {
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentItemLast: {
    borderBottomWidth: 0,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  poTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  poTypeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  recentItemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentItemRight: {
    alignItems: 'flex-end',
  },
  recentItemAmount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  recentItemDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  recentItemDate: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
