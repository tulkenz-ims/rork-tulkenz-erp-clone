import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  UserCheck,
  UserMinus,
  Calendar,
  Clock,
  Shield,
  X,
  AlertTriangle,
  Edit3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useActiveDelegationsForUser,
  useRevokeDelegation,
  useExpiringDelegations,
  useDelegatedApprovalsForUser,
  delegationTypeLabels,
  delegationStatusLabels,
  delegationStatusColors,
  useGetDelegationLimitsSummary,
} from '@/hooks/useSupabaseDelegations';
import type { DelegationRule } from '@/types/approvalWorkflows';
import { workflowCategoryLabels, workflowCategoryColors } from '@/mocks/workflowsData';

interface DelegationManagementProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  onEditDelegation?: (delegation: DelegationRule) => void;
  onCreateDelegation?: () => void;
  onRefresh?: () => void;
}

type TabType = 'delegated_from_me' | 'delegated_to_me' | 'expiring';

export default function DelegationManagement({
  visible,
  onClose,
  currentUserId,
  currentUserName,
  onEditDelegation,
  onCreateDelegation,
  onRefresh,
}: DelegationManagementProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('delegated_from_me');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationRule | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: activeDelegations, isLoading: loadingActive, refetch: refetchActive } = useActiveDelegationsForUser(currentUserId);
  const { data: expiringDelegations = [], isLoading: loadingExpiring, refetch: refetchExpiring } = useExpiringDelegations(currentUserId, 7);
  const { isLoading: loadingApprovals, refetch: refetchApprovals } = useDelegatedApprovalsForUser(currentUserId);
  const revokeDelegation = useRevokeDelegation();
  const getLimitsSummary = useGetDelegationLimitsSummary();

  const delegatedFromMe = activeDelegations?.delegatedFrom || [];
  const delegatedToMe = activeDelegations?.delegatedTo || [];

  const handleRefresh = useCallback(() => {
    refetchActive();
    refetchExpiring();
    refetchApprovals();
    onRefresh?.();
  }, [refetchActive, refetchExpiring, refetchApprovals, onRefresh]);

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const handleRevoke = useCallback((delegation: DelegationRule) => {
    setSelectedDelegation(delegation);
    setRevokeReason('');
    setShowRevokeModal(true);
  }, []);

  const confirmRevoke = useCallback(() => {
    if (!selectedDelegation) return;

    Alert.alert(
      'Confirm Revocation',
      `Are you sure you want to revoke the delegation to ${selectedDelegation.toUserName}? They will no longer be able to approve on your behalf.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            revokeDelegation.mutate({
              id: selectedDelegation.id,
              revokedBy: currentUserName,
              revokeReason: revokeReason || 'Manually revoked',
            }, {
              onSuccess: () => {
                setShowRevokeModal(false);
                setSelectedDelegation(null);
                setRevokeReason('');
                handleRefresh();
              },
            });
          },
        },
      ]
    );
  }, [selectedDelegation, revokeReason, currentUserName, revokeDelegation, handleRefresh]);

  const renderTabButton = (tab: TabType, label: string, count: number, icon: React.ReactNode) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        { backgroundColor: activeTab === tab ? colors.primary + '15' : colors.background },
        activeTab === tab && { borderColor: colors.primary },
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      {icon}
      <Text
        style={[
          styles.tabLabel,
          { color: activeTab === tab ? colors.primary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: activeTab === tab ? colors.primary : colors.textSecondary }]}>
          <Text style={styles.tabBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDelegationCard = (delegation: DelegationRule, isOutgoing: boolean) => {
    const statusColor = delegationStatusColors[delegation.status];
    const daysRemaining = getDaysRemaining(delegation.endDate);
    const limitsSummary = getLimitsSummary(delegation);
    const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;

    return (
      <View
        key={delegation.id}
        style={[styles.delegationCard, { backgroundColor: colors.surface }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userFlow}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {isOutgoing ? delegation.toUserName.charAt(0) : delegation.fromUserName.charAt(0)}
              </Text>
            </View>
            <View style={styles.flowInfo}>
              <Text style={[styles.flowDirection, { color: colors.textSecondary }]}>
                {isOutgoing ? 'Delegated to' : 'Delegated from'}
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {isOutgoing ? delegation.toUserName : delegation.fromUserName}
              </Text>
              <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                {isOutgoing ? delegation.toUserRole : delegation.fromUserRole}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {delegationStatusLabels[delegation.status]}
            </Text>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Shield size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {delegationTypeLabels[delegation.delegationType]}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {formatDateRange(delegation.startDate, delegation.endDate)}
            </Text>
          </View>
          {delegation.status === 'active' && (
            <View style={styles.detailRow}>
              <Clock size={14} color={isExpiringSoon ? '#F59E0B' : colors.textSecondary} />
              <Text style={[styles.detailText, { color: isExpiringSoon ? '#F59E0B' : colors.textSecondary }]}>
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </Text>
            </View>
          )}
        </View>

        {delegation.workflowCategories && delegation.workflowCategories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={[styles.categoriesLabel, { color: colors.textSecondary }]}>Categories:</Text>
            <View style={styles.categoriesRow}>
              {delegation.workflowCategories.map(cat => (
                <View key={cat} style={[styles.categoryBadge, { backgroundColor: workflowCategoryColors[cat] + '15' }]}>
                  <Text style={[styles.categoryText, { color: workflowCategoryColors[cat] }]}>
                    {workflowCategoryLabels[cat]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {limitsSummary.length > 0 && (
          <View style={[styles.limitsSection, { backgroundColor: colors.background }]}>
            <View style={styles.limitsHeader}>
              <Info size={12} color={colors.textSecondary} />
              <Text style={[styles.limitsTitle, { color: colors.textSecondary }]}>Limits</Text>
            </View>
            {limitsSummary.map((limit, index) => (
              <Text key={index} style={[styles.limitText, { color: colors.text }]}>• {limit}</Text>
            ))}
          </View>
        )}

        {isExpiringSoon && (
          <View style={[styles.warningBanner, { backgroundColor: '#F59E0B' + '15' }]}>
            <AlertTriangle size={14} color="#F59E0B" />
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              This delegation expires soon
            </Text>
          </View>
        )}

        {delegation.reason && (
          <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
            Reason: {delegation.reason}
          </Text>
        )}

        {isOutgoing && delegation.status === 'active' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => onEditDelegation?.(delegation)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' + '15' }]}
              onPress={() => handleRevoke(delegation)}
              activeOpacity={0.7}
            >
              <XCircle size={16} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Revoke</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isOutgoing && delegation.status === 'active' && (
          <View style={[styles.delegateInfoBanner, { backgroundColor: colors.primary + '10' }]}>
            <CheckCircle size={14} color={colors.primary} />
            <Text style={[styles.delegateInfoText, { color: colors.primary }]}>
              You can approve requests on behalf of {delegation.fromUserName}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = (type: TabType) => {
    const configs = {
      delegated_from_me: {
        icon: <UserMinus size={48} color={colors.textSecondary} />,
        title: 'No Active Outgoing Delegations',
        message: 'You have not delegated your approval authority to anyone.',
        action: 'Create Delegation',
        onAction: onCreateDelegation,
      },
      delegated_to_me: {
        icon: <UserCheck size={48} color={colors.textSecondary} />,
        title: 'No Active Incoming Delegations',
        message: 'No one has delegated their approval authority to you.',
        action: undefined,
        onAction: undefined,
      },
      expiring: {
        icon: <Clock size={48} color={colors.textSecondary} />,
        title: 'No Expiring Delegations',
        message: 'You have no delegations expiring in the next 7 days.',
        action: undefined,
        onAction: undefined,
      },
    };

    const config = configs[type];

    return (
      <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
        {config.icon}
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{config.title}</Text>
        <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>{config.message}</Text>
        {config.action && config.onAction && (
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
            onPress={config.onAction}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyStateButtonText}>{config.action}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => {
    const isLoading = loadingActive || loadingExpiring || loadingApprovals;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading delegations...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'delegated_from_me':
        return delegatedFromMe.length > 0 ? (
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {delegatedFromMe.map(d => renderDelegationCard(d, true))}
            </View>
          </ScrollView>
        ) : renderEmptyState('delegated_from_me');

      case 'delegated_to_me':
        return delegatedToMe.length > 0 ? (
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {delegatedToMe.map(d => renderDelegationCard(d, false))}
            </View>
          </ScrollView>
        ) : renderEmptyState('delegated_to_me');

      case 'expiring':
        return expiringDelegations.length > 0 ? (
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cardsContainer}>
              {expiringDelegations.map(d => {
                const isOutgoing = d.fromUserId === currentUserId;
                return renderDelegationCard(d, isOutgoing);
              })}
            </View>
          </ScrollView>
        ) : renderEmptyState('expiring');

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Delegations</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                View and manage your active delegations
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: colors.background }]}
                onPress={handleRefresh}
              >
                <RefreshCw size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            {renderTabButton(
              'delegated_from_me',
              'My Delegations',
              delegatedFromMe.length,
              <UserMinus size={16} color={activeTab === 'delegated_from_me' ? colors.primary : colors.textSecondary} />
            )}
            {renderTabButton(
              'delegated_to_me',
              'Delegated to Me',
              delegatedToMe.length,
              <UserCheck size={16} color={activeTab === 'delegated_to_me' ? colors.primary : colors.textSecondary} />
            )}
            {renderTabButton(
              'expiring',
              'Expiring Soon',
              expiringDelegations.length,
              <AlertTriangle size={16} color={activeTab === 'expiring' ? colors.primary : colors.textSecondary} />
            )}
          </View>

          <View style={styles.contentContainer}>
            {renderContent()}
          </View>
        </View>
      </View>

      <Modal visible={showRevokeModal} transparent animationType="fade">
        <View style={styles.revokeOverlay}>
          <View style={[styles.revokeModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.revokeIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <XCircle size={32} color="#EF4444" />
            </View>
            <Text style={[styles.revokeTitle, { color: colors.text }]}>Revoke Delegation</Text>
            <Text style={[styles.revokeText, { color: colors.textSecondary }]}>
              This will immediately end the delegation to {selectedDelegation?.toUserName}. They will no longer be able to approve on your behalf.
            </Text>
            
            <View style={styles.revokeReasonContainer}>
              <Text style={[styles.revokeReasonLabel, { color: colors.text }]}>Reason (optional)</Text>
              <TextInput
                style={[styles.revokeReasonInput, { 
                  backgroundColor: colors.background, 
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                placeholder="Enter reason for revoking..."
                placeholderTextColor={colors.textSecondary}
                value={revokeReason}
                onChangeText={setRevokeReason}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.revokeActions}>
              <TouchableOpacity
                style={[styles.revokeButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowRevokeModal(false);
                  setSelectedDelegation(null);
                  setRevokeReason('');
                }}
              >
                <Text style={[styles.revokeButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.revokeButton, { backgroundColor: '#EF4444' }]}
                onPress={confirmRevoke}
                disabled={revokeDelegation.isPending}
              >
                {revokeDelegation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.revokeButtonText, { color: '#FFFFFF' }]}>Revoke</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentScroll: {
    flex: 1,
  },
  cardsContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  delegationCard: {
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  flowInfo: {
    flex: 1,
  },
  flowDirection: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  categoriesSection: {
    marginTop: 12,
  },
  categoriesLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  limitsSection: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  limitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  limitsTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  limitText: {
    fontSize: 12,
    marginBottom: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  delegateInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  delegateInfoText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginTop: 16,
    textAlign: 'center' as const,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  revokeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  revokeModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  revokeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  revokeTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  revokeText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  revokeReasonContainer: {
    width: '100%',
    marginTop: 20,
  },
  revokeReasonLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  revokeReasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top' as const,
  },
  revokeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  revokeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  revokeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
