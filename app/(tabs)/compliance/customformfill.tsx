// app/(tabs)/compliance/customformfill.tsx
// Universal form fill screen — renders any custom form template
// PAPER FORM STYLING — matches printed PDF layout exactly
// Reads templateId from route params, loads schema, renders fields, submits to custom_form_submissions

import React, { useState, useCallback, useMemo, memo } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  X,
  Plus,
  CheckCircle,
  ChevronDown,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import TaskFeedPostLinker from '@/components/TaskFeedPostLinker';
import { useLinkFormToPost } from '@/hooks/useTaskFeedFormLinks';
import PinSignatureCapture, { isSignatureVerified } from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';
import {
  useCustomFormTemplate,
  useFormSubmissions,
  useSubmitCustomForm,
  CustomFormField,
  CustomFormSection,
  CustomFormSignature,
} from '@/hooks/useCustomForms';

// ── Paper Form Colors ─────────────────────────────────────────

const DARK_HEADER = '#1E293B';
const SECTION_BAR = '#334155';
const BORDER = '#94A3B8';
const LABEL_BG = '#F1F5F9';
const COL_HDR_BG = '#E2E8F0';
const WHITE = '#FFFFFF';
const GREEN = '#10B981';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const PURPLE = '#8B5CF6';

// ── Memoized Paper Cell Input ─────────────────────────────────

const PaperCellInput = memo(({ value, onChangeText, placeholder, maxLength, autoCapitalize, keyboardType, multiline, style }: any) => (
  <TextInput
    style={[p.cellInput, style]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder || ''}
    placeholderTextColor="#BBB"
    maxLength={maxLength}
    autoCapitalize={autoCapitalize}
    keyboardType={keyboardType}
    multiline={multiline}
  />
));

// ── Component ──────────────────────────────────────────────────

