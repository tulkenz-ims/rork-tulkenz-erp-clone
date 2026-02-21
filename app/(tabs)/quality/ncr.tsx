import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  FileX,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  Clock,
  Camera,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Shield,
  Phone,
  Mail,
  Briefcase,
  ClipboardList,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseQuality, NCRRecord, NCRStatus, NCRSeverity, NCRSource, NCRType } from '@/hooks/useSupabaseQuality';
import * as Haptics from 'expo-haptics';
import TaskFeedPostLinker from '@/components/TaskFeedPostLinker';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';

// ============================================================
// CONFIGS
// ============================================================

const SEVERITY_CONFIG: Record<NCRSeverity, { label: string; color: string; bgColor: string }> = {
  minor: { label: 'Minor', color: '#F59E0B', bgColor: '#FEF3C7' },
  major: { label: 'Major', color: '#F97316', bgColor: '#FFF7ED' },
  critical: { label: 'Critical', color: '#EF4444', bgColor: '#FEF2F2' },
};

const STATUS_CONFIG: Record<NCRStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#3B82F6' },
  investigation: { label: 'Investigation', color: '#8B5CF6' },
  containment: { label: 'Containment', color: '#F59E0B' },
  root_cause: { label: 'Root Cause', color: '#EC4899' },
  corrective_action: { label: 'Corrective Action', color: '#F97316' },
  verification: { label: 'Verification', color: '#06B6D4' },
  closed: { label: 'Closed', color: '#10B981' },
  rejected: { label: 'Rejected', color: '#6B7280' },
};

const NCR_TYPES: { value: NCRType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'process', label: 'Process' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
  { value: 'regulatory', label: 'Regulatory' },
];

const NCR_SOURCES: { value: NCRSource; label: string }[] = [
  { value: 'incoming_inspection', label: 'Incoming Inspection' },
  { value: 'in_process', label: 'In-Process' },
  { value: 'final_inspection', label: 'Final Inspection' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'audit', label: 'Audit' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'internal', label: 'Internal' },
  { value: 'other', label: 'Other' },
];

const LOCATIONS = [
  'Production Floor', 'Warehouse', 'Receiving Dock', 'Shipping Dock',
  'Lab', 'Packaging', 'Cold Storage', 'Dry Storage', 'Office',
];

const NC_CATEGORIES = [
  'Foreign Material', 'Out of Spec', 'Damaged Product', 'Labeling Error',
  'Temperature Deviation', 'Weight Deviation', 'Contamination',
  'Equipment Failure', 'Process Deviation', 'Documentation Error',
  'Supplier Non-Conformance', 'Packaging Defect', 'Other',
];

// ============================================================
// COMPONENT
// ============================================================

