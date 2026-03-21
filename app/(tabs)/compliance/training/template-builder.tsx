import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useTrainingTemplate,
  useCreateTrainingTemplate,
  useUpdateTrainingTemplate,
  useTemplateSteps,
  useCreateTemplateStep,
  useUpdateTemplateStep,
  useDeleteTemplateStep,
  useTemplateQuestions,
  useCreateTemplateQuestion,
  useUpdateTemplateQuestion,
  useDeleteTemplateQuestion,
  useTemplateChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useTemplateDocuments,
  useAddTemplateDocument,
  useRemoveTemplateDocument,
  TrainingTemplateStep,
  TrainingTemplateQuestion,
  TrainingTemplateChecklistItem,
  TrainingTemplateDocument,
} from '@/hooks/useTraining';

const HUD_BG = '#0a0e1a';
const HUD_CARD = '#0d1117';
const HUD_BORDER = '#1a2332';
const HUD_ACCENT = '#00d4ff';
const HUD_GREEN = '#00ff88';
const HUD_YELLOW = '#ffcc00';
const HUD_RED = '#ff4444';
const HUD_ORANGE = '#ff8800';
const HUD_PURPLE = '#9945ff';
const HUD_TEXT = '#e2e8f0';
const HUD_TEXT_DIM = '#64748b';
const HUD_TEXT_BRIGHT = '#ffffff';

const TABS = ['info', 'documents', 'steps', 'test', 'checklist'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  info: 'INFO',
  documents: 'DOCS',
  steps: 'OJT STEPS',
  test: 'TEST',
  checklist: 'HANDS-ON',
};

const TRAINING_TYPES = [
  { value: 'ojt', label: 'OJT — On the Job Training' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'online', label: 'Online' },
  { value: 'external', label: 'External' },
  { value: 'rippling', label: 'Rippling LMS' },
];

const STEP_TYPES = [
  { value: 'demonstrate', label: 'Step 1 — Trainer Demonstrates', color: HUD_ACCENT },
  { value: 'together', label: 'Step 2 — Do Together', color: HUD_GREEN },
  { value: 'solo', label: 'Step 3 — Employee Solo', color: HUD_YELLOW },
  { value: 'evaluate', label: 'Step 4 — Evaluation', color: HUD_ORANGE },
];

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
];

