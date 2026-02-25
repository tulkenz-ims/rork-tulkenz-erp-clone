import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useTaskFeedTemplateQuery,
  useCreateTaskFeedTemplate,
  useUpdateTaskFeedTemplate,
} from '@/hooks/useTaskFeedTemplates';
import {
  ButtonType,
  FieldType,
  FormField,
  FormFieldOption,
  WorkflowRule,
  BUTTON_TYPE_LABELS,
  BUTTON_TYPE_COLORS,
  FIELD_TYPE_LABELS,
  SuggestedForm,
} from '@/types/taskFeedTemplates';
import { DEPARTMENT_CODES, getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';
import { PREBUILT_TEMPLATES, getPrebuiltTemplateList } from '@/constants/prebuiltTemplates';

// ── Emoji replacements for all icons ──────────────────────────
const BTN_EMOJI: Record<ButtonType, string> = { add_task: '📋', report_issue: '⚠️', request_purchase: '🛒' };
const FIELD_EMOJI: Record<FieldType, string> = { dropdown: '▾', text_input: 'Aa', text_area: '¶', radio: '◉', checkbox: '☑', number: '#', date: '📅' };

type WizardStep = 'basic' | 'departments' | 'fields' | 'settings' | 'preview';
const STEPS: { key: WizardStep; label: string; n: string }[] = [
  { key: 'basic', label: 'Basic Info', n: '1' },
  { key: 'departments', label: 'Departments', n: '2' },
  { key: 'fields', label: 'Form Fields', n: '3' },
  { key: 'settings', label: 'Settings', n: '4' },
  { key: 'preview', label: 'Preview', n: '5' },
];

export default function TemplateBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingTemplate, isLoading: isLoadingTemplate } = useTaskFeedTemplateQuery(id || '', { enabled: isEditing });

  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buttonType, setButtonType] = useState<ButtonType>('add_task');
  const [triggeringDepartment, setTriggeringDepartment] = useState<string>('');
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [photoRequired, setPhotoRequired] = useState(true);
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
  const [isProductionHold, setIsProductionHold] = useState(false);
  const [departmentFormSuggestions, setDepartmentFormSuggestions] = useState<Record<string, SuggestedForm[]>>({});
  const [showPrebuiltPicker, setShowPrebuiltPicker] = useState(!isEditing);
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<string | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text_input');
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldOptions, setFieldOptions] = useState<FormFieldOption[]>([]);
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    if (existingTemplate && isEditing) {
      setName(existingTemplate.name); setDescription(existingTemplate.description || '');
      setButtonType(existingTemplate.buttonType); setTriggeringDepartment(existingTemplate.triggeringDepartment);
      setAssignedDepartments(existingTemplate.assignedDepartments); setFormFields(existingTemplate.formFields);
      setPhotoRequired(existingTemplate.photoRequired); setWorkflowRules(existingTemplate.workflowRules);
      setIsProductionHold(existingTemplate.isProductionHold || false);
      setDepartmentFormSuggestions(existingTemplate.departmentFormSuggestions || {});
    }
  }, [existingTemplate, isEditing]);

  const handleLoadPrebuilt = useCallback((prebuiltName: string) => {
    const config = PREBUILT_TEMPLATES[prebuiltName];
    if (!config) return;
    setName(config.name); setDescription(config.description || ''); setButtonType(config.buttonType);
    setAssignedDepartments([...config.assignedDepartments]); setFormFields([...(config.formFields || [])]);
    setPhotoRequired(config.photoRequired); setIsProductionHold(config.isProductionHold || false);
    setDepartmentFormSuggestions({ ...(config.departmentFormSuggestions || {}) });
    setSelectedPrebuilt(prebuiltName); setShowPrebuiltPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const createMutation = useCreateTaskFeedTemplate({
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Success', 'Template created successfully', [{ text: 'OK', onPress: () => router.back() }]); },
    onError: (e) => { Alert.alert('Error', `Failed: ${e instanceof Error ? e.message : 'Unknown'}`); },
  });
  const updateMutation = useUpdateTaskFeedTemplate({
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Success', 'Template updated successfully', [{ text: 'OK', onPress: () => router.back() }]); },
    onError: (e) => { Alert.alert('Error', `Failed: ${e instanceof Error ? e.message : 'Unknown'}`); },
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const canGoNext = useMemo(() => {
    if (currentStep === 'basic') return name.trim().length > 0 && triggeringDepartment.length > 0;
    if (currentStep === 'departments') return assignedDepartments.length > 0;
    return true;
  }, [currentStep, name, triggeringDepartment, assignedDepartments]);

  const handleNext = useCallback(() => { const i = currentStepIndex + 1; if (i < STEPS.length) { setCurrentStep(STEPS[i].key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }, [currentStepIndex]);
  const handleBack = useCallback(() => { const i = currentStepIndex - 1; if (i >= 0) { setCurrentStep(STEPS[i].key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }, [currentStepIndex]);

  const handleSave = useCallback(() => {
    if (!name.trim()) { Alert.alert('Missing', 'Enter a template name.'); return; }
    if (!triggeringDepartment) { Alert.alert('Missing', 'Select a triggering department.'); return; }
    if (assignedDepartments.length === 0) { Alert.alert('Missing', 'Select at least one department.'); return; }
    const data = { name: name.trim(), description: description.trim() || undefined, buttonType, triggeringDepartment, assignedDepartments, formFields, photoRequired, workflowRules, isProductionHold, departmentFormSuggestions };
    if (isEditing && id) { updateMutation.mutate({ id, ...data }); } else { createMutation.mutate(data); }
  }, [name, description, buttonType, triggeringDepartment, assignedDepartments, formFields, photoRequired, workflowRules, isEditing, id, createMutation, updateMutation, isProductionHold, departmentFormSuggestions]);

  const handleClose = useCallback(() => {
    if (name || description || formFields.length > 0) { Alert.alert('Discard?', 'Unsaved changes will be lost.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => router.back() }]); }
    else { router.back(); }
  }, [name, description, formFields, router]);

  const resetFieldForm = useCallback(() => { setFieldLabel(''); setFieldType('text_input'); setFieldRequired(true); setFieldPlaceholder(''); setFieldOptions([]); setNewOptionValue(''); setEditingFieldIndex(null); }, []);
  const handleAddField = useCallback(() => { resetFieldForm(); setShowFieldModal(true); }, [resetFieldForm]);
  const handleEditField = useCallback((i: number) => { const f = formFields[i]; setFieldLabel(f.label); setFieldType(f.fieldType); setFieldRequired(f.required); setFieldPlaceholder(f.placeholder || ''); setFieldOptions(f.options || []); setEditingFieldIndex(i); setShowFieldModal(true); }, [formFields]);

  const handleSaveField = useCallback(() => {
    if (!fieldLabel.trim()) { Alert.alert('Missing', 'Enter a field label.'); return; }
    const needsOpts = ['dropdown', 'radio', 'checkbox'].includes(fieldType);
    if (needsOpts && fieldOptions.length === 0) { Alert.alert('Missing', 'Add at least one option.'); return; }
    const nf: FormField = { id: editingFieldIndex !== null ? formFields[editingFieldIndex].id : `field-${Date.now()}`, label: fieldLabel.trim(), fieldType, required: fieldRequired, placeholder: fieldPlaceholder.trim() || undefined, options: needsOpts ? fieldOptions : undefined, sortOrder: editingFieldIndex !== null ? formFields[editingFieldIndex].sortOrder : formFields.length + 1 };
    if (editingFieldIndex !== null) { const u = [...formFields]; u[editingFieldIndex] = nf; setFormFields(u); } else { setFormFields([...formFields, nf]); }
    setShowFieldModal(false); resetFieldForm();
  }, [fieldLabel, fieldType, fieldRequired, fieldPlaceholder, fieldOptions, editingFieldIndex, formFields, resetFieldForm]);

  const handleDeleteField = useCallback((i: number) => { Alert.alert('Delete?', 'Delete this field?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => setFormFields(formFields.filter((_, j) => j !== i)) }]); }, [formFields]);
  const handleAddOption = useCallback(() => { if (!newOptionValue.trim()) return; setFieldOptions([...fieldOptions, { value: newOptionValue.trim().toLowerCase().replace(/\s+/g, '_'), label: newOptionValue.trim() }]); setNewOptionValue(''); }, [newOptionValue, fieldOptions]);
  const handleRemoveOption = useCallback((i: number) => { setFieldOptions(fieldOptions.filter((_, j) => j !== i)); }, [fieldOptions]);
  const toggleDept = useCallback((c: string) => { setAssignedDepartments((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]); }, []);

  const prebuiltList = useMemo(() => getPrebuiltTemplateList(), []);
  const s = createStyles(colors);

  if (isEditing && isLoadingTemplate) {
    return (<View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><Stack.Screen options={{ title: 'Edit Template' }} /><Text style={{ color: colors.textSecondary, fontSize: 16 }}>Loading template...</Text></View>);
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: isEditing ? 'Edit Template' : 'Create Template',
        headerLeft: () => <TouchableOpacity onPress={handleClose} style={s.hdrBtn}><Text style={{ fontSize: 20, color: colors.text }}>✕</Text></TouchableOpacity>,
        headerRight: () => <TouchableOpacity onPress={handleSave} style={s.hdrBtn} disabled={createMutation.isPending || updateMutation.isPending}><Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>💾</Text></TouchableOpacity>,
      }} />

      {/* Step indicator */}
      <View style={s.stepRow}>
        {STEPS.map((step, i) => {
          const active = i === currentStepIndex; const done = i < currentStepIndex;
          return (
            <React.Fragment key={step.key}>
              <TouchableOpacity style={[s.stepDot, active && { backgroundColor: colors.primary }, done && { backgroundColor: '#10B981' }, !active && !done && { backgroundColor: colors.border }]}
                onPress={() => { if (done || active) setCurrentStep(step.key); }}>
                <Text style={[s.stepDotText, { color: (active || done) ? '#fff' : colors.textSecondary }]}>{done ? '✓' : step.n}</Text>
              </TouchableOpacity>
              {i < STEPS.length - 1 && <View style={[s.stepLine, { backgroundColor: done ? '#10B981' : colors.border }]} />}
            </React.Fragment>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.stepContent}>

            {/* ── STEP: BASIC ── */}
            {currentStep === 'basic' && (<>
              {!isEditing && (
                <View style={{ marginBottom: 20 }}>
                  {showPrebuiltPicker ? (<>
                    <Text style={[s.label, { color: colors.text }]}>✨ Start from Pre-Built Template</Text>
                    <Text style={[s.hint, { color: colors.textSecondary }]}>Pre-loaded with department assignments, form checklists, and production hold settings.</Text>
                    <View style={{ gap: 8, marginTop: 8 }}>
                      {prebuiltList.map((pb) => (
                        <TouchableOpacity key={pb.name} style={[s.prebuiltCard, { backgroundColor: colors.surface, borderColor: selectedPrebuilt === pb.name ? '#F59E0B' : colors.border }]} onPress={() => handleLoadPrebuilt(pb.name)}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[s.prebuiltName, { color: colors.text }]}>{pb.name}</Text>
                            {pb.isProductionHold && <View style={[s.holdBadge, { backgroundColor: '#EF444420' }]}><Text style={{ fontSize: 8, fontWeight: '800', color: '#EF4444' }}>⚠ HOLD</Text></View>}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={2}>{pb.description}</Text>
                          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{pb.departmentCount} depts — {pb.buttonType === 'report_issue' ? 'Issue' : 'Task'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border, marginTop: 8 }} onPress={() => setShowPrebuiltPicker(false)}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>or start from scratch</Text>
                    </TouchableOpacity>
                  </>) : (
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B60', backgroundColor: '#F59E0B15' }} onPress={() => setShowPrebuiltPicker(true)}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#F59E0B' }}>{selectedPrebuilt ? `✨ Loaded: ${selectedPrebuilt}` : '✨ Load from pre-built template'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={[s.stepTitle, { color: colors.text }]}>Basic Information</Text>
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Template Name *</Text>
                <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.text }]} placeholder="e.g., Pre-OP, Equipment Failure" placeholderTextColor={colors.textTertiary} value={name} onChangeText={setName} />
              </View>
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Description</Text>
                <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.text, minHeight: 80, textAlignVertical: 'top' }]} placeholder="Brief description" placeholderTextColor={colors.textTertiary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
              </View>
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Button Type *</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(Object.keys(BUTTON_TYPE_LABELS) as ButtonType[]).map((t) => {
                    const c = BUTTON_TYPE_COLORS[t]; const sel = buttonType === t;
                    return (<TouchableOpacity key={t} style={{ flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: sel ? c : colors.border, backgroundColor: sel ? c + '20' : colors.surface, gap: 4 }} onPress={() => setButtonType(t)}>
                      <Text style={{ fontSize: 22 }}>{BTN_EMOJI[t]}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? c : colors.text, textAlign: 'center' }}>{BUTTON_TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>);
                  })}
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.text, marginBottom: 0 }]}>{isProductionHold ? '🔴' : '⚪'} Production Hold</Text>
                  <Text style={[s.hint, { color: colors.textSecondary }]}>Line stops until departments clear</Text>
                </View>
                <Switch value={isProductionHold} onValueChange={setIsProductionHold} trackColor={{ false: colors.border, true: '#EF444480' }} thumbColor={isProductionHold ? '#EF4444' : '#f4f3f4'} />
              </View>
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Triggering Department *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.values(DEPARTMENT_CODES).map((dept) => {
                    const sel = triggeringDepartment === dept.code;
                    return (<TouchableOpacity key={dept.code} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: dept.color, backgroundColor: sel ? dept.color : colors.surface, gap: 8 }} onPress={() => setTriggeringDepartment(dept.code)}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sel ? '#fff' : dept.color }} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: sel ? '#fff' : colors.text }}>{dept.name}</Text>
                    </TouchableOpacity>);
                  })}
                </ScrollView>
              </View>
            </>)}

            {/* ── STEP: DEPARTMENTS ── */}
            {currentStep === 'departments' && (<>
              <Text style={[s.stepTitle, { color: colors.text }]}>Assigned Departments</Text>
              <Text style={[s.hint, { color: colors.textSecondary, marginBottom: 16 }]}>Select which departments receive tasks</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {Object.values(DEPARTMENT_CODES).map((dept) => {
                  const sel = assignedDepartments.includes(dept.code);
                  return (<TouchableOpacity key={dept.code} style={{ width: '48%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: sel ? dept.color : colors.border, backgroundColor: sel ? dept.color + '15' : colors.surface, position: 'relative' }} onPress={() => toggleDept(dept.code)}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dept.color, marginBottom: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{dept.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{dept.code}</Text>
                    {departmentFormSuggestions[dept.code]?.length > 0 && sel && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, backgroundColor: dept.color + '25' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: dept.color }}>{departmentFormSuggestions[dept.code].length} forms</Text>
                      </View>
                    )}
                    {sel && <View style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: dept.color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text></View>}
                  </TouchableOpacity>);
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 16, backgroundColor: colors.surface, gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{assignedDepartments.length} department{assignedDepartments.length !== 1 ? 's' : ''} selected</Text>
              </View>
            </>)}

            {/* ── STEP: FIELDS ── */}
            {currentStep === 'fields' && (<>
              <Text style={[s.stepTitle, { color: colors.text }]}>Form Fields</Text>
              {formFields.length === 0 ? (
                <View style={{ padding: 32, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>No fields added yet</Text>
                  <TouchableOpacity style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary, gap: 6 }} onPress={handleAddField}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>+ Add Field</Text>
                  </TouchableOpacity>
                </View>
              ) : (<>
                {formFields.map((field, i) => (
                  <View key={field.id} style={{ borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: colors.surface }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{FIELD_EMOJI[field.fieldType]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{field.label}{field.required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{FIELD_TYPE_LABELS[field.fieldType]}{field.options ? ` • ${field.options.length} options` : ''}</Text>
                      </View>
                      <TouchableOpacity style={{ padding: 6 }} onPress={() => handleEditField(i)}><Text style={{ color: colors.primary }}>✏️</Text></TouchableOpacity>
                      <TouchableOpacity style={{ padding: 6 }} onPress={() => handleDeleteField(i)}><Text style={{ color: '#EF4444' }}>🗑</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, gap: 8 }} onPress={handleAddField}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>+ Add Field</Text>
                </TouchableOpacity>
              </>)}
            </>)}

            {/* ── STEP: SETTINGS ── */}
            {currentStep === 'settings' && (<>
              <Text style={[s.stepTitle, { color: colors.text }]}>Settings</Text>
              <View style={{ borderRadius: 12, backgroundColor: colors.surface, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>📷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Photo Required</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>Require users to attach a photo</Text>
                  </View>
                  <Switch value={photoRequired} onValueChange={setPhotoRequired} trackColor={{ false: colors.border, true: '#F59E0B' }} thumbColor="#fff" />
                </View>
              </View>
            </>)}

            {/* ── STEP: PREVIEW ── */}
            {currentStep === 'preview' && (<>
              <Text style={[s.stepTitle, { color: colors.text }]}>Preview</Text>
              <View style={{ borderRadius: 14, padding: 16, backgroundColor: colors.surface }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: BUTTON_TYPE_COLORS[buttonType] + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{BTN_EMOJI[buttonType]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{name || 'Unnamed'}</Text>
                    {description ? <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{description}</Text> : null}
                  </View>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Trigger</Text>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: (getDepartmentColor(triggeringDepartment) || '#6B7280') + '20', marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: getDepartmentColor(triggeringDepartment) || '#6B7280' }}>{triggeringDepartment === 'any' ? 'Any Department' : getDepartmentName(triggeringDepartment)}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Assigned ({assignedDepartments.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {assignedDepartments.map((c) => { const dc = getDepartmentColor(c) || '#6B7280'; return (
                    <View key={c} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: dc + '20' }}><Text style={{ fontSize: 12, fontWeight: '500', color: dc }}>{getDepartmentName(c)}</Text></View>
                  ); })}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>Fields ({formFields.length})</Text>
                {formFields.map((f) => (
                  <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: colors.background }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{f.label}{f.required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{FIELD_TYPE_LABELS[f.fieldType]}</Text>
                  </View>
                ))}
                <Text style={{ fontSize: 14, color: colors.text, marginTop: 8 }}>{photoRequired ? '📷 Photo Required' : '📷 Photo Optional'}</Text>
              </View>
            </>)}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer navigation */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {currentStepIndex > 0 ? (
          <TouchableOpacity style={[s.footerBtn, { backgroundColor: colors.background }]} onPress={handleBack}><Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Back</Text></TouchableOpacity>
        ) : <View style={s.footerBtn} />}
        {currentStepIndex < STEPS.length - 1 ? (
          <TouchableOpacity style={[s.footerBtn, { backgroundColor: canGoNext ? colors.primary : colors.border }]} onPress={handleNext} disabled={!canGoNext}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: canGoNext ? '#fff' : colors.textTertiary }}>Next ›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.footerBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{createMutation.isPending || updateMutation.isPending ? 'Saving...' : '💾 Save Template'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Field editor modal */}
      <Modal visible={showFieldModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.container, { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
            <TouchableOpacity onPress={() => { setShowFieldModal(false); resetFieldForm(); }}><Text style={{ fontSize: 20, color: colors.text }}>✕</Text></TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{editingFieldIndex !== null ? 'Edit Field' : 'Add Field'}</Text>
            <TouchableOpacity onPress={handleSaveField}><Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>✓ Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 20 }}>
              <Text style={[s.label, { color: colors.text }]}>Field Label *</Text>
              <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.text }]} placeholder="e.g., Location, Batch Number" placeholderTextColor={colors.textTertiary} value={fieldLabel} onChangeText={setFieldLabel} />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={[s.label, { color: colors.text }]}>Field Type *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => {
                  const sel = fieldType === t;
                  return (<TouchableOpacity key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary + '20' : colors.surface, gap: 8 }} onPress={() => setFieldType(t)}>
                    <Text style={{ fontSize: 14, color: sel ? colors.primary : colors.textSecondary, fontWeight: '700' }}>{FIELD_EMOJI[t]}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: sel ? colors.primary : colors.text }}>{FIELD_TYPE_LABELS[t]}</Text>
                  </TouchableOpacity>);
                })}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 16, backgroundColor: colors.surface }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>Required Field</Text>
              <Switch value={fieldRequired} onValueChange={setFieldRequired} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            {['text_input', 'text_area', 'number'].includes(fieldType) && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Placeholder Text</Text>
                <TextInput style={[s.input, { backgroundColor: colors.surface, color: colors.text }]} placeholder="Hint text" placeholderTextColor={colors.textTertiary} value={fieldPlaceholder} onChangeText={setFieldPlaceholder} />
              </View>
            )}
            {['dropdown', 'radio', 'checkbox'].includes(fieldType) && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.label, { color: colors.text }]}>Options *</Text>
                {fieldOptions.map((o, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8, backgroundColor: colors.surface }}>
                    <Text style={{ fontSize: 14, color: colors.text }}>{o.label}</Text>
                    <TouchableOpacity onPress={() => handleRemoveOption(i)}><Text style={{ color: '#EF4444' }}>✕</Text></TouchableOpacity>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[s.input, { flex: 1, backgroundColor: colors.surface, color: colors.text }]} placeholder="New option" placeholderTextColor={colors.textTertiary} value={newOptionValue} onChangeText={setNewOptionValue} onSubmitEditing={handleAddOption} />
                  <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }} onPress={handleAddOption}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hdrBtn: { padding: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 12, fontWeight: '600' as const },
  stepLine: { width: 24, height: 2, marginHorizontal: 4 },
  stepContent: { padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700' as const, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  prebuiltCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  prebuiltName: { fontSize: 14, fontWeight: '700' as const },
  holdBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
});