export default function NCRScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const {
    ncrs = [],
    isLoadingNCRs,
    createNCR,
    updateNCR,
    generateNCRNumber,
    refetch,
  } = useSupabaseQuality();

  // List state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NCRStatus | ''>('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<NCRRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible sections in form
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    contractor: false,
    supplier: false,
    nonconformity: true,
    delay: false,
    signature: true,
  });

  // ============================================================
  // NEW PAPER FORM STATE
  // ============================================================
  const [formData, setFormData] = useState({
    // Section 1: General / Project
    title: '',
    ncr_type: 'product' as NCRType,
    severity: 'minor' as NCRSeverity,
    source: 'in_process' as NCRSource,
    location: '',
    project_package: '',
    item_component_no: '',
    specification_reference_no: '',
    product_name: '',
    lot_number: '',

    // Contractor
    contractor_location: '',
    contractor_person_in_charge: '',
    contractor_phone: '',
    contractor_email: '',

    // Supplier
    supplier_location: '',
    supplier_person_in_charge: '',
    supplier_phone: '',
    supplier_email: '',

    // Section 2: Non-Conformity Details
    description: '',
    non_conformity_category: '',
    recommendation_by_originator: '',
    containment_actions: '',

    // Time Delay
    project_time_delay: false,
    expected_delay_estimate: '',

    // Signature
    originator_name: '',
    originator_employee_id: '',
    originator_pin: '',
    originator_pin_verified: false,

    // Contractors Involved
    contractors_involved: [] as string[],
    contractors_involved_text: '',
  });

  // Task Feed linking
  const [linkedPostId, setLinkedPostId] = useState<string | null>(null);
  const [linkedPostNumber, setLinkedPostNumber] = useState<string | null>(null);
  const linkFormMutation = useLinkFormToPost();

  // ============================================================
  // HELPERS
  // ============================================================

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      ncr_type: 'product',
      severity: 'minor',
      source: 'in_process',
      location: '',
      project_package: '',
      item_component_no: '',
      specification_reference_no: '',
      product_name: '',
      lot_number: '',
      contractor_location: '',
      contractor_person_in_charge: '',
      contractor_phone: '',
      contractor_email: '',
      supplier_location: '',
      supplier_person_in_charge: '',
      supplier_phone: '',
      supplier_email: '',
      description: '',
      non_conformity_category: '',
      recommendation_by_originator: '',
      containment_actions: '',
      project_time_delay: false,
      expected_delay_estimate: '',
      originator_name: '',
      originator_employee_id: '',
      originator_pin: '',
      originator_pin_verified: false,
      contractors_involved: [],
      contractors_involved_text: '',
    });
    setLinkedPostId(null);
    setLinkedPostNumber(null);
    setExpandedSections({
      general: true,
      contractor: false,
      supplier: false,
      nonconformity: true,
      delay: false,
      signature: true,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredNCRs = useMemo(() => {
    return ncrs.filter(ncr => {
      const matchesSearch = !searchQuery || 
        ncr.ncr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ncr.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = !statusFilter || ncr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ncrs, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    open: ncrs.filter(n => n.status === 'open').length,
    investigation: ncrs.filter(n => n.status === 'investigation' || n.status === 'containment' || n.status === 'root_cause').length,
    corrective_action: ncrs.filter(n => n.status === 'corrective_action' || n.status === 'verification').length,
    closed: ncrs.filter(n => n.status === 'closed').length,
  }), [ncrs]);

  // ============================================================
  // SUBMIT NEW NCR (Paper Form)
  // ============================================================

  const handleAddNCR = useCallback(async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Required Fields', 'Title and Description of Non-Conformance are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ncrNumber = generateNCRNumber?.() || `NCR-${Date.now()}`;

      // Parse contractors involved from comma-separated text
      const contractorsArr = formData.contractors_involved_text
        ? formData.contractors_involved_text.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const ncrData: any = {
        ncr_number: ncrNumber,
        title: formData.title,
        description: formData.description,
        ncr_type: formData.ncr_type,
        severity: formData.severity,
        status: 'open' as NCRStatus,
        source: formData.source,
        location: formData.location || null,
        product_name: formData.product_name || null,
        lot_number: formData.lot_number || null,
        containment_actions: formData.containment_actions || null,
        discovered_date: new Date().toISOString().split('T')[0],
        discovered_by: user?.name || 'Unknown',
        discovered_by_id: user?.id || null,
        customer_notified: false,
        capa_required: false,
        attachments: [],

        // Paper form fields
        form_style: 'paper',
        form_version: '1.0',
        project_package: formData.project_package || null,
        item_component_no: formData.item_component_no || null,
        specification_reference_no: formData.specification_reference_no || null,
        contractor_location: formData.contractor_location || null,
        contractor_person_in_charge: formData.contractor_person_in_charge || null,
        contractor_phone: formData.contractor_phone || null,
        contractor_email: formData.contractor_email || null,
        supplier_location: formData.supplier_location || null,
        supplier_person_in_charge: formData.supplier_person_in_charge || null,
        supplier_phone: formData.supplier_phone || null,
        supplier_email: formData.supplier_email || null,
        non_conformity_category: formData.non_conformity_category || null,
        recommendation_by_originator: formData.recommendation_by_originator || null,
        project_time_delay: formData.project_time_delay,
        expected_delay_estimate: formData.expected_delay_estimate || null,
        photos_and_videos: [],
        originator_name: formData.originator_name || user?.name || null,
        originator_employee_id: formData.originator_employee_id || null,
        originator_signed_at: formData.originator_pin_verified ? new Date().toISOString() : null,
        originator_pin_verified: formData.originator_pin_verified,
        contractors_involved: contractorsArr,
        outcome_of_investigation: null,
      };

      await createNCR(ncrData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Link to task feed post if selected
      if (linkedPostId) {
        try {
          await linkFormMutation.mutateAsync({
            postId: linkedPostId,
            formType: 'ncr',
            formTitle: formData.title,
            formNumber: ncrNumber,
          });
        } catch (linkError) {
          console.warn('[NCR] Failed to link to task feed post:', linkError);
        }
      }

      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `NCR ${ncrNumber} created successfully.`);
    } catch (error: any) {
      console.error('[NCR] Create error:', error);
      Alert.alert('Error', error?.message || 'Failed to create NCR');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, createNCR, generateNCRNumber, user, linkedPostId, linkedPostNumber, linkFormMutation]);

  // ============================================================
  // STATUS CHANGE (for detail view)
  // ============================================================

  const handleStatusChange = useCallback(async (ncr: NCRRecord, newStatus: NCRStatus) => {
    if (ncr.status === newStatus) return;
    try {
      const updates: any = { id: ncr.id, status: newStatus };
      if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString().split('T')[0];
        updates.closed_by = user?.name || 'Unknown';
        updates.closed_by_id = user?.id || null;
      }
      await updateNCR(updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedNCR({ ...ncr, ...updates });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update status');
    }
  }, [updateNCR, user]);

  const handleViewNCR = useCallback((ncr: NCRRecord) => {
    setSelectedNCR(ncr);
    setShowDetailModal(true);
  }, []);

  // Check if NCR is old style (not paper form)
  const isOldStyle = (ncr: NCRRecord) => !ncr.form_style || ncr.form_style !== 'paper';

  // ============================================================
  // PIN VERIFICATION (simple mock - replace with real PIN check)
  // ============================================================

  const handleVerifyPin = () => {
    if (formData.originator_pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits.');
      return;
    }
    // In production, verify against employee record
    updateForm('originator_pin_verified', true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('PIN Verified', 'Signature accepted.');
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderSectionHeader = (title: string, key: string, icon: React.ReactNode) => (
    <Pressable
      style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => toggleSection(key)}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {expandedSections[key] ? (
        <ChevronUp size={20} color={colors.textSecondary} />
      ) : (
        <ChevronDown size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );

  const renderFormInput = (label: string, field: string, placeholder: string, opts?: {
    multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    required?: boolean;
  }) => (
    <View style={styles.formField}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>
        {label}{opts?.required ? ' *' : ''}
      </Text>
      <TextInput
        style={[
          opts?.multiline ? styles.textArea : styles.textInput,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={(formData as any)[field]}
        onChangeText={(text) => updateForm(field, text)}
        multiline={opts?.multiline}
        numberOfLines={opts?.multiline ? 4 : 1}
        textAlignVertical={opts?.multiline ? 'top' : 'center'}
        keyboardType={opts?.keyboardType || 'default'}
        autoCapitalize={opts?.keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );

  // ============================================================
  // DETAIL VIEW - renders different layout based on form_style
  // ============================================================

  const renderOldStyleDetail = (ncr: NCRRecord) => (
    <ScrollView style={styles.modalContent}>
      {/* Old style banner */}
      <View style={[styles.oldStyleBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
        <Lock size={16} color="#92400E" />
        <Text style={[styles.oldStyleBannerText, { color: '#92400E' }]}>
          Historical NCR — Read Only
        </Text>
      </View>

      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[ncr.status].color + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_CONFIG[ncr.status].color }]}>
              {STATUS_CONFIG[ncr.status].label}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Severity</Text>
          <View style={[styles.severityBadge, { backgroundColor: SEVERITY_CONFIG[ncr.severity].bgColor }]}>
            <Text style={[styles.severityText, { color: SEVERITY_CONFIG[ncr.severity].color }]}>
              {SEVERITY_CONFIG[ncr.severity].label}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {NCR_TYPES.find(t => t.value === ncr.ncr_type)?.label || ncr.ncr_type}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.discovered_date}</Text>
        </View>
        {ncr.source && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Source</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {NCR_SOURCES.find(s => s.value === ncr.source)?.label || ncr.source}
            </Text>
          </View>
        )}
        {ncr.location && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.location}</Text>
          </View>
        )}
        {ncr.product_name && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.product_name}</Text>
          </View>
        )}
        {ncr.lot_number && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Number</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.lot_number}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered By</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.discovered_by}</Text>
        </View>
        {ncr.assigned_to && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned To</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.assigned_to}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Title</Text>
      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.detailText, { color: colors.text }]}>{ncr.title}</Text>
      </View>

      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Description</Text>
      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.detailText, { color: colors.text }]}>{ncr.description}</Text>
      </View>

      {ncr.containment_actions && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Containment Actions</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.containment_actions}</Text>
          </View>
        </>
      )}

      {ncr.root_cause && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Root Cause</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.root_cause}</Text>
          </View>
        </>
      )}

      {ncr.corrective_actions && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Actions</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.corrective_actions}</Text>
          </View>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderPaperFormDetail = (ncr: NCRRecord) => (
    <ScrollView style={styles.modalContent}>
      {/* Status + Severity row */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[ncr.status].color + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_CONFIG[ncr.status].color }]}>
              {STATUS_CONFIG[ncr.status].label}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Severity</Text>
          <View style={[styles.severityBadge, { backgroundColor: SEVERITY_CONFIG[ncr.severity].bgColor }]}>
            <Text style={[styles.severityText, { color: SEVERITY_CONFIG[ncr.severity].color }]}>
              {SEVERITY_CONFIG[ncr.severity].label}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {NCR_TYPES.find(t => t.value === ncr.ncr_type)?.label || ncr.ncr_type}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.discovered_date}</Text>
        </View>
      </View>

      {/* Section 1: General / Project Info */}
      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>General Information</Text>
      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.detailText, { color: colors.text, fontWeight: '600', marginBottom: 4 }]}>{ncr.title}</Text>
        {ncr.project_package && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Project/Package</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.project_package}</Text>
          </View>
        )}
        {ncr.item_component_no && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Item/Component No.</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.item_component_no}</Text>
          </View>
        )}
        {ncr.specification_reference_no && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Spec/Reference No.</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.specification_reference_no}</Text>
          </View>
        )}
        {ncr.location && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.location}</Text>
          </View>
        )}
        {ncr.product_name && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.product_name}</Text>
          </View>
        )}
        {ncr.lot_number && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Number</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.lot_number}</Text>
          </View>
        )}
      </View>

      {/* Contractor Info */}
      {(ncr.contractor_person_in_charge || ncr.contractor_location) && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Contractor Information</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {ncr.contractor_location && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.contractor_location}</Text>
              </View>
            )}
            {ncr.contractor_person_in_charge && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Person in Charge</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.contractor_person_in_charge}</Text>
              </View>
            )}
            {ncr.contractor_phone && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.contractor_phone}</Text>
              </View>
            )}
            {ncr.contractor_email && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.contractor_email}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Supplier Info */}
      {(ncr.supplier_person_in_charge || ncr.supplier_location) && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Supplier Information</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {ncr.supplier_location && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.supplier_location}</Text>
              </View>
            )}
            {ncr.supplier_person_in_charge && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Person in Charge</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.supplier_person_in_charge}</Text>
              </View>
            )}
            {ncr.supplier_phone && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.supplier_phone}</Text>
              </View>
            )}
            {ncr.supplier_email && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.supplier_email}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Non-Conformity Details */}
      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Non-Conformity Details</Text>
      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {ncr.non_conformity_category && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.non_conformity_category}</Text>
          </View>
        )}
        <Text style={[styles.detailLabel, { color: colors.textSecondary, marginBottom: 4 }]}>Description</Text>
        <Text style={[styles.detailText, { color: colors.text }]}>{ncr.description}</Text>
      </View>

      {ncr.recommendation_by_originator && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Originator Recommendation</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.recommendation_by_originator}</Text>
          </View>
        </>
      )}

      {ncr.containment_actions && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Containment Actions</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.containment_actions}</Text>
          </View>
        </>
      )}

      {/* Time Delay */}
      {ncr.project_time_delay && (
        <View style={[styles.detailCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: '#991B1B' }]}>Project Time Delay</Text>
            <Text style={[styles.detailValue, { color: '#991B1B', fontWeight: '600' }]}>Yes</Text>
          </View>
          {ncr.expected_delay_estimate && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: '#991B1B' }]}>Estimated Delay</Text>
              <Text style={[styles.detailValue, { color: '#991B1B' }]}>{ncr.expected_delay_estimate}</Text>
            </View>
          )}
        </View>
      )}

      {/* Signature */}
      {ncr.originator_name && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Originator</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Name</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.originator_name}</Text>
            </View>
            {ncr.originator_employee_id && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Employee ID</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{ncr.originator_employee_id}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PIN Verified</Text>
              <Text style={[styles.detailValue, { color: ncr.originator_pin_verified ? '#10B981' : '#EF4444' }]}>
                {ncr.originator_pin_verified ? '✓ Verified' : '✗ Not Verified'}
              </Text>
            </View>
            {ncr.originator_signed_at && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Signed At</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(ncr.originator_signed_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Contractors Involved */}
      {ncr.contractors_involved && ncr.contractors_involved.length > 0 && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Contractors Involved</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {ncr.contractors_involved.map((c: string, i: number) => (
              <Text key={i} style={[styles.detailText, { color: colors.text }]}>• {c}</Text>
            ))}
          </View>
        </>
      )}

      {/* Response / Investigation */}
      {ncr.outcome_of_investigation && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Investigation Outcome</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.outcome_of_investigation}</Text>
          </View>
        </>
      )}

      {ncr.root_cause && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Root Cause</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.root_cause}</Text>
          </View>
        </>
      )}

      {ncr.corrective_actions && (
        <>
          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Actions</Text>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailText, { color: colors.text }]}>{ncr.corrective_actions}</Text>
          </View>
        </>
      )}

      {/* Update Status */}
      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Update Status</Text>
      <View style={styles.statusActions}>
        {(['open', 'investigation', 'containment', 'root_cause', 'corrective_action', 'verification', 'closed'] as NCRStatus[]).map(status => {
          const config = STATUS_CONFIG[status];
          const isActive = ncr.status === status;
          return (
            <Pressable
              key={status}
              style={[
                styles.statusAction,
                { 
                  borderColor: isActive ? config.color : colors.border,
                  backgroundColor: isActive ? config.color + '20' : colors.surface,
                },
              ]}
              onPress={() => handleStatusChange(ncr, status)}
            >
              <Text style={[styles.statusActionText, { color: isActive ? config.color : colors.text }]}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <AlertCircle size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Non-Conformance Reports</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {ncrs.length} total NCRs
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Open', value: stats.open, color: '#3B82F6' },
              { label: 'In Progress', value: stats.investigation, color: '#8B5CF6' },
              { label: 'Action', value: stats.corrective_action, color: '#F97316' },
              { label: 'Closed', value: stats.closed, color: '#10B981' },
            ].map(stat => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search NCRs..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Status Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterChip,
                { borderColor: !statusFilter ? colors.primary : colors.border },
                !statusFilter && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setStatusFilter('')}
            >
              <Text style={[styles.filterText, { color: !statusFilter ? colors.primary : colors.textSecondary }]}>All</Text>
            </Pressable>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <Pressable
                key={key}
                style={[
                  styles.filterChip,
                  { borderColor: statusFilter === key ? config.color : colors.border },
                  statusFilter === key && { backgroundColor: config.color + '15' },
                ]}
                onPress={() => setStatusFilter(key as NCRStatus)}
              >
                <Text style={[styles.filterText, { color: statusFilter === key ? config.color : colors.textSecondary }]}>
                  {config.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Add Button */}
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              resetForm();
              // Pre-fill originator name
              if (user?.name) {
                updateForm('originator_name', user.name);
              }
              setShowAddModal(true);
            }}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New NCR</Text>
          </Pressable>

          {/* NCR List */}
          {isLoadingNCRs ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : filteredNCRs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileX size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter ? 'No NCRs match your filters' : 'No NCRs yet'}
              </Text>
            </View>
          ) : (
            filteredNCRs.map(ncr => {
              const sevConfig = SEVERITY_CONFIG[ncr.severity];
              const statConfig = STATUS_CONFIG[ncr.status];
              const isOld = isOldStyle(ncr);

              return (
                <Pressable
                  key={ncr.id}
                  style={[styles.ncrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleViewNCR(ncr)}
                >
                  <View style={styles.ncrCardHeader}>
                    <View style={styles.ncrCardLeft}>
                      <View style={styles.ncrNumberRow}>
                        <Text style={[styles.ncrNumber, { color: colors.primary }]}>{ncr.ncr_number}</Text>
                        {isOld && (
                          <View style={[styles.oldBadge, { backgroundColor: '#F3F4F6' }]}>
                            <Lock size={10} color="#6B7280" />
                            <Text style={styles.oldBadgeText}>Legacy</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.ncrTitle, { color: colors.text }]} numberOfLines={1}>
                        {ncr.title}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textTertiary} />
                  </View>

                  <View style={styles.ncrCardFooter}>
                    <View style={[styles.severityBadge, { backgroundColor: sevConfig.bgColor }]}>
                      <Text style={[styles.severityText, { color: sevConfig.color }]}>{sevConfig.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statConfig.color + '20' }]}>
                      <Text style={[styles.statusText, { color: statConfig.color }]}>{statConfig.label}</Text>
                    </View>
                    <View style={styles.ncrMeta}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.ncrMetaText, { color: colors.textTertiary }]}>{ncr.discovered_date}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* NEW NCR MODAL (Paper Form) */}
      {/* ============================================================ */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New NCR</Text>
            <Pressable onPress={handleAddNCR} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Submit</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Task Feed Linking */}
            <TaskFeedPostLinker
              selectedPostId={linkedPostId}
              selectedPostNumber={linkedPostNumber}
              onSelect={(postId, postNumber) => {
                setLinkedPostId(postId);
                setLinkedPostNumber(postNumber);
              }}
              onClear={() => {
                setLinkedPostId(null);
                setLinkedPostNumber(null);
              }}
            />

            {/* ==================== SECTION: General Info ==================== */}
            {renderSectionHeader('General Information', 'general', <Info size={18} color={colors.primary} />)}
            {expandedSections.general && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                {renderFormInput('Title', 'title', 'Brief title for this NCR', { required: true })}

                <Text style={[styles.inputLabel, { color: colors.text }]}>NCR Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
                  {NCR_TYPES.map(type => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.optionButton,
                        { borderColor: formData.ncr_type === type.value ? colors.primary : colors.border },
                        formData.ncr_type === type.value && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => updateForm('ncr_type', type.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.ncr_type === type.value ? colors.primary : colors.text },
                      ]}>{type.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Source</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
                  {NCR_SOURCES.map(source => (
                    <Pressable
                      key={source.value}
                      style={[
                        styles.optionButton,
                        { borderColor: formData.source === source.value ? colors.primary : colors.border },
                        formData.source === source.value && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => updateForm('source', source.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.source === source.value ? colors.primary : colors.text },
                      ]}>{source.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Severity *</Text>
                <View style={styles.optionRow}>
                  {(['minor', 'major', 'critical'] as const).map(sev => {
                    const config = SEVERITY_CONFIG[sev];
                    return (
                      <Pressable
                        key={sev}
                        style={[
                          styles.severityOption,
                          { borderColor: formData.severity === sev ? config.color : colors.border },
                          formData.severity === sev && { backgroundColor: config.bgColor },
                        ]}
                        onPress={() => updateForm('severity', sev)}
                      >
                        <Text style={[
                          styles.optionText,
                          { color: formData.severity === sev ? config.color : colors.text },
                        ]}>{config.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
                  {LOCATIONS.map(loc => (
                    <Pressable
                      key={loc}
                      style={[
                        styles.optionButton,
                        { borderColor: formData.location === loc ? colors.primary : colors.border },
                        formData.location === loc && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => updateForm('location', loc)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.location === loc ? colors.primary : colors.text },
                      ]}>{loc}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {renderFormInput('Project / Package', 'project_package', 'Project or package reference')}
                {renderFormInput('Item / Component No.', 'item_component_no', 'Item or component number')}
                {renderFormInput('Specification / Reference No.', 'specification_reference_no', 'Spec or reference number')}
                {renderFormInput('Product Name', 'product_name', 'Affected product name')}
                {renderFormInput('Lot Number', 'lot_number', 'Affected lot number')}
              </View>
            )}

            {/* ==================== SECTION: Contractor ==================== */}
            {renderSectionHeader('Contractor Information', 'contractor', <Briefcase size={18} color={colors.primary} />)}
            {expandedSections.contractor && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                {renderFormInput('Contractor Location', 'contractor_location', 'Contractor site/location')}
                {renderFormInput('Person in Charge', 'contractor_person_in_charge', 'Contractor contact name')}
                {renderFormInput('Phone', 'contractor_phone', 'Phone number', { keyboardType: 'phone-pad' })}
                {renderFormInput('Email', 'contractor_email', 'Email address', { keyboardType: 'email-address' })}
              </View>
            )}

            {/* ==================== SECTION: Supplier ==================== */}
            {renderSectionHeader('Supplier Information', 'supplier', <ClipboardList size={18} color={colors.primary} />)}
            {expandedSections.supplier && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                {renderFormInput('Supplier Location', 'supplier_location', 'Supplier site/location')}
                {renderFormInput('Person in Charge', 'supplier_person_in_charge', 'Supplier contact name')}
                {renderFormInput('Phone', 'supplier_phone', 'Phone number', { keyboardType: 'phone-pad' })}
                {renderFormInput('Email', 'supplier_email', 'Email address', { keyboardType: 'email-address' })}
              </View>
            )}

            {/* ==================== SECTION: Non-Conformity Details ==================== */}
            {renderSectionHeader('Non-Conformity Details', 'nonconformity', <AlertTriangle size={18} color={colors.primary} />)}
            {expandedSections.nonconformity && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
                  {NC_CATEGORIES.map(cat => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.optionButton,
                        { borderColor: formData.non_conformity_category === cat ? colors.primary : colors.border },
                        formData.non_conformity_category === cat && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => updateForm('non_conformity_category', cat)}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.non_conformity_category === cat ? colors.primary : colors.text },
                      ]}>{cat}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {renderFormInput('Description of Non-Conformance', 'description', 'Describe the non-conformance in detail...', { multiline: true, required: true })}
                {renderFormInput('Recommendation by Originator', 'recommendation_by_originator', 'What do you recommend?', { multiline: true })}
                {renderFormInput('Containment Actions', 'containment_actions', 'What immediate containment actions were taken?', { multiline: true })}
                {renderFormInput('Contractors Involved', 'contractors_involved_text', 'Comma-separated list of contractors involved')}
              </View>
            )}

            {/* ==================== SECTION: Time Delay ==================== */}
            {renderSectionHeader('Project Time Delay', 'delay', <Clock size={18} color={colors.primary} />)}
            {expandedSections.delay && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0, flex: 1 }]}>
                    Will this cause a project time delay?
                  </Text>
                  <Switch
                    value={formData.project_time_delay}
                    onValueChange={(val) => updateForm('project_time_delay', val)}
                    trackColor={{ false: colors.border, true: colors.primary + '60' }}
                    thumbColor={formData.project_time_delay ? colors.primary : '#f4f3f4'}
                  />
                </View>
                {formData.project_time_delay && (
                  renderFormInput('Estimated Delay', 'expected_delay_estimate', 'e.g., 2 weeks, 3 days')
                )}
              </View>
            )}

            {/* ==================== SECTION: Signature ==================== */}
            {renderSectionHeader('Originator Signature', 'signature', <Shield size={18} color={colors.primary} />)}
            {expandedSections.signature && (
              <View style={[styles.sectionContent, { borderColor: colors.border }]}>
                {renderFormInput('Originator Name', 'originator_name', 'Your full name')}
                {renderFormInput('Employee ID', 'originator_employee_id', 'Your employee ID')}

                {!formData.originator_pin_verified ? (
                  <View style={styles.formField}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>PIN Signature</Text>
                    <View style={styles.pinRow}>
                      <TextInput
                        style={[styles.textInput, styles.pinInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        placeholder="Enter PIN"
                        placeholderTextColor={colors.textTertiary}
                        value={formData.originator_pin}
                        onChangeText={(text) => updateForm('originator_pin', text)}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={6}
                      />
                      <Pressable
                        style={[styles.verifyButton, { backgroundColor: colors.primary }]}
                        onPress={handleVerifyPin}
                      >
                        <Text style={styles.verifyButtonText}>Verify</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.verifiedBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <CheckCircle size={20} color="#059669" />
                    <Text style={[styles.verifiedText, { color: '#059669' }]}>
                      PIN Verified — Signature Accepted
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* DETAIL MODAL */}
      {/* ============================================================ */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedNCR?.ncr_number}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedNCR && (
            isOldStyle(selectedNCR) 
              ? renderOldStyleDetail(selectedNCR)
              : renderPaperFormDetail(selectedNCR)
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

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
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  ncrCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  ncrCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  ncrCardLeft: {
    flex: 1,
  },
  ncrNumberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ncrNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  ncrTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  oldBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oldBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  ncrCardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ncrMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginLeft: 'auto' as const,
  },
  ncrMetaText: {
    fontSize: 12,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
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

  // Form
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
    marginTop: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionContent: {
    borderLeftWidth: 2,
    marginLeft: 16,
    paddingLeft: 16,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 4,
  },
  formField: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
  },
  horizontalOptions: {
    marginBottom: 12,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  optionRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  pinRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  pinInput: {
    flex: 1,
  },
  verifyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center' as const,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  verifiedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },

  // Detail
  detailCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'right' as const,
    flex: 1,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  oldStyleBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  oldStyleBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statusActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  statusAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
