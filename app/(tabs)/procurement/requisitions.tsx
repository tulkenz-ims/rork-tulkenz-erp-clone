import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  ArrowRight,
  X,
  ShoppingCart,
  Package,
  Truck,
  Plus,
  AlertTriangle,
  Link,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react-native';
import DatePickerModal from '@/components/DatePickerModal';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  usePurchaseRequisitionsQuery,
  useCreatePurchaseRequisition,
  useApproveRequisitionTier,
  useRejectRequisition,
  RequisitionLineItem,
} from '@/hooks/useSupabaseProcurement';
import { 
  PurchaseRequisition,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_COLORS,
  RequisitionStatus,
  PO_TYPE_LABELS,
  APPROVAL_TIER_THRESHOLDS,
  APPROVAL_TIER_LABELS,
  getRequiredApprovalTiers,
} from '@/types/procurement';

type StatusFilter = 'all' | RequisitionStatus;

const PO_TYPE_COLORS = {
  material: '#3B82F6',
  service: '#10B981',
  capex: '#F59E0B',
};

const PRIORITY_COLORS = {
  low: '#6B7280',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

interface CreateRequisitionForm {
  materialId: string;
  materialName: string;
  materialSku: string;
  quantity: string;
  unitPrice: string;
  vendor: string;
  justification: string;
  neededByDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  departmentCode: string;
  departmentName: string;
  referenceLink: string;
  attachments: string[];
}

export default function PurchaseRequisitionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    createPR?: string;
    createNew?: string;
    materialId?: string;
    materialName?: string;
    materialSku?: string;
    suggestedQty?: string;
    vendor?: string;
    unitPrice?: string;
    departmentCode?: string;
    departmentName?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRequisitionForm>({
    materialId: '',
    materialName: '',
    materialSku: '',
    quantity: '',
    unitPrice: '',
    vendor: '',
    justification: '',
    neededByDate: '',
    priority: 'normal',
    departmentCode: '',
    departmentName: '',
    referenceLink: '',
    attachments: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: requisitionsData, isLoading, refetch } = usePurchaseRequisitionsQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const createRequisitionMutation = useCreatePurchaseRequisition({
    onSuccess: () => {
      console.log('[Requisitions] Requisition created successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      Alert.alert('Success', 'Requisition created successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (openedFromTaskFeed) {
              setOpenedFromTaskFeed(false);
              router.back();
            }
          },
        },
      ]);
    },
    onError: (error) => {
      console.error('[Requisitions] Error creating requisition:', error);
      Alert.alert('Error', error.message || 'Failed to create requisition');
    },
  });

  const approveRequisitionTierMutation = useApproveRequisitionTier({
    onSuccess: (data) => {
      console.log('[Requisitions] Requisition tier approved, new status:', data.status);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDetailModal(false);
      if (data.status === 'ready_for_po') {
        Alert.alert('Success', 'All approvals complete. Requisition is ready for PO creation.');
      } else if (data.status === 'pending_tier3_approval') {
        Alert.alert('Success', 'Tier 2 approved. Requisition sent to Tier 3 (Owner/Executive) for final approval.');
      } else {
        Alert.alert('Success', 'Requisition approved');
      }
    },
    onError: (error) => {
      console.error('[Requisitions] Error approving requisition tier:', error);
      Alert.alert('Error', error.message || 'Failed to approve requisition');
    },
  });

  const rejectRequisitionMutation = useRejectRequisition({
    onSuccess: () => {
      console.log('[Requisitions] Requisition rejected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowDetailModal(false);
      Alert.alert('Rejected', 'Requisition has been rejected');
    },
    onError: (error) => {
      console.error('[Requisitions] Error rejecting requisition:', error);
      Alert.alert('Error', error.message || 'Failed to reject requisition');
    },
  });

  const refreshing = isLoading;

  const requisitions: PurchaseRequisition[] = useMemo(() => {
    if (!requisitionsData) return [];
    return requisitionsData.map((r) => ({
      requisition_id: r.id,
      requisition_number: r.requisition_number,
      source_request_id: r.source_request_id || undefined,
      source_request_number: r.source_request_number || undefined,
      created_by_id: r.created_by_id || '',
      created_by_name: r.created_by_name,
      department_id: r.department_id || '',
      department_name: r.department_name || 'Unknown',
      vendor_id: r.vendor_id || undefined,
      vendor_name: r.vendor_name || undefined,
      status: r.status as RequisitionStatus,
      priority: r.priority as 'low' | 'normal' | 'high' | 'urgent',
      requisition_type: r.requisition_type as 'material' | 'service' | 'capex',
      requested_date: r.requested_date || r.created_at,
      needed_by_date: r.needed_by_date || undefined,
      approved_date: r.approved_date || undefined,
      approved_by: r.approved_by || undefined,
      rejected_date: r.rejected_date || undefined,
      rejected_by: r.rejected_by || undefined,
      rejection_reason: r.rejection_reason || undefined,
      po_id: r.po_id || undefined,
      po_number: r.po_number || undefined,
      subtotal: r.subtotal,
      tax: r.tax,
      shipping: r.shipping,
      total: r.total,
      notes: r.notes || undefined,
      justification: r.justification || undefined,
      line_items: ((r.line_items || []) as unknown as Omit<RequisitionLineItem, 'requisition_id'>[]).map((li) => ({
        ...li,
        requisition_id: r.id,
      })),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }, [requisitionsData]);

  const paramsCreatePR = params.createPR;
  const paramsCreateNew = params.createNew;
  const paramsMaterialId = params.materialId;
  const paramsMaterialName = params.materialName;
  const paramsMaterialSku = params.materialSku;
  const paramsSuggestedQty = params.suggestedQty;
  const paramsUnitPrice = params.unitPrice;
  const paramsVendor = params.vendor;
  const paramsDepartmentCode = params.departmentCode;
  const paramsDepartmentName = params.departmentName;
  
  const [openedFromTaskFeed, setOpenedFromTaskFeed] = useState(false);

  React.useEffect(() => {
    if (paramsCreatePR === 'true' && paramsMaterialId) {
      console.log('[Requisitions] Opening create modal from low stock params');
      setCreateForm({
        materialId: paramsMaterialId || '',
        materialName: paramsMaterialName || '',
        materialSku: paramsMaterialSku || '',
        quantity: paramsSuggestedQty || '',
        unitPrice: paramsUnitPrice || '',
        vendor: paramsVendor || '',
        justification: 'Low stock replenishment',
        neededByDate: '',
        priority: 'high',
        departmentCode: '',
        departmentName: '',
        referenceLink: '',
        attachments: [],
      });
      setShowCreateModal(true);
    } else if (paramsCreateNew === 'true') {
      console.log('[Requisitions] Opening create modal from Task Feed with department:', paramsDepartmentName);
      setOpenedFromTaskFeed(true);
      setCreateForm({
        materialId: '',
        materialName: '',
        materialSku: '',
        quantity: '',
        unitPrice: '',
        vendor: '',
        justification: '',
        neededByDate: '',
        priority: 'normal',
        departmentCode: paramsDepartmentCode || '',
        departmentName: paramsDepartmentName || '',
        referenceLink: '',
        attachments: [],
      });
      setShowCreateModal(true);
    }
  }, [paramsCreatePR, paramsCreateNew, paramsMaterialId, paramsMaterialName, paramsMaterialSku, paramsSuggestedQty, paramsUnitPrice, paramsVendor, paramsDepartmentCode, paramsDepartmentName]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const metrics = useMemo(() => {
    const allRequisitions = requisitionsData || [];
    const pendingTier2 = allRequisitions.filter(r => r.status === 'pending_tier2_approval').length;
    const pendingTier3 = allRequisitions.filter(r => r.status === 'pending_tier3_approval').length;
    const readyForPO = allRequisitions.filter(r => r.status === 'ready_for_po').length;
    const convertedToPO = allRequisitions.filter(r => r.status === 'converted_to_po').length;
    
    return { pendingTier2, pendingTier3, readyForPO, convertedToPO };
  }, [requisitionsData]);

  const filteredRequisitions = useMemo(() => {
    let filtered = [...requisitions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.requisition_number.toLowerCase().includes(query) ||
        r.created_by_name.toLowerCase().includes(query) ||
        r.department_name.toLowerCase().includes(query) ||
        r.vendor_name?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
    );
  }, [requisitions, searchQuery]);

  const handleViewRequisition = (requisition: PurchaseRequisition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRequisition(requisition);
    setShowDetailModal(true);
  };

  const handleApproveTier = (requisition: PurchaseRequisition, tier: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tierName = APPROVAL_TIER_LABELS[tier];
    const nextTierInfo = tier === 2 && requisition.total >= APPROVAL_TIER_THRESHOLDS.TIER_3
      ? '\n\nNote: This will advance to Tier 3 (Owner/Executive) approval.'
      : tier === 2 
        ? '\n\nNote: This will complete all approvals and make the requisition ready for PO creation.'
        : '\n\nNote: This will complete all approvals and make the requisition ready for PO creation.';
    
    Alert.alert(
      `Approve as ${tierName}`,
      `Approve ${requisition.requisition_number} as ${tierName}?${nextTierInfo}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: () => {
            console.log('[Requisitions] Approving requisition tier:', tier, 'for:', requisition.requisition_id);
            const approverName = user ? `${user.first_name} ${user.last_name}` : 'Unknown';
            approveRequisitionTierMutation.mutate({
              requisitionId: requisition.requisition_id,
              tier,
              approvedBy: approverName,
              approvedById: user?.id,
            });
          }
        },
      ]
    );
  };

  const handleReject = (requisition: PurchaseRequisition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Reject Requisition',
      `Reject ${requisition.requisition_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            console.log('[Requisitions] Rejecting requisition:', requisition.requisition_id);
            const rejectorName = user ? `${user.first_name} ${user.last_name}` : 'Unknown';
            rejectRequisitionMutation.mutate({
              requisitionId: requisition.requisition_id,
              rejectedBy: rejectorName,
            });
          }
        },
      ]
    );
  };

  const handleConvertToPO = (requisition: PurchaseRequisition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDetailModal(false);
    
    const lineItemsJson = encodeURIComponent(JSON.stringify(requisition.line_items));
    const params = new URLSearchParams({
      fromRequisition: 'true',
      requisitionId: requisition.requisition_id,
      requisitionNumber: requisition.requisition_number,
      vendorId: requisition.vendor_id || '',
      vendorName: requisition.vendor_name || '',
      departmentId: requisition.department_id || '',
      departmentName: requisition.department_name || '',
      subtotal: requisition.subtotal.toString(),
      neededByDate: requisition.needed_by_date || '',
      notes: requisition.notes || requisition.justification || '',
      lineItems: lineItemsJson,
    });
    
    if (requisition.requisition_type === 'material') {
      router.push(`/procurement/pocreate-material?${params.toString()}` as any);
    } else if (requisition.requisition_type === 'service') {
      router.push(`/procurement/pocreate-service?${params.toString()}` as any);
    } else {
      router.push(`/procurement/pocreate-capex?${params.toString()}` as any);
    }
  };

  const handleCreateRequisition = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreateForm({
      materialId: '',
      materialName: '',
      materialSku: '',
      quantity: '',
      unitPrice: '',
      vendor: '',
      justification: '',
      neededByDate: '',
      priority: 'normal',
      departmentCode: '',
      departmentName: '',
      referenceLink: '',
      attachments: [],
    });
    setShowCreateModal(true);
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUris = result.assets.map(asset => asset.uri);
        setCreateForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...newUris],
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[Requisitions] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setCreateForm(prev => ({
          ...prev,
          attachments: [...prev.attachments, result.assets[0].uri],
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[Requisitions] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreateForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  }, []);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSubmitNewRequisition = useCallback(() => {
    if (!createForm.materialName.trim() || !createForm.quantity.trim()) {
      Alert.alert('Required Fields', 'Please enter material name and quantity.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a requisition.');
      return;
    }

    const qty = parseFloat(createForm.quantity);
    const price = parseFloat(createForm.unitPrice) || 0;
    const lineTotal = qty * price;

    const lineItem: RequisitionLineItem = {
      line_id: `line-${Date.now()}`,
      line_number: 1,
      material_id: createForm.materialId || undefined,
      material_sku: createForm.materialSku || undefined,
      description: createForm.materialName,
      quantity: qty,
      unit_price: price,
      line_total: lineTotal,
      is_stock: !!createForm.materialId,
    };

    console.log('[Requisitions] Creating new requisition:', {
      material: createForm.materialName,
      quantity: qty,
      total: lineTotal,
      vendor: createForm.vendor,
      priority: createForm.priority,
    });

    createRequisitionMutation.mutate({
      created_by_id: user.id,
      created_by_name: `${user.first_name} ${user.last_name}`,
      department_id: createForm.departmentCode || undefined,
      department_name: createForm.departmentName || undefined,
      vendor_name: createForm.vendor || undefined,
      priority: createForm.priority,
      requisition_type: 'material',
      needed_by_date: createForm.neededByDate || undefined,
      subtotal: lineTotal,
      tax: 0,
      shipping: 0,
      justification: createForm.justification || undefined,
      line_items: [lineItem],
    });
  }, [createForm, user, createRequisitionMutation]);

  const renderStatusBadge = (status: RequisitionStatus) => {
    const color = REQUISITION_STATUS_COLORS[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.statusBadgeText, { color }]}>
          {REQUISITION_STATUS_LABELS[status]}
        </Text>
      </View>
    );
  };

  const renderTypeBadge = (type: 'material' | 'service' | 'capex') => {
    const color = PO_TYPE_COLORS[type];
    return (
      <View style={[styles.typeBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.typeBadgeText, { color }]}>
          {PO_TYPE_LABELS[type]}
        </Text>
      </View>
    );
  };

  const renderPriorityBadge = (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    const color = PRIORITY_COLORS[priority];
    return (
      <View style={[styles.priorityBadge, { backgroundColor: `${color}15`, borderColor: color }]}>
        <Text style={[styles.priorityBadgeText, { color }]}>
          {PRIORITY_LABELS[priority]}
        </Text>
      </View>
    );
  };

  const renderMetricCard = (label: string, value: number, color: string, icon: React.ReactNode) => (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderStatusFilter = (status: StatusFilter, label: string) => {
    const isActive = statusFilter === status;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setStatusFilter(status);
        }}
      >
        <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.text }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRequisitionCard = (requisition: PurchaseRequisition) => {
    return (
      <TouchableOpacity
        key={requisition.requisition_id}
        style={[styles.requisitionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewRequisition(requisition)}
        activeOpacity={0.7}
      >
        <View style={styles.requisitionHeader}>
          <View style={styles.requisitionTitleRow}>
            <Text style={[styles.requisitionNumber, { color: colors.text }]}>
              {requisition.requisition_number}
            </Text>
            {renderTypeBadge(requisition.requisition_type)}
            {renderPriorityBadge(requisition.priority)}
          </View>
          {renderStatusBadge(requisition.status)}
        </View>

        <View style={styles.requisitionDetails}>
          {requisition.vendor_name && (
            <View style={styles.requisitionDetailRow}>
              <Truck size={14} color={colors.textSecondary} />
              <Text style={[styles.requisitionDetailText, { color: colors.textSecondary }]}>
                {requisition.vendor_name}
              </Text>
            </View>
          )}
          <View style={styles.requisitionDetailRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.requisitionDetailText, { color: colors.textSecondary }]}>
              {requisition.department_name}
            </Text>
          </View>
          <View style={styles.requisitionDetailRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.requisitionDetailText, { color: colors.textSecondary }]}>
              {requisition.created_by_name}
            </Text>
          </View>
          {requisition.needed_by_date && (
            <View style={styles.requisitionDetailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.requisitionDetailText, { color: colors.textSecondary }]}>
                Needed by {formatDate(requisition.needed_by_date)}
              </Text>
            </View>
          )}
        </View>

        {requisition.source_request_number && (
          <View style={[styles.sourceBadge, { backgroundColor: '#3B82F615' }]}>
            <FileText size={12} color="#3B82F6" />
            <Text style={[styles.sourceBadgeText, { color: '#3B82F6' }]}>
              From: {requisition.source_request_number}
            </Text>
          </View>
        )}

        <View style={styles.requisitionFooter}>
          <View style={styles.requisitionFooterLeft}>
            <Text style={[styles.requisitionTotal, { color: colors.text }]}>
              {formatCurrency(requisition.total)}
            </Text>
            <Text style={[styles.requisitionLineCount, { color: colors.textTertiary }]}>
              {requisition.line_items.length} item{requisition.line_items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.requisitionFooterRight}>
            <Text style={[styles.requisitionDate, { color: colors.textTertiary }]}>
              {formatDate(requisition.requested_date)}
            </Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        </View>

        {requisition.status === 'converted_to_po' && requisition.po_number && (
          <View style={[styles.linkedBadge, { backgroundColor: '#10B98115' }]}>
            <ArrowRight size={12} color="#10B981" />
            <Text style={[styles.linkedBadgeText, { color: '#10B981' }]}>
              {requisition.po_number}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRequisition) return null;

    const requiredTiers = getRequiredApprovalTiers(selectedRequisition.total);
    const isPendingTier2 = selectedRequisition.status === 'pending_tier2_approval';
    const isPendingTier3 = selectedRequisition.status === 'pending_tier3_approval';
    const canConvert = selectedRequisition.status === 'ready_for_po';
    const isRejected = selectedRequisition.status === 'rejected';
    const isConverted = selectedRequisition.status === 'converted_to_po';
    
    const getApprovalInfo = () => {
      if (selectedRequisition.total < APPROVAL_TIER_THRESHOLDS.TIER_2) {
        return { message: 'No additional approval required', color: '#10B981' };
      } else if (selectedRequisition.total >= APPROVAL_TIER_THRESHOLDS.TIER_3) {
        return { message: 'Requires Tier 2 (Plant Manager) + Tier 3 (Owner) approval', color: '#8B5CF6' };
      } else {
        return { message: 'Requires Tier 2 (Plant Manager) approval', color: '#F59E0B' };
      }
    };
    const approvalInfo = getApprovalInfo();

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Requisition Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailNumber, { color: colors.text }]}>
                  {selectedRequisition.requisition_number}
                </Text>
                <View style={styles.detailBadges}>
                  {renderStatusBadge(selectedRequisition.status)}
                  {renderTypeBadge(selectedRequisition.requisition_type)}
                  {renderPriorityBadge(selectedRequisition.priority)}
                </View>
              </View>

              {selectedRequisition.source_request_number && (
                <View style={[styles.sourceInfo, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <FileText size={16} color="#3B82F6" />
                  <View style={styles.sourceInfoText}>
                    <Text style={[styles.sourceInfoLabel, { color: colors.textSecondary }]}>
                      Created from Request
                    </Text>
                    <Text style={[styles.sourceInfoValue, { color: colors.text }]}>
                      {selectedRequisition.source_request_number}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  Requisition Information
                </Text>
                <View style={styles.detailRow}>
                  <User size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created By:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedRequisition.created_by_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedRequisition.department_name}
                  </Text>
                </View>
                {selectedRequisition.vendor_name && (
                  <View style={styles.detailRow}>
                    <Truck size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vendor:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedRequisition.vendor_name}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  Dates & Amounts
                </Text>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedRequisition.requested_date)}
                  </Text>
                </View>
                {selectedRequisition.needed_by_date && (
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Needed By:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedRequisition.needed_by_date)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <DollarSign size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total:</Text>
                  <Text style={[styles.detailValue, { color: colors.text, fontWeight: '600' }]}>
                    {formatCurrency(selectedRequisition.total)}
                  </Text>
                </View>
              </View>

              {selectedRequisition.justification && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Justification</Text>
                  <Text style={[styles.detailNotes, { color: colors.text }]}>
                    {selectedRequisition.justification}
                  </Text>
                </View>
              )}

              {selectedRequisition.notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[styles.detailNotes, { color: colors.text }]}>
                    {selectedRequisition.notes}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.lineItemsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.lineItemsTitle, { color: colors.text }]}>
                Line Items ({selectedRequisition.line_items.length})
              </Text>
              {selectedRequisition.line_items.map((item, index) => (
                <View
                  key={item.line_id}
                  style={[
                    styles.lineItem,
                    { borderTopColor: colors.border },
                    index === 0 && { borderTopWidth: 0 },
                  ]}
                >
                  <View style={styles.lineItemHeader}>
                    <Text style={[styles.lineItemNumber, { color: colors.textSecondary }]}>
                      #{item.line_number}
                    </Text>
                    {item.is_stock && (
                      <View style={[styles.stockBadge, { backgroundColor: '#10B98115' }]}>
                        <Text style={[styles.stockBadgeText, { color: '#10B981' }]}>Stock</Text>
                      </View>
                    )}
                    {item.uom && (
                      <Text style={[styles.lineItemUom, { color: colors.textTertiary }]}>
                        {item.uom}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.lineItemDescription, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  {item.material_sku && (
                    <Text style={[styles.lineItemSku, { color: colors.textTertiary }]}>
                      SKU: {item.material_sku}
                    </Text>
                  )}
                  <View style={styles.lineItemDetails}>
                    <Text style={[styles.lineItemQty, { color: colors.textSecondary }]}>
                      Qty: {item.quantity}
                    </Text>
                    <Text style={[styles.lineItemPrice, { color: colors.textSecondary }]}>
                      @ {formatCurrency(item.unit_price)}
                    </Text>
                    <Text style={[styles.lineItemTotal, { color: colors.text }]}>
                      {formatCurrency(item.line_total)}
                    </Text>
                  </View>
                  {item.gl_account && (
                    <Text style={[styles.lineItemGl, { color: colors.textTertiary }]}>
                      GL: {item.gl_account} • {item.cost_center}
                    </Text>
                  )}
                </View>
              ))}

              <View style={[styles.totalsSection, { borderTopColor: colors.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>
                    {formatCurrency(selectedRequisition.subtotal)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tax</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>
                    {formatCurrency(selectedRequisition.tax)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Shipping</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>
                    {formatCurrency(selectedRequisition.shipping)}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
                    {formatCurrency(selectedRequisition.total)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Approval Status Info */}
            <View style={[styles.approvalInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.approvalInfoTitle, { color: colors.text }]}>Approval Requirements</Text>
              <View style={[styles.approvalInfoBanner, { backgroundColor: `${approvalInfo.color}15` }]}>
                <AlertTriangle size={16} color={approvalInfo.color} />
                <Text style={[styles.approvalInfoText, { color: approvalInfo.color }]}>
                  {approvalInfo.message}
                </Text>
              </View>
              
              {requiredTiers.length > 0 && (
                <View style={styles.tierProgressContainer}>
                  <Text style={[styles.tierProgressLabel, { color: colors.textSecondary }]}>Approval Progress</Text>
                  {requiredTiers.map((tier) => {
                    const isApproved = 
                      (tier === 2 && (selectedRequisition.status === 'pending_tier3_approval' || selectedRequisition.status === 'ready_for_po' || selectedRequisition.status === 'converted_to_po')) ||
                      (tier === 3 && (selectedRequisition.status === 'ready_for_po' || selectedRequisition.status === 'converted_to_po'));
                    const isPending = 
                      (tier === 2 && selectedRequisition.status === 'pending_tier2_approval') ||
                      (tier === 3 && selectedRequisition.status === 'pending_tier3_approval');
                    const tierColor = isApproved ? '#10B981' : isPending ? '#F59E0B' : colors.textTertiary;
                    
                    return (
                      <View key={tier} style={styles.tierProgressItem}>
                        <View style={[styles.tierProgressIcon, { backgroundColor: `${tierColor}20` }]}>
                          {isApproved ? (
                            <CheckCircle size={14} color={tierColor} />
                          ) : isPending ? (
                            <Clock size={14} color={tierColor} />
                          ) : (
                            <Clock size={14} color={tierColor} />
                          )}
                        </View>
                        <View style={styles.tierProgressText}>
                          <Text style={[styles.tierName, { color: colors.text }]}>
                            Tier {tier}: {APPROVAL_TIER_LABELS[tier]}
                          </Text>
                          <Text style={[styles.tierStatus, { color: tierColor }]}>
                            {isApproved ? 'Approved' : isPending ? 'Pending Approval' : 'Waiting'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              {isPendingTier2 && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(selectedRequisition)}
                    disabled={rejectRequisitionMutation.isPending}
                  >
                    {rejectRequisitionMutation.isPending ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <XCircle size={18} color="#EF4444" />
                    )}
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApproveTier(selectedRequisition, 2)}
                    disabled={approveRequisitionTierMutation.isPending}
                  >
                    {approveRequisitionTierMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CheckCircle size={18} color="#fff" />
                    )}
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>Approve (Tier 2)</Text>
                  </TouchableOpacity>
                </>
              )}
              {isPendingTier3 && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(selectedRequisition)}
                    disabled={rejectRequisitionMutation.isPending}
                  >
                    {rejectRequisitionMutation.isPending ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <XCircle size={18} color="#EF4444" />
                    )}
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleApproveTier(selectedRequisition, 3)}
                    disabled={approveRequisitionTierMutation.isPending}
                  >
                    {approveRequisitionTierMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CheckCircle size={18} color="#fff" />
                    )}
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>Approve (Tier 3)</Text>
                  </TouchableOpacity>
                </>
              )}
              {canConvert && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.convertButton]}
                  onPress={() => handleConvertToPO(selectedRequisition)}
                >
                  <ShoppingCart size={18} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Create Purchase Order</Text>
                </TouchableOpacity>
              )}
              {(isRejected || isConverted) && (
                <View style={[styles.statusInfoBanner, { backgroundColor: isRejected ? '#FEE2E2' : '#DBEAFE' }]}>
                  <Text style={[styles.statusInfoText, { color: isRejected ? '#EF4444' : '#3B82F6' }]}>
                    {isRejected ? 'This requisition has been rejected' : `Converted to PO: ${selectedRequisition.po_number}`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Purchase Requisitions',
          headerRight: () => (
            <TouchableOpacity onPress={handleCreateRequisition} style={styles.headerAddButton}>
              <Plus size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.metricsRow}>
          {renderMetricCard('Tier 2', metrics.pendingTier2, '#F59E0B', <Clock size={16} color="#F59E0B" />)}
          {renderMetricCard('Tier 3', metrics.pendingTier3, '#8B5CF6', <Clock size={16} color="#8B5CF6" />)}
          {renderMetricCard('Ready', metrics.readyForPO, '#10B981', <CheckCircle size={16} color="#10B981" />)}
          {renderMetricCard('Converted', metrics.convertedToPO, '#3B82F6', <Package size={16} color="#3B82F6" />)}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search requisitions..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {renderStatusFilter('all', 'All')}
          {renderStatusFilter('pending_tier2_approval', 'Pending Tier 2')}
          {renderStatusFilter('pending_tier3_approval', 'Pending Tier 3')}
          {renderStatusFilter('ready_for_po', 'Ready for PO')}
          {renderStatusFilter('converted_to_po', 'Converted')}
          {renderStatusFilter('rejected', 'Rejected')}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredRequisitions.length} requisition{filteredRequisitions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.requisitionsList}>
          {filteredRequisitions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileText size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requisitions Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search or filters' : 'No purchase requisitions to display'}
              </Text>
            </View>
          ) : (
            filteredRequisitions.map(renderRequisitionCard)
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
      {renderCreateModal()}
    </View>
  );

  function renderCreateModal() {
    const lineTotal = (parseFloat(createForm.quantity) || 0) * (parseFloat(createForm.unitPrice) || 0);

    return (
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => {
              setShowCreateModal(false);
              if (openedFromTaskFeed) {
                setOpenedFromTaskFeed(false);
                router.back();
              }
            }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Purchase Requisition</Text>
            <TouchableOpacity onPress={handleSubmitNewRequisition}>
              <CheckCircle size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {createForm.materialId && (
              <View style={[styles.prefillBanner, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
                <AlertTriangle size={16} color="#3B82F6" />
                <Text style={[styles.prefillText, { color: '#3B82F6' }]}>
                  Pre-filled from low stock alert
                </Text>
              </View>
            )}

            {createForm.departmentName && !createForm.materialId && (
              <View style={[styles.prefillBanner, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
                <Building2 size={16} color="#8B5CF6" />
                <Text style={[styles.prefillText, { color: '#8B5CF6' }]}>
                  Purchase request for {createForm.departmentName}
                </Text>
              </View>
            )}

            <View style={[styles.createFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.createFormSectionTitle, { color: colors.text }]}>Item Information</Text>
              
              <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Material/Item Name *</Text>
              <TextInput
                style={[styles.createFormInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                value={createForm.materialName}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, materialName: text }))}
                placeholder="Enter material or item name"
                placeholderTextColor={colors.textTertiary}
              />

              {createForm.materialSku ? (
                <View style={styles.createFormRow}>
                  <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>SKU</Text>
                  <Text style={[styles.createFormValue, { color: colors.text }]}>{createForm.materialSku}</Text>
                </View>
              ) : null}

              <View style={styles.createFormRowInputs}>
                <View style={styles.createFormHalf}>
                  <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Quantity *</Text>
                  <TextInput
                    style={[styles.createFormInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={createForm.quantity}
                    onChangeText={(text) => setCreateForm(prev => ({ ...prev, quantity: text }))}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.createFormHalf}>
                  <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Unit Price ($)</Text>
                  <TextInput
                    style={[styles.createFormInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                    value={createForm.unitPrice}
                    onChangeText={(text) => setCreateForm(prev => ({ ...prev, unitPrice: text }))}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {lineTotal > 0 && (
                <View style={[styles.lineTotalBanner, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.lineTotalLabel, { color: colors.textSecondary }]}>Line Total</Text>
                  <Text style={[styles.lineTotalValue, { color: colors.primary }]}>{formatCurrency(lineTotal)}</Text>
                </View>
              )}
            </View>

            <View style={[styles.createFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.createFormSectionTitle, { color: colors.text }]}>Vendor & Priority</Text>
              
              <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Preferred Vendor</Text>
              <TextInput
                style={[styles.createFormInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                value={createForm.vendor}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, vendor: text }))}
                placeholder="Enter vendor name"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Priority</Text>
              <View style={styles.prioritySelector}>
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: createForm.priority === p ? PRIORITY_COLORS[p] + '20' : colors.backgroundSecondary,
                        borderColor: createForm.priority === p ? PRIORITY_COLORS[p] : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCreateForm(prev => ({ ...prev, priority: p }));
                    }}
                  >
                    <Text style={[styles.priorityOptionText, { color: createForm.priority === p ? PRIORITY_COLORS[p] : colors.text }]}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.createFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.createFormSectionTitle, { color: colors.text }]}>Date Needed</Text>
              
              <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Needed By Date</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={18} color={colors.textSecondary} />
                <Text style={[styles.datePickerText, { color: createForm.neededByDate ? colors.text : colors.textTertiary }]}>
                  {createForm.neededByDate ? formatDisplayDate(createForm.neededByDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.createFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.createFormSectionTitle, { color: colors.text }]}>Justification</Text>
              
              <TextInput
                style={[styles.createFormInput, styles.createFormTextArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                value={createForm.justification}
                onChangeText={(text) => setCreateForm(prev => ({ ...prev, justification: text }))}
                placeholder="Enter reason for this purchase request"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={[styles.createFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.createFormSectionTitle, { color: colors.text }]}>Reference & Attachments</Text>
              
              <Text style={[styles.createFormLabel, { color: colors.textSecondary }]}>Reference Link (Product URL, Spec Sheet, etc.)</Text>
              <View style={[styles.linkInputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Link size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.linkInput, { color: colors.text }]}
                  value={createForm.referenceLink}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, referenceLink: text }))}
                  placeholder="https://example.com/product"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.createFormLabel, { color: colors.textSecondary, marginTop: 12 }]}>Photos/Attachments</Text>
              <View style={styles.attachmentButtons}>
                <TouchableOpacity
                  style={[styles.attachmentButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={20} color={colors.primary} />
                  <Text style={[styles.attachmentButtonText, { color: colors.text }]}>Gallery</Text>
                </TouchableOpacity>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[styles.attachmentButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={handleTakePhoto}
                  >
                    <Camera size={20} color={colors.primary} />
                    <Text style={[styles.attachmentButtonText, { color: colors.text }]}>Camera</Text>
                  </TouchableOpacity>
                )}
              </View>

              {createForm.attachments.length > 0 && (
                <View style={styles.attachmentsPreview}>
                  {createForm.attachments.map((uri, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <Image source={{ uri }} style={styles.attachmentImage} />
                      <TouchableOpacity
                        style={[styles.removeAttachmentButton, { backgroundColor: colors.error }]}
                        onPress={() => handleRemoveAttachment(index)}
                      >
                        <Trash2 size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitRequisitionButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmitNewRequisition}
              disabled={createRequisitionMutation.isPending}
            >
              {createRequisitionMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Plus size={20} color="#fff" />
              )}
              <Text style={styles.submitRequisitionButtonText}>
                {createRequisitionMutation.isPending ? 'Creating...' : 'Create Requisition'}
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <DatePickerModal
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onSelect={(date) => {
              setCreateForm(prev => ({ ...prev, neededByDate: date }));
              setShowDatePicker(false);
            }}
            selectedDate={createForm.neededByDate}
            minDate={new Date().toISOString().split('T')[0]}
            title="Select Needed By Date"
          />
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filtersScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
  },
  requisitionsList: {
    gap: 12,
  },
  requisitionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  requisitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requisitionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  requisitionNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requisitionDetails: {
    gap: 6,
    marginBottom: 8,
  },
  requisitionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requisitionDetailText: {
    fontSize: 13,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  requisitionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  requisitionFooterLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  requisitionTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  requisitionLineCount: {
    fontSize: 12,
  },
  requisitionFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requisitionDate: {
    fontSize: 12,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
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
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    marginBottom: 16,
  },
  detailNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  sourceInfoText: {
    flex: 1,
  },
  sourceInfoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  sourceInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  detailNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  lineItemsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  lineItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  lineItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  lineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lineItemNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lineItemUom: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  lineItemSku: {
    fontSize: 12,
    marginBottom: 6,
  },
  lineItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineItemQty: {
    fontSize: 13,
  },
  lineItemPrice: {
    fontSize: 13,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  lineItemGl: {
    fontSize: 11,
    marginTop: 4,
  },
  totalsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 13,
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  convertButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  headerAddButton: {
    paddingHorizontal: 8,
  },
  prefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  prefillText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  createFormSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  createFormSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  createFormLabel: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  createFormInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  createFormTextArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  createFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  createFormValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  createFormRowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  createFormHalf: {
    flex: 1,
  },
  lineTotalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  lineTotalLabel: {
    fontSize: 13,
  },
  lineTotalValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  submitRequisitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  submitRequisitionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  datePickerText: {
    fontSize: 15,
    flex: 1,
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  linkInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  attachmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalInfoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  approvalInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  approvalInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  approvalInfoText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  tierProgressContainer: {
    gap: 8,
  },
  tierProgressLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  tierProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  tierProgressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierProgressText: {
    flex: 1,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  tierStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  statusInfoBanner: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfoText: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
});
