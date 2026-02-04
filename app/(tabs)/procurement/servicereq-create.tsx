import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Search,
  Calendar,
  CheckCircle,
  FileText,
  ChevronDown,
  Info,
  Send,
  Receipt,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Building,
  Wrench,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { 
  useServicePOsQuery, 
  ServicePurchaseOrder,
  useCreateServiceRequisition,
  useUpdateServicePO,
} from '@/hooks/useSupabaseProcurementExtended';
import { APPROVAL_TIER_THRESHOLDS, APPROVAL_TIER_LABELS } from '@/types/procurement';

interface DepartmentGLMapping {
  id: string;
  name: string;
  glAccount: string;
  glDescription: string;
}

const DEPARTMENT_GL_ACCOUNTS: DepartmentGLMapping[] = [
  { id: '1001', name: 'Maintenance', glAccount: '530300', glDescription: 'Maintenance Expense' },
  { id: '1002', name: 'Sanitation', glAccount: '560600', glDescription: 'Sanitation Expense' },
  { id: '1003', name: 'Production', glAccount: '540400', glDescription: 'Production Expense' },
  { id: '1004', name: 'Quality', glAccount: '520200', glDescription: 'Quality Expense' },
  { id: '1005', name: 'Safety', glAccount: '550500', glDescription: 'Safety Expense' },
  { id: '1006', name: 'IT', glAccount: '580800', glDescription: 'IT Expense' },
  { id: '1007', name: 'Warehouse', glAccount: '570700', glDescription: 'Warehouse Expense' },
  { id: '1008', name: 'Facilities', glAccount: '590900', glDescription: 'Facilities Expense' },
  { id: '1009', name: 'Projects/Office', glAccount: '510100', glDescription: 'Projects/Office Expense' },
];



