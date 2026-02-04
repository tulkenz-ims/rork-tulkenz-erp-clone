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
import {
  Calendar,
  AlertTriangle,
  Clock,
  Package,
  ChevronRight,
  Trash2,
  PauseCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { 
  useLotsQuery,
  useMarkLotConsumed,
  useHoldLot,
  useDisposeLot,
  InventoryLot,
} from '@/hooks/useSupabaseLots';
import { getDepartmentFromMaterialNumber } from '@/constants/inventoryDepartmentCodes';
import * as Haptics from 'expo-haptics';

type FilterStatus = 'all' | 'expired' | 'expiring_soon' | 'warning' | 'ok';

interface ExpirationStatus {
  status: 'expired' | 'expiring_soon' | 'warning' | 'ok';
  label: string;
  color: string;
  bgColor: string;
  daysRemaining: number;
}

function getExpirationStatus(expirationDate: string | undefined | null): ExpirationStatus {
  if (!expirationDate) {
    return {
      status: 'ok',
      label: 'No expiration',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      daysRemaining: 999,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'expired',
      label: 'Expired',
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      daysRemaining,
    };
  } else if (daysRemaining <= 7) {
    return {
      status: 'expiring_soon',
      label: 'Expiring Soon',
      color: '#F97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      daysRemaining,
    };
  } else if (daysRemaining <= 30) {
    return {
      status: 'warning',
      label: 'Warning',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      daysRemaining,
    };
  } else {
    return {
      status: 'ok',
      label: 'OK',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      daysRemaining,
    };
  }
}

export default function ExpirationTrackingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');

  const { data: lots = [], isLoading, refetch, isRefetching } = useLotsQuery({ status: 'active' });

  const markConsumedMutation = useMarkLotConsumed({
    onSuccess: () => {
      console.log('[ExpirationTracking] Lot marked as consumed');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const holdMutation = useHoldLot({
    onSuccess: () => {
      console.log('[ExpirationTracking] Lot put on hold');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const disposeMutation = useDisposeLot({
    onSuccess: () => {
      console.log('[ExpirationTracking] Lot disposed');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const lotsWithExpiration = useMemo(() => {
    return lots
      .filter(l => l.expiration_date && l.status === 'active')
      .map(l => ({
        ...l,
        expStatus: getExpirationStatus(l.expiration_date),
      }))
      .sort((a, b) => {
        const aDate = new Date(a.expiration_date || '9999-12-31');
        const bDate = new Date(b.expiration_date || '9999-12-31');
        return aDate.getTime() - bDate.getTime();
      });
  }, [lots]);

  const filteredLots = useMemo(() => {
    if (selectedFilter === 'all') return lotsWithExpiration;
    return lotsWithExpiration.filter(l => l.expStatus.status === selectedFilter);
  }, [lotsWithExpiration, selectedFilter]);

  const stats = useMemo(() => {
    const expired = lotsWithExpiration.filter(l => l.expStatus.status === 'expired').length;
    const expiringSoon = lotsWithExpiration.filter(l => l.expStatus.status === 'expiring_soon').length;
    const warning = lotsWithExpiration.filter(l => l.expStatus.status === 'warning').length;
    const ok = lotsWithExpiration.filter(l => l.expStatus.status === 'ok').length;
    return { expired, expiringSoon, warning, ok, total: lotsWithExpiration.length };
  }, [lotsWithExpiration]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleMarkUsed = useCallback((lot: InventoryLot) => {
    Alert.alert(
      'Mark as Used',
      `Mark lot ${lot.internal_lot_number} as fully consumed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            markConsumedMutation.mutate({
              lotId: lot.id,
              consumedBy: user ? `${user.first_name} ${user.last_name}` : 'System',
              notes: 'Marked as consumed from expiration tracking',
            });
          },
        },
      ]
    );
  }, [markConsumedMutation, user]);

  const handleDispose = useCallback((lot: InventoryLot) => {
    Alert.alert(
      'Dispose Lot',
      `Are you sure you want to dispose of lot ${lot.internal_lot_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispose',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            disposeMutation.mutate({
              lotId: lot.id,
              disposedBy: user ? `${user.first_name} ${user.last_name}` : 'System',
              notes: 'Disposed from expiration tracking',
            });
          },
        },
      ]
    );
  }, [disposeMutation, user]);

  const handlePutOnHold = useCallback((lot: InventoryLot) => {
    Alert.alert(
      'Put on Hold',
      `Put lot ${lot.internal_lot_number} on hold for review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            holdMutation.mutate({
              lotId: lot.id,
              holdReason: 'Approaching expiration - review required',
              holdBy: user ? `${user.first_name} ${user.last_name}` : 'System',
            });
          },
        },
      ]
    );
  }, [holdMutation, user]);

  const navigateToLotTracking = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/inventory/lottracking');
  }, [router]);

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <Pressable 
        style={[
          styles.summaryCard, 
          { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: selectedFilter === 'expired' ? '#EF4444' : 'transparent' }
        ]}
        onPress={() => setSelectedFilter(selectedFilter === 'expired' ? 'all' : 'expired')}
      >
        <AlertTriangle size={24} color="#EF4444" />
        <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{stats.expired}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expired</Text>
      </Pressable>

      <Pressable 
        style={[
          styles.summaryCard, 
          { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: selectedFilter === 'expiring_soon' ? '#F97316' : 'transparent' }
        ]}
        onPress={() => setSelectedFilter(selectedFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
      >
        <Clock size={24} color="#F97316" />
        <Text style={[styles.summaryValue, { color: '#F97316' }]}>{stats.expiringSoon}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>7 Days</Text>
      </Pressable>

      <Pressable 
        style={[
          styles.summaryCard, 
          { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: selectedFilter === 'warning' ? '#F59E0B' : 'transparent' }
        ]}
        onPress={() => setSelectedFilter(selectedFilter === 'warning' ? 'all' : 'warning')}
      >
        <Calendar size={24} color="#F59E0B" />
        <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{stats.warning}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>30 Days</Text>
      </Pressable>

      <Pressable 
        style={[
          styles.summaryCard, 
          { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: selectedFilter === 'ok' ? '#10B981' : 'transparent' }
        ]}
        onPress={() => setSelectedFilter(selectedFilter === 'ok' ? 'all' : 'ok')}
      >
        <CheckCircle size={24} color="#10B981" />
        <Text style={[styles.summaryValue, { color: '#10B981' }]}>{stats.ok}</Text>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>OK</Text>
      </Pressable>
    </View>
  );

  const renderLotItem = (lot: InventoryLot & { expStatus: ExpirationStatus }) => {
    const dept = getDepartmentFromMaterialNumber(lot.material_sku);
    const { expStatus } = lot;
    const isActionPending = markConsumedMutation.isPending || holdMutation.isPending || disposeMutation.isPending;

    return (
      <View
        key={lot.id}
        style={[styles.lotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.lotHeader}>
          <View style={styles.lotTitleRow}>
            <View style={[styles.deptBadge, { backgroundColor: dept?.color || colors.primary }]}>
              <Text style={styles.deptBadgeText}>{dept?.shortName || 'INV'}</Text>
            </View>
            <View style={styles.lotInfo}>
              <Text style={[styles.lotNumber, { color: colors.text }]}>
                {lot.internal_lot_number}
              </Text>
              <Text style={[styles.itemName, { color: colors.textSecondary }]} numberOfLines={1}>
                {lot.material_name}
              </Text>
            </View>
          </View>
          <View style={[styles.expBadge, { backgroundColor: expStatus.bgColor }]}>
            <Text style={[styles.expBadgeText, { color: expStatus.color }]}>
              {expStatus.daysRemaining < 0 
                ? `${Math.abs(expStatus.daysRemaining)}d overdue`
                : expStatus.daysRemaining === 0 
                  ? 'Today'
                  : `${expStatus.daysRemaining}d`
              }
            </Text>
          </View>
        </View>

        <View style={[styles.expDateRow, { backgroundColor: expStatus.bgColor }]}>
          <Calendar size={14} color={expStatus.color} />
          <Text style={[styles.expDateText, { color: expStatus.color }]}>
            Expires: {lot.expiration_date}
          </Text>
          <Text style={[styles.expStatusText, { color: expStatus.color }]}>
            {expStatus.label}
          </Text>
        </View>

        <View style={styles.lotDetails}>
          <View style={styles.detailItem}>
            <Package size={14} color={colors.textTertiary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {lot.quantity_remaining} {lot.unit_of_measure}
            </Text>
          </View>
          <Text style={[styles.detailDivider, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {lot.storage_location || 'No location'}
          </Text>
          <Text style={[styles.detailDivider, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            Vendor: {lot.vendor_lot_number || 'N/A'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
            onPress={() => handleMarkUsed(lot)}
            disabled={isActionPending}
          >
            <CheckCircle size={16} color="#10B981" />
            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Mark Used</Text>
          </Pressable>
          
          <Pressable
            style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
            onPress={() => handlePutOnHold(lot)}
            disabled={isActionPending}
          >
            <PauseCircle size={16} color="#F59E0B" />
            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Hold</Text>
          </Pressable>
          
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.errorBg }]}
            onPress={() => handleDispose(lot)}
            disabled={isActionPending}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Dispose</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading lots...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderSummaryCards()}

        {selectedFilter !== 'all' && (
          <Pressable 
            style={[styles.clearFilterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.clearFilterText, { color: colors.primary }]}>
              Clear filter - Showing {selectedFilter.replace('_', ' ')}
            </Text>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {selectedFilter === 'all' ? 'All Expiring Lots' : `${filteredLots.length} Lots`}
          </Text>
          <Pressable style={styles.viewAllBtn} onPress={navigateToLotTracking}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All Lots</Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        </View>

        {filteredLots.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <CheckCircle size={48} color={colors.success} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {selectedFilter === 'all' ? 'No expiring lots' : `No ${selectedFilter.replace('_', ' ')} lots`}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              All tracked lots are within acceptable date ranges
            </Text>
          </View>
        ) : (
          filteredLots.map(renderLotItem)
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>FDA 2026 Traceability</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Track lot expiration dates to maintain compliance with FDA FSMA 204 requirements. 
            Items expiring within 7 days should be prioritized for use or disposition.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  clearFilterBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  lotCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deptBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  lotInfo: {
    flex: 1,
  },
  lotNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  itemName: {
    fontSize: 12,
    marginTop: 2,
  },
  expBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  expBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  expDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  expDateText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  expStatusText: {
    fontSize: 12,
    marginLeft: 'auto' as const,
  },
  lotDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  detailDivider: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