export default function CustomFormFillScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string }>();

  // Load template
  const { data: template, isLoading: loadingTemplate } = useCustomFormTemplate(params.templateId);
  const schema = template?.formSchema;

  // Load submissions history
  const { data: submissions = [], isLoading: loadingSubs, refetch: refetchSubs } =
    useFormSubmissions(template?.templateCode);

  const submitMutation = useSubmitCustomForm();
  const linkFormMutation = useLinkFormToPost();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [signatures, setSignatures] = useState<Record<string, SignatureVerification | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Feed linking
  const [linkedPostId, setLinkedPostId] = useState<string | null>(null);
  const [linkedPostNumber, setLinkedPostNumber] = useState<string | null>(null);

  // Dropdown picker
  const [pickerField, setPickerField] = useState<CustomFormField | null>(null);

  // ── Helpers ──────────────────────────────────────────────────

  const updateValue = useCallback((fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormValues({});
    setSignatures({});
    setLinkedPostId(null);
    setLinkedPostNumber(null);
  }, []);

  // ── Validation ───────────────────────────────────────────────

  const validateForm = useCallback((): string | null => {
    if (!schema) return 'No form schema loaded';

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (!field.required) continue;
        if (field.fieldType === 'label') continue;

        const val = formValues[field.id];

        if (field.fieldType === 'checkbox') {
          if (!val || (Array.isArray(val) && val.length === 0)) {
            return `"${field.label}" in "${section.title}" is required`;
          }
        } else if (field.fieldType === 'pass_fail') {
          if (!val || val === 'none') {
            return `"${field.label}" in "${section.title}" — select Pass, Fail, or N/A`;
          }
          const initials = formValues[`${field.id}_initials`];
          if (!initials || !initials.trim()) {
            return `"${field.label}" in "${section.title}" — initials required`;
          }
        } else {
          if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
            return `"${field.label}" in "${section.title}" is required (enter N/A if not applicable)`;
          }
        }
      }
    }

    for (const sig of schema.signatures) {
      if (sig.required && !isSignatureVerified(signatures[sig.id])) {
        return `"${sig.label}" signature is required`;
      }
    }

    return null;
  }, [schema, formValues, signatures]);

  // ── Submit ───────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const error = validateForm();
    if (error) { Alert.alert('Validation Error', error); return; }
    if (!template || !schema) return;

    setIsSubmitting(true);
    try {
      const sigArray = schema.signatures.map(sig => ({
        id: sig.id,
        label: sig.label,
        ...signatures[sig.id],
      }));

      const result = await submitMutation.mutateAsync({
        templateId: template.id,
        templateCode: template.templateCode,
        templateVersion: template.version,
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        formData: formValues,
        signatures: sigArray,
        status: 'submitted',
        linkedPostId: linkedPostId || undefined,
        linkedPostNumber: linkedPostNumber || undefined,
      });

      if (linkedPostId && linkedPostNumber && result) {
        try {
          await linkFormMutation.mutateAsync({
            postId: linkedPostId,
            postNumber: linkedPostNumber,
            formType: template.templateCode,
            formId: result.id,
            formNumber: result.formNumber,
            formTitle: template.name,
            departmentCode: template.departmentCode || '1004',
            departmentName: 'Quality',
          });
        } catch (e) { console.warn('[CustomFormFill] Link failed:', e); }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      resetForm();
      refetchSubs();
      Alert.alert('Success', `${template.name} submitted successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  }, [template, schema, formValues, signatures, linkedPostId, linkedPostNumber, submitMutation, linkFormMutation, validateForm, resetForm, refetchSubs]);

  // ── Detect checklist sections (3+ pass_fail fields) ─────────

  const isSectionChecklist = useCallback((section: CustomFormSection): boolean => {
    return section.fields.filter(f => f.fieldType === 'pass_fail').length >= 3;
  }, []);

  // ── Render: Info Fields (label/value table rows) ────────────

  const renderInfoFields = useCallback((fields: CustomFormField[]) => {
    const rows: CustomFormField[][] = [];
    let currentRow: CustomFormField[] = [];
    let currentWidth = 0;

    for (const field of fields) {
      const fw = field.width === 'third' ? 1 / 3 : field.width === 'half' ? 1 / 2 : 1;
      if (currentWidth + fw > 1.01) {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [field];
        currentWidth = fw;
      } else {
        currentRow.push(field);
        currentWidth += fw;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);

    return rows.map((row, rowIdx) => (
      <View key={`info-row-${rowIdx}`} style={p.tableRow}>
        {row.map(field => {
          const flex = field.width === 'third' ? 0.33 : field.width === 'half' ? 0.5 : 1;
          return (
            <View key={field.id} style={{ flex, flexDirection: 'row' }}>
              <View style={[p.labelCell, { flex: 0.45 }]}>
                <Text style={p.label}>{field.label}</Text>
              </View>
              <View style={[p.valueCell, { flex: 0.55 }]}>
                {renderInfoInput(field)}
              </View>
            </View>
          );
        })}
      </View>
    ));
  }, [formValues]);

  const renderInfoInput = useCallback((field: CustomFormField) => {
    const val = formValues[field.id] || '';

    switch (field.fieldType) {
      case 'label':
        return <Text style={p.instructionText}>{field.label}</Text>;

      case 'dropdown':
        return (
          <Pressable style={p.dropdownBtn} onPress={() => setPickerField(field)}>
            <Text style={[p.dropdownText, !val && { color: '#AAA' }]}>
              {val ? (field.options?.find(o => o.value === val)?.label || val) : 'Select...'}
            </Text>
            <ChevronDown size={12} color="#999" />
          </Pressable>
        );

      case 'radio':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingVertical: 2 }}>
            {(field.options || []).map(opt => (
              <Pressable
                key={opt.value}
                style={[p.radioBtn, val === opt.value && { backgroundColor: BLUE + '15', borderColor: BLUE }]}
                onPress={() => updateValue(field.id, opt.value)}
              >
                <Text style={[p.radioText, val === opt.value && { color: BLUE }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        );

      case 'checkbox':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingVertical: 2 }}>
            {(field.options || []).map(opt => {
              const checked = Array.isArray(val) && val.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[p.radioBtn, checked && { backgroundColor: GREEN + '15', borderColor: GREEN }]}
                  onPress={() => {
                    const current = Array.isArray(val) ? val : [];
                    updateValue(field.id, checked ? current.filter((v: string) => v !== opt.value) : [...current, opt.value]);
                  }}
                >
                  <Text style={[p.radioText, checked && { color: GREEN }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        );

      case 'number':
        return <PaperCellInput value={val} onChangeText={(t: string) => updateValue(field.id, t)} placeholder={field.placeholder || '0'} keyboardType="numeric" />;

      case 'text_area':
        return <PaperCellInput value={val} onChangeText={(t: string) => updateValue(field.id, t)} placeholder={field.placeholder || 'N/A'} multiline style={{ minHeight: 40 }} />;

      default:
        return <PaperCellInput value={val} onChangeText={(t: string) => updateValue(field.id, t)} placeholder={field.placeholder || 'N/A'} />;
    }
  }, [formValues, updateValue]);

  // ── Render: Checklist Table (pass/fail rows like PDF) ───────

  const renderChecklistTable = useCallback((fields: CustomFormField[]) => {
    const pfFields = fields.filter(f => f.fieldType === 'pass_fail');
    const otherFields = fields.filter(f => f.fieldType !== 'pass_fail');

    return (
      <>
        {otherFields.length > 0 && renderInfoFields(otherFields)}

        {/* Column Headers — identical to PDF */}
        <View style={p.checkHeaderRow}>
          <View style={[p.checkHeaderCell, { flex: 1 }]}>
            <Text style={p.checkHeaderText}>CHECK ITEM</Text>
          </View>
          <View style={[p.checkHeaderCell, { width: 40, alignItems: 'center' }]}>
            <Text style={p.checkHeaderText}>PASS</Text>
          </View>
          <View style={[p.checkHeaderCell, { width: 40, alignItems: 'center' }]}>
            <Text style={p.checkHeaderText}>FAIL</Text>
          </View>
          <View style={[p.checkHeaderCell, { width: 40, alignItems: 'center' }]}>
            <Text style={p.checkHeaderText}>N/A</Text>
          </View>
          <View style={[p.checkHeaderCell, { width: 60, alignItems: 'center' }]}>
            <Text style={p.checkHeaderText}>INITIALS</Text>
          </View>
        </View>

        {/* Checklist Rows */}
        {pfFields.map((field, idx) => {
          const val = formValues[field.id] || 'none';
          const initials = formValues[`${field.id}_initials`] || '';
          return (
            <View key={field.id} style={[p.checkRow, idx % 2 === 0 && { backgroundColor: '#FAFBFC' }]}>
              {/* Item text */}
              <View style={[p.checkItemCell, { flex: 1 }]}>
                <Text style={p.checkItemText}>{field.label}</Text>
              </View>
              {/* PASS checkbox */}
              <Pressable
                style={[p.checkBoxCell, { width: 40 }, val === 'pass' && { backgroundColor: '#ECFDF5' }]}
                onPress={() => { updateValue(field.id, val === 'pass' ? 'none' : 'pass'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                {val === 'pass' ? (
                  <Text style={[p.checkMark, { color: GREEN }]}>✓</Text>
                ) : (
                  <View style={p.emptyCheckBox} />
                )}
              </Pressable>
              {/* FAIL checkbox */}
              <Pressable
                style={[p.checkBoxCell, { width: 40 }, val === 'fail' && { backgroundColor: '#FEF2F2' }]}
                onPress={() => { updateValue(field.id, val === 'fail' ? 'none' : 'fail'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                {val === 'fail' ? (
                  <Text style={[p.checkMark, { color: RED }]}>✗</Text>
                ) : (
                  <View style={p.emptyCheckBox} />
                )}
              </Pressable>
              {/* N/A checkbox */}
              <Pressable
                style={[p.checkBoxCell, { width: 40 }, val === 'na' && { backgroundColor: '#F0F9FF' }]}
                onPress={() => { updateValue(field.id, val === 'na' ? 'none' : 'na'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                {val === 'na' ? (
                  <Text style={[p.checkMark, { color: BLUE }]}>—</Text>
                ) : (
                  <View style={p.emptyCheckBox} />
                )}
              </Pressable>
              {/* Initials */}
              <View style={[p.checkInitialsCell, { width: 60 }]}>
                <TextInput
                  style={p.initialsInput}
                  value={initials}
                  onChangeText={(t) => updateValue(`${field.id}_initials`, t.toUpperCase().slice(0, 4))}
                  placeholder="——"
                  placeholderTextColor="#CCC"
                  maxLength={4}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          );
        })}
      </>
    );
  }, [formValues, updateValue, renderInfoFields]);

  // ── Loading / Error States ───────────────────────────────────

  if (loadingTemplate) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={[{ marginTop: 12, color: colors.textSecondary }]}>Loading template...</Text>
      </SafeAreaView>
    );
  }

  if (!template || !schema) {
    return (
      <SafeAreaView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }, { backgroundColor: colors.background }]}>
        <FileText size={48} color={colors.textSecondary} />
        <Text style={[{ fontSize: 18, fontWeight: '600', marginTop: 16, color: colors.text }]}>Template Not Found</Text>
        <Text style={[{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          This form template may have been deleted or is not available.
        </Text>
      </SafeAreaView>
    );
  }

  // ── Main Render ──────────────────────────────────────────────

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loadingSubs} onRefresh={refetchSubs} tintColor={PURPLE} />}
      >
        {/* Header Card */}
        <View style={[s.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.pageTitle, { color: colors.text }]}>{template.name}</Text>
          <Text style={[s.pageSub, { color: colors.textSecondary }]}>
            {template.templateCode}  •  v{template.version}
          </Text>
          {schema.complianceRefs && schema.complianceRefs.length > 0 && (
            <Text style={[s.pageCompliance, { color: colors.textSecondary }]}>
              {schema.complianceRefs.join('  |  ')}
            </Text>
          )}
        </View>

        {/* New Form Button */}
        <Pressable style={[s.addBtn, { backgroundColor: PURPLE }]} onPress={() => { resetForm(); setShowForm(true); }}>
          <Plus size={20} color="#FFF" />
          <Text style={s.addBtnText}>Fill Out New Form</Text>
        </Pressable>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.statVal, { color: colors.text }]}>{submissions.length}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Submitted</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.statVal, { color: colors.text }]}>{schema.sections.length}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Sections</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.statVal, { color: colors.text }]}>{schema.signatures.length}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Signatures</Text>
          </View>
        </View>

        {/* Submission History */}
        {submissions.length === 0 ? (
          <View style={[s.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={32} color={colors.textSecondary} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No Submissions Yet</Text>
          </View>
        ) : (
          submissions.map(sub => (
            <View key={sub.id} style={[s.histCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.histHeader}>
                <Text style={[s.histNumber, { color: colors.text }]}>{sub.formNumber}</Text>
                <View style={[s.statusBadge, { backgroundColor: sub.status === 'submitted' ? GREEN + '15' : BLUE + '15' }]}>
                  <Text style={[s.statusText, { color: sub.status === 'submitted' ? GREEN : BLUE }]}>
                    {sub.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[s.histMeta, { color: colors.textSecondary }]}>
                {sub.createdByName}  •  {new Date(sub.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* PAPER FORM FILL MODAL                                         */}
      {/* ============================================================ */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[{ flex: 1 }, { backgroundColor: '#F2F2F2' }]}>
          {/* Modal Header */}
          <View style={[s.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowForm(false); resetForm(); }} disabled={isSubmitting}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>{template.name}</Text>
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={PURPLE} /> : <Text style={[s.saveBtn, { color: PURPLE }]}>Submit</Text>}
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {/* Task Feed Linker */}
            <TaskFeedPostLinker
              selectedPostId={linkedPostId}
              selectedPostNumber={linkedPostNumber}
              onSelect={(id, num) => { setLinkedPostId(id); setLinkedPostNumber(num); }}
              onClear={() => { setLinkedPostId(null); setLinkedPostNumber(null); }}
            />

            {/* ===== PAPER FORM CONTAINER ===== */}
            <View style={p.form}>

              {/* Form Header — dark bar matching PDF */}
              <View style={p.headerBar}>
                <View style={p.headerLeft}>
                  <View style={p.logoBox}>
                    <Text style={p.logoText}>TulKenz</Text>
                    <Text style={p.logoSub}>OPS</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={p.headerTitle}>{(schema.name || template.name).toUpperCase()}</Text>
                    {schema.complianceRefs && schema.complianceRefs.length > 0 && (
                      <Text style={p.headerCompliance}>{schema.complianceRefs.join(' | ')}</Text>
                    )}
                    {schema.description && (
                      <Text style={p.headerDeptUse}>{schema.description}</Text>
                    )}
                  </View>
                </View>
                <View style={p.headerRight}>
                  <Text style={p.docIdText}>DOC: {template.templateCode}</Text>
                  <Text style={p.docRevText}>Rev: {template.version}.0</Text>
                  {schema.complianceRefs?.[0] && (
                    <Text style={p.docRefText}>{schema.complianceRefs[0]}</Text>
                  )}
                </View>
              </View>

              {/* Render Each Section */}
              {schema.sections.map(section => {
                const isChecklist = isSectionChecklist(section);

                return (
                  <View key={section.id}>
                    {/* Section Title Bar */}
                    <View style={p.sectionBar}>
                      <Text style={p.sectionTitle}>{section.title}</Text>
                    </View>

                    {/* Section Content */}
                    {isChecklist
                      ? renderChecklistTable(section.fields)
                      : renderInfoFields(section.fields)
                    }
                  </View>
                );
              })}

              {/* Signatures */}
              {schema.signatures.length > 0 && (
                <>
                  <View style={p.sectionBar}>
                    <Text style={p.sectionTitle}>SIGNATURES</Text>
                  </View>
                  <View style={{ backgroundColor: WHITE, padding: 12, borderWidth: 1, borderColor: BORDER, borderTopWidth: 0 }}>
                    {schema.signatures.map(sig => (
                      <View key={sig.id} style={{ marginBottom: 12 }}>
                        <PinSignatureCapture
                          label={sig.label}
                          onVerified={(data) => setSignatures(prev => ({ ...prev, [sig.id]: data }))}
                          verificationData={signatures[sig.id]}
                        />
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Footer */}
              <View style={p.formFooter}>
                <Text style={p.footerText}>
                  {template.templateCode} Rev {template.version}.0 | Retain per record retention schedule | TulKenz OPS
                </Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* DROPDOWN PICKER MODAL                                         */}
      {/* ============================================================ */}
      <Modal visible={pickerField !== null} transparent animationType="fade">
        <Pressable style={s.pickerOverlay} onPress={() => setPickerField(null)}>
          <View style={[s.pickerSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.pickerTitle, { color: colors.text }]}>{pickerField?.label}</Text>
            {(pickerField?.options || []).map(opt => (
              <Pressable
                key={opt.value}
                style={[s.pickerItem, formValues[pickerField?.id || ''] === opt.value && { backgroundColor: BLUE + '15' }]}
                onPress={() => {
                  if (pickerField) updateValue(pickerField.id, opt.value);
                  setPickerField(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[{ fontSize: 15, color: colors.text }]}>{opt.label}</Text>
                {formValues[pickerField?.id || ''] === opt.value && <CheckCircle size={18} color={BLUE} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Paper Form Styles ──────────────────────────────────────────

const p = StyleSheet.create({
  form: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: WHITE,
  },

  // Header bar
  headerBar: {
    backgroundColor: DARK_HEADER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    minHeight: 60,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  logoBox: {
    backgroundColor: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  logoText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  logoSub: { color: '#93C5FD', fontSize: 8, fontWeight: '600', marginTop: -2 },
  headerTitle: { color: '#FFF', fontSize: 13, fontWeight: '700', lineHeight: 17 },
  headerCompliance: { color: '#94A3B8', fontSize: 8, marginTop: 2 },
  headerDeptUse: { color: '#3B82F6', fontSize: 8, fontWeight: '600', marginTop: 1 },
  headerRight: { alignItems: 'flex-end', marginLeft: 8 },
  docIdText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  docRevText: { color: '#CBD5E1', fontSize: 8 },
  docRefText: { color: '#CBD5E1', fontSize: 8 },

  // Section bars
  sectionBar: {
    backgroundColor: SECTION_BAR,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Table rows
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 28,
  },
  labelCell: {
    backgroundColor: LABEL_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  valueCell: {
    backgroundColor: WHITE,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  label: { fontSize: 9, fontWeight: '600', color: '#334155' },
  cellInput: { fontSize: 11, color: '#1E293B', paddingVertical: 2, flex: 1 },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  dropdownText: { fontSize: 11, color: '#333' },

  // Radio / Checkbox
  radioBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' },
  radioText: { fontSize: 9, color: '#555' },

  // Instruction
  instructionText: { fontSize: 9, fontStyle: 'italic', color: '#666' },

  // ── Checklist Table ──────────────────────────────────────────
  checkHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COL_HDR_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  checkHeaderCell: {
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: 'center',
  },
  checkHeaderText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 28,
    backgroundColor: WHITE,
  },
  checkItemCell: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: 'center',
  },
  checkItemText: {
    fontSize: 9,
    color: '#1E293B',
    lineHeight: 12,
  },
  checkBoxCell: {
    borderRightWidth: 1,
    borderRightColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCheckBox: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 2,
  },
  checkMark: {
    fontSize: 15,
    fontWeight: '700',
  },
  checkInitialsCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  initialsInput: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    width: 52,
    paddingVertical: 2,
  },

  // Footer
  formFooter: {
    backgroundColor: LABEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 7, color: '#94A3B8' },
});

// ── General Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 13 },
  pageCompliance: { fontSize: 11, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },
  emptyBox: { borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  histCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  histHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  histNumber: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  histMeta: { fontSize: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  pickerSheet: { borderRadius: 16, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
});
