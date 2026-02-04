import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  ShoppingCart,
  ClipboardList,
  Package,
  CheckCircle,
  FileText,
  TrendingUp,
  Clock,
  Plus,
  ChevronRight,
  Users,
  Send,
  Wrench,
  Building2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementStats,
  useProcurementPurchaseOrdersQuery,
  usePurchaseRequestsQuery,
  usePurchaseRequisitionsQuery,
  useProcurementVendorsQuery,
} from '@/hooks/useSupabaseProcurement';
import { 
  POType,
  PO_TYPE_LABELS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
} from '@/types/procurement';
import { Tables } from '@/lib/supabase';

type ProcurementPurchaseOrder = Tables['procurement_purchase_orders'];

type TabFilter = 'all' | 'material' | 'service' | 'capex';

const PO_TYPE_COLORS: Record<POType, string> = {
  material: '#3B82F6',
  service: '#10B981',
  capex: '#F59E0B',
};

export default function ProcurementDashboardScreen() {
  const { colors } = useTheme();
  const { company } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const { isLoading: statsLoading, refetch: refetchStats } = useProcurementStats();
  
  const { data: purchaseOrders = [], isLoading: posLoading, refetch: refetchPOs } = useProcurementPurchaseOrdersQuery({
    limit: 50,
  });
  
  const { data: purchaseRequests = [], refetch: refetchRequests } = usePurchaseRequestsQuery();
  
  const { data: requisitions = [], refetch: refetchRequisitions } = usePurchaseRequisitionsQuery();
  
  const { data: vendors = [], refetch: refetchVendors } = useProcurementVendorsQuery({
    activeOnly: true,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[ProcurementDashboard] Refreshing data...');
    try {
      await Promise.all([
        refetchStats(),
        refetchPOs(),
        refetchRequests(),
        refetchRequisitions(),
        refetchVendors(),
      ]);
    } catch (error) {
      console.error('[ProcurementDashboard] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStats, refetchPOs, refetchRequests, refetchRequisitions, refetchVendors]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pendingRequests = purchaseRequests.filter(
      r => r.status === 'submitted' || r.status === 'under_review'
    );
    const approvedRequests = purchaseRequests.filter(
      r => r.status === 'approved'
    );
    const pendingRequisitions = requisitions.filter(
      r => r.status === 'pending_approval'
    ).length;
    const approvedRequisitions = requisitions.filter(
      r => r.status === 'approved'
    ).length;

    const pendingApprovals = purchaseOrders.filter(
      po => po.status === 'pending_approval'
    );
    const approvedPOs = purchaseOrders.filter(
      po => po.status === 'approved'
    );
    const pendingReceiving = purchaseOrders.filter(
      po => po.status === 'ordered' || po.status === 'partial_received'
    );

    const activePOs = purchaseOrders.filter(
      po => !['closed', 'cancelled', 'draft'].includes(po.status)
    );

    const thisMonthSpend = purchaseOrders
      .filter(po => {
        const poDate = new Date(po.created_at);
        return poDate >= startOfMonth && ['received', 'closed'].includes(po.status);
      })
      .reduce((sum, po) => sum + (po.total || 0), 0);

    const totalPendingValue = pendingApprovals.reduce((sum, po) => sum + (po.total || 0), 0);

    return {
      pendingRequests: pendingRequests.length,
      approvedRequests: approvedRequests.length,
      pendingRequisitions,
      approvedRequisitions,
      pendingApprovals: pendingApprovals.length,
      pendingPOCreation: approvedPOs.length,
      pendingReceiving: pendingReceiving.length,
      pendingService: purchaseOrders.filter(
        po => po.po_type === 'service' && po.status === 'ordered'
      ).length,
      activePOs: activePOs.length,
      thisMonthSpend,
      totalPendingValue,
      activeVendors: vendors.length,
    };
  }, [purchaseOrders, purchaseRequests, requisitions, vendors]);

  const filteredPOs = useMemo(() => {
    let pos = [...purchaseOrders];
    
    if (activeTab !== 'all') {
      pos = pos.filter(po => po.po_type === activeTab);
    }
    
    return pos
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [activeTab, purchaseOrders]);

  const isLoading = statsLoading || posLoading;

  const handleTabPress = (tab: TabFilter) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleNavigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const renderSummaryCard = (
    title: string,
    value: string | number,
    color: string,
    icon: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.summaryIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryTitle, { color: colors.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderPendingItem = (
    label: string,
    count: number,
    color: string,
    icon: React.ReactNode,
    route?: string
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.pendingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => route && handleNavigate(route)}
      activeOpacity={route ? 0.7 : 1}
      disabled={!route}
    >
      <View style={[styles.pendingIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <View style={styles.pendingContent}>
        <Text style={[styles.pendingLabel, { color: colors.text }]}>{label}</Text>
        <View style={styles.pendingCountRow}>
          <View style={[styles.pendingCountBadge, { backgroundColor: count > 0 ? `${color}20` : colors.backgroundTertiary }]}>
            <Text style={[styles.pendingCountText, { color: count > 0 ? color : colors.textTertiary }]}>
              {count}
            </Text>
          </View>
          {count > 0 && (
            <Text style={[styles.pendingAction, { color }]}>Action needed</Text>
          )}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderTab = (tab: TabFilter, label: string, color?: string) => {
    const isActive = activeTab === tab;
    const tabColor = color || colors.primary;
    
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          {
            backgroundColor: isActive ? `${tabColor}15` : 'transparent',
            borderColor: isActive ? tabColor : colors.border,
          },
        ]}
        onPress={() => handleTabPress(tab)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: isActive ? tabColor : colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPOCard = (po: ProcurementPurchaseOrder) => {
    const poType = (po.po_type || 'material') as POType;
    const poStatus = po.status as keyof typeof PO_STATUS_LABELS;
    const typeColor = PO_TYPE_COLORS[poType] || '#3B82F6';
    const statusColor = PO_STATUS_COLORS[poStatus] || '#6B7280';

    return (
      <TouchableOpacity
        key={po.id}
        style={[styles.poCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleNavigate('/procurement/polist')}
        activeOpacity={0.7}
      >
        <View style={styles.poHeader}>
          <View style={styles.poTitleRow}>
            <Text style={[styles.poNumber, { color: colors.text }]}>{po.po_number}</Text>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {PO_TYPE_LABELS[poType] || poType}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {PO_STATUS_LABELS[poStatus] || poStatus}
            </Text>
          </View>
        </View>

        <View style={styles.poDetails}>
          <View style={styles.poDetailRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.poDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
              {po.vendor_name || 'Unknown Vendor'}
            </Text>
          </View>
          <View style={styles.poDetailRow}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.poDetailText, { color: colors.textSecondary }]}>
              {po.department_name || 'Unassigned'}
            </Text>
          </View>
        </View>

        <View style={styles.poFooter}>
          <Text style={[styles.poTotal, { color: colors.text }]}>{formatCurrency(po.total || 0)}</Text>
          <Text style={[styles.poDate, { color: colors.textTertiary }]}>
            {formatDate(po.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: '#3B82F615' }]}>
              <ShoppingCart size={28} color="#3B82F6" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Procurement
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {company?.name || 'Organization'} • Purchase Management
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            'Active POs',
            metrics.activePOs,
            '#3B82F6',
            <FileText size={20} color="#3B82F6" />,
            () => handleNavigate('/procurement/polist')
          )}
          {renderSummaryCard(
            'Pending Approvals',
            metrics.pendingApprovals,
            '#F59E0B',
            <Clock size={20} color="#F59E0B" />,
            () => handleNavigate('/procurement/poapproval')
          )}
          {renderSummaryCard(
            'This Month Spend',
            formatCurrency(metrics.thisMonthSpend),
            '#10B981',
            <TrendingUp size={20} color="#10B981" />
          )}
          {renderSummaryCard(
            'Active Vendors',
            metrics.activeVendors,
            '#8B5CF6',
            <Users size={20} color="#8B5CF6" />,
            () => handleNavigate('/procurement/vendors')
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Procurement Pipeline</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Items requiring action
            </Text>
          </View>

          <View style={styles.pendingList}>
            {renderPendingItem(
              'Incoming Requests',
              metrics.pendingRequests,
              '#3B82F6',
              <ClipboardList size={18} color="#3B82F6" />,
              '/procurement/requests'
            )}
            {renderPendingItem(
              'Approved Requests',
              metrics.approvedRequests,
              '#10B981',
              <CheckCircle size={18} color="#10B981" />,
              '/procurement/requests'
            )}
            {renderPendingItem(
              'Requisitions Pending Approval',
              metrics.pendingRequisitions,
              '#F59E0B',
              <FileText size={18} color="#F59E0B" />,
              '/procurement/requisitions'
            )}
            {renderPendingItem(
              'Ready for PO Creation',
              metrics.approvedRequisitions,
              '#8B5CF6',
              <Send size={18} color="#8B5CF6" />,
              '/procurement/requisitions'
            )}
            {renderPendingItem(
              'Pending Receiving',
              metrics.pendingReceiving,
              '#F97316',
              <Package size={18} color="#F97316" />,
              '/procurement/receive'
            )}
            {renderPendingItem(
              'Pending Service',
              metrics.pendingService,
              '#06B6D4',
              <Wrench size={18} color="#06B6D4" />,
              '/procurement/polist'
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleNavigate('/procurement/requests')}
            >
              <ClipboardList size={18} color="#fff" />
              <Text style={styles.quickActionText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#8B5CF6' }]}
              onPress={() => handleNavigate('/procurement/requisitions')}
            >
              <FileText size={18} color="#fff" />
              <Text style={styles.quickActionText}>Requisitions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#10B981' }]}
              onPress={() => handleNavigate('/procurement/pocreate-material')}
            >
              <ShoppingCart size={18} color="#fff" />
              <Text style={styles.quickActionText}>Create PO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#10B981' }]}
              onPress={() => handleNavigate('/procurement/poapprovals')}
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.quickActionText}>Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#F59E0B' }]}
              onPress={() => handleNavigate('/procurement/poreceiving')}
            >
              <Package size={18} color="#fff" />
              <Text style={styles.quickActionText}>Receiving</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#06B6D4' }]}
              onPress={() => handleNavigate('/procurement/vendors')}
            >
              <Building2 size={18} color="#fff" />
              <Text style={styles.quickActionText}>Vendors</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Purchase Orders</Text>
            <TouchableOpacity onPress={() => handleNavigate('/procurement/polist')}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {renderTab('all', 'All')}
            {renderTab('material', 'Materials', '#3B82F6')}
            {renderTab('service', 'Services', '#10B981')}
            {renderTab('capex', 'CapEx', '#F59E0B')}
          </ScrollView>

          <View style={styles.poList}>
            {isLoading ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Loading purchase orders...
                </Text>
              </View>
            ) : filteredPOs.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ShoppingCart size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No purchase orders found
                </Text>
              </View>
            ) : (
              filteredPOs.map(renderPOCard)
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => handleNavigate('/procurement/requests')}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 150,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingList: {
    gap: 8,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingContent: {
    flex: 1,
  },
  pendingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  pendingCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pendingAction: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionsScroll: {
    gap: 10,
    paddingRight: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  poList: {
    gap: 10,
  },
  poCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  poTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  poDetails: {
    gap: 6,
    marginBottom: 10,
  },
  poDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poDetailText: {
    fontSize: 13,
    flex: 1,
  },
  poFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  poTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  poDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
