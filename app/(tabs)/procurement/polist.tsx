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
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Search,
  X,
  Filter,
  Calendar,
  Building2,
  Users,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  Truck,
  AlertCircle,
  Link2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementPurchaseOrdersQuery, useOrderPurchaseOrder, POLineItem } from '@/hooks/useSupabaseProcurement';
import {
  POType,
  POStatus,
  PO_TYPE_LABELS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
} from '@/types/procurement';

interface MappedPurchaseOrder {
  po_id: string;
  po_number: string;
  po_type: POType;
  vendor_id: string | null;
  vendor_name: string;
  department_id: string | null;
  department_name: string | null;
  status: POStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  created_date: string;
  created_by: string;
  submitted_date?: string | null;
  approved_date?: string | null;
  approved_by?: string | null;
  expected_delivery?: string | null;
  received_date?: string | null;
  notes?: string | null;
  line_items: POLineItem[];
  source_requisition_id?: string | null;
  source_requisition_number?: string | null;
}

type FilterType = 'all' | POType;
type FilterStatus = 'all' | POStatus;

const PO_TYPE_COLORS: Record<POType, string> = {
  material: '#3B82F6',
  service: '#10B981',
  capex: '#F59E0B',
};

const DEPARTMENTS = [
  { id: 'all', name: 'All Departments' },
  { id: '1001', name: 'Maintenance' },
  { id: '1002', name: 'Sanitation' },
  { id: '1004', name: 'Quality' },
  { id: '1005', name: 'Safety' },
  { id: '1006', name: 'IT' },
];

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial_received', label: 'Partial Received' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS: { value: FilterType; label: string; color: string }[] = [
  { value: 'all', label: 'All Types', color: '#6B7280' },
  { value: 'material', label: 'Material', color: '#3B82F6' },
  { value: 'service', label: 'Service', color: '#10B981' },
  { value: 'capex', label: 'CapEx', color: '#F59E0B' },
];