const DOC_TYPES = [
  { value: 'SOP', label: 'SOP' },
  { value: 'OPL', label: 'OPL' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Work Instruction', label: 'Work Instruction' },
  { value: 'SDS', label: 'SDS' },
  { value: 'Form', label: 'Form' },
  { value: 'External Reference', label: 'External Reference' },
];

const DEPARTMENTS = [
  { code: '1001', name: 'Maintenance' },
  { code: '1002', name: 'Sanitation' },
  { code: '1003', name: 'Production' },
  { code: '1004', name: 'Quality' },
  { code: '1005', name: 'Safety' },
];

const PRIORITIES = ['low', 'normal', 'high', 'critical'];

export default function TemplateBuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trainingType, setTrainingType] = useState('ojt');
  const [status, setStatus] = useState('draft');
  const [version, setVersion] = useState('1.0');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [appliesToAll, setAppliesToAll] = useState(false);
  const [retrainingRequired, setRetrainingRequired] = useState(true);
  const [retrainingDays, setRetrainingDays] = useState('365');
  const [ripplingSyncEnabled, setRipplingSyncEnabled] = useState(false);
  const [ripplingCourseId, setRipplingCourseId] = useState('');
  const [hasOjtSteps, setHasOjtSteps] = useState(true);
  const [hasKnowledgeTest, setHasKnowledgeTest] = useState(true);
  const [passingScore, setPassingScore] = useState('80');
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [hasHandsOn, setHasHandsOn] = useState(true);
  const [issuesCert, setIssuesCert] = useState(false);
  const [certName, setCertName] = useState('');
  const [certValidityDays, setCertValidityDays] = useState('365');
  const [certAutoIssue, setCertAutoIssue] = useState(false);
  const [taskFeedPriority, setTaskFeedPriority] = useState('normal');
  const [notes, setNotes] = useState('');

  // Step modal
  const [stepModal, setStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<TrainingTemplateStep | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepType, setStepType] = useState('demonstrate');
  const [stepDescription, setStepDescription] = useState('');
  const [stepInstructions, setStepInstructions] = useState('');
  const [stepEstMinutes, setStepEstMinutes] = useState('');
  const [stepTrainerSignoff, setStepTrainerSignoff] = useState(true);
  const [stepObserverSignoff, setStepObserverSignoff] = useState(false);

  // Question modal
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TrainingTemplateQuestion | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [questionPoints, setQuestionPoints] = useState('1');
  const [questionExplanation, setQuestionExplanation] = useState('');

  // Checklist modal
  const [checklistModal, setChecklistModal] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<TrainingTemplateChecklistItem | null>(null);
  const [skillDescription, setSkillDescription] = useState('');
  const [evalCriteria, setEvalCriteria] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  // Document modal
  const [docModal, setDocModal] = useState(false);
  const [docSourceType, setDocSourceType] = useState('document');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('SOP');
  const [docUrl, setDocUrl] = useState('');
  const [docRequired, setDocRequired] = useState(false);

  // Data hooks
  const { data: template, isLoading: templateLoading } = useTrainingTemplate(id);
  const { data: steps = [], refetch: refetchSteps } = useTemplateSteps(id);
  const { data: questions = [], refetch: refetchQuestions } = useTemplateQuestions(id);
  const { data: checklist = [], refetch: refetchChecklist } = useTemplateChecklist(id);
  const { data: documents = [], refetch: refetchDocuments } = useTemplateDocuments(id);

  const createTemplate = useCreateTrainingTemplate();
  const updateTemplate = useUpdateTrainingTemplate();
  const createStep = useCreateTemplateStep();
  const updateStep = useUpdateTemplateStep();
  const deleteStep = useDeleteTemplateStep();
  const createQuestion = useCreateTemplateQuestion();
  const updateQuestion = useUpdateTemplateQuestion();
  const deleteQuestion = useDeleteTemplateQuestion();
  const createChecklistItem = useCreateChecklistItem();
  const updateChecklistItem = useUpdateChecklistItem();
  const deleteChecklistItem = useDeleteChecklistItem();
  const addDocument = useAddTemplateDocument();
  const removeDocument = useRemoveTemplateDocument();

  // Load template data when editing
  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description || '');
      setTrainingType(template.training_type);
      setStatus(template.status);
      setVersion(template.version);
      setSelectedDepts(template.department_codes || []);
      setAppliesToAll(template.applies_to_all_departments);
      setRetrainingRequired(template.retraining_required);
      setRetrainingDays(String(template.retraining_interval_days || 365));
      setRipplingSyncEnabled(template.rippling_sync_enabled);
      setRipplingCourseId(template.rippling_course_id || '');
      setHasOjtSteps(template.has_ojt_steps);
      setHasKnowledgeTest(template.has_knowledge_test);
      setPassingScore(String(template.knowledge_test_passing_score || 80));
      setMaxAttempts(String(template.knowledge_test_max_attempts || 3));
      setHasHandsOn(template.has_hands_on_evaluation);
      setIssuesCert(template.issues_certification);
      setCertName(template.certification_name || '');
      setCertValidityDays(String(template.certification_validity_days || 365));
      setCertAutoIssue(template.certification_auto_issue);
      setTaskFeedPriority(template.task_feed_priority);
      setNotes(template.notes || '');
    }
  }, [template]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const toggleDept = (code: string, name: string) => {
    markChanged();
    setSelectedDepts(prev => {
      if (prev.includes(code)) return prev.filter(d => d !== code);
      return [...prev, code];
    });
  };

  const handleSaveInfo = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Template title is required.');
      return;
    }

    setSaving(true);
    try {
      const deptNames = selectedDepts.map(
        code => DEPARTMENTS.find(d => d.code === code)?.name || code
      );

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        training_type: trainingType as any,
        status: status as any,
        version,
        department_codes: appliesToAll ? [] : selectedDepts,
        department_names: appliesToAll ? [] : deptNames,
        applies_to_all_departments: appliesToAll,
        retraining_required: retrainingRequired,
        retraining_interval_days: parseInt(retrainingDays) || 365,
        rippling_sync_enabled: ripplingSyncEnabled,
        rippling_course_id: ripplingCourseId.trim() || null,
        has_ojt_steps: hasOjtSteps,
        ojt_step_count: steps.length || 4,
        has_knowledge_test: hasKnowledgeTest,
        knowledge_test_passing_score: parseInt(passingScore) || 80,
        knowledge_test_max_attempts: parseInt(maxAttempts) || 3,
        has_hands_on_evaluation: hasHandsOn,
        issues_certification: issuesCert,
        certification_name: issuesCert ? certName.trim() || null : null,
        certification_validity_days: issuesCert ? parseInt(certValidityDays) || 365 : null,
        certification_auto_issue: issuesCert ? certAutoIssue : false,
        task_feed_priority: taskFeedPriority as any,
        notes: notes.trim() || null,
      };

      if (isEditing && id) {
        await updateTemplate.mutateAsync({ templateId: id, updates: payload });
      } else {
        const created = await createTemplate.mutateAsync(payload as any);
        router.replace(
          `/(tabs)/compliance/training/template-builder?id=${created.id}` as any
        );
      }
      setHasChanges(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  // ── STEP HANDLERS ──────────────────────────────

  const openNewStep = () => {
    setEditingStep(null);
    const nextType = STEP_TYPES[steps.length % STEP_TYPES.length];
    setStepTitle(nextType.label.split(' — ')[1] || '');
    setStepType(nextType.value);
    setStepDescription('');
    setStepInstructions('');
    setStepEstMinutes('');
    setStepTrainerSignoff(true);
    setStepObserverSignoff(false);
    setStepModal(true);
  };

  const openEditStep = (step: TrainingTemplateStep) => {
    setEditingStep(step);
    setStepTitle(step.title);
    setStepType(step.step_type);
    setStepDescription(step.description || '');
    setStepInstructions(step.instructions || '');
    setStepEstMinutes(step.estimated_minutes ? String(step.estimated_minutes) : '');
    setStepTrainerSignoff(step.requires_trainer_signoff);
    setStepObserverSignoff(step.requires_observer_signoff);
    setStepModal(true);
  };

  const handleSaveStep = async () => {
    if (!stepTitle.trim()) {
      Alert.alert('Required', 'Step title is required.');
      return;
    }
    if (!id) {
      Alert.alert('Save Template First', 'Save the template info before adding steps.');
      return;
    }

    setSaving(true);
    try {
      if (editingStep) {
        await updateStep.mutateAsync({
          stepId: editingStep.id,
          templateId: id,
          updates: {
            title: stepTitle.trim(),
            step_type: stepType as any,
            description: stepDescription.trim() || null,
            instructions: stepInstructions.trim() || null,
            estimated_minutes: stepEstMinutes ? parseInt(stepEstMinutes) : null,
            requires_trainer_signoff: stepTrainerSignoff,
            requires_observer_signoff: stepObserverSignoff,
          },
        });
      } else {
        await createStep.mutateAsync({
          template_id: id,
          step_number: steps.length + 1,
          title: stepTitle.trim(),
          step_type: stepType as any,
          description: stepDescription.trim() || null,
          instructions: stepInstructions.trim() || null,
          estimated_minutes: stepEstMinutes ? parseInt(stepEstMinutes) : null,
          requires_trainer_signoff: stepTrainerSignoff,
          requires_observer_signoff: stepObserverSignoff,
          notes: null,
        });
        // Update ojt_step_count on template
        await updateTemplate.mutateAsync({
          templateId: id,
          updates: { ojt_step_count: steps.length + 1 },
        });
      }
      setStepModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save step.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (step: TrainingTemplateStep) => {
    Alert.alert('Delete Step', `Delete "${step.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStep.mutateAsync({ stepId: step.id, templateId: step.template_id });
        },
      },
    ]);
  };

  // ── QUESTION HANDLERS ──────────────────────────

  const openNewQuestion = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setQuestionType('multiple_choice');
    setQuestionOptions(['', '', '', '']);
    setCorrectAnswer('');
    setQuestionPoints('1');
    setQuestionExplanation('');
    setQuestionModal(true);
  };

  const openEditQuestion = (q: TrainingTemplateQuestion) => {
    setEditingQuestion(q);
    setQuestionText(q.question_text);
    setQuestionType(q.question_type);
    setQuestionOptions(q.options ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', '']);
    setCorrectAnswer(q.correct_answer);
    setQuestionPoints(String(q.points));
    setQuestionExplanation(q.explanation || '');
    setQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      Alert.alert('Required', 'Question text is required.');
      return;
    }
    if (!correctAnswer.trim()) {
      Alert.alert('Required', 'Correct answer is required.');
      return;
    }
    if (!id) {
      Alert.alert('Save Template First', 'Save the template info before adding questions.');
      return;
    }

    setSaving(true);
    try {
      const filteredOptions =
        questionType === 'multiple_choice'
          ? questionOptions.filter(o => o.trim())
          : questionType === 'true_false'
          ? ['True', 'False']
          : null;

      if (editingQuestion) {
        await updateQuestion.mutateAsync({
          questionId: editingQuestion.id,
          templateId: id,
          updates: {
            question_text: questionText.trim(),
            question_type: questionType as any,
            options: filteredOptions,
            correct_answer: correctAnswer.trim(),
            points: parseInt(questionPoints) || 1,
            explanation: questionExplanation.trim() || null,
          },
        });
      } else {
        await createQuestion.mutateAsync({
          template_id: id,
          question_number: questions.length + 1,
          question_text: questionText.trim(),
          question_type: questionType as any,
          options: filteredOptions,
          correct_answer: correctAnswer.trim(),
          points: parseInt(questionPoints) || 1,
          explanation: questionExplanation.trim() || null,
        });
      }
      setQuestionModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (q: TrainingTemplateQuestion) => {
    Alert.alert('Delete Question', `Delete question ${q.question_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQuestion.mutateAsync({
            questionId: q.id,
            templateId: q.template_id,
          });
        },
      },
    ]);
  };

  // ── CHECKLIST HANDLERS ─────────────────────────

  const openNewChecklist = () => {
    setEditingChecklist(null);
    setSkillDescription('');
    setEvalCriteria('');
    setIsCritical(false);
    setChecklistModal(true);
  };

  const openEditChecklist = (item: TrainingTemplateChecklistItem) => {
    setEditingChecklist(item);
    setSkillDescription(item.skill_description);
    setEvalCriteria(item.evaluation_criteria || '');
    setIsCritical(item.is_critical);
    setChecklistModal(true);
  };

  const handleSaveChecklist = async () => {
    if (!skillDescription.trim()) {
      Alert.alert('Required', 'Skill description is required.');
      return;
    }
    if (!id) {
      Alert.alert('Save Template First', 'Save the template info before adding checklist items.');
      return;
    }

    setSaving(true);
    try {
      if (editingChecklist) {
        await updateChecklistItem.mutateAsync({
          itemId: editingChecklist.id,
          templateId: id,
          updates: {
            skill_description: skillDescription.trim(),
            evaluation_criteria: evalCriteria.trim() || null,
            is_critical: isCritical,
          },
        });
      } else {
        await createChecklistItem.mutateAsync({
          template_id: id,
          item_number: checklist.length + 1,
          skill_description: skillDescription.trim(),
          evaluation_criteria: evalCriteria.trim() || null,
          is_critical: isCritical,
          notes: null,
        });
      }
      setChecklistModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save checklist item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChecklist = async (item: TrainingTemplateChecklistItem) => {
    Alert.alert('Delete Item', `Delete "${item.skill_description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChecklistItem.mutateAsync({
            itemId: item.id,
            templateId: item.template_id,
          });
        },
      },
    ]);
  };

  // ── DOCUMENT HANDLERS ──────────────────────────

  const openNewDoc = () => {
    setDocSourceType('document');
    setDocTitle('');
    setDocType('SOP');
    setDocUrl('');
    setDocRequired(false);
    setDocModal(true);
  };

  const handleSaveDoc = async () => {
    if (!docTitle.trim()) {
      Alert.alert('Required', 'Document title is required.');
      return;
    }
    if (docSourceType === 'external' && !docUrl.trim()) {
      Alert.alert('Required', 'URL is required for external references.');
      return;
    }
    if (!id) {
      Alert.alert('Save Template First', 'Save the template info before adding documents.');
      return;
    }

    setSaving(true);
    try {
      await addDocument.mutateAsync({
        template_id: id,
        source_type: docSourceType as any,
        source_id: null,
        source_title: docTitle.trim(),
        source_document_type: docType,
        source_url: docSourceType === 'external' ? docUrl.trim() : null,
        display_order: documents.length,
        is_required_reading: docRequired,
        notes: null,
      });
      setDocModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add document.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDoc = async (doc: TrainingTemplateDocument) => {
    Alert.alert('Remove Document', `Remove "${doc.source_title}" from this template?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeDocument.mutateAsync({
            docId: doc.id,
            templateId: doc.template_id,
          });
        },
      },
    ]);
  };

  const getStepTypeConfig = (type: string) =>
    STEP_TYPES.find(s => s.value === type) || { label: type, color: HUD_TEXT_DIM };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const criticalCount = checklist.filter(i => i.is_critical).length;

  if (templateLoading && isEditing) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={HUD_ACCENT} />
        <Text style={{ color: HUD_TEXT_DIM, marginTop: 12 }}>Loading template...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}
          </Text>
          {template && (
            <Text style={styles.headerSub}>{template.template_number} · v{template.version}</Text>
          )}
        </View>
        {activeTab === 'info' && (
          <TouchableOpacity
            style={[styles.saveBtn, !hasChanges && !isEditing && styles.saveBtnDisabled]}
            onPress={handleSaveInfo}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={HUD_BG} />
            ) : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Save' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
            {tab === 'steps' && steps.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{steps.length}</Text>
              </View>
            )}
            {tab === 'test' && questions.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{questions.length}</Text>
              </View>
            )}
            {tab === 'checklist' && checklist.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{checklist.length}</Text>
              </View>
            )}
            {tab === 'documents' && documents.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{documents.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── INFO TAB ── */}
        {activeTab === 'info' && (
          <View style={styles.section}>
            {/* Basic Info */}
            <Text style={styles.sectionLabel}>BASIC INFO</Text>
            <View style={styles.card}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={v => { setTitle(v); markChanged(); }}
                  placeholder="e.g. Forklift Operator Certification"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={description}
                  onChangeText={v => { setDescription(v); markChanged(); }}
                  placeholder="Overview of what this training covers..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Training Type</Text>
                <View style={styles.optionGrid}>
                  {TRAINING_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        styles.optionChip,
                        trainingType === t.value && styles.optionChipActive,
                      ]}
                      onPress={() => { setTrainingType(t.value); markChanged(); }}
                    >
                      <Text style={[
                        styles.optionChipText,
                        trainingType === t.value && styles.optionChipTextActive,
                      ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.row}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.optionRow}>
                    {['draft', 'active', 'archived'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.smallChip,
                          status === s && styles.smallChipActive,
                        ]}
                        onPress={() => { setStatus(s); markChanged(); }}
                      >
                        <Text style={[
                          styles.smallChipText,
                          status === s && styles.smallChipTextActive,
                        ]}>
                          {s.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.fieldWrap, { width: 80 }]}>
                  <Text style={styles.fieldLabel}>Version</Text>
                  <TextInput
                    style={styles.input}
                    value={version}
                    onChangeText={v => { setVersion(v); markChanged(); }}
                    placeholder="1.0"
                    placeholderTextColor={HUD_TEXT_DIM}
                  />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={notes}
                  onChangeText={v => { setNotes(v); markChanged(); }}
                  placeholder="Internal notes about this template..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Departments */}
            <Text style={styles.sectionLabel}>DEPARTMENTS</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Applies to All Departments</Text>
                <Switch
                  value={appliesToAll}
                  onValueChange={v => { setAppliesToAll(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_ACCENT + '66' }}
                  thumbColor={appliesToAll ? HUD_ACCENT : HUD_TEXT_DIM}
                />
              </View>
              {!appliesToAll && (
                <View style={styles.deptGrid}>
                  {DEPARTMENTS.map(dept => (
                    <TouchableOpacity
                      key={dept.code}
                      style={[
                        styles.deptChip,
                        selectedDepts.includes(dept.code) && styles.deptChipActive,
                      ]}
                      onPress={() => toggleDept(dept.code, dept.name)}
                    >
                      <Text style={[
                        styles.deptChipText,
                        selectedDepts.includes(dept.code) && styles.deptChipTextActive,
                      ]}>
                        {dept.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Retraining */}
            <Text style={styles.sectionLabel}>RETRAINING</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Retraining Required</Text>
                <Switch
                  value={retrainingRequired}
                  onValueChange={v => { setRetrainingRequired(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_ACCENT + '66' }}
                  thumbColor={retrainingRequired ? HUD_ACCENT : HUD_TEXT_DIM}
                />
              </View>
              {retrainingRequired && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Retraining Interval (days)</Text>
                  <TextInput
                    style={styles.input}
                    value={retrainingDays}
                    onChangeText={v => { setRetrainingDays(v); markChanged(); }}
                    keyboardType="numeric"
                    placeholder="365"
                    placeholderTextColor={HUD_TEXT_DIM}
                  />
                  <Text style={styles.fieldHint}>
                    Common: 365 (annual), 730 (biennial), 1095 (triennial / OSHA forklift)
                  </Text>
                </View>
              )}
            </View>

            {/* Training Components */}
            <Text style={styles.sectionLabel}>TRAINING COMPONENTS</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>OJT Steps (4-Step JI Method)</Text>
                  <Text style={styles.switchHint}>Demonstrate → Together → Solo → Evaluate</Text>
                </View>
                <Switch
                  value={hasOjtSteps}
                  onValueChange={v => { setHasOjtSteps(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_ACCENT + '66' }}
                  thumbColor={hasOjtSteps ? HUD_ACCENT : HUD_TEXT_DIM}
                />
              </View>
              <View style={[styles.switchRow, styles.switchRowBorder]}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>Knowledge Test</Text>
                  <Text style={styles.switchHint}>Written/digital quiz before certification</Text>
                </View>
                <Switch
                  value={hasKnowledgeTest}
                  onValueChange={v => { setHasKnowledgeTest(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_PURPLE + '66' }}
                  thumbColor={hasKnowledgeTest ? HUD_PURPLE : HUD_TEXT_DIM}
                />
              </View>
              {hasKnowledgeTest && (
                <View style={styles.subSection}>
                  <View style={styles.row}>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Passing Score (%)</Text>
                      <TextInput
                        style={styles.input}
                        value={passingScore}
                        onChangeText={v => { setPassingScore(v); markChanged(); }}
                        keyboardType="numeric"
                        placeholder="80"
                        placeholderTextColor={HUD_TEXT_DIM}
                      />
                    </View>
                    <View style={[styles.fieldWrap, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Max Attempts</Text>
                      <TextInput
                        style={styles.input}
                        value={maxAttempts}
                        onChangeText={v => { setMaxAttempts(v); markChanged(); }}
                        keyboardType="numeric"
                        placeholder="3"
                        placeholderTextColor={HUD_TEXT_DIM}
                      />
                    </View>
                  </View>
                </View>
              )}
              <View style={[styles.switchRow, styles.switchRowBorder]}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>Hands-On Evaluation</Text>
                  <Text style={styles.switchHint}>Observable skills checklist</Text>
                </View>
                <Switch
                  value={hasHandsOn}
                  onValueChange={v => { setHasHandsOn(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_GREEN + '66' }}
                  thumbColor={hasHandsOn ? HUD_GREEN : HUD_TEXT_DIM}
                />
              </View>
            </View>

            {/* Certification */}
            <Text style={styles.sectionLabel}>CERTIFICATION OUTCOME</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>Issues a Certification</Text>
                  <Text style={styles.switchHint}>Award a cert upon successful completion</Text>
                </View>
                <Switch
                  value={issuesCert}
                  onValueChange={v => { setIssuesCert(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_YELLOW + '66' }}
                  thumbColor={issuesCert ? HUD_YELLOW : HUD_TEXT_DIM}
                />
              </View>
              {issuesCert && (
                <View style={styles.subSection}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Certification Name</Text>
                    <TextInput
                      style={styles.input}
                      value={certName}
                      onChangeText={v => { setCertName(v); markChanged(); }}
                      placeholder="e.g. Certified Forklift Operator"
                      placeholderTextColor={HUD_TEXT_DIM}
                    />
                  </View>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Validity Period (days)</Text>
                    <TextInput
                      style={styles.input}
                      value={certValidityDays}
                      onChangeText={v => { setCertValidityDays(v); markChanged(); }}
                      keyboardType="numeric"
                      placeholder="365"
                      placeholderTextColor={HUD_TEXT_DIM}
                    />
                    <Text style={styles.fieldHint}>
                      OSHA forklift: 1095 (3 years) · Food handler: 365 (1 year)
                    </Text>
                  </View>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelWrap}>
                      <Text style={styles.switchLabel}>Auto-Issue on Pass</Text>
                      <Text style={styles.switchHint}>
                        Issue automatically when both tests pass. Disable for manual manager approval.
                      </Text>
                    </View>
                    <Switch
                      value={certAutoIssue}
                      onValueChange={v => { setCertAutoIssue(v); markChanged(); }}
                      trackColor={{ false: HUD_BORDER, true: HUD_YELLOW + '66' }}
                      thumbColor={certAutoIssue ? HUD_YELLOW : HUD_TEXT_DIM}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Rippling Integration */}
            <Text style={styles.sectionLabel}>RIPPLING INTEGRATION</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>Enable Rippling Sync</Text>
                  <Text style={styles.switchHint}>
                    Link to a Rippling LMS course for future sync
                  </Text>
                </View>
                <Switch
                  value={ripplingSyncEnabled}
                  onValueChange={v => { setRipplingSyncEnabled(v); markChanged(); }}
                  trackColor={{ false: HUD_BORDER, true: HUD_YELLOW + '66' }}
                  thumbColor={ripplingSyncEnabled ? HUD_YELLOW : HUD_TEXT_DIM}
                />
              </View>
              {ripplingSyncEnabled && (
                <View style={styles.subSection}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Rippling Course ID</Text>
                    <TextInput
                      style={styles.input}
                      value={ripplingCourseId}
                      onChangeText={v => { setRipplingCourseId(v); markChanged(); }}
                      placeholder="e.g. rpl_course_abc123"
                      placeholderTextColor={HUD_TEXT_DIM}
                    />
                    <Text style={styles.fieldHint}>
                      Found in Rippling LMS → Course Settings → Course ID
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Task Feed */}
            <Text style={styles.sectionLabel}>TASK FEED ROUTING</Text>
            <View style={styles.card}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.optionRow}>
                  {PRIORITIES.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.smallChip,
                        taskFeedPriority === p && styles.smallChipActive,
                      ]}
                      onPress={() => { setTaskFeedPriority(p); markChanged(); }}
                    >
                      <Text style={[
                        styles.smallChipText,
                        taskFeedPriority === p && styles.smallChipTextActive,
                      ]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveLargeBtn}
              onPress={handleSaveInfo}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={HUD_BG} />
              ) : (
                <Text style={styles.saveLargeBtnText}>
                  {isEditing ? 'Save Changes' : 'Create Template'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <View style={styles.section}>
            <View style={styles.tabHeaderRow}>
              <Text style={styles.tabHeaderTitle}>
                Reference Documents
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewDoc}>
                <Ionicons name="add" size={16} color={HUD_BG} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tabHeaderSub}>
              SOPs, OPLs, policies, and other materials employees must review before or during training.
            </Text>

            {!id && (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={HUD_YELLOW} />
                <Text style={styles.lockText}>Save template info first to add documents.</Text>
              </View>
            )}

            {documents.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="document-outline" size={36} color={HUD_TEXT_DIM} />
                <Text style={styles.emptyTabText}>No documents linked yet</Text>
                <Text style={styles.emptyTabSub}>
                  Add SOPs, OPLs, and other reference materials.
                </Text>
              </View>
            ) : (
              documents.map((doc, index) => (
                <View key={doc.id} style={styles.listCard}>
                  <View style={styles.listCardLeft}>
                    <View style={styles.docIconWrap}>
                      <Ionicons name="document-text-outline" size={18} color={HUD_ACCENT} />
                    </View>
                    <View style={styles.listCardBody}>
                      <View style={styles.listCardTitleRow}>
                        <Text style={styles.listCardTitle}>{doc.source_title}</Text>
                        {doc.is_required_reading && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.listCardSub}>
                        {doc.source_document_type || doc.source_type.toUpperCase()}
                      </Text>
                      {doc.source_url && (
                        <Text style={styles.listCardUrl} numberOfLines={1}>
                          {doc.source_url}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.listCardDelete}
                    onPress={() => handleRemoveDoc(doc)}
                  >
                    <Ionicons name="trash-outline" size={16} color={HUD_RED} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── OJT STEPS TAB ── */}
        {activeTab === 'steps' && (
          <View style={styles.section}>
            <View style={styles.tabHeaderRow}>
              <Text style={styles.tabHeaderTitle}>OJT Steps</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewStep}>
                <Ionicons name="add" size={16} color={HUD_BG} />
                <Text style={styles.addBtnText}>Add Step</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tabHeaderSub}>
              4-Step Job Instruction method. Add steps in order: Demonstrate → Together → Solo → Evaluate.
            </Text>

            {!id && (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={HUD_YELLOW} />
                <Text style={styles.lockText}>Save template info first to add steps.</Text>
              </View>
            )}

            {steps.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="footsteps-outline" size={36} color={HUD_TEXT_DIM} />
                <Text style={styles.emptyTabText}>No steps added yet</Text>
                <Text style={styles.emptyTabSub}>
                  Add the 4 OJT steps to define the training process.
                </Text>
              </View>
            ) : (
              steps.map((step, index) => {
                const typeConfig = getStepTypeConfig(step.step_type);
                return (
                  <View key={step.id} style={styles.listCard}>
                    <View style={[styles.stepNumWrap, { backgroundColor: typeConfig.color + '22' }]}>
                      <Text style={[styles.stepNum, { color: typeConfig.color }]}>
                        {step.step_number}
                      </Text>
                    </View>
                    <View style={styles.listCardBody}>
                      <View style={styles.listCardTitleRow}>
                        <Text style={styles.listCardTitle}>{step.title}</Text>
                        <View style={[
                          styles.stepTypeBadge,
                          { backgroundColor: typeConfig.color + '22' }
                        ]}>
                          <Text style={[styles.stepTypeBadgeText, { color: typeConfig.color }]}>
                            {step.step_type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      {step.description && (
                        <Text style={styles.listCardSub} numberOfLines={2}>
                          {step.description}
                        </Text>
                      )}
                      <View style={styles.stepMeta}>
                        {step.requires_trainer_signoff && (
                          <View style={styles.metaChip}>
                            <Ionicons name="checkmark-circle-outline" size={11} color={HUD_ACCENT} />
                            <Text style={styles.metaChipText}>Trainer Sign-off</Text>
                          </View>
                        )}
                        {step.requires_observer_signoff && (
                          <View style={styles.metaChip}>
                            <Ionicons name="eye-outline" size={11} color={HUD_GREEN} />
                            <Text style={[styles.metaChipText, { color: HUD_GREEN }]}>
                              Observer Sign-off
                            </Text>
                          </View>
                        )}
                        {step.estimated_minutes && (
                          <View style={styles.metaChip}>
                            <Ionicons name="time-outline" size={11} color={HUD_TEXT_DIM} />
                            <Text style={styles.metaChipText}>{step.estimated_minutes}m</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.listCardActions}>
                      <TouchableOpacity
                        style={styles.listCardAction}
                        onPress={() => openEditStep(step)}
                      >
                        <Ionicons name="create-outline" size={16} color={HUD_ACCENT} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.listCardAction}
                        onPress={() => handleDeleteStep(step)}
                      >
                        <Ionicons name="trash-outline" size={16} color={HUD_RED} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── KNOWLEDGE TEST TAB ── */}
        {activeTab === 'test' && (
          <View style={styles.section}>
            <View style={styles.tabHeaderRow}>
              <Text style={styles.tabHeaderTitle}>Knowledge Test</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewQuestion}>
                <Ionicons name="add" size={16} color={HUD_BG} />
                <Text style={styles.addBtnText}>Add Question</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tabHeaderSub}>
              {questions.length > 0
                ? `${questions.length} question${questions.length !== 1 ? 's' : ''} · ${totalPoints} total points · ${passingScore}% to pass`
                : `Passing score: ${passingScore}% · Max attempts: ${maxAttempts}`}
            </Text>

            {!id && (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={HUD_YELLOW} />
                <Text style={styles.lockText}>Save template info first to add questions.</Text>
              </View>
            )}

            {questions.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="help-circle-outline" size={36} color={HUD_TEXT_DIM} />
                <Text style={styles.emptyTabText}>No questions added yet</Text>
                <Text style={styles.emptyTabSub}>
                  Add multiple choice, true/false, or short answer questions.
                </Text>
              </View>
            ) : (
              questions.map((q, index) => (
                <View key={q.id} style={styles.listCard}>
                  <View style={styles.qNumWrap}>
                    <Text style={styles.qNum}>{q.question_number}</Text>
                  </View>
                  <View style={styles.listCardBody}>
                    <Text style={styles.listCardTitle}>{q.question_text}</Text>
                    <View style={styles.listCardTitleRow}>
                      <View style={styles.qTypeBadge}>
                        <Text style={styles.qTypeBadgeText}>
                          {q.question_type === 'multiple_choice'
                            ? 'MC'
                            : q.question_type === 'true_false'
                            ? 'T/F'
                            : 'SA'}
                        </Text>
                      </View>
                      <Text style={styles.listCardSub}>
                        Correct: <Text style={{ color: HUD_GREEN }}>{q.correct_answer}</Text>
                      </Text>
                      <Text style={styles.listCardSub}>{q.points}pt</Text>
                    </View>
                    {q.options && q.options.length > 0 && (
                      <View style={styles.optionsList}>
                        {q.options.map((opt, i) => (
                          <Text
                            key={i}
                            style={[
                              styles.optionItem,
                              opt === q.correct_answer && styles.optionItemCorrect,
                            ]}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.listCardActions}>
                    <TouchableOpacity
                      style={styles.listCardAction}
                      onPress={() => openEditQuestion(q)}
                    >
                      <Ionicons name="create-outline" size={16} color={HUD_ACCENT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.listCardAction}
                      onPress={() => handleDeleteQuestion(q)}
                    >
                      <Ionicons name="trash-outline" size={16} color={HUD_RED} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── HANDS-ON CHECKLIST TAB ── */}
        {activeTab === 'checklist' && (
          <View style={styles.section}>
            <View style={styles.tabHeaderRow}>
              <Text style={styles.tabHeaderTitle}>Hands-On Evaluation</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openNewChecklist}>
                <Ionicons name="add" size={16} color={HUD_BG} />
                <Text style={styles.addBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tabHeaderSub}>
              {checklist.length > 0
                ? `${checklist.length} skill${checklist.length !== 1 ? 's' : ''} · ${criticalCount} critical item${criticalCount !== 1 ? 's' : ''} (must pass)`
                : 'Observable skills the evaluator will assess during hands-on evaluation.'}
            </Text>

            {!id && (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={HUD_YELLOW} />
                <Text style={styles.lockText}>Save template info first to add checklist items.</Text>
              </View>
            )}

            {checklist.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="hand-left-outline" size={36} color={HUD_TEXT_DIM} />
                <Text style={styles.emptyTabText}>No checklist items yet</Text>
                <Text style={styles.emptyTabSub}>
                  Add observable skills the evaluator will assess. Mark critical items that must pass.
                </Text>
              </View>
            ) : (
              checklist.map((item, index) => (
                <View key={item.id} style={styles.listCard}>
                  <View style={[
                    styles.criticalIndicator,
                    { backgroundColor: item.is_critical ? HUD_RED + '22' : HUD_BORDER }
                  ]}>
                    <Ionicons
                      name={item.is_critical ? 'warning' : 'checkmark-circle-outline'}
                      size={16}
                      color={item.is_critical ? HUD_RED : HUD_TEXT_DIM}
                    />
                  </View>
                  <View style={styles.listCardBody}>
                    <View style={styles.listCardTitleRow}>
                      <Text style={styles.listCardTitle}>{item.skill_description}</Text>
                      {item.is_critical && (
                        <View style={styles.criticalBadge}>
                          <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                        </View>
                      )}
                    </View>
                    {item.evaluation_criteria && (
                      <Text style={styles.listCardSub}>{item.evaluation_criteria}</Text>
                    )}
                  </View>
                  <View style={styles.listCardActions}>
                    <TouchableOpacity
                      style={styles.listCardAction}
                      onPress={() => openEditChecklist(item)}
                    >
                      <Ionicons name="create-outline" size={16} color={HUD_ACCENT} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.listCardAction}
                      onPress={() => handleDeleteChecklist(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color={HUD_RED} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── STEP MODAL ── */}
      <Modal
        visible={stepModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStepModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingStep ? 'Edit OJT Step' : 'New OJT Step'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Step Type</Text>
                <View style={styles.optionGrid}>
                  {STEP_TYPES.map(st => (
                    <TouchableOpacity
                      key={st.value}
                      style={[
                        styles.optionChip,
                        stepType === st.value && {
                          backgroundColor: st.color + '22',
                          borderColor: st.color,
                        },
                      ]}
                      onPress={() => setStepType(st.value)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        stepType === st.value && { color: st.color },
                      ]}>
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Step Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={stepTitle}
                  onChangeText={setStepTitle}
                  placeholder="e.g. Trainer Demonstrates Pre-Start Inspection"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={stepDescription}
                  onChangeText={setStepDescription}
                  placeholder="What topics or tasks are covered in this step..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Detailed Instructions</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={stepInstructions}
                  onChangeText={setStepInstructions}
                  placeholder="Step-by-step instructions for this training step..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Estimated Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={stepEstMinutes}
                  onChangeText={setStepEstMinutes}
                  keyboardType="numeric"
                  placeholder="e.g. 30"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Requires Trainer Sign-off</Text>
                <Switch
                  value={stepTrainerSignoff}
                  onValueChange={setStepTrainerSignoff}
                  trackColor={{ false: HUD_BORDER, true: HUD_ACCENT + '66' }}
                  thumbColor={stepTrainerSignoff ? HUD_ACCENT : HUD_TEXT_DIM}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Requires Observer Sign-off</Text>
                <Switch
                  value={stepObserverSignoff}
                  onValueChange={setStepObserverSignoff}
                  trackColor={{ false: HUD_BORDER, true: HUD_GREEN + '66' }}
                  thumbColor={stepObserverSignoff ? HUD_GREEN : HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setStepModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSaveStep}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={HUD_BG} />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingStep ? 'Update Step' : 'Add Step'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── QUESTION MODAL ── */}
      <Modal
        visible={questionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setQuestionModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingQuestion ? 'Edit Question' : 'New Question'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Question Type</Text>
                <View style={styles.optionRow}>
                  {QUESTION_TYPES.map(qt => (
                    <TouchableOpacity
                      key={qt.value}
                      style={[
                        styles.smallChip,
                        questionType === qt.value && styles.smallChipActive,
                      ]}
                      onPress={() => {
                        setQuestionType(qt.value);
                        setCorrectAnswer('');
                        if (qt.value === 'true_false') {
                          setQuestionOptions(['True', 'False', '', '']);
                        }
                      }}
                    >
                      <Text style={[
                        styles.smallChipText,
                        questionType === qt.value && styles.smallChipTextActive,
                      ]}>
                        {qt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Question <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={questionText}
                  onChangeText={setQuestionText}
                  placeholder="Enter your question..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {questionType === 'multiple_choice' && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Answer Options</Text>
                  {questionOptions.map((opt, i) => (
                    <View key={i} style={styles.optionInputRow}>
                      <Text style={styles.optionLetter}>
                        {String.fromCharCode(65 + i)}.
                      </Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={opt}
                        onChangeText={v => {
                          const updated = [...questionOptions];
                          updated[i] = v;
                          setQuestionOptions(updated);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        placeholderTextColor={HUD_TEXT_DIM}
                      />
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Correct Answer <Text style={styles.required}>*</Text>
                </Text>
                {questionType === 'multiple_choice' ? (
                  <View style={styles.optionRow}>
                    {questionOptions.filter(o => o.trim()).map((opt, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.smallChip,
                          correctAnswer === opt && styles.smallChipCorrect,
                        ]}
                        onPress={() => setCorrectAnswer(opt)}
                      >
                        <Text style={[
                          styles.smallChipText,
                          correctAnswer === opt && { color: HUD_GREEN },
                        ]}>
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : questionType === 'true_false' ? (
                  <View style={styles.optionRow}>
                    {['True', 'False'].map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.smallChip,
                          correctAnswer === v && styles.smallChipCorrect,
                        ]}
                        onPress={() => setCorrectAnswer(v)}
                      >
                        <Text style={[
                          styles.smallChipText,
                          correctAnswer === v && { color: HUD_GREEN },
                        ]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={correctAnswer}
                    onChangeText={setCorrectAnswer}
                    placeholder="Expected answer or key points..."
                    placeholderTextColor={HUD_TEXT_DIM}
                  />
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Points</Text>
                  <TextInput
                    style={styles.input}
                    value={questionPoints}
                    onChangeText={setQuestionPoints}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={HUD_TEXT_DIM}
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Explanation (shown after answer)</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={questionExplanation}
                  onChangeText={setQuestionExplanation}
                  placeholder="Why is this the correct answer?"
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setQuestionModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSaveQuestion}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={HUD_BG} />
                  ) : (
                    <Text style={styles.modalSaveText}>
                      {editingQuestion ? 'Update' : 'Add Question'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CHECKLIST MODAL ── */}
      <Modal
        visible={checklistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setChecklistModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingChecklist ? 'Edit Skill' : 'New Skill Item'}
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Skill Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={skillDescription}
                onChangeText={setSkillDescription}
                placeholder="e.g. Completes pre-start inspection checklist correctly"
                placeholderTextColor={HUD_TEXT_DIM}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Evaluation Criteria</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={evalCriteria}
                onChangeText={setEvalCriteria}
                placeholder="What does a passing performance look like?"
                placeholderTextColor={HUD_TEXT_DIM}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabelWrap}>
                <Text style={styles.switchLabel}>Critical Item</Text>
                <Text style={styles.switchHint}>
                  Critical items must pass for overall evaluation to pass.
                </Text>
              </View>
              <Switch
                value={isCritical}
                onValueChange={setIsCritical}
                trackColor={{ false: HUD_BORDER, true: HUD_RED + '66' }}
                thumbColor={isCritical ? HUD_RED : HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setChecklistModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveChecklist}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={HUD_BG} />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingChecklist ? 'Update' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DOCUMENT MODAL ── */}
      <Modal
        visible={docModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDocModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Link Document</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Source Type</Text>
              <View style={styles.optionRow}>
                {[
                  { value: 'document', label: 'Document' },
                  { value: 'sds', label: 'SDS' },
                  { value: 'form', label: 'Form' },
                  { value: 'external', label: 'External' },
                ].map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.smallChip,
                      docSourceType === s.value && styles.smallChipActive,
                    ]}
                    onPress={() => setDocSourceType(s.value)}
                  >
                    <Text style={[
                      styles.smallChipText,
                      docSourceType === s.value && styles.smallChipTextActive,
                    ]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Document Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={docTitle}
                onChangeText={setDocTitle}
                placeholder="e.g. Forklift Pre-Start Inspection SOP"
                placeholderTextColor={HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Document Type</Text>
              <View style={styles.optionGrid}>
                {DOC_TYPES.map(dt => (
                  <TouchableOpacity
                    key={dt.value}
                    style={[
                      styles.smallChip,
                      docType === dt.value && styles.smallChipActive,
                    ]}
                    onPress={() => setDocType(dt.value)}
                  >
                    <Text style={[
                      styles.smallChipText,
                      docType === dt.value && styles.smallChipTextActive,
                    ]}>
                      {dt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {docSourceType === 'external' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>URL <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={docUrl}
                  onChangeText={setDocUrl}
                  placeholder="https://..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Required Reading</Text>
              <Switch
                value={docRequired}
                onValueChange={setDocRequired}
                trackColor={{ false: HUD_BORDER, true: HUD_ACCENT + '66' }}
                thumbColor={docRequired ? HUD_ACCENT : HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDocModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveDoc}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={HUD_BG} />
                ) : (
                  <Text style={styles.modalSaveText}>Link Document</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: HUD_ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD_TEXT_BRIGHT, letterSpacing: 1 },
  headerSub: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 2 },
  saveBtn: {
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  tabBar: {
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
    maxHeight: 44,
  },
  tabBarContent: { paddingHorizontal: 12, gap: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: HUD_ACCENT },
  tabText: { fontSize: 11, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  tabTextActive: { color: HUD_ACCENT },
  tabBadge: {
    backgroundColor: HUD_ACCENT,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { gap: 0 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HUD_TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
    gap: 12,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  fieldHint: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 15 },
  required: { color: HUD_RED },
  input: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: HUD_TEXT,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
  row: { flexDirection: 'row', gap: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  optionChipActive: {
    backgroundColor: HUD_ACCENT + '22',
    borderColor: HUD_ACCENT,
  },
  optionChipText: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  optionChipTextActive: { color: HUD_ACCENT, fontWeight: '700' },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  smallChipActive: { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT },
  smallChipCorrect: { backgroundColor: HUD_GREEN + '22', borderColor: HUD_GREEN },
  smallChipText: { fontSize: 11, color: HUD_TEXT_DIM, fontWeight: '600' },
  smallChipTextActive: { color: HUD_ACCENT },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchRowBorder: { borderTopWidth: 1, borderTopColor: HUD_BORDER, paddingTop: 12 },
  switchLabel: { fontSize: 13, color: HUD_TEXT, fontWeight: '500', flex: 1 },
  switchLabelWrap: { flex: 1, gap: 2 },
  switchHint: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 15 },
  subSection: {
    backgroundColor: HUD_BG,
    borderRadius: 8,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: HUD_BORDER,
  },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  deptChipActive: { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT },
  deptChipText: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  deptChipTextActive: { color: HUD_ACCENT, fontWeight: '700' },
  saveLargeBtn: {
    backgroundColor: HUD_ACCENT,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveLargeBtnText: { fontSize: 15, fontWeight: '700', color: HUD_BG },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tabHeaderTitle: { fontSize: 15, fontWeight: '700', color: HUD_TEXT_BRIGHT },
  tabHeaderSub: { fontSize: 12, color: HUD_TEXT_DIM, marginBottom: 12, lineHeight: 17 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: HUD_BG },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HUD_YELLOW + '11',
    borderWidth: 1,
    borderColor: HUD_YELLOW + '33',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  lockText: { fontSize: 12, color: HUD_YELLOW },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTabText: { fontSize: 14, fontWeight: '600', color: HUD_TEXT, marginTop: 4 },
  emptyTabSub: { fontSize: 12, color: HUD_TEXT_DIM, textAlign: 'center', lineHeight: 18 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  listCardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  listCardBody: { flex: 1, gap: 3 },
  listCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  listCardTitle: { fontSize: 13, fontWeight: '600', color: HUD_TEXT_BRIGHT, flex: 1 },
  listCardSub: { fontSize: 11, color: HUD_TEXT_DIM },
  listCardUrl: { fontSize: 11, color: HUD_ACCENT },
  listCardDelete: { padding: 4 },
  listCardActions: { gap: 6 },
  listCardAction: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: HUD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: HUD_ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredBadge: {
    backgroundColor: HUD_RED + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_RED },
  stepNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '800' },
  stepTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stepTypeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  stepMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HUD_ACCENT + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaChipText: { fontSize: 10, color: HUD_ACCENT },
  qNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: HUD_PURPLE + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNum: { fontSize: 12, fontWeight: '700', color: HUD_PURPLE },
  qTypeBadge: {
    backgroundColor: HUD_PURPLE + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qTypeBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_PURPLE },
  optionsList: { gap: 2, marginTop: 4 },
  optionItem: { fontSize: 11, color: HUD_TEXT_DIM },
  optionItemCorrect: { color: HUD_GREEN, fontWeight: '600' },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  optionLetter: { fontSize: 13, fontWeight: '700', color: HUD_TEXT_DIM, width: 20 },
  criticalIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalBadge: {
    backgroundColor: HUD_RED + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_RED },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: HUD_CARD,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: HUD_BORDER,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: HUD_BORDER,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, color: HUD_TEXT, fontWeight: '600' },
  modalSave: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: HUD_ACCENT,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 14, color: HUD_BG, fontWeight: '700' },
});
