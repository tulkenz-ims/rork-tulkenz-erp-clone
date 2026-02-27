// app/(tabs)/quality/formbuilder.tsx
// Custom Form Builder — create forms from PDF upload or manually
// Supports versioning, archiving, editing, and AI-powered PDF parsing

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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  X,
  Upload,
  FileText,
  Trash2,
  Archive,
  RotateCcw,
  ChevronRight,
  CheckCircle,
  Edit3,
  Eye,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import {
  useCustomFormTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useArchiveTemplate,
  useRestoreTemplate,
  useDeleteTemplate,
  parsePdfToSchema,
  CustomFormSchema,
  CustomFormSection,
  CustomFormField,
  CustomFormTemplate,
} from '@/hooks/useCustomForms';

// ── Constants ──────────────────────────────────────────────────

const BLUE = '#3B82F6';
const GREEN = '#10B981';
const ORANGE = '#F97316';
const RED = '#EF4444';
const PURPLE = '#8B5CF6';

const CATEGORIES = [
  { value: 'quality', label: 'Quality', color: BLUE },
  { value: 'safety', label: 'Safety', color: RED },
  { value: 'sanitation', label: 'Sanitation', color: GREEN },
  { value: 'maintenance', label: 'Maintenance', color: ORANGE },
  { value: 'production', label: 'Production', color: PURPLE },
  { value: 'general', label: 'General', color: '#6B7280' },
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  text_input: 'Text',
  text_area: 'Long Text',
  number: 'Number',
  date: 'Date',
  time: 'Time',
  dropdown: 'Dropdown',
  radio: 'Radio',
  checkbox: 'Checkbox',
  pass_fail: 'Pass/Fail',
  initials: 'Initials',
  label: 'Label',
};

// ── Component ──────────────────────────────────────────────────

