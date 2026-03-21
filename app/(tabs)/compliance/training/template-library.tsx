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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useTrainingTemplates,
  useDeleteTrainingTemplate,
  useUpdateTrainingTemplate,
  TrainingTemplate,
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

const TRAINING_TYPES = [
  { value: 'ojt', label: 'OJT', color: HUD_ACCENT },
  { value: 'classroom', label: 'Classroom', color: HUD_GREEN },
  { value: 'online', label: 'Online', color: HUD_PURPLE },
  { value: 'external', label: 'External', color: HUD_ORANGE },
  { value: 'rippling', label: 'Rippling', color: HUD_YELLOW },
];

const STATUS_FILTERS = ['all', 'active', 'draft', 'archived'];

export default function TemplateLibraryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<TrainingTemplate | null>(null);
  const [actionSheet, setActionSheet] = useState<TrainingTemplate | null>(null);

  const { data: templates = [], isLoading, refetch } = useTrainingTemplates(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const deleteTemplate = useDeleteTrainingTemplate();
  const updateTemplate = useUpdateTrainingTemplate();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = templates.filter(t => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.template_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || t.training_type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeConfig = (type: string) => {
    return TRAINING_TYPES.find(t => t.value === type) || { label: type, color: HUD_TEXT_DIM };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return HUD_GREEN;
      case 'draft': return HUD_YELLOW;
      case 'archived': return HUD_TEXT_DIM;
      default: return HUD_TEXT_DIM;
    }
  };

  const handleArchive = async (template: TrainingTemplate) => {
    setActionSheet(null);
    await updateTemplate.mutateAsync({
      templateId: template.id,
      updates: { status: template.status === 'archived' ? 'draft' : 'archived' },
    });
  };

  const handleActivate = async (template: TrainingTemplate) => {
    setActionSheet(null);
    await updateTemplate.mutateAsync({
      templateId: template.id,
      updates: { status: 'active' },
    });
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    await deleteTemplate.mutateAsync(deleteModal.id);
    setDeleteModal(null);
  };

  const templatesByType = TRAINING_TYPES.reduce((acc, type) => {
    acc[type.value] = templates.filter(t => t.training_type === type.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>TEMPLATE LIBRARY</Text>
          <Text style={styles.headerSub}>{templates.length} training program{templates.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(tabs)/compliance/training/template-builder' as any)}
        >
          <Ionicons name="add" size={18} color={HUD_BG} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Type Summary Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeStrip}
          contentContainerStyle={styles.typeStripContent}
        >
          {TRAINING_TYPES.map(type => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                typeFilter === type.value && { backgroundColor: type.color + '22', borderColor: type.color },
              ]}
              onPress={() => setTypeFilter(typeFilter === type.value ? 'all' : type.value)}
            >
              <Text style={[
                styles.typeChipLabel,
                typeFilter === type.value && { color: type.color },
              ]}>
                {type.label}
              </Text>
              <View style={[styles.typeChipCount, { backgroundColor: type.color + '22' }]}>
                <Text style={[styles.typeChipCountText, { color: type.color }]}>
                  {templatesByType[type.value] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={HUD_TEXT_DIM} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search templates..."
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
              style={[
                styles.filterChip,
                statusFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[
                styles.filterChipText,
                statusFilter === f && styles.filterChipTextActive,
              ]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Templates List */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={HUD_ACCENT} />
            <Text style={styles.loadingText}>Loading templates...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={48} color={HUD_TEXT_DIM} />
            <Text style={styles.emptyTitle}>
              {search ? 'No Results Found' : 'No Templates Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term.'
                : 'Create your first training template to get started.'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/compliance/training/template-builder' as any)}
              >
                <Text style={styles.emptyBtnText}>Create Template</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </Text>
            {filtered.map(template => {
              const typeConfig = getTypeConfig(template.training_type);
              return (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() =>
                    router.push(`/(tabs)/compliance/training/template-builder?id=${template.id}` as any)
                  }
                  activeOpacity={0.8}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[
                        styles.typeBadge,
                        { backgroundColor: typeConfig.color + '22', borderColor: typeConfig.color + '44' }
                      ]}>
                        <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                          {typeConfig.label}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(template.status) + '22' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(template.status) }
                        ]}>
                          {template.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => setActionSheet(template)}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={HUD_TEXT_DIM} />
                    </TouchableOpacity>
                  </View>

                  {/* Card Body */}
                  <Text style={styles.templateNumber}>{template.template_number}</Text>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  {template.description ? (
                    <Text style={styles.templateDesc} numberOfLines={2}>
                      {template.description}
                    </Text>
                  ) : null}

                  {/* Features Row */}
                  <View style={styles.featuresRow}>
                    {template.has_ojt_steps && (
                      <View style={styles.featureChip}>
                        <Ionicons name="footsteps-outline" size={11} color={HUD_ACCENT} />
                        <Text style={styles.featureText}>{template.ojt_step_count} Steps</Text>
                      </View>
                    )}
                    {template.has_knowledge_test && (
                      <View style={styles.featureChip}>
                        <Ionicons name="help-circle-outline" size={11} color={HUD_PURPLE} />
                        <Text style={[styles.featureText, { color: HUD_PURPLE }]}>Knowledge Test</Text>
                      </View>
                    )}
                    {template.has_hands_on_evaluation && (
                      <View style={styles.featureChip}>
                        <Ionicons name="hand-left-outline" size={11} color={HUD_GREEN} />
                        <Text style={[styles.featureText, { color: HUD_GREEN }]}>Hands-On Eval</Text>
                      </View>
                    )}
                    {template.issues_certification && (
                      <View style={styles.featureChip}>
                        <Ionicons name="ribbon-outline" size={11} color={HUD_YELLOW} />
                        <Text style={[styles.featureText, { color: HUD_YELLOW }]}>Issues Cert</Text>
                      </View>
                    )}
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                      {template.department_names.length > 0 ? (
                        <Text style={styles.footerText}>
                          {template.applies_to_all_departments
                            ? 'All Departments'
                            : template.department_names.slice(0, 2).join(', ') +
                              (template.department_names.length > 2
                                ? ` +${template.department_names.length - 2}`
                                : '')}
                        </Text>
                      ) : (
                        <Text style={styles.footerText}>No departments assigned</Text>
                      )}
                    </View>
                    <View style={styles.footerRight}>
                      {template.retraining_required && (
                        <Text style={styles.footerText}>
                          Retrain: {template.retraining_interval_days}d
                        </Text>
                      )}
                      <Text style={styles.footerVersion}>v{template.version}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Action Sheet Modal */}
      <Modal
        visible={!!actionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setActionSheet(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionSheet(null)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionSheet?.title}
            </Text>
            <Text style={styles.actionSheetSub}>{actionSheet?.template_number}</Text>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setActionSheet(null);
                router.push(
                  `/(tabs)/compliance/training/template-builder?id=${actionSheet?.id}` as any
                );
              }}
            >
              <Ionicons name="create-outline" size={20} color={HUD_ACCENT} />
              <Text style={styles.actionItemText}>Edit Template</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setActionSheet(null);
                router.push(
                  `/(tabs)/compliance/training/session-tracker?templateId=${actionSheet?.id}` as any
                );
              }}
            >
              <Ionicons name="person-add-outline" size={20} color={HUD_GREEN} />
              <Text style={[styles.actionItemText, { color: HUD_GREEN }]}>Assign Training</Text>
            </TouchableOpacity>

            {actionSheet?.status === 'draft' && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => actionSheet && handleActivate(actionSheet)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={HUD_GREEN} />
                <Text style={[styles.actionItemText, { color: HUD_GREEN }]}>Activate Template</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => actionSheet && handleArchive(actionSheet)}
            >
              <Ionicons name="archive-outline" size={20} color={HUD_YELLOW} />
              <Text style={[styles.actionItemText, { color: HUD_YELLOW }]}>
                {actionSheet?.status === 'archived' ? 'Unarchive' : 'Archive'} Template
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setDeleteModal(actionSheet);
                setActionSheet(null);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={HUD_RED} />
              <Text style={[styles.actionItemText, { color: HUD_RED }]}>Delete Template</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => setActionSheet(null)}
            >
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={!!deleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="warning" size={32} color={HUD_RED} />
            </View>
            <Text style={styles.confirmTitle}>Delete Template?</Text>
            <Text style={styles.confirmMessage}>
              <Text style={{ color: HUD_TEXT_BRIGHT }}>{deleteModal?.title}</Text>
              {'\n\n'}
              This will permanently delete the template and all its steps, questions, and
              checklist items. Active training sessions using this template will not be affected.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setDeleteModal(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={handleDelete}
              >
                {deleteTemplate.isPending ? (
                  <ActivityIndicator size="small" color={HUD_TEXT_BRIGHT} />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    letterSpacing: 1,
  },
  headerSub: { fontSize: 11, color: HUD_TEXT_DIM, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  typeStrip: { marginBottom: 12 },
  typeStripContent: { gap: 8, paddingRight: 16 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_CARD,
  },
  typeChipLabel: { fontSize: 12, fontWeight: '600', color: HUD_TEXT_DIM },
  typeChipCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  typeChipCountText: { fontSize: 10, fontWeight: '700' },
  searchRow: { marginBottom: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HUD_CARD,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: HUD_TEXT,
    fontSize: 14,
  },
  filterStrip: { marginBottom: 12 },
  filterStripContent: { gap: 8, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    backgroundColor: HUD_CARD,
  },
  filterChipActive: {
    borderColor: HUD_ACCENT,
    backgroundColor: HUD_ACCENT + '15',
  },
  filterChipText: { fontSize: 11, fontWeight: '600', color: HUD_TEXT_DIM, letterSpacing: 0.5 },
  filterChipTextActive: { color: HUD_ACCENT },
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
  resultsCount: { fontSize: 11, color: HUD_TEXT_DIM, marginBottom: 10, letterSpacing: 0.5 },
  templateCard: {
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
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  moreBtn: { padding: 4 },
  templateNumber: { fontSize: 11, color: HUD_TEXT_DIM, marginBottom: 3, letterSpacing: 0.5 },
  templateTitle: { fontSize: 15, fontWeight: '700', color: HUD_TEXT_BRIGHT, marginBottom: 4 },
  templateDesc: { fontSize: 12, color: HUD_TEXT_DIM, lineHeight: 17, marginBottom: 8 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HUD_ACCENT + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featureText: { fontSize: 10, color: HUD_ACCENT, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: HUD_BORDER,
  },
  footerLeft: { flex: 1 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerText: { fontSize: 11, color: HUD_TEXT_DIM },
  footerVersion: {
    fontSize: 10,
    color: HUD_TEXT_DIM,
    backgroundColor: HUD_BORDER,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: HUD_CARD,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: HUD_BORDER,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: HUD_BORDER,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginBottom: 2,
  },
  actionSheetSub: { fontSize: 12, color: HUD_TEXT_DIM, marginBottom: 16 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: HUD_BORDER,
  },
  actionItemText: { fontSize: 15, color: HUD_TEXT, fontWeight: '500' },
  actionDivider: { height: 1, backgroundColor: HUD_BORDER, marginVertical: 4 },
  actionCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  actionCancelText: { fontSize: 15, color: HUD_TEXT_DIM, fontWeight: '600' },
  confirmModal: {
    margin: 24,
    backgroundColor: HUD_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HUD_RED + '44',
    padding: 24,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HUD_RED + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HUD_TEXT_BRIGHT,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 13,
    color: HUD_TEXT_DIM,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: HUD_BORDER,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, color: HUD_TEXT, fontWeight: '600' },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: HUD_RED,
    alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 14, color: HUD_TEXT_BRIGHT, fontWeight: '700' },
});
