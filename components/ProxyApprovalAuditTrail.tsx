import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  UserCheck,
  Users,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
  History,
  AlertCircle,
  Briefcase,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProxyApprovalsQuery,
  useDelegationHistoryQuery,
  useProxyApprovalStats,
  delegationTypeLabels,
  delegationStatusLabels,
  delegationStatusColors,
} from '@/hooks/useSupabaseDelegations';
import type {
  ProxyApprovalRecord,
  DelegationHistoryEntry,
} from '@/types/approvalWorkflows';
import { workflowCategoryLabels, workflowCategoryColors } from '@/mocks/workflowsData';

interface ProxyApprovalAuditTrailProps {
  visible: boolean;
  onClose: () => void;
  delegationId?: string;
  userId?: string;
  showHistoryTab?: boolean;
}

type TabType = 'approvals' | 'history';
type FilterAction = 'all' | 'approved' | 'rejected' | 'returned';

export default function ProxyApprovalAuditTrail({
  visible,
  onClose,
  delegationId,
  userId,
  showHistoryTab = true,
}: ProxyApprovalAuditTrailProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('approvals');
  const [filterAction, setFilterAction] = useState<FilterAction>('all');
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const proxyApprovalsFilter = useMemo(() => {
    const filters: {
      delegationId?: string;
      originalApproverId?: string;
      proxyApproverId?: string;
      action?: 'approved' | 'rejected' | 'returned';
    } = {};
    if (delegationId) filters.delegationId = delegationId;
    if (userId) {
      filters.originalApproverId = userId;
    }
    if (filterAction !== 'all') filters.action = filterAction;
    return filters;
  }, [delegationId, userId, filterAction]);

  const { data: proxyApprovals = [], isLoading: approvalsLoading, refetch: refetchApprovals } = 
    useProxyApprovalsQuery({ filters: proxyApprovalsFilter, enabled: visible });

  const historyFilter = useMemo(() => {
    const filters: { fromUserId?: string; toUserId?: string } = {};
    if (userId) {
      filters.fromUserId = userId;
    }
    return filters;
  }, [userId]);

  const { data: delegationHistory = [], isLoading: historyLoading, refetch: refetchHistory } = 
    useDelegationHistoryQuery({ filters: historyFilter, enabled: visible && showHistoryTab });

  const { data: stats } = useProxyApprovalStats();

  const toggleApprovalExpanded = useCallback((id: string) => {
    setExpandedApproval(prev => prev === id ? null : id);
  }, []);

  const toggleHistoryExpanded = useCallback((id: string) => {
    setExpandedHistory(prev => prev === id ? null : id);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: 'approved' | 'rejected' | 'returned') => {
    switch (action) {
      case 'approved':
        return <CheckCircle size={16} color="#10B981" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      case 'returned':
        return <RotateCcw size={16} color="#F59E0B" />;
    }
  };

  const getActionColor = (action: 'approved' | 'rejected' | 'returned') => {
    switch (action) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'returned':
        return '#F59E0B';
    }
  };

  const renderStatsCard = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.background }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats?.approved || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats?.rejected || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            ${((stats?.totalAmount || 0) / 1000).toFixed(1)}k
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Amount</Text>
        </View>
      </View>
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      {(['all', 'approved', 'rejected', 'returned'] as FilterAction[]).map(action => (
        <TouchableOpacity
          key={action}
          style={[
            styles.filterChip,
            { backgroundColor: colors.background, borderColor: colors.border },
            filterAction === action && { 
              backgroundColor: action === 'all' 
                ? colors.primary + '20' 
                : getActionColor(action as 'approved' | 'rejected' | 'returned') + '20',
              borderColor: action === 'all' 
                ? colors.primary 
                : getActionColor(action as 'approved' | 'rejected' | 'returned'),
            },
          ]}
          onPress={() => setFilterAction(action)}
        >
          <Text
            style={[
              styles.filterChipText,
              { 
                color: filterAction === action 
                  ? (action === 'all' ? colors.primary : getActionColor(action as 'approved' | 'rejected' | 'returned'))
                  : colors.textSecondary 
              },
            ]}
          >
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderProxyApprovalCard = (approval: ProxyApprovalRecord) => {
    const isExpanded = expandedApproval === approval.id;
    const actionColor = getActionColor(approval.action);
    const categoryColor = workflowCategoryColors[approval.approvalType] || colors.primary;

    return (
      <View
        key={approval.id}
        style={[styles.approvalCard, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={styles.approvalHeader}
          onPress={() => toggleApprovalExpanded(approval.id)}
          activeOpacity={0.7}
        >
          <View style={styles.approvalHeaderLeft}>
            <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
              {getActionIcon(approval.action)}
            </View>
            <View style={styles.approvalHeaderInfo}>
              <Text style={[styles.approvalReference, { color: colors.text }]}>
                {approval.approvalReference}
              </Text>
              <View style={styles.proxyIndicator}>
                <Text style={[styles.proxyText, { color: colors.textSecondary }]}>
                  On behalf of{' '}
                </Text>
                <Text style={[styles.proxyName, { color: colors.primary }]}>
                  {approval.originalApproverName}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.approvalHeaderRight}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {workflowCategoryLabels[approval.approvalType]}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.approvalDetails, { borderTopColor: colors.border }]}>
            <View style={[styles.proxyTrailCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.trailTitle, { color: colors.textSecondary }]}>
                PROXY APPROVAL TRAIL
              </Text>
              <View style={styles.trailRow}>
                <View style={styles.trailUser}>
                  <View style={[styles.trailAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <UserCheck size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.trailLabel, { color: colors.textSecondary }]}>
                      Original Approver
                    </Text>
                    <Text style={[styles.trailName, { color: colors.text }]}>
                      {approval.originalApproverName}
                    </Text>
                    {approval.originalApproverRole && (
                      <Text style={[styles.trailRole, { color: colors.textSecondary }]}>
                        {approval.originalApproverRole}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.trailArrow}>
                  <ArrowRight size={20} color={colors.textSecondary} />
                  <Text style={[styles.trailArrowLabel, { color: colors.textSecondary }]}>
                    delegated to
                  </Text>
                </View>
                <View style={styles.trailUser}>
                  <View style={[styles.trailAvatar, { backgroundColor: '#10B981' + '20' }]}>
                    <Users size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.trailLabel, { color: colors.textSecondary }]}>
                      Proxy Approver
                    </Text>
                    <Text style={[styles.trailName, { color: colors.text }]}>
                      {approval.proxyApproverName}
                    </Text>
                    {approval.proxyApproverRole && (
                      <Text style={[styles.trailRole, { color: colors.textSecondary }]}>
                        {approval.proxyApproverRole}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Action Time</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDateTime(approval.actionAt)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Shield size={14} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Delegation Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {delegationTypeLabels[approval.delegationType]}
                </Text>
              </View>
              {approval.amount !== undefined && (
                <View style={styles.detailItem}>
                  <DollarSign size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    ${approval.amount.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <FileText size={14} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Action</Text>
                <View style={[styles.actionValueBadge, { backgroundColor: actionColor + '20' }]}>
                  <Text style={[styles.actionValueText, { color: actionColor }]}>
                    {approval.action.charAt(0).toUpperCase() + approval.action.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {approval.comments && (
              <View style={[styles.commentsSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.commentsLabel, { color: colors.textSecondary }]}>Comments</Text>
                <Text style={[styles.commentsText, { color: colors.text }]}>
                  {`"${approval.comments}"`}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDelegationHistoryCard = (entry: DelegationHistoryEntry) => {
    const isExpanded = expandedHistory === entry.id;
    const statusColor = delegationStatusColors[entry.status];

    return (
      <View
        key={entry.id}
        style={[styles.historyCard, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={styles.historyHeader}
          onPress={() => toggleHistoryExpanded(entry.id)}
          activeOpacity={0.7}
        >
          <View style={styles.historyHeaderLeft}>
            <View style={styles.historyUsers}>
              <View style={[styles.historyAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.historyInitial, { color: colors.primary }]}>
                  {entry.fromUserName.charAt(0)}
                </Text>
              </View>
              <ArrowRight size={14} color={colors.textSecondary} />
              <View style={[styles.historyAvatar, { backgroundColor: '#10B981' + '20' }]}>
                <Text style={[styles.historyInitial, { color: '#10B981' }]}>
                  {entry.toUserName.charAt(0)}
                </Text>
              </View>
            </View>
            <View style={styles.historyHeaderInfo}>
              <Text style={[styles.historyNames, { color: colors.text }]}>
                {entry.fromUserName} → {entry.toUserName}
              </Text>
              <Text style={[styles.historyDates, { color: colors.textSecondary }]}>
                {formatDate(entry.startDate)} - {formatDate(entry.actualEndDate || entry.endDate)}
              </Text>
            </View>
          </View>
          <View style={styles.historyHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {delegationStatusLabels[entry.status]}
              </Text>
            </View>
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.historyDetails, { borderTopColor: colors.border }]}>
            <View style={styles.historyDetailRow}>
              <View style={styles.historyDetailItem}>
                <Shield size={14} color={colors.textSecondary} />
                <Text style={[styles.historyDetailLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.historyDetailValue, { color: colors.text }]}>
                  {delegationTypeLabels[entry.delegationType]}
                </Text>
              </View>
              <View style={styles.historyDetailItem}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.historyDetailLabel, { color: colors.textSecondary }]}>Duration</Text>
                <Text style={[styles.historyDetailValue, { color: colors.text }]}>
                  {Math.ceil(
                    (new Date(entry.actualEndDate || entry.endDate).getTime() - new Date(entry.startDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  days
                </Text>
              </View>
            </View>

            <View style={[styles.historyStatsRow, { backgroundColor: colors.background }]}>
              <View style={styles.historyStatItem}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={[styles.historyStatValue, { color: colors.text }]}>
                  {entry.approvalsProcessed}
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>
                  Approvals
                </Text>
              </View>
              <View style={[styles.historyStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.historyStatItem}>
                <DollarSign size={16} color={colors.primary} />
                <Text style={[styles.historyStatValue, { color: colors.text }]}>
                  ${entry.totalApprovalAmount.toLocaleString()}
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>
                  Total Amount
                </Text>
              </View>
            </View>

            {entry.reason && (
              <View style={styles.historyReasonSection}>
                <Text style={[styles.historyReasonLabel, { color: colors.textSecondary }]}>
                  Reason
                </Text>
                <Text style={[styles.historyReasonText, { color: colors.text }]}>
                  {entry.reason}
                </Text>
              </View>
            )}

            {entry.revokeReason && (
              <View style={[styles.historyRevokeSection, { backgroundColor: '#EF4444' + '10' }]}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={[styles.historyRevokeText, { color: '#EF4444' }]}>
                  Revoked: {entry.revokeReason}
                </Text>
              </View>
            )}

            <View style={styles.historyRolesRow}>
              <View style={styles.historyRoleItem}>
                <Briefcase size={12} color={colors.textSecondary} />
                <Text style={[styles.historyRoleText, { color: colors.textSecondary }]}>
                  {entry.fromUserRole || 'N/A'}
                </Text>
              </View>
              <ArrowRight size={12} color={colors.border} />
              <View style={styles.historyRoleItem}>
                <Briefcase size={12} color={colors.textSecondary} />
                <Text style={[styles.historyRoleText, { color: colors.textSecondary }]}>
                  {entry.toUserRole || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderApprovalsTab = () => (
    <View style={styles.tabContent}>
      {renderFilterChips()}
      
      {approvalsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading approvals...
          </Text>
        </View>
      ) : proxyApprovals.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <CheckCircle size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            No Proxy Approvals
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No approvals have been processed via delegation yet
          </Text>
        </View>
      ) : (
        <View style={styles.approvalsList}>
          {proxyApprovals.map(renderProxyApprovalCard)}
        </View>
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {historyLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading history...
          </Text>
        </View>
      ) : delegationHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <History size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            No Delegation History
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            No completed or revoked delegations found
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {delegationHistory.map(renderDelegationHistoryCard)}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Proxy Approval Audit Trail
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {renderStatsCard()}

          {showHistoryTab && (
            <View style={[styles.tabsContainer, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'approvals' && { backgroundColor: colors.surface },
                ]}
                onPress={() => setActiveTab('approvals')}
              >
                <CheckCircle
                  size={16}
                  color={activeTab === 'approvals' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'approvals' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Proxy Approvals
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'history' && { backgroundColor: colors.surface },
                ]}
                onPress={() => setActiveTab('history')}
              >
                <History
                  size={16}
                  color={activeTab === 'history' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === 'history' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Delegation History
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => {
                  refetchApprovals();
                  refetchHistory();
                }}
                tintColor={colors.primary}
              />
            }
          >
            {activeTab === 'approvals' ? renderApprovalsTab() : renderHistoryTab()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  tabContent: {
    flex: 1,
  },
  filterContainer: {
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  approvalsList: {
    gap: 12,
  },
  approvalCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  approvalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalHeaderInfo: {
    flex: 1,
  },
  approvalReference: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  proxyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  proxyText: {
    fontSize: 12,
  },
  proxyName: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  approvalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  approvalDetails: {
    borderTopWidth: 1,
    padding: 14,
    gap: 14,
  },
  proxyTrailCard: {
    borderRadius: 10,
    padding: 14,
  },
  trailTitle: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trailUser: {
    alignItems: 'center',
    flex: 1,
  },
  trailAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  trailName: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center',
    marginTop: 2,
  },
  trailRole: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  trailArrow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  trailArrowLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actionValueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionValueText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  commentsSection: {
    borderRadius: 8,
    padding: 12,
  },
  commentsLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    lineHeight: 18,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInitial: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyHeaderInfo: {
    flex: 1,
  },
  historyNames: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  historyDates: {
    fontSize: 11,
    marginTop: 2,
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  historyDetails: {
    borderTopWidth: 1,
    padding: 14,
    gap: 12,
  },
  historyDetailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  historyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyDetailLabel: {
    fontSize: 11,
  },
  historyDetailValue: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  historyStatsRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
  },
  historyStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  historyStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyStatLabel: {
    fontSize: 11,
  },
  historyStatDivider: {
    width: 1,
    marginHorizontal: 12,
  },
  historyReasonSection: {
    gap: 4,
  },
  historyReasonLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  historyReasonText: {
    fontSize: 13,
  },
  historyRevokeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  historyRevokeText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  historyRolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  historyRoleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyRoleText: {
    fontSize: 11,
  },
});
