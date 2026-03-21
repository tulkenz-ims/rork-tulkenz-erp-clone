import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useTrainingSessions,
  useTrainingTemplates,
  useAssignTraining,
  useUpdateTrainingSession,
  useSessionSteps,
  useSessionAttempts,
  useCompleteSessionStep,
  useSubmitKnowledgeTest,
  useSubmitHandsOnEvaluation,
  useCompleteTrainingSession,
  useTemplateQuestions,
  useTemplateChecklist,
  TrainingSession,
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

const STATUS_FILTERS = ['all', 'assigned', 'in_progress', 'pending_evaluation', 'completed', 'failed'];

const DEPARTMENTS = [
  { code: '1001', name: 'Maintenance' },
  { code: '1002', name: 'Sanitation' },
  { code: '1003', name: 'Production' },
  { code: '1004', name: 'Quality' },
  { code: '1005', name: 'Safety' },
];

export default function SessionTrackerScreen() {
  const router = useRouter();
  const { templateId: preselectedTemplateId } = useLocalSearchParams<{ templateId?: string }>();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Assign modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState(preselectedTemplateId || '');
  const [assignEmployeeName, setAssignEmployeeName] = useState('');
  const [assignEmployeeCode, setAssignEmployeeCode] = useState('');
  const [assignDeptCode, setAssignDeptCode] = useState('');
  const [assignTrainerName, setAssignTrainerName] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Session detail modal
  const [detailSession, setDetailSession] = useState<TrainingSession | null>(null);
  const [detailTab, setDetailTab] = useState<'steps' | 'test' | 'hands_on' | 'info'>('steps');

  // Step sign-off modal
  const [stepSignoffModal, setStepSignoffModal] = useState(false);
  const [signingStepId, setSigningStepId] = useState('');
  const [signoffTrainerName, setSignoffTrainerName] = useState('');
  const [signoffObserverName, setSignoffObserverName] = useState('');
  const [signoffNotes, setSignoffNotes] = useState('');
  const [signoffSaving, setSignoffSaving] = useState(false);

  // Test modal
  const [testModal, setTestModal] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ score: number; passed: boolean } | null>(null);

  // Hands-on modal
  const [handsOnModal, setHandsOnModal] = useState(false);
  const [handsOnResults, setHandsOnResults] = useState
    Record<string, { result: 'pass' | 'fail' | 'na'; notes: string }>
  >({});
  const [handsOnEvaluator, setHandsOnEvaluator] = useState('');
  const [handsOnNotes, setHandsOnNotes] = useState('');
  const [handsOnSubmitting, setHandsOnSubmitting] = useState(false);

  // Complete modal
  const [completeModal, setCompleteModal] = useState(false);
  const [completeSupervisor, setCompleteSupervisor] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useTrainingSessions(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const { data: templates = [] } = useTrainingTemplates({ status: 'active' });
  const assignTraining = useAssignTraining();
  const completeStep = useCompleteSessionStep();
  const submitTest = useSubmitKnowledgeTest();
  const submitHandsOn = useSubmitHandsOnEvaluation();
  const completeSession = useCompleteTrainingSession();

  // Detail data
  const { data: sessionSteps = [] } = useSessionSteps(detailSession?.id);
  const { data: sessionAttempts = [] } = useSessionAttempts(detailSession?.id);
  const { data: templateQuestions = [] } = useTemplateQuestions(detailSession?.template_id);
  const { data: templateChecklist = [] } = useTemplateChecklist(detailSession?.template_id);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = sessions.filter(s => {
    const matchSearch =
      !search ||
      s.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      s.template_title.toLowerCase().includes(search.toLowerCase()) ||
      s.session_number.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return HUD_GREEN;
      case 'in_progress': return HUD_ACCENT;
      case 'assigned': return HUD_YELLOW;
      case 'failed': return HUD_RED;
      case 'pending_evaluation': return HUD_ORANGE;
      case 'cancelled': return HUD_TEXT_DIM;
      default: return HUD_TEXT_DIM;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'IN PROGRESS';
      case 'pending_evaluation': return 'PENDING EVAL';
      default: return status.toUpperCase();
    }
  };

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'demonstrate': return HUD_ACCENT;
      case 'together': return HUD_GREEN;
      case 'solo': return HUD_YELLOW;
      case 'evaluate': return HUD_ORANGE;
      default: return HUD_TEXT_DIM;
    }
  };

  // ── ASSIGN ──────────────────────────────────────

  const handleAssign = async () => {
    if (!assignTemplateId) {
      Alert.alert('Required', 'Please select a training template.');
      return;
    }
    if (!assignEmployeeName.trim()) {
      Alert.alert('Required', 'Employee name is required.');
      return;
    }

    setAssigning(true);
    try {
      const deptName = DEPARTMENTS.find(d => d.code === assignDeptCode)?.name;
      await assignTraining.mutateAsync({
        templateId: assignTemplateId,
        employeeId: `emp_${Date.now()}`,
        employeeName: assignEmployeeName.trim(),
        employeeCode: assignEmployeeCode.trim() || undefined,
        departmentCode: assignDeptCode || undefined,
        departmentName: deptName,
        trainerName: assignTrainerName.trim() || undefined,
        dueDate: assignDueDate || undefined,
        notes: assignNotes.trim() || undefined,
      });
      setAssignModal(false);
      setAssignEmployeeName('');
      setAssignEmployeeCode('');
      setAssignDeptCode('');
      setAssignTrainerName('');
      setAssignDueDate('');
      setAssignNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign training.');
    } finally {
      setAssigning(false);
    }
  };

  // ── STEP SIGN-OFF ────────────────────────────────

  const openStepSignoff = (stepId: string) => {
    setSigningStepId(stepId);
    setSignoffTrainerName('');
    setSignoffObserverName('');
    setSignoffNotes('');
    setStepSignoffModal(true);
  };

  const handleStepSignoff = async () => {
    if (!signoffTrainerName.trim()) {
      Alert.alert('Required', 'Trainer name is required for sign-off.');
      return;
    }
    if (!detailSession) return;

    setSignoffSaving(true);
    try {
      await completeStep.mutateAsync({
        stepId: signingStepId,
        sessionId: detailSession.id,
        trainerName: signoffTrainerName.trim(),
        trainerNotes: signoffNotes.trim() || undefined,
        observerName: signoffObserverName.trim() || undefined,
        observerNotes: signoffNotes.trim() || undefined,
      });
      setStepSignoffModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sign off step.');
    } finally {
      setSignoffSaving(false);
    }
  };

  // ── KNOWLEDGE TEST ───────────────────────────────

  const openTest = () => {
    setTestAnswers({});
    setTestResult(null);
    setTestModal(true);
  };

  const handleSubmitTest = async () => {
    if (!detailSession) return;
    const unanswered = templateQuestions.filter(q => !testAnswers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert(
        'Incomplete',
        `${unanswered.length} question${unanswered.length > 1 ? 's' : ''} not answered. All fields must be filled in before submission.`
      );
      return;
    }

    setTestSubmitting(true);
    try {
      const { score, passed } = await submitTest.mutateAsync({
        sessionId: detailSession.id,
        answers: testAnswers,
        questions: templateQuestions,
        passingScore: 80,
      });
      setTestResult({ score, passed });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit test.');
    } finally {
      setTestSubmitting(false);
    }
  };

  // ── HANDS-ON ─────────────────────────────────────

  const openHandsOn = () => {
    const initial: Record<string, { result: 'pass' | 'fail' | 'na'; notes: string }> = {};
    templateChecklist.forEach(item => {
      initial[item.id] = { result: 'pass', notes: '' };
    });
    setHandsOnResults(initial);
    setHandsOnEvaluator('');
    setHandsOnNotes('');
    setHandsOnModal(true);
  };

  const handleSubmitHandsOn = async () => {
    if (!detailSession) return;
    if (!handsOnEvaluator.trim()) {
      Alert.alert('Required', 'Evaluator name is required.');
      return;
    }
    const incomplete = templateChecklist.filter(
      item => !handsOnResults[item.id]
    );
    if (incomplete.length > 0) {
      Alert.alert('Incomplete', 'All checklist items must be evaluated before submission.');
      return;
    }

    setHandsOnSubmitting(true);
    try {
      await submitHandsOn.mutateAsync({
        sessionId: detailSession.id,
        checklistResults: handsOnResults,
        checklistItems: templateChecklist,
        evaluatorName: handsOnEvaluator.trim(),
        evaluatorNotes: handsOnNotes.trim() || undefined,
      });
      setHandsOnModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit evaluation.');
    } finally {
      setHandsOnSubmitting(false);
    }
  };

  // ── COMPLETE SESSION ─────────────────────────────

  const handleComplete = async () => {
    if (!detailSession) return;
    if (!completeSupervisor.trim()) {
      Alert.alert('Required', 'Supervisor name is required for final sign-off.');
      return;
    }

    setCompleting(true);
    try {
      const { status, certification } = await completeSession.mutateAsync({
        sessionId: detailSession.id,
        supervisorName: completeSupervisor.trim(),
        notes: completeNotes.trim() || undefined,
      });
      setCompleteModal(false);
      setDetailSession(null);
      if (certification) {
        Alert.alert(
          '🎓 Certification Issued',
          `${certification.certification_name} has been issued to ${detailSession.employee_name}.\n\nCert #: ${certification.certification_number}`
        );
      } else {
        Alert.alert(
          status === 'completed' ? '✅ Training Complete' : '❌ Training Failed',
          status === 'completed'
            ? `${detailSession.employee_name} has successfully completed ${detailSession.template_title}.`
            : `${detailSession.employee_name} did not pass all required components. Review and reassign as needed.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete session.');
    } finally {
      setCompleting(false);
    }
  };

  const canComplete = (session: TrainingSession) =>
    session.knowledge_test_passed && session.hands_on_passed;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SESSION TRACKER</Text>
          <Text style={styles.headerSub}>{sessions.length} training session{sessions.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => setAssignModal(true)}
        >
          <Ionicons name="add" size={18} color={HUD_BG} />
          <Text style={styles.assignBtnText}>Assign</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={HUD_TEXT_DIM} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee, template..."
            placeholderTextColor={HUD_TEXT_DIM}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={HUD_TEXT_DIM} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterStrip}
        contentContainerStyle={styles.filterStripContent}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === f && styles.filterChipTextActive,
            ]}>
              {f === 'all' ? 'ALL' : getStatusLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sessions List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HUD_ACCENT} />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={HUD_TEXT_DIM} />
            <Text style={styles.emptyTitle}>No Sessions Found</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term.'
                : 'Assign training to employees to get started.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setAssignModal(true)}
            >
              <Text style={styles.emptyBtnText}>Assign Training</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(session => {
            const statusColor = getStatusColor(session.status);
            const progress = session.ojt_steps_total > 0
              ? session.ojt_steps_completed / session.ojt_steps_total
              : 0;

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => {
                  setDetailSession(session);
                  setDetailTab('steps');
                }}
                activeOpacity={0.8}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor + '22' }
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {getStatusLabel(session.status)}
                    </Text>
                  </View>
                  <Text style={styles.sessionNumber}>{session.session_number}</Text>
                </View>

                {/* Employee + Template */}
                <Text style={styles.employeeName}>{session.employee_name}</Text>
                <Text style={styles.templateTitle}>{session.template_title}</Text>

                {/* Meta */}
                <View style={styles.metaRow}>
                  {session.department_name && (
                    <View style={styles.metaChip}>
                      <Ionicons name="business-outline" size={10} color={HUD_TEXT_DIM} />
                      <Text style={styles.metaChipText}>{session.department_name}</Text>
                    </View>
                  )}
                  {session.trainer_name && (
                    <View style={styles.metaChip}>
                      <Ionicons name="person-outline" size={10} color={HUD_TEXT_DIM} />
                      <Text style={styles.metaChipText}>Trainer: {session.trainer_name}</Text>
                    </View>
                  )}
                  {session.due_date && (
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={10} color={HUD_TEXT_DIM} />
                      <Text style={styles.metaChipText}>
                        Due: {new Date(session.due_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress Bar */}
                {session.ojt_steps_total > 0 && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress * 100}%` as any,
                            backgroundColor: statusColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {session.ojt_steps_completed}/{session.ojt_steps_total} steps
                    </Text>
                  </View>
                )}

                {/* Test indicators */}
                <View style={styles.testIndicators}>
                  <View style={[
                    styles.testChip,
                    {
                      backgroundColor: session.knowledge_test_passed === true
                        ? HUD_GREEN + '22'
                        : session.knowledge_test_passed === false
                        ? HUD_RED + '22'
                        : HUD_BORDER,
                    }
                  ]}>
                    <Ionicons
                      name={
                        session.knowledge_test_passed === true
                          ? 'checkmark-circle'
                          : session.knowledge_test_passed === false
                          ? 'close-circle'
                          : 'help-circle-outline'
                      }
                      size={12}
                      color={
                        session.knowledge_test_passed === true
                          ? HUD_GREEN
                          : session.knowledge_test_passed === false
                          ? HUD_RED
                          : HUD_TEXT_DIM
                      }
                    />
                    <Text style={[
                      styles.testChipText,
                      {
                        color: session.knowledge_test_passed === true
                          ? HUD_GREEN
                          : session.knowledge_test_passed === false
                          ? HUD_RED
                          : HUD_TEXT_DIM
                      }
                    ]}>
                      Knowledge
                      {session.knowledge_test_score !== null
                        ? ` ${session.knowledge_test_score}%`
                        : ''}
                    </Text>
                  </View>
                  <View style={[
                    styles.testChip,
                    {
                      backgroundColor: session.hands_on_passed === true
                        ? HUD_GREEN + '22'
                        : session.hands_on_passed === false
                        ? HUD_RED + '22'
                        : HUD_BORDER,
                    }
                  ]}>
                    <Ionicons
                      name={
                        session.hands_on_passed === true
                          ? 'checkmark-circle'
                          : session.hands_on_passed === false
                          ? 'close-circle'
                          : 'hand-left-outline'
                      }
                      size={12}
                      color={
                        session.hands_on_passed === true
                          ? HUD_GREEN
                          : session.hands_on_passed === false
                          ? HUD_RED
                          : HUD_TEXT_DIM
                      }
                    />
                    <Text style={[
                      styles.testChipText,
                      {
                        color: session.hands_on_passed === true
                          ? HUD_GREEN
                          : session.hands_on_passed === false
                          ? HUD_RED
                          : HUD_TEXT_DIM
                      }
                    ]}>
                      Hands-On
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── ASSIGN MODAL ── */}
      <Modal
        visible={assignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign Training</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Template <Text style={styles.required}>*</Text>
                </Text>
                <ScrollView
                  style={styles.templatePicker}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {templates.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.templatePickerItem,
                        assignTemplateId === t.id && styles.templatePickerItemActive,
                      ]}
                      onPress={() => setAssignTemplateId(t.id)}
                    >
                      <View style={styles.templatePickerLeft}>
                        <Text style={[
                          styles.templatePickerTitle,
                          assignTemplateId === t.id && { color: HUD_ACCENT },
                        ]}>
                          {t.title}
                        </Text>
                        <Text style={styles.templatePickerSub}>
                          {t.template_number} · {t.training_type.toUpperCase()}
                        </Text>
                      </View>
                      {assignTemplateId === t.id && (
                        <Ionicons name="checkmark-circle" size={18} color={HUD_ACCENT} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {templates.length === 0 && (
                    <Text style={styles.noTemplatesText}>
                      No active templates. Create and activate a template first.
                    </Text>
                  )}
                </ScrollView>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Employee Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={assignEmployeeName}
                  onChangeText={setAssignEmployeeName}
                  placeholder="Full name"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Employee Code</Text>
                <TextInput
                  style={styles.input}
                  value={assignEmployeeCode}
                  onChangeText={setAssignEmployeeCode}
                  placeholder="e.g. EMP-001"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Department</Text>
                <View style={styles.deptGrid}>
                  {DEPARTMENTS.map(dept => (
                    <TouchableOpacity
                      key={dept.code}
                      style={[
                        styles.deptChip,
                        assignDeptCode === dept.code && styles.deptChipActive,
                      ]}
                      onPress={() =>
                        setAssignDeptCode(assignDeptCode === dept.code ? '' : dept.code)
                      }
                    >
                      <Text style={[
                        styles.deptChipText,
                        assignDeptCode === dept.code && styles.deptChipTextActive,
                      ]}>
                        {dept.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Trainer Name</Text>
                <TextInput
                  style={styles.input}
                  value={assignTrainerName}
                  onChangeText={setAssignTrainerName}
                  placeholder="Who will conduct the training?"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  value={assignDueDate}
                  onChangeText={setAssignDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={assignNotes}
                  onChangeText={setAssignNotes}
                  placeholder="Any notes for this assignment..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setAssignModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleAssign}
                  disabled={assigning}
                >
                  {assigning ? (
                    <ActivityIndicator size="small" color={HUD_BG} />
                  ) : (
                    <Text style={styles.modalSaveText}>Assign Training</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── SESSION DETAIL MODAL ── */}
      <Modal
        visible={!!detailSession}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailSession(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {/* Detail Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailClose}
                onPress={() => setDetailSession(null)}
              >
                <Ionicons name="close" size={20} color={HUD_TEXT_DIM} />
              </TouchableOpacity>
              <View style={styles.detailHeaderCenter}>
                <Text style={styles.detailEmployeeName}>
                  {detailSession?.employee_name}
                </Text>
                <Text style={styles.detailTemplateName} numberOfLines={1}>
                  {detailSession?.template_title}
                </Text>
                <Text style={styles.detailSessionNum}>
                  {detailSession?.session_number}
                </Text>
              </View>
              <View style={[
                styles.detailStatusBadge,
                {
                  backgroundColor:
                    getStatusColor(detailSession?.status || '') + '22'
                }
              ]}>
                <Text style={[
                  styles.detailStatusText,
                  { color: getStatusColor(detailSession?.status || '') }
                ]}>
                  {getStatusLabel(detailSession?.status || '')}
                </Text>
              </View>
            </View>

            {/* Detail Tabs */}
            <View style={styles.detailTabBar}>
              {(['steps', 'test', 'hands_on', 'info'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.detailTab, detailTab === tab && styles.detailTabActive]}
                  onPress={() => setDetailTab(tab)}
                >
                  <Text style={[
                    styles.detailTabText,
                    detailTab === tab && styles.detailTabTextActive,
                  ]}>
                    {tab === 'hands_on' ? 'HANDS-ON' : tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* STEPS TAB */}
              {detailTab === 'steps' && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>OJT STEPS</Text>
                  {sessionSteps.length === 0 ? (
                    <Text style={styles.detailEmptyText}>No OJT steps for this session.</Text>
                  ) : (
                    sessionSteps.map(step => {
                      const typeColor = getStepTypeColor(step.step_type);
                      return (
                        <View
                          key={step.id}
                          style={[
                            styles.stepCard,
                            step.status === 'completed' && styles.stepCardComplete,
                          ]}
                        >
                          <View style={[
                            styles.stepNumWrap,
                            { backgroundColor: typeColor + '22' }
                          ]}>
                            {step.status === 'completed' ? (
                              <Ionicons name="checkmark" size={16} color={typeColor} />
                            ) : (
                              <Text style={[styles.stepNum, { color: typeColor }]}>
                                {step.step_number}
                              </Text>
                            )}
                          </View>
                          <View style={styles.stepBody}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={[styles.stepType, { color: typeColor }]}>
                              {step.step_type.toUpperCase()}
                            </Text>
                            {step.status === 'completed' && (
                              <View style={styles.stepSignoffInfo}>
                                {step.trainer_name && (
                                  <Text style={styles.stepSignoffText}>
                                    Trainer: {step.trainer_name}
                                  </Text>
                                )}
                                {step.completed_at && (
                                  <Text style={styles.stepSignoffText}>
                                    {new Date(step.completed_at).toLocaleDateString()}
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                          {step.status !== 'completed' &&
                            detailSession?.status !== 'completed' &&
                            detailSession?.status !== 'failed' && (
                              <TouchableOpacity
                                style={styles.signoffBtn}
                                onPress={() => openStepSignoff(step.id)}
                              >
                                <Text style={styles.signoffBtnText}>Sign Off</Text>
                              </TouchableOpacity>
                            )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* TEST TAB */}
              {detailTab === 'test' && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Text style={styles.detailSectionLabel}>KNOWLEDGE TEST</Text>
                    {detailSession?.knowledge_test_passed === null &&
                      detailSession?.status !== 'completed' &&
                      detailSession?.status !== 'failed' &&
                      templateQuestions.length > 0 && (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={openTest}
                        >
                          <Text style={styles.actionBtnText}>Take Test</Text>
                        </TouchableOpacity>
                      )}
                  </View>

                  {/* Test status */}
                  {detailSession?.knowledge_test_passed !== null && (
                    <View style={[
                      styles.testResultCard,
                      {
                        borderColor: detailSession?.knowledge_test_passed
                          ? HUD_GREEN + '44'
                          : HUD_RED + '44',
                        backgroundColor: detailSession?.knowledge_test_passed
                          ? HUD_GREEN + '11'
                          : HUD_RED + '11',
                      }
                    ]}>
                      <Ionicons
                        name={detailSession?.knowledge_test_passed
                          ? 'checkmark-circle'
                          : 'close-circle'
                        }
                        size={24}
                        color={detailSession?.knowledge_test_passed ? HUD_GREEN : HUD_RED}
                      />
                      <View>
                        <Text style={[
                          styles.testResultTitle,
                          {
                            color: detailSession?.knowledge_test_passed
                              ? HUD_GREEN
                              : HUD_RED
                          }
                        ]}>
                          {detailSession?.knowledge_test_passed ? 'PASSED' : 'FAILED'}
                        </Text>
                        <Text style={styles.testResultScore}>
                          Score: {detailSession?.knowledge_test_score}% ·
                          Attempts: {detailSession?.knowledge_test_attempts}
                        </Text>
                      </View>
                    </View>
                  )}

                  {templateQuestions.length === 0 && (
                    <Text style={styles.detailEmptyText}>
                      No questions in this template's knowledge test.
                    </Text>
                  )}

                  {/* Attempt history */}
                  {sessionAttempts
                    .filter(a => a.attempt_type === 'knowledge_test')
                    .map(attempt => (
                      <View key={attempt.id} style={styles.attemptCard}>
                        <Text style={styles.attemptTitle}>
                          Attempt #{attempt.attempt_number}
                        </Text>
                        <View style={styles.attemptRow}>
                          <Text style={styles.attemptLabel}>Score</Text>
                          <Text style={[
                            styles.attemptValue,
                            { color: attempt.passed ? HUD_GREEN : HUD_RED }
                          ]}>
                            {attempt.score}%
                          </Text>
                        </View>
                        <View style={styles.attemptRow}>
                          <Text style={styles.attemptLabel}>Result</Text>
                          <Text style={[
                            styles.attemptValue,
                            { color: attempt.passed ? HUD_GREEN : HUD_RED }
                          ]}>
                            {attempt.passed ? 'PASS' : 'FAIL'}
                          </Text>
                        </View>
                        <Text style={styles.attemptDate}>
                          {new Date(attempt.attempted_at).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* HANDS-ON TAB */}
              {detailTab === 'hands_on' && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Text style={styles.detailSectionLabel}>HANDS-ON EVALUATION</Text>
                    {detailSession?.hands_on_passed === null &&
                      detailSession?.status !== 'completed' &&
                      detailSession?.status !== 'failed' &&
                      templateChecklist.length > 0 && (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={openHandsOn}
                        >
                          <Text style={styles.actionBtnText}>Evaluate</Text>
                        </TouchableOpacity>
                      )}
                  </View>

                  {detailSession?.hands_on_passed !== null && (
                    <View style={[
                      styles.testResultCard,
                      {
                        borderColor: detailSession?.hands_on_passed
                          ? HUD_GREEN + '44'
                          : HUD_RED + '44',
                        backgroundColor: detailSession?.hands_on_passed
                          ? HUD_GREEN + '11'
                          : HUD_RED + '11',
                      }
                    ]}>
                      <Ionicons
                        name={detailSession?.hands_on_passed
                          ? 'checkmark-circle'
                          : 'close-circle'
                        }
                        size={24}
                        color={detailSession?.hands_on_passed ? HUD_GREEN : HUD_RED}
                      />
                      <View>
                        <Text style={[
                          styles.testResultTitle,
                          {
                            color: detailSession?.hands_on_passed ? HUD_GREEN : HUD_RED
                          }
                        ]}>
                          {detailSession?.hands_on_passed ? 'PASSED' : 'FAILED'}
                        </Text>
                        {detailSession?.evaluator_name && (
                          <Text style={styles.testResultScore}>
                            Evaluator: {detailSession.evaluator_name}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {templateChecklist.length === 0 && (
                    <Text style={styles.detailEmptyText}>
                      No checklist items in this template.
                    </Text>
                  )}

                  {templateChecklist.map(item => (
                    <View key={item.id} style={styles.checklistViewItem}>
                      <View style={[
                        styles.criticalDot,
                        { backgroundColor: item.is_critical ? HUD_RED : HUD_TEXT_DIM }
                      ]} />
                      <View style={styles.checklistViewBody}>
                        <Text style={styles.checklistViewSkill}>
                          {item.skill_description}
                        </Text>
                        {item.is_critical && (
                          <Text style={styles.criticalLabel}>CRITICAL</Text>
                        )}
                        {item.evaluation_criteria && (
                          <Text style={styles.checklistViewCriteria}>
                            {item.evaluation_criteria}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* INFO TAB */}
              {detailTab === 'info' && detailSession && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionLabel}>SESSION INFO</Text>
                  {[
                    { label: 'Session #', value: detailSession.session_number },
                    { label: 'Template', value: detailSession.template_title },
                    { label: 'Version', value: detailSession.template_version || 'N/A' },
                    { label: 'Employee', value: detailSession.employee_name },
                    { label: 'Employee Code', value: detailSession.employee_code || 'N/A' },
                    { label: 'Department', value: detailSession.department_name || 'N/A' },
                    { label: 'Trainer', value: detailSession.trainer_name || 'N/A' },
                    {
                      label: 'Assigned',
                      value: new Date(detailSession.assigned_at).toLocaleDateString(),
                    },
                    {
                      label: 'Due Date',
                      value: detailSession.due_date
                        ? new Date(detailSession.due_date).toLocaleDateString()
                        : 'N/A',
                    },
                    {
                      label: 'Started',
                      value: detailSession.started_at
                        ? new Date(detailSession.started_at).toLocaleDateString()
                        : 'Not started',
                    },
                    {
                      label: 'Completed',
                      value: detailSession.completed_at
                        ? new Date(detailSession.completed_at).toLocaleDateString()
                        : 'Not completed',
                    },
                  ].map(row => (
                    <View key={row.label} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{row.label}</Text>
                      <Text style={styles.infoValue}>{row.value}</Text>
                    </View>
                  ))}

                  {/* Complete Button */}
                  {detailSession.status !== 'completed' &&
                    detailSession.status !== 'failed' &&
                    detailSession.status !== 'cancelled' && (
                      <TouchableOpacity
                        style={[
                          styles.completeBtn,
                          !canComplete(detailSession) && styles.completeBtnDisabled,
                        ]}
                        onPress={() => {
                          if (!canComplete(detailSession)) {
                            Alert.alert(
                              'Not Ready',
                              'Both the knowledge test and hands-on evaluation must be completed before finalizing.'
                            );
                            return;
                          }
                          setCompleteModal(true);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={HUD_BG} />
                        <Text style={styles.completeBtnText}>
                          Finalize Training Session
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── STEP SIGN-OFF MODAL ── */}
      <Modal
        visible={stepSignoffModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStepSignoffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>Step Sign-Off</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Trainer Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={signoffTrainerName}
                onChangeText={setSignoffTrainerName}
                placeholder="Trainer full name"
                placeholderTextColor={HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Observer Name (if applicable)</Text>
              <TextInput
                style={styles.input}
                value={signoffObserverName}
                onChangeText={setSignoffObserverName}
                placeholder="Observer full name"
                placeholderTextColor={HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={signoffNotes}
                onChangeText={setSignoffNotes}
                placeholder="Any observations or notes..."
                placeholderTextColor={HUD_TEXT_DIM}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setStepSignoffModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleStepSignoff}
                disabled={signoffSaving}
              >
                {signoffSaving ? (
                  <ActivityIndicator size="small" color={HUD_BG} />
                ) : (
                  <Text style={styles.modalSaveText}>Sign Off</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── KNOWLEDGE TEST MODAL ── */}
      <Modal
        visible={testModal}
        transparent
        animationType="slide"
        onRequestClose={() => !testResult && setTestModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>Knowledge Test</Text>
              {!testResult && (
                <TouchableOpacity onPress={() => setTestModal(false)}>
                  <Ionicons name="close" size={20} color={HUD_TEXT_DIM} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {testResult ? (
                <View style={styles.testResultFull}>
                  <View style={[
                    styles.testResultCircle,
                    { borderColor: testResult.passed ? HUD_GREEN : HUD_RED }
                  ]}>
                    <Text style={[
                      styles.testResultBig,
                      { color: testResult.passed ? HUD_GREEN : HUD_RED }
                    ]}>
                      {testResult.score}%
                    </Text>
                    <Text style={[
                      styles.testResultLabel,
                      { color: testResult.passed ? HUD_GREEN : HUD_RED }
                    ]}>
                      {testResult.passed ? 'PASSED' : 'FAILED'}
                    </Text>
                  </View>
                  <Text style={styles.testResultMsg}>
                    {testResult.passed
                      ? 'Great work! The knowledge test has been recorded.'
                      : 'The minimum passing score was not reached. Review the material and try again.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalSave}
                    onPress={() => setTestModal(false)}
                  >
                    <Text style={styles.modalSaveText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.testInstructions}>
                    Answer all questions. All fields must be filled in before submitting.
                    Passing score: 80%
                  </Text>
                  {templateQuestions.map((q, index) => (
                    <View key={q.id} style={styles.questionCard}>
                      <Text style={styles.questionNum}>Q{q.question_number}</Text>
                      <Text style={styles.questionText}>{q.question_text}</Text>
                      {q.question_type === 'multiple_choice' && q.options && (
                        <View style={styles.optionsWrap}>
                          {q.options.map((opt, i) => (
                            <TouchableOpacity
                              key={i}
                              style={[
                                styles.answerOption,
                                testAnswers[q.id] === opt && styles.answerOptionSelected,
                              ]}
                              onPress={() =>
                                setTestAnswers(prev => ({ ...prev, [q.id]: opt }))
                              }
                            >
                              <View style={[
                                styles.answerDot,
                                testAnswers[q.id] === opt && styles.answerDotSelected,
                              ]} />
                              <Text style={[
                                styles.answerOptionText,
                                testAnswers[q.id] === opt && styles.answerOptionTextSelected,
                              ]}>
                                {String.fromCharCode(65 + i)}. {opt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {q.question_type === 'true_false' && (
                        <View style={styles.optionsWrap}>
                          {['True', 'False'].map(v => (
                            <TouchableOpacity
                              key={v}
                              style={[
                                styles.answerOption,
                                testAnswers[q.id] === v && styles.answerOptionSelected,
                              ]}
                              onPress={() =>
                                setTestAnswers(prev => ({ ...prev, [q.id]: v }))
                              }
                            >
                              <View style={[
                                styles.answerDot,
                                testAnswers[q.id] === v && styles.answerDotSelected,
                              ]} />
                              <Text style={[
                                styles.answerOptionText,
                                testAnswers[q.id] === v && styles.answerOptionTextSelected,
                              ]}>
                                {v}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {q.question_type === 'short_answer' && (
                        <TextInput
                          style={[styles.input, styles.inputMultiline]}
                          value={testAnswers[q.id] || ''}
                          onChangeText={v =>
                            setTestAnswers(prev => ({ ...prev, [q.id]: v }))
                          }
                          placeholder="Your answer..."
                          placeholderTextColor={HUD_TEXT_DIM}
                          multiline
                          numberOfLines={3}
                        />
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.modalSave}
                    onPress={handleSubmitTest}
                    disabled={testSubmitting}
                  >
                    {testSubmitting ? (
                      <ActivityIndicator size="small" color={HUD_BG} />
                    ) : (
                      <Text style={styles.modalSaveText}>Submit Test</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── HANDS-ON EVALUATION MODAL ── */}
      <Modal
        visible={handsOnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setHandsOnModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>Hands-On Evaluation</Text>
              <TouchableOpacity onPress={() => setHandsOnModal(false)}>
                <Ionicons name="close" size={20} color={HUD_TEXT_DIM} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Evaluator Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={handsOnEvaluator}
                  onChangeText={setHandsOnEvaluator}
                  placeholder="Evaluator full name"
                  placeholderTextColor={HUD_TEXT_DIM}
                />
              </View>

              <Text style={styles.detailSectionLabel}>SKILL EVALUATION</Text>
              <Text style={styles.evalInstructions}>
                Evaluate each skill. Critical items must pass for overall evaluation to pass.
              </Text>

              {templateChecklist.map(item => (
                <View key={item.id} style={styles.evalItem}>
                  <View style={styles.evalItemHeader}>
                    <Text style={styles.evalSkill}>{item.skill_description}</Text>
                    {item.is_critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                      </View>
                    )}
                  </View>
                  {item.evaluation_criteria && (
                    <Text style={styles.evalCriteria}>{item.evaluation_criteria}</Text>
                  )}
                  <View style={styles.evalButtons}>
                    {(['pass', 'fail', 'na'] as const).map(result => (
                      <TouchableOpacity
                        key={result}
                        style={[
                          styles.evalBtn,
                          handsOnResults[item.id]?.result === result && {
                            backgroundColor:
                              result === 'pass'
                                ? HUD_GREEN + '33'
                                : result === 'fail'
                                ? HUD_RED + '33'
                                : HUD_TEXT_DIM + '33',
                            borderColor:
                              result === 'pass'
                                ? HUD_GREEN
                                : result === 'fail'
                                ? HUD_RED
                                : HUD_TEXT_DIM,
                          },
                        ]}
                        onPress={() =>
                          setHandsOnResults(prev => ({
                            ...prev,
                            [item.id]: {
                              result,
                              notes: prev[item.id]?.notes || '',
                            },
                          }))
                        }
                      >
                        <Text style={[
                          styles.evalBtnText,
                          handsOnResults[item.id]?.result === result && {
                            color:
                              result === 'pass'
                                ? HUD_GREEN
                                : result === 'fail'
                                ? HUD_RED
                                : HUD_TEXT_DIM,
                          },
                        ]}>
                          {result === 'na' ? 'N/A' : result.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Overall Evaluator Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={handsOnNotes}
                  onChangeText={setHandsOnNotes}
                  placeholder="Overall observations and notes..."
                  placeholderTextColor={HUD_TEXT_DIM}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setHandsOnModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSubmitHandsOn}
                  disabled={handsOnSubmitting}
                >
                  {handsOnSubmitting ? (
                    <ActivityIndicator size="small" color={HUD_BG} />
                  ) : (
                    <Text style={styles.modalSaveText}>Submit Evaluation</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── COMPLETE SESSION MODAL ── */}
      <Modal
        visible={completeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="checkmark-circle" size={32} color={HUD_GREEN} />
            </View>
            <Text style={styles.confirmTitle}>Finalize Training Session</Text>
            <Text style={styles.confirmMessage}>
              This will finalize the training session for{' '}
              <Text style={{ color: HUD_TEXT_BRIGHT }}>{detailSession?.employee_name}</Text>
              {'. '}
              If both tests passed, the session will be marked complete and a certification
              may be issued.
            </Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Supervisor / Manager Sign-Off <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={completeSupervisor}
                onChangeText={setCompleteSupervisor}
                placeholder="Supervisor full name"
                placeholderTextColor={HUD_TEXT_DIM}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Final Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={completeNotes}
                onChangeText={setCompleteNotes}
                placeholder="Any final notes..."
                placeholderTextColor={HUD_TEXT_DIM}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: HUD_GREEN }]}
                onPress={handleComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color={HUD_BG} />
                ) : (
                  <Text style={styles.modalSaveText}>Finalize</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  assignBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, height: 38, color: HUD_TEXT, fontSize: 13 },
  filterStrip: {
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
    maxHeight: 44,
  },
  filterStripContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  filterChipActive: { borderColor: HUD_ACCENT, backgroundColor: HUD_ACCENT + '15' },
  filterChipText: { fontSize: 10, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  filterChipTextActive: { color: HUD_ACCENT },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: HUD_TEXT_DIM, fontSize: 14 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: HUD_TEXT_DIM, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  sessionCard: {
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sessionNumber: { fontSize: 11, color: HUD_TEXT_DIM },
  employeeName: { fontSize: 15, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginBottom: 2 },
  templateTitle: { fontSize: 12, color: HUD_TEXT, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HUD_BG,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: HUD_BORDER,
  },
  metaChipText: { fontSize: 10, color: HUD_TEXT_DIM },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: HUD_BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 10, color: HUD_TEXT_DIM, minWidth: 50 },
  testIndicators: { flexDirection: 'row', gap: 8 },
  testChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testChipText: { fontSize: 10, fontWeight: '600' },
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
  fieldWrap: { gap: 6, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
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
  inputMultiline: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
  templatePicker: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    maxHeight: 160,
  },
  templatePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  templatePickerItemActive: { backgroundColor: HUD_ACCENT + '11' },
  templatePickerLeft: { flex: 1 },
  templatePickerTitle: { fontSize: 13, fontWeight: '600', color: HUD_TEXT },
  templatePickerSub: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 2 },
  noTemplatesText: { fontSize: 12, color: HUD_TEXT_DIM, padding: 12, textAlign: 'center' },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  deptChipActive: { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT },
  deptChipText: { fontSize: 12, color: HUD_TEXT_DIM, fontWeight: '500' },
  deptChipTextActive: { color: HUD_ACCENT, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: HUD_CARD,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: HUD_BORDER,
    height: '92%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
    gap: 10,
  },
  detailClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: HUD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderCenter: { flex: 1 },
  detailEmployeeName: { fontSize: 15, fontWeight: '700', color: HUD_TEXT_BRIGHT },
  detailTemplateName: { fontSize: 12, color: HUD_TEXT, marginTop: 1 },
  detailSessionNum: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 1 },
  detailStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  detailStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  detailTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
    backgroundColor: HUD_CARD,
  },
  detailTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabActive: { borderBottomColor: HUD_ACCENT },
  detailTabText: { fontSize: 10, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  detailTabTextActive: { color: HUD_ACCENT },
  detailScroll: { flex: 1 },
  detailScrollContent: { padding: 16 },
  detailSection: { gap: 8 },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HUD_TEXT_DIM,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailEmptyText: { fontSize: 13, color: HUD_TEXT_DIM, textAlign: 'center', paddingVertical: 20 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  stepCardComplete: { borderColor: HUD_GREEN + '44', backgroundColor: HUD_GREEN + '08' },
  stepNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '600', color: HUD_TEXT_BRIGHT },
  stepType: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  stepSignoffInfo: { marginTop: 4, gap: 2 },
  stepSignoffText: { fontSize: 10, color: HUD_TEXT_DIM },
  signoffBtn: {
    backgroundColor: HUD_ACCENT + '22',
    borderWidth: 1,
    borderColor: HUD_ACCENT + '44',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signoffBtnText: { fontSize: 11, color: HUD_ACCENT, fontWeight: '700' },
  testResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  testResultTitle: { fontSize: 14, fontWeight: '700' },
  testResultScore: { fontSize: 12, color: HUD_TEXT_DIM, marginTop: 2 },
  attemptCard: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  attemptTitle: { fontSize: 13, fontWeight: '600', color: HUD_TEXT_BRIGHT, marginBottom: 4 },
  attemptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  attemptLabel: { fontSize: 12, color: HUD_TEXT_DIM },
  attemptValue: { fontSize: 12, fontWeight: '600' },
  attemptDate: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 4 },
  actionBtn: {
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: HUD_BG },
  checklistViewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  criticalDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  checklistViewBody: { flex: 1, gap: 2 },
  checklistViewSkill: { fontSize: 13, color: HUD_TEXT },
  criticalLabel: { fontSize: 10, color: HUD_RED, fontWeight: '700' },
  checklistViewCriteria: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  infoLabel: { fontSize: 12, color: HUD_TEXT_DIM },
  infoValue: { fontSize: 12, color: HUD_TEXT_BRIGHT, fontWeight: '500' },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HUD_GREEN,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  completeBtnDisabled: { opacity: 0.4 },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: HUD_BG },
  confirmModal: {
    margin: 24,
    backgroundColor: HUD_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    padding: 24,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HUD_GREEN + '22',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: HUD_TEXT_DIM,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  testResultFull: { alignItems: 'center', paddingVertical: 32, gap: 16 },
  testResultCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  testResultBig: { fontSize: 28, fontWeight: '800' },
  testResultLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  testResultMsg: {
    fontSize: 14,
    color: HUD_TEXT_DIM,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  testInstructions: {
    fontSize: 12,
    color: HUD_TEXT_DIM,
    marginBottom: 16,
    lineHeight: 18,
  },
  questionCard: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  questionNum: { fontSize: 10, color: HUD_PURPLE, fontWeight: '700', letterSpacing: 0.5 },
  questionText: { fontSize: 14, color: HUD_TEXT_BRIGHT, fontWeight: '500', lineHeight: 20 },
  optionsWrap: { gap: 8 },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_CARD,
  },
  answerOptionSelected: {
    borderColor: HUD_ACCENT,
    backgroundColor: HUD_ACCENT + '15',
  },
  answerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: HUD_TEXT_DIM,
  },
  answerDotSelected: { borderColor: HUD_ACCENT, backgroundColor: HUD_ACCENT },
  answerOptionText: { fontSize: 13, color: HUD_TEXT },
  answerOptionTextSelected: { color: HUD_ACCENT, fontWeight: '600' },
  evalInstructions: {
    fontSize: 12,
    color: HUD_TEXT_DIM,
    marginBottom: 12,
    lineHeight: 17,
  },
  evalItem: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  evalItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  evalSkill: { fontSize: 13, fontWeight: '600', color: HUD_TEXT_BRIGHT, flex: 1 },
  evalCriteria: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 16 },
  evalButtons: { flexDirection: 'row', gap: 8 },
  evalBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    alignItems: 'center',
  },
  evalBtnText: { fontSize: 12, fontWeight: '700', color: HUD_TEXT_DIM },
  criticalBadge: {
    backgroundColor: HUD_RED + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_RED },
});
