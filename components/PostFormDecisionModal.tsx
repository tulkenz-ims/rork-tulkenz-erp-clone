import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  CheckCircle,
  Circle,
  Factory,
  ClipboardList,
  ArrowRight,
  FileText,
  Shield,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import { TaskFeedDepartmentTask, FormCompletion } from '@/types/taskFeedTemplates';
import PinSignatureCapture, { isSignatureVerified } from './PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';
import * as Haptics from 'expo-haptics';

// ── Types ─────────────────────────────────────────────────────

interface PostFormDecisionModalProps {
  visible: boolean;
  onClose: () => void;
  task: (TaskFeedDepartmentTask & { post?: any }) | null;
  departmentCode: string;
  departmentName: string;

  /** User wants to open another form */
  onAnotherForm: () => void;
  /** User wants to escalate to another department */
  onEscalate: () => void;
  /** User marks department task as resolved (green) */
  onMarkResolved: (data: {
    lineOperational: boolean;
    completionNotes: string;
    signature: SignatureVerification;
  }) => void;
  /** User confirms not involved */
  onNotInvolved: (data: {
    reason: string;
    signature: SignatureVerification;
  }) => void;

  /** If true, shows the "Verify Not Involved" flow instead */
  notInvolvedMode?: boolean;

  isSubmitting?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export default function PostFormDecisionModal({
  visible,
  onClose,
  task,
  departmentCode,
  departmentName,
  onAnotherForm,
  onEscalate,
  onMarkResolved,
  onNotInvolved,
  notInvolvedMode = false,
  isSubmitting = false,
}: PostFormDecisionModalProps) {
  const { colors } = useTheme();
  const deptColor = getDepartmentColor(departmentCode) || '#6B7280';

  // Decision state
  const [lineOperational, setLineOperational] = useState<boolean | null>(null);
  const [taskResolved, setTaskResolved] = useState<boolean | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [signature, setSignature] = useState<SignatureVerification | null>(null);

  // Not-involved state
  const [notInvolvedReason, setNotInvolvedReason] = useState('');

  const completedForms: FormCompletion[] = task?.formCompletions || [];
  const formType = task?.formType || '';
  const isProductionHold = task?.post?.is_production_hold || task?.post?.isProductionHold;

  const resetState = () => {
    setLineOperational(null);
    setTaskResolved(null);
    setCompletionNotes('');
    setSignature(null);
    setNotInvolvedReason('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnotherForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetState();
    onAnotherForm();
  };

  const handleEscalate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetState();
    onEscalate();
  };

  const handleResolve = () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Verify your identity with PIN to complete this task.');
      return;
    }
    // Only require line operational answer if this is a production hold post
    if (isProductionHold && lineOperational === null) {
      Alert.alert('Required', 'Indicate whether the production line is operational.');
      return;
    }
    if (!completionNotes.trim()) {
      Alert.alert('Required', 'Add completion notes or enter N/A.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkResolved({
      lineOperational: isProductionHold ? lineOperational! : true,
      completionNotes: completionNotes.trim(),
      signature,
    });
  };

  const handleNotInvolved = () => {
    if (!signature) {
      Alert.alert('Signature Required', 'Verify your identity with PIN to confirm.');
      return;
    }
    if (!notInvolvedReason.trim()) {
      Alert.alert('Required', 'Provide a reason.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onNotInvolved({
      reason: notInvolvedReason.trim(),
      signature,
    });
  };

  // ── Not-Involved Mode ───────────────────────────────────────
  if (notInvolvedMode) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <XCircle size={18} color={deptColor} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Verify Not Involved</Text>
              </View>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Task info */}
              <View style={[styles.taskBanner, { backgroundColor: colors.background }]}>
                <Text style={[styles.taskPostNumber, { color: deptColor }]}>{task?.postNumber}</Text>
                <Text style={[styles.taskTemplate, { color: colors.text }]}>{task?.post?.template_name || 'Task'}</Text>
              </View>

              {/* Department badge */}
              <View style={[styles.deptBadge, { backgroundColor: deptColor + '20', borderColor: deptColor }]}>
                <Text style={[styles.deptBadgeText, { color: deptColor }]}>{departmentName}</Text>
              </View>

              <Text style={[styles.explainText, { color: colors.textSecondary }]}>
                Confirm that {departmentName} was not involved in resolving this issue.
                This will mark the department's task as complete with verification.
              </Text>

              {/* Reason */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Reason *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder={`${departmentName} assistance was not needed on this task because...`}
                placeholderTextColor={colors.textTertiary}
                value={notInvolvedReason}
                onChangeText={setNotInvolvedReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* PIN Signature */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Verified By *</Text>
              <PinSignatureCapture
                onVerified={setSignature}
                onCleared={() => setSignature(null)}
                formLabel="Not Involved Verification"
                accentColor={deptColor}
              />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={handleClose}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resolveBtn, { backgroundColor: isSignatureVerified(signature) && notInvolvedReason.trim() ? '#10B981' : colors.border }]}
                onPress={handleNotInvolved}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#fff" />
                    <Text style={styles.resolveBtnText}>Confirm Not Involved</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main Decision Flow ──────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <ClipboardList size={18} color={deptColor} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Task Progress</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Task info */}
            <View style={[styles.taskBanner, { backgroundColor: colors.background }]}>
              <View style={styles.taskBannerTop}>
                <Text style={[styles.taskPostNumber, { color: deptColor }]}>{task?.postNumber}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#F59E0B20' }]}>
                  <Clock size={10} color="#F59E0B" />
                  <Text style={[styles.statusPillText, { color: '#F59E0B' }]}>In Progress</Text>
                </View>
              </View>
              <Text style={[styles.taskTemplate, { color: colors.text }]}>{task?.post?.template_name || 'Task'}</Text>
            </View>

            {/* Forms completed so far */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Forms Completed</Text>
            {completedForms.length === 0 && formType ? (
              <View style={[styles.formRow, { borderColor: '#F59E0B40' }]}>
                <View style={[styles.formIcon, { backgroundColor: '#F59E0B20' }]}>
                  <FileText size={14} color="#F59E0B" />
                </View>
                <View style={styles.formInfo}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{formType}</Text>
                  <Text style={[styles.formSub, { color: '#F59E0B' }]}>Started — confirm below</Text>
                </View>
                <Clock size={14} color="#F59E0B" />
              </View>
            ) : completedForms.length === 0 ? (
              <Text style={[styles.noFormsText, { color: colors.textTertiary }]}>No forms completed yet</Text>
            ) : null}

            {completedForms.map((form, i) => (
              <View key={i} style={[styles.formRow, { borderColor: '#10B98140' }]}>
                <View style={[styles.formIcon, { backgroundColor: '#10B98120' }]}>
                  <CheckCircle size={14} color="#10B981" />
                </View>
                <View style={styles.formInfo}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{form.formType}</Text>
                  <Text style={[styles.formSub, { color: colors.textSecondary }]}>
                    {form.completedByName} — {new Date(form.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
                <CheckCircle size={14} color="#10B981" />
              </View>
            ))}

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Q1: Line Operational? */}
            {isProductionHold && (
              <>
                <Text style={[styles.questionLabel, { color: colors.text }]}>
                  <Factory size={14} color={colors.text} /> Is the production line operational?
                </Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, {
                      backgroundColor: lineOperational === true ? '#10B98120' : colors.background,
                      borderColor: lineOperational === true ? '#10B981' : colors.border,
                    }]}
                    onPress={() => setLineOperational(true)}
                  >
                    <CheckCircle size={16} color={lineOperational === true ? '#10B981' : colors.textTertiary} />
                    <Text style={[styles.toggleText, { color: lineOperational === true ? '#10B981' : colors.textSecondary }]}>
                      Yes — line can run
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, {
                      backgroundColor: lineOperational === false ? '#EF444420' : colors.background,
                      borderColor: lineOperational === false ? '#EF4444' : colors.border,
                    }]}
                    onPress={() => setLineOperational(false)}
                  >
                    <XCircle size={16} color={lineOperational === false ? '#EF4444' : colors.textTertiary} />
                    <Text style={[styles.toggleText, { color: lineOperational === false ? '#EF4444' : colors.textSecondary }]}>
                      No — hold continues
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* If not a production hold, skip line question — default operational */}
            {!isProductionHold && lineOperational === null && (() => { /* auto-set */ return null; })()}

            {/* Q2: Task Resolved? */}
            <Text style={[styles.questionLabel, { color: colors.text }]}>
              Is your department's task resolved?
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, {
                  backgroundColor: taskResolved === true ? '#10B98120' : colors.background,
                  borderColor: taskResolved === true ? '#10B981' : colors.border,
                }]}
                onPress={() => setTaskResolved(true)}
              >
                <CheckCircle size={16} color={taskResolved === true ? '#10B981' : colors.textTertiary} />
                <Text style={[styles.toggleText, { color: taskResolved === true ? '#10B981' : colors.textSecondary }]}>
                  Yes — we're done
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, {
                  backgroundColor: taskResolved === false ? '#F59E0B20' : colors.background,
                  borderColor: taskResolved === false ? '#F59E0B' : colors.border,
                }]}
                onPress={() => setTaskResolved(false)}
              >
                <Clock size={16} color={taskResolved === false ? '#F59E0B' : colors.textTertiary} />
                <Text style={[styles.toggleText, { color: taskResolved === false ? '#F59E0B' : colors.textSecondary }]}>
                  No — more to do
                </Text>
              </TouchableOpacity>
            </View>

            {/* Q3: Next Action (only if not resolved) */}
            {taskResolved === false && (
              <>
                <Text style={[styles.questionLabel, { color: colors.text }]}>What do you need to do next?</Text>
                <View style={styles.nextActions}>
                  <TouchableOpacity
                    style={[styles.nextActionBtn, { backgroundColor: deptColor + '15', borderColor: deptColor + '60' }]}
                    onPress={handleAnotherForm}
                    activeOpacity={0.7}
                  >
                    <FileText size={18} color={deptColor} />
                    <View style={styles.nextActionInfo}>
                      <Text style={[styles.nextActionTitle, { color: colors.text }]}>Fill out another form</Text>
                      <Text style={[styles.nextActionDesc, { color: colors.textSecondary }]}>Open form picker to select next form</Text>
                    </View>
                    <ArrowRight size={16} color={deptColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.nextActionBtn, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF660' }]}
                    onPress={handleEscalate}
                    activeOpacity={0.7}
                  >
                    <ArrowRight size={18} color="#8B5CF6" />
                    <View style={styles.nextActionInfo}>
                      <Text style={[styles.nextActionTitle, { color: colors.text }]}>Escalate to another department</Text>
                      <Text style={[styles.nextActionDesc, { color: colors.textSecondary }]}>Send this task to additional departments</Text>
                    </View>
                    <ArrowRight size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Resolve section (only if resolved = yes) */}
            {taskResolved === true && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Text style={[styles.sectionLabel, { color: '#10B981' }]}>Complete Task</Text>

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Completion Notes *</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="Summarize what was done to resolve this task..."
                  placeholderTextColor={colors.textTertiary}
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* PIN Signature */}
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Verified By *</Text>
                <PinSignatureCapture
                  onVerified={setSignature}
                  onCleared={() => setSignature(null)}
                  formLabel={`${departmentName} — Task Complete`}
                  accentColor="#10B981"
                />
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          {taskResolved === true && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={handleClose}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resolveBtn, {
                  backgroundColor: isSignatureVerified(signature) && completionNotes.trim()
                    ? '#10B981' : colors.border,
                }]}
                onPress={handleResolve}
                disabled={isSubmitting || !isSignatureVerified(signature) || !completionNotes.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={16} color="#fff" />
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Close button when no resolution yet */}
          {taskResolved !== true && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.closeOnlyBtn, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Close — continue later</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  taskBanner: { padding: 14, borderRadius: 12, marginBottom: 16, gap: 4 },
  taskBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskPostNumber: { fontSize: 14, fontWeight: '800' },
  taskTemplate: { fontSize: 15, fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  formRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10, marginBottom: 6 },
  formIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  formInfo: { flex: 1, gap: 2 },
  formLabel: { fontSize: 13, fontWeight: '600' },
  formSub: { fontSize: 11 },
  noFormsText: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  divider: { height: 1, marginVertical: 16 },
  questionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  toggleText: { fontSize: 13, fontWeight: '600', flex: 1 },
  nextActions: { gap: 10, marginBottom: 8 },
  nextActionBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  nextActionInfo: { flex: 1, gap: 2 },
  nextActionTitle: { fontSize: 14, fontWeight: '600' },
  nextActionDesc: { fontSize: 11 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 12 },
  deptBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  deptBadgeText: { fontSize: 13, fontWeight: '700' },
  explainText: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  resolveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  resolveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  closeOnlyBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