export default function POListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPO, setSelectedPO] = useState<MappedPurchaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const orderPOMutation = useOrderPurchaseOrder({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDetailModal(false);
      setIsProcessing(false);
      refetch();
    },
    onError: (error) => {
      console.error('[POListScreen] Error marking as ordered:', error);
      setIsProcessing(false);
    },
  });

  const {
    data: purchaseOrdersData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useProcurementPurchaseOrdersQuery({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    poType: filterType !== 'all' ? filterType : undefined,
    searchText: searchQuery || undefined,
  });

  const purchaseOrders: MappedPurchaseOrder[] = useMemo(() => {
    if (!purchaseOrdersData) return [];
    return purchaseOrdersData.map((po) => ({
      po_id: po.id,
      po_number: po.po_number,
      po_type: po.po_type as POType,
      vendor_id: po.vendor_id,
      vendor_name: po.vendor_name,
      department_id: po.department_id,
      department_name: po.department_name,
      status: po.status as POStatus,
      subtotal: po.subtotal,
      tax: po.tax,
      shipping: po.shipping,
      total: po.total,
      created_date: po.created_at,
      created_by: po.created_by,
      submitted_date: po.submitted_date,
      approved_date: po.approved_date,
      approved_by: po.approved_by,
      expected_delivery: po.expected_delivery,
      received_date: po.received_date,
      notes: po.notes,
      line_items: (po.line_items || []) as unknown as POLineItem[],
      source_requisition_id: (po as any).source_requisition_id,
      source_requisition_number: (po as any).source_requisition_number,
    }));
  }, [purchaseOrdersData]);

  const onRefresh = useCallback(() => {
    console.log('[POListScreen] Refreshing purchase orders...');
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

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesDepartment = filterDepartment === 'all' || po.department_id === filterDepartment;
      return matchesDepartment;
    }).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  }, [purchaseOrders, filterDepartment]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterDepartment !== 'all') count++;
    return count;
  }, [filterType, filterStatus, filterDepartment]);

  const handleViewPO = (po: MappedPurchaseOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPO(po);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    Haptics.selectionAsync();
    setFilterType('all');
    setFilterStatus('all');
    setFilterDepartment('all');
  };

  const renderTypeChip = (option: { value: FilterType; label: string; color: string }) => {
    const isSelected = filterType === option.value;
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected ? option.color : colors.surface,
            borderColor: isSelected ? option.color : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setFilterType(option.value);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: isSelected ? '#fff' : colors.textSecondary },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStatusOption = (option: { value: FilterStatus; label: string }) => {
    const isSelected = filterStatus === option.value;
    const statusColor = option.value !== 'all' ? PO_STATUS_COLORS[option.value as POStatus] : colors.primary;
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.statusOption,
          {
            backgroundColor: isSelected ? `${statusColor}15` : 'transparent',
            borderColor: isSelected ? statusColor : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setFilterStatus(option.value);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.statusOptionText,
            { color: isSelected ? statusColor : colors.textSecondary },
          ]}
        >
          {option.label}
        </Text>
        {isSelected && <CheckCircle size={14} color={statusColor} />}
      </TouchableOpacity>
    );
  };

  const renderDepartmentOption = (dept: { id: string; name: string }) => {
    const isSelected = filterDepartment === dept.id;
    
    return (
      <TouchableOpacity
        key={dept.id}
        style={[
          styles.statusOption,
          {
            backgroundColor: isSelected ? `${colors.primary}15` : 'transparent',
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setFilterDepartment(dept.id);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.statusOptionText,
            { color: isSelected ? colors.primary : colors.textSecondary },
          ]}
        >
          {dept.name}
        </Text>
        {isSelected && <CheckCircle size={14} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  const renderPOCard = (po: MappedPurchaseOrder) => {
    const typeColor = PO_TYPE_COLORS[po.po_type];
    const statusColor = PO_STATUS_COLORS[po.status];

    return (
      <TouchableOpacity
        key={po.po_id}
        style={[styles.poCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewPO(po)}
        activeOpacity={0.7}
      >
        <View style={styles.poHeader}>
          <View style={styles.poTitleSection}>
            <View style={styles.poNumberRow}>
              <Text style={[styles.poNumber, { color: colors.text }]}>{po.po_number}</Text>
              <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {PO_TYPE_LABELS[po.po_type]}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {PO_STATUS_LABELS[po.status]}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.poBody}>
          <View style={styles.poInfoRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.poInfoText, { color: colors.text }]} numberOfLines={1}>
              {po.vendor_name}
            </Text>
          </View>
          {po.department_name && (
            <View style={styles.poInfoRow}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={[styles.poInfoText, { color: colors.textSecondary }]}>
                {po.department_name}
              </Text>
            </View>
          )}
          <View style={styles.poInfoRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.poInfoText, { color: colors.textSecondary }]}>
              Created: {formatDate(po.created_date)}
            </Text>
          </View>
          {po.expected_delivery && (
            <View style={styles.poInfoRow}>
              <Truck size={14} color={colors.textSecondary} />
              <Text style={[styles.poInfoText, { color: colors.textSecondary }]}>
                Expected: {formatDate(po.expected_delivery)}
              </Text>
            </View>
          )}
          {po.source_requisition_number && (
            <View style={styles.poInfoRow}>
              <Link2 size={14} color="#8B5CF6" />
              <Text style={[styles.poInfoText, { color: '#8B5CF6' }]}>
                From: {po.source_requisition_number}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.poFooter, { borderTopColor: colors.border }]}>
          <View style={styles.poFooterLeft}>
            <Text style={[styles.lineItemsCount, { color: colors.textSecondary }]}>
              {po.line_items.length} item{po.line_items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.poFooterRight}>
            <Text style={[styles.poTotal, { color: colors.text }]}>
              {formatCurrency(po.total)}
            </Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPO) return null;

    const typeColor = PO_TYPE_COLORS[selectedPO.po_type];
    const statusColor = PO_STATUS_COLORS[selectedPO.status];

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>PO Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={[styles.detailPONumber, { color: colors.text }]}>
                    {selectedPO.po_number}
                  </Text>
                  <View style={styles.detailBadges}>
                    <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                        {PO_TYPE_LABELS[selectedPO.po_type]}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {PO_STATUS_LABELS[selectedPO.status]}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.detailTotal, { color: colors.primary }]}>
                  {formatCurrency(selectedPO.total)}
                </Text>
              </View>

              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Vendor</Text>
                <View style={styles.detailRow}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPO.vendor_name}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Department</Text>
                <View style={styles.detailRow}>
                  <Users size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPO.department_name}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Created By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedPO.created_by} on {formatDate(selectedPO.created_date)}
                </Text>
              </View>

              {selectedPO.source_requisition_number && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Source Requisition</Text>
                  <View style={[styles.sourceRequisitionBadge, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}>
                    <Link2 size={14} color="#8B5CF6" />
                    <Text style={[styles.sourceRequisitionText, { color: '#8B5CF6' }]}>
                      {selectedPO.source_requisition_number}
                    </Text>
                  </View>
                </View>
              )}

              {selectedPO.approved_by && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Approved By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedPO.approved_by}
                    {selectedPO.approved_date && ` on ${formatDate(selectedPO.approved_date)}`}
                  </Text>
                </View>
              )}

              {selectedPO.notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                    {selectedPO.notes}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailCardTitle, { color: colors.text }]}>Line Items</Text>
              
              {selectedPO.line_items.map((item, index) => (
                <View
                  key={item.line_id}
                  style={[
                    styles.lineItem,
                    index < selectedPO.line_items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={styles.lineItemHeader}>
                    <Text style={[styles.lineItemNumber, { color: colors.textSecondary }]}>
                      #{item.line_number}
                    </Text>
                    {item.material_sku && (
                      <Text style={[styles.lineItemSku, { color: colors.primary }]}>
                        {item.material_sku}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.lineItemDescription, { color: colors.text }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.lineItemFooter}>
                    <Text style={[styles.lineItemQty, { color: colors.textSecondary }]}>
                      {item.quantity} {item.uom || 'EA'} × {formatCurrency(item.unit_price)}
                    </Text>
                    <Text style={[styles.lineItemTotal, { color: colors.text }]}>
                      {formatCurrency(item.line_total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailCardTitle, { color: colors.text }]}>Totals</Text>
              
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>
                  {formatCurrency(selectedPO.subtotal)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tax</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>
                  {formatCurrency(selectedPO.tax)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Shipping</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>
                  {formatCurrency(selectedPO.shipping)}
                </Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
                  {formatCurrency(selectedPO.total)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {selectedPO.status === 'approved' && (
              <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>Actions</Text>
                <Text style={[styles.actionCardHint, { color: colors.textSecondary }]}>
                  This PO is approved and ready to be ordered from the vendor.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsProcessing(true);
                    orderPOMutation.mutate(selectedPO.po_id);
                  }}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Truck size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Ordered</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {selectedPO.status === 'ordered' && (
              <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.actionCardTitle, { color: colors.text }]}>Next Steps</Text>
                <Text style={[styles.actionCardHint, { color: colors.textSecondary }]}>
                  This PO has been ordered. Proceed to receiving when materials arrive.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDetailModal(false);
                    router.push('/procurement/poreceiving');
                  }}
                  activeOpacity={0.8}
                >
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Go to Receiving</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Purchase Orders' }} />

      <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search PO#, vendor..."
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFiltersRow}
        >
          {TYPE_OPTIONS.map(renderTypeChip)}
        </ScrollView>

        <View style={styles.filterActionsRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: showFilters ? `${colors.primary}15` : colors.background,
                borderColor: showFilters ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilters(!showFilters);
            }}
            activeOpacity={0.7}
          >
            <Filter size={16} color={showFilters ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: showFilters ? colors.primary : colors.textSecondary }]}>
              Filters
            </Text>
            {activeFiltersCount > 0 && (
              <View style={[styles.filterCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.errorBg }]}
              onPress={clearFilters}
              activeOpacity={0.7}
            >
              <X size={14} color={colors.error} />
              <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear</Text>
            </TouchableOpacity>
          )}

          <View style={styles.resultCount}>
            <Text style={[styles.resultCountText, { color: colors.textSecondary }]}>
              {filteredPOs.length} result{filteredPOs.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {showFilters && (
          <View style={styles.expandedFilters}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptionsRow}>
                  {STATUS_OPTIONS.map(renderStatusOption)}
                </View>
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterGroupTitle, { color: colors.text }]}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptionsRow}>
                  {DEPARTMENTS.map(renderDepartmentOption)}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading purchase orders...</Text>
        </View>
      ) : isError ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredPOs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ShoppingCart size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Purchase Orders Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || activeFiltersCount > 0
                  ? 'Try adjusting your filters'
                  : 'Create a purchase order to get started'}
              </Text>
            </View>
          ) : (
            filteredPOs.map(renderPOCard)
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  typeFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
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
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterCountBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultCount: {
    flex: 1,
    alignItems: 'flex-end',
  },
  resultCountText: {
    fontSize: 12,
  },
  expandedFilters: {
    paddingTop: 12,
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  poCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  poHeader: {
    padding: 14,
    paddingBottom: 10,
  },
  poTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
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
  poBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  poInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poInfoText: {
    fontSize: 13,
    flex: 1,
  },
  poFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  poFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineItemsCount: {
    fontSize: 12,
  },
  poFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailPONumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  detailTotal: {
    fontSize: 22,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    marginVertical: 16,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontSize: 15,
  },
  sourceRequisitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sourceRequisitionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  lineItem: {
    paddingVertical: 12,
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
  lineItemSku: {
    fontSize: 12,
    fontWeight: '500',
  },
  lineItemDescription: {
    fontSize: 14,
    marginBottom: 6,
  },
  lineItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemQty: {
    fontSize: 13,
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
  },
  grandTotalRow: {
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBottomPadding: {
    height: 40,
  },
  actionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionCardHint: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
