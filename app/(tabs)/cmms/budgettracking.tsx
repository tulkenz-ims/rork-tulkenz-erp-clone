import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useBudgetsQuery,
  useUpdateBudget,
  useApproveBudget,
} from '@/hooks/useCMMSCostTracking';
import {
  MaintenanceBudget,
  BudgetAllocation,
  BudgetStatus,
  BUDGET_PERIODS,
} from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  AlertTriangle,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  Target,
  Hash,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<BudgetStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: Clock },
  approved: { label: 'Approved', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: CheckCircle2 },
  active: { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  closed: { label: 'Closed', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: XCircle },
  over_budget: { label: 'Over Budget', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
};

type StatusFilter = 'all' | BudgetStatus;
type SortField = 'created_at' | 'budget_number' | 'total_budget' | 'percent_used';
type SortDirection = 'asc' | 'desc';

export default function BudgetTrackingScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [_showCreateModal, _setShowCreateModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<MaintenanceBudget | null>(null);

  const { data: budgets = [], isLoading, refetch } = useBudgetsQuery({
    facilityId: facilityId || undefined,
  });

  const approveMutation = useApproveBudget({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedBudget(null);
      Alert.alert('Success', 'Budget approved successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to approve budget');
    },
  });

  const updateMutation = useUpdateBudget({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedBudget(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update budget');
    },
  });

  const filteredBudgets = useMemo(() => {
    let filtered = [...budgets];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(budget => budget.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(budget =>
        budget.budgetNumber.toLowerCase().includes(query) ||
        budget.name.toLowerCase().includes(query) ||
        budget.facilityName.toLowerCase().includes(query) ||
        budget.departmentName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'budget_number':
          comparison = a.budgetNumber.localeCompare(b.budgetNumber);
          break;
        case 'total_budget':
          comparison = a.totalBudget - b.totalBudget;
          break;
        case 'percent_used':
          comparison = a.percentUsed - b.percentUsed;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [budgets, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = budgets.length;
    const active = budgets.filter(b => b.status === 'active').length;
    const overBudget = budgets.filter(b => b.status === 'over_budget').length;
    const totalBudgetAmount = budgets.reduce((sum, b) => sum + (b.totalBudget || 0), 0);
    const totalSpentAmount = budgets.reduce((sum, b) => sum + (b.totalSpent || 0), 0);
    const totalAvailable = budgets.reduce((sum, b) => sum + (b.totalAvailable || 0), 0);
    const avgUtilization = budgets.length > 0 
      ? budgets.reduce((sum, b) => sum + (b.percentUsed || 0), 0) / budgets.length 
      : 0;
    return { total, active, overBudget, totalBudgetAmount, totalSpentAmount, totalAvailable, avgUtilization };
  }, [budgets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBudgetPress = useCallback((budget: MaintenanceBudget) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBudget(budget);
    setShowDetailModal(true);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedBudget) return;
    Alert.alert(
      'Approve Budget',
      `Approve budget ${selectedBudget.budgetNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approveMutation.mutate({
              id: selectedBudget.id,
              approvedBy: 'current-user-id',
              approvedByName: 'Current User',
            });
          },
        },
      ]
    );
  }, [selectedBudget, approveMutation]);

  const handleActivate = useCallback(() => {
    if (!selectedBudget) return;
    Alert.alert(
      'Activate Budget',
      `Activate budget ${selectedBudget.budgetNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: () => {
            updateMutation.mutate({
              id: selectedBudget.id,
              updates: { status: 'active' },
            });
          },
        },
      ]
    );
  }, [selectedBudget, updateMutation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 100) return '#EF4444';
    if (percent >= 80) return '#F59E0B';
    if (percent >= 50) return '#3B82F6';
    return '#10B981';
  };

  const renderBudgetCard = (budget: MaintenanceBudget) => {
    const statusConfig = STATUS_CONFIG[budget.status];
    const StatusIcon = statusConfig.icon;
    const utilizationColor = getUtilizationColor(budget.percentUsed);

    return (
      <TouchableOpacity
        key={budget.id}
        style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleBudgetPress(budget)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.budgetNumberContainer}>
            <View style={[styles.budgetNumberBadge, { backgroundColor: colors.primary + '15' }]}>
              <Hash size={12} color={colors.primary} />
              <Text style={[styles.budgetNumber, { color: colors.primary }]}>
                {budget.budgetNumber}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.budgetName, { color: colors.text }]} numberOfLines={1}>
          {budget.name}
        </Text>

        <View style={styles.facilityRow}>
          <Building2 size={14} color={colors.textSecondary} />
          <Text style={[styles.facilityText, { color: colors.textSecondary }]} numberOfLines={1}>
            {budget.facilityName}
            {budget.departmentName && ` • ${budget.departmentName}`}
          </Text>
        </View>

        <View style={styles.periodRow}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.periodText, { color: colors.textSecondary }]}>
            {BUDGET_PERIODS[budget.period]} • FY{budget.fiscalYear}
          </Text>
          <Text style={[styles.dateRange, { color: colors.textTertiary }]}>
            {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
          </Text>
        </View>

        <View style={styles.budgetAmounts}>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Budget</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>
              {formatCurrency(budget.totalBudget)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Spent</Text>
            <Text style={[styles.amountValue, { color: '#EF4444' }]}>
              {formatCurrency(budget.totalSpent)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Available</Text>
            <Text style={[styles.amountValue, { color: '#10B981' }]}>
              {formatCurrency(budget.totalAvailable)}
            </Text>
          </View>
        </View>

        <View style={styles.utilizationSection}>
          <View style={styles.utilizationHeader}>
            <Text style={[styles.utilizationLabel, { color: colors.textSecondary }]}>Utilization</Text>
            <Text style={[styles.utilizationPercent, { color: utilizationColor }]}>
              {budget.percentUsed.toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: utilizationColor,
                  width: `${Math.min(budget.percentUsed, 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.createdBy, { color: colors.textTertiary }]}>
            By {budget.createdByName}
          </Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAllocationItem = (allocation: BudgetAllocation) => {
    const utilizationColor = getUtilizationColor(allocation.percentUsed);
    
    return (
      <View
        key={allocation.id}
        style={[styles.allocationItem, { borderBottomColor: colors.border }]}
      >
        <View style={styles.allocationHeader}>
          <Text style={[styles.allocationCategory, { color: colors.text }]}>
            {allocation.categoryName}
          </Text>
          <Text style={[styles.allocationPercent, { color: utilizationColor }]}>
            {allocation.percentUsed.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.allocationAmounts}>
          <View style={styles.allocationAmountCol}>
            <Text style={[styles.allocationAmountLabel, { color: colors.textTertiary }]}>Budget</Text>
            <Text style={[styles.allocationAmountValue, { color: colors.text }]}>
              {formatCurrency(allocation.budgetAmount)}
            </Text>
          </View>
          <View style={styles.allocationAmountCol}>
            <Text style={[styles.allocationAmountLabel, { color: colors.textTertiary }]}>Spent</Text>
            <Text style={[styles.allocationAmountValue, { color: '#EF4444' }]}>
              {formatCurrency(allocation.spentAmount)}
            </Text>
          </View>
          <View style={styles.allocationAmountCol}>
            <Text style={[styles.allocationAmountLabel, { color: colors.textTertiary }]}>Available</Text>
            <Text style={[styles.allocationAmountValue, { color: '#10B981' }]}>
              {formatCurrency(allocation.availableAmount)}
            </Text>
          </View>
        </View>
        <View style={[styles.allocationProgress, { backgroundColor: colors.backgroundSecondary }]}>
          <View
            style={[
              styles.allocationProgressFill,
              {
                backgroundColor: utilizationColor,
                width: `${Math.min(allocation.percentUsed, 100)}%`,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedBudget) return null;
    const statusConfig = STATUS_CONFIG[selectedBudget.status];
    const StatusIcon = statusConfig.icon;
    const utilizationColor = getUtilizationColor(selectedBudget.percentUsed);
    const canApprove = selectedBudget.status === 'draft';
    const canActivate = selectedBudget.status === 'approved';

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Budget Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.budgetNumberBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Hash size={14} color={colors.primary} />
                  <Text style={[styles.budgetNumberLarge, { color: colors.primary }]}>
                    {selectedBudget.budgetNumber}
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={16} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              <Text style={[styles.budgetNameLarge, { color: colors.text }]}>
                {selectedBudget.name}
              </Text>

              {selectedBudget.description && (
                <Text style={[styles.budgetDescription, { color: colors.textSecondary }]}>
                  {selectedBudget.description}
                </Text>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Building2 size={16} color="#3B82F6" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Facility</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedBudget.facilityName}
                  </Text>
                  {selectedBudget.departmentName && (
                    <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                      {selectedBudget.departmentName}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Calendar size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Period</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {BUDGET_PERIODS[selectedBudget.period]} • FY{selectedBudget.fiscalYear}
                  </Text>
                  <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                    {formatDate(selectedBudget.periodStart)} - {formatDate(selectedBudget.periodEnd)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.summarySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Summary</Text>
              
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
                  <Wallet size={20} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Budget</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {formatCurrency(selectedBudget.totalBudget)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#EF4444' + '10' }]}>
                  <TrendingDown size={20} color="#EF4444" />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Spent</Text>
                  <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                    {formatCurrency(selectedBudget.totalSpent)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#F59E0B' + '10' }]}>
                  <Target size={20} color="#F59E0B" />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Committed</Text>
                  <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                    {formatCurrency(selectedBudget.totalCommitted)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#10B981' + '10' }]}>
                  <TrendingUp size={20} color="#10B981" />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Available</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedBudget.totalAvailable)}
                  </Text>
                </View>
              </View>

              <View style={styles.utilizationDetailSection}>
                <View style={styles.utilizationDetailHeader}>
                  <Text style={[styles.utilizationDetailLabel, { color: colors.textSecondary }]}>
                    Overall Utilization
                  </Text>
                  <Text style={[styles.utilizationDetailPercent, { color: utilizationColor }]}>
                    {selectedBudget.percentUsed.toFixed(1)}%
                  </Text>
                </View>
                <View style={[styles.progressBarLarge, { backgroundColor: colors.backgroundSecondary }]}>
                  <View
                    style={[
                      styles.progressFillLarge,
                      {
                        backgroundColor: utilizationColor,
                        width: `${Math.min(selectedBudget.percentUsed, 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {selectedBudget.allocations.length > 0 && (
              <View style={[styles.allocationsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Allocations ({selectedBudget.allocations.length})
                </Text>
                {selectedBudget.allocations.map(renderAllocationItem)}
              </View>
            )}

            {selectedBudget.approvedByName && (
              <View style={[styles.approvalSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Approved By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedBudget.approvedByName}
                    </Text>
                    {selectedBudget.approvedAt && (
                      <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                        {formatDate(selectedBudget.approvedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {selectedBudget.notes && (
              <View style={[styles.notesSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.notesLabel, { color: colors.textTertiary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{selectedBudget.notes}</Text>
              </View>
            )}
          </ScrollView>

          {(canApprove || canActivate) && (
            <View style={[styles.modalActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              {canApprove && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton, { backgroundColor: '#3B82F6' }]}
                  onPress={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Approve Budget</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canActivate && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.activateButton, { backgroundColor: '#10B981' }]}
                  onPress={handleActivate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <TrendingUp size={18} color="#FFFFFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Activate Budget</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Filter by Status</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                { borderBottomColor: colors.border },
                statusFilter === 'all' && { backgroundColor: colors.primary + '10' },
              ]}
              onPress={() => {
                setStatusFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, { color: statusFilter === 'all' ? colors.primary : colors.text }]}>
                All Status
              </Text>
              {statusFilter === 'all' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  statusFilter === status && { backgroundColor: config.bgColor },
                ]}
                onPress={() => {
                  setStatusFilter(status as BudgetStatus);
                  setShowFilterModal(false);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <config.icon size={18} color={config.color} />
                  <Text style={[styles.filterOptionText, { color: statusFilter === status ? config.color : colors.text }]}>
                    {config.label}
                  </Text>
                </View>
                {statusFilter === status && <Check size={20} color={config.color} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>Sort By</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterOptions}>
            {[
              { field: 'created_at', label: 'Date Created' },
              { field: 'budget_number', label: 'Budget Number' },
              { field: 'total_budget', label: 'Total Budget' },
              { field: 'percent_used', label: 'Utilization' },
            ].map((option) => (
              <TouchableOpacity
                key={option.field}
                style={[
                  styles.filterOption,
                  { borderBottomColor: colors.border },
                  sortField === option.field && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  if (sortField === option.field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(option.field as SortField);
                    setSortDirection('desc');
                  }
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: sortField === option.field ? colors.primary : colors.text }]}>
                  {option.label}
                </Text>
                {sortField === option.field && (
                  <View style={styles.sortIndicator}>
                    <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Budget Tracking' }} />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Total</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.active.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.active.color }]}>{statistics.active}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.active.color }]}>Active</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.over_budget.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.over_budget.color }]}>{statistics.overBudget}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.over_budget.color }]}>Over Budget</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#8B5CF6' + '15' }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{statistics.avgUtilization.toFixed(0)}%</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Avg Used</Text>
          </View>
        </View>
        <View style={styles.budgetSummaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <DollarSign size={14} color={colors.primary} />
            <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Budget:</Text>
            <Text style={[styles.summaryItemValue, { color: colors.primary }]}>
              {formatCurrency(statistics.totalBudgetAmount)}
            </Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: colors.backgroundSecondary }]}>
            <TrendingDown size={14} color="#EF4444" />
            <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Spent:</Text>
            <Text style={[styles.summaryItemValue, { color: '#EF4444' }]}>
              {formatCurrency(statistics.totalSpentAmount)}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search budgets..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: statusFilter !== 'all' ? colors.primary : colors.border },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={statusFilter !== 'all' ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSortModal(true)}
        >
          <ArrowUpDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {filteredBudgets.length} {filteredBudgets.length === 1 ? 'budget' : 'budgets'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredBudgets.length > 0 ? (
          filteredBudgets.map(renderBudgetCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <PieChart size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Budgets Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all'
                ? 'No budgets match your filters'
                : 'Maintenance budgets will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderFilterModal()}
      {renderSortModal()}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  statsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  budgetSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  summaryItemLabel: {
    fontSize: 12,
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  budgetCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  budgetNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  budgetNumberLarge: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  budgetNameLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  budgetDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityText: {
    fontSize: 13,
    flex: 1,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  dateRange: {
    fontSize: 12,
  },
  budgetAmounts: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  utilizationSection: {
    paddingTop: 8,
    gap: 6,
  },
  utilizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilizationLabel: {
    fontSize: 12,
  },
  utilizationPercent: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  createdBy: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  detailSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  detailSubvalue: {
    fontSize: 12,
    marginTop: 2,
  },
  summarySection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  utilizationDetailSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  utilizationDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilizationDetailLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  utilizationDetailPercent: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  progressBarLarge: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 5,
  },
  allocationsSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  allocationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allocationCategory: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  allocationPercent: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  allocationAmounts: {
    flexDirection: 'row',
    gap: 16,
  },
  allocationAmountCol: {
    flex: 1,
  },
  allocationAmountLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  allocationAmountValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  allocationProgress: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  allocationProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  approvalSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  notesSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {},
  activateButton: {},
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '60%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  filterOptions: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
  },
  sortIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
