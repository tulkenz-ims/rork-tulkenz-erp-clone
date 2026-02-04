import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementPurchaseOrdersQuery } from '@/hooks/useSupabaseProcurement';
import { History, Search, Filter, Calendar, DollarSign, Package, Building, ChevronRight, FileText, Clock, CheckCircle, XCircle, Truck } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  draft: { label: 'Draft', color: '#6B7280', icon: FileText },
  pending_approval: { label: 'Pending', color: '#F59E0B', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
  ordered: { label: 'Ordered', color: '#8B5CF6', icon: Package },
  partial_received: { label: 'Partial', color: '#F97316', icon: Truck },
  received: { label: 'Received', color: '#059669', icon: CheckCircle },
  closed: { label: 'Closed', color: '#374151', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#DC2626', icon: XCircle },
};

export default function POHistoryScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d' | '1y'>('all');

  const { data: purchaseOrders = [], isLoading, refetch } = useProcurementPurchaseOrdersQuery();

  const filteredOrders = useMemo(() => {
    let filtered = purchaseOrders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (po) =>
          po.po_number.toLowerCase().includes(query) ||
          po.vendor_name.toLowerCase().includes(query) ||
          (po.notes || '').toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((po) => po.status === filterStatus);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (dateRange) {
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      filtered = filtered.filter((po) => new Date(po.created_at) >= cutoff);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [purchaseOrders, searchQuery, filterStatus, dateRange]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const totalValue = filteredOrders.reduce((sum, po) => sum + (po.total || 0), 0);
    const completed = filteredOrders.filter((po) => ['received', 'closed'].includes(po.status)).length;
    const avgValue = total > 0 ? totalValue / total : 0;

    return { total, totalValue, completed, avgValue };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      backgroundColor: '#A855F715',
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
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: '#A855F7',
      borderColor: '#A855F7',
    },
    filterChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    dateFilters: {
      flexDirection: 'row',
      gap: 8,
    },
    dateChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    dateChipActive: {
      backgroundColor: '#A855F720',
    },
    dateChipText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dateChipTextActive: {
      color: '#A855F7',
      fontWeight: '600' as const,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    orderIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 10,
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
    orderVendor: {
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
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    orderAmount: {
      alignItems: 'flex-end',
    },
    amountValue: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    amountLabel: {
      fontSize: 11,
      color: colors.textSecondary,
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
            <History size={24} color="#A855F7" />
          </View>
          <View>
            <Text style={styles.title}>PO History</Text>
            <Text style={styles.subtitle}>Complete purchase order archive</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by PO #, vendor, notes..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
            onPress={() => setFilterStatus(null)}
          >
            <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>All Status</Text>
          </TouchableOpacity>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
              onPress={() => setFilterStatus(filterStatus === key ? null : key)}
            >
              <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.dateFilters}>
          {[
            { key: 'all', label: 'All Time' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.dateChip, dateRange === item.key && styles.dateChipActive]}
              onPress={() => setDateRange(item.key as typeof dateRange)}
            >
              <Text style={[styles.dateChipText, dateRange === item.key && styles.dateChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.avgValue)}</Text>
            <Text style={styles.statLabel}>Avg Order Value</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Purchase Orders ({filteredOrders.length})</Text>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <History size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={[styles.orderIconContainer, { backgroundColor: `${statusConfig.color}15` }]}>
                    <StatusIcon size={22} color={statusConfig.color} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.po_number}</Text>
                    <Text style={styles.orderVendor}>{order.vendor_name}</Text>
                    <View style={styles.orderMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderAmount}>
                    <Text style={styles.amountValue}>{formatCurrency(order.total || 0)}</Text>
                    <Text style={styles.amountLabel}>Total</Text>
                  </View>
                </View>
                <View style={styles.orderFooter}>
                  <View style={styles.footerItem}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.footerText}>Created: {formatDate(order.created_at)}</Text>
                  </View>
                  {order.approved_date && (
                    <View style={styles.footerItem}>
                      <CheckCircle size={14} color={colors.textSecondary} />
                      <Text style={styles.footerText}>Approved: {formatDate(order.approved_date)}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
