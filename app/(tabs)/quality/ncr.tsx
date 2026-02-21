import React, { useState, useCallback, useMemo } from 'react';
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
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseQuality, NCRRecord, NCRStatus, NCRSeverity, NCRSource, NCRType } from '@/hooks/useSupabaseQuality';
import * as Haptics from 'expo-haptics';
import TaskFeedPostLinker from '@/components/TaskFeedPostLinker';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';

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

// ============================================================
// PAPER FORM COLOR CONSTANTS
// ============================================================

const FORM_BORDER = '#B0B0B0';
const FORM_HEADER_BG = '#4A90A4';
const SECTION_BG = '#D6EAF8';
const LABEL_BG = '#F5F6F7';
const WHITE = '#FFFFFF';

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

  // ============================================================
  // PAPER FORM STATE
  // ============================================================
  const [formData, setFormData] = useState({
    ncr_type: 'product' as NCRType,
    severity: 'minor' as NCRSeverity,
    source: 'in_process' as NCRSource,

    // Section 1 — Project Information
    project_package: '',
    item_component_no: '',
    specification_reference_no: '',

    // Section 1 — Contractor Information
    contractor_location: '',
    contractor_person_in_charge: '',
    contractor_phone: '',
    contractor_email: '',

    // Section 1 — Supplier Information
    supplier_location: '',
    supplier_person_in_charge: '',
    supplier_phone: '',
    supplier_email: '',

    // Section 2 — Non-Conformity Details
    description: '',
    non_conformity_category: '',
    recommendation_by_originator: '',
    project_time_delay: false,
    expected_delay_estimate: '',

    // Contractors
    contractors_involved_text: '',

    // Section 3
    outcome_of_investigation: '',
  });

  // PPN Signature — uses the app-wide PinSignatureCapture component
  const [originatorSignature, setOriginatorSignature] = useState<SignatureVerification | null>(null);

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

  const resetForm = () => {
    setFormData({
      ncr_type: 'product', severity: 'minor', source: 'in_process',
      project_package: '', item_component_no: '', specification_reference_no: '',
      contractor_location: '', contractor_person_in_charge: '', contractor_phone: '', contractor_email: '',
      supplier_location: '', supplier_person_in_charge: '', supplier_phone: '', supplier_email: '',
      description: '', non_conformity_category: '', recommendation_by_originator: '',
      project_time_delay: false, expected_delay_estimate: '',
      contractors_involved_text: '', outcome_of_investigation: '',
    });
    setOriginatorSignature(null);
    setLinkedPostId(null);
    setLinkedPostNumber(null);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredNCRs = useMemo(() => {
    return ncrs.filter(ncr => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        ncr.ncr_number.toLowerCase().includes(q) ||
        ncr.description?.toLowerCase().includes(q) ||
        ncr.title?.toLowerCase().includes(q) ||
        (ncr.location?.toLowerCase().includes(q) ?? false);
      const matchesStatus = !statusFilter || ncr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ncrs, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    open: ncrs.filter(n => n.status === 'open').length,
    inProgress: ncrs.filter(n => ['investigation', 'containment', 'root_cause'].includes(n.status)).length,
    action: ncrs.filter(n => ['corrective_action', 'verification'].includes(n.status)).length,
    closed: ncrs.filter(n => n.status === 'closed').length,
  }), [ncrs]);

  const isOldStyle = (ncr: NCRRecord) => !ncr.form_style || ncr.form_style !== 'paper';

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = useCallback(async () => {
    if (!formData.description.trim()) {
      Alert.alert('Required', 'Description of non-conformity is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const ncrNumber = generateNCRNumber?.() || `NCR-${Date.now()}`;
      const contractorsArr = formData.contractors_involved_text
        ? formData.contractors_involved_text.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const title = formData.description.substring(0, 80) + (formData.description.length > 80 ? '...' : '');

      const ncrData: any = {
        ncr_number: ncrNumber,
        title,
        description: formData.description,
        ncr_type: formData.ncr_type,
        severity: formData.severity,
        status: 'open' as NCRStatus,
        source: formData.source,
        location: formData.contractor_location || null,
        product_name: null,
        lot_number: null,
        containment_actions: null,
        discovered_date: new Date().toISOString().split('T')[0],
        discovered_by: originatorSignature?.employeeName || user?.name || 'Unknown',
        discovered_by_id: originatorSignature?.employeeId || user?.id || null,
        customer_notified: false,
        capa_required: false,
        attachments: [],
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
        // PPN Signature fields
        originator_name: originatorSignature?.employeeName || user?.name || null,
        originator_employee_id: originatorSignature?.employeeId || null,
        originator_initials: originatorSignature?.employeeInitials || null,
        originator_department_code: originatorSignature?.departmentCode || null,
        originator_signature_stamp: originatorSignature?.signatureStamp || null,
        originator_signed_at: originatorSignature?.verifiedAt || null,
        originator_pin_verified: isSignatureVerified(originatorSignature),
        contractors_involved: contractorsArr,
        outcome_of_investigation: formData.outcome_of_investigation || null,
      };

      await createNCR(ncrData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (linkedPostId) {
        try {
          await linkFormMutation.mutateAsync({
            postId: linkedPostId,
            formType: 'ncr',
            formTitle: title,
            formNumber: ncrNumber,
          });
        } catch (e) { console.warn('[NCR] Link failed:', e); }
      }

      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `NCR ${ncrNumber} created.`);
    } catch (error: any) {
      console.error('[NCR] Create error:', error);
      Alert.alert('Error', error?.message || 'Failed to create NCR');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, originatorSignature, createNCR, generateNCRNumber, user, linkedPostId, linkFormMutation]);

  // ============================================================
  // STATUS CHANGE
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

  // ============================================================
  // PAPER FORM CELL HELPERS
  // ============================================================

  const CellInput = ({ field, placeholder, multiline, keyboardType }: {
    field: string; placeholder?: string; multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
  }) => (
    <TextInput
      style={[p.cellValue, { color: colors.text }, multiline && { minHeight: 56, textAlignVertical: 'top' }]}
      placeholder={placeholder || ''}
      placeholderTextColor="#AAAAAA"
      value={(formData as any)[field]}
      onChangeText={(text) => updateForm(field, text)}
      multiline={multiline}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
    />
  );

  const CellValue = ({ text }: { text: string }) => (
    <Text style={[p.cellValue, { color: colors.text }]}>{text || '\u2014'}</Text>
  );

  // ============================================================
  // PAPER FORM: CREATE (editable)
  // ============================================================

  const renderPaperForm = () => (
    <View style={p.form}>

      {/* ===== FORM HEADER ===== */}
      <View style={p.headerBar}>
        <View style={p.headerLeft}>
          <View style={p.logoBadge}>
            <Text style={p.logoText}>LOGO</Text>
          </View>
          <Text style={p.logoCaption}>YOUR LOGO GOES HERE</Text>
        </View>
        <View style={p.headerRight}>
          <View style={p.headerInfoRow}>
            <Text style={p.headerInfoLabel}>Organization:</Text>
            <Text style={p.headerInfoValue}>NextLN</Text>
          </View>
          <View style={p.headerInfoRow}>
            <Text style={p.headerInfoLabel}>Project:</Text>
            <Text style={p.headerInfoValue}>\u2014</Text>
          </View>
          <View style={p.headerInfoRow}>
            <Text style={p.headerInfoLabel}>Team:</Text>
            <Text style={p.headerInfoValue}>\u2014</Text>
          </View>
        </View>
        <View style={p.headerFarRight}>
          <Text style={p.headerSmall}>Template ID: DP-QUAL</Text>
          <Text style={p.headerSmall}>Version: 1.0</Text>
          <Text style={p.headerSmall}>{new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Title bar */}
      <View style={p.titleBar}>
        <Text style={p.titleText}>Non-Conformance Report (NCR)</Text>
      </View>

      {/* Auto form number */}
      <View style={p.autoNumRow}>
        <Text style={p.autoNumText}>Automated Form Number: auto-generated on submit</Text>
      </View>

      {/* ===== SECTION 1: General Information ===== */}
      <View style={p.sectionRow}>
        <Text style={p.sectionLabel}>Section 1:</Text>
        <Text style={p.sectionTitle}>General Information:</Text>
      </View>

      <View style={p.subHeaderRow}>
        <Text style={p.subHeaderLabel}>Project Information:</Text>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { flex: 0.7 }]}><Text style={p.label}>Package</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="project_package" /></View>
        <View style={[p.labelCell, { flex: 1.2 }]}><Text style={p.label}>Item / Component No:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="item_component_no" /></View>
        <View style={[p.labelCell, { flex: 1.3 }]}><Text style={p.label}>Specification Reference No:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="specification_reference_no" /></View>
      </View>

      <View style={p.subHeaderRow}><Text style={p.subHeaderLabel}>Contractor Information:</Text></View>
      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Location:</Text></View>
        <View style={[p.valueCell, { flex: 1.2 }]}><CellInput field="contractor_location" /></View>
        <View style={[p.labelCell, { width: 95 }]}><Text style={p.label}>Person in charge:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="contractor_person_in_charge" /></View>
        <View style={[p.labelCell, { width: 50 }]}><Text style={p.label}>Phone:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="contractor_phone" keyboardType="phone-pad" /></View>
        <View style={[p.labelCell, { width: 45 }]}><Text style={p.label}>Email:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="contractor_email" keyboardType="email-address" /></View>
      </View>

      <View style={p.subHeaderRow}><Text style={p.subHeaderLabel}>Supplier Information:</Text></View>
      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Location:</Text></View>
        <View style={[p.valueCell, { flex: 1.2 }]}><CellInput field="supplier_location" /></View>
        <View style={[p.labelCell, { width: 95 }]}><Text style={p.label}>Person in charge:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="supplier_person_in_charge" /></View>
        <View style={[p.labelCell, { width: 50 }]}><Text style={p.label}>Phone:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="supplier_phone" keyboardType="phone-pad" /></View>
        <View style={[p.labelCell, { width: 45 }]}><Text style={p.label}>Email:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="supplier_email" keyboardType="email-address" /></View>
      </View>

      {/* ===== SECTION 2: Non-Conformity Details ===== */}
      <View style={p.sectionRow}>
        <Text style={p.sectionLabel}>Section 2:</Text>
        <Text style={p.sectionTitle}>Non-Conformity Details:</Text>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Description of{'\n'}non-conformity</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="description" placeholder="Describe the non-conformance..." multiline /></View>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Photos and{'\n'}videos</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><Text style={[p.cellValue, { color: '#AAAAAA', fontStyle: 'italic' }]}>Photo upload coming soon</Text></View>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Non-{'\n'}Conformity{'\n'}Category</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="non_conformity_category" /></View>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Recommend-{'\n'}ation by{'\n'}Originator:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="recommendation_by_originator" multiline /></View>
      </View>

      {/* Time delay question */}
      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Question:</Text></View>
        <View style={[p.valueCell, { flex: 1, flexDirection: 'column' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[p.cellValue, { marginRight: 8 }]}>Is there a project time delay caused by non-conformance?</Text>
            <Pressable style={[p.radioBox, formData.project_time_delay && p.radioBoxActive]} onPress={() => updateForm('project_time_delay', true)}>
              <Text style={[p.radioText, formData.project_time_delay && p.radioTextActive]}>Yes</Text>
            </Pressable>
            <Pressable style={[p.radioBox, !formData.project_time_delay && p.radioBoxActiveNo]} onPress={() => updateForm('project_time_delay', false)}>
              <Text style={[p.radioText, !formData.project_time_delay && p.radioTextActive]}>No</Text>
            </Pressable>
          </View>
          {formData.project_time_delay && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={[p.label, { marginRight: 6 }]}>If yes, expected estimate:</Text>
              <TextInput
                style={[p.inlineInput, { color: colors.text }]}
                placeholder="e.g. 1 day"
                placeholderTextColor="#AAAAAA"
                value={formData.expected_delay_estimate}
                onChangeText={(t) => updateForm('expected_delay_estimate', t)}
              />
            </View>
          )}
        </View>
      </View>

      {/* ===== ORIGINATOR SIGNATURE — PPN via PinSignatureCapture ===== */}
      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Originator{'\n'}Signature</Text></View>
        <View style={[p.valueCell, { flex: 1, paddingVertical: 8 }]}>
          <PinSignatureCapture
            onVerified={(verification) => setOriginatorSignature(verification)}
            onCleared={() => setOriginatorSignature(null)}
            formLabel="NCR \u2014 Originator Signature"
            existingVerification={originatorSignature}
            required={true}
            accentColor="#4A90A4"
          />
        </View>
      </View>

      {/* Select contractors involved */}
      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Select{'\n'}contractors{'\n'}involved:</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="contractors_involved_text" placeholder="Comma-separated names" /></View>
      </View>

      {/* ===== SECTION 3: Response by contractors ===== */}
      <View style={p.sectionRow}>
        <Text style={p.sectionLabel}>Section 3:</Text>
        <Text style={p.sectionTitle}>Response by contractors involved:</Text>
      </View>

      <View style={p.tableRow}>
        <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Outcome of{'\n'}investigation{'\n'}into cause of{'\n'}non-{'\n'}conformance</Text></View>
        <View style={[p.valueCell, { flex: 1 }]}><CellInput field="outcome_of_investigation" multiline /></View>
      </View>
    </View>
  );

  // ============================================================
  // PAPER FORM: DETAIL VIEW (read-only)
  // ============================================================

  const renderPaperDetail = (ncr: NCRRecord) => {
    // Rebuild a SignatureVerification object from stored fields for display
    const existingSig: SignatureVerification | null = ncr.originator_pin_verified && ncr.originator_signature_stamp
      ? {
          employeeId: ncr.originator_employee_id || '',
          employeeName: ncr.originator_name || '',
          employeeInitials: ncr.originator_initials || '',
          departmentCode: ncr.originator_department_code || '',
          signatureStamp: ncr.originator_signature_stamp,
          verifiedAt: ncr.originator_signed_at || '',
        }
      : null;

    return (
      <ScrollView style={s.modalContent}>
        <View style={p.form}>

          {/* Header */}
          <View style={p.headerBar}>
            <View style={p.headerLeft}>
              <View style={p.logoBadge}><Text style={p.logoText}>LOGO</Text></View>
              <Text style={p.logoCaption}>YOUR LOGO GOES HERE</Text>
            </View>
            <View style={p.headerRight}>
              <View style={p.headerInfoRow}><Text style={p.headerInfoLabel}>Organization:</Text><Text style={p.headerInfoValue}>NextLN</Text></View>
              <View style={p.headerInfoRow}><Text style={p.headerInfoLabel}>NCR Number:</Text><Text style={p.headerInfoValue}>{ncr.ncr_number}</Text></View>
            </View>
            <View style={p.headerFarRight}>
              <Text style={p.headerSmall}>Form Style: Paper</Text>
              <Text style={p.headerSmall}>Version: {ncr.form_version || '1.0'}</Text>
              <Text style={p.headerSmall}>{ncr.discovered_date}</Text>
            </View>
          </View>

          <View style={p.titleBar}><Text style={p.titleText}>Non-Conformance Report (NCR)</Text></View>
          <View style={p.autoNumRow}><Text style={p.autoNumText}>Automated Form Number: {ncr.ncr_number}</Text></View>

          {/* Status + Severity badges */}
          <View style={{ flexDirection: 'row', padding: 8, gap: 8, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: FORM_BORDER }}>
            <View style={[s.badge, { backgroundColor: STATUS_CONFIG[ncr.status].color + '20' }]}>
              <Text style={[s.badgeText, { color: STATUS_CONFIG[ncr.status].color }]}>{STATUS_CONFIG[ncr.status].label}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: SEVERITY_CONFIG[ncr.severity].bgColor }]}>
              <Text style={[s.badgeText, { color: SEVERITY_CONFIG[ncr.severity].color }]}>{SEVERITY_CONFIG[ncr.severity].label}</Text>
            </View>
          </View>

          {/* Section 1 */}
          <View style={p.sectionRow}><Text style={p.sectionLabel}>Section 1:</Text><Text style={p.sectionTitle}>General Information:</Text></View>
          <View style={p.subHeaderRow}><Text style={p.subHeaderLabel}>Project Information:</Text></View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { flex: 0.7 }]}><Text style={p.label}>Package</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.project_package || ''} /></View>
            <View style={[p.labelCell, { flex: 1.2 }]}><Text style={p.label}>Item / Component No:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.item_component_no || ''} /></View>
            <View style={[p.labelCell, { flex: 1.3 }]}><Text style={p.label}>Specification Ref No:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.specification_reference_no || ''} /></View>
          </View>

          <View style={p.subHeaderRow}><Text style={p.subHeaderLabel}>Contractor Information:</Text></View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Location:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.contractor_location || ''} /></View>
            <View style={[p.labelCell, { width: 95 }]}><Text style={p.label}>Person in charge:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.contractor_person_in_charge || ''} /></View>
            <View style={[p.labelCell, { width: 50 }]}><Text style={p.label}>Phone:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.contractor_phone || ''} /></View>
            <View style={[p.labelCell, { width: 45 }]}><Text style={p.label}>Email:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.contractor_email || ''} /></View>
          </View>

          <View style={p.subHeaderRow}><Text style={p.subHeaderLabel}>Supplier Information:</Text></View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Location:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.supplier_location || ''} /></View>
            <View style={[p.labelCell, { width: 95 }]}><Text style={p.label}>Person in charge:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.supplier_person_in_charge || ''} /></View>
            <View style={[p.labelCell, { width: 50 }]}><Text style={p.label}>Phone:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.supplier_phone || ''} /></View>
            <View style={[p.labelCell, { width: 45 }]}><Text style={p.label}>Email:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.supplier_email || ''} /></View>
          </View>

          {/* Section 2 */}
          <View style={p.sectionRow}><Text style={p.sectionLabel}>Section 2:</Text><Text style={p.sectionTitle}>Non-Conformity Details:</Text></View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Description of{'\n'}non-conformity</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.description || ''} /></View>
          </View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Photos and{'\n'}videos</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><Text style={[p.cellValue, { color: '#888', fontStyle: 'italic' }]}>{ncr.photos_and_videos?.length ? `${ncr.photos_and_videos.length} attached` : 'None'}</Text></View>
          </View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Non-{'\n'}Conformity{'\n'}Category</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.non_conformity_category || ''} /></View>
          </View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Recommend-{'\n'}ation by{'\n'}Originator:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.recommendation_by_originator || ''} /></View>
          </View>

          {/* Time delay */}
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 65 }]}><Text style={p.label}>Question:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}>
              <Text style={p.cellValue}>
                Is there a project time delay caused by non-conformance?{'  '}
                <Text style={{ fontWeight: '700' }}>{ncr.project_time_delay ? 'Yes' : 'No'}</Text>
                {ncr.project_time_delay && ncr.expected_delay_estimate ? `\nIf yes, expected estimate: ${ncr.expected_delay_estimate}` : ''}
              </Text>
            </View>
          </View>

          {/* Originator Signature — shows the PPN stamp read-only */}
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Originator{'\n'}Signature</Text></View>
            <View style={[p.valueCell, { flex: 1, paddingVertical: 8 }]}>
              {existingSig ? (
                <PinSignatureCapture
                  onVerified={() => {}}
                  formLabel="NCR \u2014 Originator Signature"
                  existingVerification={existingSig}
                  accentColor="#4A90A4"
                />
              ) : ncr.originator_signature_stamp ? (
                <View style={p.stampRow}>
                  <CheckCircle size={14} color="#059669" />
                  <Text style={p.stampText}>{ncr.originator_signature_stamp}</Text>
                </View>
              ) : (
                <Text style={[p.cellValue, { color: '#EF4444' }]}>Not signed</Text>
              )}
            </View>
          </View>

          {/* Contractors involved */}
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Select{'\n'}contractors{'\n'}involved:</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.contractors_involved?.join(', ') || ''} /></View>
          </View>

          {/* Section 3 */}
          <View style={p.sectionRow}><Text style={p.sectionLabel}>Section 3:</Text><Text style={p.sectionTitle}>Response by contractors involved:</Text></View>
          <View style={p.tableRow}>
            <View style={[p.labelCell, { width: 120 }]}><Text style={p.label}>Outcome of{'\n'}investigation{'\n'}into cause of{'\n'}non-{'\n'}conformance</Text></View>
            <View style={[p.valueCell, { flex: 1 }]}><CellValue text={ncr.outcome_of_investigation || ''} /></View>
          </View>
        </View>

        {/* Status update */}
        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 16 }]}>Update Status</Text>
        <View style={s.statusRow}>
          {(['open', 'investigation', 'containment', 'root_cause', 'corrective_action', 'verification', 'closed'] as NCRStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const active = ncr.status === status;
            return (
              <Pressable key={status} style={[s.statusChip, { borderColor: active ? cfg.color : colors.border }, active && { backgroundColor: cfg.color + '20' }]} onPress={() => handleStatusChange(ncr, status)}>
                <Text style={[s.statusChipText, { color: active ? cfg.color : colors.text }]}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ============================================================
  // OLD-STYLE DETAIL (read-only, locked)
  // ============================================================

  const renderOldDetail = (ncr: NCRRecord) => (
    <ScrollView style={s.modalContent}>
      <View style={[s.banner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
        <Lock size={16} color="#92400E" />
        <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>Historical NCR \u2014 Read Only</Text>
      </View>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Status</Text><View style={[s.badge, { backgroundColor: STATUS_CONFIG[ncr.status].color + '20' }]}><Text style={[s.badgeText, { color: STATUS_CONFIG[ncr.status].color }]}>{STATUS_CONFIG[ncr.status].label}</Text></View></View>
        <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Severity</Text><View style={[s.badge, { backgroundColor: SEVERITY_CONFIG[ncr.severity].bgColor }]}><Text style={[s.badgeText, { color: SEVERITY_CONFIG[ncr.severity].color }]}>{SEVERITY_CONFIG[ncr.severity].label}</Text></View></View>
        <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Type</Text><Text style={[s.detailValue, { color: colors.text }]}>{NCR_TYPES.find(t => t.value === ncr.ncr_type)?.label || ncr.ncr_type}</Text></View>
        <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Date</Text><Text style={[s.detailValue, { color: colors.text }]}>{ncr.discovered_date}</Text></View>
        {ncr.location && <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Location</Text><Text style={[s.detailValue, { color: colors.text }]}>{ncr.location}</Text></View>}
        <View style={s.detailRow}><Text style={[s.detailLabel, { color: colors.textSecondary }]}>Discovered By</Text><Text style={[s.detailValue, { color: colors.text }]}>{ncr.discovered_by}</Text></View>
      </View>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Title</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.cardText, { color: colors.text }]}>{ncr.title}</Text></View>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Description</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.cardText, { color: colors.text }]}>{ncr.description}</Text></View>
      {ncr.containment_actions && (<><Text style={[s.sectionTitle, { color: colors.text }]}>Containment Actions</Text><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.cardText, { color: colors.text }]}>{ncr.containment_actions}</Text></View></>)}
      {ncr.root_cause && (<><Text style={[s.sectionTitle, { color: colors.text }]}>Root Cause</Text><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.cardText, { color: colors.text }]}>{ncr.root_cause}</Text></View></>)}
      {ncr.corrective_actions && (<><Text style={[s.sectionTitle, { color: colors.text }]}>Corrective Actions</Text><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.cardText, { color: colors.text }]}>{ncr.corrective_actions}</Text></View></>)}
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={s.content}>

          {/* Page Header */}
          <View style={[s.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.iconCircle, { backgroundColor: colors.primary + '15' }]}><AlertCircle size={28} color={colors.primary} /></View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Non-Conformance Reports</Text>
            <Text style={[s.pageSub, { color: colors.textSecondary }]}>{ncrs.length} total NCRs</Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Open', val: stats.open, c: '#3B82F6' },
              { label: 'In Progress', val: stats.inProgress, c: '#8B5CF6' },
              { label: 'Action', val: stats.action, c: '#F97316' },
              { label: 'Closed', val: stats.closed, c: '#10B981' },
            ].map(st => (
              <View key={st.label} style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.statVal, { color: st.c }]}>{st.val}</Text>
                <Text style={[s.statLbl, { color: colors.textSecondary }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Search */}
          <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput style={[s.searchInput, { color: colors.text }]} placeholder="Search NCRs..." placeholderTextColor={colors.textTertiary} value={searchQuery} onChangeText={setSearchQuery} />
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
            <Pressable style={[s.filterChip, { borderColor: !statusFilter ? colors.primary : colors.border }, !statusFilter && { backgroundColor: colors.primary + '15' }]} onPress={() => setStatusFilter('')}>
              <Text style={[s.filterText, { color: !statusFilter ? colors.primary : colors.textSecondary }]}>All</Text>
            </Pressable>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <Pressable key={key} style={[s.filterChip, { borderColor: statusFilter === key ? cfg.color : colors.border }, statusFilter === key && { backgroundColor: cfg.color + '15' }]} onPress={() => setStatusFilter(key as NCRStatus)}>
                <Text style={[s.filterText, { color: statusFilter === key ? cfg.color : colors.textSecondary }]}>{cfg.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* New NCR button */}
          <Pressable style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { resetForm(); setOriginatorSignature(null); setShowAddModal(true); }}>
            <Plus size={20} color="#FFF" />
            <Text style={s.addBtnText}>New NCR</Text>
          </Pressable>

          {/* List */}
          {isLoadingNCRs ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : filteredNCRs.length === 0 ? (
            <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileX size={48} color={colors.textTertiary} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>{searchQuery || statusFilter ? 'No NCRs match filters' : 'No NCRs yet'}</Text>
            </View>
          ) : (
            filteredNCRs.map(ncr => {
              const sev = SEVERITY_CONFIG[ncr.severity];
              const stat = STATUS_CONFIG[ncr.status];
              const old = isOldStyle(ncr);
              return (
                <Pressable key={ncr.id} style={[s.ncrCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setSelectedNCR(ncr); setShowDetailModal(true); }}>
                  <View style={s.ncrRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[s.ncrNum, { color: colors.primary }]}>{ncr.ncr_number}</Text>
                        {old && <View style={s.legacyBadge}><Lock size={10} color="#6B7280" /><Text style={s.legacyText}>Legacy</Text></View>}
                      </View>
                      <Text style={[s.ncrTitle, { color: colors.text }]} numberOfLines={1}>{ncr.title}</Text>
                    </View>
                    <ChevronRight size={20} color={colors.textTertiary} />
                  </View>
                  <View style={s.ncrFoot}>
                    <View style={[s.badge, { backgroundColor: sev.bgColor }]}><Text style={[s.badgeText, { color: sev.color }]}>{sev.label}</Text></View>
                    <View style={[s.badge, { backgroundColor: stat.color + '20' }]}><Text style={[s.badgeText, { color: stat.color }]}>{stat.label}</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}><Calendar size={12} color={colors.textTertiary} /><Text style={{ fontSize: 12, color: colors.textTertiary }}>{ncr.discovered_date}</Text></View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===== NEW NCR MODAL ===== */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>New NCR</Text>
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[s.saveBtn, { color: colors.primary }]}>Submit</Text>}
            </Pressable>
          </View>
          <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">
            <TaskFeedPostLinker
              selectedPostId={linkedPostId}
              selectedPostNumber={linkedPostNumber}
              onSelect={(id, num) => { setLinkedPostId(id); setLinkedPostNumber(num); }}
              onClear={() => { setLinkedPostId(null); setLinkedPostNumber(null); }}
            />

            {/* Severity + Type */}
            <View style={[s.metaBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.metaLabel, { color: colors.textSecondary }]}>Severity</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {(['minor', 'major', 'critical'] as const).map(sv => {
                    const cfg = SEVERITY_CONFIG[sv];
                    return (
                      <Pressable key={sv} style={[s.metaChip, { borderColor: formData.severity === sv ? cfg.color : colors.border }, formData.severity === sv && { backgroundColor: cfg.bgColor }]} onPress={() => updateForm('severity', sv)}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: formData.severity === sv ? cfg.color : colors.text }}>{cfg.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.metaLabel, { color: colors.textSecondary }]}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {NCR_TYPES.map(t => (
                    <Pressable key={t.value} style={[s.metaChip, { borderColor: formData.ncr_type === t.value ? colors.primary : colors.border, marginRight: 6 }, formData.ncr_type === t.value && { backgroundColor: colors.primary + '15' }]} onPress={() => updateForm('ncr_type', t.value)}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: formData.ncr_type === t.value ? colors.primary : colors.text }}>{t.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {renderPaperForm()}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== DETAIL MODAL ===== */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>{selectedNCR?.ncr_number}</Text>
            <View style={{ width: 40 }} />
          </View>
          {selectedNCR && (isOldStyle(selectedNCR) ? renderOldDetail(selectedNCR) : renderPaperDetail(selectedNCR))}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// PAPER FORM STYLES
// ============================================================

const p = StyleSheet.create({
  form: {
    borderWidth: 1,
    borderColor: FORM_BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: WHITE,
  },
  headerBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    backgroundColor: WHITE,
  },
  headerLeft: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
    paddingVertical: 8,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#4A90A4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  logoCaption: { fontSize: 7, color: '#888', marginTop: 2, textAlign: 'center' },
  headerRight: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
  },
  headerInfoRow: { flexDirection: 'row', marginBottom: 2 },
  headerInfoLabel: { fontSize: 10, fontWeight: '600', color: '#555', width: 80 },
  headerInfoValue: { fontSize: 10, color: '#333', flex: 1 },
  headerFarRight: {
    width: 110,
    paddingHorizontal: 6,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  headerSmall: { fontSize: 9, color: '#777', marginBottom: 1 },
  titleBar: {
    backgroundColor: FORM_HEADER_BG,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  autoNumRow: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    backgroundColor: '#FAFAFA',
  },
  autoNumText: { fontSize: 10, color: '#777' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECTION_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    gap: 6,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#1B4F72' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#1B4F72' },
  subHeaderRow: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    backgroundColor: '#F0F6FB',
  },
  subHeaderLabel: { fontSize: 11, fontWeight: '600', color: '#2C3E50', fontStyle: 'italic' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    minHeight: 36,
  },
  labelCell: {
    backgroundColor: LABEL_BG,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
  },
  valueCell: {
    backgroundColor: WHITE,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
  },
  cellValue: {
    fontSize: 12,
    color: '#333',
  },
  radioBox: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: FORM_BORDER,
    marginLeft: 6,
    backgroundColor: WHITE,
  },
  radioBoxActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  radioBoxActiveNo: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  radioText: { fontSize: 12, color: '#555' },
  radioTextActive: { fontWeight: '700', color: '#111' },
  inlineInput: {
    fontSize: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  stampText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
});

// ============================================================
// GENERAL / LIST STYLES
// ============================================================

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 },
  filterScroll: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterText: { fontSize: 13, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 15, marginTop: 12 },
  ncrCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 10 },
  ncrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  ncrNum: { fontSize: 14, fontWeight: '700' },
  ncrTitle: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  legacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F3F4F6' },
  legacyText: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  ncrFoot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  metaBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 12, gap: 12, marginTop: 8 },
  metaLabel: { fontSize: 12, fontWeight: '600' },
  metaChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardText: { fontSize: 14, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '500', textAlign: 'right', flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  statusChipText: { fontSize: 13, fontWeight: '500' },
});
