import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Package,
  Search,
  Filter,
  ChevronRight,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  X,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProcurementPurchaseOrdersQuery,
  useMaterialReceiptsQuery,
  POLineItem,
} from '@/hooks/useSupabaseProcurement';
import { Tables } from '@/lib/supabase';
import {
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  PO_TYPE_LABELS,
  POType,
  POStatus,
} from '@/types/procurement';

type ProcurementPurchaseOrder = Tables['procurement_purchase_orders'];
type MaterialReceipt = Tables['material_receipts'];

type TabFilter = 'pending' | 'partial' | 'completed' | 'history';

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
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function POReceivingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<POType | 'all'>('all');

  const pendingPOsQuery = useProcurementPurchaseOrdersQuery({
    status: ['approved', 'ordered'],
    poType: selectedType !== 'all' ? selectedType : undefined,
  });

  const partialPOsQuery = useProcurementPurchaseOrdersQuery({
    status: 'partial_received',
    poType: selectedType !== 'all' ? selectedType : undefined,
  });

  const completedPOsQuery = useProcurementPurchaseOrdersQuery({
    status: 'received',
    poType: selectedType !== 'all' ? selectedType : undefined,
    limit: 50,
  });

  const receiptsQuery = useMaterialReceiptsQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[POReceiving] Refreshing data...');
    try {
      await Promise.all([
        pendingPOsQuery.refetch(),
        partialPOsQuery.refetch(),
        completedPOsQuery.refetch(),
        receiptsQuery.refetch(),
      ]);
    } catch (error) {
      console.error('[POReceiving] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [pendingPOsQuery, partialPOsQuery, completedPOsQuery, receiptsQuery]);

  const pendingPOs = useMemo(() => {
    const pos = pendingPOsQuery.data || [];
    if (!searchQuery) return pos;
    const query = searchQuery.toLowerCase();
    return pos.filter(
      (po) =>
        po.po_number.toLowerCase().includes(query) ||
        po.vendor_name?.toLowerCase().includes(query)
    );
  }, [pendingPOsQuery.data, searchQuery]);

  const partialPOs = useMemo(() => {
    const pos = partialPOsQuery.data || [];
    if (!searchQuery) return pos;
    const query = searchQuery.toLowerCase();
    return pos.filter(
      (po) =>
        po.po_number.toLowerCase().includes(query) ||
        po.vendor_name?.toLowerCase().includes(query)
    );
  }, [partialPOsQuery.data, searchQuery]);

  const completedPOs = useMemo(() => {
    const pos = completedPOsQuery.data || [];
    if (!searchQuery) return pos;
    const query = searchQuery.toLowerCase();
    return pos.filter(
      (po) =>
        po.po_number.toLowerCase().includes(query) ||
        po.vendor_name?.toLowerCase().includes(query)
    );
  }, [completedPOsQuery.data, searchQuery]);

  const receipts = useMemo(() => {
    const rcpts = receiptsQuery.data || [];
    if (!searchQuery) return rcpts;
    const query = searchQuery.toLowerCase();
    return rcpts.filter(
      (r) =>
        r.receipt_number?.toLowerCase().includes(query) ||
        r.po_number?.toLowerCase().includes(query) ||
        r.vendor_name?.toLowerCase().includes(query)
    );
  }, [receiptsQuery.data, searchQuery]);

  const isLoading =
    pendingPOsQuery.isLoading ||
    partialPOsQuery.isLoading ||
    completedPOsQuery.isLoading ||
    receiptsQuery.isLoading;

  const stats = useMemo(() => {
    const pendingCount = (pendingPOsQuery.data || []).length;
    const partialCount = (partialPOsQuery.data || []).length;
    const completedCount = (completedPOsQuery.data || []).length;
    const receiptCount = (receiptsQuery.data || []).length;

    const pendingValue = (pendingPOsQuery.data || []).reduce(
      (sum, po) => sum + (po.total || 0),
      0
    );

    return {
      pendingCount,
      partialCount,
      completedCount,
      receiptCount,
      pendingValue,
    };
  }, [pendingPOsQuery.data, partialPOsQuery.data, completedPOsQuery.data, receiptsQuery.data]);

  const handleTabPress = (tab: TabFilter) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleReceive = (po: ProcurementPurchaseOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/procurement/receive');
  };

  const handleViewReceipt = (receipt: MaterialReceipt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[POReceiving] View receipt:', receipt.receipt_number);
  };

  const getReceivingProgress = (po: ProcurementPurchaseOrder) => {
    const lineItems = (po.line_items || []) as unknown as POLineItem[];
    const activeLines = lineItems.filter((l) => !l.is_deleted);
    if (activeLines.length === 0) return { received: 0, total: 0, percentage: 0 };

    const totalQty = activeLines.reduce((sum, l) => sum + l.quantity, 0);
    const receivedQty = activeLines.reduce((sum, l) => sum + (l.received_qty || 0), 0);
    const percentage = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

    return { received: receivedQty, total: totalQty, percentage };
  };

  const renderTab = (tab: TabFilter, label: string, count: number, color: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tab,
          {
            backgroundColor: isActive ? `${color}15` : 'transparent',
            borderColor: isActive ? color : colors.border,
          },
        ]}
        onPress={() => handleTabPress(tab)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, { color: isActive ? color : colors.textSecondary }]}>
          {label}
        </Text>
        <View style={[styles.tabBadge, { backgroundColor: isActive ? color : colors.backgroundTertiary }]}>
          <Text style={[styles.tabBadgeText, { color: isActive ? '#fff' : colors.textTertiary }]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPOCard = (po: ProcurementPurchaseOrder, showProgress: boolean = false) => {
    const poType = (po.po_type || 'material') as POType;
    const poStatus = po.status as POStatus;
    const statusColor = PO_STATUS_COLORS[poStatus] || '#6B7280';
    const progress = showProgress ? getReceivingProgress(po) : null;
    const lineItems = (po.line_items || []) as unknown as POLineItem[];
    const lineCount = lineItems.filter((l) => !l.is_deleted).length;

    return (
      <TouchableOpacity
        key={po.id}
        style={[styles.poCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleReceive(po)}
        activeOpacity={0.7}
      >
        <View style={styles.poHeader}>
          <View style={styles.poTitleRow}>
            <Text style={[styles.poNumber, { color: colors.primary }]}>{po.po_number}</Text>
            <View style={[styles.typeBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.typeBadgeText, { color: statusColor }]}>
                {PO_TYPE_LABELS[poType]}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {PO_STATUS_LABELS[poStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.poDetails}>
          <View style={styles.poDetailRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.poDetailText, { color: colors.text }]} numberOfLines={1}>
              {po.vendor_name || 'Unknown Vendor'}
            </Text>
          </View>
          <View style={styles.poDetailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.poDetailText, { color: colors.textSecondary }]}>
              Created {formatDate(po.created_at)}
            </Text>
          </View>
          <View style={styles.poDetailRow}>
            <FileText size={14} color={colors.textSecondary} />
            <Text style={[styles.poDetailText, { color: colors.textSecondary }]}>
              {lineCount} line item{lineCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {progress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Receiving Progress
              </Text>
              <Text style={[styles.progressValue, { color: progress.percentage === 100 ? '#10B981' : '#F59E0B' }]}>
                {progress.percentage}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.backgroundTertiary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress.percentage}%`,
                    backgroundColor: progress.percentage === 100 ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textTertiary }]}>
              {progress.received} of {progress.total} units received
            </Text>
          </View>
        )}

        <View style={styles.poFooter}>
          <Text style={[styles.poTotal, { color: colors.text }]}>{formatCurrency(po.total || 0)}</Text>
          <View style={styles.receiveButton}>
            <Text style={[styles.receiveButtonText, { color: colors.primary }]}>
              {poStatus === 'partial_received' ? 'Continue Receiving' : 'Start Receiving'}
            </Text>
            <ArrowRight size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompletedPOCard = (po: ProcurementPurchaseOrder) => {
    const poType = (po.po_type || 'material') as POType;

    return (
      <View
        key={po.id}
        style={[styles.completedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.completedHeader}>
          <View>
            <Text style={[styles.poNumber, { color: colors.text }]}>{po.po_number}</Text>
            <Text style={[styles.completedVendor, { color: colors.textSecondary }]}>
              {po.vendor_name}
            </Text>
          </View>
          <View style={[styles.completedBadge, { backgroundColor: '#10B98115' }]}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={[styles.completedBadgeText, { color: '#10B981' }]}>Received</Text>
          </View>
        </View>
        <View style={styles.completedFooter}>
          <Text style={[styles.completedTotal, { color: colors.text }]}>
            {formatCurrency(po.total || 0)}
          </Text>
          {po.received_date && (
            <Text style={[styles.completedDate, { color: colors.textTertiary }]}>
              {formatDate(po.received_date)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderReceiptCard = (receipt: MaterialReceipt) => {
    return (
      <TouchableOpacity
        key={receipt.id}
        style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewReceipt(receipt)}
        activeOpacity={0.7}
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptTitleRow}>
            <ClipboardCheck size={16} color="#10B981" />
            <Text style={[styles.receiptNumber, { color: colors.text }]}>
              {receipt.receipt_number}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>

        <View style={styles.receiptDetails}>
          <View style={styles.receiptDetailRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>PO:</Text>
            <Text style={[styles.receiptValue, { color: colors.primary }]}>{receipt.po_number}</Text>
          </View>
          <View style={styles.receiptDetailRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Vendor:</Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>{receipt.vendor_name || 'N/A'}</Text>
          </View>
          <View style={styles.receiptDetailRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Lines:</Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>{receipt.total_lines}</Text>
          </View>
          <View style={styles.receiptDetailRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Received by:</Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>
              {receipt.received_by_name || 'Unknown'}
            </Text>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={[styles.receiptDate, { color: colors.textTertiary }]}>
            {formatDateTime(receipt.receipt_date || receipt.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (message: string, icon: React.ReactNode) => (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {icon}
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );

  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'pending':
        return pendingPOs.length === 0
          ? renderEmptyState('No POs pending receiving', <Truck size={40} color={colors.textTertiary} />)
          : pendingPOs.map((po) => renderPOCard(po, false));
      case 'partial':
        return partialPOs.length === 0
          ? renderEmptyState('No partial receipts', <AlertCircle size={40} color={colors.textTertiary} />)
          : partialPOs.map((po) => renderPOCard(po, true));
      case 'completed':
        return completedPOs.length === 0
          ? renderEmptyState('No completed receipts', <CheckCircle size={40} color={colors.textTertiary} />)
          : completedPOs.map(renderCompletedPOCard);
      case 'history':
        return receipts.length === 0
          ? renderEmptyState('No receipt history', <FileText size={40} color={colors.textTertiary} />)
          : receipts.map(renderReceiptCard);
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'PO Receiving' }} />

      <View style={[styles.headerSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.headerCard, { backgroundColor: `${colors.primary}10` }]}>
          <View style={[styles.headerIconContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Package size={24} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Receiving Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {stats.pendingCount + stats.partialCount} POs awaiting receipt
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: '#3B82F615' }]}>
            <Clock size={16} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#F59E0B15' }]}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.partialCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Partial</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#10B98115' }]}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Received</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search POs or vendors..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={[styles.tabsScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {renderTab('pending', 'Pending', stats.pendingCount, '#3B82F6')}
        {renderTab('partial', 'Partial', stats.partialCount, '#F59E0B')}
        {renderTab('completed', 'Received', stats.completedCount, '#10B981')}
        {renderTab('history', 'History', stats.receiptCount, '#8B5CF6')}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderContent()}
        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/procurement/receive');
        }}
        activeOpacity={0.8}
      >
        <Truck size={22} color="#fff" />
        <Text style={styles.fabText}>Receive</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  tabsScroll: {
    borderBottomWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  poCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  poTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  poDetails: {
    gap: 6,
    marginBottom: 12,
  },
  poDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poDetailText: {
    fontSize: 13,
    flex: 1,
  },
  progressSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
  },
  poFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  poTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  receiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiveButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  completedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  completedVendor: {
    fontSize: 13,
    marginTop: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  completedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedTotal: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  completedDate: {
    fontSize: 12,
  },
  receiptCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  receiptDetails: {
    gap: 6,
    marginBottom: 10,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptLabel: {
    fontSize: 12,
    width: 80,
  },
  receiptValue: {
    fontSize: 12,
    flex: 1,
  },
  receiptFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  receiptDate: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
