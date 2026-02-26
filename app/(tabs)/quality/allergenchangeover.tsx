import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLocations } from '@/hooks/useLocations';
import * as Haptics from 'expo-haptics';
import TaskFeedPostLinker from '@/components/TaskFeedPostLinker';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';
import { supabase } from '@/lib/supabase';

// ============================================================
// PAPER FORM COLOR CONSTANTS (matches NCR pattern)
// ============================================================

const FORM_BORDER = '#B0B0B0';
const FORM_HEADER_BG = '#1a2332';
const SECTION_BG = '#D6EAF8';
const LABEL_BG = '#F5F6F7';
const WHITE = '#FFFFFF';
const PASS_GREEN = '#059669';
const FAIL_RED = '#dc2626';
const SLATE = '#64748b';
const MED_BLUE = '#355a7d';

// ============================================================
// PRODUCTION LINES (hardcoded until locations module supports lines)
// ============================================================

const PRODUCTION_LINES = [
  { value: 'Line 1', label: 'Line 1' },
  { value: 'Line 2', label: 'Line 2' },
  { value: 'Line NS', label: 'Line NS' },
  { value: 'Line 3', label: 'Line 3' },
];

// ============================================================
// CHECKLIST DEFINITIONS
// ============================================================

const DEPT_VERIFICATION_ITEMS = [
  { id: 'prod_cleared', label: 'PRODUCTION — Line stopped, LOTO applied, all product/WIP/rework cleared from area' },
  { id: 'san_cleaning', label: 'SANITATION — Equipment cleaning completed (cleaning log / equipment cleaning form attached)' },
  { id: 'san_preop', label: 'SANITATION — Pre-Op verification completed (pre-op form attached)' },
  { id: 'maint_reassembled', label: 'MAINTENANCE — Equipment reassembled, guards reinstalled, LOTO removed (if applicable)' },
];

const QA_VISUAL_ITEMS = [
  { id: 'contact_surfaces', label: 'All food contact surfaces visually clean — no residue, buildup, or allergen traces' },
  { id: 'gaskets_seals', label: 'Gaskets, seals, crevices, and dead spots inspected — no trapped product' },
  { id: 'non_contact', label: 'Non-food contact surfaces in production zone inspected' },
  { id: 'no_pooled_water', label: 'No pooled water, debris, or foreign materials in equipment cavities' },
  { id: 'utensils_tools', label: 'Utensils and tools cleaned / replaced / accounted for' },
];

const PREOP_LABEL_ITEMS = [
  { id: 'labels_verified', label: 'Packaging / labels verified for NEXT product — correct allergen declaration on label' },
  { id: 'metal_detector', label: 'Metal detector / X-ray functional and verified' },
  { id: 'first_article', label: 'First article sample collected and held for review' },
  { id: 'sanitizer_conc', label: 'Sanitizer concentration verified (test strip / titration result recorded)' },
];

// ============================================================
// PAPER CELL INPUT (memoized to prevent re-render focus loss)
// ============================================================

const PaperCellInput = React.memo(({ value, onChangeText, placeholder, multiline, keyboardType, style }: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  style?: any;
}) => (
  <TextInput
    style={[{ fontSize: 12, color: '#333', flex: 1, padding: 0, margin: 0 }, multiline && { minHeight: 56, textAlignVertical: 'top' as const }, style]}
    placeholder={placeholder || ''}
    placeholderTextColor="#AAAAAA"
    value={value}
    onChangeText={onChangeText}
    multiline={multiline}
    keyboardType={keyboardType || 'default'}
  />
));

// ============================================================
// TYPES
// ============================================================

type CheckStatus = 'none' | 'pass' | 'fail';

interface CheckItem {
  status: CheckStatus;
  initials: string;
}

interface SwabRow {
  location: string;
  surfaceType: string;
  testType: string;
  result: string;
  passFail: CheckStatus;
  initials: string;
}

interface AllergenFormData {
  // Section 1: Changeover Info
  date: string;
  timeInitiated: string;
  productionLine: string;
  previousProduct: string;
  allergensBeingRemoved: string;
  nextProduct: string;
  incomingAllergenStatus: string;
  changeoverInitiatedBy: string;

  // Section 2: Department Verification (keyed by item id)
  deptChecks: Record<string, CheckItem>;

  // Section 3: QA Visual Inspection
  visualChecks: Record<string, CheckItem>;

  // Section 4: Swab/ATP Results
  swabRows: SwabRow[];
  atpThreshold: string;
  swabKitLot: string;
  swabKitExpiry: string;
  allSwabsPass: 'yes' | 'no' | '';

  // Section 5: Pre-Op & Label Verification
  preopChecks: Record<string, CheckItem>;

  // Section 6: Release Decision
  decision: 'approved' | 'rejected' | '';
  rejectionReason: string;
}

// ============================================================
// INITIAL STATE
// ============================================================

const makeChecks = (items: { id: string }[]): Record<string, CheckItem> => {
  const out: Record<string, CheckItem> = {};
  items.forEach(i => { out[i.id] = { status: 'none', initials: '' }; });
  return out;
};

const emptySwabRow = (): SwabRow => ({
  location: '', surfaceType: '', testType: '', result: '', passFail: 'none', initials: '',
});

const INITIAL_FORM: AllergenFormData = {
  date: new Date().toISOString().split('T')[0],
  timeInitiated: '',
  productionLine: '',
  previousProduct: '',
  allergensBeingRemoved: '',
  nextProduct: '',
  incomingAllergenStatus: '',
  changeoverInitiatedBy: '',
  deptChecks: makeChecks(DEPT_VERIFICATION_ITEMS),
  visualChecks: makeChecks(QA_VISUAL_ITEMS),
  swabRows: [emptySwabRow(), emptySwabRow(), emptySwabRow(), emptySwabRow()],
  atpThreshold: '',
  swabKitLot: '',
  swabKitExpiry: '',
  allSwabsPass: '',
  preopChecks: makeChecks(PREOP_LABEL_ITEMS),
  decision: '',
  rejectionReason: '',
};

