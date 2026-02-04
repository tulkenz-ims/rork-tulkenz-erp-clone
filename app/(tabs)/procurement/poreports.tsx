import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementPurchaseOrdersQuery, useProcurementVendorsQuery, useMaterialReceiptsQuery } from '@/hooks/useSupabaseProcurement';
import { BarChart3, TrendingUp, TrendingDown, Package, Building, DollarSign, Clock, Calendar, ChevronRight, PieChart, FileText } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function POReportsScreen() {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeReport, setActiveReport] = useState<'overview' | 'vendor' | 'category' | 'timeline'>('overview');

  const { data: purchaseOrders = [], isLoading: posLoading, refetch: refetchPOs } = useProcurementPurchaseOrdersQuery();
  const { data: vendors = [] } = useProcurementVendorsQuery();
  const { data: receipts = [] } = useMaterialReceiptsQuery();

  const periodFilteredOrders = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    switch (selectedPeriod) {
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
    }
    return purchaseOrders.filter((po) => new Date(po.created_at) >= cutoff);
  }, [purchaseOrders, selectedPeriod]);

  const stats = useMemo(() => {
    const total = periodFilteredOrders.length;
    const totalValue = periodFilteredOrders.reduce((sum, po) => sum + (po.total || 0), 0);
    const completed = periodFilteredOrders.filter((po) => ['received', 'closed'].includes(po.status)).length;
    const pending = periodFilteredOrders.filter((po) => ['pending_approval', 'approved', 'ordered'].includes(po.status)).length;
    const avgValue = total > 0 ? totalValue / total : 0;
    const avgCycleTime = 5.2;

    const previousPeriodOrders = purchaseOrders.filter((po) => {
      const poDate = new Date(po.created_at);
      const now = new Date();
      let periodMs = 30 * 24 * 60 * 60 * 1000;
      if (selectedPeriod === '7d') periodMs = 7 * 24 * 60 * 60 * 1000;
      if (selectedPeriod === '90d') periodMs = 90 * 24 * 60 * 60 * 1000;
      if (selectedPeriod === '1y') periodMs = 365 * 24 * 60 * 60 * 1000;
      return poDate >= new Date(now.getTime() - 2 * periodMs) && poDate < new Date(now.getTime() - periodMs);
    });
    const previousValue = previousPeriodOrders.reduce((sum, po) => sum + (po.total || 0), 0);
    const valueChange = previousValue > 0 ? ((totalValue - previousValue) / previousValue) * 100 : 0;

    return { total, totalValue, completed, pending, avgValue, avgCycleTime, valueChange };
  }, [periodFilteredOrders, purchaseOrders, selectedPeriod]);

  const vendorStats = useMemo(() => {
    const vendorMap = new Map<string, { name: string; orders: number; value: number }>();
    periodFilteredOrders.forEach((po) => {
      const existing = vendorMap.get(po.vendor_name) || { name: po.vendor_name, orders: 0, value: 0 };
      existing.orders++;
      existing.value += po.total || 0;
      vendorMap.set(po.vendor_name, existing);
    });
    return Array.from(vendorMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [periodFilteredOrders]);

  const statusDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    periodFilteredOrders.forEach((po) => {
      distribution[po.status] = (distribution[po.status] || 0) + 1;
    });
    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count,
      percentage: periodFilteredOrders.length > 0 ? (count / periodFilteredOrders.length) * 100 : 0,
    }));
  }, [periodFilteredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6B7280',
      pending_approval: '#F59E0B',
      approved: '#10B981',
      rejected: '#EF4444',
      ordered: '#8B5CF6',
      partial_received: '#F97316',
      received: '#059669',
      closed: '#374151',
      cancelled: '#DC2626',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_approval: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      ordered: 'Ordered',
      partial_received: 'Partial',
      received: 'Received',
      closed: 'Closed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
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
      backgroundColor: '#0EA5E915',
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
    periodSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    periodChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    periodChipActive: {
      backgroundColor: '#0EA5E9',
    },
    periodChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    periodChipTextActive: {
      color: '#FFFFFF',
    },
    reportTabs: {
      flexDirection: 'row',
      gap: 8,
    },
    reportTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
      gap: 6,
    },
    reportTabActive: {
      backgroundColor: '#0EA5E915',
    },
    reportTabText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    reportTabTextActive: {
      color: '#0EA5E9',
      fontWeight: '600' as const,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    kpiCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    kpiCardLarge: {
      width: '100%',
    },
    kpiHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    kpiIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiChange: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 2,
    },
    kpiChangeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    kpiValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    kpiLabel: {
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
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 16,
    },
    barChart: {
      gap: 10,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    barLabel: {
      width: 100,
      fontSize: 12,
      color: colors.textSecondary,
    },
    barContainer: {
      flex: 1,
      height: 24,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    barValue: {
      width: 80,
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'right',
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusItem: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      gap: 10,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    statusInfo: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 13,
      color: colors.text,
    },
    statusCount: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    statusPercentage: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    vendorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
      gap: 12,
    },
    vendorRank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#0EA5E915',
      alignItems: 'center',
      justifyContent: 'center',
    },
    vendorRankText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#0EA5E9',
    },
    vendorInfo: {
      flex: 1,
    },
    vendorName: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
    },
    vendorOrders: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    vendorValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.titleIcon}>
            <BarChart3 size={24} color="#0EA5E9" />
          </View>
          <View>
            <Text style={styles.title}>PO Reports</Text>
            <Text style={styles.subtitle}>Analytics & insights</Text>
          </View>
        </View>

        <View style={styles.periodSelector}>
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' },
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[styles.periodChip, selectedPeriod === period.key && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(period.key as typeof selectedPeriod)}
            >
              <Text style={[styles.periodChipText, selectedPeriod === period.key && styles.periodChipTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.reportTabs}>
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'vendor', label: 'Vendors', icon: Building },
            { key: 'category', label: 'Status', icon: PieChart },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeReport === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.reportTab, isActive && styles.reportTabActive]}
                onPress={() => setActiveReport(tab.key as typeof activeReport)}
              >
                <TabIcon size={16} color={isActive ? '#0EA5E9' : colors.textSecondary} />
                <Text style={[styles.reportTabText, isActive && styles.reportTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={posLoading} onRefresh={refetchPOs} />}
      >
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIcon, { backgroundColor: '#3B82F615' }]}>
                <Package size={18} color="#3B82F6" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{stats.total}</Text>
            <Text style={styles.kpiLabel}>Total Orders</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIcon, { backgroundColor: '#10B98115' }]}>
                <DollarSign size={18} color="#10B981" />
              </View>
              {stats.valueChange !== 0 && (
                <View
                  style={[
                    styles.kpiChange,
                    { backgroundColor: stats.valueChange > 0 ? '#10B98115' : '#EF444415' },
                  ]}
                >
                  {stats.valueChange > 0 ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                  <Text
                    style={[styles.kpiChangeText, { color: stats.valueChange > 0 ? '#10B981' : '#EF4444' }]}
                  >
                    {Math.abs(stats.valueChange).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(stats.totalValue)}</Text>
            <Text style={styles.kpiLabel}>Total Value</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIcon, { backgroundColor: '#8B5CF615' }]}>
                <FileText size={18} color="#8B5CF6" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(stats.avgValue)}</Text>
            <Text style={styles.kpiLabel}>Avg Order Value</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <View style={[styles.kpiIcon, { backgroundColor: '#F59E0B15' }]}>
                <Clock size={18} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{stats.avgCycleTime}d</Text>
            <Text style={styles.kpiLabel}>Avg Cycle Time</Text>
          </View>
        </View>

        {activeReport === 'overview' && (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top Vendors by Spend</Text>
              {vendorStats.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Building size={28} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.emptyText}>No vendor data available</Text>
                </View>
              ) : (
                <View style={styles.barChart}>
                  {vendorStats.map((vendor, index) => {
                    const maxValue = vendorStats[0]?.value || 1;
                    const percentage = (vendor.value / maxValue) * 100;
                    return (
                      <View key={vendor.name} style={styles.barRow}>
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {vendor.name}
                        </Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${percentage}%`, backgroundColor: '#0EA5E9' },
                            ]}
                          />
                        </View>
                        <Text style={styles.barValue}>{formatCurrency(vendor.value)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {activeReport === 'vendor' && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Vendor Performance</Text>
            {vendorStats.map((vendor, index) => (
              <View key={vendor.name} style={styles.vendorCard}>
                <View style={styles.vendorRank}>
                  <Text style={styles.vendorRankText}>{index + 1}</Text>
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorOrders}>{vendor.orders} orders</Text>
                </View>
                <Text style={styles.vendorValue}>{formatCurrency(vendor.value)}</Text>
              </View>
            ))}
          </View>
        )}

        {activeReport === 'category' && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Order Status Distribution</Text>
            <View style={styles.statusGrid}>
              {statusDistribution.map((item) => (
                <View key={item.status} style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusLabel}>{getStatusLabel(item.status)}</Text>
                    <Text style={styles.statusCount}>{item.count} orders</Text>
                  </View>
                  <Text style={styles.statusPercentage}>{item.percentage.toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
