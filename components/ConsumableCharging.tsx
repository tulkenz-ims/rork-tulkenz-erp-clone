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
} from 'react-native';
import {
  CreditCard,
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
  Clock,
  RotateCcw,
  Package,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Send,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { INVENTORY_DEPARTMENTS } from '@/constants/inventoryDepartmentCodes';
import {
  ChargeTransactionStatus,
  ChargeType,
  DEPARTMENT_GL_ACCOUNTS,
  getChargeGLAccounts,
  getChargeStatusColor,
  getChargeStatusLabel,
  getChargeTypeLabel,
  getChargeTypeColor,
} from '@/mocks/consumableChargingData';
import {
  useChargeTransactionsQuery,
  useChargeTransactionStats,
  useCreateChargeTransaction,
  useApproveChargeTransaction,
  usePostChargeTransaction,
  useRejectChargeTransaction,
  useReverseChargeTransaction,
  ChargeTransactionWithDepts,
} from '@/hooks/useSupabaseConsumableCharging';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { Tables } from '@/lib/supabase';

type ViewMode = 'transactions' | 'issue' | 'summary' | 'gl_accounts';
type FilterStatus = ChargeTransactionStatus | 'all';
type Material = Tables['materials'];

interface ConsumableChargingProps {
  departmentFilter?: number;
  onTransactionCreated?: (transaction: ChargeTransactionWithDepts) => void;
}

interface IssueFormData {
  fromDepartment: number | null;
  toDepartment: number | null;
  material: Material | null;
  quantity: string;
  chargeType: ChargeType;
  workOrderId: string;
  costCenter: string;
  notes: string;
}

const ConsumableCharging: React.FC<ConsumableChargingProps> = ({
  departmentFilter,
  onTransactionCreated,
}) => {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [deptFilter, setDeptFilter] = useState<number | null>(departmentFilter || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ChargeTransactionWithDepts | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const { data: transactionsData = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useChargeTransactionsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    departmentCode: deptFilter ?? undefined,
  });
  const { data: statsData } = useChargeTransactionStats();
  const { data: materialsData = [] } = useMaterialsQuery();

  const createTransaction = useCreateChargeTransaction({
    onSuccess: (data) => {
      onTransactionCreated?.(data);
      resetIssueForm();
      setShowIssueModal(false);
      Alert.alert('Success', 'Charge transaction created and pending approval');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to create transaction');
    },
  });

  const approveTransaction = useApproveChargeTransaction({
    onSuccess: () => {
      setShowDetailModal(false);
    },
  });

  const postTransaction = usePostChargeTransaction({
    onSuccess: (data) => {
      setShowDetailModal(false);
      Alert.alert('Posted', `Journal Entry ${data.journalEntryId} created`);
    },
  });

  const rejectTransaction = useRejectChargeTransaction({
    onSuccess: () => {
      setShowDetailModal(false);
    },
  });

  const reverseTransaction = useReverseChargeTransaction({
    onSuccess: () => {
      setShowDetailModal(false);
    },
  });

  const [issueForm, setIssueForm] = useState<IssueFormData>({
    fromDepartment: null,
    toDepartment: null,
    material: null,
    quantity: '',
    chargeType: 'consumable_issue',
    workOrderId: '',
    costCenter: '',
    notes: '',
  });
  const [showFromDeptPicker, setShowFromDeptPicker] = useState(false);
  const [showToDeptPicker, setShowToDeptPicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showChargeTypePicker, setShowChargeTypePicker] = useState(false);

  const onRefresh = useCallback(() => {
    refetchTransactions();
  }, [refetchTransactions]);

  const chargeableMaterials = useMemo(() => {
    return materialsData.filter(m => 
      m.classification === 'chargeable' || m.classification === 'consumable'
    );
  }, [materialsData]);

  const filteredMaterials = useMemo(() => {
    if (!issueForm.fromDepartment) return [];
    return chargeableMaterials.filter(m => 
      m.inventory_department === issueForm.fromDepartment &&
      (m.classification === 'chargeable' || m.classification === 'consumable')
    );
  }, [chargeableMaterials, issueForm.fromDepartment]);

  const availableToDepartments = useMemo(() => {
    return Object.values(INVENTORY_DEPARTMENTS).filter(
      d => d.code !== issueForm.fromDepartment
    );
  }, [issueForm.fromDepartment]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactionsData];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.transactionNumber.toLowerCase().includes(query) ||
        t.materialName.toLowerCase().includes(query) ||
        t.materialNumber.toLowerCase().includes(query) ||
        t.fromDepartmentName.toLowerCase().includes(query) ||
        t.toDepartmentName.toLowerCase().includes(query) ||
        t.issuedBy.toLowerCase().includes(query)
      );
    }

    return result;
  }, [transactionsData, searchQuery]);

  const stats = useMemo(() => {
    return statsData || { pending: 0, totalPosted: 0, monthlyTotal: 0, postedCount: 0 };
  }, [statsData]);

  const glPreview = useMemo(() => {
    if (!issueForm.fromDepartment || !issueForm.toDepartment) return null;
    return getChargeGLAccounts(
      issueForm.fromDepartment,
      issueForm.toDepartment,
      issueForm.chargeType
    );
  }, [issueForm.fromDepartment, issueForm.toDepartment, issueForm.chargeType]);

  const resetIssueForm = useCallback(() => {
    setIssueForm({
      fromDepartment: null,
      toDepartment: null,
      material: null,
      quantity: '',
      chargeType: 'consumable_issue',
      workOrderId: '',
      costCenter: '',
      notes: '',
    });
  }, []);

  const handleCreateTransaction = useCallback(() => {
    if (!issueForm.fromDepartment || !issueForm.toDepartment || !issueForm.material || !issueForm.quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const qty = parseInt(issueForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (qty > issueForm.material.on_hand) {
      Alert.alert('Error', `Insufficient quantity. Available: ${issueForm.material.on_hand}`);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createTransaction.mutate({
      fromDepartment: issueForm.fromDepartment,
      toDepartment: issueForm.toDepartment,
      materialId: issueForm.material.id,
      materialNumber: issueForm.material.material_number,
      materialName: issueForm.material.name,
      materialSku: issueForm.material.sku,
      quantity: qty,
      unitCost: issueForm.material.unit_price,
      chargeType: issueForm.chargeType,
      issuedBy: 'Current User',
      notes: issueForm.notes || undefined,
      workOrderId: issueForm.workOrderId || undefined,
      costCenter: issueForm.costCenter || undefined,
    });
  }, [issueForm, createTransaction]);

  const handleApprove = useCallback((transaction: ChargeTransactionWithDepts) => {
    Alert.alert(
      'Approve Transaction',
      `Approve charge of ${transaction.totalCost.toFixed(2)} to ${transaction.toDepartmentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approveTransaction.mutate({
              transactionId: transaction.id,
              approvedBy: 'Current User',
            });
          }
        }
      ]
    );
  }, [approveTransaction]);

  const handlePost = useCallback((transaction: ChargeTransactionWithDepts) => {
    Alert.alert(
      'Post to G/L',
      `Post this transaction to General Ledger?\n\nDebit: ${transaction.debitGLAccount}\nCredit: ${transaction.creditGLAccount}\nAmount: ${transaction.totalCost.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            postTransaction.mutate({
              transactionId: transaction.id,
              postedBy: 'System',
            });
          }
        }
      ]
    );
  }, [postTransaction]);

  const handleReject = useCallback((transaction: ChargeTransactionWithDepts) => {
    Alert.alert(
      'Reject Transaction',
      'Are you sure you want to reject this charge transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            rejectTransaction.mutate({
              transactionId: transaction.id,
            });
          }
        }
      ]
    );
  }, [rejectTransaction]);

  const handleReverse = useCallback((transaction: ChargeTransactionWithDepts) => {
    Alert.prompt(
      'Reverse Transaction',
      'Enter reason for reversal:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: (reason?: string) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            reverseTransaction.mutate({
              transactionId: transaction.id,
              reversedBy: 'Current User',
              reason: reason || 'No reason provided',
            });
          }
        }
      ],
      'plain-text'
    );
  }, [reverseTransaction]);

  const renderTransactionCard = useCallback((transaction: ChargeTransactionWithDepts) => {
    const fromDept = INVENTORY_DEPARTMENTS[transaction.fromDepartment];
    const toDept = INVENTORY_DEPARTMENTS[transaction.toDepartment];

    return (
      <Pressable
        key={transaction.id}
        style={[styles.transactionCard, { backgroundColor: colors.surface }]}
        onPress={() => {
          setSelectedTransaction(transaction);
          setShowDetailModal(true);
          Haptics.selectionAsync();
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.statusDot, { backgroundColor: getChargeStatusColor(transaction.status) }]} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{transaction.transactionNumber}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: getChargeStatusColor(transaction.status) + '20' }]}>
            <Text style={[styles.statusChipText, { color: getChargeStatusColor(transaction.status) }]}>
              {getChargeStatusLabel(transaction.status)}
            </Text>
          </View>
        </View>

        <View style={styles.materialRow}>
          <Package size={14} color={colors.textSecondary} />
          <Text style={[styles.materialName, { color: colors.text }]} numberOfLines={1}>
            {transaction.materialName}
          </Text>
          <View style={[styles.typeChip, { backgroundColor: getChargeTypeColor(transaction.chargeType) + '20' }]}>
            <Text style={[styles.typeChipText, { color: getChargeTypeColor(transaction.chargeType) }]}>
              {getChargeTypeLabel(transaction.chargeType)}
            </Text>
          </View>
        </View>

        <View style={styles.chargeFlow}>
          <View style={styles.deptChip}>
            <View style={[styles.deptColorBar, { backgroundColor: fromDept?.color || colors.border }]} />
            <View>
              <Text style={[styles.deptChipCode, { color: colors.text }]}>{fromDept?.shortName}</Text>
              <Text style={[styles.deptChipLabel, { color: colors.textSecondary }]}>Issuing</Text>
            </View>
          </View>
          <View style={styles.flowArrow}>
            <ArrowRight size={16} color={colors.textSecondary} />
            <Text style={[styles.qtyLabel, { color: colors.primary }]}>{transaction.quantity}</Text>
          </View>
          <View style={styles.deptChip}>
            <View style={[styles.deptColorBar, { backgroundColor: toDept?.color || colors.border }]} />
            <View>
              <Text style={[styles.deptChipCode, { color: colors.text }]}>{toDept?.shortName}</Text>
              <Text style={[styles.deptChipLabel, { color: colors.textSecondary }]}>Charged</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <DollarSign size={14} color={colors.success} />
            <Text style={[styles.footerValue, { color: colors.success }]}>${transaction.totalCost.toFixed(2)}</Text>
          </View>
          <View style={styles.footerItem}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{transaction.issuedBy}</Text>
          </View>
          <View style={styles.footerItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {new Date(transaction.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }, [colors]);

  const renderDetailModal = () => {
    if (!selectedTransaction) return null;

    const fromDept = INVENTORY_DEPARTMENTS[selectedTransaction.fromDepartment];
    const toDept = INVENTORY_DEPARTMENTS[selectedTransaction.toDepartment];

    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Transaction Details</Text>
            <Pressable onPress={() => setShowDetailModal(false)} hitSlop={8}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Transaction #</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.transactionNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getChargeStatusColor(selectedTransaction.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getChargeStatusColor(selectedTransaction.status) }]}>
                    {getChargeStatusLabel(selectedTransaction.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                <View style={[styles.typeBadge, { backgroundColor: getChargeTypeColor(selectedTransaction.chargeType) + '20' }]}>
                  <Text style={[styles.typeText, { color: getChargeTypeColor(selectedTransaction.chargeType) }]}>
                    {getChargeTypeLabel(selectedTransaction.chargeType)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.chargeVisual, { backgroundColor: colors.surface }]}>
              <View style={styles.deptBox}>
                <View style={[styles.deptIndicator, { backgroundColor: fromDept?.color || colors.primary }]} />
                <Text style={[styles.deptCode, { color: colors.text }]}>{fromDept?.shortName}</Text>
                <Text style={[styles.deptName, { color: colors.textSecondary }]}>{fromDept?.name}</Text>
                <Text style={[styles.deptRole, { color: colors.warning }]}>Issuing Dept</Text>
              </View>
              <View style={styles.arrowContainer}>
                <ArrowRight size={24} color={colors.primary} />
                <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.qtyText}>{selectedTransaction.quantity}</Text>
                </View>
              </View>
              <View style={styles.deptBox}>
                <View style={[styles.deptIndicator, { backgroundColor: toDept?.color || colors.primary }]} />
                <Text style={[styles.deptCode, { color: colors.text }]}>{toDept?.shortName}</Text>
                <Text style={[styles.deptName, { color: colors.textSecondary }]}>{toDept?.name}</Text>
                <Text style={[styles.deptRole, { color: colors.error }]}>Charged Dept</Text>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Material Information</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Material #</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.materialNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.materialName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SKU</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.materialSku}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.quantity}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Unit Cost</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>${selectedTransaction.unitCost.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Cost</Text>
                <Text style={[styles.detailValue, { color: colors.success, fontWeight: '700' as const }]}>
                  ${selectedTransaction.totalCost.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>G/L Account Entries</Text>
              <View style={[styles.glEntry, { borderLeftColor: colors.error }]}>
                <Text style={[styles.glLabel, { color: colors.error }]}>DEBIT</Text>
                <Text style={[styles.glAccount, { color: colors.text }]}>{selectedTransaction.debitGLAccount}</Text>
                <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{selectedTransaction.debitGLAccountName}</Text>
                <Text style={[styles.glAmount, { color: colors.text }]}>${selectedTransaction.totalCost.toFixed(2)}</Text>
              </View>
              <View style={[styles.glEntry, { borderLeftColor: colors.success }]}>
                <Text style={[styles.glLabel, { color: colors.success }]}>CREDIT</Text>
                <Text style={[styles.glAccount, { color: colors.text }]}>{selectedTransaction.creditGLAccount}</Text>
                <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{selectedTransaction.creditGLAccountName}</Text>
                <Text style={[styles.glAmount, { color: colors.text }]}>${selectedTransaction.totalCost.toFixed(2)}</Text>
              </View>
              {selectedTransaction.journalEntryId && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Journal Entry</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedTransaction.journalEntryId}</Text>
                </View>
              )}
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Audit Trail</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Issued By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.issuedBy}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Issue Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(selectedTransaction.timestamp).toLocaleString()}
                </Text>
              </View>
              {selectedTransaction.receivedBy && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Received By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.receivedBy}</Text>
                </View>
              )}
              {selectedTransaction.approvedBy && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.approvedBy}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedTransaction.approvedAt!).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
              {selectedTransaction.postedBy && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Posted By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.postedBy}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Posted At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedTransaction.postedAt!).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
              {selectedTransaction.reversedBy && (
                <>
                  <View style={[styles.warningBox, { backgroundColor: colors.error + '15' }]}>
                    <AlertTriangle size={16} color={colors.error} />
                    <Text style={[styles.warningText, { color: colors.error }]}>REVERSED</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reversed By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.reversedBy}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reason</Text>
                    <Text style={[styles.detailValue, { color: colors.error }]}>{selectedTransaction.reversalReason}</Text>
                  </View>
                </>
              )}
            </View>

            {selectedTransaction.workOrderId && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Work Order</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedTransaction.workOrderId}</Text>
                </View>
              </View>
            )}

            {selectedTransaction.notes && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.text }]}>{selectedTransaction.notes}</Text>
              </View>
            )}

            {selectedTransaction.status === 'pending' && (
              <View style={styles.actionButtons}>
                <Pressable
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(selectedTransaction)}
                >
                  <XCircle size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(selectedTransaction)}
                >
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </Pressable>
              </View>
            )}

            {selectedTransaction.status === 'approved' && (
              <Pressable
                style={[styles.postButton, { backgroundColor: colors.primary }]}
                onPress={() => handlePost(selectedTransaction)}
              >
                <BookOpen size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Post to G/L</Text>
              </Pressable>
            )}

            {selectedTransaction.status === 'posted' && (
              <Pressable
                style={[styles.reverseButton, { backgroundColor: colors.error }]}
                onPress={() => handleReverse(selectedTransaction)}
              >
                <RotateCcw size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reverse Transaction</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderIssueModal = () => (
    <Modal visible={showIssueModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Issue Consumable</Text>
          <Pressable onPress={() => { resetIssueForm(); setShowIssueModal(false); }} hitSlop={8}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Issuing Department *</Text>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowFromDeptPicker(!showFromDeptPicker)}
            >
              <Text style={[styles.pickerText, { color: issueForm.fromDepartment ? colors.text : colors.textSecondary }]}>
                {issueForm.fromDepartment 
                  ? INVENTORY_DEPARTMENTS[issueForm.fromDepartment]?.name 
                  : 'Select issuing department'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
            {showFromDeptPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
                  <Pressable
                    key={dept.code}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setIssueForm(prev => ({ ...prev, fromDepartment: dept.code, material: null, toDepartment: null }));
                      setShowFromDeptPicker(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <View style={styles.deptPickerRow}>
                      <View style={[styles.deptDot, { backgroundColor: dept.color }]} />
                      <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{dept.name}</Text>
                    </View>
                    {issueForm.fromDepartment === dept.code && <Check size={18} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {issueForm.fromDepartment && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Chargeable Material *</Text>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowMaterialPicker(!showMaterialPicker)}
              >
                <Text style={[styles.pickerText, { color: issueForm.material ? colors.text : colors.textSecondary }]}>
                  {issueForm.material 
                    ? `${issueForm.material.material_number} - ${issueForm.material.name}` 
                    : 'Select material to issue'}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
              </Pressable>
              {showMaterialPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {filteredMaterials.length === 0 ? (
                    <View style={styles.emptyPicker}>
                      <Text style={[styles.emptyPickerText, { color: colors.textSecondary }]}>
                        No chargeable materials found for this department
                      </Text>
                    </View>
                  ) : (
                    filteredMaterials.map(mat => (
                      <Pressable
                        key={mat.id}
                        style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setIssueForm(prev => ({ ...prev, material: mat, toDepartment: null }));
                          setShowMaterialPicker(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <View style={styles.materialPickerContent}>
                          <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>
                            {mat.material_number} - {mat.name}
                          </Text>
                          <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                            On Hand: {mat.on_hand} • ${mat.unit_price.toFixed(2)}/{mat.unit_of_measure}
                          </Text>
                          <View style={[styles.classificationBadge, { backgroundColor: '#10B981' + '20' }]}>
                            <Text style={[styles.classificationText, { color: '#10B981' }]}>
                              {mat.classification.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        {issueForm.material?.id === mat.id && <Check size={18} color={colors.primary} />}
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {issueForm.material && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Charge To Department *</Text>
              <Pressable
                style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowToDeptPicker(!showToDeptPicker)}
              >
                <Text style={[styles.pickerText, { color: issueForm.toDepartment ? colors.text : colors.textSecondary }]}>
                  {issueForm.toDepartment 
                    ? INVENTORY_DEPARTMENTS[issueForm.toDepartment]?.name 
                    : 'Select department to charge'}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
              </Pressable>
              {showToDeptPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {availableToDepartments.map(dept => (
                    <Pressable
                      key={dept.code}
                      style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setIssueForm(prev => ({ ...prev, toDepartment: dept.code }));
                        setShowToDeptPicker(false);
                        Haptics.selectionAsync();
                      }}
                    >
                      <View style={styles.deptPickerRow}>
                        <View style={[styles.deptDot, { backgroundColor: dept.color }]} />
                        <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{dept.name}</Text>
                      </View>
                      {issueForm.toDepartment === dept.code && <Check size={18} color={colors.primary} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Charge Type</Text>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowChargeTypePicker(!showChargeTypePicker)}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {getChargeTypeLabel(issueForm.chargeType)}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
            {showChargeTypePicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(['consumable_issue', 'chargeback', 'interdepartmental'] as ChargeType[]).map(type => (
                  <Pressable
                    key={type}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setIssueForm(prev => ({ ...prev, chargeType: type }));
                      setShowChargeTypePicker(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <View style={styles.typePickerRow}>
                      <View style={[styles.typeDot, { backgroundColor: getChargeTypeColor(type) }]} />
                      <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{getChargeTypeLabel(type)}</Text>
                    </View>
                    {issueForm.chargeType === type && <Check size={18} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>
              Quantity * {issueForm.material && <Text style={{ color: colors.textSecondary }}>(Available: {issueForm.material.on_hand})</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textSecondary}
              value={issueForm.quantity}
              onChangeText={(text) => setIssueForm(prev => ({ ...prev, quantity: text }))}
              keyboardType="number-pad"
            />
          </View>

          {issueForm.material && issueForm.quantity && !isNaN(parseInt(issueForm.quantity, 10)) && (
            <View style={[styles.valuePreview, { backgroundColor: colors.success + '15' }]}>
              <DollarSign size={20} color={colors.success} />
              <Text style={[styles.valueText, { color: colors.success }]}>
                Charge Amount: ${(parseInt(issueForm.quantity, 10) * issueForm.material.unit_price).toFixed(2)}
              </Text>
            </View>
          )}

          {glPreview && (
            <View style={[styles.glPreviewCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.glPreviewTitle, { color: colors.text }]}>G/L Account Preview</Text>
              <View style={styles.glPreviewRow}>
                <View style={[styles.glPreviewEntry, { borderLeftColor: colors.error }]}>
                  <Text style={[styles.glPreviewLabel, { color: colors.error }]}>DR</Text>
                  <Text style={[styles.glPreviewAccount, { color: colors.text }]}>{glPreview.debitAccount}</Text>
                  <Text style={[styles.glPreviewName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {glPreview.debitName}
                  </Text>
                </View>
                <View style={[styles.glPreviewEntry, { borderLeftColor: colors.success }]}>
                  <Text style={[styles.glPreviewLabel, { color: colors.success }]}>CR</Text>
                  <Text style={[styles.glPreviewAccount, { color: colors.text }]}>{glPreview.creditAccount}</Text>
                  <Text style={[styles.glPreviewName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {glPreview.creditName}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Work Order (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="WO-XXXX-XXXX"
              placeholderTextColor={colors.textSecondary}
              value={issueForm.workOrderId}
              onChangeText={(text) => setIssueForm(prev => ({ ...prev, workOrderId: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Cost Center (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="CC-XXXX-XXX"
              placeholderTextColor={colors.textSecondary}
              value={issueForm.costCenter}
              onChangeText={(text) => setIssueForm(prev => ({ ...prev, costCenter: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Add notes or reason for issue..."
              placeholderTextColor={colors.textSecondary}
              value={issueForm.notes}
              onChangeText={(text) => setIssueForm(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (!issueForm.fromDepartment || !issueForm.toDepartment || !issueForm.material || !issueForm.quantity) && styles.submitButtonDisabled
            ]}
            onPress={handleCreateTransaction}
            disabled={!issueForm.fromDepartment || !issueForm.toDepartment || !issueForm.material || !issueForm.quantity}
          >
            <Send size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Create Charge Transaction</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderGLAccounts = () => (
    <ScrollView style={styles.glAccountsList} showsVerticalScrollIndicator={false}>
      {DEPARTMENT_GL_ACCOUNTS.map(acct => {
        const dept = INVENTORY_DEPARTMENTS[acct.departmentCode];
        return (
          <View key={acct.departmentCode} style={[styles.glAccountCard, { backgroundColor: colors.surface }]}>
            <View style={styles.glAccountHeader}>
              <View style={[styles.deptColorBar, { backgroundColor: dept?.color || colors.border }]} />
              <View>
                <Text style={[styles.glAccountDept, { color: colors.text }]}>{acct.departmentName}</Text>
                <Text style={[styles.glAccountCode, { color: colors.textSecondary }]}>Dept Code: {acct.departmentCode}</Text>
              </View>
            </View>
            <View style={styles.glAccountRows}>
              <View style={styles.glAccountRow}>
                <Text style={[styles.glAccountLabel, { color: colors.textSecondary }]}>Expense</Text>
                <View>
                  <Text style={[styles.glAccountNum, { color: colors.text }]}>{acct.expenseAccount}</Text>
                  <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{acct.expenseAccountName}</Text>
                </View>
              </View>
              <View style={styles.glAccountRow}>
                <Text style={[styles.glAccountLabel, { color: colors.textSecondary }]}>Inventory</Text>
                <View>
                  <Text style={[styles.glAccountNum, { color: colors.text }]}>{acct.inventoryAccount}</Text>
                  <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{acct.inventoryAccountName}</Text>
                </View>
              </View>
              <View style={styles.glAccountRow}>
                <Text style={[styles.glAccountLabel, { color: colors.textSecondary }]}>Chargeback</Text>
                <View>
                  <Text style={[styles.glAccountNum, { color: colors.text }]}>{acct.chargebackAccount}</Text>
                  <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{acct.chargebackAccountName}</Text>
                </View>
              </View>
              <View style={styles.glAccountRow}>
                <Text style={[styles.glAccountLabel, { color: colors.textSecondary }]}>Consumable</Text>
                <View>
                  <Text style={[styles.glAccountNum, { color: colors.text }]}>{acct.consumableAccount}</Text>
                  <Text style={[styles.glAccountName, { color: colors.textSecondary }]}>{acct.consumableAccountName}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
        <View style={styles.statCard}>
          <Clock size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.postedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posted</Text>
        </View>
        <View style={styles.statCard}>
          <Receipt size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>${(stats.monthlyTotal / 1000).toFixed(1)}k</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={20} color={colors.info} />
          <Text style={[styles.statValue, { color: colors.text }]}>${(stats.totalPosted / 1000).toFixed(1)}k</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions..."
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
            setShowIssueModal(true);
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
            {(['all', 'pending', 'approved', 'posted', 'rejected', 'reversed'] as FilterStatus[]).map(status => (
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
                  {status === 'all' ? 'All' : getChargeStatusLabel(status as ChargeTransactionStatus)}
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
                deptFilter === null && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => {
                setDeptFilter(null);
                Haptics.selectionAsync();
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: deptFilter === null ? '#FFFFFF' : colors.text }
              ]}>All Depts</Text>
            </Pressable>
            {Object.values(INVENTORY_DEPARTMENTS).map(dept => (
              <Pressable
                key={dept.code}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  deptFilter === dept.code && { backgroundColor: dept.color, borderColor: dept.color }
                ]}
                onPress={() => {
                  setDeptFilter(dept.code);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: deptFilter === dept.code ? '#FFFFFF' : colors.text }
                ]}>{dept.shortName}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.viewModeRow}>
        {(['transactions', 'gl_accounts'] as ViewMode[]).map(mode => (
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
              {mode === 'transactions' ? 'Transactions' : 'G/L Accounts'}
            </Text>
          </Pressable>
        ))}
      </View>

      {viewMode === 'transactions' ? (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={transactionsLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <CreditCard size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all' || deptFilter !== null
                  ? 'Try adjusting your filters'
                  : 'Issue your first consumable charge'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map(renderTransactionCard)
          )}
        </ScrollView>
      ) : (
        renderGLAccounts()
      )}

      {renderDetailModal()}
      {renderIssueModal()}
    </View>
  );
};

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
    textTransform: 'uppercase',
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
  transactionCard: {
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
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  chargeFlow: {
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
  deptChipLabel: {
    fontSize: 10,
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
  footerValue: {
    fontSize: 13,
    fontWeight: '600' as const,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  chargeVisual: {
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
  deptRole: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 4,
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
  glEntry: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  glLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  glAccount: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  glAccountName: {
    fontSize: 12,
    marginTop: 2,
  },
  glAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600' as const,
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
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  reverseButton: {
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
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  pickerDropdown: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
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
    gap: 10,
  },
  deptDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  materialPickerContent: {
    flex: 1,
  },
  classificationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  classificationText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  emptyPicker: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  textInput: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  glPreviewCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  glPreviewTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  glPreviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  glPreviewEntry: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  glPreviewLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  glPreviewAccount: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  glPreviewName: {
    fontSize: 11,
    marginTop: 2,
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
  glAccountsList: {
    flex: 1,
    padding: 16,
  },
  glAccountCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  glAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  glAccountDept: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  glAccountCode: {
    fontSize: 12,
    marginTop: 2,
  },
  glAccountRows: {
    gap: 8,
  },
  glAccountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  glAccountLabel: {
    fontSize: 12,
    width: 80,
  },
  glAccountNum: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'right',
  },
  glAccountNameRight: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
});

export default ConsumableCharging;
