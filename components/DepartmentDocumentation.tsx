import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Lock,
  Send,
  Clock,
  User,
  Building2,
  ShieldAlert,
  FileCheck,
  Wrench,
  Gauge,
  AlertTriangle,
  X,
  Sparkles,
  Droplets,
  Wind,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  AlertOctagon,
  Shield,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DepartmentType,
  DepartmentWorkflow,
  CompletedDocumentationSection,
  DocumentationSectionTemplate,
  DocumentationField,
  DEPARTMENTS,
  DOCUMENTATION_TEMPLATES,
  getTemplatesByDepartment,
  getDepartmentById,
} from '@/mocks/workOrderData';
import {
  useAddDocumentation,
  useSendToDepartment,
  useUpdateDepartmentWorkflow,
} from '@/hooks/useSupabaseDepartmentDocumentation';

interface DepartmentDocumentationProps {
  workOrderId?: string;
  workflow?: DepartmentWorkflow;
  currentDepartment?: DepartmentType;
  requiredDepartments?: DepartmentType[];
  userDepartment?: DepartmentType;
  userId: string;
  userName: string;
  canEdit?: boolean;
  onAddDocumentation?: (section: CompletedDocumentationSection) => void;
  onSendToDepartment?: (department: DepartmentType, notes?: string) => void;
  onUpdateWorkflow?: (workflow: Partial<DepartmentWorkflow>) => void;
  onWorkflowUpdated?: (workflow: DepartmentWorkflow) => void;
}

const DEPARTMENT_ICONS: Record<DepartmentType, React.ReactNode> = {
  maintenance: <Wrench size={18} color="#3B82F6" />,
  safety: <ShieldAlert size={18} color="#EF4444" />,
  quality: <CheckCircle2 size={18} color="#10B981" />,
  compliance: <FileCheck size={18} color="#8B5CF6" />,
  calibration: <Gauge size={18} color="#F59E0B" />,
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'pre_op_inspection': <ClipboardCheck size={18} color="#3B82F6" />,
  'post_op_inspection': <ClipboardList size={18} color="#3B82F6" />,
  'safety_inspection': <ShieldCheck size={18} color="#EF4444" />,
  'hazard_assessment': <AlertTriangle size={18} color="#EF4444" />,
  'hygiene_report': <Sparkles size={18} color="#10B981" />,
  'wet_clean': <Droplets size={18} color="#10B981" />,
  'dry_wipe': <Wind size={18} color="#10B981" />,
  'quality_check': <BadgeCheck size={18} color="#10B981" />,
  'sqf_audit': <ClipboardCheck size={18} color="#8B5CF6" />,
  'fda_audit': <FileCheck size={18} color="#8B5CF6" />,
  'osha_compliance': <Shield size={18} color="#EF4444" />,
  'glass_audit': <AlertOctagon size={18} color="#10B981" />,
  'calibration_record': <Gauge size={18} color="#F59E0B" />,
  'vendor_verification': <Building2 size={18} color="#8B5CF6" />,
};