export default function FormBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Template queries
  const { data: activeTemplates = [], isLoading: loadingActive, refetch: refetchActive } =
    useCustomFormTemplates({ status: 'active' });
  const { data: archivedTemplates = [], isLoading: loadingArchived, refetch: refetchArchived } =
    useCustomFormTemplates({ status: 'archived' });

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const archiveMutation = useArchiveTemplate();
  const restoreMutation = useRestoreTemplate();
  const deleteMutation = useDeleteTemplate();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomFormTemplate | null>(null);

  // Create/Edit form state
  const [isParsing, setIsParsing] = useState(false);
  const [parseInstructions, setParseInstructions] = useState('');
  const [schema, setSchema] = useState<CustomFormSchema | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [templateCategory, setTemplateCategory] = useState('quality');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const templates = activeTab === 'active' ? activeTemplates : archivedTemplates;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchived;

  // ── Handlers ─────────────────────────────────────────────────

  const resetEditor = useCallback(() => {
    setSchema(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCode('');
    setTemplateCategory('quality');
    setParseInstructions('');
    setEditingTemplate(null);
    setExpandedSections(new Set());
  }, []);

  const handleUploadPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsParsing(true);
      setShowCreateModal(false);

      // Read file as base64
      let base64Data: string;
      if (Platform.OS === 'web') {
        // Web: fetch blob and convert
        const response = await fetch(file.uri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const mimeType = file.mimeType || 'application/pdf';

      // Call AI parsing API
      const parsed = await parsePdfToSchema(base64Data, mimeType, parseInstructions || undefined);

      // Populate editor with parsed schema
      setSchema(parsed);
      setTemplateName(parsed.name || file.name?.replace(/\.[^.]+$/, '') || 'Untitled Form');
      setTemplateDescription(parsed.description || '');
      setTemplateCode(parsed.docId || `FORM-${Date.now().toString(36).toUpperCase()}`);
      setTemplateCategory(parsed.category || 'quality');

      // Expand all sections for review
      setExpandedSections(new Set(parsed.sections.map(s => s.id)));

      setShowEditorModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error('[FormBuilder] Upload error:', err);
      Alert.alert('Parse Error', err.message || 'Failed to analyze form. Please try again.');
    } finally {
      setIsParsing(false);
    }
  }, [parseInstructions]);

  const handleCreateManual = useCallback(() => {
    setShowCreateModal(false);
    resetEditor();

    // Create a blank schema
    const blankSchema: CustomFormSchema = {
      name: '',
      description: '',
      docId: `FORM-${Date.now().toString(36).toUpperCase()}`,
      category: 'quality',
      complianceRefs: [],
      sections: [
        {
          id: 'sec_1',
          title: 'SECTION 1',
          fields: [
            {
              id: 'field_1',
              label: 'Field 1',
              fieldType: 'text_input',
              required: true,
              width: 'full',
              placeholder: '',
            },
          ],
        },
      ],
      signatures: [
        { id: 'sig_1', label: 'Signature', required: true },
      ],
    };

    setSchema(blankSchema);
    setTemplateCode(blankSchema.docId);
    setExpandedSections(new Set(['sec_1']));
    setShowEditorModal(true);
  }, [resetEditor]);

  const handleEditTemplate = useCallback((template: CustomFormTemplate) => {
    setEditingTemplate(template);
    setSchema(template.formSchema);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateCode(template.templateCode);
    setTemplateCategory(template.category);
    setExpandedSections(new Set());
    setShowEditorModal(true);
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!schema) return;
    if (!templateName.trim()) { Alert.alert('Error', 'Template name is required'); return; }
    if (!templateCode.trim()) { Alert.alert('Error', 'Template code is required'); return; }

    try {
      const fullSchema: CustomFormSchema = {
        ...schema,
        name: templateName,
        description: templateDescription,
        docId: templateCode,
        category: templateCategory,
      };

      if (editingTemplate) {
        // Update → create new version, archive old
        await updateMutation.mutateAsync({
          existingTemplateId: editingTemplate.id,
          templateCode: editingTemplate.templateCode,
          name: templateName,
          description: templateDescription,
          category: templateCategory,
          formSchema: fullSchema,
          currentVersion: editingTemplate.version,
          complianceRefs: schema.complianceRefs || [],
        });
        Alert.alert('Updated', `Version ${editingTemplate.version + 1} created. Previous version archived.`);
      } else {
        // Create new
        await createMutation.mutateAsync({
          templateCode,
          name: templateName,
          description: templateDescription,
          category: templateCategory,
          formSchema: fullSchema,
          sourceType: 'ai_generated',
          complianceRefs: schema.complianceRefs || [],
        });
        Alert.alert('Saved', `Form template "${templateName}" created successfully.`);
      }

      setShowEditorModal(false);
      resetEditor();
      refetchActive();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save template');
    }
  }, [schema, templateName, templateDescription, templateCode, templateCategory, editingTemplate, createMutation, updateMutation, resetEditor, refetchActive]);

  const handleArchive = useCallback((template: CustomFormTemplate) => {
    Alert.alert(
      'Archive Template',
      `Archive "${template.name}" v${template.version}? It will move to the Archived tab. Existing submissions are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await archiveMutation.mutateAsync(template.id);
            refetchActive();
            refetchArchived();
          },
        },
      ]
    );
  }, [archiveMutation, refetchActive, refetchArchived]);

  const handleRestore = useCallback((template: CustomFormTemplate) => {
    Alert.alert(
      'Restore Template',
      `Restore "${template.name}" v${template.version} to active?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            await restoreMutation.mutateAsync(template.id);
            refetchActive();
            refetchArchived();
          },
        },
      ]
    );
  }, [restoreMutation, refetchActive, refetchArchived]);

  const handleHardDelete = useCallback((template: CustomFormTemplate) => {
    Alert.alert(
      'Permanently Delete',
      `Permanently delete "${template.name}" v${template.version}? This cannot be undone. Any existing submissions will be orphaned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync(template.id);
            refetchActive();
            refetchArchived();
          },
        },
      ]
    );
  }, [deleteMutation, refetchActive, refetchArchived]);

  // ── Schema Editor Helpers ────────────────────────────────────

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  }, []);

  const updateField = useCallback((sectionId: string, fieldId: string, key: string, value: any) => {
    if (!schema) return;
    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(sec =>
          sec.id === sectionId
            ? { ...sec, fields: sec.fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f) }
            : sec
        ),
      };
    });
  }, [schema]);

  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    if (!schema) return;
    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(sec =>
          sec.id === sectionId
            ? { ...sec, fields: sec.fields.filter(f => f.id !== fieldId) }
            : sec
        ),
      };
    });
  }, [schema]);

  const addField = useCallback((sectionId: string) => {
    if (!schema) return;
    const newId = `field_${Date.now()}`;
    const newField: CustomFormField = {
      id: newId,
      label: 'New Field',
      fieldType: 'text_input',
      required: true,
      width: 'full',
    };
    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(sec =>
          sec.id === sectionId
            ? { ...sec, fields: [...sec.fields, newField] }
            : sec
        ),
      };
    });
  }, [schema]);

  const addSection = useCallback(() => {
    if (!schema) return;
    const newId = `sec_${Date.now()}`;
    const newSection: CustomFormSection = {
      id: newId,
      title: 'NEW SECTION',
      fields: [{
        id: `field_${Date.now()}`,
        label: 'Field 1',
        fieldType: 'text_input',
        required: true,
        width: 'full',
      }],
    };
    setSchema(prev => {
      if (!prev) return prev;
      return { ...prev, sections: [...prev.sections, newSection] };
    });
    setExpandedSections(prev => new Set([...prev, newId]));
  }, [schema]);

  const deleteSection = useCallback((sectionId: string) => {
    if (!schema) return;
    Alert.alert('Delete Section', 'Delete this section and all its fields?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSchema(prev => {
            if (!prev) return prev;
            return { ...prev, sections: prev.sections.filter(s => s.id !== sectionId) };
          });
        },
      },
    ]);
  }, [schema]);

  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    if (!schema) return;
    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s => s.id === sectionId ? { ...s, title } : s),
      };
    });
  }, [schema]);

  const totalFields = useMemo(() => {
    if (!schema) return 0;
    return schema.sections.reduce((sum, sec) => sum + sec.fields.length, 0);
  }, [schema]);

  // ── Render ───────────────────────────────────────────────────

  const getCategoryColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || '#6B7280';

  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { refetchActive(); refetchArchived(); }}
            tintColor={BLUE}
          />
        }
      >
        {/* Page Header */}
        <View style={[st.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[st.iconCircle, { backgroundColor: PURPLE + '20' }]}>
            <FileText size={28} color={PURPLE} />
          </View>
          <Text style={[st.pageTitle, { color: colors.text }]}>Form Builder</Text>
          <Text style={[st.pageSub, { color: colors.textSecondary }]}>
            Create digital forms from PDF uploads or build from scratch
          </Text>
        </View>

        {/* New Form Button */}
        <Pressable
          style={[st.addBtn, { backgroundColor: PURPLE }]}
          onPress={() => setShowCreateModal(true)}
          disabled={isParsing}
        >
          {isParsing ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={st.addBtnText}>Analyzing PDF with AI...</Text>
            </>
          ) : (
            <>
              <Plus size={20} color="#FFF" />
              <Text style={st.addBtnText}>Create New Form Template</Text>
            </>
          )}
        </Pressable>

        {/* Tabs */}
        <View style={[st.tabRow, { borderColor: colors.border }]}>
          <Pressable
            style={[st.tab, activeTab === 'active' && { borderBottomColor: PURPLE, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[st.tabText, { color: activeTab === 'active' ? PURPLE : colors.textSecondary }]}>
              Active ({activeTemplates.length})
            </Text>
          </Pressable>
          <Pressable
            style={[st.tab, activeTab === 'archived' && { borderBottomColor: PURPLE, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('archived')}
          >
            <Text style={[st.tabText, { color: activeTab === 'archived' ? PURPLE : colors.textSecondary }]}>
              Archived ({archivedTemplates.length})
            </Text>
          </Pressable>
        </View>

        {/* Template List */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : templates.length === 0 ? (
          <View style={[st.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={32} color={colors.textSecondary} />
            <Text style={[st.emptyTitle, { color: colors.text }]}>
              {activeTab === 'active' ? 'No Form Templates' : 'No Archived Templates'}
            </Text>
            <Text style={[st.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'active'
                ? 'Upload a PDF or build a form from scratch to get started.'
                : 'Archived templates will appear here.'}
            </Text>
          </View>
        ) : (
          templates.map(template => {
            const catColor = getCategoryColor(template.category);
            return (
              <View key={template.id} style={[st.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={st.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.cardName, { color: colors.text }]}>{template.name}</Text>
                    <Text style={[st.cardCode, { color: colors.textSecondary }]}>
                      {template.templateCode}  •  v{template.version}
                    </Text>
                  </View>
                  <View style={[st.catBadge, { backgroundColor: catColor + '20' }]}>
                    <Text style={[st.catBadgeText, { color: catColor }]}>
                      {template.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {template.description && (
                  <Text style={[st.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}

                <View style={st.cardMeta}>
                  <Text style={[st.cardMetaText, { color: colors.textSecondary }]}>
                    {template.formSchema.sections?.length || 0} sections  •  {(template.formSchema.sections || []).reduce((s: number, sec: any) => s + (sec.fields?.length || 0), 0)} fields
                  </Text>
                  <Text style={[st.cardMetaText, { color: colors.textSecondary }]}>
                    {template.createdByName}  •  {new Date(template.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={st.cardActions}>
                  {activeTab === 'active' ? (
                    <>
                      <Pressable style={[st.actionBtn, { backgroundColor: BLUE + '15' }]} onPress={() => router.push({ pathname: '/(tabs)/compliance/customformfill' as any, params: { templateId: template.id } })}>
                        <Eye size={14} color={BLUE} />
                        <Text style={[st.actionBtnText, { color: BLUE }]}>Fill Out</Text>
                      </Pressable>
                      <Pressable style={[st.actionBtn, { backgroundColor: ORANGE + '15' }]} onPress={() => handleEditTemplate(template)}>
                        <Edit3 size={14} color={ORANGE} />
                        <Text style={[st.actionBtnText, { color: ORANGE }]}>Edit</Text>
                      </Pressable>
                      <Pressable style={[st.actionBtn, { backgroundColor: RED + '15' }]} onPress={() => handleArchive(template)}>
                        <Archive size={14} color={RED} />
                        <Text style={[st.actionBtnText, { color: RED }]}>Archive</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable style={[st.actionBtn, { backgroundColor: GREEN + '15' }]} onPress={() => handleRestore(template)}>
                        <RotateCcw size={14} color={GREEN} />
                        <Text style={[st.actionBtnText, { color: GREEN }]}>Restore</Text>
                      </Pressable>
                      <Pressable style={[st.actionBtn, { backgroundColor: RED + '15' }]} onPress={() => handleHardDelete(template)}>
                        <Trash2 size={14} color={RED} />
                        <Text style={[st.actionBtnText, { color: RED }]}>Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>

                {template.complianceRefs && template.complianceRefs.length > 0 && (
                  <View style={st.complianceRow}>
                    {template.complianceRefs.map((ref, i) => (
                      <View key={i} style={[st.compBadge, { backgroundColor: colors.background }]}>
                        <Text style={[st.compBadgeText, { color: colors.textSecondary }]}>{ref}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* CREATE MODAL — Upload PDF or Build Manual                     */}
      {/* ============================================================ */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <Pressable style={st.overlay} onPress={() => setShowCreateModal(false)}>
          <View style={[st.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[st.sheetTitle, { color: colors.text }]}>Create New Form Template</Text>

            <Pressable style={[st.optionBtn, { borderColor: PURPLE }]} onPress={handleUploadPdf}>
              <Upload size={24} color={PURPLE} />
              <View style={{ flex: 1 }}>
                <Text style={[st.optionTitle, { color: colors.text }]}>Upload PDF / Image</Text>
                <Text style={[st.optionDesc, { color: colors.textSecondary }]}>
                  AI will analyze your paper form and create a digital version automatically
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>

            <Pressable style={[st.optionBtn, { borderColor: BLUE }]} onPress={handleCreateManual}>
              <Edit3 size={24} color={BLUE} />
              <View style={{ flex: 1 }}>
                <Text style={[st.optionTitle, { color: colors.text }]}>Build from Scratch</Text>
                <Text style={[st.optionDesc, { color: colors.textSecondary }]}>
                  Manually create sections and fields for your form
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </Pressable>

            <TextInput
              style={[st.instructionsInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={parseInstructions}
              onChangeText={setParseInstructions}
              placeholder="Optional: Add instructions for AI parsing (e.g. 'This is a safety inspection form for our bakery line')"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ============================================================ */}
      {/* SCHEMA EDITOR MODAL                                           */}
      {/* ============================================================ */}
      <Modal visible={showEditorModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
          {/* Editor Header */}
          <View style={[st.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowEditorModal(false); resetEditor(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[st.editorTitle, { color: colors.text }]}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </Text>
            <Pressable onPress={handleSaveTemplate} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator color={PURPLE} />
              ) : (
                <Text style={[st.saveBtn, { color: PURPLE }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Template Info */}
            <View style={[st.editorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[st.editorLabel, { color: colors.textSecondary }]}>Template Name *</Text>
              <TextInput
                style={[st.editorInput, { color: colors.text, borderColor: colors.border }]}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="e.g. Pre-Op Inspection Checklist"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[st.editorLabel, { color: colors.textSecondary, marginTop: 12 }]}>Document Code *</Text>
              <TextInput
                style={[st.editorInput, { color: colors.text, borderColor: colors.border }]}
                value={templateCode}
                onChangeText={setTemplateCode}
                placeholder="e.g. QA-FORM-001"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                editable={!editingTemplate}
              />

              <Text style={[st.editorLabel, { color: colors.textSecondary, marginTop: 12 }]}>Description</Text>
              <TextInput
                style={[st.editorInput, { color: colors.text, borderColor: colors.border, minHeight: 60 }]}
                value={templateDescription}
                onChangeText={setTemplateDescription}
                placeholder="Brief description of this form"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Text style={[st.editorLabel, { color: colors.textSecondary, marginTop: 12 }]}>Category</Text>
              <View style={st.catPicker}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.value}
                    style={[st.catOption, templateCategory === cat.value && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                    onPress={() => setTemplateCategory(cat.value)}
                  >
                    <Text style={[st.catOptionText, { color: templateCategory === cat.value ? cat.color : colors.textSecondary }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Schema Summary */}
            <View style={[st.summaryBar, { backgroundColor: PURPLE + '10', borderColor: PURPLE + '30' }]}>
              <Text style={[st.summaryText, { color: PURPLE }]}>
                {schema?.sections.length || 0} sections  •  {totalFields} fields  •  {schema?.signatures.length || 0} signatures
              </Text>
            </View>

            {/* Sections & Fields */}
            {schema?.sections.map((section, secIdx) => {
              const isExpanded = expandedSections.has(section.id);
              return (
                <View key={section.id} style={[st.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable style={st.sectionHeader} onPress={() => toggleSection(section.id)}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[st.sectionTitleInput, { color: colors.text }]}
                        value={section.title}
                        onChangeText={(t) => updateSectionTitle(section.id, t)}
                        placeholder="Section Title"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text style={[st.sectionMeta, { color: colors.textSecondary }]}>
                        {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={st.sectionActions}>
                      <Pressable onPress={() => deleteSection(section.id)} hitSlop={8}>
                        <Trash2 size={16} color={RED} />
                      </Pressable>
                      {isExpanded ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={st.fieldsContainer}>
                      {section.fields.map((field, fieldIdx) => (
                        <View key={field.id} style={[st.fieldRow, { borderColor: colors.border }]}>
                          <View style={st.fieldHeader}>
                            <View style={[st.fieldTypeBadge, { backgroundColor: BLUE + '15' }]}>
                              <Text style={[st.fieldTypeText, { color: BLUE }]}>
                                {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
                              </Text>
                            </View>
                            <Pressable
                              style={[st.reqToggle, field.required && { backgroundColor: GREEN + '15' }]}
                              onPress={() => updateField(section.id, field.id, 'required', !field.required)}
                            >
                              <Text style={{ fontSize: 10, color: field.required ? GREEN : colors.textSecondary }}>
                                {field.required ? 'REQ' : 'OPT'}
                              </Text>
                            </Pressable>
                            <Pressable onPress={() => deleteField(section.id, field.id)} hitSlop={8}>
                              <X size={14} color={RED} />
                            </Pressable>
                          </View>
                          <TextInput
                            style={[st.fieldLabelInput, { color: colors.text, borderColor: colors.border }]}
                            value={field.label}
                            onChangeText={(t) => updateField(section.id, field.id, 'label', t)}
                            placeholder="Field label"
                            placeholderTextColor={colors.textSecondary}
                          />
                          <View style={st.fieldWidthRow}>
                            {(['full', 'half', 'third'] as const).map(w => (
                              <Pressable
                                key={w}
                                style={[st.widthBtn, field.width === w && { backgroundColor: PURPLE + '20', borderColor: PURPLE }]}
                                onPress={() => updateField(section.id, field.id, 'width', w)}
                              >
                                <Text style={{ fontSize: 10, color: field.width === w ? PURPLE : colors.textSecondary }}>
                                  {w.toUpperCase()}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ))}

                      <Pressable style={[st.addFieldBtn, { borderColor: colors.border }]} onPress={() => addField(section.id)}>
                        <Plus size={14} color={BLUE} />
                        <Text style={{ fontSize: 12, color: BLUE }}>Add Field</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add Section */}
            <Pressable style={[st.addSectionBtn, { borderColor: PURPLE }]} onPress={addSection}>
              <Plus size={16} color={PURPLE} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: PURPLE }}>Add Section</Text>
            </Pressable>

            {/* Signatures */}
            <View style={[st.editorCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
              <Text style={[st.editorLabel, { color: colors.text, fontWeight: '700', fontSize: 14 }]}>
                PPN Signatures ({schema?.signatures.length || 0})
              </Text>
              {schema?.signatures.map((sig, i) => (
                <View key={sig.id} style={[st.sigRow, { borderColor: colors.border }]}>
                  <TextInput
                    style={[st.editorInput, { flex: 1, color: colors.text, borderColor: colors.border }]}
                    value={sig.label}
                    onChangeText={(t) => {
                      setSchema(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          signatures: prev.signatures.map(s => s.id === sig.id ? { ...s, label: t } : s),
                        };
                      });
                    }}
                    placeholder="Signature label"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Pressable onPress={() => {
                    setSchema(prev => {
                      if (!prev) return prev;
                      return { ...prev, signatures: prev.signatures.filter(s => s.id !== sig.id) };
                    });
                  }}>
                    <X size={16} color={RED} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={[st.addFieldBtn, { borderColor: colors.border, marginTop: 8 }]}
                onPress={() => {
                  setSchema(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      signatures: [...prev.signatures, { id: `sig_${Date.now()}`, label: 'New Signature', required: true }],
                    };
                  });
                }}
              >
                <Plus size={14} color={PURPLE} />
                <Text style={{ fontSize: 12, color: PURPLE }}>Add Signature</Text>
              </Pressable>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const st = StyleSheet.create({
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 14, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  emptyBox: { borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardCode: { fontSize: 12, marginTop: 2 },
  cardDesc: { fontSize: 12, marginBottom: 8, lineHeight: 16 },
  cardMeta: { marginBottom: 10, gap: 2 },
  cardMetaText: { fontSize: 11 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  complianceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  compBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  compBadgeText: { fontSize: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12, marginTop: 2 },
  instructionsInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, marginTop: 8, minHeight: 60, textAlignVertical: 'top' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  editorTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  editorCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  editorLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  editorInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  catOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  catOptionText: { fontSize: 12, fontWeight: '600' },
  summaryBar: { borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, marginBottom: 12 },
  summaryText: { fontSize: 13, fontWeight: '600' },
  sectionCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  sectionTitleInput: { fontSize: 14, fontWeight: '700' },
  sectionMeta: { fontSize: 11, marginTop: 2 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fieldsContainer: { paddingHorizontal: 12, paddingBottom: 12 },
  fieldRow: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 6 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fieldTypeText: { fontSize: 10, fontWeight: '600' },
  reqToggle: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  fieldLabelInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13 },
  fieldWidthRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  widthBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  addFieldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderRadius: 8, borderStyle: 'dashed' },
  addSectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed', marginTop: 4 },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
});