const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ServiceReqCreateScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    poId?: string;
    poNumber?: string;
  }>();

  const { data: servicePOs = [], isLoading: posLoading } = useServicePOsQuery({ 
    status: 'in_progress',
  });

  const createRequisition = useCreateServiceRequisition({
    onSuccess: (data) => {
      console.log('[ServiceReqCreate] Created requisition:', data.id);
    },
    onError: (error) => {
      console.error('[ServiceReqCreate] Create error:', error);
      Alert.alert('Error', 'Failed to create service requisition');
    },
  });

  const updateServicePO = useUpdateServicePO({
    onSuccess: () => {
      console.log('[ServiceReqCreate] Updated service PO status');
    },
    onError: (error) => {
      console.error('[ServiceReqCreate] PO update error:', error);
    },
  });

  const [selectedPO, setSelectedPO] = useState<ServicePurchaseOrder | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [serviceCompletionDate, setServiceCompletionDate] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPOPicker, setShowPOPicker] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [poSearchQuery, setPOSearchQuery] = useState('');

  useEffect(() => {
    if (params.poId && servicePOs.length > 0) {
      const po = servicePOs.find(p => p.id === params.poId);
      if (po) {
        setSelectedPO(po);
      }
    }
  }, [params.poId, servicePOs]);

  const filteredPOs = useMemo(() => {
    if (!poSearchQuery.trim()) return servicePOs;
    const query = poSearchQuery.toLowerCase();
    return servicePOs.filter(po => 
      po.service_po_number.toLowerCase().includes(query) ||
      po.vendor_name.toLowerCase().includes(query) ||
      po.service_type.toLowerCase().includes(query)
    );
  }, [servicePOs, poSearchQuery]);

  const invoiceAmountNum = parseFloat(invoiceAmount) || 0;
  const originalEstimate = selectedPO?.total_amount || 0;
  const variance = invoiceAmountNum - originalEstimate;
  const variancePercent = originalEstimate > 0 ? (variance / originalEstimate) * 100 : 0;

  const requiredTiers = useMemo(() => {
    if (invoiceAmountNum >= APPROVAL_TIER_THRESHOLDS.TIER_3) {
      return [2, 3];
    } else if (invoiceAmountNum >= APPROVAL_TIER_THRESHOLDS.TIER_2) {
      return [2];
    }
    return [];
  }, [invoiceAmountNum]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSelectPO = (po: ServicePurchaseOrder) => {
    Haptics.selectionAsync();
    setSelectedPO(po);
    setShowPOPicker(false);
    setPOSearchQuery('');
  };

  const handleReview = () => {
    if (!selectedPO) {
      Alert.alert('Error', 'Please select a Service PO');
      return;
    }
    if (!invoiceNumber.trim()) {
      Alert.alert('Error', 'Please enter the invoice number');
      return;
    }
    if (!invoiceAmount || invoiceAmountNum <= 0) {
      Alert.alert('Error', 'Please enter the invoice amount');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReviewModal(true);
  };

  const confirmSubmit = async () => {
    if (!selectedPO) return;
    
    setIsSubmitting(true);

    try {
      const department = DEPARTMENT_GL_ACCOUNTS.find(d => d.name === selectedPO.department_name) || DEPARTMENT_GL_ACCOUNTS[0];

      const requisitionData = {
        source_po_id: selectedPO.id,
        source_po_number: selectedPO.service_po_number,
        vendor_id: selectedPO.vendor_id || '',
        vendor_name: selectedPO.vendor_name,
        department_id: selectedPO.department_id || department.id,
        department_name: selectedPO.department_name || department.name,
        service_type: selectedPO.service_type,
        service_category: null,
        service_description: selectedPO.description || `Service: ${selectedPO.service_type}`,
        scope_of_work: null,
        status: requiredTiers.length > 0 ? 'pending_tier2_approval' : 'approved' as const,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        invoice_amount: invoiceAmountNum,
        original_estimate: originalEstimate,
        variance: variance,
        variance_percent: variancePercent,
        variance_reason: Math.abs(variancePercent) > 10 ? varianceReason : null,
        service_completion_date: serviceCompletionDate || null,
        service_start_date: selectedPO.start_date,
        service_end_date: selectedPO.end_date,
        gl_account: department.glAccount,
        cost_center: department.id,
        current_approval_tier: requiredTiers.length > 0 ? 2 : 0,
        required_tiers: requiredTiers,
        tier2_approved_by: null,
        tier2_approved_at: null,
        tier3_approved_by: null,
        tier3_approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id || null,
        notes: notes || null,
        line_items: [],
      };

      await createRequisition.mutateAsync(requisitionData);

      await updateServicePO.mutateAsync({
        id: selectedPO.id,
        updates: {
          status: 'completed',
          completion_percent: 100,
          completed_amount: invoiceAmountNum,
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const approvalMsg = requiredTiers.length > 0 
        ? `Requisition submitted for ${APPROVAL_TIER_LABELS[requiredTiers[0]]} approval.`
        : 'Requisition approved automatically (under threshold).';

      Alert.alert('Success', approvalMsg, [
        { text: 'OK', onPress: () => router.back() }
      ]);

      setShowReviewModal(false);
    } catch (error) {
      console.error('[ServiceReqCreate] Submit error:', error);
      Alert.alert('Error', 'Failed to create service requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPOPicker = () => (
    <Modal
      visible={showPOPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPOPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowPOPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Service PO</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search POs..."
              placeholderTextColor={colors.textSecondary}
              value={poSearchQuery}
              onChangeText={setPOSearchQuery}
            />
            {poSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setPOSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.infoBanner, { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }]}>
          <Info size={16} color="#3B82F6" />
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            Only Service POs with status In Progress are shown. Create a requisition when you receive the invoice.
          </Text>
        </View>

        <ScrollView style={styles.modalContent}>
          {posLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading POs...</Text>
            </View>
          ) : filteredPOs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Wrench size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active Service POs found</Text>
            </View>
          ) : filteredPOs.map(po => (
            <TouchableOpacity
              key={po.id}
              style={[styles.poOption, { borderBottomColor: colors.border }]}
              onPress={() => handleSelectPO(po)}
            >
              <View style={[styles.poIcon, { backgroundColor: '#F9731615' }]}>
                <Wrench size={18} color="#F97316" />
              </View>
              <View style={styles.poContent}>
                <Text style={[styles.poNumber, { color: colors.text }]}>{po.service_po_number}</Text>
                <Text style={[styles.poVendor, { color: colors.textSecondary }]}>{po.vendor_name}</Text>
                <View style={styles.poMeta}>
                  <Text style={[styles.poType, { color: colors.textTertiary }]}>{po.service_type}</Text>
                  <Text style={[styles.poAmount, { color: colors.text }]}>{formatCurrency(po.total_amount)}</Text>
                </View>
              </View>
              {selectedPO?.id === po.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowReviewModal(false)} disabled={isSubmitting}>
            <X size={24} color={isSubmitting ? colors.textTertiary : colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Review Service Requisition</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={[styles.flowBanner, { backgroundColor: '#F9731615', borderColor: '#F97316' }]}>
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: '#10B981' }]}>
                <CheckCircle size={16} color="#fff" />
              </View>
              <Text style={[styles.flowStepText, { color: colors.text }]}>Service PO</Text>
            </View>
            <ArrowRight size={16} color={colors.textSecondary} />
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: '#10B981' }]}>
                <CheckCircle size={16} color="#fff" />
              </View>
              <Text style={[styles.flowStepText, { color: colors.text }]}>Service Done</Text>
            </View>
            <ArrowRight size={16} color={colors.textSecondary} />
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: '#F97316' }]}>
                <Receipt size={16} color="#fff" />
              </View>
              <Text style={[styles.flowStepText, { color: '#F97316' }]}>Invoice Req</Text>
            </View>
            <ArrowRight size={16} color={colors.textSecondary} />
            <View style={styles.flowStep}>
              <View style={[styles.flowStepIcon, { backgroundColor: colors.border }]}>
                <Clock size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.flowStepText, { color: colors.textSecondary }]}>Approval</Text>
            </View>
          </View>

          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Source PO</Text>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>PO Number</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedPO?.service_po_number}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Vendor</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedPO?.vendor_name}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Service Type</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedPO?.service_type}</Text>
            </View>
          </View>

          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Invoice Details</Text>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Invoice #</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{invoiceNumber}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formatDisplayDate(invoiceDate)}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Invoice Amount</Text>
              <Text style={[styles.reviewValue, { color: colors.text, fontWeight: '600' as const }]}>{formatCurrency(invoiceAmountNum)}</Text>
            </View>
          </View>

          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Variance Analysis</Text>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Original Estimate</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(originalEstimate)}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Actual Invoice</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(invoiceAmountNum)}</Text>
            </View>
            <View style={[styles.varianceRow, { borderTopColor: colors.border }]}>
              <View style={styles.varianceLabel}>
                {variance > 0 ? (
                  <TrendingUp size={16} color="#EF4444" />
                ) : variance < 0 ? (
                  <TrendingDown size={16} color="#10B981" />
                ) : null}
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Variance</Text>
              </View>
              <View style={styles.varianceValues}>
                <Text style={[
                  styles.varianceAmount,
                  { color: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.text }
                ]}>
                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                </Text>
                <Text style={[
                  styles.variancePercent,
                  { color: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.textSecondary }
                ]}>
                  ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                </Text>
              </View>
            </View>
            {Math.abs(variancePercent) > 10 && varianceReason && (
              <View style={[styles.varianceReasonBox, { backgroundColor: colors.backgroundTertiary }]}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={[styles.varianceReasonText, { color: colors.text }]}>{varianceReason}</Text>
              </View>
            )}
          </View>

          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Approval Workflow</Text>
            {requiredTiers.length === 0 ? (
              <View style={[styles.approvalBox, { backgroundColor: '#10B98115' }]}>
                <CheckCircle size={18} color="#10B981" />
                <View style={styles.approvalBoxContent}>
                  <Text style={[styles.approvalBoxTitle, { color: '#10B981' }]}>Auto-Approved</Text>
                  <Text style={[styles.approvalBoxText, { color: colors.textSecondary }]}>
                    Amount is under ${APPROVAL_TIER_THRESHOLDS.TIER_2.toLocaleString()} threshold
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {requiredTiers.map((tier, idx) => (
                  <View key={tier} style={[styles.approvalTier, idx > 0 && { marginTop: 8 }]}>
                    <View style={[styles.tierBadge, { backgroundColor: tier === 2 ? '#F59E0B15' : '#8B5CF615' }]}>
                      <Text style={[styles.tierBadgeText, { color: tier === 2 ? '#F59E0B' : '#8B5CF6' }]}>
                        Tier {tier}
                      </Text>
                    </View>
                    <Text style={[styles.tierLabel, { color: colors.text }]}>{APPROVAL_TIER_LABELS[tier]}</Text>
                    {tier === requiredTiers[0] && (
                      <View style={[styles.pendingBadge, { backgroundColor: '#F59E0B15' }]}>
                        <Clock size={12} color="#F59E0B" />
                        <Text style={[styles.pendingBadgeText, { color: '#F59E0B' }]}>Pending</Text>
                      </View>
                    )}
                  </View>
                ))}
                <Text style={[styles.thresholdNote, { color: colors.textTertiary }]}>
                  {invoiceAmountNum >= APPROVAL_TIER_THRESHOLDS.TIER_3 
                    ? `Amount ≥ $${APPROVAL_TIER_THRESHOLDS.TIER_3.toLocaleString()} requires Owner/Executive approval`
                    : `Amount ≥ $${APPROVAL_TIER_THRESHOLDS.TIER_2.toLocaleString()} requires Plant Manager approval`
                  }
                </Text>
              </>
            )}
          </View>

          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#F97316', opacity: isSubmitting ? 0.7 : 1 }]}
              onPress={confirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {requiredTiers.length > 0 ? 'Submit for Approval' : 'Create Requisition'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Service Requisition' }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.flowExplainer, { backgroundColor: '#F9731615', borderColor: '#F97316' }]}>
            <Receipt size={20} color="#F97316" />
            <View style={styles.flowExplainerContent}>
              <Text style={[styles.flowExplainerTitle, { color: '#F97316' }]}>Invoice Received</Text>
              <Text style={[styles.flowExplainerText, { color: colors.textSecondary }]}>
                Create a requisition from the Service PO to process the invoice through approvals before payment.
              </Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Wrench size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Source Service PO</Text>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Select Service PO *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowPOPicker(true)}
              >
                {selectedPO ? (
                  <View style={styles.selectedValue}>
                    <Wrench size={16} color="#F97316" />
                    <View style={styles.selectedPOInfo}>
                      <Text style={[styles.selectedPONumber, { color: colors.text }]}>{selectedPO.service_po_number}</Text>
                      <Text style={[styles.selectedPOVendor, { color: colors.textSecondary }]}>
                        {selectedPO.vendor_name} • {formatCurrency(selectedPO.total_amount)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select a service PO...
                  </Text>
                )}
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPO && (
              <View style={[styles.poSummary, { backgroundColor: colors.backgroundTertiary }]}>
                <View style={styles.poSummaryRow}>
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={[styles.poSummaryText, { color: colors.textSecondary }]}>
                    {selectedPO.department_name || 'No Department'}
                  </Text>
                </View>
                <View style={styles.poSummaryRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.poSummaryText, { color: colors.textSecondary }]}>
                    {selectedPO.start_date ? formatDisplayDate(selectedPO.start_date) : 'No start date'} - {selectedPO.end_date ? formatDisplayDate(selectedPO.end_date) : 'No end date'}
                  </Text>
                </View>
                <View style={styles.poSummaryRow}>
                  <DollarSign size={14} color={colors.textSecondary} />
                  <Text style={[styles.poSummaryText, { color: colors.textSecondary }]}>
                    Original Estimate: {formatCurrency(selectedPO.total_amount)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Receipt size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Invoice Details</Text>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Invoice Number *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="Enter invoice number"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Invoice Date *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Invoice Amount *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={invoiceAmount}
                  onChangeText={setInvoiceAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Completion Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={serviceCompletionDate}
                onChangeText={setServiceCompletionDate}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {selectedPO && invoiceAmountNum > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                {variance > 0 ? (
                  <TrendingUp size={18} color="#EF4444" />
                ) : variance < 0 ? (
                  <TrendingDown size={18} color="#10B981" />
                ) : (
                  <DollarSign size={18} color="#F97316" />
                )}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Variance</Text>
              </View>

              <View style={[styles.varianceCard, { 
                backgroundColor: variance > 0 ? '#EF444410' : variance < 0 ? '#10B98110' : colors.backgroundTertiary,
                borderColor: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.border
              }]}>
                <View style={styles.varianceCardRow}>
                  <Text style={[styles.varianceCardLabel, { color: colors.textSecondary }]}>Estimated</Text>
                  <Text style={[styles.varianceCardValue, { color: colors.text }]}>{formatCurrency(originalEstimate)}</Text>
                </View>
                <View style={styles.varianceCardRow}>
                  <Text style={[styles.varianceCardLabel, { color: colors.textSecondary }]}>Actual</Text>
                  <Text style={[styles.varianceCardValue, { color: colors.text }]}>{formatCurrency(invoiceAmountNum)}</Text>
                </View>
                <View style={[styles.varianceCardDivider, { backgroundColor: variance > 0 ? '#EF444430' : variance < 0 ? '#10B98130' : colors.border }]} />
                <View style={styles.varianceCardRow}>
                  <Text style={[styles.varianceCardLabel, { color: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.text }]}>
                    {variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget'}
                  </Text>
                  <View style={styles.varianceCardTotals}>
                    <Text style={[styles.varianceCardAmount, { color: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.text }]}>
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    </Text>
                    <Text style={[styles.varianceCardPercent, { color: variance > 0 ? '#EF4444' : variance < 0 ? '#10B981' : colors.textSecondary }]}>
                      ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              </View>

              {Math.abs(variancePercent) > 10 && (
                <View style={styles.formField}>
                  <View style={styles.varianceReasonHeader}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    <Text style={[styles.fieldLabel, { color: '#F59E0B' }]}>Variance Reason Required (over 10%)</Text>
                  </View>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={varianceReason}
                    onChangeText={setVarianceReason}
                    placeholder="Explain the variance..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>

            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#F97316' }]}
              onPress={handleReview}
            >
              <FileText size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Review & Submit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPOPicker()}
      {renderReviewModal()}
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
  flowExplainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  flowExplainerContent: {
    flex: 1,
  },
  flowExplainerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  flowExplainerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorPlaceholder: {
    fontSize: 14,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedPOInfo: {
    flex: 1,
  },
  selectedPONumber: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  selectedPOVendor: {
    fontSize: 12,
    marginTop: 2,
  },
  poSummary: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  poSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poSummaryText: {
    fontSize: 12,
  },
  varianceCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  varianceCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  varianceCardLabel: {
    fontSize: 13,
  },
  varianceCardValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  varianceCardDivider: {
    height: 1,
    marginVertical: 8,
  },
  varianceCardTotals: {
    alignItems: 'flex-end',
  },
  varianceCardAmount: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  varianceCardPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  varianceReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  searchSection: {
    padding: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  infoBannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  poOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  poIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  poContent: {
    flex: 1,
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  poVendor: {
    fontSize: 13,
    marginTop: 2,
  },
  poMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  poType: {
    fontSize: 12,
  },
  poAmount: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  flowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  flowStep: {
    alignItems: 'center',
    gap: 6,
  },
  flowStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowStepText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  reviewCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reviewLabel: {
    fontSize: 13,
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 12,
  },
  varianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
  },
  varianceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  varianceValues: {
    alignItems: 'flex-end',
  },
  varianceAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  variancePercent: {
    fontSize: 12,
  },
  varianceReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  varianceReasonText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  approvalBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  approvalBoxContent: {
    flex: 1,
  },
  approvalBoxTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  approvalBoxText: {
    fontSize: 12,
  },
  approvalTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tierLabel: {
    fontSize: 14,
    flex: 1,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  thresholdNote: {
    fontSize: 11,
    marginTop: 10,
    fontStyle: 'italic' as const,
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
