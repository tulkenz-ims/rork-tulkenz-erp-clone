// app/(tabs)/quality/customformfill.tsx
// Universal form fill screen — renders any custom form template
// Reads templateId from route params, loads schema, renders fields, submits to custom_form_submissions

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
  RefreshControl,
  Switch,
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

// ── Constants ──────────────────────────────────────────────────

const BLUE = '#3B82F6';
const GREEN = '#10B981';
const RED = '#EF4444';
const PURPLE = '#8B5CF6';
const SLATE = '#475569';
const FORM_BORDER = '#CBD5E1';
const FORM_HEADER_BG = '#1E293B';
const LABEL_BG = '#F1F5F9';
const WHITE = '#FFFFFF';

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

  // ── Form Helpers ─────────────────────────────────────────────

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
            return `"${field.label}" in "${section.title}" — select Pass or Fail`;
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

    // Validate signatures
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
      // Build signatures array
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

      // Link to task feed post
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

  // ── Field Renderer ───────────────────────────────────────────

  const renderField = useCallback((field: CustomFormField, sectionId: string) => {
    const val = formValues[field.id];

    switch (field.fieldType) {
      case 'label':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.instructionText, { color: colors.textSecondary }]}>{field.label}</Text>
          </View>
        );

      case 'text_input':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={val || ''}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder={field.placeholder || 'N/A'}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        );

      case 'text_area':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }]}
              value={val || ''}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder={field.placeholder || 'N/A'}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          </View>
        );

      case 'number':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={val?.toString() || ''}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder={field.placeholder || '0'}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        );

      case 'date':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={val || new Date().toISOString().slice(0, 10)}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        );

      case 'time':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={val || ''}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        );

      case 'dropdown':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <Pressable
              style={[st.fieldInput, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setPickerField(field)}
            >
              <Text style={{ fontSize: 14, color: val ? colors.text : colors.textSecondary }}>
                {val ? (field.options?.find(o => o.value === val)?.label || val) : 'Select...'}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        );

      case 'radio':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <View style={st.radioRow}>
              {(field.options || []).map(opt => (
                <Pressable
                  key={opt.value}
                  style={[st.radioBtn, val === opt.value && { backgroundColor: BLUE + '15', borderColor: BLUE }]}
                  onPress={() => updateValue(field.id, opt.value)}
                >
                  <Text style={{ fontSize: 13, color: val === opt.value ? BLUE : colors.text }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'checkbox':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            {(field.options || []).map(opt => {
              const checked = Array.isArray(val) && val.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[st.checkRow, checked && { backgroundColor: GREEN + '08' }]}
                  onPress={() => {
                    const current = Array.isArray(val) ? val : [];
                    const updated = checked ? current.filter(v => v !== opt.value) : [...current, opt.value];
                    updateValue(field.id, updated);
                  }}
                >
                  <View style={[st.checkBox, checked && { backgroundColor: GREEN, borderColor: GREEN }]}>
                    {checked && <CheckCircle size={12} color="#FFF" />}
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        );

      case 'pass_fail':
        const pfVal = val || 'none';
        const initials = formValues[`${field.id}_initials`] || '';
        return (
          <View key={field.id} style={[st.passfailRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[st.pfLabel, { color: colors.text }]}>{field.label}</Text>
            </View>
            <Pressable
              style={[st.pfBtn, pfVal === 'pass' && { backgroundColor: '#ECFDF5', borderColor: GREEN }]}
              onPress={() => updateValue(field.id, pfVal === 'pass' ? 'none' : 'pass')}
            >
              <Text style={[st.pfBtnText, pfVal === 'pass' && { color: GREEN }]}>P</Text>
            </Pressable>
            <Pressable
              style={[st.pfBtn, pfVal === 'fail' && { backgroundColor: '#FEF2F2', borderColor: RED }]}
              onPress={() => updateValue(field.id, pfVal === 'fail' ? 'none' : 'fail')}
            >
              <Text style={[st.pfBtnText, pfVal === 'fail' && { color: RED }]}>F</Text>
            </Pressable>
            <TextInput
              style={[st.pfInitials, { color: colors.text, borderColor: colors.border }]}
              value={initials}
              onChangeText={(t) => updateValue(`${field.id}_initials`, t.toUpperCase().slice(0, 4))}
              placeholder="Init."
              placeholderTextColor="#CCC"
              maxLength={4}
              autoCapitalize="characters"
            />
          </View>
        );

      case 'initials':
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border, width: 80 }]}
              value={val || ''}
              onChangeText={(t) => updateValue(field.id, t.toUpperCase().slice(0, 4))}
              placeholder="Init."
              placeholderTextColor={colors.textSecondary}
              maxLength={4}
              autoCapitalize="characters"
            />
          </View>
        );

      default:
        return (
          <View key={field.id} style={[st.fieldWrap, widthStyle(field.width)]}>
            <Text style={[st.fieldLabel, { color: colors.text }]}>{field.label}</Text>
            <TextInput
              style={[st.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={val || ''}
              onChangeText={(t) => updateValue(field.id, t)}
              placeholder="N/A"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        );
    }
  }, [formValues, colors, updateValue]);

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
        {/* Header */}
        <View style={[st.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.pageTitle, { color: colors.text }]}>{template.name}</Text>
          <Text style={[st.pageSub, { color: colors.textSecondary }]}>
            {template.templateCode}  •  v{template.version}
          </Text>
          {schema.complianceRefs && schema.complianceRefs.length > 0 && (
            <Text style={[st.pageCompliance, { color: colors.textSecondary }]}>
              {schema.complianceRefs.join('  |  ')}
            </Text>
          )}
        </View>

        {/* New Form Button */}
        <Pressable style={[st.addBtn, { backgroundColor: PURPLE }]} onPress={() => { resetForm(); setShowForm(true); }}>
          <Plus size={20} color="#FFF" />
          <Text style={st.addBtnText}>Fill Out New Form</Text>
        </Pressable>

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[st.statVal, { color: colors.text }]}>{submissions.length}</Text>
            <Text style={[st.statLbl, { color: colors.textSecondary }]}>Submitted</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[st.statVal, { color: colors.text }]}>{schema.sections.length}</Text>
            <Text style={[st.statLbl, { color: colors.textSecondary }]}>Sections</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[st.statVal, { color: colors.text }]}>{schema.signatures.length}</Text>
            <Text style={[st.statLbl, { color: colors.textSecondary }]}>Signatures</Text>
          </View>
        </View>

        {/* History */}
        {submissions.length === 0 ? (
          <View style={[st.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={32} color={colors.textSecondary} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>No Submissions Yet</Text>
          </View>
        ) : (
          submissions.map(sub => (
            <View key={sub.id} style={[st.histCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={st.histHeader}>
                <Text style={[st.histNumber, { color: colors.text }]}>{sub.formNumber}</Text>
                <View style={[st.statusBadge, { backgroundColor: sub.status === 'submitted' ? GREEN + '15' : BLUE + '15' }]}>
                  <Text style={[st.statusText, { color: sub.status === 'submitted' ? GREEN : BLUE }]}>
                    {sub.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[st.histMeta, { color: colors.textSecondary }]}>
                {sub.createdByName}  •  {new Date(sub.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* FORM FILL MODAL                                               */}
      {/* ============================================================ */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
          <View style={[st.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowForm(false); resetForm(); }} disabled={isSubmitting}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[st.modalTitle, { color: colors.text }]}>{template.name}</Text>
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={PURPLE} /> : <Text style={[st.saveBtn, { color: PURPLE }]}>Submit</Text>}
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Task Feed Linker */}
            <TaskFeedPostLinker
              selectedPostId={linkedPostId}
              selectedPostNumber={linkedPostNumber}
              onSelect={(id, num) => { setLinkedPostId(id); setLinkedPostNumber(num); }}
              onClear={() => { setLinkedPostId(null); setLinkedPostNumber(null); }}
            />

            {/* Form Header Bar */}
            <View style={st.formHeaderBar}>
              <Text style={st.formHeaderTitle}>{schema.name || template.name}</Text>
              <Text style={st.formHeaderSub}>{template.templateCode}  •  v{template.version}</Text>
            </View>

            {/* Sections */}
            {schema.sections.map(section => (
              <View key={section.id} style={st.sectionContainer}>
                <View style={st.sectionBar}>
                  <Text style={st.sectionTitle}>{section.title}</Text>
                </View>
                <View style={st.sectionFields}>
                  {section.fields.map(field => renderField(field, section.id))}
                </View>
              </View>
            ))}

            {/* Signatures */}
            {schema.signatures.length > 0 && (
              <View style={st.sectionContainer}>
                <View style={st.sectionBar}>
                  <Text style={st.sectionTitle}>SIGNATURES</Text>
                </View>
                <View style={{ padding: 12 }}>
                  {schema.signatures.map(sig => (
                    <View key={sig.id} style={{ marginBottom: 16 }}>
                      <PinSignatureCapture
                        label={sig.label}
                        onVerified={(data) => setSignatures(prev => ({ ...prev, [sig.id]: data }))}
                        verificationData={signatures[sig.id]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Dropdown Picker Modal */}
      <Modal visible={pickerField !== null} transparent animationType="fade">
        <Pressable style={st.pickerOverlay} onPress={() => setPickerField(null)}>
          <View style={[st.pickerSheet, { backgroundColor: colors.surface }]}>
            <Text style={[st.pickerTitle, { color: colors.text }]}>{pickerField?.label}</Text>
            {(pickerField?.options || []).map(opt => (
              <Pressable
                key={opt.value}
                style={[st.pickerItem, formValues[pickerField?.id || ''] === opt.value && { backgroundColor: BLUE + '15' }]}
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

// ── Helpers ────────────────────────────────────────────────────

function widthStyle(width: string) {
  switch (width) {
    case 'third': return { width: '33%' as any };
    case 'half': return { width: '50%' as any };
    default: return { width: '100%' as any };
  }
}

// ── Styles ─────────────────────────────────────────────────────

const st = StyleSheet.create({
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
  formHeaderBar: { backgroundColor: FORM_HEADER_BG, borderRadius: 10, padding: 14, marginBottom: 0, marginTop: 12 },
  formHeaderTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  formHeaderSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  sectionContainer: { borderWidth: 1, borderColor: FORM_BORDER, borderRadius: 0, marginBottom: 0, overflow: 'hidden' },
  sectionBar: { backgroundColor: '#2D3748', paddingHorizontal: 12, paddingVertical: 8 },
  sectionTitle: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  sectionFields: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8, backgroundColor: WHITE },
  fieldWrap: { marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  fieldInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  instructionText: { fontSize: 11, fontStyle: 'italic', paddingVertical: 4 },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radioBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6 },
  checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  passfailRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 0, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: WHITE, gap: 6 },
  pfLabel: { fontSize: 11, lineHeight: 14 },
  pfBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: FORM_BORDER, alignItems: 'center', justifyContent: 'center' },
  pfBtnText: { fontSize: 12, fontWeight: '600', color: '#999' },
  pfInitials: { width: 48, borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 3, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  pickerSheet: { borderRadius: 16, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
});