// ============================================================
// COMPONENT
// ============================================================

export default function AllergenChangeoverScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const { locations = [] } = useLocations();

  // Form state
  const [formData, setFormData] = useState<AllergenFormData>({ ...INITIAL_FORM, deptChecks: makeChecks(DEPT_VERIFICATION_ITEMS), visualChecks: makeChecks(QA_VISUAL_ITEMS), preopChecks: makeChecks(PREOP_LABEL_ITEMS), swabRows: [emptySwabRow(), emptySwabRow(), emptySwabRow(), emptySwabRow()] });
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Feed linking
  const [linkedPostId, setLinkedPostId] = useState<string | null>(null);
  const [linkedPostNumber, setLinkedPostNumber] = useState<string | null>(null);
  const linkFormMutation = useLinkFormToPost();

  // PPN Signature
  const [qaSignature, setQaSignature] = useState<SignatureVerification | null>(null);
  const [prodSignature, setProdSignature] = useState<SignatureVerification | null>(null);

  // Dropdown pickers
  const [showLinePicker, setShowLinePicker] = useState(false);

  // Location options from database
  const locationOptions = useMemo(() =>
    locations.filter((l: any) => l.is_active !== false).map((l: any) => ({
      value: l.name,
      label: `${l.name} (${l.location_code})`,
    })),
    [locations]
  );

  // ============================================================
  // HELPERS
  // ============================================================

  const updateForm = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateCheck = useCallback((section: 'deptChecks' | 'visualChecks' | 'preopChecks', itemId: string, field: 'status' | 'initials', value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [itemId]: { ...prev[section][itemId], [field]: value },
      },
    }));
  }, []);

  const updateSwabRow = useCallback((index: number, field: keyof SwabRow, value: any) => {
    setFormData(prev => {
      const rows = [...prev.swabRows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, swabRows: rows };
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      ...INITIAL_FORM,
      deptChecks: makeChecks(DEPT_VERIFICATION_ITEMS),
      visualChecks: makeChecks(QA_VISUAL_ITEMS),
      preopChecks: makeChecks(PREOP_LABEL_ITEMS),
      swabRows: [emptySwabRow(), emptySwabRow(), emptySwabRow(), emptySwabRow()],
    });
    setQaSignature(null);
    setProdSignature(null);
    setLinkedPostId(null);
    setLinkedPostNumber(null);
  }, []);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateForm = useCallback((): string | null => {
    // ── Section 1: Changeover Information (every cell required) ──
    if (!formData.date.trim()) return 'Date is required';
    if (!formData.timeInitiated.trim()) return 'Time Initiated is required';
    if (!formData.productionLine.trim()) return 'Production Line is required';
    if (!formData.previousProduct.trim()) return 'Previous Product is required (enter N/A if not applicable)';
    if (!formData.allergensBeingRemoved.trim()) return 'Allergens Being Removed is required (enter N/A if not applicable)';
    if (!formData.nextProduct.trim()) return 'Next Product is required (enter N/A if not applicable)';
    if (!formData.incomingAllergenStatus.trim()) return 'Incoming Allergen Status is required (enter N/A if not applicable)';
    if (!formData.changeoverInitiatedBy.trim()) return 'Changeover Initiated By is required (enter N/A if not applicable)';

    // ── Section 2: Department Completion Verification (every row: Pass/Fail + Initials) ──
    for (const item of DEPT_VERIFICATION_ITEMS) {
      const deptName = item.label.split('—')[0].trim();
      const check = formData.deptChecks[item.id];
      if (check.status === 'none') return `Dept Verification: ${deptName} — select Pass or Fail`;
      if (!check.initials.trim()) return `Dept Verification: ${deptName} — initials required`;
    }

    // ── Section 3: QA Visual Inspection (every row: Pass/Fail + Initials) ──
    for (let i = 0; i < QA_VISUAL_ITEMS.length; i++) {
      const item = QA_VISUAL_ITEMS[i];
      const check = formData.visualChecks[item.id];
      if (check.status === 'none') return `QA Visual Inspection row ${i + 1}: select Pass or Fail`;
      if (!check.initials.trim()) return `QA Visual Inspection row ${i + 1}: initials required`;
    }

    // ── Section 4: Swab/ATP Results (ALL 4 rows, EVERY cell) ──
    for (let i = 0; i < formData.swabRows.length; i++) {
      const row = formData.swabRows[i];
      const rowNum = i + 1;
      if (!row.location.trim()) return `Swab Row ${rowNum}: Swab Location is required (enter N/A if not applicable)`;
      if (!row.surfaceType.trim()) return `Swab Row ${rowNum}: Surface Type is required (enter N/A if not applicable)`;
      if (!row.testType.trim()) return `Swab Row ${rowNum}: Test Type is required (enter N/A if not applicable)`;
      if (!row.result.trim()) return `Swab Row ${rowNum}: Result is required (enter N/A if not applicable)`;
      if (row.passFail === 'none') return `Swab Row ${rowNum}: select Pass or Fail`;
      if (!row.initials.trim()) return `Swab Row ${rowNum}: initials required`;
    }

    if (!formData.atpThreshold.trim()) return 'ATP Pass Threshold (RLU) is required (enter N/A if not applicable)';
    if (!formData.swabKitLot.trim()) return 'Swab Kit Lot # is required (enter N/A if not applicable)';
    if (!formData.swabKitExpiry.trim()) return 'Swab Kit Expiry is required (enter N/A if not applicable)';
    if (!formData.allSwabsPass) return 'All Swabs Pass — select YES or NO';

    // ── Section 5: Pre-Op & Label Verification (every row: Pass/Fail + Initials) ──
    for (let i = 0; i < PREOP_LABEL_ITEMS.length; i++) {
      const item = PREOP_LABEL_ITEMS[i];
      const check = formData.preopChecks[item.id];
      if (check.status === 'none') return `Pre-Op Verification row ${i + 1}: select Pass or Fail`;
      if (!check.initials.trim()) return `Pre-Op Verification row ${i + 1}: initials required`;
    }

    // ── Section 6: Line Release Decision ──
    if (!formData.decision) return 'Release Decision — select APPROVED or REJECTED';
    if (formData.decision === 'rejected' && !formData.rejectionReason.trim()) return 'Rejection Reason / Corrective Action is required (enter N/A if not applicable)';

    // ── Signatures (both required) ──
    if (!isSignatureVerified(qaSignature)) return 'QA Release signature is required';
    if (!isSignatureVerified(prodSignature)) return 'Production Supervisor signature is required';

    return null;
  }, [formData, qaSignature, prodSignature]);

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = useCallback(async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsSubmitting(true);
    try {
      const formNumber = `ALC-${formData.date.replace(/-/g, '').slice(2)}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const { data: inserted, error: insertError } = await supabase
        .from('allergen_changeover_forms')
        .insert({
          form_number: formNumber,
          status: formData.decision === 'approved' ? 'completed' : 'requires_action',

          // Section 1: Changeover Information
          changeover_date: formData.date,
          time_initiated: formData.timeInitiated,
          production_line: formData.productionLine,
          previous_product: formData.previousProduct,
          allergens_removed: formData.allergensBeingRemoved,
          next_product: formData.nextProduct,
          incoming_allergen_status: formData.incomingAllergenStatus,
          changeover_initiated_by: formData.changeoverInitiatedBy,

          // Section 2: Department Completion Verification
          dept_prod_cleared_status: formData.deptChecks.prod_cleared.status,
          dept_prod_cleared_initials: formData.deptChecks.prod_cleared.initials,
          dept_san_cleaning_status: formData.deptChecks.san_cleaning.status,
          dept_san_cleaning_initials: formData.deptChecks.san_cleaning.initials,
          dept_san_preop_status: formData.deptChecks.san_preop.status,
          dept_san_preop_initials: formData.deptChecks.san_preop.initials,
          dept_maint_reassembled_status: formData.deptChecks.maint_reassembled.status,
          dept_maint_reassembled_initials: formData.deptChecks.maint_reassembled.initials,

          // Section 3: QA Visual Inspection
          visual_contact_surfaces_status: formData.visualChecks.contact_surfaces.status,
          visual_contact_surfaces_initials: formData.visualChecks.contact_surfaces.initials,
          visual_gaskets_seals_status: formData.visualChecks.gaskets_seals.status,
          visual_gaskets_seals_initials: formData.visualChecks.gaskets_seals.initials,
          visual_non_contact_status: formData.visualChecks.non_contact.status,
          visual_non_contact_initials: formData.visualChecks.non_contact.initials,
          visual_no_pooled_water_status: formData.visualChecks.no_pooled_water.status,
          visual_no_pooled_water_initials: formData.visualChecks.no_pooled_water.initials,
          visual_utensils_tools_status: formData.visualChecks.utensils_tools.status,
          visual_utensils_tools_initials: formData.visualChecks.utensils_tools.initials,

          // Section 4: Swab / ATP Results
          swab_1_location: formData.swabRows[0].location,
          swab_1_surface_type: formData.swabRows[0].surfaceType,
          swab_1_test_type: formData.swabRows[0].testType,
          swab_1_result: formData.swabRows[0].result,
          swab_1_pass_fail: formData.swabRows[0].passFail,
          swab_1_initials: formData.swabRows[0].initials,

          swab_2_location: formData.swabRows[1].location,
          swab_2_surface_type: formData.swabRows[1].surfaceType,
          swab_2_test_type: formData.swabRows[1].testType,
          swab_2_result: formData.swabRows[1].result,
          swab_2_pass_fail: formData.swabRows[1].passFail,
          swab_2_initials: formData.swabRows[1].initials,

          swab_3_location: formData.swabRows[2].location,
          swab_3_surface_type: formData.swabRows[2].surfaceType,
          swab_3_test_type: formData.swabRows[2].testType,
          swab_3_result: formData.swabRows[2].result,
          swab_3_pass_fail: formData.swabRows[2].passFail,
          swab_3_initials: formData.swabRows[2].initials,

          swab_4_location: formData.swabRows[3].location,
          swab_4_surface_type: formData.swabRows[3].surfaceType,
          swab_4_test_type: formData.swabRows[3].testType,
          swab_4_result: formData.swabRows[3].result,
          swab_4_pass_fail: formData.swabRows[3].passFail,
          swab_4_initials: formData.swabRows[3].initials,

          atp_threshold: formData.atpThreshold,
          swab_kit_lot: formData.swabKitLot,
          swab_kit_expiry: formData.swabKitExpiry,
          all_swabs_pass: formData.allSwabsPass,

          // Section 5: Pre-Op & Label Verification
          preop_labels_verified_status: formData.preopChecks.labels_verified.status,
          preop_labels_verified_initials: formData.preopChecks.labels_verified.initials,
          preop_metal_detector_status: formData.preopChecks.metal_detector.status,
          preop_metal_detector_initials: formData.preopChecks.metal_detector.initials,
          preop_first_article_status: formData.preopChecks.first_article.status,
          preop_first_article_initials: formData.preopChecks.first_article.initials,
          preop_sanitizer_conc_status: formData.preopChecks.sanitizer_conc.status,
          preop_sanitizer_conc_initials: formData.preopChecks.sanitizer_conc.initials,

          // Section 6: Decision
          decision: formData.decision,
          rejection_reason: formData.rejectionReason || null,

          // QA Signature (PPN)
          qa_name: qaSignature?.employeeName || null,
          qa_employee_id: qaSignature?.employeeId || null,
          qa_initials: qaSignature?.employeeInitials || null,
          qa_department_code: qaSignature?.departmentCode || null,
          qa_signature_stamp: qaSignature?.signatureStamp || null,
          qa_signed_at: qaSignature?.verifiedAt || null,
          qa_pin_verified: isSignatureVerified(qaSignature),

          // Production Supervisor Signature (PPN)
          prod_supervisor_name: prodSignature?.employeeName || null,
          prod_supervisor_id: prodSignature?.employeeId || null,
          prod_supervisor_initials: prodSignature?.employeeInitials || null,
          prod_supervisor_department_code: prodSignature?.departmentCode || null,
          prod_signature_stamp: prodSignature?.signatureStamp || null,
          prod_signed_at: prodSignature?.verifiedAt || null,
          prod_pin_verified: isSignatureVerified(prodSignature),

          // Organization & Audit
          organization_id: user?.organizationId || null,
          created_by: user?.id || null,
          created_by_name: user?.name || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Link to task feed post
      if (linkedPostId && linkedPostNumber) {
        try {
          await linkFormMutation.mutateAsync({
            postId: linkedPostId,
            postNumber: linkedPostNumber,
            formType: 'allergen_changeover',
            formId: inserted?.id || formNumber,
            formTitle: `Allergen Changeover - ${formData.productionLine}`,
            formNumber: formNumber,
          });
          console.log('[AllergenChangeover] Linked to post', linkedPostNumber);
        } catch (e) { console.warn('[AllergenChangeover] Link failed:', e); }
      }

      setShowForm(false);
      resetForm();
      Alert.alert('Success', `Allergen Changeover ${formNumber} submitted.\n\nDecision: ${formData.decision === 'approved' ? 'LINE RELEASED' : 'RE-CLEAN REQUIRED'}`);
    } catch (err: any) {
      console.error('[AllergenChangeover] Submit error:', err);
      Alert.alert('Error', err?.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, qaSignature, prodSignature, user, linkedPostId, linkedPostNumber, linkFormMutation, validateForm, resetForm]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  // Checklist row with PASS / FAIL / INITIALS
  const renderCheckRow = useCallback((
    section: 'deptChecks' | 'visualChecks' | 'preopChecks',
    item: { id: string; label: string },
    index: number,
  ) => {
    const check = formData[section][item.id];
    const stripe = index % 2 === 0;
    return (
      <View key={item.id} style={[p.checkRow, stripe && { backgroundColor: '#F8FAFC' }]}>
        <View style={p.checkLabelCol}>
          <Text style={p.checkLabel}>{item.label}</Text>
        </View>
        <View style={p.checkPassCol}>
          <Pressable
            style={[p.miniRadio, check.status === 'pass' && { backgroundColor: '#ECFDF5', borderColor: PASS_GREEN }]}
            onPress={() => updateCheck(section, item.id, 'status', check.status === 'pass' ? 'none' : 'pass')}
          >
            <Text style={[p.miniRadioText, check.status === 'pass' && { color: PASS_GREEN, fontWeight: '700' }]}>P</Text>
          </Pressable>
        </View>
        <View style={p.checkFailCol}>
          <Pressable
            style={[p.miniRadio, check.status === 'fail' && { backgroundColor: '#FEF2F2', borderColor: FAIL_RED }]}
            onPress={() => updateCheck(section, item.id, 'status', check.status === 'fail' ? 'none' : 'fail')}
          >
            <Text style={[p.miniRadioText, check.status === 'fail' && { color: FAIL_RED, fontWeight: '700' }]}>F</Text>
          </Pressable>
        </View>
        <View style={p.checkInitialsCol}>
          <TextInput
            style={p.initialsInput}
            value={check.initials}
            onChangeText={(t) => updateCheck(section, item.id, 'initials', t.toUpperCase().slice(0, 4))}
            placeholder="Init."
            placeholderTextColor="#CCC"
            maxLength={4}
            autoCapitalize="characters"
          />
        </View>
      </View>
    );
  }, [formData, updateCheck]);

  // Column headers for check sections
  const renderCheckHeaders = () => (
    <View style={p.checkHeaderRow}>
      <View style={p.checkLabelCol}><Text style={p.checkHeaderText}>Item</Text></View>
      <View style={p.checkPassCol}><Text style={[p.checkHeaderText, { textAlign: 'center' }]}>PASS</Text></View>
      <View style={p.checkFailCol}><Text style={[p.checkHeaderText, { textAlign: 'center' }]}>FAIL</Text></View>
      <View style={p.checkInitialsCol}><Text style={[p.checkHeaderText, { textAlign: 'center' }]}>INITIALS</Text></View>
    </View>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>

        {/* Page Header */}
        <View style={[s.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.iconCircle, { backgroundColor: MED_BLUE + '20' }]}>
            <AlertTriangle size={28} color={MED_BLUE} />
          </View>
          <Text style={[s.pageTitle, { color: colors.text }]}>Allergen Changeover</Text>
          <Text style={[s.pageSub, { color: colors.textSecondary }]}>Verification & Release Checklist</Text>
        </View>

        {/* New Form Button */}
        <Pressable
          style={[s.addBtn, { backgroundColor: MED_BLUE }]}
          onPress={() => setShowForm(true)}
        >
          <Plus size={20} color="#FFF" />
          <Text style={s.addBtnText}>New Allergen Changeover Form</Text>
        </Pressable>

        <View style={[s.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.infoText, { color: colors.textSecondary }]}>
            DOC ID: QA-ALC-001  |  SQF 2.8.1.4-2.8.1.6  |  FDA 21 CFR 117
          </Text>
          <Text style={[s.infoText, { color: colors.textSecondary, marginTop: 4 }]}>
            Quality Department use only. Each department attaches their own forms (Equipment Cleaning, ATP Swab Log, Pre-Op Verification) via Task Feed.
          </Text>
        </View>

      </ScrollView>

      {/* ============================================================ */}
      {/* FORM MODAL                                                    */}
      {/* ============================================================ */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[s.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowForm(false); resetForm(); }} disabled={isSubmitting}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>Allergen Changeover</Text>
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={MED_BLUE} />
              ) : (
                <Text style={[s.saveBtn, { color: MED_BLUE }]}>Submit</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

            {/* ===== TASK FEED POST LINKER ===== */}
            <TaskFeedPostLinker
              selectedPostId={linkedPostId}
              selectedPostNumber={linkedPostNumber}
              onPostSelected={(postId, postNumber) => {
                setLinkedPostId(postId);
                setLinkedPostNumber(postNumber);
              }}
              onPostCleared={() => {
                setLinkedPostId(null);
                setLinkedPostNumber(null);
              }}
            />

            {/* ===== PAPER FORM CONTAINER ===== */}
            <View style={p.form}>

              {/* Header Bar */}
              <View style={p.headerBar}>
                <View style={p.headerLeft}>
                  <View style={p.logoBadge}>
                    <Text style={p.logoText}>TulKenz</Text>
                    <Text style={[p.logoText, { fontSize: 6 }]}>OPS</Text>
                  </View>
                </View>
                <View style={p.headerRight}>
                  <Text style={p.headerMainTitle}>ALLERGEN CHANGEOVER</Text>
                  <Text style={p.headerSubTitle}>VERIFICATION & RELEASE</Text>
                </View>
                <View style={p.headerFarRight}>
                  <Text style={p.headerSmall}>DOC: QA-ALC-001</Text>
                  <Text style={p.headerSmall}>Rev: 1.0</Text>
                  <Text style={p.headerSmall}>SQF 2.8.1.4-2.8.1.6</Text>
                </View>
              </View>

              {/* Ref bar */}
              <View style={p.refBar}>
                <Text style={p.refText}>FDA 21 CFR 117 Preventive Controls  |  Quality Department Use</Text>
              </View>

              {/* ===== SECTION 1: CHANGEOVER INFORMATION ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>CHANGEOVER INFORMATION</Text>
              </View>

              {/* Row 1: Date / Time / Line */}
              <View style={p.tableRow}>
                <View style={[p.labelCell, { flex: 0.4 }]}><Text style={p.label}>Date</Text></View>
                <View style={[p.valueCell, { flex: 0.6 }]}>
                  <PaperCellInput value={formData.date} onChangeText={(t) => updateForm('date', t)} placeholder="YYYY-MM-DD" />
                </View>
                <View style={[p.labelCell, { flex: 0.5 }]}><Text style={p.label}>Time Initiated</Text></View>
                <View style={[p.valueCell, { flex: 0.5 }]}>
                  <PaperCellInput value={formData.timeInitiated} onChangeText={(t) => updateForm('timeInitiated', t)} placeholder="HH:MM" />
                </View>
                <View style={[p.labelCell, { flex: 0.5 }]}><Text style={p.label}>Production Line</Text></View>
                <View style={[p.valueCell, { flex: 0.6 }]}>
                  <Pressable style={p.dropdownBtn} onPress={() => setShowLinePicker(true)}>
                    <Text style={[p.dropdownText, !formData.productionLine && { color: '#AAA' }]}>
                      {formData.productionLine || 'Select...'}
                    </Text>
                    <ChevronDown size={14} color="#999" />
                  </Pressable>
                </View>
              </View>

              {/* Row 2: Previous Product / Allergens Being Removed */}
              <View style={p.tableRow}>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Previous Product{'\n'}(Name / Code)</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <PaperCellInput value={formData.previousProduct} onChangeText={(t) => updateForm('previousProduct', t)} placeholder="N/A" />
                </View>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Allergen(s) Being{'\n'}Removed</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <PaperCellInput value={formData.allergensBeingRemoved} onChangeText={(t) => updateForm('allergensBeingRemoved', t)} placeholder="N/A" />
                </View>
              </View>

              {/* Row 3: Next Product / Incoming Allergen Status */}
              <View style={p.tableRow}>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Next Product{'\n'}(Name / Code)</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <PaperCellInput value={formData.nextProduct} onChangeText={(t) => updateForm('nextProduct', t)} placeholder="N/A" />
                </View>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Incoming Allergen{'\n'}Status</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <PaperCellInput value={formData.incomingAllergenStatus} onChangeText={(t) => updateForm('incomingAllergenStatus', t)} placeholder="N/A" />
                </View>
              </View>

              {/* Row 4: Task Feed Post / Initiated By */}
              <View style={p.tableRow}>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Task Feed Post #{'\n'}(Link)</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <Text style={[p.cellValue, linkedPostNumber ? { color: MED_BLUE, fontWeight: '600' } : { color: '#AAA', fontStyle: 'italic' }]}>
                    {linkedPostNumber || 'Link via TaskFeed above'}
                  </Text>
                </View>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Changeover{'\n'}Initiated By</Text></View>
                <View style={[p.valueCell, { flex: 1 }]}>
                  <PaperCellInput value={formData.changeoverInitiatedBy} onChangeText={(t) => updateForm('changeoverInitiatedBy', t)} placeholder="N/A" />
                </View>
              </View>

              {/* ===== SECTION 2: DEPARTMENT COMPLETION VERIFICATION ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>DEPARTMENT COMPLETION VERIFICATION</Text>
              </View>
              <View style={p.sectionNote}>
                <Text style={p.sectionNoteText}>Confirm each department has completed and attached their forms to the Task Feed work order before proceeding.</Text>
              </View>
              {renderCheckHeaders()}
              {DEPT_VERIFICATION_ITEMS.map((item, i) => renderCheckRow('deptChecks', item, i))}

              {/* ===== SECTION 3: QA VISUAL INSPECTION ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>QA VISUAL INSPECTION</Text>
              </View>
              {renderCheckHeaders()}
              {QA_VISUAL_ITEMS.map((item, i) => renderCheckRow('visualChecks', item, i))}

              {/* ===== SECTION 4: ALLERGEN SWAB / ATP RESULTS REVIEW ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>ALLERGEN SWAB / ATP RESULTS REVIEW</Text>
              </View>
              <View style={p.sectionNote}>
                <Text style={p.sectionNoteText}>Record results from ATP/allergen swab testing. Full swab log attached separately via Task Feed.</Text>
              </View>

              {/* Swab table header */}
              <View style={p.swabHeaderRow}>
                <View style={[p.swabCell, { flex: 0.3 }]}><Text style={p.swabHeaderText}>#</Text></View>
                <View style={[p.swabCell, { flex: 1.2 }]}><Text style={p.swabHeaderText}>Swab Location</Text></View>
                <View style={[p.swabCell, { flex: 0.8 }]}><Text style={p.swabHeaderText}>Surface Type</Text></View>
                <View style={[p.swabCell, { flex: 0.7 }]}><Text style={p.swabHeaderText}>Test Type</Text></View>
                <View style={[p.swabCell, { flex: 0.6 }]}><Text style={p.swabHeaderText}>Result</Text></View>
                <View style={[p.swabCell, { flex: 0.5 }]}><Text style={p.swabHeaderText}>P/F</Text></View>
                <View style={[p.swabCell, { flex: 0.5, borderRightWidth: 0 }]}><Text style={p.swabHeaderText}>Init.</Text></View>
              </View>

              {/* Swab rows */}
              {formData.swabRows.map((row, i) => (
                <View key={i} style={[p.swabDataRow, i % 2 === 0 && { backgroundColor: '#F8FAFC' }]}>
                  <View style={[p.swabCell, { flex: 0.3 }]}><Text style={p.swabCellText}>{i + 1}</Text></View>
                  <View style={[p.swabCell, { flex: 1.2 }]}>
                    <TextInput style={p.swabInput} value={row.location} onChangeText={(t) => updateSwabRow(i, 'location', t)} placeholder="N/A" placeholderTextColor="#CCC" />
                  </View>
                  <View style={[p.swabCell, { flex: 0.8 }]}>
                    <TextInput style={p.swabInput} value={row.surfaceType} onChangeText={(t) => updateSwabRow(i, 'surfaceType', t)} placeholder="N/A" placeholderTextColor="#CCC" />
                  </View>
                  <View style={[p.swabCell, { flex: 0.7 }]}>
                    <TextInput style={p.swabInput} value={row.testType} onChangeText={(t) => updateSwabRow(i, 'testType', t)} placeholder="N/A" placeholderTextColor="#CCC" />
                  </View>
                  <View style={[p.swabCell, { flex: 0.6 }]}>
                    <TextInput style={p.swabInput} value={row.result} onChangeText={(t) => updateSwabRow(i, 'result', t)} placeholder="N/A" placeholderTextColor="#CCC" />
                  </View>
                  <View style={[p.swabCell, { flex: 0.5, flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' }]}>
                    <Pressable
                      style={[p.tinyRadio, row.passFail === 'pass' && { backgroundColor: '#ECFDF5', borderColor: PASS_GREEN }]}
                      onPress={() => updateSwabRow(i, 'passFail', row.passFail === 'pass' ? 'none' : 'pass')}
                    >
                      <Text style={[p.tinyRadioText, row.passFail === 'pass' && { color: PASS_GREEN }]}>P</Text>
                    </Pressable>
                    <Pressable
                      style={[p.tinyRadio, row.passFail === 'fail' && { backgroundColor: '#FEF2F2', borderColor: FAIL_RED }]}
                      onPress={() => updateSwabRow(i, 'passFail', row.passFail === 'fail' ? 'none' : 'fail')}
                    >
                      <Text style={[p.tinyRadioText, row.passFail === 'fail' && { color: FAIL_RED }]}>F</Text>
                    </Pressable>
                  </View>
                  <View style={[p.swabCell, { flex: 0.5, borderRightWidth: 0 }]}>
                    <TextInput style={p.swabInput} value={row.initials} onChangeText={(t) => updateSwabRow(i, 'initials', t.toUpperCase().slice(0, 4))} placeholder="N/A" placeholderTextColor="#CCC" maxLength={4} autoCapitalize="characters" />
                  </View>
                </View>
              ))}

              {/* ATP Threshold row */}
              <View style={[p.tableRow, { backgroundColor: '#E8F0FE' }]}>
                <View style={[p.labelCell, { flex: 0.7 }]}><Text style={[p.label, { fontWeight: '700' }]}>ATP Pass Threshold</Text></View>
                <View style={[p.valueCell, { flex: 0.5 }]}>
                  <PaperCellInput value={formData.atpThreshold} onChangeText={(t) => updateForm('atpThreshold', t)} placeholder="RLU" keyboardType="numeric" />
                </View>
                <View style={[p.labelCell, { flex: 0.6 }]}><Text style={p.label}>Swab Kit Lot #</Text></View>
                <View style={[p.valueCell, { flex: 0.6 }]}>
                  <PaperCellInput value={formData.swabKitLot} onChangeText={(t) => updateForm('swabKitLot', t)} placeholder="N/A" />
                </View>
                <View style={[p.labelCell, { flex: 0.4 }]}><Text style={p.label}>Expiry</Text></View>
                <View style={[p.valueCell, { flex: 0.5 }]}>
                  <PaperCellInput value={formData.swabKitExpiry} onChangeText={(t) => updateForm('swabKitExpiry', t)} placeholder="N/A" />
                </View>
              </View>

              {/* All Pass row */}
              <View style={[p.tableRow, { backgroundColor: '#E8F0FE' }]}>
                <View style={[p.labelCell, { flex: 1 }]}><Text style={[p.label, { fontWeight: '700' }]}>All Swabs Pass?</Text></View>
                <View style={[p.valueCell, { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                  <Pressable
                    style={[p.miniRadio, formData.allSwabsPass === 'yes' && { backgroundColor: '#ECFDF5', borderColor: PASS_GREEN }]}
                    onPress={() => updateForm('allSwabsPass', formData.allSwabsPass === 'yes' ? '' : 'yes')}
                  >
                    <Text style={[p.miniRadioText, formData.allSwabsPass === 'yes' && { color: PASS_GREEN, fontWeight: '700' }]}>YES</Text>
                  </Pressable>
                  <Pressable
                    style={[p.miniRadio, formData.allSwabsPass === 'no' && { backgroundColor: '#FEF2F2', borderColor: FAIL_RED }]}
                    onPress={() => updateForm('allSwabsPass', formData.allSwabsPass === 'no' ? '' : 'no')}
                  >
                    <Text style={[p.miniRadioText, formData.allSwabsPass === 'no' && { color: FAIL_RED, fontWeight: '700' }]}>NO</Text>
                  </Pressable>
                </View>
              </View>

              {/* ===== SECTION 5: PRE-OPERATIONAL & LABEL VERIFICATION ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>PRE-OPERATIONAL & LABEL VERIFICATION</Text>
              </View>
              {renderCheckHeaders()}
              {PREOP_LABEL_ITEMS.map((item, i) => renderCheckRow('preopChecks', item, i))}

              {/* ===== SECTION 6: LINE RELEASE DECISION ===== */}
              <View style={p.sectionRow}>
                <Text style={p.sectionTitle}>LINE RELEASE DECISION</Text>
              </View>

              <View style={p.decisionRow}>
                <Pressable
                  style={[p.decisionBtn, formData.decision === 'approved' && { backgroundColor: '#ECFDF5', borderColor: PASS_GREEN, borderWidth: 2 }]}
                  onPress={() => updateForm('decision', formData.decision === 'approved' ? '' : 'approved')}
                >
                  <CheckCircle size={18} color={formData.decision === 'approved' ? PASS_GREEN : '#CCC'} />
                  <Text style={[p.decisionText, formData.decision === 'approved' && { color: PASS_GREEN, fontWeight: '700' }]}>
                    APPROVED — Line Released for Production
                  </Text>
                </Pressable>

                <Pressable
                  style={[p.decisionBtn, formData.decision === 'rejected' && { backgroundColor: '#FEF2F2', borderColor: FAIL_RED, borderWidth: 2 }]}
                  onPress={() => updateForm('decision', formData.decision === 'rejected' ? '' : 'rejected')}
                >
                  <AlertTriangle size={18} color={formData.decision === 'rejected' ? FAIL_RED : '#CCC'} />
                  <Text style={[p.decisionText, formData.decision === 'rejected' && { color: FAIL_RED, fontWeight: '700' }]}>
                    REJECTED — Re-clean Required
                  </Text>
                </Pressable>
              </View>

              {/* Rejection reason (shown only if rejected) */}
              {formData.decision === 'rejected' && (
                <View style={p.tableRow}>
                  <View style={[p.labelCell, { flex: 0.5 }]}><Text style={[p.label, { color: FAIL_RED }]}>Reason / Corrective{'\n'}Action Required</Text></View>
                  <View style={[p.valueCell, { flex: 1 }]}>
                    <PaperCellInput value={formData.rejectionReason} onChangeText={(t) => updateForm('rejectionReason', t)} placeholder="N/A" multiline />
                  </View>
                </View>
              )}

              {/* ===== SIGN-OFF BLOCK ===== */}
              <View style={p.signOffBlock}>
                <Text style={p.signOffTitle}>QUALITY RELEASE SIGN-OFF (Required — Only Quality can release the production hold)</Text>

                <View style={p.signOffRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={p.signOffLabel}>QA Signature</Text>
                    <PinSignatureCapture
                      label="QA Release"
                      onVerified={setQaSignature}
                      verificationData={qaSignature}
                    />
                  </View>
                </View>

                <View style={p.signOffRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={p.signOffLabel}>Production Supervisor Signature</Text>
                    <PinSignatureCapture
                      label="Production Supervisor"
                      onVerified={setProdSignature}
                      verificationData={prodSignature}
                    />
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View style={p.formFooter}>
                <Text style={p.footerText}>Retain per Document Control SOP  |  Minimum 2 years  |  Generated by TulKenz OPS</Text>
              </View>

            </View>
            {/* END PAPER FORM */}

          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* PRODUCTION LINE PICKER MODAL                                  */}
      {/* ============================================================ */}
      <Modal visible={showLinePicker} transparent animationType="fade">
        <Pressable style={s.pickerOverlay} onPress={() => setShowLinePicker(false)}>
          <View style={[s.pickerSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.pickerTitle, { color: colors.text }]}>Select Production Line</Text>
            {PRODUCTION_LINES.map(line => (
              <Pressable
                key={line.value}
                style={[s.pickerItem, formData.productionLine === line.value && { backgroundColor: MED_BLUE + '15' }]}
                onPress={() => {
                  updateForm('productionLine', line.value);
                  setShowLinePicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[s.pickerItemText, { color: colors.text }]}>{line.label}</Text>
                {formData.productionLine === line.value && <CheckCircle size={18} color={MED_BLUE} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

// ============================================================
// PAPER FORM STYLES
// ============================================================

const p = StyleSheet.create({
  form: { borderWidth: 1, borderColor: FORM_BORDER, borderRadius: 4, overflow: 'hidden', marginTop: 12, backgroundColor: WHITE },

  // Header
  headerBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: FORM_BORDER, backgroundColor: FORM_HEADER_BG },
  headerLeft: { width: 70, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: FORM_BORDER, paddingVertical: 8 },
  logoBadge: { width: 50, height: 40, borderRadius: 6, backgroundColor: MED_BLUE, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  headerRight: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
  headerMainTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  headerSubTitle: { color: '#CBD5E1', fontSize: 11, fontWeight: '600', marginTop: 2 },
  headerFarRight: { width: 110, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#4A5568' },
  headerSmall: { fontSize: 8, color: '#CBD5E1', marginBottom: 1 },
  refBar: { backgroundColor: MED_BLUE, paddingHorizontal: 10, paddingVertical: 3 },
  refText: { color: '#FFF', fontSize: 7, letterSpacing: 0.2 },

  // Section
  sectionRow: { backgroundColor: '#2d3748', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: FORM_BORDER },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  sectionNote: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F0F6FB', borderBottomWidth: 1, borderBottomColor: FORM_BORDER },
  sectionNoteText: { fontSize: 9, color: SLATE },

  // Table rows (same as NCR)
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: FORM_BORDER, minHeight: 36 },
  labelCell: { backgroundColor: LABEL_BG, justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRightWidth: 1, borderRightColor: FORM_BORDER },
  label: { fontSize: 10, fontWeight: '600', color: '#444' },
  valueCell: { backgroundColor: WHITE, justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRightWidth: 1, borderRightColor: FORM_BORDER },
  cellValue: { fontSize: 11, color: '#333' },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  dropdownText: { fontSize: 12, color: '#333' },

  // Check rows (PASS/FAIL/INITIALS)
  checkHeaderRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderBottomWidth: 1, borderBottomColor: FORM_BORDER, paddingVertical: 4 },
  checkHeaderText: { fontSize: 8, fontWeight: '700', color: '#475569' },
  checkRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: FORM_BORDER, minHeight: 38, alignItems: 'center' },
  checkLabelCol: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  checkLabel: { fontSize: 10, color: '#333', lineHeight: 14 },
  checkPassCol: { width: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: FORM_BORDER },
  checkFailCol: { width: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: FORM_BORDER },
  checkInitialsCol: { width: 50, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: FORM_BORDER },

  miniRadio: { width: 24, height: 24, borderRadius: 4, borderWidth: 1, borderColor: FORM_BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  miniRadioText: { fontSize: 11, color: '#999', fontWeight: '500' },

  initialsInput: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: '#333', width: 40, paddingVertical: 2 },

  // Swab table
  swabHeaderRow: { flexDirection: 'row', backgroundColor: '#2d3748', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: FORM_BORDER },
  swabHeaderText: { fontSize: 8, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  swabDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: FORM_BORDER, minHeight: 32, alignItems: 'center' },
  swabCell: { paddingHorizontal: 4, paddingVertical: 2, borderRightWidth: 1, borderRightColor: FORM_BORDER, justifyContent: 'center' },
  swabCellText: { fontSize: 10, color: SLATE, textAlign: 'center' },
  swabInput: { fontSize: 10, color: '#333', textAlign: 'center', padding: 0 },

  tinyRadio: { width: 18, height: 18, borderRadius: 3, borderWidth: 1, borderColor: FORM_BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  tinyRadioText: { fontSize: 8, color: '#999', fontWeight: '600' },

  // Decision
  decisionRow: { flexDirection: 'row', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: FORM_BORDER },
  decisionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: FORM_BORDER, backgroundColor: WHITE },
  decisionText: { fontSize: 11, color: '#555', flex: 1 },

  // Sign-off block
  signOffBlock: { backgroundColor: '#E8F0FE', borderTopWidth: 1, borderTopColor: MED_BLUE, padding: 10 },
  signOffTitle: { fontSize: 10, fontWeight: '700', color: '#1a2332', marginBottom: 8 },
  signOffRow: { marginBottom: 8 },
  signOffLabel: { fontSize: 10, fontWeight: '600', color: '#444', marginBottom: 4 },

  // Footer
  formFooter: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: FORM_BORDER },
  footerText: { fontSize: 7, color: SLATE },
});

// ============================================================
// GENERAL PAGE STYLES
// ============================================================

const s = StyleSheet.create({
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  infoBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  infoText: { fontSize: 12, lineHeight: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  pickerSheet: { borderRadius: 16, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  pickerItemText: { fontSize: 15 },
});
