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
  usePartsReturnsQuery,
  useCreatePartsReturn,
  useInspectPartsReturn,
  useProcessPartsReturn,
  useUpdatePartsReturn,
  useStockLevelsQuery,
} from '@/hooks/useCMMSPartsManagement';
import {
  PartsReturn,
  PartsReturnItem,
  PartsReturnStatus,
  PartsReturnReason,
  PARTS_RETURN_STATUSES,
  PARTS_RETURN_REASONS,
  generatePartsReturnNumber,
} from '@/types/cmms';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Wrench,
  User,
  DollarSign,
  Filter,
  ArrowUpDown,
  Check,
  AlertTriangle,
  RotateCcw,
  Hash,
  MapPin,
  Eye,
  PackageCheck,
  Trash2,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<PartsReturnStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: Clock },
  inspected: { label: 'Inspected', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: Eye },
  restocked: { label: 'Restocked', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: PackageCheck },
  scrapped: { label: 'Scrapped', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: Trash2 },
  rejected: { label: 'Rejected', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: XCircle },
};

const REASON_CONFIG: Record<PartsReturnReason, { label: string; color: string; icon: React.ElementType }> = {
  excess: { label: 'Excess Parts', color: '#3B82F6', icon: Package },
  wrong_part: { label: 'Wrong Part', color: '#F59E0B', icon: AlertCircle },
  defective: { label: 'Defective', color: '#EF4444', icon: AlertTriangle },
  job_cancelled: { label: 'Job Cancelled', color: '#8B5CF6', icon: XCircle },
  other: { label: 'Other', color: '#6B7280', icon: ClipboardCheck },
};

const CONDITION_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#10B981' },
  usable: { label: 'Usable', color: '#3B82F6' },
  damaged: { label: 'Damaged', color: '#F59E0B' },
  defective: { label: 'Defective', color: '#EF4444' },
};

type StatusFilter = 'all' | PartsReturnStatus;
type ReasonFilter = 'all' | PartsReturnReason;
type SortField = 'created_at' | 'return_number' | 'total_credit_value' | 'status';
type SortDirection = 'asc' | 'desc';

