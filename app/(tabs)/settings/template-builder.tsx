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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Camera,
  ClipboardList,
  AlertTriangle,
  ShoppingCart,
  Layers,
  Type,
  AlignLeft,
  List,
  CircleDot,
  CheckSquare,
  Hash,
  Calendar,
  HelpCircle,
  Save,
  Eye,
} from 'lucide-react-native';
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
  TaskFeedTemplate,
  ButtonType,
  FieldType,
  FormField,
  FormFieldOption,
  WorkflowRule,
  BUTTON_TYPE_LABELS,
  BUTTON_TYPE_COLORS,
  FIELD_TYPE_LABELS,
} from '@/types/taskFeedTemplates';
import { DEPARTMENT_CODES, getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';

const BUTTON_TYPE_ICONS: Record<ButtonType, typeof ClipboardList> = {
  add_task: ClipboardList,
  report_issue: AlertTriangle,
  request_purchase: ShoppingCart,
};

const FIELD_TYPE_ICONS: Record<FieldType, typeof Type> = {
  dropdown: List,
  text_input: Type,
  text_area: AlignLeft,
  radio: CircleDot,
  checkbox: CheckSquare,
  number: Hash,
  date: Calendar,
};

type WizardStep = 'basic' | 'departments' | 'fields' | 'settings' | 'preview';

const STEPS: { key: WizardStep; label: string; shortLabel: string }[] = [
  { key: 'basic', label: 'Basic Info', shortLabel: '1' },
  { key: 'departments', label: 'Departments', shortLabel: '2' },
  { key: 'fields', label: 'Form Fields', shortLabel: '3' },
  { key: 'settings', label: 'Settings', shortLabel: '4' },
  { key: 'preview', label: 'Preview', shortLabel: '5' },
];

export default function TemplateBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingTemplate, isLoading: isLoadingTemplate } = useTaskFeedTemplateQuery(id || '', {
    enabled: isEditing,
  });

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

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text_input');
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldOptions, setFieldOptions] = useState<FormFieldOption[]>([]);
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    if (existingTemplate && isEditing) {
      setName(existingTemplate.name);
      setDescription(existingTemplate.description || '');
      setButtonType(existingTemplate.buttonType);
      setTriggeringDepartment(existingTemplate.triggeringDepartment);
      setAssignedDepartments(existingTemplate.assignedDepartments);
      setFormFields(existingTemplate.formFields);
      setPhotoRequired(existingTemplate.photoRequired);
      setWorkflowRules(existingTemplate.workflowRules);
    }
  }, [existingTemplate, isEditing]);

  const createMutation = useCreateTaskFeedTemplate({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Template created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to create template: ${errorMessage}`);
      console.error('[TemplateBuilder] Create error:', errorMessage);
    },
  });

  const updateMutation = useUpdateTaskFeedTemplate({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Template updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to update template: ${errorMessage}`);
      console.error('[TemplateBuilder] Update error:', errorMessage);
    },
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'basic':
        return name.trim().length > 0 && triggeringDepartment.length > 0;
      case 'departments':
        return assignedDepartments.length > 0;
      case 'fields':
        return true;
      case 'settings':
        return true;
      case 'preview':
        return true;
      default:
        return false;
    }
  }, [currentStep, name, triggeringDepartment, assignedDepartments]);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentStepIndex]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a template name.');
      return;
    }

    if (!triggeringDepartment) {
      Alert.alert('Missing Information', 'Please select a triggering department.');
      return;
    }

    if (assignedDepartments.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one assigned department.');
      return;
    }

    const templateData = {
      name: name.trim(),
      description: description.trim() || undefined,
      buttonType,
      triggeringDepartment,
      assignedDepartments,
      formFields,
      photoRequired,
      workflowRules,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, ...templateData });
    } else {
      createMutation.mutate(templateData);
    }
  }, [
    name,
    description,
    buttonType,
    triggeringDepartment,
    assignedDepartments,
    formFields,
    photoRequired,
    workflowRules,
    isEditing,
    id,
    createMutation,
    updateMutation,
  ]);

  const handleClose = useCallback(() => {
    if (name || description || formFields.length > 0) {
      Alert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to leave?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [name, description, formFields, router]);

  const resetFieldForm = useCallback(() => {
    setFieldLabel('');
    setFieldType('text_input');
    setFieldRequired(true);
    setFieldPlaceholder('');
    setFieldOptions([]);
    setNewOptionValue('');
    setEditingFieldIndex(null);
  }, []);

  const handleAddField = useCallback(() => {
    resetFieldForm();
    setShowFieldModal(true);
  }, [resetFieldForm]);

  const handleEditField = useCallback((index: number) => {
    const field = formFields[index];
    setFieldLabel(field.label);
    setFieldType(field.fieldType);
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder || '');
    setFieldOptions(field.options || []);
    setEditingFieldIndex(index);
    setShowFieldModal(true);
  }, [formFields]);

  const handleSaveField = useCallback(() => {
    if (!fieldLabel.trim()) {
      Alert.alert('Missing Information', 'Please enter a field label.');
      return;
    }

    const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(fieldType);
    if (needsOptions && fieldOptions.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one option for this field type.');
      return;
    }

    const newField: FormField = {
      id: editingFieldIndex !== null ? formFields[editingFieldIndex].id : `field-${Date.now()}`,
      label: fieldLabel.trim(),
      fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder.trim() || undefined,
      options: needsOptions ? fieldOptions : undefined,
      sortOrder: editingFieldIndex !== null ? formFields[editingFieldIndex].sortOrder : formFields.length + 1,
    };

    if (editingFieldIndex !== null) {
      const updated = [...formFields];
      updated[editingFieldIndex] = newField;
      setFormFields(updated);
    } else {
      setFormFields([...formFields, newField]);
    }

    setShowFieldModal(false);
    resetFieldForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [fieldLabel, fieldType, fieldRequired, fieldPlaceholder, fieldOptions, editingFieldIndex, formFields, resetFieldForm]);

  const handleDeleteField = useCallback((index: number) => {
    Alert.alert('Delete Field', 'Are you sure you want to delete this field?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = formFields.filter((_, i) => i !== index);
          setFormFields(updated);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }, [formFields]);

  const handleAddOption = useCallback(() => {
    if (!newOptionValue.trim()) return;
    const option: FormFieldOption = {
      value: newOptionValue.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newOptionValue.trim(),
    };
    setFieldOptions([...fieldOptions, option]);
    setNewOptionValue('');
  }, [newOptionValue, fieldOptions]);

  const handleRemoveOption = useCallback((index: number) => {
    setFieldOptions(fieldOptions.filter((_, i) => i !== index));
  }, [fieldOptions]);

  const toggleAssignedDepartment = useCallback((code: string) => {
    setAssignedDepartments((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }, []);

  const styles = createStyles(colors);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        return (
          <React.Fragment key={step.key}>
            <TouchableOpacity
              style={[
                styles.stepDot,
                isActive && { backgroundColor: colors.primary },
                isCompleted && { backgroundColor: '#10B981' },
                !isActive && !isCompleted && { backgroundColor: colors.border },
              ]}
              onPress={() => {
                if (isCompleted || isActive) {
                  setCurrentStep(step.key);
                }
              }}
            >
              {isCompleted ? (
                <Check size={12} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepDotText,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {step.shortLabel}
                </Text>
              )}
            </TouchableOpacity>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: isCompleted ? '#10B981' : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderBasicStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Basic Information</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Set up the template name and button type
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Template Name *</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="e.g., Pre-OP, Equipment Failure"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Brief description of when to use this template"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Button Type *</Text>
        <View style={styles.buttonTypeGrid}>
          {(Object.keys(BUTTON_TYPE_LABELS) as ButtonType[]).map((type) => {
            const Icon = BUTTON_TYPE_ICONS[type];
            const color = BUTTON_TYPE_COLORS[type];
            const isSelected = buttonType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.buttonTypeOption,
                  { backgroundColor: isSelected ? color + '20' : colors.surface, borderColor: isSelected ? color : colors.border },
                ]}
                onPress={() => setButtonType(type)}
              >
                <Icon size={24} color={isSelected ? color : colors.textSecondary} />
                <Text style={[styles.buttonTypeLabel, { color: isSelected ? color : colors.text }]}>
                  {BUTTON_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Triggering Department *</Text>
        <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
          Which department can use this template?
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll}>
          {Object.values(DEPARTMENT_CODES).map((dept) => {
            const isSelected = triggeringDepartment === dept.code;
            return (
              <TouchableOpacity
                key={dept.code}
                style={[
                  styles.deptChip,
                  { backgroundColor: isSelected ? dept.color : colors.surface, borderColor: dept.color },
                ]}
                onPress={() => setTriggeringDepartment(dept.code)}
              >
                <View style={[styles.deptDot, { backgroundColor: isSelected ? '#fff' : dept.color }]} />
                <Text style={[styles.deptChipText, { color: isSelected ? '#fff' : colors.text }]}>
                  {dept.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderDepartmentsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Assigned Departments</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Select which departments will receive tasks when this template is used
      </Text>

      <View style={styles.deptGrid}>
        {Object.values(DEPARTMENT_CODES).map((dept) => {
          const isSelected = assignedDepartments.includes(dept.code);
          return (
            <TouchableOpacity
              key={dept.code}
              style={[
                styles.deptCard,
                { backgroundColor: isSelected ? dept.color + '15' : colors.surface, borderColor: isSelected ? dept.color : colors.border },
              ]}
              onPress={() => toggleAssignedDepartment(dept.code)}
            >
              <View style={[styles.deptCardDot, { backgroundColor: dept.color }]} />
              <Text style={[styles.deptCardName, { color: colors.text }]}>{dept.name}</Text>
              <Text style={[styles.deptCardCode, { color: colors.textSecondary }]}>{dept.code}</Text>
              {isSelected && (
                <View style={[styles.deptCardCheck, { backgroundColor: dept.color }]}>
                  <Check size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.selectedInfo, { backgroundColor: colors.surface }]}>
        <Layers size={16} color={colors.primary} />
        <Text style={[styles.selectedInfoText, { color: colors.text }]}>
          {assignedDepartments.length} department{assignedDepartments.length !== 1 ? 's' : ''} selected
        </Text>
      </View>
    </View>
  );

  const renderFieldsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Form Fields</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Build the form users will fill out. Use dropdowns to standardize responses.
      </Text>

      {formFields.length === 0 ? (
        <View style={[styles.emptyFields, { backgroundColor: colors.surface }]}>
          <Type size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyFieldsText, { color: colors.textSecondary }]}>
            No fields added yet
          </Text>
          <TouchableOpacity
            style={[styles.addFieldButton, { backgroundColor: colors.primary }]}
            onPress={handleAddField}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addFieldButtonText}>Add Field</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {formFields.map((field, index) => {
            const FieldIcon = FIELD_TYPE_ICONS[field.fieldType];
            return (
              <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.surface }]}>
                <View style={styles.fieldCardHeader}>
                  <GripVertical size={16} color={colors.textTertiary} />
                  <View style={[styles.fieldTypeIcon, { backgroundColor: colors.primary + '20' }]}>
                    <FieldIcon size={14} color={colors.primary} />
                  </View>
                  <View style={styles.fieldCardInfo}>
                    <Text style={[styles.fieldCardLabel, { color: colors.text }]}>
                      {field.label}
                      {field.required && <Text style={{ color: colors.error }}> *</Text>}
                    </Text>
                    <Text style={[styles.fieldCardType, { color: colors.textSecondary }]}>
                      {FIELD_TYPE_LABELS[field.fieldType]}
                      {field.options && ` • ${field.options.length} options`}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.fieldAction} onPress={() => handleEditField(index)}>
                    <Type size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fieldAction} onPress={() => handleDeleteField(index)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addFieldOutline, { borderColor: colors.primary }]}
            onPress={handleAddField}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[styles.addFieldOutlineText, { color: colors.primary }]}>Add Field</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderSettingsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Configure photo requirements and workflow rules
      </Text>

      <View style={[styles.settingCard, { backgroundColor: colors.surface }]}>
        <View style={styles.settingCardContent}>
          <View style={[styles.settingIcon, { backgroundColor: '#F59E0B' + '20' }]}>
            <Camera size={20} color="#F59E0B" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Photo Required</Text>
            <Text style={[styles.settingHint, { color: colors.textSecondary }]}>
              Require users to attach a photo
            </Text>
          </View>
          <Switch
            value={photoRequired}
            onValueChange={setPhotoRequired}
            trackColor={{ false: colors.border, true: '#F59E0B' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.primary + '10' }]}>
        <HelpCircle size={18} color={colors.primary} />
        <Text style={[styles.infoCardText, { color: colors.primary }]}>
          Workflow rules (PASS/FAIL actions, alerts) will be available in a future update.
        </Text>
      </View>
    </View>
  );

  const renderPreviewStep = () => {
    const ButtonIcon = BUTTON_TYPE_ICONS[buttonType];
    const buttonColor = BUTTON_TYPE_COLORS[buttonType];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Preview</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Review your template before saving
        </Text>

        <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.previewHeader}>
            <View style={[styles.previewIconContainer, { backgroundColor: buttonColor + '20' }]}>
              <ButtonIcon size={24} color={buttonColor} />
            </View>
            <View style={styles.previewHeaderInfo}>
              <Text style={[styles.previewName, { color: colors.text }]}>{name || 'Unnamed Template'}</Text>
              {description && (
                <Text style={[styles.previewDescription, { color: colors.textSecondary }]}>
                  {description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionLabel, { color: colors.textSecondary }]}>
              Triggering Department
            </Text>
            <View style={[styles.previewDeptBadge, { backgroundColor: getDepartmentColor(triggeringDepartment) + '20' }]}>
              <Text style={[styles.previewDeptText, { color: getDepartmentColor(triggeringDepartment) }]}>
                {getDepartmentName(triggeringDepartment)}
              </Text>
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionLabel, { color: colors.textSecondary }]}>
              Assigned Departments ({assignedDepartments.length})
            </Text>
            <View style={styles.previewDeptList}>
              {assignedDepartments.map((code) => (
                <View
                  key={code}
                  style={[styles.previewDeptSmall, { backgroundColor: getDepartmentColor(code) + '20' }]}
                >
                  <Text style={[styles.previewDeptSmallText, { color: getDepartmentColor(code) }]}>
                    {getDepartmentName(code)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionLabel, { color: colors.textSecondary }]}>
              Form Fields ({formFields.length})
            </Text>
            {formFields.map((field) => (
              <View key={field.id} style={[styles.previewField, { backgroundColor: colors.background }]}>
                <Text style={[styles.previewFieldLabel, { color: colors.text }]}>
                  {field.label}
                  {field.required && <Text style={{ color: colors.error }}> *</Text>}
                </Text>
                <Text style={[styles.previewFieldType, { color: colors.textSecondary }]}>
                  {FIELD_TYPE_LABELS[field.fieldType]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.previewSection}>
            <View style={styles.previewSettingRow}>
              <Camera size={16} color={photoRequired ? '#F59E0B' : colors.textTertiary} />
              <Text style={[styles.previewSettingText, { color: colors.text }]}>
                Photo {photoRequired ? 'Required' : 'Optional'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicStep();
      case 'departments':
        return renderDepartmentsStep();
      case 'fields':
        return renderFieldsStep();
      case 'settings':
        return renderSettingsStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Template' : 'Create Template',
          headerLeft: () => (
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {renderStepIndicator()}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {currentStepIndex > 0 ? (
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: colors.background }]}
            onPress={handleBack}
          >
            <Text style={[styles.footerButtonText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerButton} />
        )}

        {currentStepIndex < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: canGoNext ? colors.primary : colors.border },
            ]}
            onPress={handleNext}
            disabled={!canGoNext}
          >
            <Text style={[styles.footerButtonText, { color: canGoNext ? '#fff' : colors.textTertiary }]}>
              Next
            </Text>
            <ChevronRight size={18} color={canGoNext ? '#fff' : colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save size={18} color="#fff" />
            <Text style={[styles.footerButtonText, { color: '#fff' }]}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showFieldModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowFieldModal(false); resetFieldForm(); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingFieldIndex !== null ? 'Edit Field' : 'Add Field'}
            </Text>
            <TouchableOpacity onPress={handleSaveField}>
              <Check size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Field Label *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="e.g., Location, Batch Number"
                placeholderTextColor={colors.textTertiary}
                value={fieldLabel}
                onChangeText={setFieldLabel}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Field Type *</Text>
              <View style={styles.fieldTypeGrid}>
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => {
                  const Icon = FIELD_TYPE_ICONS[type];
                  const isSelected = fieldType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.fieldTypeOption,
                        { backgroundColor: isSelected ? colors.primary + '20' : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                      ]}
                      onPress={() => setFieldType(type)}
                    >
                      <Icon size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.fieldTypeLabel, { color: isSelected ? colors.primary : colors.text }]}>
                        {FIELD_TYPE_LABELS[type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.settingRow, { backgroundColor: colors.surface }]}>
              <Text style={[styles.settingRowLabel, { color: colors.text }]}>Required Field</Text>
              <Switch
                value={fieldRequired}
                onValueChange={setFieldRequired}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {['text_input', 'text_area', 'number'].includes(fieldType) && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Placeholder Text</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
                  placeholder="Hint text shown in field"
                  placeholderTextColor={colors.textTertiary}
                  value={fieldPlaceholder}
                  onChangeText={setFieldPlaceholder}
                />
              </View>
            )}

            {['dropdown', 'radio', 'checkbox'].includes(fieldType) && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Options *</Text>
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                  Add the choices users can select from
                </Text>

                {fieldOptions.map((option, index) => (
                  <View key={index} style={[styles.optionItem, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                    <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                      <X size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addOptionRow}>
                  <TextInput
                    style={[styles.textInput, styles.optionInput, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="New option"
                    placeholderTextColor={colors.textTertiary}
                    value={newOptionValue}
                    onChangeText={setNewOptionValue}
                    onSubmitEditing={handleAddOption}
                  />
                  <TouchableOpacity
                    style={[styles.addOptionButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddOption}
                  >
                    <Plus size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    headerButton: {
      padding: 8,
    },
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepDotText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    stepLine: {
      width: 24,
      height: 2,
      marginHorizontal: 4,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    stepContent: {
      padding: 16,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    inputHint: {
      fontSize: 13,
      marginBottom: 8,
    },
    textInput: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    buttonTypeGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    buttonTypeOption: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      gap: 8,
    },
    buttonTypeLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    deptScroll: {
      marginTop: 8,
    },
    deptChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
      gap: 8,
    },
    deptDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    deptChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    deptGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    deptCard: {
      width: '48%',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      position: 'relative',
    },
    deptCardDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginBottom: 8,
    },
    deptCardName: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    deptCardCode: {
      fontSize: 12,
    },
    deptCardCheck: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      marginTop: 16,
      gap: 10,
    },
    selectedInfoText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    emptyFields: {
      padding: 32,
      borderRadius: 12,
      alignItems: 'center',
      gap: 12,
    },
    emptyFieldsText: {
      fontSize: 14,
    },
    addFieldButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 6,
    },
    addFieldButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    fieldCard: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
    },
    fieldCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    fieldTypeIcon: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldCardInfo: {
      flex: 1,
    },
    fieldCardLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    fieldCardType: {
      fontSize: 12,
      marginTop: 2,
    },
    fieldAction: {
      padding: 6,
    },
    addFieldOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      gap: 8,
    },
    addFieldOutlineText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    settingCard: {
      borderRadius: 12,
      marginBottom: 16,
    },
    settingCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    settingHint: {
      fontSize: 13,
      marginTop: 2,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 10,
      gap: 10,
    },
    infoCardText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    previewCard: {
      borderRadius: 14,
      padding: 16,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewHeaderInfo: {
      flex: 1,
    },
    previewName: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    previewDescription: {
      fontSize: 13,
      marginTop: 4,
    },
    previewSection: {
      marginBottom: 16,
    },
    previewSectionLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 8,
      textTransform: 'uppercase' as const,
    },
    previewDeptBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    previewDeptText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    previewDeptList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    previewDeptSmall: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    previewDeptSmallText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    previewField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
      borderRadius: 8,
      marginBottom: 6,
    },
    previewFieldLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    previewFieldType: {
      fontSize: 12,
    },
    previewSettingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    previewSettingText: {
      fontSize: 14,
    },
    footer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
    },
    footerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
    },
    footerButtonPrimary: {},
    footerButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
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
      fontSize: 17,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    fieldTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    fieldTypeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
    },
    fieldTypeLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    settingRowLabel: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    optionLabel: {
      fontSize: 14,
    },
    addOptionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    optionInput: {
      flex: 1,
    },
    addOptionButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