export default function DepartmentDocumentation({
  workOrderId,
  workflow,
  currentDepartment,
  requiredDepartments = [],
  userDepartment = 'maintenance',
  userId,
  userName,
  canEdit = true,
  onAddDocumentation,
  onSendToDepartment,
  onUpdateWorkflow,
  onWorkflowUpdated,
}: DepartmentDocumentationProps) {
  const { colors } = useTheme();
  const [expandedDepartments, setExpandedDepartments] = useState<Set<DepartmentType>>(
    new Set([currentDepartment || 'maintenance'])
  );
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentationSectionTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [sendNotes, setSendNotes] = useState('');

  const addDocumentationMutation = useAddDocumentation({
    onSuccess: (updatedWorkflow) => {
      console.log('[DepartmentDocumentation] Documentation added via Supabase');
      onWorkflowUpdated?.(updatedWorkflow);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to add documentation: ${error.message}`);
    },
  });

  const sendToDepartmentMutation = useSendToDepartment({
    onSuccess: (updatedWorkflow) => {
      console.log('[DepartmentDocumentation] Sent to department via Supabase');
      onWorkflowUpdated?.(updatedWorkflow);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to send to department: ${error.message}`);
    },
  });

  const updateWorkflowMutation = useUpdateDepartmentWorkflow({
    onSuccess: (updatedWorkflow) => {
      console.log('[DepartmentDocumentation] Workflow updated via Supabase');
      onWorkflowUpdated?.(updatedWorkflow);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to update workflow: ${error.message}`);
    },
  });

  const isMutating = addDocumentationMutation.isPending || 
    sendToDepartmentMutation.isPending || 
    updateWorkflowMutation.isPending;

  const toggleDepartment = useCallback((dept: DepartmentType) => {
    Haptics.selectionAsync();
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  }, []);

  const isCurrentUserDepartment = useCallback((dept: DepartmentType) => {
    return dept === userDepartment;
  }, [userDepartment]);

  const canAddToSection = useCallback((dept: DepartmentType) => {
    return canEdit && isCurrentUserDepartment(dept) && (currentDepartment === dept || !currentDepartment);
  }, [canEdit, isCurrentUserDepartment, currentDepartment]);

  const getSectionsByDepartment = useCallback((dept: DepartmentType) => {
    if (!workflow?.documentationSections) return [];
    return workflow.documentationSections.filter(s => s.department === dept);
  }, [workflow?.documentationSections]);

  const availableTemplates = useMemo(() => {
    return getTemplatesByDepartment(userDepartment);
  }, [userDepartment]);

  const handleOpenAddDoc = useCallback((template: DocumentationSectionTemplate) => {
    setSelectedTemplate(template);
    setFormValues({});
    setShowAddDocModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmitDocumentation = useCallback(() => {
    if (!selectedTemplate) return;

    const requiredFields = selectedTemplate.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const val = formValues[f.id];
      return val === undefined || val === null || val === '';
    });

    if (missingFields.length > 0) {
      Alert.alert('Required Fields', `Please complete: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    const newSection: CompletedDocumentationSection = {
      id: `doc-${Date.now()}`,
      templateId: selectedTemplate.id,
      department: selectedTemplate.department,
      completedBy: userId,
      completedByName: userName,
      completedAt: new Date().toISOString(),
      values: formValues,
      isLocked: true,
    };

    if (workOrderId) {
      addDocumentationMutation.mutate({
        workOrderId,
        section: newSection,
        currentWorkflow: workflow,
      });
    } else if (onAddDocumentation) {
      onAddDocumentation(newSection);
    }

    setShowAddDocModal(false);
    setSelectedTemplate(null);
    setFormValues({});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedTemplate, formValues, userId, userName, workOrderId, workflow, onAddDocumentation, addDocumentationMutation]);

  const handleSendToDepartment = useCallback((dept: DepartmentType) => {
    if (workOrderId) {
      sendToDepartmentMutation.mutate({
        workOrderId,
        targetDepartment: dept,
        sentBy: userName,
        notes: sendNotes || undefined,
        currentWorkflow: workflow,
      });
    } else if (onSendToDepartment) {
      onSendToDepartment(dept, sendNotes);
    }

    setShowSendModal(false);
    setSendNotes('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [workOrderId, workflow, sendNotes, userName, onSendToDepartment, sendToDepartmentMutation]);

  const styles = createStyles(colors);

  const renderField = (field: DocumentationField) => {
    const value = formValues[field.id];

    switch (field.type) {
      case 'boolean':
        return (
          <View key={field.id} style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <Switch
              value={!!value}
              onValueChange={(v) => handleFieldChange(field.id, v)}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={value ? colors.primary : colors.textTertiary}
            />
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <View style={styles.selectOptions}>
              {field.options?.map((opt) => (
                <Pressable
                  key={opt}
                  style={[
                    styles.selectOption,
                    {
                      backgroundColor: value === opt ? colors.primary + '20' : colors.backgroundSecondary,
                      borderColor: value === opt ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleFieldChange(field.id, opt)}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      { color: value === opt ? colors.primary : colors.text },
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[
                styles.textareaInput,
                { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
              ]}
              value={value || ''}
              onChangeText={(v) => handleFieldChange(field.id, v)}
              multiline
              numberOfLines={3}
              placeholder={field.placeholder || 'Enter details...'}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );

      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
              ]}
              value={value?.toString() || ''}
              onChangeText={(v) => handleFieldChange(field.id, parseFloat(v) || '')}
              keyboardType="numeric"
              placeholder={field.placeholder || 'Enter number...'}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );

      case 'date':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
              ]}
              value={value || ''}
              onChangeText={(v) => handleFieldChange(field.id, v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );

      default:
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
              ]}
              value={value || ''}
              onChangeText={(v) => handleFieldChange(field.id, v)}
              placeholder={field.placeholder || 'Enter...'}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );
    }
  };

  const renderCompletedSection = (section: CompletedDocumentationSection) => {
    const template = DOCUMENTATION_TEMPLATES.find(t => t.id === section.templateId);
    if (!template) return null;

    const isOwnSection = section.completedBy === userId;

    return (
      <View
        key={section.id}
        style={[
          styles.completedSection,
          { backgroundColor: template.color + '10', borderColor: template.color + '40' },
        ]}
      >
        <View style={styles.completedSectionHeader}>
          {TEMPLATE_ICONS[section.templateId] || <FileCheck size={18} color={template.color} />}
          <Text style={[styles.completedSectionTitle, { color: colors.text }]}>{template.name}</Text>
          {section.isLocked && <Lock size={14} color={colors.textTertiary} />}
        </View>
        
        <View style={styles.completedSectionMeta}>
          <View style={styles.metaItem}>
            <User size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{section.completedByName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {new Date(section.completedAt).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.completedFields}>
          {template.fields.map((field) => {
            const value = section.values[field.id];
            if (value === undefined || value === null) return null;

            return (
              <View key={field.id} style={styles.completedFieldRow}>
                <Text style={[styles.completedFieldLabel, { color: colors.textSecondary }]}>
                  {field.label}:
                </Text>
                <Text
                  style={[
                    styles.completedFieldValue,
                    { color: isOwnSection && !section.isLocked ? colors.text : colors.textSecondary },
                  ]}
                >
                  {field.type === 'boolean' ? (value ? '✓ Yes' : '✗ No') : value.toString()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderDepartmentSection = (dept: { id: DepartmentType; name: string; color: string; icon: string; description: string }) => {
    const department = getDepartmentById(dept.id);
    if (!department) return null;

    const sections = getSectionsByDepartment(dept.id);
    const isExpanded = expandedDepartments.has(dept.id);
    const isCurrent = currentDepartment === dept.id;
    const canAdd = canAddToSection(dept.id);
    const isCompleted = workflow?.completedDepartments?.includes(dept.id);

    return (
      <View
        key={dept.id}
        style={[
          styles.departmentSection,
          {
            backgroundColor: colors.surface,
            borderColor: isCurrent ? dept.color : colors.border,
            borderWidth: isCurrent ? 2 : 1,
          },
        ]}
      >
        <Pressable
          style={styles.departmentHeader}
          onPress={() => toggleDepartment(dept.id)}
        >
          <View style={styles.departmentHeaderLeft}>
            {DEPARTMENT_ICONS[dept.id]}
            <Text style={[styles.departmentTitle, { color: colors.text }]}>{dept.name}</Text>
            {isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: dept.color }]}>
                <Text style={styles.currentBadgeText}>CURRENT</Text>
              </View>
            )}
            {isCompleted && (
              <CheckCircle2 size={16} color="#10B981" />
            )}
            {sections.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: dept.color + '20' }]}>
                <Text style={[styles.countBadgeText, { color: dept.color }]}>{sections.length}</Text>
              </View>
            )}
          </View>
          {isExpanded ? (
            <ChevronDown size={20} color={colors.textSecondary} />
          ) : (
            <ChevronRight size={20} color={colors.textSecondary} />
          )}
        </Pressable>

        {isExpanded && (
          <View style={styles.departmentContent}>
            {sections.length > 0 ? (
              sections.map(renderCompletedSection)
            ) : (
              <Text style={[styles.noSectionsText, { color: colors.textTertiary }]}>
                No documentation added yet
              </Text>
            )}

            {canAdd && (
              <View style={styles.addDocContainer}>
                <Text style={[styles.addDocTitle, { color: colors.textSecondary }]}>
                  Add Documentation
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                  {availableTemplates.map((template) => (
                    <Pressable
                      key={template.id}
                      style={[
                        styles.templateCard,
                        { backgroundColor: template.color + '15', borderColor: template.color + '40' },
                      ]}
                      onPress={() => handleOpenAddDoc(template)}
                    >
                      {TEMPLATE_ICONS[template.id] || <FileCheck size={20} color={template.color} />}
                      <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={2}>
                        {template.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowHeaderLeft}>
          <Building2 size={20} color={colors.primary} />
          <Text style={[styles.workflowTitle, { color: colors.text }]}>Department Workflow</Text>
        </View>
        {canEdit && currentDepartment === userDepartment && (
          <Pressable
            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: isMutating ? 0.7 : 1 }]}
            onPress={() => setShowSendModal(true)}
            disabled={isMutating}
          >
            {sendToDepartmentMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
            <Text style={styles.sendButtonText}>Send To</Text>
          </Pressable>
        )}
      </View>

      {workflow?.routingHistory && workflow.routingHistory.length > 0 && (
        <View style={[styles.routingHistory, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.routingHistoryTitle, { color: colors.textSecondary }]}>
            Routing History
          </Text>
          {workflow.routingHistory.map((entry, index) => (
            <View key={index} style={styles.routingEntry}>
              <View style={[styles.routingDot, { backgroundColor: getDepartmentById(entry.department)?.color || colors.primary }]} />
              <View style={styles.routingContent}>
                <Text style={[styles.routingDept, { color: colors.text }]}>
                  {getDepartmentById(entry.department)?.name}
                </Text>
                <Text style={[styles.routingMeta, { color: colors.textTertiary }]}>
                  Sent by {entry.sentBy} • {new Date(entry.sentAt).toLocaleString()}
                </Text>
                {entry.notes && (
                  <Text style={[styles.routingNotes, { color: colors.textSecondary }]}>
                    &quot;{entry.notes}&quot;
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {DEPARTMENTS.map(dept => renderDepartmentSection(dept))}

      <Modal visible={showAddDocModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTemplate?.name || 'Add Documentation'}
            </Text>
            <Pressable onPress={() => setShowAddDocModal(false)}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedTemplate?.description && (
              <Text style={[styles.templateDescription, { color: colors.textSecondary }]}>
                {selectedTemplate.description}
              </Text>
            )}
            {selectedTemplate?.fields.map(renderField)}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowAddDocModal(false)}
              disabled={addDocumentationMutation.isPending}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, { backgroundColor: colors.primary, opacity: addDocumentationMutation.isPending ? 0.7 : 1 }]}
              onPress={handleSubmitDocumentation}
              disabled={addDocumentationMutation.isPending}
            >
              {addDocumentationMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit & Lock</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSendModal} animationType="slide" transparent>
        <View style={styles.sendModalOverlay}>
          <View style={[styles.sendModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send to Department</Text>
              <Pressable onPress={() => setShowSendModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.sendModalBody}>
              <Text style={[styles.sendModalLabel, { color: colors.textSecondary }]}>
                Select destination department:
              </Text>
              {DEPARTMENTS.filter(d => d.id !== userDepartment).map((dept) => (
                <Pressable
                  key={dept.id}
                  style={[
                    styles.departmentOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleSendToDepartment(dept.id)}
                  disabled={sendToDepartmentMutation.isPending}
                >
                  {DEPARTMENT_ICONS[dept.id]}
                  <View style={styles.departmentOptionContent}>
                    <Text style={[styles.departmentOptionName, { color: colors.text }]}>{dept.name}</Text>
                    <Text style={[styles.departmentOptionDesc, { color: colors.textSecondary }]}>
                      {dept.description}
                    </Text>
                  </View>
                  {sendToDepartmentMutation.isPending ? (
                    <ActivityIndicator size="small" color={dept.color} />
                  ) : (
                    <Send size={18} color={dept.color} />
                  )}
                </Pressable>
              ))}
              <View style={styles.sendNotesContainer}>
                <Text style={[styles.sendModalLabel, { color: colors.textSecondary }]}>Notes (optional):</Text>
                <TextInput
                  style={[
                    styles.sendNotesInput,
                    { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border },
                  ]}
                  value={sendNotes}
                  onChangeText={setSendNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Add notes for the receiving department..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    workflowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    workflowHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    workflowTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    routingHistory: {
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    routingHistoryTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    routingEntry: {
      flexDirection: 'row',
      gap: 10,
    },
    routingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    routingContent: {
      flex: 1,
    },
    routingDept: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    routingMeta: {
      fontSize: 11,
      marginTop: 2,
    },
    routingNotes: {
      fontSize: 12,
      fontStyle: 'italic' as const,
      marginTop: 4,
    },
    departmentSection: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    departmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    departmentHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    departmentTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    currentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    currentBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700' as const,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    departmentContent: {
      padding: 14,
      paddingTop: 0,
      gap: 10,
    },
    noSectionsText: {
      fontSize: 13,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      paddingVertical: 12,
    },
    completedSection: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    completedSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    completedSectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      flex: 1,
    },
    completedSectionMeta: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
    },
    completedFields: {
      gap: 4,
    },
    completedFieldRow: {
      flexDirection: 'row',
      gap: 8,
    },
    completedFieldLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    completedFieldValue: {
      fontSize: 12,
      flex: 1,
    },
    addDocContainer: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    addDocTitle: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    templatesScroll: {
      marginHorizontal: -4,
    },
    templateCard: {
      width: 100,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      marginHorizontal: 4,
      gap: 6,
    },
    templateName: {
      fontSize: 11,
      fontWeight: '500' as const,
      textAlign: 'center' as const,
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
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    templateDescription: {
      fontSize: 13,
      marginBottom: 16,
      lineHeight: 18,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      marginBottom: 6,
    },
    textInput: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      fontSize: 14,
    },
    textareaInput: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    selectOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    selectOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    selectOptionText: {
      fontSize: 13,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    submitButton: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600' as const,
    },
    sendModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sendModalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    sendModalBody: {
      padding: 16,
    },
    sendModalLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
      marginBottom: 12,
    },
    departmentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    departmentOptionContent: {
      flex: 1,
    },
    departmentOptionName: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    departmentOptionDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    sendNotesContainer: {
      marginTop: 12,
    },
    sendNotesInput: {
      borderRadius: 10,
      borderWidth: 1,
      padding: 12,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
  });
