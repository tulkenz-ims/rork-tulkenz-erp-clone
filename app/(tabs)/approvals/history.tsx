import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Calendar,
  User,
  FileText,
  ChevronRight,
  X,
  SkipForward,
  UserCheck,
  RefreshCw,
  ShoppingCart,
  Shield,
  DollarSign,
  Briefcase,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import {
  useWorkflowInstancesQuery,
  useWorkflowStats,
  type WorkflowCategory,
  type WorkflowInstanceStatus,
} from '@/hooks/useSupabaseWorkflows';
import * as Haptics from 'expo-haptics';

type FilterAction = 'all' | 'approved' | 'rejected' | 'skipped' | 'escalated' | 'delegated' | 'reassigned';
type FilterStatus = 'all' | WorkflowInstanceStatus;
type FilterCategory = 'all' | WorkflowCategory;
type DateRange = 'all' | 'today' | 'week' | 'month' | 'quarter';

interface ApprovalHistoryEntry {
  id: string;
  instanceId: string;
  templateName: string;
  category: WorkflowCategory;
  referenceId: string;
  referenceTitle: string;
  stepName: string;
  stepOrder: number;
  action: string;
  actionBy: string;
  actionAt: string;
  comments?: string;
  status: WorkflowInstanceStatus;
}

export default function ApprovalHistoryScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<FilterAction>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ApprovalHistoryEntry | null>(null);

  const { data: workflowStats, isLoading: statsLoading } = useWorkflowStats();
  const { data: instances, refetch: refetchInstances, isLoading: instancesLoading } = useWorkflowInstancesQuery();

  const { data: stepHistoryData, refetch: refetchStepHistory, isLoading: stepHistoryLoading, error: stepHistoryError } = useQuery({
    queryKey: ['workflow_step_history', 'all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[ApprovalHistory] Fetching all step history for org:', organizationId);
      const { data, error } = await supabase
        .from('workflow_step_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) {
        console.error('[ApprovalHistory] Error fetching step history:', error);
        throw new Error(error.message);
      }
      console.log('[ApprovalHistory] Fetched step history entries:', data?.length || 0);
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = statsLoading || instancesLoading || stepHistoryLoading;

  const instancesMap = useMemo(() => {
    type InstanceType = NonNullable<typeof instances>[number];
    const map = new Map<string, InstanceType>();
    if (instances) {
      instances.forEach((instance) => {
        map.set(instance.id, instance);
      });
    }
    return map;
  }, [instances]);

  const historyEntries: ApprovalHistoryEntry[] = useMemo(() => {
    const entries: ApprovalHistoryEntry[] = [];

    if (stepHistoryData && stepHistoryData.length > 0) {
      stepHistoryData.forEach((history: any) => {
        const instance = instancesMap.get(history.instance_id);
        entries.push({
          id: history.id,
          instanceId: history.instance_id,
          templateName: instance?.template_name || 'Unknown Workflow',
          category: (instance?.category || 'custom') as WorkflowCategory,
          referenceId: instance?.reference_id || history.instance_id?.slice(0, 8) || 'N/A',
          referenceTitle: instance?.reference_title || 'Workflow Instance',
          stepName: history.step_name || 'Unknown Step',
          stepOrder: history.step_order || 0,
          action: history.action || 'pending',
          actionBy: history.action_by || 'System',
          actionAt: history.created_at,
          comments: history.comments,
          status: (instance?.status || 'pending') as WorkflowInstanceStatus,
        });
      });
    }

    if (instances && entries.length === 0) {
      instances.forEach((instance: any) => {
        if (instance.status !== 'pending') {
          entries.push({
            id: `${instance.id}-status`,
            instanceId: instance.id,
            templateName: instance.template_name || 'Unknown Workflow',
            category: instance.category || 'custom',
            referenceId: instance.reference_id || instance.id?.slice(0, 8) || 'N/A',
            referenceTitle: instance.reference_title || 'Workflow Instance',
            stepName: 'Workflow Status Change',
            stepOrder: instance.current_step_order || 0,
            action: instance.status,
            actionBy: instance.started_by || 'System',
            actionAt: instance.completed_at || instance.updated_at || instance.created_at,
            comments: instance.rejection_reason,
            status: instance.status,
          });
        }
      });
    }

    return entries.sort((a, b) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime());
  }, [stepHistoryData, instances, instancesMap]);

  const filteredEntries = useMemo(() => {
    let result = historyEntries;

    if (filterAction !== 'all') {
      result = result.filter(e => e.action === filterAction);
    }

    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }

    if (filterDateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (filterDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      result = result.filter(e => new Date(e.actionAt) >= startDate);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.referenceId.toLowerCase().includes(query) ||
        e.referenceTitle.toLowerCase().includes(query) ||
        e.actionBy.toLowerCase().includes(query) ||
        e.templateName.toLowerCase().includes(query) ||
        e.stepName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [historyEntries, filterAction, filterStatus, filterCategory, filterDateRange, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('[ApprovalHistory] Refreshing data...');
    await Promise.all([refetchInstances(), refetchStepHistory()]);
    setTimeout(() => setRefreshing(false), 500);
  }, [refetchInstances, refetchStepHistory]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle2 size={16} color="#10B981" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      case 'escalated':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'delegated':
        return <UserCheck size={16} color="#8B5CF6" />;
      case 'reassigned':
        return <RefreshCw size={16} color="#3B82F6" />;
      case 'skipped':
        return <SkipForward size={16} color="#6B7280" />;
      default:
        return <Clock size={16} color={colors.textSecondary} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'escalated': return '#F59E0B';
      case 'delegated': return '#8B5CF6';
      case 'reassigned': return '#3B82F6';
      case 'skipped': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  const getCategoryIcon = (category: WorkflowCategory) => {
    switch (category) {
      case 'purchase': return ShoppingCart;
      case 'time_off': return Calendar;
      case 'permit': return Shield;
      case 'expense': return DollarSign;
      case 'contract': return FileText;
      default: return Briefcase;
    }
  };

  const getCategoryColor = (category: WorkflowCategory) => {
    switch (category) {
      case 'purchase': return '#F59E0B';
      case 'time_off': return '#8B5CF6';
      case 'permit': return '#EF4444';
      case 'expense': return '#10B981';
      case 'contract': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const activeFilterCount = [
    filterAction !== 'all',
    filterStatus !== 'all',
    filterCategory !== 'all',
    filterDateRange !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterAction('all');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterDateRange('all');
    setSearchQuery('');
  };

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {workflowStats?.approvalRate?.toFixed(1) || '0'}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approval Rate</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {workflowStats?.pendingInstances || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {workflowStats?.escalationRate?.toFixed(1) || '0'}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Escalation</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {workflowStats?.avgCompletionTimeHours?.toFixed(0) || '0'}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Time</Text>
        </View>
      </View>
    </View>
  );

  const renderHistoryCard = (entry: ApprovalHistoryEntry) => {
    const CategoryIcon = getCategoryIcon(entry.category);
    const categoryColor = getCategoryColor(entry.category);
    const actionColor = getActionColor(entry.action);

    return (
      <Pressable
        key={entry.id}
        style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => { Haptics.selectionAsync(); setSelectedEntry(entry); }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}15` }]}>
            <CategoryIcon size={18} color={categoryColor} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.referenceId, { color: colors.primary }]}>{entry.referenceId}</Text>
            <Text style={[styles.referenceTitle, { color: colors.text }]} numberOfLines={1}>
              {entry.referenceTitle}
            </Text>
          </View>
          <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>{formatDate(entry.actionAt)}</Text>
        </View>

        <View style={styles.actionRow}>
          <View style={[styles.stepBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.stepNumber, { color: colors.textSecondary }]}>Step {entry.stepOrder}</Text>
            <ArrowRight size={10} color={colors.textTertiary} />
            <Text style={[styles.stepName, { color: colors.text }]}>{entry.stepName}</Text>
          </View>
        </View>

        <View style={styles.actionInfo}>
          <View style={[styles.actionBadge, { backgroundColor: `${actionColor}15` }]}>
            {getActionIcon(entry.action)}
            <Text style={[styles.actionText, { color: actionColor }]}>
              {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
            </Text>
          </View>
          <View style={styles.actionByRow}>
            <User size={12} color={colors.textTertiary} />
            <Text style={[styles.actionByText, { color: colors.textSecondary }]}>{entry.actionBy}</Text>
          </View>
        </View>

        {entry.comments && (
          <View style={[styles.commentsRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.commentsText, { color: colors.textSecondary }]} numberOfLines={2}>
              &ldquo;{entry.comments}&rdquo;
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.templateName, { color: colors.textTertiary }]}>{entry.templateName}</Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter History</Text>
          <Pressable onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Action Type</Text>
          <View style={styles.filterOptions}>
            {(['all', 'approved', 'rejected', 'escalated', 'delegated', 'reassigned', 'skipped'] as FilterAction[]).map((action) => (
              <Pressable
                key={action}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: filterAction === action ? colors.primary : colors.surface, 
                    borderColor: filterAction === action ? colors.primary : colors.border 
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setFilterAction(action); }}
              >
                {action !== 'all' && getActionIcon(action)}
                <Text style={[styles.filterOptionText, { color: filterAction === action ? '#FFF' : colors.text }]}>
                  {action === 'all' ? 'All Actions' : action.charAt(0).toUpperCase() + action.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text, marginTop: 24 }]}>Category</Text>
          <View style={styles.filterOptions}>
            {(['all', 'purchase', 'time_off', 'permit', 'expense', 'contract'] as FilterCategory[]).map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: filterCategory === cat ? colors.primary : colors.surface, 
                    borderColor: filterCategory === cat ? colors.primary : colors.border 
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setFilterCategory(cat); }}
              >
                <Text style={[styles.filterOptionText, { color: filterCategory === cat ? '#FFF' : colors.text }]}>
                  {cat === 'all' ? 'All Categories' : cat === 'time_off' ? 'Time Off' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text, marginTop: 24 }]}>Status</Text>
          <View style={styles.filterOptions}>
            {(['all', 'pending', 'in_progress', 'approved', 'rejected', 'escalated', 'cancelled'] as FilterStatus[]).map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: filterStatus === status ? colors.primary : colors.surface, 
                    borderColor: filterStatus === status ? colors.primary : colors.border 
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setFilterStatus(status); }}
              >
                <Text style={[styles.filterOptionText, { color: filterStatus === status ? '#FFF' : colors.text }]}>
                  {status === 'all' ? 'All Statuses' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text, marginTop: 24 }]}>Date Range</Text>
          <View style={styles.filterOptions}>
            {(['all', 'today', 'week', 'month', 'quarter'] as DateRange[]).map((range) => (
              <Pressable
                key={range}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: filterDateRange === range ? colors.primary : colors.surface, 
                    borderColor: filterDateRange === range ? colors.primary : colors.border 
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setFilterDateRange(range); }}
              >
                <Text style={[styles.filterOptionText, { color: filterDateRange === range ? '#FFF' : colors.text }]}>
                  {range === 'all' ? 'All Time' : range === 'week' ? 'Last 7 Days' : range === 'month' ? 'This Month' : range === 'quarter' ? 'Last 90 Days' : 'Today'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterActions}>
            <Pressable
              style={[styles.filterActionButton, { borderColor: colors.border }]}
              onPress={() => { clearFilters(); setShowFilterModal(false); }}
            >
              <Text style={[styles.filterActionText, { color: colors.textSecondary }]}>Clear All</Text>
            </Pressable>
            <Pressable
              style={[styles.filterActionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={[styles.filterActionText, { color: '#FFF' }]}>Apply Filters</Text>
            </Pressable>
          </View>

          <View style={styles.modalBottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedEntry) return null;
    const CategoryIcon = getCategoryIcon(selectedEntry.category);
    const categoryColor = getCategoryColor(selectedEntry.category);
    const actionColor = getActionColor(selectedEntry.action);

    return (
      <Modal
        visible={!!selectedEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Action Details</Text>
            <Pressable onPress={() => setSelectedEntry(null)} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailCategoryIcon, { backgroundColor: `${categoryColor}15` }]}>
                  <CategoryIcon size={24} color={categoryColor} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailReferenceId, { color: colors.primary }]}>{selectedEntry.referenceId}</Text>
                  <Text style={[styles.detailReferenceTitle, { color: colors.text }]}>{selectedEntry.referenceTitle}</Text>
                </View>
              </View>

              <View style={[styles.detailActionSection, { backgroundColor: `${actionColor}10`, borderColor: actionColor }]}>
                {getActionIcon(selectedEntry.action)}
                <Text style={[styles.detailActionText, { color: actionColor }]}>
                  {selectedEntry.action.charAt(0).toUpperCase() + selectedEntry.action.slice(1)}
                </Text>
              </View>

              <View style={styles.detailRows}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Step</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    Step {selectedEntry.stepOrder}: {selectedEntry.stepName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Action By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEntry.actionBy}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date & Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatFullDate(selectedEntry.actionAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Workflow</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEntry.templateName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Instance Status</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedEntry.status.charAt(0).toUpperCase() + selectedEntry.status.slice(1).replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {selectedEntry.comments && (
                <View style={[styles.detailCommentsSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Comments</Text>
                  <View style={[styles.detailCommentsBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.detailCommentsText, { color: colors.text }]}>
                      &ldquo;{selectedEntry.comments}&rdquo;
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCard()}

        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by reference, approver, workflow..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable
            style={[styles.filterButton, { backgroundColor: activeFilterCount > 0 ? colors.primary : colors.backgroundSecondary }]}
            onPress={() => { Haptics.selectionAsync(); setShowFilterModal(true); }}
          >
            <Filter size={16} color={activeFilterCount > 0 ? '#FFF' : colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {activeFilterCount > 0 && (
          <Pressable
            style={[styles.clearFiltersButton, { borderColor: colors.border }]}
            onPress={clearFilters}
          >
            <X size={14} color={colors.textSecondary} />
            <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredEntries.length} action{filteredEntries.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        <View style={styles.historyList}>
          {isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>Loading history...</Text>
            </View>
          ) : stepHistoryError ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AlertCircle size={48} color="#EF4444" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Error loading history</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {stepHistoryError instanceof Error ? stepHistoryError.message : 'Please try again'}
              </Text>
              <Pressable
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={onRefresh}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <History size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No history found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : 'Approval actions will appear here'}
              </Text>
            </View>
          ) : (
            filteredEntries.map(renderHistoryCard)
          )}
        </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
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
  statDivider: {
    width: 1,
    height: 28,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  clearFiltersText: {
    fontSize: 13,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  referenceId: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  stepName: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionByText: {
    fontSize: 12,
  },
  commentsRow: {
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentsText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateName: {
    fontSize: 11,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  filterActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  filterActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  detailCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailReferenceId: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailReferenceTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  detailActionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailActionText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  detailRows: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  detailCommentsSection: {
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  detailCommentsBox: {
    padding: 12,
    borderRadius: 8,
  },
  detailCommentsText: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  },
});
