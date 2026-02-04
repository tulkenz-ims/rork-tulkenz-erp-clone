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
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  usePartsIssuesQuery,
  useCreatePartsIssue,
  useApprovePartsIssue,
  useIssuePartsIssue,
  useUpdatePartsIssue,
  useStockLevelsQuery,
} from '@/hooks/useCMMSPartsManagement';
import {
  PartsIssue,
  PartsIssueItem,
  PartsIssueStatus,
  PARTS_ISSUE_STATUSES,
} from '@/types/cmms';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Wrench,
  Calendar,
  User,
  FileText,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  AlertTriangle,
  Send,
  Truck,
  Hash,
  MapPin,
  MoreVertical,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<PartsIssueStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  approved: { label: 'Approved', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: CheckCircle2 },
  issued: { label: 'Issued', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: Truck },
  rejected: { label: 'Rejected', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: XCircle },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: XCircle },
};

type StatusFilter = 'all' | PartsIssueStatus;
type SortField = 'created_at' | 'issue_number' | 'total_cost' | 'status';
type SortDirection = 'asc' | 'desc';

export default function PartsIssueScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<PartsIssue | null>(null);

  const { data: partsIssues = [], isLoading, refetch } = usePartsIssuesQuery({
    facilityId: facilityId || undefined,
  });
  const { data: stockLevels = [] } = useStockLevelsQuery({ facilityId: facilityId || undefined });

  const createMutation = useCreatePartsIssue({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Parts issue created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to create parts issue');
    },
  });

  const approveMutation = useApprovePartsIssue({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedIssue(null);
      Alert.alert('Success', 'Parts issue approved');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to approve parts issue');
    },
  });

  const issueMutation = useIssuePartsIssue({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedIssue(null);
      Alert.alert('Success', 'Parts issued successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to issue parts');
    },
  });

  const updateMutation = useUpdatePartsIssue({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedIssue(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update parts issue');
    },
  });

  const filteredIssues = useMemo(() => {
    let filtered = [...partsIssues];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(issue =>
        issue.issueNumber.toLowerCase().includes(query) ||
        issue.requestedByName.toLowerCase().includes(query) ||
        issue.workOrderNumber?.toLowerCase().includes(query) ||
        issue.equipmentName?.toLowerCase().includes(query) ||
        issue.items.some(item => item.materialName.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'issue_number':
          comparison = a.issueNumber.localeCompare(b.issueNumber);
          break;
        case 'total_cost':
          comparison = a.totalCost - b.totalCost;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [partsIssues, statusFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = partsIssues.length;
    const pending = partsIssues.filter(i => i.status === 'pending').length;
    const approved = partsIssues.filter(i => i.status === 'approved').length;
    const issued = partsIssues.filter(i => i.status === 'issued').length;
    const totalValue = partsIssues.reduce((sum, i) => sum + (i.totalCost || 0), 0);
    return { total, pending, approved, issued, totalValue };
  }, [partsIssues]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleIssuePress = useCallback((issue: PartsIssue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIssue(issue);
    setShowDetailModal(true);
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedIssue) return;
    Alert.alert(
      'Approve Issue',
      `Approve parts issue ${selectedIssue.issueNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approveMutation.mutate({
              id: selectedIssue.id,
              approvedBy: 'current-user-id',
              approvedByName: 'Current User',
            });
          },
        },
      ]
    );
  }, [selectedIssue, approveMutation]);

  const handleIssue = useCallback(() => {
    if (!selectedIssue) return;
    Alert.alert(
      'Issue Parts',
      `Issue parts for ${selectedIssue.issueNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue',
          onPress: () => {
            const updatedItems = selectedIssue.items.map(item => ({
              ...item,
              quantityIssued: item.quantityRequested,
            }));
            issueMutation.mutate({
              id: selectedIssue.id,
              issuedBy: 'current-user-id',
              issuedByName: 'Current User',
              items: updatedItems,
            });
          },
        },
      ]
    );
  }, [selectedIssue, issueMutation]);

  const handleReject = useCallback(() => {
    if (!selectedIssue) return;
    Alert.prompt(
      'Reject Issue',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason: string | undefined) => {
            updateMutation.mutate({
              id: selectedIssue.id,
              updates: {
                status: 'rejected',
                rejectionReason: reason || 'No reason provided',
              },
            });
          },
        },
      ],
      'plain-text'
    );
  }, [selectedIssue, updateMutation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderIssueCard = (issue: PartsIssue) => {
    const statusConfig = STATUS_CONFIG[issue.status];
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        key={issue.id}
        style={[styles.issueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleIssuePress(issue)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.issueNumberContainer}>
            <View style={[styles.issueNumberBadge, { backgroundColor: colors.primary + '15' }]}>
              <Hash size={12} color={colors.primary} />
              <Text style={[styles.issueNumber, { color: colors.primary }]}>
                {issue.issueNumber}
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

        {issue.workOrderNumber && (
          <View style={styles.workOrderRow}>
            <Wrench size={14} color={colors.textSecondary} />
            <Text style={[styles.workOrderText, { color: colors.textSecondary }]}>
              WO: {issue.workOrderNumber}
            </Text>
            {issue.equipmentName && (
              <Text style={[styles.equipmentText, { color: colors.textTertiary }]} numberOfLines={1}>
                • {issue.equipmentName}
              </Text>
            )}
          </View>
        )}

        <View style={styles.itemsSummary}>
          <View style={[styles.itemsBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Package size={14} color={colors.textSecondary} />
            <Text style={[styles.itemsCount, { color: colors.text }]}>
              {issue.items.length} {issue.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={[styles.costBadge, { backgroundColor: '#10B981' + '15' }]}>
            <DollarSign size={14} color="#10B981" />
            <Text style={[styles.costText, { color: '#10B981' }]}>
              {formatCurrency(issue.totalCost)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.requesterInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {issue.requestedByName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={styles.requesterDetails}>
              <Text style={[styles.requesterName, { color: colors.text }]} numberOfLines={1}>
                {issue.requestedByName}
              </Text>
              <Text style={[styles.requestDate, { color: colors.textTertiary }]}>
                {formatDate(issue.requestedAt)}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedIssue) return null;
    const statusConfig = STATUS_CONFIG[selectedIssue.status];
    const StatusIcon = statusConfig.icon;
    const canApprove = selectedIssue.status === 'pending';
    const canIssue = selectedIssue.status === 'approved';
    const canReject = selectedIssue.status === 'pending';

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Parts Issue Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.issueNumberBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Hash size={14} color={colors.primary} />
                  <Text style={[styles.issueNumberLarge, { color: colors.primary }]}>
                    {selectedIssue.issueNumber}
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={16} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              {selectedIssue.workOrderNumber && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <Wrench size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Work Order</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedIssue.workOrderNumber}
                    </Text>
                  </View>
                </View>
              )}

              {selectedIssue.equipmentName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                    <Package size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Equipment</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedIssue.equipmentName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <DollarSign size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Total Cost</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedIssue.totalCost)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <User size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Requested By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedIssue.requestedByName}
                  </Text>
                  <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                    {formatDate(selectedIssue.requestedAt)}
                  </Text>
                </View>
              </View>

              {selectedIssue.approvedByName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <CheckCircle2 size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Approved By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedIssue.approvedByName}
                    </Text>
                    {selectedIssue.approvedAt && (
                      <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                        {formatDate(selectedIssue.approvedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedIssue.issuedByName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                    <Truck size={16} color="#10B981" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Issued By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedIssue.issuedByName}
                    </Text>
                    {selectedIssue.issuedAt && (
                      <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                        {formatDate(selectedIssue.issuedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedIssue.rejectionReason && (
                <View style={[styles.rejectionBox, { backgroundColor: '#EF4444' + '10', borderColor: '#EF4444' + '30' }]}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <View style={styles.rejectionContent}>
                    <Text style={[styles.rejectionLabel, { color: '#EF4444' }]}>Rejection Reason</Text>
                    <Text style={[styles.rejectionText, { color: colors.text }]}>
                      {selectedIssue.rejectionReason}
                    </Text>
                  </View>
                </View>
              )}

              {selectedIssue.notes && (
                <View style={styles.notesSection}>
                  <Text style={[styles.notesLabel, { color: colors.textTertiary }]}>Notes</Text>
                  <Text style={[styles.notesText, { color: colors.text }]}>{selectedIssue.notes}</Text>
                </View>
              )}
            </View>

            <View style={[styles.itemsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Items ({selectedIssue.items.length})
              </Text>
              {selectedIssue.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    { borderBottomColor: colors.border },
                    index === selectedIssue.items.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                      {item.materialName}
                    </Text>
                    <Text style={[styles.itemSku, { color: colors.textTertiary }]}>
                      {item.materialSku}
                    </Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <View style={styles.itemDetailCol}>
                      <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Requested</Text>
                      <Text style={[styles.itemDetailValue, { color: colors.text }]}>
                        {item.quantityRequested}
                      </Text>
                    </View>
                    <View style={styles.itemDetailCol}>
                      <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Issued</Text>
                      <Text style={[styles.itemDetailValue, { color: item.quantityIssued > 0 ? '#10B981' : colors.textTertiary }]}>
                        {item.quantityIssued}
                      </Text>
                    </View>
                    <View style={styles.itemDetailCol}>
                      <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Unit Cost</Text>
                      <Text style={[styles.itemDetailValue, { color: colors.text }]}>
                        {formatCurrency(item.unitCost)}
                      </Text>
                    </View>
                    <View style={styles.itemDetailCol}>
                      <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Total</Text>
                      <Text style={[styles.itemDetailValue, { color: '#10B981' }]}>
                        {formatCurrency(item.totalCost)}
                      </Text>
                    </View>
                  </View>
                  {item.location && (
                    <View style={styles.itemLocation}>
                      <MapPin size={12} color={colors.textTertiary} />
                      <Text style={[styles.itemLocationText, { color: colors.textTertiary }]}>
                        {item.location}{item.bin ? ` / ${item.bin}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {(canApprove || canIssue || canReject) && (
            <View style={[styles.modalActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              {canReject && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton, { borderColor: '#EF4444' }]}
                  onPress={handleReject}
                  disabled={updateMutation.isPending}
                >
                  <XCircle size={18} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                </TouchableOpacity>
              )}
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
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canIssue && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.issueButton, { backgroundColor: '#10B981' }]}
                  onPress={handleIssue}
                  disabled={issueMutation.isPending}
                >
                  {issueMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Truck size={18} color="#FFFFFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Issue Parts</Text>
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
                  setStatusFilter(status as PartsIssueStatus);
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
              { field: 'issue_number', label: 'Issue Number' },
              { field: 'total_cost', label: 'Total Cost' },
              { field: 'status', label: 'Status' },
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading parts issues...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Parts Issue',
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/cmms/partsrequest' as any)}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Total</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.pending.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.pending.color }]}>{statistics.pending}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.pending.color }]}>Pending</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.approved.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.approved.color }]}>{statistics.approved}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.approved.color }]}>Approved</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.issued.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.issued.color }]}>{statistics.issued}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.issued.color }]}>Issued</Text>
          </View>
        </View>
        <View style={[styles.totalValueRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalValueLabel, { color: '#10B981' }]}>Total Value:</Text>
          <Text style={[styles.totalValueAmount, { color: '#10B981' }]}>{formatCurrency(statistics.totalValue)}</Text>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search issues, work orders, items..."
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
          {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
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
        {filteredIssues.length > 0 ? (
          filteredIssues.map(renderIssueCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <Package size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Parts Issues</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all'
                ? 'No issues match your filters'
                : 'Parts issues will appear here when created'}
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  totalValueLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
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
  issueCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  issueNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  issueNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  issueNumberLarge: {
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
  workOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workOrderText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  equipmentText: {
    fontSize: 13,
    flex: 1,
  },
  itemsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  itemsCount: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  costText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  requesterDetails: {
    flex: 1,
  },
  requesterName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  requestDate: {
    fontSize: 11,
    marginTop: 2,
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
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  rejectionText: {
    fontSize: 14,
    marginTop: 4,
  },
  notesSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemsSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  itemCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  itemHeader: {
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  itemSku: {
    fontSize: 12,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  itemDetailCol: {
    flex: 1,
  },
  itemDetailLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  itemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemLocationText: {
    fontSize: 12,
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
  rejectButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  approveButton: {},
  issueButton: {},
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