export default function PartsReturnScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PartsReturn | null>(null);

  const { data: partsReturns = [], isLoading, refetch } = usePartsReturnsQuery({
    facilityId: facilityId || undefined,
  });
  const { data: stockLevels = [] } = useStockLevelsQuery({ facilityId: facilityId || undefined });

  const createMutation = useCreatePartsReturn({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Parts return created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to create parts return');
    },
  });

  const inspectMutation = useInspectPartsReturn({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedReturn(null);
      Alert.alert('Success', 'Parts return inspected');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to inspect parts return');
    },
  });

  const processMutation = useProcessPartsReturn({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedReturn(null);
      Alert.alert('Success', 'Parts return processed successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to process parts return');
    },
  });

  const updateMutation = useUpdatePartsReturn({
    onSuccess: () => {
      setShowDetailModal(false);
      setSelectedReturn(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update parts return');
    },
  });

  const filteredReturns = useMemo(() => {
    let filtered = [...partsReturns];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ret => ret.status === statusFilter);
    }

    if (reasonFilter !== 'all') {
      filtered = filtered.filter(ret => ret.reason === reasonFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ret =>
        ret.returnNumber.toLowerCase().includes(query) ||
        ret.returnedByName.toLowerCase().includes(query) ||
        ret.workOrderNumber?.toLowerCase().includes(query) ||
        ret.items.some(item => item.materialName.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'return_number':
          comparison = a.returnNumber.localeCompare(b.returnNumber);
          break;
        case 'total_credit_value':
          comparison = a.totalCreditValue - b.totalCreditValue;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [partsReturns, statusFilter, reasonFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = partsReturns.length;
    const pending = partsReturns.filter(r => r.status === 'pending').length;
    const inspected = partsReturns.filter(r => r.status === 'inspected').length;
    const restocked = partsReturns.filter(r => r.status === 'restocked').length;
    const totalCreditValue = partsReturns.reduce((sum, r) => sum + (r.totalCreditValue || 0), 0);
    return { total, pending, inspected, restocked, totalCreditValue };
  }, [partsReturns]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleReturnPress = useCallback((ret: PartsReturn) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReturn(ret);
    setShowDetailModal(true);
  }, []);

  const handleInspect = useCallback(() => {
    if (!selectedReturn) return;
    Alert.alert(
      'Inspect Return',
      `Mark parts return ${selectedReturn.returnNumber} as inspected?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Inspect',
          onPress: () => {
            inspectMutation.mutate({
              id: selectedReturn.id,
              inspectedBy: 'current-user-id',
              inspectedByName: 'Current User',
              items: selectedReturn.items,
            });
          },
        },
      ]
    );
  }, [selectedReturn, inspectMutation]);

  const handleRestock = useCallback(() => {
    if (!selectedReturn) return;
    Alert.alert(
      'Restock Parts',
      `Restock all items from ${selectedReturn.returnNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: () => {
            const updatedItems = selectedReturn.items.map(item => ({
              ...item,
              quantityRestocked: item.quantityReturned,
              quantityScrapped: 0,
            }));
            processMutation.mutate({
              id: selectedReturn.id,
              processedBy: 'current-user-id',
              processedByName: 'Current User',
              items: updatedItems,
              status: 'restocked',
            });
          },
        },
      ]
    );
  }, [selectedReturn, processMutation]);

  const handleScrap = useCallback(() => {
    if (!selectedReturn) return;
    Alert.alert(
      'Scrap Parts',
      `Scrap all items from ${selectedReturn.returnNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scrap',
          style: 'destructive',
          onPress: () => {
            const updatedItems = selectedReturn.items.map(item => ({
              ...item,
              quantityRestocked: 0,
              quantityScrapped: item.quantityReturned,
              creditValue: 0,
            }));
            processMutation.mutate({
              id: selectedReturn.id,
              processedBy: 'current-user-id',
              processedByName: 'Current User',
              items: updatedItems,
              status: 'scrapped',
            });
          },
        },
      ]
    );
  }, [selectedReturn, processMutation]);

  const handleReject = useCallback(() => {
    if (!selectedReturn) return;
    Alert.alert(
      'Reject Return',
      'Are you sure you want to reject this return?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            updateMutation.mutate({
              id: selectedReturn.id,
              updates: {
                status: 'rejected',
              },
            });
          },
        },
      ]
    );
  }, [selectedReturn, updateMutation]);

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

  const renderReturnCard = (ret: PartsReturn) => {
    const statusConfig = STATUS_CONFIG[ret.status];
    const reasonConfig = REASON_CONFIG[ret.reason];
    const StatusIcon = statusConfig.icon;
    const ReasonIcon = reasonConfig.icon;

    return (
      <TouchableOpacity
        key={ret.id}
        style={[styles.returnCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleReturnPress(ret)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.returnNumberContainer}>
            <View style={[styles.returnNumberBadge, { backgroundColor: colors.primary + '15' }]}>
              <Hash size={12} color={colors.primary} />
              <Text style={[styles.returnNumber, { color: colors.primary }]}>
                {ret.returnNumber}
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

        <View style={styles.reasonRow}>
          <View style={[styles.reasonBadge, { backgroundColor: reasonConfig.color + '15' }]}>
            <ReasonIcon size={14} color={reasonConfig.color} />
            <Text style={[styles.reasonText, { color: reasonConfig.color }]}>
              {reasonConfig.label}
            </Text>
          </View>
          {ret.workOrderNumber && (
            <View style={styles.workOrderInfo}>
              <Wrench size={14} color={colors.textSecondary} />
              <Text style={[styles.workOrderText, { color: colors.textSecondary }]}>
                WO: {ret.workOrderNumber}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.itemsSummary}>
          <View style={[styles.itemsBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Package size={14} color={colors.textSecondary} />
            <Text style={[styles.itemsCount, { color: colors.text }]}>
              {ret.items.length} {ret.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={[styles.creditBadge, { backgroundColor: '#10B981' + '15' }]}>
            <DollarSign size={14} color="#10B981" />
            <Text style={[styles.creditText, { color: '#10B981' }]}>
              {formatCurrency(ret.totalCreditValue)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.returnerInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {ret.returnedByName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={styles.returnerDetails}>
              <Text style={[styles.returnerName, { color: colors.text }]} numberOfLines={1}>
                {ret.returnedByName}
              </Text>
              <Text style={[styles.returnDate, { color: colors.textTertiary }]}>
                {formatDate(ret.returnedAt)}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedReturn) return null;
    const statusConfig = STATUS_CONFIG[selectedReturn.status];
    const reasonConfig = REASON_CONFIG[selectedReturn.reason];
    const StatusIcon = statusConfig.icon;
    const ReasonIcon = reasonConfig.icon;
    const canInspect = selectedReturn.status === 'pending';
    const canProcess = selectedReturn.status === 'inspected';
    const canReject = selectedReturn.status === 'pending' || selectedReturn.status === 'inspected';

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Parts Return Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.returnNumberBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Hash size={14} color={colors.primary} />
                  <Text style={[styles.returnNumberLarge, { color: colors.primary }]}>
                    {selectedReturn.returnNumber}
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={16} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: reasonConfig.color + '15' }]}>
                  <ReasonIcon size={16} color={reasonConfig.color} />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Return Reason</Text>
                  <Text style={[styles.detailValue, { color: reasonConfig.color }]}>
                    {reasonConfig.label}
                  </Text>
                </View>
              </View>

              {selectedReturn.workOrderNumber && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <Wrench size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Work Order</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedReturn.workOrderNumber}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                  <DollarSign size={16} color="#10B981" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Credit Value</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    {formatCurrency(selectedReturn.totalCreditValue)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#F59E0B' + '15' }]}>
                  <User size={16} color="#F59E0B" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Returned By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedReturn.returnedByName}
                  </Text>
                  <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                    {formatDate(selectedReturn.returnedAt)}
                  </Text>
                </View>
              </View>

              {selectedReturn.inspectedByName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#3B82F6' + '15' }]}>
                    <Eye size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Inspected By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedReturn.inspectedByName}
                    </Text>
                    {selectedReturn.inspectedAt && (
                      <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                        {formatDate(selectedReturn.inspectedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedReturn.processedByName && (
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: '#10B981' + '15' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Processed By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedReturn.processedByName}
                    </Text>
                    {selectedReturn.processedAt && (
                      <Text style={[styles.detailSubvalue, { color: colors.textTertiary }]}>
                        {formatDate(selectedReturn.processedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {selectedReturn.notes && (
                <View style={styles.notesSection}>
                  <Text style={[styles.notesLabel, { color: colors.textTertiary }]}>Notes</Text>
                  <Text style={[styles.notesText, { color: colors.text }]}>{selectedReturn.notes}</Text>
                </View>
              )}
            </View>

            <View style={[styles.itemsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Items ({selectedReturn.items.length})
              </Text>
              {selectedReturn.items.map((item, index) => {
                const conditionConfig = CONDITION_CONFIG[item.condition] || { label: item.condition, color: '#6B7280' };
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemCard,
                      { borderBottomColor: colors.border },
                      index === selectedReturn.items.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                        {item.materialName}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemSku, { color: colors.textTertiary }]}>
                          {item.materialSku}
                        </Text>
                        <View style={[styles.conditionBadge, { backgroundColor: conditionConfig.color + '15' }]}>
                          <Text style={[styles.conditionText, { color: conditionConfig.color }]}>
                            {conditionConfig.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.itemDetails}>
                      <View style={styles.itemDetailCol}>
                        <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Returned</Text>
                        <Text style={[styles.itemDetailValue, { color: colors.text }]}>
                          {item.quantityReturned}
                        </Text>
                      </View>
                      <View style={styles.itemDetailCol}>
                        <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Restocked</Text>
                        <Text style={[styles.itemDetailValue, { color: item.quantityRestocked > 0 ? '#10B981' : colors.textTertiary }]}>
                          {item.quantityRestocked}
                        </Text>
                      </View>
                      <View style={styles.itemDetailCol}>
                        <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Scrapped</Text>
                        <Text style={[styles.itemDetailValue, { color: item.quantityScrapped > 0 ? '#EF4444' : colors.textTertiary }]}>
                          {item.quantityScrapped}
                        </Text>
                      </View>
                      <View style={styles.itemDetailCol}>
                        <Text style={[styles.itemDetailLabel, { color: colors.textTertiary }]}>Credit</Text>
                        <Text style={[styles.itemDetailValue, { color: '#10B981' }]}>
                          {formatCurrency(item.creditValue)}
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
                    {item.inspectionNotes && (
                      <View style={styles.inspectionNotesContainer}>
                        <Text style={[styles.inspectionNotesLabel, { color: colors.textTertiary }]}>
                          Inspection Notes:
                        </Text>
                        <Text style={[styles.inspectionNotesText, { color: colors.text }]}>
                          {item.inspectionNotes}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {(canInspect || canProcess || canReject) && (
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
              {canInspect && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.inspectButton, { backgroundColor: '#3B82F6' }]}
                  onPress={handleInspect}
                  disabled={inspectMutation.isPending}
                >
                  {inspectMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Eye size={18} color="#FFFFFF" />
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Inspect</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canProcess && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.scrapButton, { borderColor: '#6B7280' }]}
                    onPress={handleScrap}
                    disabled={processMutation.isPending}
                  >
                    <Trash2 size={18} color="#6B7280" />
                    <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>Scrap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.restockButton, { backgroundColor: '#10B981' }]}
                    onPress={handleRestock}
                    disabled={processMutation.isPending}
                  >
                    {processMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <PackageCheck size={18} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Restock</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
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
                  setStatusFilter(status as PartsReturnStatus);
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
              { field: 'return_number', label: 'Return Number' },
              { field: 'total_credit_value', label: 'Credit Value' },
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading parts returns...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Parts Return',
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateModal(true)}
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
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.inspected.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.inspected.color }]}>{statistics.inspected}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.inspected.color }]}>Inspected</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: STATUS_CONFIG.restocked.bgColor }]}>
            <Text style={[styles.statValue, { color: STATUS_CONFIG.restocked.color }]}>{statistics.restocked}</Text>
            <Text style={[styles.statLabel, { color: STATUS_CONFIG.restocked.color }]}>Restocked</Text>
          </View>
        </View>
        <View style={[styles.totalValueRow, { backgroundColor: '#10B981' + '10' }]}>
          <DollarSign size={16} color="#10B981" />
          <Text style={[styles.totalValueLabel, { color: '#10B981' }]}>Total Credit Value:</Text>
          <Text style={[styles.totalValueAmount, { color: '#10B981' }]}>{formatCurrency(statistics.totalCreditValue)}</Text>
        </View>
      </View>

      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search returns, work orders, items..."
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
          {filteredReturns.length} {filteredReturns.length === 1 ? 'return' : 'returns'}
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
        {filteredReturns.length > 0 ? (
          filteredReturns.map(renderReturnCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
              <RotateCcw size={44} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Parts Returns</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all'
                ? 'No returns match your filters'
                : 'Parts returns will appear here when created'}
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
  returnCard: {
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
  returnNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  returnNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  returnNumberLarge: {
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
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  workOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workOrderText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  creditText: {
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
  returnerInfo: {
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
  returnerDetails: {
    flex: 1,
  },
  returnerName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  returnDate: {
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
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemSku: {
    fontSize: 12,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600' as const,
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
  inspectionNotesContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inspectionNotesLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  inspectionNotesText: {
    fontSize: 13,
    lineHeight: 18,
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
  inspectButton: {},
  scrapButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  restockButton: {},
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
