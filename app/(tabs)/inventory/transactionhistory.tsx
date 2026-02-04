import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Filter,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  ArrowLeftRight,
  Trash2,
  ClipboardCheck,
  FileText,
  Package,
  User,
  Clock,
  Hash,
  FileDown,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useInventoryTransactionsQuery,
  useTransactionStats,
  InventoryTransaction,
  TransactionAction,
  getActionInfo,
} from '@/hooks/useSupabaseInventoryTransactions';
import * as Haptics from 'expo-haptics';

type DateFilter = 'all' | 'today' | 'week' | 'month';

const TRANSACTION_TYPE_OPTIONS: { value: TransactionAction | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Types', color: '#6B7280' },
  { value: 'receive', label: 'Received', color: '#10B981' },
  { value: 'issue', label: 'Issued', color: '#3B82F6' },
  { value: 'adjustment', label: 'Adjusted', color: '#F59E0B' },
  { value: 'transfer', label: 'Transferred', color: '#8B5CF6' },
  { value: 'count', label: 'Count', color: '#06B6D4' },
  { value: 'create', label: 'Created', color: '#22C55E' },
  { value: 'delete', label: 'Deleted', color: '#EF4444' },
];

export default function TransactionHistoryScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionAction | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const dateFromFilter = useMemo(() => {
    if (dateFilter === 'all') return undefined;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (dateFilter) {
      case 'today':
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo.toISOString();
      default:
        return undefined;
    }
  }, [dateFilter]);

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInventoryTransactionsQuery({
    action: typeFilter !== 'all' ? typeFilter : undefined,
    dateFrom: dateFromFilter,
    limit: 200,
  });

  const { data: stats = { total: 0, received: 0, issued: 0, adjusted: 0, transfers: 0, counts: 0 } } = useTransactionStats(dateFromFilter);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;

    const query = searchQuery.toLowerCase();
    return transactions.filter(
      t =>
        t.material_sku.toLowerCase().includes(query) ||
        t.material_name.toLowerCase().includes(query) ||
        t.performed_by.toLowerCase().includes(query) ||
        t.reason?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const displayStats = useMemo(() => ({
    total: stats.total,
    received: stats.received,
    issued: stats.issued,
    adjusted: stats.adjusted + stats.counts,
  }), [stats]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setDateFilter('all');
    setShowFilterModal(false);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    return count;
  }, [typeFilter, dateFilter]);

  const openTransactionDetail = useCallback((transaction: InventoryTransaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const getTransactionIcon = useCallback((action: TransactionAction) => {
    switch (action) {
      case 'receive':
        return ArrowDownCircle;
      case 'issue':
        return ArrowUpCircle;
      case 'adjustment':
        return Edit3;
      case 'transfer':
        return ArrowLeftRight;
      case 'count':
        return ClipboardCheck;
      case 'create':
        return Plus;
      case 'delete':
        return Trash2;
      default:
        return Package;
    }
  }, []);

  const exportToCSV = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const headers = ['Date', 'Time', 'Type', 'Material SKU', 'Item Name', 'Change', 'Before', 'After', 'Reason', 'Performed By', 'Notes'];
    const rows = filteredTransactions.map(t => [
      formatDate(t.created_at),
      formatTime(t.created_at),
      t.action,
      t.material_sku,
      t.material_name,
      t.quantity_change >= 0 ? `+${t.quantity_change}` : t.quantity_change,
      t.quantity_before,
      t.quantity_after,
      t.reason || '',
      t.performed_by,
      t.notes || '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    try {
      await Share.share({
        message: csvContent,
        title: `Inventory Transactions ${formatDate(new Date().toISOString())}`,
      });
      console.log('[TransactionHistory] Exported CSV with', filteredTransactions.length, 'records');
    } catch (error) {
      console.log('[TransactionHistory] Export error:', error);
    }
  }, [filteredTransactions, formatDate, formatTime]);

  const renderTransactionRow = useCallback((transaction: InventoryTransaction) => {
    const actionInfo = getActionInfo(transaction.action);
    const IconComponent = getTransactionIcon(transaction.action);

    return (
      <Pressable
        key={transaction.id}
        style={[styles.transactionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openTransactionDetail(transaction)}
      >
        <View style={styles.transactionHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: actionInfo.bgColor }]}>
            <IconComponent size={18} color={actionInfo.color} />
          </View>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTitleRow}>
              <Text style={[styles.transactionType, { color: actionInfo.color }]}>
                {actionInfo.label}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: actionInfo.bgColor }]}>
                <Text style={[styles.typeBadgeText, { color: actionInfo.color }]}>
                  {transaction.quantity_change >= 0 ? '+' : ''}{transaction.quantity_change}
                </Text>
              </View>
            </View>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {transaction.material_name}
            </Text>
            <View style={styles.transactionMeta}>
              <Text style={[styles.materialNumber, { color: colors.textSecondary }]}>
                {transaction.material_sku}
              </Text>
              {transaction.reason && (
                <>
                  <View style={[styles.dot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.lotNumber, { color: colors.textTertiary }]} numberOfLines={1}>
                    {transaction.reason}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.transactionFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerLeft}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {formatDate(transaction.created_at)} at {formatTime(transaction.created_at)}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <User size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {transaction.performed_by}
            </Text>
          </View>
        </View>

        {transaction.notes && (
          <View style={[styles.referenceRow, { backgroundColor: colors.backgroundSecondary }]}>
            <Hash size={10} color={colors.textTertiary} />
            <Text style={[styles.referenceText, { color: colors.textSecondary }]} numberOfLines={1}>
              {transaction.notes}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }, [colors, formatDate, formatTime, getTransactionIcon, openTransactionDetail]);

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
          <Pressable onPress={clearFilters} style={styles.modalActionBtn}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Transaction Type</Text>
          <View style={styles.filterChips}>
            {TRANSACTION_TYPE_OPTIONS.map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: typeFilter === option.value ? option.color + '20' : colors.surface,
                    borderColor: typeFilter === option.value ? option.color : colors.border,
                  }
                ]}
                onPress={() => setTypeFilter(option.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: typeFilter === option.value ? option.color : colors.text }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Date Range</Text>
          <View style={styles.filterChips}>
            {[
              { value: 'all' as DateFilter, label: 'All Time' },
              { value: 'today' as DateFilter, label: 'Today' },
              { value: 'week' as DateFilter, label: 'This Week' },
              { value: 'month' as DateFilter, label: 'This Month' },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: dateFilter === option.value ? colors.primary + '20' : colors.surface,
                    borderColor: dateFilter === option.value ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setDateFilter(option.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: dateFilter === option.value ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

        </ScrollView>

        <Pressable
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(false)}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedTransaction) return null;
    
    const actionInfo = getActionInfo(selectedTransaction.action);
    const IconComponent = getTransactionIcon(selectedTransaction.action);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Transaction Details</Text>
            <View style={styles.modalActionBtn} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.detailHeader, { backgroundColor: actionInfo.bgColor }]}>
              <View style={[styles.detailIconLarge, { backgroundColor: colors.surface }]}>
                <IconComponent size={32} color={actionInfo.color} />
              </View>
              <Text style={[styles.detailType, { color: actionInfo.color }]}>
                {actionInfo.label}
              </Text>
              <Text style={[styles.detailQuantity, { color: actionInfo.color }]}>
                {selectedTransaction.quantity_change >= 0 ? '+' : ''}{selectedTransaction.quantity_change}
              </Text>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailItemName, { color: colors.text }]}>
                {selectedTransaction.material_name}
              </Text>
              <Text style={[styles.detailMaterialNumber, { color: colors.textSecondary }]}>
                {selectedTransaction.material_sku}
              </Text>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Quantity Change</Text>
              <View style={styles.quantityChangeRow}>
                <View style={styles.quantityBox}>
                  <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>Before</Text>
                  <Text style={[styles.quantityValue, { color: colors.text }]}>
                    {selectedTransaction.quantity_before}
                  </Text>
                </View>
                <View style={[styles.quantityArrow, { backgroundColor: actionInfo.bgColor }]}>
                  <ArrowLeftRight size={16} color={actionInfo.color} />
                </View>
                <View style={styles.quantityBox}>
                  <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>After</Text>
                  <Text style={[styles.quantityValue, { color: colors.text }]}>
                    {selectedTransaction.quantity_after}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Date & Time</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selectedTransaction.created_at)} at {formatTime(selectedTransaction.created_at)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Performed By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedTransaction.performed_by}
                </Text>
              </View>
              {selectedTransaction.reason && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Reason</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedTransaction.reason}
                  </Text>
                </View>
              )}
            </View>

            {selectedTransaction.notes && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {selectedTransaction.notes}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading transactions...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error?.message || 'An error occurred'}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <RefreshCw size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{displayStats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{displayStats.received}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Received</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{displayStats.issued}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Issued</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{displayStats.adjusted}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Adjusted</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search material #, lot #, reference..."
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[
            styles.filterButton,
            { 
              backgroundColor: colors.surface, 
              borderColor: activeFilterCount > 0 ? colors.primary : colors.border 
            }
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={activeFilterCount > 0 ? colors.primary : colors.textTertiary} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.quickFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickFilterRow}>
            {TRANSACTION_TYPE_OPTIONS.slice(0, 5).map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.quickFilterChip,
                  {
                    backgroundColor: typeFilter === option.value ? option.color + '15' : colors.surface,
                    borderColor: typeFilter === option.value ? option.color : colors.border,
                  }
                ]}
                onPress={() => setTypeFilter(typeFilter === option.value ? 'all' : option.value)}
              >
                <Text style={[
                  styles.quickFilterText,
                  { color: typeFilter === option.value ? option.color : colors.textSecondary }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filteredTransactions.length} transactions
        </Text>
        <Pressable
          style={[styles.exportButton, { backgroundColor: colors.primary + '15' }]}
          onPress={exportToCSV}
        >
          <FileDown size={14} color={colors.primary} />
          <Text style={[styles.exportButtonText, { color: colors.primary }]}>Export</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filteredTransactions.map(renderTransactionRow)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderFilterModal()}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  quickFilters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickFilterText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultCount: {
    fontSize: 13,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  transactionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  transactionHeader: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deptBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  deptBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700' as const,
  },
  materialNumber: {
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  lotNumber: {
    fontSize: 10,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  referenceText: {
    fontSize: 10,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalActionBtn: {
    padding: 4,
    minWidth: 50,
    alignItems: 'flex-end' as const,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  applyButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailHeader: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 0,
  },
  detailIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailType: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  detailQuantity: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  detailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailItemName: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  detailMaterialNumber: {
    fontSize: 13,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  quantityChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  quantityArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 2,
    textAlign: 'right' as const,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
