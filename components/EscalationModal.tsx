import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { DEPARTMENT_CODES } from '@/constants/organizationCodes';
import { useEscalateToDepartment, EscalateInput } from '@/hooks/useTaskFeedTemplates';
import * as Haptics from 'expo-haptics';

// Departments available for escalation (operational only)
const ESCALATION_DEPARTMENTS = [
  { code: '1001', name: 'Maintenance' },
  { code: '1002', name: 'Sanitation' },
  { code: '1003', name: 'Production' },
  { code: '1004', name: 'Quality' },
  { code: '1005', name: 'Safety' },
  { code: '1008', name: 'Warehouse' },
];

const PRIORITY_OPTIONS = [
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
  { value: 'emergency', label: 'Emergency', color: '#7F1D1D' },
] as const;

const COMMON_REASONS = [
  'Equipment needs repair',
  'Area needs sanitation',
  'Safety concern identified',
  'Quality hold required',
  'Chemical spill / contamination',
  'Broken glass / foreign material',
  'Employee injury',
  'Product deviation',
  'Equipment lockout needed',
  'Room clearance required',
];

interface EscalationModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postNumber: string;
  organizationId: string;
  fromDepartmentCode: string;
  fromTaskId: string;
  existingDepartments: string[];
  onSuccess?: () => void;
}

export default function EscalationModal({
  visible,
  onClose,
  postId,
  postNumber,
  organizationId,
  fromDepartmentCode,
  fromTaskId,
  existingDepartments,
  onSuccess,
}: EscalationModalProps) {
  const { colors } = useTheme();
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<string>('high');
  const [requireSignoff, setRequireSignoff] = useState(true);
  const [showReasons, setShowReasons] = useState(false);

  const escalate = useEscalateToDepartment({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetAndClose();
      onSuccess?.();
    },
    onError: (err) => {
      Alert.alert('Error', err.message || 'Failed to escalate');
    },
  });

  const availableDepts = useMemo(() =>
    ESCALATION_DEPARTMENTS.filter(d =>
      d.code !== fromDepartmentCode && !existingDepartments.includes(d.code)
    ), [fromDepartmentCode, existingDepartments]
  );

  const toggleDept = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDepts(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const resetAndClose = () => {
    setSelectedDepts(new Set());
    setReason('');
    setPriority('high');
    setRequireSignoff(true);
    setShowReasons(false);
    onClose();
  };

  const handleSend = () => {
    if (selectedDepts.size === 0) {
      Alert.alert('Select Department', 'Pick at least one department to send to.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Add Reason', 'Explain why this needs to be escalated.');
      return;
    }

    const targets = Array.from(selectedDepts).map(code => {
      const dept = ESCALATION_DEPARTMENTS.find(d => d.code === code);
      return { code, name: dept?.name || code };
    });

    escalate.mutate({
      postId,
      postNumber,
      organizationId,
      targetDepartments: targets,
      reason: reason.trim(),
      fromDepartmentCode,
      fromTaskId,
      priority: priority as any,
      requiresSignoff: requireSignoff,
      signoffDepartmentCode: fromDepartmentCode,
    });
  };

  const fromDeptName = DEPARTMENT_CODES[fromDepartmentCode]?.name || fromDepartmentCode;
  const fromDeptColor = DEPARTMENT_CODES[fromDepartmentCode]?.color || '#8B5CF6';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <ArrowRight size={18} color="#8B5CF6" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Send to Department</Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* From badge */}
            <View style={styles.fromRow}>
              <Text style={[styles.fromLabel, { color: colors.textSecondary }]}>From:</Text>
              <View style={[styles.fromBadge, { backgroundColor: fromDeptColor + '20', borderColor: fromDeptColor }]}>
                <Text style={[styles.fromBadgeText, { color: fromDeptColor }]}>{fromDeptName}</Text>
              </View>
            </View>

            {/* Department picker */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Send to:</Text>
            <View style={styles.deptGrid}>
              {availableDepts.map(dept => {
                const isSelected = selectedDepts.has(dept.code);
                const deptColor = DEPARTMENT_CODES[dept.code]?.color || '#6B7280';
                return (
                  <TouchableOpacity
                    key={dept.code}
                    style={[
                      styles.deptChip,
                      {
                        backgroundColor: isSelected ? deptColor + '25' : colors.background,
                        borderColor: isSelected ? deptColor : colors.border,
                      },
                    ]}
                    onPress={() => toggleDept(dept.code)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: deptColor }]}>
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.deptChipText,
                        { color: isSelected ? deptColor : colors.textSecondary },
                      ]}
                    >
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {availableDepts.length === 0 && (
              <Text style={[styles.noDepts, { color: colors.textTertiary }]}>
                All departments are already assigned to this task.
              </Text>
            )}

            {/* Priority */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Priority:</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map(opt => {
                const isActive = priority === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.priorityChip,
                      {
                        backgroundColor: isActive ? opt.color + '25' : colors.background,
                        borderColor: isActive ? opt.color : colors.border,
                      },
                    ]}
                    onPress={() => setPriority(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: opt.color }]} />
                    <Text style={[styles.priorityText, { color: isActive ? opt.color : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reason */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Reason:</Text>
            <TouchableOpacity
              style={[styles.reasonSuggest, { borderColor: colors.border }]}
              onPress={() => setShowReasons(!showReasons)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reasonSuggestText, { color: colors.primary }]}>
                {showReasons ? 'Hide suggestions' : 'Common reasons'}
              </Text>
            </TouchableOpacity>

            {showReasons && (
              <View style={styles.reasonChips}>
                {COMMON_REASONS.map((r, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reasonChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => {
                      setReason(r);
                      setShowReasons(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.reasonChipText, { color: colors.text }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.reasonInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="Describe why this is being escalated..."
              placeholderTextColor={colors.textTertiary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Require sign-off toggle */}
            <TouchableOpacity
              style={[styles.signoffToggle, { backgroundColor: requireSignoff ? '#10B98115' : colors.background, borderColor: requireSignoff ? '#10B981' : colors.border }]}
              onPress={() => setRequireSignoff(!requireSignoff)}
              activeOpacity={0.7}
            >
              <View style={[styles.toggleCheck, { backgroundColor: requireSignoff ? '#10B981' : colors.border }]}>
                {requireSignoff && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
              <View style={styles.toggleContent}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Require sign-off</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                  {fromDeptName} must approve before their tag goes green
                </Text>
              </View>
              <ShieldCheck size={18} color={requireSignoff ? '#10B981' : colors.textTertiary} />
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={resetAndClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: selectedDepts.size > 0 && reason.trim() ? '#8B5CF6' : colors.border,
                },
              ]}
              onPress={handleSend}
              disabled={escalate.isPending || selectedDepts.size === 0}
              activeOpacity={0.7}
            >
              {escalate.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ArrowRight size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>
                    Send{selectedDepts.size > 0 ? ` to ${selectedDepts.size}` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  fromLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fromBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  fromBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noDepts: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonSuggest: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonSuggestText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  signoffToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  toggleCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContent: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
