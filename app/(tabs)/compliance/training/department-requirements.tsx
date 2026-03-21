import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useDepartmentRequiredTraining,
  useTrainingTemplates,
  useSetDepartmentRequiredTraining,
  useRemoveDepartmentRequiredTraining,
  DepartmentRequiredTraining,
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

const DEPARTMENTS = [
  { code: '1001', name: 'Maintenance', color: HUD_ORANGE },
  { code: '1002', name: 'Sanitation', color: HUD_GREEN },
  { code: '1003', name: 'Production', color: HUD_ACCENT },
  { code: '1004', name: 'Quality', color: HUD_PURPLE },
  { code: '1005', name: 'Safety', color: HUD_RED },
];

export default function DepartmentRequirementsScreen() {
  const router = useRouter();
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0].code);
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isNewHire, setIsNewHire] = useState(true);
  const [dueDays, setDueDays] = useState('30');
  const [saving, setSaving] = useState(false);

  const {
    data: requirements = [],
    isLoading,
    refetch,
  } = useDepartmentRequiredTraining(selectedDept);

  const { data: templates = [] } = useTrainingTemplates({ status: 'active' });
  const setRequired = useSetDepartmentRequiredTraining();
  const removeRequired = useRemoveDepartmentRequiredTraining();

  const currentDept = DEPARTMENTS.find(d => d.code === selectedDept)!;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter out templates already required for this dept
  const availableTemplates = templates.filter(
    t => !requirements.some(r => r.template_id === t.id)
  );

  const handleAdd = async () => {
    if (!selectedTemplateId) {
      Alert.alert('Required', 'Please select a training template.');
      return;
    }

    setSaving(true);
    try {
      const deptName = DEPARTMENTS.find(d => d.code === selectedDept)?.name || '';
      await setRequired.mutateAsync({
        department_code: selectedDept,
        department_name: deptName,
        template_id: selectedTemplateId,
        is_required_for_new_hire: isNewHire,
        due_within_days: parseInt(dueDays) || 30,
        notes: null,
      });
      setAddModal(false);
      setSelectedTemplateId('');
      setIsNewHire(true);
      setDueDays('30');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add requirement.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (req: DepartmentRequiredTraining) => {
    const templateTitle = (req as any).training_templates?.title || 'this training';
    Alert.alert(
      'Remove Requirement',
      `Remove "${templateTitle}" from ${currentDept.name} required training?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRequired.mutateAsync(req.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove requirement.');
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ojt': return HUD_ACCENT;
      case 'classroom': return HUD_GREEN;
      case 'online': return HUD_PURPLE;
      case 'external': return HUD_ORANGE;
      case 'rippling': return HUD_YELLOW;
      default: return HUD_TEXT_DIM;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DEPARTMENT REQUIREMENTS</Text>
          <Text style={styles.headerSub}>Required training by department</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModal(true)}
        >
          <Ionicons name="add" size={18} color={HUD_BG} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Department Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.deptStrip}
        contentContainerStyle={styles.deptStripContent}
      >
        {DEPARTMENTS.map(dept => (
          <TouchableOpacity
            key={dept.code}
            style={[
              styles.deptTab,
              selectedDept === dept.code && {
                backgroundColor: dept.color + '22',
                borderColor: dept.color,
              },
            ]}
            onPress={() => setSelectedDept(dept.code)}
          >
            <View style={[
              styles.deptDot,
              { backgroundColor: dept.color },
            ]} />
            <Text style={[
              styles.deptTabText,
              selectedDept === dept.code && { color: dept.color },
            ]}>
              {dept.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Dept Header */}
        <View style={[
          styles.deptHeader,
          { borderColor: currentDept.color + '44', backgroundColor: currentDept.color + '11' }
        ]}>
          <View style={[styles.deptHeaderIcon, { backgroundColor: currentDept.color + '22' }]}>
            <Ionicons name="business-outline" size={20} color={currentDept.color} />
          </View>
          <View style={styles.deptHeaderBody}>
            <Text style={[styles.deptHeaderTitle, { color: currentDept.color }]}>
              {currentDept.name}
            </Text>
            <Text style={styles.deptHeaderSub}>
              {requirements.length} required training program{requirements.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.deptAddBtn, { backgroundColor: currentDept.color }]}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={16} color={HUD_BG} />
          </TouchableOpacity>
        </View>

        {/* SQF Note */}
        <View style={styles.sqfNote}>
          <Ionicons name="information-circle-outline" size={14} color={HUD_ACCENT} />
          <Text style={styles.sqfNoteText}>
            Required training is automatically checked during SQF 2.9.1 compliance review.
            New hire assignments use the due date set here.
          </Text>
        </View>

        {/* Requirements List */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HUD_ACCENT} />
            <Text style={styles.loadingText}>Loading requirements...</Text>
          </View>
        ) : requirements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color={HUD_TEXT_DIM} />
            <Text style={styles.emptyTitle}>No Required Training</Text>
            <Text style={styles.emptySubtitle}>
              Add training programs that are required for all {currentDept.name} employees.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: currentDept.color }]}
              onPress={() => setAddModal(true)}
            >
              <Text style={styles.emptyBtnText}>Add Requirement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* New Hire Required */}
            {requirements.filter(r => r.is_required_for_new_hire).length > 0 && (
              <>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons name="person-add-outline" size={14} color={HUD_GREEN} />
                    <Text style={[styles.groupHeaderText, { color: HUD_GREEN }]}>
                      NEW HIRE REQUIRED
                    </Text>
                  </View>
                  <Text style={styles.groupHeaderCount}>
                    {requirements.filter(r => r.is_required_for_new_hire).length}
                  </Text>
                </View>
                {requirements
                  .filter(r => r.is_required_for_new_hire)
                  .map(req => (
                    <RequirementCard
                      key={req.id}
                      req={req}
                      onRemove={handleRemove}
                      onViewTemplate={() =>
                        router.push(
                          `/(tabs)/compliance/training/template-builder?id=${req.template_id}` as any
                        )
                      }
                      getTypeColor={getTypeColor}
                    />
                  ))}
              </>
            )}

            {/* Ongoing Required */}
            {requirements.filter(r => !r.is_required_for_new_hire).length > 0 && (
              <>
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons name="refresh-outline" size={14} color={HUD_ACCENT} />
                    <Text style={[styles.groupHeaderText, { color: HUD_ACCENT }]}>
                      ONGOING / PERIODIC
                    </Text>
                  </View>
                  <Text style={styles.groupHeaderCount}>
                    {requirements.filter(r => !r.is_required_for_new_hire).length}
                  </Text>
                </View>
                {requirements
                  .filter(r => !r.is_required_for_new_hire)
                  .map(req => (
                    <RequirementCard
                      key={req.id}
                      req={req}
                      onRemove={handleRemove}
                      onViewTemplate={() =>
                        router.push(
                          `/(tabs)/compliance/training/template-builder?id=${req.template_id}` as any
                        )
                      }
                      getTypeColor={getTypeColor}
                    />
                  ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── ADD REQUIREMENT MODAL ── */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Add Required Training
            </Text>
            <Text style={styles.modalSubtitle}>
              {currentDept.name} Department
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Template Picker */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Training Template <Text style={styles.required}>*</Text>
                </Text>
                {availableTemplates.length === 0 ? (
                  <View style={styles.noTemplatesWrap}>
                    <Ionicons name="checkmark-circle" size={20} color={HUD_GREEN} />
                    <Text style={styles.noTemplatesText}>
                      All active templates are already required for {currentDept.name}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.templatePickerList}>
                    {availableTemplates.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.templatePickerItem,
                          selectedTemplateId === t.id && styles.templatePickerItemActive,
                        ]}
                        onPress={() => setSelectedTemplateId(t.id)}
                      >
                        <View style={styles.templatePickerLeft}>
                          <View style={[
                            styles.templateTypeDot,
                            { backgroundColor: getTypeColor(t.training_type) }
                          ]} />
                          <View style={styles.templatePickerBody}>
                            <Text style={[
                              styles.templatePickerTitle,
                              selectedTemplateId === t.id && { color: HUD_ACCENT },
                            ]}>
                              {t.title}
                            </Text>
                            <Text style={styles.templatePickerMeta}>
                              {t.template_number} · {t.training_type.toUpperCase()}
                              {t.retraining_required
                                ? ` · Retrain every ${t.retraining_interval_days}d`
                                : ''}
                            </Text>
                          </View>
                        </View>
                        {selectedTemplateId === t.id && (
                          <Ionicons name="checkmark-circle" size={18} color={HUD_ACCENT} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* New Hire Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Text style={styles.toggleLabel}>Required for New Hires</Text>
                  <Text style={styles.toggleHint}>
                    Automatically assign when a new employee joins {currentDept.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, isNewHire && styles.toggleActive]}
                  onPress={() => setIsNewHire(!isNewHire)}
                >
                  <View style={[
                    styles.toggleThumb,
                    isNewHire && styles.toggleThumbActive,
                  ]} />
                </TouchableOpacity>
              </View>

              {/* Due Days */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Complete Within (days from hire/assignment)
                </Text>
                <View style={styles.dueDaysRow}>
                  {['7', '14', '30', '60', '90'].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dueDayChip,
                        dueDays === d && styles.dueDayChipActive,
                      ]}
                      onPress={() => setDueDays(d)}
                    >
                      <Text style={[
                        styles.dueDayChipText,
                        dueDays === d && styles.dueDayChipTextActive,
                      ]}>
                        {d}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldHint}>
                  New hire must complete this training within {dueDays} days.
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSave,
                    (!selectedTemplateId || availableTemplates.length === 0) &&
                      styles.modalSaveDisabled,
                  ]}
                  onPress={handleAdd}
                  disabled={saving || !selectedTemplateId || availableTemplates.length === 0}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={HUD_BG} />
                  ) : (
                    <Text style={styles.modalSaveText}>Add Requirement</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── REQUIREMENT CARD COMPONENT ──────────────────────────────────────

interface RequirementCardProps {
  req: DepartmentRequiredTraining;
  onRemove: (req: DepartmentRequiredTraining) => void;
  onViewTemplate: () => void;
  getTypeColor: (type: string) => string;
}

function RequirementCard({
  req,
  onRemove,
  onViewTemplate,
  getTypeColor,
}: RequirementCardProps) {
  const template = (req as any).training_templates;
  const typeColor = getTypeColor(template?.training_type || '');

  return (
    <View style={styles.reqCard}>
      {/* Left accent */}
      <View style={[styles.reqAccent, { backgroundColor: typeColor }]} />

      <View style={styles.reqBody}>
        {/* Header */}
        <View style={styles.reqHeader}>
          <View style={[
            styles.reqTypeBadge,
            { backgroundColor: typeColor + '22', borderColor: typeColor + '44' }
          ]}>
            <Text style={[styles.reqTypeBadgeText, { color: typeColor }]}>
              {template?.training_type?.toUpperCase() || 'N/A'}
            </Text>
          </View>
          {req.is_required_for_new_hire && (
            <View style={styles.newHireBadge}>
              <Ionicons name="person-add-outline" size={10} color={HUD_GREEN} />
              <Text style={styles.newHireBadgeText}>NEW HIRE</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.reqTitle}>
          {template?.title || 'Unknown Template'}
        </Text>
        <Text style={styles.reqNumber}>
          {template?.template_number || req.template_id.slice(0, 8)}
        </Text>

        {/* Meta */}
        <View style={styles.reqMeta}>
          <View style={styles.reqMetaChip}>
            <Ionicons name="time-outline" size={10} color={HUD_TEXT_DIM} />
            <Text style={styles.reqMetaText}>
              Due within {req.due_within_days} days
            </Text>
          </View>
          {template?.retraining_required && (
            <View style={styles.reqMetaChip}>
              <Ionicons name="refresh-outline" size={10} color={HUD_TEXT_DIM} />
              <Text style={styles.reqMetaText}>
                Retrain every {template.retraining_interval_days}d
              </Text>
            </View>
          )}
          {template?.issues_certification && (
            <View style={styles.reqMetaChip}>
              <Ionicons name="ribbon-outline" size={10} color={HUD_YELLOW} />
              <Text style={[styles.reqMetaText, { color: HUD_YELLOW }]}>
                Issues cert
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.reqActions}>
          <TouchableOpacity
            style={styles.reqActionBtn}
            onPress={onViewTemplate}
          >
            <Ionicons name="eye-outline" size={14} color={HUD_ACCENT} />
            <Text style={styles.reqActionText}>View Template</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reqActionBtn, styles.reqRemoveBtn]}
            onPress={() => onRemove(req)}
          >
            <Ionicons name="trash-outline" size={14} color={HUD_RED} />
            <Text style={[styles.reqActionText, { color: HUD_RED }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  deptStrip: {
    backgroundColor: HUD_CARD,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
    maxHeight: 52,
  },
  deptStripContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  deptTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  deptDot: { width: 6, height: 6, borderRadius: 3 },
  deptTabText: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  deptHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptHeaderBody: { flex: 1 },
  deptHeaderTitle: { fontSize: 15, fontWeight: '700' },
  deptHeaderSub: { fontSize: 12, color: HUD_TEXT_DIM, marginTop: 2 },
  deptAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sqfNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: HUD_ACCENT + '11',
    borderWidth: 1,
    borderColor: HUD_ACCENT + '22',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  sqfNoteText: { flex: 1, fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 16 },
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeaderText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  groupHeaderCount: {
    fontSize: 11,
    color: HUD_TEXT_DIM,
    backgroundColor: HUD_BORDER,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reqCard: {
    flexDirection: 'row',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  reqAccent: { width: 4 },
  reqBody: { flex: 1, padding: 12 },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reqTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  reqTypeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  newHireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: HUD_GREEN + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newHireBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_GREEN, letterSpacing: 0.5 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginBottom: 2 },
  reqNumber: { fontSize: 11, color: HUD_TEXT_DIM, marginBottom: 8 },
  reqMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  reqMetaChip: {
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
  reqMetaText: { fontSize: 10, color: HUD_TEXT_DIM },
  reqActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: HUD_BORDER,
  },
  reqActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: HUD_ACCENT + '15',
    borderWidth: 1,
    borderColor: HUD_ACCENT + '33',
  },
  reqRemoveBtn: {
    backgroundColor: HUD_RED + '11',
    borderColor: HUD_RED + '33',
  },
  reqActionText: { fontSize: 11, color: HUD_ACCENT, fontWeight: '600' },
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
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: HUD_BORDER,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: HUD_TEXT_DIM, marginBottom: 16 },
  fieldWrap: { gap: 6, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  fieldHint: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 15 },
  required: { color: HUD_RED },
  noTemplatesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HUD_GREEN + '11',
    borderWidth: 1,
    borderColor: HUD_GREEN + '33',
    borderRadius: 8,
    padding: 12,
  },
  noTemplatesText: { flex: 1, fontSize: 12, color: HUD_TEXT_DIM, lineHeight: 17 },
  templatePickerList: {
    backgroundColor: HUD_BG,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    overflow: 'hidden',
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
  templatePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  templateTypeDot: { width: 8, height: 8, borderRadius: 4 },
  templatePickerBody: { flex: 1 },
  templatePickerTitle: { fontSize: 13, fontWeight: '600', color: HUD_TEXT },
  templatePickerMeta: { fontSize: 10, color: HUD_TEXT_DIM, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  toggleLabelWrap: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 13, color: HUD_TEXT, fontWeight: '500' },
  toggleHint: { fontSize: 11, color: HUD_TEXT_DIM, lineHeight: 15 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: HUD_BORDER,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: HUD_GREEN + '66' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: HUD_TEXT_DIM,
  },
  toggleThumbActive: {
    backgroundColor: HUD_GREEN,
    alignSelf: 'flex-end',
  },
  dueDaysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dueDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_BG,
  },
  dueDayChipActive: { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT },
  dueDayChipText: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM },
  dueDayChipTextActive: { color: HUD_ACCENT },
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
  modalSaveDisabled: { opacity: 0.4 },
  modalSaveText: { fontSize: 14, color: HUD_BG, fontWeight: '700' },
});
