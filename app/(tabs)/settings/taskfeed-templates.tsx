import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useTaskFeedTemplatesQuery,
  useCreateTaskFeedTemplate,
  useUpdateTaskFeedTemplate,
  useDeleteTaskFeedTemplate,
} from '@/hooks/useTaskFeedTemplates';
import { TaskFeedTemplate, ButtonType, BUTTON_TYPE_LABELS, BUTTON_TYPE_COLORS } from '@/types/taskFeedTemplates';
import { INITIAL_TASK_FEED_TEMPLATES } from '@/constants/taskFeedTemplates';
import { ALL_PREBUILT_TEMPLATES } from '@/constants/prebuiltTemplates';
import { getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';

// ── Icon-free helpers ─────────────────────────────────────────
const BUTTON_TYPE_EMOJI: Record<ButtonType, string> = {
  add_task: '📋',
  report_issue: '⚠️',
  request_purchase: '🛒',
};

export default function TaskFeedTemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [seedingTemplates, setSeedingTemplates] = useState(false);

  const { data: templates, isLoading, refetch } = useTaskFeedTemplatesQuery({ activeOnly: false });

  const createTemplateMutation = useCreateTaskFeedTemplate({
    onSuccess: () => { refetch(); },
    onError: (error) => {
      console.error('[TaskFeedTemplates] Error creating template:', error);
      Alert.alert('Error', 'Failed to create template. Please try again.');
    },
  });

  const updateTemplateMutation = useUpdateTaskFeedTemplate({
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); refetch(); },
    onError: () => { Alert.alert('Error', 'Failed to update template.'); },
  });

  const deleteTemplateMutation = useDeleteTaskFeedTemplate({
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); refetch(); },
    onError: () => { Alert.alert('Error', 'Failed to delete template.'); },
  });

  const handleRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const handleSeedInitialTemplates = useCallback(async () => {
    Alert.alert('Seed Initial Templates', 'Create 3 default templates?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create', onPress: async () => {
        setSeedingTemplates(true);
        try { for (const t of INITIAL_TASK_FEED_TEMPLATES) { await createTemplateMutation.mutateAsync(t); } Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Success', '3 templates created!'); }
        catch { Alert.alert('Error', 'Failed to create some templates.'); }
        finally { setSeedingTemplates(false); }
      }},
    ]);
  }, [createTemplateMutation]);

  const handleSeedPrebuiltTemplates = useCallback(async () => {
    Alert.alert('Seed Pre-Built Templates', 'Create 10 food safety templates?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create All 10', onPress: async () => {
        setSeedingTemplates(true);
        let created = 0;
        try { for (const t of ALL_PREBUILT_TEMPLATES) { await createTemplateMutation.mutateAsync(t); created++; } Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Success', `${created} templates created!`); }
        catch { Alert.alert('Partial Success', `Created ${created} of 10 templates.`); }
        finally { setSeedingTemplates(false); }
      }},
    ]);
  }, [createTemplateMutation]);

  const handleToggleActive = useCallback((template: TaskFeedTemplate) => {
    updateTemplateMutation.mutate({ id: template.id, isActive: !template.isActive });
  }, [updateTemplateMutation]);

  const handleDeleteTemplate = useCallback((template: TaskFeedTemplate) => {
    Alert.alert('Deactivate Template', `Deactivate "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => { deleteTemplateMutation.mutate(template.id); }},
    ]);
  }, [deleteTemplateMutation]);

  const activeTemplates = templates?.filter(t => t.isActive) || [];
  const inactiveTemplates = templates?.filter(t => !t.isActive) || [];
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Task Feed Templates' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>

        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Task Templates</Text>
            <TouchableOpacity style={[styles.infoButton, { backgroundColor: colors.primary + '20' }]} onPress={() => setShowInfoModal(true)}>
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Configure which task actions are available to employees when they click "Add Task", "Report Issue", or "Request Purchase" in the Task Feed.
          </Text>
        </View>

        {templates?.length === 0 && !isLoading && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 32, marginBottom: 16 }}>✨</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Templates Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Templates define the actions employees can take in the Task Feed.
            </Text>
            <TouchableOpacity style={[styles.seedButton, { backgroundColor: colors.primary }]} onPress={handleSeedInitialTemplates} disabled={seedingTemplates}>
              <Text style={styles.seedButtonText}>{seedingTemplates ? 'Creating...' : '+ Create 3 Basic Templates'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.seedButton, { backgroundColor: '#F59E0B', marginTop: 10 }]} onPress={handleSeedPrebuiltTemplates} disabled={seedingTemplates}>
              <Text style={styles.seedButtonText}>{seedingTemplates ? 'Creating...' : '✨ Create 10 Food Safety Templates'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTemplates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Templates</Text>
              <View style={[styles.countBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.countText, { color: '#10B981' }]}>{activeTemplates.length}</Text>
              </View>
            </View>
            {activeTemplates.map(template => {
              const buttonColor = BUTTON_TYPE_COLORS[template.buttonType];
              return (
                <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.templateHeader}>
                    <View style={[styles.templateIconContainer, { backgroundColor: buttonColor + '15' }]}>
                      <Text style={{ fontSize: 18 }}>{BUTTON_TYPE_EMOJI[template.buttonType]}</Text>
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                      <View style={styles.templateMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: buttonColor + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: buttonColor }]}>{BUTTON_TYPE_LABELS[template.buttonType]}</Text>
                        </View>
                        {template.photoRequired && (
                          <View style={[styles.metaBadge, { backgroundColor: '#F59E0B20' }]}>
                            <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>📷 Photo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Switch value={template.isActive} onValueChange={() => handleToggleActive(template)}
                      trackColor={{ false: colors.border, true: '#10B98180' }} thumbColor={template.isActive ? '#10B981' : colors.textTertiary} />
                  </View>

                  {template.description ? <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>{template.description}</Text> : null}

                  <View style={styles.templateDetails}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Trigger:</Text>
                      <View style={[styles.deptBadge, { backgroundColor: (getDepartmentColor(template.triggeringDepartment) || '#6B7280') + '20' }]}>
                        <Text style={[styles.deptBadgeText, { color: getDepartmentColor(template.triggeringDepartment) || '#6B7280' }]}>
                          {template.triggeringDepartment === 'any' ? 'Any Department' : getDepartmentName(template.triggeringDepartment)}
                        </Text>
                      </View>
                    </View>
                    {template.assignedDepartments.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Assigns to:</Text>
                        <View style={styles.deptList}>
                          {template.assignedDepartments.slice(0, 3).map(dept => (
                            <View key={dept} style={[styles.miniDeptBadge, { backgroundColor: (getDepartmentColor(dept) || '#6B7280') + '20' }]}>
                              <Text style={[styles.miniDeptText, { color: getDepartmentColor(dept) || '#6B7280' }]}>
                                {getDepartmentName(dept).split(' ')[0]}
                              </Text>
                            </View>
                          ))}
                          {template.assignedDepartments.length > 3 && (
                            <Text style={[styles.moreText, { color: colors.textTertiary }]}>+{template.assignedDepartments.length - 3}</Text>
                          )}
                        </View>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Fields:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{template.formFields.length} field(s)</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Usage:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{template.usageCount} time(s)</Text>
                    </View>
                  </View>

                  <View style={[styles.templateActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background }]}
                      onPress={() => router.push(`/settings/template-builder?id=${template.id}`)}>
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#EF444410' }]}
                      onPress={() => handleDeleteTemplate(template)}>
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>🗑 Deactivate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {inactiveTemplates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Inactive Templates</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.textTertiary + '20' }]}>
                <Text style={[styles.countText, { color: colors.textTertiary }]}>{inactiveTemplates.length}</Text>
              </View>
            </View>
            {inactiveTemplates.map(template => (
              <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.surface, opacity: 0.7 }]}>
                <View style={styles.templateHeader}>
                  <View style={[styles.templateIconContainer, { backgroundColor: colors.textTertiary + '15' }]}>
                    <Text style={{ fontSize: 18 }}>{BUTTON_TYPE_EMOJI[template.buttonType]}</Text>
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={[styles.templateName, { color: colors.textTertiary }]}>{template.name}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: colors.textTertiary + '20' }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.textTertiary }]}>{BUTTON_TYPE_LABELS[template.buttonType]}</Text>
                    </View>
                  </View>
                  <Switch value={template.isActive} onValueChange={() => handleToggleActive(template)}
                    trackColor={{ false: colors.border, true: '#10B98180' }} thumbColor={template.isActive ? '#10B981' : colors.textTertiary} />
                </View>
              </View>
            ))}
          </View>
        )}

        {templates && templates.length > 0 && (
          <View style={styles.bottomActions}>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/settings/template-builder')}>
              <Text style={styles.addButtonText}>+ Create New Template</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.seedLinkButton, { borderColor: '#F59E0B' }]}
              onPress={handleSeedPrebuiltTemplates} disabled={seedingTemplates}>
              <Text style={[styles.seedLinkText, { color: '#F59E0B' }]}>{seedingTemplates ? 'Creating...' : '✨ Add 10 Food Safety Templates'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showInfoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>How Templates Work</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Text style={{ fontSize: 20, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {[
                { n: '1', t: 'Employee Action', d: 'Employee clicks "Add Task", "Report Issue", or "Request Purchase" in the Task Feed' },
                { n: '2', t: 'Department Selection', d: 'Employee selects their department (or destination department for issues)' },
                { n: '3', t: 'Template Selection', d: 'Only templates matching that button type + department are shown' },
                { n: '4', t: 'Form & Photo', d: 'Employee fills in the template\'s custom fields and attaches required photo' },
                { n: '✓', t: 'Task Created', d: 'Tasks are auto-assigned to configured departments. Each sees a badge until they complete their part.' },
              ].map((item, i) => (
                <View key={i} style={styles.infoItem}>
                  <View style={[styles.infoNumber, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.infoNumberText, { color: colors.primary }]}>{item.n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoItemTitle, { color: colors.text }]}>{item.t}</Text>
                    <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>{item.d}</Text>
                  </View>
                </View>
              ))}
              <View style={[styles.tipBox, { backgroundColor: '#3B82F610' }]}>
                <Text style={{ fontSize: 14, color: '#3B82F6', flex: 1, lineHeight: 18 }}>
                  ℹ️ Templates with "Any Department" as trigger will show for all departments when employees select that action type.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  headerSection: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700' as const },
  infoButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerSubtitle: { fontSize: 14, lineHeight: 20 },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20, marginBottom: 20 },
  seedButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  seedButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#fff' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '600' as const },
  templateCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  templateIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
  templateMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' as const },
  metaBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  templateDescription: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  templateDetails: { marginTop: 14, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, width: 70 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  deptBadgeText: { fontSize: 11, fontWeight: '500' as const },
  deptList: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  miniDeptBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniDeptText: { fontSize: 10, fontWeight: '500' as const },
  moreText: { fontSize: 11 },
  templateActions: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  actionButtonText: { fontSize: 13, fontWeight: '600' as const },
  bottomActions: { marginTop: 8, gap: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  addButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
  seedLinkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  seedLinkText: { fontSize: 15, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalBody: { padding: 20 },
  infoItem: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  infoNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoNumberText: { fontSize: 14, fontWeight: '600' as const },
  infoItemTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4 },
  infoItemDesc: { fontSize: 13, lineHeight: 18 },
  tipBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, marginTop: 8 },
});
