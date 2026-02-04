import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowRightLeft,
  Check,
  X,
  ChevronDown,
  Search,
  Filter,
  Plus,
  User,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  Hourglass,
  Ban,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  InterUnitTransfer,
  SharedMaterialGroup,
  SharedMaterialEntry,
  INVENTORY_DEPARTMENTS,
  getDepartmentColor,
  getTransferStatusColor,
  getTransferStatusLabel,
  createInterUnitTransfer,
} from '@/constants/inventoryDepartmentCodes';
import {
  useSharedMaterialGroupsQuery,
  useInterUnitTransfersQuery,
  useCreateInterUnitTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useCompleteTransfer,
} from '@/hooks/useSupabaseSharedMaterials';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';

type TransferStatus = InterUnitTransfer['status'] | 'all';
type ViewMode = 'list' | 'pending' | 'history';

interface TransferDetailModalProps {
  visible: boolean;
  transfer: InterUnitTransfer | null;
  onClose: () => void;
  onApprove: (transfer: InterUnitTransfer) => void;
  onReject: (transfer: InterUnitTransfer) => void;
  onComplete: (transfer: InterUnitTransfer) => void;
}

const TransferDetailModal: React.FC<TransferDetailModalProps> = ({
  visible,
  transfer,
  onClose,
  onApprove,
  onReject,
  onComplete,
}) => {
  const { colors } = useTheme();
  const { data: sharedGroups = [] } = useSharedMaterialGroupsQuery();

  if (!transfer) return null;

  const fromDept = INVENTORY_DEPARTMENTS[transfer.fromDepartment];
  const toDept = INVENTORY_DEPARTMENTS[transfer.toDepartment];
  const group = sharedGroups.find(g => g.id === transfer.sharedGroupId);

  const getStatusIcon = (status: InterUnitTransfer['status']) => {
    switch (status) {
      case 'pending': return <Hourglass size={20} color={getTransferStatusColor(status)} />;
      case 'approved': return <CheckCircle size={20} color={getTransferStatusColor(status)} />;
      case 'completed': return <Check size={20} color={getTransferStatusColor(status)} />;
      case 'rejected': return <XCircle size={20} color={getTransferStatusColor(status)} />;
      case 'cancelled': return <Ban size={20} color={getTransferStatusColor(status)} />;
      default: return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Transfer Details</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference #</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{transfer.referenceNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getTransferStatusColor(transfer.status) + '20' }]}>
                {getStatusIcon(transfer.status)}
                <Text style={[styles.statusText, { color: getTransferStatusColor(transfer.status) }]}>
                  {getTransferStatusLabel(transfer.status)}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Material</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{group?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>OEM Part #</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{group?.oemPartNumber || 'N/A'}</Text>
            </View>
          </View>

          <View style={[styles.transferVisual, { backgroundColor: colors.surface }]}>
            <View style={styles.deptBox}>
              <View style={[styles.deptIndicator, { backgroundColor: fromDept?.color || colors.primary }]} />
              <Text style={[styles.deptCode, { color: colors.text }]}>{fromDept?.shortName}</Text>
              <Text style={[styles.deptName, { color: colors.textSecondary }]}>{fromDept?.name}</Text>
              <Text style={[styles.materialNum, { color: colors.primary }]}>{transfer.fromMaterialNumber}</Text>
            </View>
            <View style={styles.arrowContainer}>
              <ArrowRight size={24} color={colors.primary} />
              <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.qtyText}>{transfer.quantity}</Text>
              </View>
            </View>
            <View style={styles.deptBox}>
              <View style={[styles.deptIndicator, { backgroundColor: toDept?.color || colors.primary }]} />
              <Text style={[styles.deptCode, { color: colors.text }]}>{toDept?.shortName}</Text>
              <Text style={[styles.deptName, { color: colors.textSecondary }]}>{toDept?.name}</Text>
              <Text style={[styles.materialNum, { color: colors.primary }]}>{transfer.toMaterialNumber}</Text>
            </View>
          </View>

          <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Unit Cost</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>${transfer.unitCost.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Value</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>${transfer.totalValue.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requested By</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{transfer.requestedBy}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Request Date</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(transfer.timestamp).toLocaleDateString()}
              </Text>
            </View>
            {transfer.approvedBy && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{transfer.approvedBy}</Text>
              </View>
            )}
            {transfer.completedAt && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(transfer.completedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {transfer.notes && (
            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{transfer.notes}</Text>
            </View>
          )}

          {transfer.status === 'pending' && (
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => onReject(transfer)}
              >
                <XCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => onApprove(transfer)}
              >
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </Pressable>
            </View>
          )}

          {transfer.status === 'approved' && (
            <Pressable
              style={[styles.completeButton, { backgroundColor: colors.success }]}
              onPress={() => onComplete(transfer)}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Mark as Completed</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

interface CreateTransferModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (transfer: Partial<InterUnitTransfer>) => void;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const { data: sharedGroups = [], isLoading: groupsLoading } = useSharedMaterialGroupsQuery();
  const [selectedGroup, setSelectedGroup] = useState<SharedMaterialGroup | null>(null);
  const [fromMaterial, setFromMaterial] = useState<SharedMaterialEntry | null>(null);
  const [toMaterial, setToMaterial] = useState<SharedMaterialEntry | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const activeGroups = useMemo(() => 
    sharedGroups.filter(g => g.status === 'active'), 
    [sharedGroups]
  );

  const resetForm = useCallback(() => {
    setSelectedGroup(null);
    setFromMaterial(null);
    setToMaterial(null);
    setQuantity('');
    setNotes('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedGroup || !fromMaterial || !toMaterial || !quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (qty > fromMaterial.onHand) {
      Alert.alert('Error', `Insufficient quantity. Available: ${fromMaterial.onHand}`);
      return;
    }

    if (fromMaterial.materialNumber === toMaterial.materialNumber) {
      Alert.alert('Error', 'Cannot transfer to the same material');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const transfer = createInterUnitTransfer(
      selectedGroup.id,
      fromMaterial.materialNumber,
      toMaterial.materialNumber,
      qty,
      fromMaterial.unitCost,
      'Current User',
      notes || undefined
    );

    onSubmit(transfer);
    resetForm();
    onClose();
  }, [selectedGroup, fromMaterial, toMaterial, quantity, notes, onSubmit, onClose, resetForm]);

  const availableToDepts = useMemo(() => {
    if (!selectedGroup || !fromMaterial) return [];
    return selectedGroup.linkedMaterials.filter(
      m => m.materialNumber !== fromMaterial.materialNumber
    );
  }, [selectedGroup, fromMaterial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New IUT Request</Text>
          <Pressable onPress={() => { resetForm(); onClose(); }} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Shared Material Group *</Text>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowGroupPicker(!showGroupPicker)}
            >
              <Text style={[styles.pickerText, { color: selectedGroup ? colors.text : colors.textSecondary }]}>
                {selectedGroup?.name || 'Select a shared material group'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
            {showGroupPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {groupsLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : activeGroups.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary }}>No shared material groups available</Text>
                  </View>
                ) : activeGroups.map(group => (
                  <Pressable
                    key={group.id}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedGroup(group);
                      setFromMaterial(null);
                      setToMaterial(null);
                      setShowGroupPicker(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <View style={styles.pickerOptionContent}>
                      <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{group.name}</Text>
                      <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                        OEM: {group.oemPartNumber} • {group.linkedMaterials.length} departments
                      </Text>
                    </View>
                    {selectedGroup?.id === group.id && <Check size={18} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {selectedGroup && (
            <>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Transfer From *</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowFromPicker(!showFromPicker)}
                >
                  <Text style={[styles.pickerText, { color: fromMaterial ? colors.text : colors.textSecondary }]}>
                    {fromMaterial 
                      ? `${fromMaterial.materialNumber} - ${fromMaterial.departmentName} (${fromMaterial.onHand} on hand)`
                      : 'Select source department'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </Pressable>
                {showFromPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {selectedGroup.linkedMaterials.map(mat => (
                      <Pressable
                        key={mat.materialNumber}
                        style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setFromMaterial(mat);
                          if (toMaterial?.materialNumber === mat.materialNumber) {
                            setToMaterial(null);
                          }
                          setShowFromPicker(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <View style={styles.pickerOptionContent}>
                          <View style={styles.deptPickerRow}>
                            <View style={[styles.deptDot, { backgroundColor: getDepartmentColor(mat.departmentCode) }]} />
                            <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>
                              {mat.materialNumber} - {mat.departmentName}
                            </Text>
                          </View>
                          <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                            Location: {mat.location} • On Hand: {mat.onHand} • ${mat.unitCost.toFixed(2)}/unit
                          </Text>
                        </View>
                        {fromMaterial?.materialNumber === mat.materialNumber && <Check size={18} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Transfer To *</Text>
                <Pressable
                  style={[
                    styles.pickerButton, 
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    !fromMaterial && styles.pickerDisabled
                  ]}
                  onPress={() => fromMaterial && setShowToPicker(!showToPicker)}
                  disabled={!fromMaterial}
                >
                  <Text style={[styles.pickerText, { color: toMaterial ? colors.text : colors.textSecondary }]}>
                    {toMaterial 
                      ? `${toMaterial.materialNumber} - ${toMaterial.departmentName}`
                      : fromMaterial ? 'Select destination department' : 'Select source first'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </Pressable>
                {showToPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {availableToDepts.map(mat => (
                      <Pressable
                        key={mat.materialNumber}
                        style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setToMaterial(mat);
                          setShowToPicker(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <View style={styles.pickerOptionContent}>
                          <View style={styles.deptPickerRow}>
                            <View style={[styles.deptDot, { backgroundColor: getDepartmentColor(mat.departmentCode) }]} />
                            <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>
                              {mat.materialNumber} - {mat.departmentName}
                            </Text>
                          </View>
                          <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                            Location: {mat.location} • Current On Hand: {mat.onHand}
                          </Text>
                        </View>
                        {toMaterial?.materialNumber === mat.materialNumber && <Check size={18} color={colors.primary} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>
              Quantity * {fromMaterial && <Text style={{ color: colors.textSecondary }}>(Available: {fromMaterial.onHand})</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          </View>

          {fromMaterial && quantity && !isNaN(parseInt(quantity, 10)) && (
            <View style={[styles.valuePreview, { backgroundColor: colors.primary + '15' }]}>
              <DollarSign size={20} color={colors.primary} />
              <Text style={[styles.valueText, { color: colors.primary }]}>
                Transfer Value: ${(parseInt(quantity, 10) * fromMaterial.unitCost).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Add notes or reason for transfer..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!selectedGroup || !fromMaterial || !toMaterial || !quantity) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedGroup || !fromMaterial || !toMaterial || !quantity}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Transfer Request</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function InterUnitTransferScreen() {
  const { colors } = useTheme();
  const { userProfile } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<TransferStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState<InterUnitTransfer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: sharedGroups = [], isLoading: groupsLoading, refetch: refetchGroups } = useSharedMaterialGroupsQuery();
  const { data: transfers = [], isLoading: transfersLoading, refetch: refetchTransfers } = useInterUnitTransfersQuery();
  const { data: allMaterials = [] } = useMaterialsQuery({ filters: [{ column: 'classification', operator: 'eq', value: 'shared' }] });

  const currentUserName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Current User';

  const createTransferMutation = useCreateInterUnitTransfer({
    onSuccess: () => {
      Alert.alert('Success', 'Transfer request submitted for approval');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to create transfer');
    },
  });

  const approveTransferMutation = useApproveTransfer({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDetailModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to approve transfer');
    },
  });

  const rejectTransferMutation = useRejectTransfer({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowDetailModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to reject transfer');
    },
  });

  const completeTransferMutation = useCompleteTransfer({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDetailModal(false);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to complete transfer');
    },
  });

  const isLoading = groupsLoading || transfersLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchTransfers()]);
    console.log('IUT list refreshed');
    setRefreshing(false);
  }, [refetchGroups, refetchTransfers]);

  const filteredTransfers = useMemo(() => {
    let result = [...transfers];

    if (viewMode === 'pending') {
      result = result.filter(t => t.status === 'pending' || t.status === 'approved');
    } else if (viewMode === 'history') {
      result = result.filter(t => t.status === 'completed' || t.status === 'rejected' || t.status === 'cancelled');
    }

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (departmentFilter !== null) {
      result = result.filter(t => t.fromDepartment === departmentFilter || t.toDepartment === departmentFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.referenceNumber?.toLowerCase().includes(query) ||
        t.fromMaterialNumber.toLowerCase().includes(query) ||
        t.toMaterialNumber.toLowerCase().includes(query) ||
        t.requestedBy.toLowerCase().includes(query) ||
        sharedGroups.find(g => g.id === t.sharedGroupId)?.name.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transfers, viewMode, statusFilter, departmentFilter, searchQuery, sharedGroups]);

  const stats = useMemo(() => ({
    pending: transfers.filter(t => t.status === 'pending').length,
    approved: transfers.filter(t => t.status === 'approved').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    totalValue: transfers.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.totalValue, 0),
  }), [transfers]);

  const handleApprove = useCallback((transfer: InterUnitTransfer) => {
    Alert.alert(
      'Approve Transfer',
      `Approve transfer of ${transfer.quantity} units from ${INVENTORY_DEPARTMENTS[transfer.fromDepartment]?.shortName} to ${INVENTORY_DEPARTMENTS[transfer.toDepartment]?.shortName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approveTransferMutation.mutate({
              transferId: transfer.id,
              approvedBy: currentUserName,
            });
          }
        }
      ]
    );
  }, [approveTransferMutation, currentUserName]);

  const handleReject = useCallback((transfer: InterUnitTransfer) => {
    Alert.alert(
      'Reject Transfer',
      'Are you sure you want to reject this transfer request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            rejectTransferMutation.mutate({
              transferId: transfer.id,
              rejectedBy: currentUserName,
            });
          }
        }
      ]
    );
  }, [rejectTransferMutation, currentUserName]);

  const handleComplete = useCallback((transfer: InterUnitTransfer) => {
    Alert.alert(
      'Complete Transfer',
      'Mark this transfer as completed? This will update inventory quantities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            completeTransferMutation.mutate({
              transferId: transfer.id,
              completedBy: currentUserName,
            });
          }
        }
      ]
    );
  }, [completeTransferMutation, currentUserName]);

  const handleCreateTransfer = useCallback((transfer: Partial<InterUnitTransfer>) => {
    if (!transfer.fromMaterialNumber || !transfer.toMaterialNumber || !transfer.sharedGroupId) {
      Alert.alert('Error', 'Missing required transfer information');
      return;
    }

    const fromMat = allMaterials.find(m => m.material_number === transfer.fromMaterialNumber);
    if (!fromMat) {
      Alert.alert('Error', 'Source material not found');
      return;
    }

    const toMat = allMaterials.find(m => m.material_number === transfer.toMaterialNumber);
    if (!toMat) {
      Alert.alert('Error', 'Destination material not found');
      return;
    }

    createTransferMutation.mutate({
      sharedGroupId: transfer.sharedGroupId,
      fromMaterial: {
        id: fromMat.id,
        materialNumber: fromMat.material_number,
        name: fromMat.name,
        sku: fromMat.sku,
        onHand: Number(fromMat.on_hand) || 0,
      },
      toMaterial: {
        id: toMat.id,
        materialNumber: toMat.material_number,
        departmentCode: toMat.inventory_department,
      },
      quantity: transfer.quantity || 0,
      unitCost: transfer.unitCost || 0,
      requestedBy: currentUserName,
      notes: transfer.notes,
    });
  }, [allMaterials, createTransferMutation, currentUserName]);

  const renderTransferCard = useCallback((transfer: InterUnitTransfer) => {
    const fromDept = INVENTORY_DEPARTMENTS[transfer.fromDepartment];
    const toDept = INVENTORY_DEPARTMENTS[transfer.toDepartment];
    const group = sharedGroups.find(g => g.id === transfer.sharedGroupId);

    return (
      <Pressable
        key={transfer.id}
        style={[styles.transferCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedTransfer(transfer);
          setShowDetailModal(true);
          Haptics.selectionAsync();
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.statusDot, { backgroundColor: getTransferStatusColor(transfer.status) }]} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{transfer.referenceNumber}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: getTransferStatusColor(transfer.status) + '20' }]}>
            <Text style={[styles.statusChipText, { color: getTransferStatusColor(transfer.status) }]}>
              {getTransferStatusLabel(transfer.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
          {group?.name || 'Unknown Material'}
        </Text>

        <View style={styles.transferFlow}>
          <View style={styles.deptChip}>
            <View style={[styles.deptColorBar, { backgroundColor: fromDept?.color || colors.border }]} />
            <View>
              <Text style={[styles.deptChipCode, { color: colors.text }]}>{fromDept?.shortName}</Text>
              <Text style={[styles.deptChipNum, { color: colors.textSecondary }]}>{transfer.fromMaterialNumber}</Text>
            </View>
          </View>
          <View style={styles.flowArrow}>
            <ArrowRight size={16} color={colors.textSecondary} />
            <Text style={[styles.qtyLabel, { color: colors.primary }]}>{transfer.quantity}</Text>
          </View>
          <View style={styles.deptChip}>
            <View style={[styles.deptColorBar, { backgroundColor: toDept?.color || colors.border }]} />
            <View>
              <Text style={[styles.deptChipCode, { color: colors.text }]}>{toDept?.shortName}</Text>
              <Text style={[styles.deptChipNum, { color: colors.textSecondary }]}>{transfer.toMaterialNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>${transfer.totalValue.toFixed(2)}</Text>
          </View>
          <View style={styles.footerItem}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{transfer.requestedBy}</Text>
          </View>
          <View style={styles.footerItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {new Date(transfer.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [colors, sharedGroups]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <Pressable 
          style={[styles.statCard, viewMode === 'pending' && { backgroundColor: colors.warning + '20' }]}
          onPress={() => setViewMode(viewMode === 'pending' ? 'list' : 'pending')}
        >
          <Hourglass size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, viewMode === 'pending' && { backgroundColor: colors.info + '20' }]}
          onPress={() => setViewMode(viewMode === 'pending' ? 'list' : 'pending')}
        >
          <CheckCircle size={20} color={colors.info} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.approved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
        </Pressable>
        <Pressable 
          style={[styles.statCard, viewMode === 'history' && { backgroundColor: colors.success + '20' }]}
          onPress={() => setViewMode(viewMode === 'history' ? 'list' : 'history')}
        >
          <Check size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </Pressable>
        <View style={styles.statCard}>
          <DollarSign size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>${(stats.totalValue / 1000).toFixed(1)}k</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transfers..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={[styles.filterButton, showFilters && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? colors.primary : colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setShowCreateModal(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'pending', 'approved', 'completed', 'rejected', 'cancelled'] as TransferStatus[]).map(status => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  statusFilter === status && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => {
                  setStatusFilter(status);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: statusFilter === status ? '#FFFFFF' : colors.text }
                ]}>
                  {status === 'all' ? 'All' : getTransferStatusLabel(status as InterUnitTransfer['status'])}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.filterTitle, { color: colors.text, marginTop: 12 }]}>Department</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <Pressable
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                departmentFilter === null && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => {
                setDepartmentFilter(null);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: departmentFilter === null ? '#FFFFFF' : colors.text }
              ]}>All Depts</Text>
            </Pressable>
            {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
              <Pressable
                key={dept.code}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  departmentFilter === dept.code && { backgroundColor: dept.color, borderColor: dept.color }
                ]}
                onPress={() => {
                  setDepartmentFilter(dept.code);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: departmentFilter === dept.code ? '#FFFFFF' : colors.text }
                ]}>{dept.shortName}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.viewModeRow}>
        {(['list', 'pending', 'history'] as ViewMode[]).map(mode => (
          <Pressable
            key={mode}
            style={[
              styles.viewModeTab,
              viewMode === mode && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[
              styles.viewModeText,
              { color: viewMode === mode ? colors.primary : colors.textSecondary }
            ]}>
              {mode === 'list' ? 'All Transfers' : mode === 'pending' ? 'Pending/Approved' : 'History'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, marginTop: 12 }]}>
              Loading transfers...
            </Text>
          </View>
        ) : filteredTransfers.length === 0 ? (
          <View style={styles.emptyState}>
            <ArrowRightLeft size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transfers Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter !== 'all' || departmentFilter !== null
                ? 'Try adjusting your filters'
                : 'Create your first inter-unit transfer'}
            </Text>
          </View>
        ) : (
          filteredTransfers.map(renderTransferCard)
        )}
      </ScrollView>

      <TransferDetailModal
        visible={showDetailModal}
        transfer={selectedTransfer}
        onClose={() => setShowDetailModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onComplete={handleComplete}
      />

      <CreateTransferModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTransfer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  viewModeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  transferCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: 'monospace',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  transferFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  deptColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  deptChipCode: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deptChipNum: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  flowArrow: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  transferVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deptBox: {
    alignItems: 'center',
    flex: 1,
  },
  deptIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  deptCode: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  deptName: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  materialNum: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  arrowContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  qtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  pickerDropdown: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  pickerOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  deptPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textInput: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  valuePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
