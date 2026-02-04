import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Shield,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  UserCheck,
  ArrowRight,
  AlertCircle,
  BarChart3,
  History,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useDelegationsQuery,
  useDelegationStats,
  useRevokeDelegation,
  useDeleteDelegation,
  delegationTypeLabels,
  delegationStatusLabels,
  delegationStatusColors,
} from '@/hooks/useSupabaseDelegations';
import type { DelegationRule, DelegationStatus } from '@/types/approvalWorkflows';
import { workflowCategoryLabels, workflowCategoryColors } from '@/types/approvalWorkflows';
import DelegationSetup from '@/components/DelegationSetup';
import ProxyApprovalAuditTrail from '@/components/ProxyApprovalAuditTrail';
import DelegationManagement from '@/components/DelegationManagement';
import { useNotifications } from '@/contexts/NotificationsContext';

const CURRENT_USER = {
  id: 'user-sw-001',
  name: 'Sarah Williams',
  email: 'sarah.williams@company.com',
  role: 'Finance Manager',
};

type FilterStatus = DelegationStatus | 'all';
type ViewMode = 'my_delegations' | 'delegated_to_me' | 'all';

export default function DelegationScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('my_delegations');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<DelegationRule | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const { createDelegationAssignedNotification, createDelegationRevokedNotification } = useNotifications();

  const filters = useMemo(() => {
    const f: { status?: DelegationStatus; fromUserId?: string; toUserId?: string } = {};
    if (filterStatus !== 'all') f.status = filterStatus;
    if (viewMode === 'my_delegations') f.fromUserId = CURRENT_USER.id;
    if (viewMode === 'delegated_to_me') f.toUserId = CURRENT_USER.id;
    return f;
  }, [filterStatus, viewMode]);

  const { data: delegations = [], isLoading, refetch } = useDelegationsQuery({ filters });
  const { data: stats } = useDelegationStats();
  const revokeDelegation = useRevokeDelegation();
  const deleteDelegation = useDeleteDelegation();

  const filteredDelegations = useMemo(() => {
    if (!searchQuery) return delegations;
    const query = searchQuery.toLowerCase();
    return delegations.filter(d =>
      d.fromUserName.toLowerCase().includes(query) ||
      d.toUserName.toLowerCase().includes(query) ||
      d.reason?.toLowerCase().includes(query)
    );
  }, [delegations, searchQuery]);

  const handleCreateDelegation = useCallback(() => {
    setEditingDelegation(null);
    setShowSetupModal(true);
  }, []);

  const handleEditDelegation = useCallback((delegation: DelegationRule) => {
    if (delegation.status === 'revoked' || delegation.status === 'expired') {
      Alert.alert('Cannot Edit', 'This delegation cannot be edited.');
      return;
    }
    setEditingDelegation(delegation);
    setShowSetupModal(true);
  }, []);

  const handleRevokeDelegation = useCallback((delegation: DelegationRule) => {
    Alert.alert(
      'Revoke Delegation',
      `Are you sure you want to revoke this delegation to ${delegation.toUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            revokeDelegation.mutate({
              id: delegation.id,
              revokedBy: CURRENT_USER.name,
              revokeReason: 'Manually revoked',
            }, {
              onSuccess: () => {
                createDelegationRevokedNotification({
                  delegationId: delegation.id,
                  delegatorName: CURRENT_USER.name,
                  delegateName: delegation.toUserName,
                  reason: 'Manually revoked',
                });
              },
            });
          },
        },
      ]
    );
  }, [revokeDelegation, createDelegationRevokedNotification]);

  const handleDeleteDelegation = useCallback((delegation: DelegationRule) => {
    Alert.alert(
      'Delete Delegation',
      'Are you sure you want to permanently delete this delegation record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDelegation.mutate(delegation.id);
          },
        },
      ]
    );
  }, [deleteDelegation]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderStatsCard = () => (
    <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#10B981' + '20' }]}>
            <UserCheck size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.activeDelegations || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#3B82F6' + '20' }]}>
            <Clock size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.scheduledDelegations || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Scheduled</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#6B7280' + '20' }]}>
            <BarChart3 size={20} color="#6B7280" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalDelegations || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
      </View>
      <View style={styles.statsButtonRow}>
        <TouchableOpacity
          style={[styles.statsButton, { backgroundColor: colors.background }]}
          onPress={() => setShowManagement(true)}
          activeOpacity={0.7}
        >
          <Users size={16} color={colors.primary} />
          <Text style={[styles.statsButtonText, { color: colors.primary }]}>
            Manage Delegations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statsButton, { backgroundColor: colors.background }]}
          onPress={() => setShowAuditTrail(true)}
          activeOpacity={0.7}
        >
          <History size={16} color={colors.primary} />
          <Text style={[styles.statsButtonText, { color: colors.primary }]}>
            Audit Trail
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderViewModeToggle = () => (
    <View style={[styles.viewModeContainer, { backgroundColor: colors.surface }]}>
      {(['my_delegations', 'delegated_to_me', 'all'] as ViewMode[]).map(mode => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.viewModeButton,
            viewMode === mode && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={() => setViewMode(mode)}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === mode ? colors.primary : colors.textSecondary },
            ]}
          >
            {mode === 'my_delegations' ? 'My Delegations' : mode === 'delegated_to_me' ? 'Delegated to Me' : 'All'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDelegationCard = (delegation: DelegationRule) => {
    const statusColor = delegationStatusColors[delegation.status];
    const isMyDelegation = delegation.fromUserId === CURRENT_USER.id;
    const daysRemaining = delegation.status === 'active' ? getDaysRemaining(delegation.endDate) : null;

    return (
      <TouchableOpacity
        key={delegation.id}
        style={[styles.delegationCard, { backgroundColor: colors.surface }]}
        onPress={() => handleEditDelegation(delegation)}
        activeOpacity={0.7}
      >
        <View style={styles.delegationHeader}>
          <View style={styles.delegationUsers}>
            <View style={[styles.userBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.userInitial, { color: colors.primary }]}>
                {delegation.fromUserName.charAt(0)}
              </Text>
            </View>
            <ArrowRight size={16} color={colors.textSecondary} />
            <View style={[styles.userBadge, { backgroundColor: '#10B981' + '20' }]}>
              <Text style={[styles.userInitial, { color: '#10B981' }]}>
                {delegation.toUserName.charAt(0)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {delegationStatusLabels[delegation.status]}
            </Text>
          </View>
        </View>

        <View style={styles.delegationBody}>
          <View style={styles.delegationNameRow}>
            <Text style={[styles.delegationFromName, { color: colors.text }]}>
              {delegation.fromUserName}
            </Text>
            <Text style={[styles.delegationToText, { color: colors.textSecondary }]}> → </Text>
            <Text style={[styles.delegationToName, { color: colors.text }]}>
              {delegation.toUserName}
            </Text>
          </View>
          
          <View style={styles.delegationMeta}>
            <View style={styles.metaItem}>
              <Shield size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {delegationTypeLabels[delegation.delegationType]}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDateRange(delegation.startDate, delegation.endDate)}
              </Text>
            </View>
          </View>

          {delegation.workflowCategories && delegation.workflowCategories.length > 0 && (
            <View style={styles.categoriesRow}>
              {delegation.workflowCategories.slice(0, 3).map(cat => (
                <View key={cat} style={[styles.categoryBadge, { backgroundColor: workflowCategoryColors[cat] + '15' }]}>
                  <Text style={[styles.categoryText, { color: workflowCategoryColors[cat] }]}>
                    {workflowCategoryLabels[cat]}
                  </Text>
                </View>
              ))}
              {delegation.workflowCategories.length > 3 && (
                <Text style={[styles.moreCategoriesText, { color: colors.textSecondary }]}>
                  +{delegation.workflowCategories.length - 3} more
                </Text>
              )}
            </View>
          )}

          {delegation.reason && (
            <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={1}>
              {delegation.reason}
            </Text>
          )}

          {daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && (
            <View style={[styles.warningBanner, { backgroundColor: '#F59E0B' + '15' }]}>
              <AlertCircle size={14} color="#F59E0B" />
              <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {isMyDelegation && (delegation.status === 'active' || delegation.status === 'scheduled') && (
          <View style={styles.delegationActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => handleEditDelegation(delegation)}
            >
              <Edit3 size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F59E0B' + '15' }]}
              onPress={() => handleRevokeDelegation(delegation)}
            >
              <X size={16} color="#F59E0B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' + '15' }]}
              onPress={() => handleDeleteDelegation(delegation)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Delegation' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading delegations...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Delegation',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {renderStatsCard()}
        {renderViewModeToggle()}

        <View style={styles.controlsContainer}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search delegations..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={16} color={colors.textSecondary} />
              <Text style={[styles.filterButtonText, { color: colors.textSecondary }]}>
                {filterStatus === 'all' ? 'All Status' : delegationStatusLabels[filterStatus]}
              </Text>
              <ChevronRight
                size={16}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: showFilterDropdown ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </View>

          {showFilterDropdown && (
            <View style={[styles.filterDropdown, { backgroundColor: colors.surface }]}>
              {(['all', 'active', 'scheduled', 'expired', 'revoked'] as FilterStatus[]).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    filterStatus === status && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    setFilterStatus(status);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: filterStatus === status ? colors.primary : colors.text },
                    ]}
                  >
                    {status === 'all' ? 'All Status' : delegationStatusLabels[status]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.delegationsContainer}>
          {filteredDelegations.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Users size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Delegations Found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {viewMode === 'my_delegations'
                  ? "You haven't created any delegations yet"
                  : viewMode === 'delegated_to_me'
                  ? "No one has delegated approval authority to you"
                  : "No delegations match your filters"}
              </Text>
              {viewMode === 'my_delegations' && (
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateDelegation}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Create Delegation</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredDelegations.map(renderDelegationCard)
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateDelegation}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <DelegationSetup
        visible={showSetupModal}
        onClose={() => {
          setShowSetupModal(false);
          setEditingDelegation(null);
        }}
        existingDelegation={editingDelegation}
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        currentUserEmail={CURRENT_USER.email}
        currentUserRole={CURRENT_USER.role}
        onSuccess={(delegation) => {
          refetch();
          if (!editingDelegation && delegation) {
            createDelegationAssignedNotification({
              delegationId: delegation.id,
              delegatorName: CURRENT_USER.name,
              delegatorId: CURRENT_USER.id,
              delegateName: delegation.toUserName,
              delegateId: delegation.toUserId,
              delegationType: delegation.delegationType,
              startDate: delegation.startDate,
              endDate: delegation.endDate,
              categories: delegation.workflowCategories?.map(c => c) || [],
            });
          }
        }}
      />

      <DelegationManagement
        visible={showManagement}
        onClose={() => setShowManagement(false)}
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        onEditDelegation={(delegation) => {
          setShowManagement(false);
          setEditingDelegation(delegation);
          setShowSetupModal(true);
        }}
        onCreateDelegation={() => {
          setShowManagement(false);
          handleCreateDelegation();
        }}
        onRefresh={refetch}
      />

      <ProxyApprovalAuditTrail
        visible={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
        userId={CURRENT_USER.id}
        showHistoryTab={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statsButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  statsButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  viewModeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filterDropdown: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterOptionText: {
    fontSize: 14,
  },
  delegationsContainer: {
    gap: 12,
  },
  delegationCard: {
    borderRadius: 12,
    padding: 16,
  },
  delegationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  delegationUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '600' as const,
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
  delegationBody: {
    gap: 8,
  },
  delegationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delegationFromName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  delegationToText: {
    fontSize: 14,
  },
  delegationToName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  delegationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  moreCategoriesText: {
    fontSize: 10,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  delegationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
