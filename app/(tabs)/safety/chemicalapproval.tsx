import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  CheckCircle,
  ArrowLeft,
  Plus,
  Search,
  X,
  User,
  Calendar,
  Clock,
  FileText,
  Building,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ChemicalApprovalRequest {
  id: string;
  chemical_name: string;
  manufacturer: string;
  product_code: string;
  intended_use: string;
  requested_by: string;
  department: string;
  request_date: string;
  urgency: 'routine' | 'urgent' | 'critical';
  hazard_class: string[];
  sds_attached: boolean;
  alternatives_considered: string;
  justification: string;
  estimated_quantity: string;
  estimated_cost: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'more_info';
  reviewed_by: string;
  review_date: string;
  review_comments: string;
  created_at?: string;
  updated_at?: string;
}

const DEPARTMENTS = [
  'Production',
  'Sanitation',
  'Maintenance',
  'Quality',
  'Warehouse',
  'R&D',
  'Administration',
];

const HAZARD_CLASSES = [
  'Flammable',
  'Corrosive',
  'Toxic',
  'Oxidizer',
  'Irritant',
  'Compressed Gas',
  'Health Hazard',
  'Environmental Hazard',
];

async function fetchChemicalApprovalRequests(): Promise<ChemicalApprovalRequest[]> {
  console.log('Fetching chemical approval requests from Supabase...');
  try {
    const { data, error } = await supabase
      .from('chemical_approval_requests')
      .select('*')
      .order('request_date', { ascending: false });

    if (error) {
      console.warn('Chemical approval table may not exist, using empty data:', error.message);
      return [];
    }

    console.log('Fetched chemical approval requests:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.warn('Chemical approval query failed, using empty data:', err);
    return [];
  }
}

async function createChemicalApprovalRequest(request: Omit<ChemicalApprovalRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ChemicalApprovalRequest> {
  console.log('Creating chemical approval request:', request);
  const { data, error } = await supabase
    .from('chemical_approval_requests')
    .insert([request])
    .select()
    .single();

  if (error) {
    console.error('Error creating chemical approval request:', error);
    throw error;
  }

  console.log('Created chemical approval request:', data);
  return data;
}

async function updateChemicalApprovalRequest(id: string, request: Partial<ChemicalApprovalRequest>): Promise<ChemicalApprovalRequest> {
  console.log('Updating chemical approval request:', id, request);
  const { data, error } = await supabase
    .from('chemical_approval_requests')
    .update(request)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating chemical approval request:', error);
    throw error;
  }

  console.log('Updated chemical approval request:', data);
  return data;
}

export default function ChemicalApprovalScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChemicalApprovalRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const [formData, setFormData] = useState({
    chemicalName: '',
    manufacturer: '',
    productCode: '',
    intendedUse: '',
    requestedBy: '',
    department: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'critical',
    hazardClass: [] as string[],
    sdsAttached: false,
    alternativesConsidered: '',
    justification: '',
    estimatedQuantity: '',
    estimatedCost: '',
  });

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['chemical-approval-requests'],
    queryFn: fetchChemicalApprovalRequests,
  });

  const createMutation = useMutation({
    mutationFn: createChemicalApprovalRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-approval-requests'] });
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Create error:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChemicalApprovalRequest> }) => updateChemicalApprovalRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-approval-requests'] });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewComments('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update request. Please try again.');
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      chemicalName: '',
      manufacturer: '',
      productCode: '',
      intendedUse: '',
      requestedBy: '',
      department: '',
      urgency: 'routine',
      hazardClass: [],
      sdsAttached: false,
      alternativesConsidered: '',
      justification: '',
      estimatedQuantity: '',
      estimatedCost: '',
    });
  };

  const handleSubmitRequest = () => {
    if (!formData.chemicalName.trim() || !formData.department || !formData.intendedUse.trim()) {
      Alert.alert('Required Fields', 'Please fill in chemical name, department, and intended use.');
      return;
    }

    const requestData = {
      chemical_name: formData.chemicalName,
      manufacturer: formData.manufacturer,
      product_code: formData.productCode,
      intended_use: formData.intendedUse,
      requested_by: formData.requestedBy || 'Current User',
      department: formData.department,
      request_date: new Date().toISOString().split('T')[0],
      urgency: formData.urgency,
      hazard_class: formData.hazardClass,
      sds_attached: formData.sdsAttached,
      alternatives_considered: formData.alternativesConsidered,
      justification: formData.justification,
      estimated_quantity: formData.estimatedQuantity,
      estimated_cost: formData.estimatedCost,
      status: 'pending' as const,
      reviewed_by: '',
      review_date: '',
      review_comments: '',
    };

    createMutation.mutate(requestData);
  };

  const handleReviewAction = (status: 'approved' | 'rejected' | 'more_info') => {
    if (!selectedRequest) return;

    Haptics.notificationAsync(
      status === 'approved'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status,
        reviewed_by: 'Safety Manager',
        review_date: new Date().toISOString().split('T')[0],
        review_comments: reviewComments,
      },
    });
  };

  const toggleHazardClass = (hazard: string) => {
    setFormData(prev => ({
      ...prev,
      hazardClass: prev.hazardClass.includes(hazard)
        ? prev.hazardClass.filter(h => h !== hazard)
        : [...prev.hazardClass, hazard],
    }));
  };

  const filteredRequests = requests.filter(request =>
    request.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.requested_by.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'under_review': return '#3B82F6';
      case 'more_info': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      case 'under_review': return 'Under Review';
      case 'more_info': return 'More Info Needed';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle2;
      case 'rejected': return XCircle;
      case 'pending': return Clock;
      case 'under_review': return FileText;
      case 'more_info': return HelpCircle;
      default: return Clock;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#EF4444';
      case 'urgent': return '#F59E0B';
      case 'routine': return '#10B981';
      default: return '#6B7280';
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Chemical Approval',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search requests..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
              <Clock size={18} color="#F59E0B" />
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {requests.filter(r => r.status === 'pending' || r.status === 'under_review').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {requests.filter(r => r.status === 'approved').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#10B981' }]}>Approved</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
              <XCircle size={18} color="#EF4444" />
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {requests.filter(r => r.status === 'rejected').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#EF4444' }]}>Rejected</Text>
            </View>
          </View>

          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap the + button to submit a new chemical approval request.
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const StatusIcon = getStatusIcon(request.status);
              return (
                <Pressable
                  key={request.id}
                  style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    if (request.status === 'pending' || request.status === 'under_review') {
                      setSelectedRequest(request);
                      setShowReviewModal(true);
                    }
                  }}
                >
                  <View style={styles.requestHeader}>
                    <View style={styles.requestTitleRow}>
                      <CheckCircle size={20} color="#10B981" />
                      <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>
                        {request.chemical_name}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                      <StatusIcon size={12} color={getStatusColor(request.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                        {getStatusLabel(request.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestDetails}>
                    <View style={styles.detailRow}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>{request.requested_by}</Text>
                      <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                      <Building size={14} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>{request.department}</Text>
                    </View>
                  </View>

                  <View style={styles.useRow}>
                    <Text style={[styles.useLabel, { color: colors.textSecondary }]}>Use:</Text>
                    <Text style={[styles.useText, { color: colors.text }]} numberOfLines={1}>
                      {request.intended_use}
                    </Text>
                  </View>

                  <View style={styles.tagsRow}>
                    <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) + '20' }]}>
                      <Text style={[styles.urgencyText, { color: getUrgencyColor(request.urgency) }]}>
                        {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                      </Text>
                    </View>
                    {request.hazard_class && request.hazard_class.slice(0, 2).map((hazard, idx) => (
                      <View key={idx} style={[styles.hazardBadge, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.hazardText, { color: '#EF4444' }]}>{hazard}</Text>
                      </View>
                    ))}
                    {request.hazard_class && request.hazard_class.length > 2 && (
                      <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                        +{request.hazard_class.length - 2}
                      </Text>
                    )}
                  </View>

                  {request.review_comments && (
                    <View style={[styles.commentsRow, { backgroundColor: colors.card }]}>
                      <MessageSquare size={12} color={colors.textSecondary} />
                      <Text style={[styles.commentsText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {request.review_comments}
                      </Text>
                    </View>
                  )}

                  <View style={styles.requestFooter}>
                    <View style={styles.dateInfo}>
                      <Calendar size={12} color={colors.textSecondary} />
                      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        Requested: {request.request_date}
                      </Text>
                    </View>
                    {request.estimated_cost && (
                      <Text style={[styles.costText, { color: colors.textSecondary }]}>
                        Est: {request.estimated_cost}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#10B981' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Approval Request</Text>
            <Pressable onPress={handleSubmitRequest} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={[styles.saveButton, { color: '#10B981' }]}>Submit</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemical Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter chemical name"
              placeholderTextColor={colors.textSecondary}
              value={formData.chemicalName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, chemicalName: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Manufacturer</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Manufacturer"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.manufacturer}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, manufacturer: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Product Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Code"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.productCode}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, productCode: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Department *</Text>
            <View style={styles.chipContainer}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.department === dept ? '#10B98120' : colors.surface,
                      borderColor: formData.department === dept ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, department: dept }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.department === dept ? '#10B981' : colors.textSecondary },
                  ]}>
                    {dept}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Intended Use *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe how the chemical will be used..."
              placeholderTextColor={colors.textSecondary}
              value={formData.intendedUse}
              onChangeText={(text) => setFormData(prev => ({ ...prev, intendedUse: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Urgency</Text>
            <View style={styles.urgencyRow}>
              {(['routine', 'urgent', 'critical'] as const).map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.urgencyOption,
                    {
                      backgroundColor: formData.urgency === level ? getUrgencyColor(level) + '20' : colors.surface,
                      borderColor: formData.urgency === level ? getUrgencyColor(level) : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, urgency: level }))}
                >
                  <Text style={[
                    styles.urgencyOptionText,
                    { color: formData.urgency === level ? getUrgencyColor(level) : colors.textSecondary },
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Classes</Text>
            <View style={styles.chipContainer}>
              {HAZARD_CLASSES.map((hazard) => (
                <Pressable
                  key={hazard}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.hazardClass.includes(hazard) ? '#EF444420' : colors.surface,
                      borderColor: formData.hazardClass.includes(hazard) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleHazardClass(hazard)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.hazardClass.includes(hazard) ? '#EF4444' : colors.textSecondary },
                  ]}>
                    {hazard}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>SDS Attached</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.sdsAttached ? '#10B981' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, sdsAttached: !prev.sdsAttached }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.sdsAttached ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Alternatives Considered</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What alternatives were considered and why..."
              placeholderTextColor={colors.textSecondary}
              value={formData.alternativesConsidered}
              onChangeText={(text) => setFormData(prev => ({ ...prev, alternativesConsidered: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Justification</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Why is this chemical needed..."
              placeholderTextColor={colors.textSecondary}
              value={formData.justification}
              onChangeText={(text) => setFormData(prev => ({ ...prev, justification: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Est. Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., 50 gal/mo"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.estimatedQuantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedQuantity: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Est. Cost</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., $500/mo"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.estimatedCost}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedCost: text }))}
                />
              </View>
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showReviewModal} animationType="slide" transparent>
        <Pressable style={styles.reviewOverlay} onPress={() => setShowReviewModal(false)}>
          <Pressable style={[styles.reviewSheet, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Review Request</Text>
            {selectedRequest && (
              <>
                <Text style={[styles.reviewChemical, { color: colors.text }]}>{selectedRequest.chemical_name}</Text>
                <Text style={[styles.reviewDetail, { color: colors.textSecondary }]}>
                  {selectedRequest.department} • {selectedRequest.requested_by}
                </Text>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Review Comments</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Add review comments..."
                  placeholderTextColor={colors.textSecondary}
                  value={reviewComments}
                  onChangeText={setReviewComments}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.reviewActions}>
                  <Pressable
                    style={[styles.reviewButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleReviewAction('approved')}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#FFFFFF" />
                        <Text style={styles.reviewButtonText}>Approve</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.reviewButton, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleReviewAction('more_info')}
                    disabled={isSaving}
                  >
                    <HelpCircle size={18} color="#FFFFFF" />
                    <Text style={styles.reviewButtonText}>More Info</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reviewButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleReviewAction('rejected')}
                    disabled={isSaving}
                  >
                    <XCircle size={18} color="#FFFFFF" />
                    <Text style={styles.reviewButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  requestCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  requestTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  requestDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 2,
  },
  useRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  useLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  useText: {
    fontSize: 12,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  hazardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hazardText: {
    fontSize: 11,
  },
  moreText: {
    fontSize: 11,
    alignSelf: 'center' as const,
  },
  commentsRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  commentsText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  requestFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  costText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 70,
  },
  twoColumn: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  urgencyRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  urgencyOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalBottomPadding: {
    height: 40,
  },
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  reviewSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  reviewChemical: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  reviewDetail: {
    fontSize: 13,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 16,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 80,
  },
});
