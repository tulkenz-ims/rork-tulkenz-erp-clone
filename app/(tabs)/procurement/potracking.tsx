import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { MapPin, Search, Package, Truck, Clock, CheckCircle, AlertTriangle, Calendar, ChevronRight, Filter, Building } from 'lucide-react-native';

const TRACKING_STAGES = [
  { key: 'ordered', label: 'Ordered', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function POTrackingScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'pending' | 'in_transit' | 'delayed'>('all');

  const { data: purchaseOrders = [], isLoading, refetch } = useProcurementPurchaseOrdersQuery({
    status: ['ordered', 'partial_received'],
  });

  const trackedOrders = useMemo(() => {
    let filtered = purchaseOrders.filter((po) => 
      ['ordered', 'partial_received', 'submitted'].includes(po.status)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (po) =>
          po.po_number.toLowerCase().includes(query) ||
          po.vendor_name.toLowerCase().includes(query)
      );
    }

    const now = new Date();
    filtered = filtered.map((po) => {
      const expectedDate = po.expected_delivery ? new Date(po.expected_delivery) : null;
      const isDelayed = expectedDate && expectedDate < now && po.status !== 'received';
      const daysUntilDelivery = expectedDate 
        ? Math.ceil((expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return { ...po, isDelayed, daysUntilDelivery, expectedDate };
    });

    if (filterView === 'delayed') {
      filtered = filtered.filter((po) => po.isDelayed);
    } else if (filterView === 'pending') {
      filtered = filtered.filter((po) => po.status === 'ordered' || po.status === 'submitted');
    } else if (filterView === 'in_transit') {
      filtered = filtered.filter((po) => po.status === 'partial_received');
    }

    return filtered.sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      if (a.expectedDate && b.expectedDate) {
        return a.expectedDate.getTime() - b.expectedDate.getTime();
      }
      return 0;
    });
  }, [purchaseOrders, searchQuery, filterView]);

  const stats = useMemo(() => {
    const total = trackedOrders.length;
    const delayed = trackedOrders.filter((o) => o.isDelayed).length;
    const onTrack = total - delayed;
    const arriving7Days = trackedOrders.filter(
      (o) => o.daysUntilDelivery !== null && o.daysUntilDelivery >= 0 && o.daysUntilDelivery <= 7
    ).length;

    return { total, delayed, onTrack, arriving7Days };
  }, [trackedOrders]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getStageProgress = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'approved':
        return 0;
      case 'ordered':
        return 1;
      case 'partial_received':
        return 2;
      case 'received':
        return 4;
      default:
        return 0;
    }
  };

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
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#6366F115',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      marginLeft: 8,
      color: colors.text,
      fontSize: 15,
    },
    filterTabs: {
      flexDirection: 'row',
      gap: 8,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    filterTabActive: {
      backgroundColor: '#6366F7',
    },
    filterTabText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    filterTabTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    statDelayed: {
      backgroundColor: '#FEE2E2',
    },
    statValueDelayed: {
      color: '#DC2626',
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    orderCardDelayed: {
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    vendorIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#6366F715',
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderInfo: {
      flex: 1,
    },
    orderNumber: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    vendorName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    orderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    deliveryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      gap: 4,
    },
    deliveryText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    orderAmount: {
      alignItems: 'flex-end',
    },
    amountValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    daysText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    trackingProgress: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressStep: {
      alignItems: 'center',
      flex: 1,
    },
    progressDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    progressDotActive: {
      backgroundColor: '#6366F7',
    },
    progressDotInactive: {
      backgroundColor: colors.border,
    },
    progressLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    progressLabelActive: {
      color: '#6366F7',
      fontWeight: '600' as const,
    },
    progressLine: {
      position: 'absolute',
      top: 14,
      left: '12%',
      right: '12%',
      height: 2,
      backgroundColor: colors.border,
      zIndex: -1,
    },
    progressLineActive: {
      backgroundColor: '#6366F7',
    },
    orderFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    footerItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.titleIcon}>
            <MapPin size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.title}>PO Tracking</Text>
            <Text style={styles.subtitle}>Track delivery status</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by PO # or vendor..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterTabs}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'in_transit', label: 'In Transit' },
            { key: 'delayed', label: 'Delayed' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filterView === tab.key && styles.filterTabActive]}
              onPress={() => setFilterView(tab.key as typeof filterView)}
            >
              <Text style={[styles.filterTabText, filterView === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.onTrack}</Text>
            <Text style={styles.statLabel}>On Track</Text>
          </View>
          <View style={[styles.statCard, stats.delayed > 0 && styles.statDelayed]}>
            <Text style={[styles.statValue, stats.delayed > 0 && styles.statValueDelayed]}>{stats.delayed}</Text>
            <Text style={styles.statLabel}>Delayed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.arriving7Days}</Text>
            <Text style={styles.statLabel}>Due 7 Days</Text>
          </View>
        </View>

        {trackedOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Package size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Orders to Track</Text>
            <Text style={styles.emptyText}>Orders will appear here once submitted</Text>
          </View>
        ) : (
          trackedOrders.map((order) => {
            const stageProgress = getStageProgress(order.status);
            const progressWidth = `${(stageProgress / 3) * 100}%`;
            
            return (
              <View key={order.id} style={[styles.orderCard, order.isDelayed && styles.orderCardDelayed]}>
                <View style={styles.orderHeader}>
                  <View style={styles.vendorIcon}>
                    <Building size={22} color="#6366F1" />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.po_number}</Text>
                    <Text style={styles.vendorName}>{order.vendor_name}</Text>
                    <View style={styles.orderMeta}>
                      <View
                        style={[
                          styles.deliveryBadge,
                          { backgroundColor: order.isDelayed ? '#FEE2E2' : '#DCFCE7' },
                        ]}
                      >
                        {order.isDelayed ? (
                          <AlertTriangle size={12} color="#DC2626" />
                        ) : (
                          <Clock size={12} color="#16A34A" />
                        )}
                        <Text
                          style={[styles.deliveryText, { color: order.isDelayed ? '#DC2626' : '#16A34A' }]}
                        >
                          {order.isDelayed ? 'Delayed' : 'On Track'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.orderAmount}>
                    <Text style={styles.amountValue}>{formatCurrency(order.total || 0)}</Text>
                    {order.daysUntilDelivery !== null && (
                      <Text style={styles.daysText}>
                        {order.daysUntilDelivery < 0
                          ? `${Math.abs(order.daysUntilDelivery)}d overdue`
                          : order.daysUntilDelivery === 0
                          ? 'Due today'
                          : `${order.daysUntilDelivery}d remaining`}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.trackingProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressLine, { width: progressWidth as any }, styles.progressLineActive]} />
                    <View style={styles.progressLine} />
                    {TRACKING_STAGES.map((stage, index) => {
                      const isActive = index <= stageProgress;
                      const StageIcon = stage.icon;
                      return (
                        <View key={stage.key} style={styles.progressStep}>
                          <View style={[styles.progressDot, isActive ? styles.progressDotActive : styles.progressDotInactive]}>
                            <StageIcon size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                          </View>
                          <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>
                            {stage.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.footerItem}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>Expected: {formatDate(order.expected_delivery)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
