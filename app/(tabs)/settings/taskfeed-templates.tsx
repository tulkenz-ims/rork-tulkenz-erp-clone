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
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
  X,
  Trash2,
  Edit3,
  Camera,
  Sparkles,
  Info,
} from 'lucide-react-native';
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
import { getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';

export default function TaskFeedTemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [seedingTemplates, setSeedingTemplates] = useState(false);

  const { data: templates, isLoading, refetch } = useTaskFeedTemplatesQuery({ activeOnly: false });

  const createTemplateMutation = useCreateTaskFeedTemplate({
    onSuccess: () => {
      console.log('[TaskFeedTemplates] Template created');
      refetch();
    },
    onError: (error) => {
      console.error('[TaskFeedTemplates] Error creating template:', error);
      Alert.alert('Error', 'Failed to create template. Please try again.');
    },
  });

  const updateTemplateMutation = useUpdateTaskFeedTemplate({
    onSuccess: () => {
      console.log('[TaskFeedTemplates] Template updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    },
    onError: (error) => {
      console.error('[TaskFeedTemplates] Error updating template:', error);
      Alert.alert('Error', 'Failed to update template.');
    },
  });

  const deleteTemplateMutation = useDeleteTaskFeedTemplate({
    onSuccess: () => {
      console.log('[TaskFeedTemplates] Template deleted');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    },
    onError: (error) => {
      console.error('[TaskFeedTemplates] Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template.');
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSeedInitialTemplates = useCallback(async () => {
    Alert.alert(
      'Seed Initial Templates',
      'This will create the 3 default templates:\n\n• Pre-OP (Add Task)\n• TOA Lab Check (Add Task)\n• Equipment Failure (Report Issue)\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Templates',
          onPress: async () => {
            setSeedingTemplates(true);
            try {
              for (const template of INITIAL_TASK_FEED_TEMPLATES) {
                console.log('[TaskFeedTemplates] Creating template:', template.name);
                await createTemplateMutation.mutateAsync(template);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', '3 initial templates have been created successfully!');
            } catch (error) {
              console.error('[TaskFeedTemplates] Error seeding templates:', error);
              Alert.alert('Error', 'Failed to create some templates. Please try again.');
            } finally {
              setSeedingTemplates(false);
            }
          },
        },
      ]
    );
  }, [createTemplateMutation]);

  const handleToggleActive = useCallback((template: TaskFeedTemplate) => {
    const newStatus = !template.isActive;
    updateTemplateMutation.mutate({
      id: template.id,
      isActive: newStatus,
    });
  }, [updateTemplateMutation]);

  const handleDeleteTemplate = useCallback((template: TaskFeedTemplate) => {
    Alert.alert(
      'Deactivate Template',
      `Are you sure you want to deactivate "${template.name}"? It will no longer appear for employees.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deleteTemplateMutation.mutate(template.id);
          },
        },
      ]
    );
  }, [deleteTemplateMutation]);

  const getButtonTypeIcon = (buttonType: ButtonType) => {
    switch (buttonType) {
      case 'add_task':
        return ClipboardList;
      case 'report_issue':
        return AlertTriangle;
      case 'request_purchase':
        return ShoppingCart;
      default:
        return ClipboardList;
    }
  };

  const activeTemplates = templates?.filter(t => t.isActive) || [];
  const inactiveTemplates = templates?.filter(t => !t.isActive) || [];

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Task Feed Templates' }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Task Templates</Text>
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => setShowInfoModal(true)}
            >
              <Info size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Configure which task actions are available to employees when they click &quot;Add Task&quot;, &quot;Report Issue&quot;, or &quot;Request Purchase&quot; in the Task Feed.
          </Text>
        </View>

        {templates?.length === 0 && !isLoading && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Sparkles size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Templates Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Templates define the actions employees can take in the Task Feed. Create initial templates to get started.
            </Text>
            <TouchableOpacity
              style={[styles.seedButton, { backgroundColor: colors.primary }]}
              onPress={handleSeedInitialTemplates}
              disabled={seedingTemplates}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.seedButtonText}>
                {seedingTemplates ? 'Creating...' : 'Create Initial Templates'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTemplates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Templates</Text>
              <View style={[styles.countBadge, { backgroundColor: '#10B981' + '20' }]}>
                <Text style={[styles.countText, { color: '#10B981' }]}>{activeTemplates.length}</Text>
              </View>
            </View>
            {activeTemplates.map(template => {
              const ButtonIcon = getButtonTypeIcon(template.buttonType);
              const buttonColor = BUTTON_TYPE_COLORS[template.buttonType];
              return (
                <View key={template.id} style={[styles.templateCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.templateHeader}>
                    <View style={[styles.templateIconContainer, { backgroundColor: buttonColor + '15' }]}>
                      <ButtonIcon size={20} color={buttonColor} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                      <View style={styles.templateMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: buttonColor + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: buttonColor }]}>
                            {BUTTON_TYPE_LABELS[template.buttonType]}
                          </Text>
                        </View>
                        {template.photoRequired && (
                          <View style={[styles.metaBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                            <Camera size={10} color="#F59E0B" />
                            <Text style={[styles.metaBadgeText, { color: '#F59E0B' }]}>Photo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Switch
                      value={template.isActive}
                      onValueChange={() => handleToggleActive(template)}
                      trackColor={{ false: colors.border, true: '#10B981' + '80' }}
                      thumbColor={template.isActive ? '#10B981' : colors.textTertiary}
                    />
                  </View>

                  {template.description && (
                    <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {template.description}
                    </Text>
                  )}

                  <View style={styles.templateDetails}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Trigger:</Text>
                      <View style={[styles.deptBadge, { backgroundColor: getDepartmentColor(template.triggeringDepartment) + '20' }]}>
                        <Text style={[styles.deptBadgeText, { color: getDepartmentColor(template.triggeringDepartment) }]}>
                          {template.triggeringDepartment === 'any' ? 'Any Department' : getDepartmentName(template.triggeringDepartment)}
                        </Text>
                      </View>
                    </View>
                    {template.assignedDepartments.length > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Assigns to:</Text>
                        <View style={styles.deptList}>
                          {template.assignedDepartments.slice(0, 3).map(dept => (
                            <View key={dept} style={[styles.miniDeptBadge, { backgroundColor: getDepartmentColor(dept) + '20' }]}>
                              <Text style={[styles.miniDeptText, { color: getDepartmentColor(dept) }]}>
                                {getDepartmentName(dept).split(' ')[0]}
                              </Text>
                            </View>
                          ))}
                          {template.assignedDepartments.length > 3 && (
                            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                              +{template.assignedDepartments.length - 3}
                            </Text>
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

                  <View style={styles.templateActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.background }]}
                      onPress={() => router.push(`/settings/template-builder?id=${template.id}`)}
                    >
                      <Edit3 size={16} color={colors.primary} />
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EF4444' + '10' }]}
                      onPress={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Deactivate</Text>
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
            {inactiveTemplates.map(template => {
              const ButtonIcon = getButtonTypeIcon(template.buttonType);
              return (
                <View key={template.id} style={[styles.templateCard, styles.inactiveCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.templateHeader}>
                    <View style={[styles.templateIconContainer, { backgroundColor: colors.textTertiary + '15' }]}>
                      <ButtonIcon size={20} color={colors.textTertiary} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateName, { color: colors.textTertiary }]}>{template.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: colors.textTertiary + '20' }]}>
                        <Text style={[styles.typeBadgeText, { color: colors.textTertiary }]}>
                          {BUTTON_TYPE_LABELS[template.buttonType]}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={template.isActive}
                      onValueChange={() => handleToggleActive(template)}
                      trackColor={{ false: colors.border, true: '#10B981' + '80' }}
                      thumbColor={template.isActive ? '#10B981' : colors.textTertiary}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {templates && templates.length > 0 && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/settings/template-builder')}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create New Template</Text>
            </TouchableOpacity>

            {templates.length === 0 && (
              <TouchableOpacity
                style={[styles.seedLinkButton, { borderColor: colors.primary }]}
                onPress={handleSeedInitialTemplates}
                disabled={seedingTemplates}
              >
                <Sparkles size={18} color={colors.primary} />
                <Text style={[styles.seedLinkText, { color: colors.primary }]}>
                  Seed Default Templates
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showInfoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>How Templates Work</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.infoNumberText, { color: colors.primary }]}>1</Text>
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoItemTitle, { color: colors.text }]}>Employee Action</Text>
                  <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>
                    Employee clicks &quot;Add Task&quot;, &quot;Report Issue&quot;, or &quot;Request Purchase&quot; in the Task Feed
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.infoNumberText, { color: colors.primary }]}>2</Text>
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoItemTitle, { color: colors.text }]}>Department Selection</Text>
                  <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>
                    Employee selects their department (or destination department for issues)
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.infoNumberText, { color: colors.primary }]}>3</Text>
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoItemTitle, { color: colors.text }]}>Template Selection</Text>
                  <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>
                    Only templates matching that button type + department are shown
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.infoNumberText, { color: colors.primary }]}>4</Text>
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoItemTitle, { color: colors.text }]}>Form & Photo</Text>
                  <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>
                    Employee fills in the template&apos;s custom fields and attaches required photo
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: '#10B981' + '20' }]}>
                  <CheckCircle2 size={16} color="#10B981" />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoItemTitle, { color: colors.text }]}>Task Created</Text>
                  <Text style={[styles.infoItemDesc, { color: colors.textSecondary }]}>
                    Tasks are auto-assigned to configured departments. Each sees a badge until they complete their part.
                  </Text>
                </View>
              </View>

              <View style={[styles.tipBox, { backgroundColor: '#3B82F6' + '10' }]}>
                <Info size={16} color="#3B82F6" />
                <Text style={[styles.tipText, { color: '#3B82F6' }]}>
                  Templates with &quot;Any Department&quot; as trigger will show for all departments when employees select that action type.
                </Text>
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
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    headerSection: {
      marginBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    infoButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      lineHeight: 20,
    },
    emptyCard: {
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    emptyIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center' as const,
      lineHeight: 20,
      marginBottom: 20,
    },
    seedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    seedButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#fff',
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    templateCard: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
    },
    inactiveCard: {
      opacity: 0.7,
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    templateIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    templateMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 4,
    },
    metaBadgeText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    templateDescription: {
      fontSize: 13,
      lineHeight: 18,
      marginTop: 12,
    },
    templateDetails: {
      marginTop: 14,
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailLabel: {
      fontSize: 12,
      width: 70,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    deptBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    deptBadgeText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    deptList: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    miniDeptBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    miniDeptText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    moreText: {
      fontSize: 11,
    },
    templateActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    bottomActions: {
      marginTop: 8,
      gap: 12,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#fff',
    },
    seedLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    seedLinkText: {
      fontSize: 15,
      fontWeight: '500' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      borderRadius: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalBody: {
      padding: 20,
    },
    infoItem: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 20,
    },
    infoNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoNumberText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    infoText: {
      flex: 1,
    },
    infoItemTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    infoItemDesc: {
      fontSize: 13,
      lineHeight: 18,
    },
    tipBox: {
      flexDirection: 'row',
      gap: 10,
      padding: 14,
      borderRadius: 12,
      marginTop: 8,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
  });
