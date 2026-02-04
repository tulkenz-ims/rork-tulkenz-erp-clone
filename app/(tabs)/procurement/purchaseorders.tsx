import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ShoppingCart,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Truck,
  Package,
  Wrench,
  Building2,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProcurementPurchaseOrdersQuery,
  useProcurementStats,
} from '@/hooks/useSupabaseProcurement';
import {
  POType,
  POStatus,
  PO_TYPE_LABELS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
} from '@/types/procurement';

const PO_TYPE_COLORS: Record<POType, string> = {
  material: '#3B82F6',
  service: '#10B981',
  capex: '#F59E0B',
};

const PO_TYPE_ICONS: Record<POType, React.ComponentType<{ size: number; color: string }>> = {
  material: Package,
  service: Wrench,
  capex: Building2,
};

export default function PurchaseOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    data: recentPOs,
    isLoading: isLoadingPOs,
    refetch: refetchPOs,
    isRefetching: isRefetchingPOs,
  } = useProcurementPurchaseOrdersQuery({ limit: 5 });

  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useProcurementStats();

  const isLoading = isLoadingPOs || isLoadingStats;
  const isRefetching = isRefetchingPOs || isRefetchingStats;

  const onRefresh = useCallback(() => {
    console.log('[PurchaseOrdersScreen] Refreshing data...');
    refetchPOs();
    refetchStats();
  }, [refetchPOs, refetchStats]);

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

  const navigateTo = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  }, [router]);

  const quickActions = useMemo(() => [
    {
      id: 'create-material',
      title: 'Material PO',
      subtitle: 'Order materials & supplies',
      icon: Package,
      color: PO_TYPE_COLORS.material,
      route: '/procurement/pocreate-material',
    },
    {
      id: 'create-service',
      title: 'Service PO',
      subtitle: 'Contract services',
      icon: Wrench,
      color: PO_TYPE_COLORS.service,
      route: '/procurement/pocreate-service',
    },
    {
      id: 'create-capex',
      title: 'CapEx PO',
      subtitle: 'Capital expenditures',
      icon: Building2,
      color: PO_TYPE_COLORS.capex,
      route: '/procurement/pocreate-capex',
    },
  ], []);

  const navigationItems = useMemo(() => [
    {
      id: 'all-pos',
      title: 'All Purchase Orders',
      subtitle: `${stats?.totalPOs || 0} total`,
      icon: FileText,
      color: colors.primary,
      route: '/procurement/polist',
    },
    {
      id: 'approvals',
      title: 'My Approvals',
      subtitle: `${stats?.pendingApprovals || 0} pending`,
      icon: ClipboardCheck,
      color: '#F59E0B',
      route: '/procurement/poapproval',
      badge: stats?.pendingApprovals || 0,
    },
    {
      id: 'receiving',
      title: 'Receiving',
      subtitle: `${stats?.orderedPOs || 0} awaiting`,
      icon: Truck,
      color: '#8B5CF6',
      route: '/procurement/poreceiving',
    },
  ], [stats, colors.primary]);

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ComponentType<{ size: number; color: string }>,
    color: string,
    subtitle?: string
  ) => {
    const IconComponent = icon;
    return (
      <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
          <IconComponent size={20} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    );
  };

  const renderQuickAction = (action: typeof quickActions[0]) => {
    const IconComponent = action.icon;
    return (
      <TouchableOpacity
        key={action.id}
        style={[styles.quickActionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigateTo(action.route)}
        activeOpacity={0.7}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
          <IconComponent size={24} color={action.color} />
        </View>
        <View style={styles.quickActionContent}>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>{action.title}</Text>
          <Text style={[styles.quickActionSubtitle, { color: colors.textSecondary }]}>
            {action.subtitle}
          </Text>
        </View>
        <Plus size={20} color={action.color} />
      </TouchableOpacity>
    );
  };

  const renderNavigationItem = (item: typeof navigationItems[0]) => {
    const IconComponent = item.icon;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.navItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigateTo(item.route)}
        activeOpacity={0.7}
      >
        <View style={[styles.navIconContainer, { backgroundColor: `${item.color}15` }]}>
          <IconComponent size={22} color={item.color} />
        </View>
        <View style={styles.navContent}>
          <Text style={[styles.navTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
        </View>
        {item.badge && item.badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: item.color }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : (
          <ChevronRight size={20} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderRecentPO = (po: NonNullable<typeof recentPOs>[0]) => {
    const typeColor = PO_TYPE_COLORS[po.po_type as POType];
    const statusColor = PO_STATUS_COLORS[po.status as POStatus];
    const TypeIcon = PO_TYPE_ICONS[po.po_type as POType];

    return (
      <TouchableOpacity
        key={po.id}
        style={[styles.recentPOCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigateTo('/procurement/polist')}
        activeOpacity={0.7}
      >
        <View style={styles.recentPOHeader}>
          <View style={styles.recentPOLeft}>
            <View style={[styles.recentPOTypeIcon, { backgroundColor: `${typeColor}15` }]}>
              <TypeIcon size={16} color={typeColor} />
            </View>
            <View>
              <Text style={[styles.recentPONumber, { color: colors.text }]}>{po.po_number}</Text>
              <Text style={[styles.recentPOVendor, { color: colors.textSecondary }]} numberOfLines={1}>
                {po.vendor_name}
              </Text>
            </View>
          </View>
          <View style={styles.recentPORight}>
            <Text style={[styles.recentPOTotal, { color: colors.text }]}>
              {formatCurrency(po.total)}
            </Text>
            <View style={[styles.recentPOStatus, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.recentPOStatusText, { color: statusColor }]}>
                {PO_STATUS_LABELS[po.status as POStatus]}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.recentPOFooter}>
          <Text style={[styles.recentPODate, { color: colors.textTertiary }]}>
            {formatDate(po.created_at)}
          </Text>
          <View style={[styles.recentPOTypeBadge, { backgroundColor: `${typeColor}10` }]}>
            <Text style={[styles.recentPOTypeText, { color: typeColor }]}>
              {PO_TYPE_LABELS[po.po_type as POType]}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Purchase Orders' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading purchase orders...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Purchase Orders' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          {renderStatCard('Total POs', stats?.totalPOs || 0, FileText, colors.primary)}
          {renderStatCard('Pending', stats?.pendingApprovalPOs || 0, Clock, '#F59E0B')}
          {renderStatCard('Ordered', stats?.orderedPOs || 0, Truck, '#8B5CF6')}
          {renderStatCard('Value', formatCurrency(stats?.totalPOValue || 0), DollarSign, '#10B981')}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Create New PO</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
          <View style={styles.navContainer}>
            {navigationItems.map(renderNavigationItem)}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigateTo('/procurement/polist')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentPOs && recentPOs.length > 0 ? (
            <View style={styles.recentPOsContainer}>
              {recentPOs.map(renderRecentPO)}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ShoppingCart size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Purchase Orders</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create your first purchase order to get started
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
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
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsContainer: {
    gap: 10,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
  },
  navContainer: {
    gap: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  navIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 13,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recentPOsContainer: {
    gap: 10,
  },
  recentPOCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentPOHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recentPOLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentPOTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentPONumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentPOVendor: {
    fontSize: 13,
    marginTop: 2,
    maxWidth: 140,
  },
  recentPORight: {
    alignItems: 'flex-end',
  },
  recentPOTotal: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentPOStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentPOStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentPOFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  recentPODate: {
    fontSize: 12,
  },
  recentPOTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentPOTypeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
  },
});
