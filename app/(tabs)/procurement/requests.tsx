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
} from 'react-native';
import { Stack } from 'expo-router';
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
  Send,
  Eye,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  usePurchaseRequestsQuery,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
  useConvertRequestToRequisition,
  useMarkRequestUnderReview,
  PurchaseRequestLineItem,
} from '@/hooks/useSupabaseProcurement';
import { 
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  RequestStatus,
} from '@/types/procurement';
import { Tables } from '@/lib/supabase';

type PurchaseRequest = Tables['purchase_requests'];

interface DisplayPurchaseRequest {
  request_id: string;
  request_number: string;
  requester_id: string | null;
  requester_name: string;
  department_id: string | null;
  department_name: string | null;
  status: RequestStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requested_date: string;
  needed_by_date: string | null;
  total_estimated: number;
  notes: string | null;
  requisition_id: string | null;
  requisition_number: string | null;
  line_items: PurchaseRequestLineItem[];
}

type StatusFilter = 'all' | RequestStatus;
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';

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

export default function PurchaseRequestsScreen() {
  const { colors } = useTheme();
  const { userProfile } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter] = useState<PriorityFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<DisplayPurchaseRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: rawRequests = [], isLoading, refetch, isRefetching } = usePurchaseRequestsQuery();

  const approveRequest = useApprovePurchaseRequest({
    onSuccess: () => {
      console.log('[PurchaseRequests] Request approved successfully');
      setShowDetailModal(false);
      refetch();
    },
    onError: (error) => {
      console.error('[PurchaseRequests] Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request. Please try again.');
    },
  });

  const rejectRequest = useRejectPurchaseRequest({
    onSuccess: () => {
      console.log('[PurchaseRequests] Request rejected successfully');
      setShowDetailModal(false);
      refetch();
    },
    onError: (error) => {
      console.error('[PurchaseRequests] Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    },
  });

  const convertToRequisition = useConvertRequestToRequisition({
    onSuccess: (data) => {
      console.log('[PurchaseRequests] Converted to requisition:', data.requisition_number);
      setShowDetailModal(false);
      refetch();
      Alert.alert('Success', `Requisition ${data.requisition_number} created successfully`);
    },
    onError: (error) => {
      console.error('[PurchaseRequests] Error converting to requisition:', error);
      Alert.alert('Error', 'Failed to create requisition. Please try again.');
    },
  });

  const markUnderReview = useMarkRequestUnderReview({
    onSuccess: () => {
      console.log('[PurchaseRequests] Request marked as under review');
      refetch();
    },
    onError: (error) => {
      console.error('[PurchaseRequests] Error marking request:', error);
    },
  });

  const requests: DisplayPurchaseRequest[] = useMemo(() => {
    return rawRequests.map((r: PurchaseRequest) => ({
      request_id: r.id,
      request_number: r.request_number,
      requester_id: r.requester_id,
      requester_name: r.requester_name,
      department_id: r.department_id,
      department_name: r.department_name,
      status: r.status as RequestStatus,
      priority: r.priority,
      requested_date: r.requested_date,
      needed_by_date: r.needed_by_date,
      total_estimated: r.total_estimated,
      notes: r.notes,
      requisition_id: r.requisition_id,
      requisition_number: r.requisition_number,
      line_items: (r.line_items || []) as unknown as PurchaseRequestLineItem[],
    }));
  }, [rawRequests]);

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
    const submitted = requests.filter(r => r.status === 'submitted').length;
    const underReview = requests.filter(r => r.status === 'under_review').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const total = requests.length;
    
    return { submitted, underReview, approved, total };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.request_number.toLowerCase().includes(query) ||
        r.requester_name.toLowerCase().includes(query) ||
        (r.department_name?.toLowerCase().includes(query) ?? false) ||
        (r.notes?.toLowerCase().includes(query) ?? false)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    return filtered.sort((a, b) => 
      new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()
    );
  }, [requests, searchQuery, statusFilter, priorityFilter]);

  const handleViewRequest = (request: DisplayPurchaseRequest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRequest(request);
    setShowDetailModal(true);
    
    if (request.status === 'submitted') {
      markUnderReview.mutate(request.request_id);
    }
  };

  const handleApproveRequest = (request: DisplayPurchaseRequest) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Approve Request',
      `Approve ${request.request_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: () => {
            console.log('[PurchaseRequests] Approving request:', request.request_id);
            approveRequest.mutate({
              requestId: request.request_id,
              approvedBy: userProfile?.first_name && userProfile?.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : 'Current User',
            });
          }
        },
      ]
    );
  };

  const handleRejectRequest = (request: DisplayPurchaseRequest) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Reject Request',
      `Reject ${request.request_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            console.log('[PurchaseRequests] Rejecting request:', request.request_id);
            rejectRequest.mutate({
              requestId: request.request_id,
              rejectedBy: userProfile?.first_name && userProfile?.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : 'Current User',
            });
          }
        },
      ]
    );
  };

  const handleCreateRequisition = (request: DisplayPurchaseRequest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Create Requisition',
      `Create a purchase requisition from ${request.request_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            console.log('[PurchaseRequests] Creating requisition from request:', request.request_id);
            if (!userProfile) {
              Alert.alert('Error', 'User profile not found');
              return;
            }
            convertToRequisition.mutate({
              requestId: request.request_id,
              createdById: userProfile.id,
              createdByName: userProfile.first_name && userProfile.last_name
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : 'Current User',
            });
          }
        },
      ]
    );
  };

  const renderStatusBadge = (status: RequestStatus) => {
    const color = REQUEST_STATUS_COLORS[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.statusBadgeText, { color }]}>
          {REQUEST_STATUS_LABELS[status]}
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

  const renderRequestCard = (request: DisplayPurchaseRequest) => {
    return (
      <TouchableOpacity
        key={request.request_id}
        style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewRequest(request)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleRow}>
            <Text style={[styles.requestNumber, { color: colors.text }]}>
              {request.request_number}
            </Text>
            {renderPriorityBadge(request.priority)}
          </View>
          {renderStatusBadge(request.status)}
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.requestDetailRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>
              {request.requester_name}
            </Text>
          </View>
          <View style={styles.requestDetailRow}>
            <Building2 size={14} color={colors.textSecondary} />
            <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>
              {request.department_name || 'No Department'}
            </Text>
          </View>
          {request.needed_by_date && (
            <View style={styles.requestDetailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>
                Needed by {formatDate(request.needed_by_date)}
              </Text>
            </View>
          )}
        </View>

        {request.notes && (
          <Text style={[styles.requestNotes, { color: colors.textTertiary }]} numberOfLines={2}>
            {request.notes}
          </Text>
        )}

        <View style={styles.requestFooter}>
          <View style={styles.requestFooterLeft}>
            <Text style={[styles.requestTotal, { color: colors.text }]}>
              {formatCurrency(request.total_estimated)}
            </Text>
            <Text style={[styles.requestLineCount, { color: colors.textTertiary }]}>
              {request.line_items.length} item{request.line_items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.requestFooterRight}>
            <Text style={[styles.requestDate, { color: colors.textTertiary }]}>
              {formatDate(request.requested_date)}
            </Text>
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        </View>

        {request.status === 'converted' && request.requisition_number && (
          <View style={[styles.linkedBadge, { backgroundColor: '#8B5CF615' }]}>
            <ArrowRight size={12} color="#8B5CF6" />
            <Text style={[styles.linkedBadgeText, { color: '#8B5CF6' }]}>
              {request.requisition_number}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRequest) return null;

    const canApprove = selectedRequest.status === 'submitted' || selectedRequest.status === 'under_review';
    const canCreateRequisition = selectedRequest.status === 'approved';

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Request Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailNumber, { color: colors.text }]}>
                  {selectedRequest.request_number}
                </Text>
                <View style={styles.detailBadges}>
                  {renderStatusBadge(selectedRequest.status)}
                  {renderPriorityBadge(selectedRequest.priority)}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  Requester Information
                </Text>
                <View style={styles.detailRow}>
                  <User size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requester:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedRequest.requester_name}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedRequest.department_name || 'No Department'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  Request Details
                </Text>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requested:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedRequest.requested_date)}
                  </Text>
                </View>
                {selectedRequest.needed_by_date && (
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Needed By:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatDate(selectedRequest.needed_by_date)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <DollarSign size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Est. Total:</Text>
                  <Text style={[styles.detailValue, { color: colors.text, fontWeight: '600' }]}>
                    {formatCurrency(selectedRequest.total_estimated)}
                  </Text>
                </View>
              </View>

              {selectedRequest.notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[styles.detailNotes, { color: colors.text }]}>
                    {selectedRequest.notes}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.lineItemsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.lineItemsTitle, { color: colors.text }]}>
                Line Items ({selectedRequest.line_items.length})
              </Text>
              {selectedRequest.line_items.map((item, index) => (
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
                  </View>
                  <Text style={[styles.lineItemDescription, { color: colors.text }]}>
                    {item.description}
                  </Text>
                  <View style={styles.lineItemDetails}>
                    <Text style={[styles.lineItemQty, { color: colors.textSecondary }]}>
                      Qty: {item.quantity}
                    </Text>
                    <Text style={[styles.lineItemPrice, { color: colors.textSecondary }]}>
                      @ {formatCurrency(item.estimated_unit_price)}
                    </Text>
                    <Text style={[styles.lineItemTotal, { color: colors.text }]}>
                      {formatCurrency(item.estimated_total)}
                    </Text>
                  </View>
                  {item.suggested_vendor_name && (
                    <Text style={[styles.lineItemVendor, { color: colors.textTertiary }]}>
                      Suggested: {item.suggested_vendor_name}
                    </Text>
                  )}
                  {item.notes && (
                    <Text style={[styles.lineItemNotes, { color: colors.textTertiary }]}>
                      Note: {item.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.modalActions}>
              {canApprove && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(selectedRequest)}
                    disabled={rejectRequest.isPending}
                  >
                    {rejectRequest.isPending ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <XCircle size={18} color="#EF4444" />
                        <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApproveRequest(selectedRequest)}
                    disabled={approveRequest.isPending}
                  >
                    {approveRequest.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#fff" />
                        <Text style={[styles.actionButtonText, { color: '#fff' }]}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
              {canCreateRequisition && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.createButton]}
                  onPress={() => handleCreateRequisition(selectedRequest)}
                  disabled={convertToRequisition.isPending}
                >
                  {convertToRequisition.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Send size={18} color="#fff" />
                      <Text style={[styles.actionButtonText, { color: '#fff' }]}>Create Requisition</Text>
                    </>
                  )}
                </TouchableOpacity>
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
      <Stack.Screen options={{ title: 'Purchase Requests' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.metricsRow}>
          {renderMetricCard('Submitted', metrics.submitted, '#3B82F6', <Send size={16} color="#3B82F6" />)}
          {renderMetricCard('In Review', metrics.underReview, '#F59E0B', <Eye size={16} color="#F59E0B" />)}
          {renderMetricCard('Approved', metrics.approved, '#10B981', <CheckCircle size={16} color="#10B981" />)}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search requests..."
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
          {renderStatusFilter('submitted', 'Submitted')}
          {renderStatusFilter('under_review', 'Under Review')}
          {renderStatusFilter('approved', 'Approved')}
          {renderStatusFilter('converted', 'Converted')}
          {renderStatusFilter('rejected', 'Rejected')}
        </ScrollView>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.requestsList}>
          {isLoading ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>Loading Requests...</Text>
            </View>
          ) : filteredRequests.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileText size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search or filters' : 'No purchase requests to display'}
              </Text>
            </View>
          ) : (
            filteredRequests.map(renderRequestCard)
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
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
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
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
  requestsList: {
    gap: 12,
  },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  requestNumber: {
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
  requestDetails: {
    gap: 6,
    marginBottom: 8,
  },
  requestDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestDetailText: {
    fontSize: 13,
  },
  requestNotes: {
    fontSize: 12,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  requestFooterLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  requestTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestLineCount: {
    fontSize: 12,
  },
  requestFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestDate: {
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
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '500',
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
  lineItemVendor: {
    fontSize: 12,
    marginTop: 4,
  },
  lineItemNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  createButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
