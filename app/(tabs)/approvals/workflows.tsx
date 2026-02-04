import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  GitBranch,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Shield,
  DollarSign,
  Calendar,
  FileText,
  Edit3,
  Copy,
  Trash2,
  Eye,
  X,
  ArrowRight,
  UserCheck,
  Bell,
  Play,
  Pause,
  Hash,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useWorkflowTemplatesQuery,
  useWorkflowStats,
  useDelegationRulesQuery,
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useCreateDelegationRule,
  useUpdateDelegationRule,
  useDeleteDelegationRule,
  useWorkflowStepsQuery,
  type WorkflowCategory,
} from '@/hooks/useSupabaseWorkflows';
import {
  workflowCategoryLabels,
  workflowCategoryColors,
} from '@/types/approvalWorkflows';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';

type ViewMode = 'templates' | 'delegations';
type FilterCategory = 'all' | WorkflowCategory;

interface WorkflowFormData {
  name: string;
  description: string;
  category: WorkflowCategory;
  isActive: boolean;
  isDefault: boolean;
  tags: string[];
}

interface DelegationFormData {
  fromUserName: string;
  fromUserId: string;
  toUserName: string;
  toUserId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
}

export default function WorkflowsScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingDelegationId, setEditingDelegationId] = useState<string | null>(null);

  const [workflowForm, setWorkflowForm] = useState<WorkflowFormData>({
    name: '',
    description: '',
    category: 'purchase',
    isActive: true,
    isDefault: false,
    tags: [],
  });

  const [delegationForm, setDelegationForm] = useState<DelegationFormData>({
    fromUserName: user ? `${user.first_name} ${user.last_name}` : '',
    fromUserId: user?.id || '',
    toUserName: '',
    toUserId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
    isActive: true,
  });

  const { data: templates = [], refetch: refetchTemplates, isLoading: templatesLoading } = useWorkflowTemplatesQuery();
  const { data: stats } = useWorkflowStats();
  const { data: delegations = [], refetch: refetchDelegations } = useDelegationRulesQuery();
  const { data: selectedSteps = [] } = useWorkflowStepsQuery(selectedTemplateId);

  const createTemplateMutation = useCreateWorkflowTemplate();
  const updateTemplateMutation = useUpdateWorkflowTemplate();
  const deleteTemplateMutation = useDeleteWorkflowTemplate();
  const createDelegationMutation = useCreateDelegationRule();
  const updateDelegationMutation = useUpdateDelegationRule();
  const deleteDelegationMutation = useDeleteDelegationRule();

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId),
  [templates, selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (filterCategory !== 'all') {
      result = result.filter((t: any) => t.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t: any) =>
        t.name?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    return result;
  }, [templates, filterCategory, searchQuery]);

  const activeDelegations = useMemo(() =>
    delegations.filter((d: any) => d.is_active),
  [delegations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTemplates(), refetchDelegations()]);
    setRefreshing(false);
  }, [refetchTemplates, refetchDelegations]);

  const handleViewTemplate = useCallback((template: any) => {
    Haptics.selectionAsync();
    setSelectedTemplateId(template.id);
    setShowDetailModal(true);
  }, []);

  const handleEditTemplate = useCallback((template: any) => {
    Haptics.selectionAsync();
    setEditingTemplateId(template.id);
    setWorkflowForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || 'purchase',
      isActive: template.is_active ?? true,
      isDefault: template.is_default ?? false,
      tags: template.tags || [],
    });
    setShowBuilderModal(true);
  }, []);

  const handleDuplicateTemplate = useCallback((template: any) => {
    Alert.alert(
      'Duplicate Workflow',
      `Create a copy of "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
              await createTemplateMutation.mutateAsync({
                name: `${template.name} (Copy)`,
                description: template.description,
                category: template.category,
                is_active: false,
                is_default: false,
                version: 1,
                conditions: template.conditions || [],
                created_by: userName,
                updated_by: userName,
                usage_count: 0,
                tags: template.tags || [],
              });
              Alert.alert('Success', 'Workflow duplicated successfully');
            } catch (error) {
              console.error('[Duplicate Template Error]', error);
              Alert.alert('Error', 'Failed to duplicate workflow');
            }
          },
        },
      ]
    );
  }, [createTemplateMutation, user]);

  const handleToggleActive = useCallback((template: any) => {
    const newStatus = !template.is_active;
    Alert.alert(
      newStatus ? 'Activate Workflow' : 'Deactivate Workflow',
      newStatus
        ? `Activating "${template.name}" will make it available for approvals.`
        : `Deactivating "${template.name}" will prevent it from being used for new approvals.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Deactivate',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
              await updateTemplateMutation.mutateAsync({
                id: template.id,
                is_active: newStatus,
                updated_by: userName,
              });
            } catch (error) {
              console.error('[Toggle Active Error]', error);
              Alert.alert('Error', 'Failed to update workflow status');
            }
          },
        },
      ]
    );
  }, [updateTemplateMutation, user]);

  const handleDeleteTemplate = useCallback((template: any) => {
    if (template.is_default) {
      Alert.alert('Cannot Delete', 'Default workflows cannot be deleted. Set another workflow as default first.');
      return;
    }
    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await deleteTemplateMutation.mutateAsync(template.id);
              Alert.alert('Success', 'Workflow deleted successfully');
            } catch (error) {
              console.error('[Delete Template Error]', error);
              Alert.alert('Error', 'Failed to delete workflow');
            }
          },
        },
      ]
    );
  }, [deleteTemplateMutation]);

  const handleCreateNew = useCallback(() => {
    Haptics.selectionAsync();
    setEditingTemplateId(null);
    setWorkflowForm({
      name: '',
      description: '',
      category: 'purchase',
      isActive: true,
      isDefault: false,
      tags: [],
    });
    setShowBuilderModal(true);
  }, []);

  const handleSaveWorkflow = useCallback(async () => {
    if (!workflowForm.name.trim()) {
      Alert.alert('Validation Error', 'Workflow name is required');
      return;
    }

    try {
      const userName = user ? `${user.first_name} ${user.last_name}` : 'System';
      if (editingTemplateId) {
        await updateTemplateMutation.mutateAsync({
          id: editingTemplateId,
          name: workflowForm.name,
          description: workflowForm.description,
          category: workflowForm.category,
          is_active: workflowForm.isActive,
          is_default: workflowForm.isDefault,
          tags: workflowForm.tags,
          updated_by: userName,
        });
        Alert.alert('Success', 'Workflow updated successfully');
      } else {
        await createTemplateMutation.mutateAsync({
          name: workflowForm.name,
          description: workflowForm.description,
          category: workflowForm.category,
          is_active: workflowForm.isActive,
          is_default: workflowForm.isDefault,
          version: 1,
          conditions: [],
          created_by: userName,
          updated_by: userName,
          usage_count: 0,
          tags: workflowForm.tags,
        });
        Alert.alert('Success', 'Workflow created successfully');
      }
      setShowBuilderModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Save Workflow Error]', error);
      Alert.alert('Error', 'Failed to save workflow');
    }
  }, [workflowForm, editingTemplateId, createTemplateMutation, updateTemplateMutation, user]);

  const handleCreateDelegation = useCallback(() => {
    Haptics.selectionAsync();
    setEditingDelegationId(null);
    const userName = user ? `${user.first_name} ${user.last_name}` : '';
    setDelegationForm({
      fromUserName: userName,
      fromUserId: user?.id || '',
      toUserName: '',
      toUserId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: '',
      isActive: true,
    });
    setShowDelegationModal(true);
  }, [user]);

  const handleSaveDelegation = useCallback(async () => {
    if (!delegationForm.toUserName.trim()) {
      Alert.alert('Validation Error', 'Delegate name is required');
      return;
    }

    try {
      if (editingDelegationId) {
        await updateDelegationMutation.mutateAsync({
          id: editingDelegationId,
          from_user_name: delegationForm.fromUserName,
          from_user_id: delegationForm.fromUserId,
          to_user_name: delegationForm.toUserName,
          to_user_id: delegationForm.toUserId || `user-${Date.now()}`,
          start_date: delegationForm.startDate,
          end_date: delegationForm.endDate,
          reason: delegationForm.reason,
          is_active: delegationForm.isActive,
        });
        Alert.alert('Success', 'Delegation updated successfully');
      } else {
        await createDelegationMutation.mutateAsync({
          from_user_name: delegationForm.fromUserName,
          from_user_id: delegationForm.fromUserId || user?.id || `user-${Date.now()}`,
          to_user_name: delegationForm.toUserName,
          to_user_id: delegationForm.toUserId || `user-${Date.now()}`,
          start_date: delegationForm.startDate,
          end_date: delegationForm.endDate,
          reason: delegationForm.reason,
          is_active: delegationForm.isActive,
          workflow_ids: [],
        });
        Alert.alert('Success', 'Delegation created successfully');
      }
      setShowDelegationModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Save Delegation Error]', error);
      Alert.alert('Error', 'Failed to save delegation');
    }
  }, [delegationForm, editingDelegationId, createDelegationMutation, updateDelegationMutation, user]);

  const handleToggleDelegation = useCallback(async (delegation: any) => {
    try {
      await updateDelegationMutation.mutateAsync({
        id: delegation.id,
        is_active: !delegation.is_active,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Toggle Delegation Error]', error);
      Alert.alert('Error', 'Failed to update delegation');
    }
  }, [updateDelegationMutation]);

  const handleDeleteDelegation = useCallback((delegation: any) => {
    Alert.alert(
      'Delete Delegation',
      `Remove this delegation from ${delegation.from_user_name} to ${delegation.to_user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDelegationMutation.mutateAsync(delegation.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (error) {
              console.error('[Delete Delegation Error]', error);
              Alert.alert('Error', 'Failed to delete delegation');
            }
          },
        },
      ]
    );
  }, [deleteDelegationMutation]);

  const getCategoryIcon = (category: WorkflowCategory) => {
    switch (category) {
      case 'purchase': return DollarSign;
      case 'time_off': return Calendar;
      case 'permit': return Shield;
      case 'expense': return FileText;
      case 'contract': return FileText;
      default: return GitBranch;
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'approval': return CheckCircle2;
      case 'review': return Eye;
      case 'notification': return Bell;
      case 'condition': return GitBranch;
      case 'parallel': return Users;
      default: return CheckCircle2;
    }
  };

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.totalWorkflows || templates.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workflows</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats?.activeWorkflows || templates.filter((t: any) => t.is_active).length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats?.pendingInstances || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.approvalRate?.toFixed(0) || 0}%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approval Rate</Text>
        </View>
      </View>
    </View>
  );

  const renderTemplateCard = (template: any) => {
    const CategoryIcon = getCategoryIcon(template.category);
    const categoryColor = workflowCategoryColors[template.category as WorkflowCategory] || colors.textSecondary;

    return (
      <Pressable
        key={template.id}
        style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleViewTemplate(template)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}15` }]}>
            <CategoryIcon size={20} color={categoryColor} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {template.name}
              </Text>
              {template.is_default && (
                <View style={[styles.defaultBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>Default</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardCategory, { color: categoryColor }]}>
              {workflowCategoryLabels[template.category as WorkflowCategory] || template.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: template.is_active ? '#10B98115' : '#EF444415' }]}>
            {template.is_active ? (
              <Play size={12} color="#10B981" />
            ) : (
              <Pause size={12} color="#EF4444" />
            )}
          </View>
        </View>

        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {template.description || 'No description'}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Hash size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>v{template.version || 1}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{template.usage_count || 0} uses</Text>
          </View>
          {template.tags && template.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {template.tags.slice(0, 2).map((tag: string) => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <Pressable
            style={styles.cardAction}
            onPress={(e) => { e.stopPropagation(); handleEditTemplate(template); }}
          >
            <Edit3 size={16} color={colors.primary} />
            <Text style={[styles.cardActionText, { color: colors.primary }]}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.cardAction}
            onPress={(e) => { e.stopPropagation(); handleDuplicateTemplate(template); }}
          >
            <Copy size={16} color={colors.textSecondary} />
            <Text style={[styles.cardActionText, { color: colors.textSecondary }]}>Duplicate</Text>
          </Pressable>
          <Pressable
            style={styles.cardAction}
            onPress={(e) => { e.stopPropagation(); handleToggleActive(template); }}
          >
            {template.is_active ? (
              <>
                <Pause size={16} color="#F59E0B" />
                <Text style={[styles.cardActionText, { color: '#F59E0B' }]}>Pause</Text>
              </>
            ) : (
              <>
                <Play size={16} color="#10B981" />
                <Text style={[styles.cardActionText, { color: '#10B981' }]}>Activate</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={styles.cardAction}
            onPress={(e) => { e.stopPropagation(); handleDeleteTemplate(template); }}
          >
            <Trash2 size={16} color={colors.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderDelegationCard = (delegation: any) => (
    <View key={delegation.id} style={[styles.delegationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.delegationHeader}>
        <View style={[styles.delegationIcon, { backgroundColor: `${colors.primary}15` }]}>
          <UserCheck size={20} color={colors.primary} />
        </View>
        <View style={styles.delegationUserInfo}>
          <Text style={[styles.delegationFrom, { color: colors.text }]}>{delegation.from_user_name}</Text>
          <View style={styles.delegationArrow}>
            <ArrowRight size={14} color={colors.textTertiary} />
          </View>
          <Text style={[styles.delegationTo, { color: colors.primary }]}>{delegation.to_user_name}</Text>
        </View>
        <Pressable
          style={[styles.delegationToggle, { backgroundColor: delegation.is_active ? '#10B98115' : colors.backgroundSecondary }]}
          onPress={() => handleToggleDelegation(delegation)}
        >
          <View style={[
            styles.delegationToggleKnob,
            {
              backgroundColor: delegation.is_active ? '#10B981' : colors.textTertiary,
              transform: [{ translateX: delegation.is_active ? 16 : 0 }],
            }
          ]} />
        </Pressable>
      </View>

      <View style={styles.delegationDates}>
        <View style={[styles.dateBadge, { backgroundColor: colors.backgroundSecondary }]}>
          <Calendar size={12} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {delegation.start_date} → {delegation.end_date}
          </Text>
        </View>
      </View>

      {delegation.reason && (
        <Text style={[styles.delegationReason, { color: colors.textSecondary }]} numberOfLines={1}>
          {delegation.reason}
        </Text>
      )}

      <Pressable
        style={[styles.deleteDelegationButton, { borderColor: colors.error }]}
        onPress={() => handleDeleteDelegation(delegation)}
      >
        <Trash2 size={14} color={colors.error} />
        <Text style={[styles.deleteDelegationText, { color: colors.error }]}>Remove</Text>
      </Pressable>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedTemplate) return null;
    const CategoryIcon = getCategoryIcon(selectedTemplate.category);
    const categoryColor = workflowCategoryColors[selectedTemplate.category];

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.modalCategoryIcon, { backgroundColor: `${categoryColor}15` }]}>
                <CategoryIcon size={24} color={categoryColor} />
              </View>
              <View style={styles.modalTitleInfo}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedTemplate.name}</Text>
                <Text style={[styles.modalSubtitle, { color: categoryColor }]}>
                  {workflowCategoryLabels[selectedTemplate.category]} • v{selectedTemplate.version || 1}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {selectedTemplate.description || 'No description provided'}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Workflow Steps</Text>
            <View style={styles.stepsContainer}>
              {selectedSteps.length > 0 ? (
                selectedSteps.map((step: any, index: number) => {
                  const StepIcon = getStepTypeIcon(step.step_type);
                  return (
                    <View key={step.id} style={styles.stepItem}>
                      <View style={styles.stepIndicator}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        {index < selectedSteps.length - 1 && (
                          <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
                        )}
                      </View>
                      <View style={[styles.stepContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.stepHeader}>
                          <View style={[styles.stepTypeIcon, { backgroundColor: colors.backgroundSecondary }]}>
                            <StepIcon size={16} color={colors.textSecondary} />
                          </View>
                          <View style={styles.stepHeaderInfo}>
                            <Text style={[styles.stepName, { color: colors.text }]}>{step.name}</Text>
                            <Text style={[styles.stepType, { color: colors.textTertiary }]}>
                              {step.step_type?.charAt(0).toUpperCase() + step.step_type?.slice(1)}
                            </Text>
                          </View>
                        </View>
                        {step.description && (
                          <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                            {step.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.emptySteps, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <GitBranch size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyStepsText, { color: colors.textSecondary }]}>
                    No steps configured yet. Edit workflow to add steps.
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Created by</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{selectedTemplate.created_by || 'System'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {selectedTemplate.created_at ? new Date(selectedTemplate.created_at).toLocaleDateString() : '-'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Last updated</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {selectedTemplate.updated_at ? new Date(selectedTemplate.updated_at).toLocaleDateString() : '-'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Total uses</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{selectedTemplate.usage_count || 0}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalAction, { backgroundColor: colors.primary }]}
                onPress={() => { setShowDetailModal(false); handleEditTemplate(selectedTemplate); }}
              >
                <Edit3 size={18} color="#FFF" />
                <Text style={styles.modalActionText}>Edit Workflow</Text>
              </Pressable>
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderBuilderModal = () => (
    <Modal
      visible={showBuilderModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBuilderModal(false)}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingTemplateId ? 'Edit Workflow' : 'Create Workflow'}
          </Text>
          <Pressable onPress={() => setShowBuilderModal(false)} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Workflow Name *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter workflow name"
            placeholderTextColor={colors.textTertiary}
            value={workflowForm.name}
            onChangeText={(text) => setWorkflowForm(prev => ({ ...prev, name: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter workflow description"
            placeholderTextColor={colors.textTertiary}
            value={workflowForm.description}
            onChangeText={(text) => setWorkflowForm(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Category</Text>
          <View style={styles.categoryOptions}>
            {(['purchase', 'time_off', 'permit', 'expense', 'contract', 'custom'] as WorkflowCategory[]).map((cat) => {
              const CatIcon = getCategoryIcon(cat);
              const catColor = workflowCategoryColors[cat] || colors.textSecondary;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryOption,
                    { 
                      backgroundColor: workflowForm.category === cat ? `${catColor}15` : colors.surface,
                      borderColor: workflowForm.category === cat ? catColor : colors.border,
                    },
                  ]}
                  onPress={() => setWorkflowForm(prev => ({ ...prev, category: cat }))}
                >
                  <CatIcon size={16} color={catColor} />
                  <Text style={[styles.categoryOptionText, { color: workflowForm.category === cat ? catColor : colors.text }]}>
                    {workflowCategoryLabels[cat] || cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.togglesSection}>
            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setWorkflowForm(prev => ({ ...prev, isActive: !prev.isActive }))}
            >
              <View style={styles.toggleInfo}>
                <Play size={18} color={workflowForm.isActive ? '#10B981' : colors.textSecondary} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Active</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: workflowForm.isActive ? '#10B981' : colors.border }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: workflowForm.isActive ? 20 : 0 }] }]} />
              </View>
            </Pressable>

            <Pressable
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setWorkflowForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
            >
              <View style={styles.toggleInfo}>
                <CheckCircle2 size={18} color={workflowForm.isDefault ? colors.primary : colors.textSecondary} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Set as Default</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: workflowForm.isDefault ? colors.primary : colors.border }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: workflowForm.isDefault ? 20 : 0 }] }]} />
              </View>
            </Pressable>
          </View>

          <View style={[styles.builderPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <GitBranch size={40} color={colors.textTertiary} />
            <Text style={[styles.placeholderTitle, { color: colors.text }]}>Step Builder</Text>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Step configuration will be available in Phase 4B. For now, save the workflow template first.
            </Text>
          </View>

          <View style={styles.formActions}>
            <Pressable
              style={[styles.formActionButton, { borderColor: colors.border }]}
              onPress={() => setShowBuilderModal(false)}
            >
              <Text style={[styles.formActionText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.formActionButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveWorkflow}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              <Text style={[styles.formActionText, { color: '#FFF' }]}>
                {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 'Saving...' : 'Save Workflow'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalBottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDelegationModal = () => (
    <Modal
      visible={showDelegationModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDelegationModal(false)}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingDelegationId ? 'Edit Delegation' : 'Create Delegation'}
          </Text>
          <Pressable onPress={() => setShowDelegationModal(false)} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.delegationInfo, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
            <UserCheck size={20} color={colors.primary} />
            <Text style={[styles.delegationInfoText, { color: colors.textSecondary }]}>
              Delegations allow you to temporarily assign your approval authority to another user.
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Delegate From</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            value={delegationForm.fromUserName}
            onChangeText={(text) => setDelegationForm(prev => ({ ...prev, fromUserName: text }))}
          />

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Delegate To *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Enter delegate's name"
            placeholderTextColor={colors.textTertiary}
            value={delegationForm.toUserName}
            onChangeText={(text) => setDelegationForm(prev => ({ ...prev, toUserName: text }))}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={delegationForm.startDate}
                onChangeText={(text) => setDelegationForm(prev => ({ ...prev, startDate: text }))}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>End Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={delegationForm.endDate}
                onChangeText={(text) => setDelegationForm(prev => ({ ...prev, endDate: text }))}
              />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Reason</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Out of office, vacation, training..."
            placeholderTextColor={colors.textTertiary}
            value={delegationForm.reason}
            onChangeText={(text) => setDelegationForm(prev => ({ ...prev, reason: text }))}
            multiline
            numberOfLines={2}
          />

          <Pressable
            style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}
            onPress={() => setDelegationForm(prev => ({ ...prev, isActive: !prev.isActive }))}
          >
            <View style={styles.toggleInfo}>
              <CheckCircle2 size={18} color={delegationForm.isActive ? '#10B981' : colors.textSecondary} />
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Active Immediately</Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: delegationForm.isActive ? '#10B981' : colors.border }]}>
              <View style={[styles.toggleKnob, { transform: [{ translateX: delegationForm.isActive ? 20 : 0 }] }]} />
            </View>
          </Pressable>

          <View style={styles.formActions}>
            <Pressable
              style={[styles.formActionButton, { borderColor: colors.border }]}
              onPress={() => setShowDelegationModal(false)}
            >
              <Text style={[styles.formActionText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.formActionButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveDelegation}
              disabled={createDelegationMutation.isPending || updateDelegationMutation.isPending}
            >
              <Text style={[styles.formActionText, { color: '#FFF' }]}>
                {createDelegationMutation.isPending || updateDelegationMutation.isPending ? 'Saving...' : 'Save Delegation'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalBottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCard()}

        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'templates' ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); setViewMode('templates'); }}
          >
            <GitBranch size={16} color={viewMode === 'templates' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.viewToggleText, { color: viewMode === 'templates' ? '#FFF' : colors.textSecondary }]}>
              Templates
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'delegations' ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); setViewMode('delegations'); }}
          >
            <UserCheck size={16} color={viewMode === 'delegations' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.viewToggleText, { color: viewMode === 'delegations' ? '#FFF' : colors.textSecondary }]}>
              Delegations
            </Text>
            {activeDelegations.length > 0 && (
              <View style={[styles.badge, { backgroundColor: viewMode === 'delegations' ? '#FFF' : colors.warning }]}>
                <Text style={[styles.badgeText, { color: viewMode === 'delegations' ? colors.primary : '#FFF' }]}>
                  {activeDelegations.length}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {viewMode === 'templates' && (
          <>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search workflows..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={styles.filterContainer}
            >
              {(['all', 'purchase', 'time_off', 'permit', 'expense', 'contract'] as FilterCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.filterChip,
                    { backgroundColor: filterCategory === cat ? colors.primary : colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setFilterCategory(cat); }}
                >
                  <Text style={[styles.filterText, { color: filterCategory === cat ? '#FFF' : colors.textSecondary }]}>
                    {cat === 'all' ? 'All' : workflowCategoryLabels[cat] || cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.templatesSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
                  Workflow Templates ({filteredTemplates.length})
                </Text>
                <Pressable
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateNew}
                >
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.createButtonText}>New</Text>
                </Pressable>
              </View>

              {templatesLoading ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Clock size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading workflows...</Text>
                </View>
              ) : filteredTemplates.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <GitBranch size={40} color={colors.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No workflows found</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery ? 'Try a different search term' : 'Create a new workflow to get started'}
                  </Text>
                </View>
              ) : (
                filteredTemplates.map((template: any) => renderTemplateCard(template))
              )}
            </View>
          </>
        )}

        {viewMode === 'delegations' && (
          <View style={styles.delegationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
                Approval Delegations
              </Text>
              <Pressable
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateDelegation}
              >
                <Plus size={18} color="#FFF" />
                <Text style={styles.createButtonText}>Add</Text>
              </Pressable>
            </View>

            <View style={[styles.delegationInfo, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
              <UserCheck size={20} color={colors.primary} />
              <Text style={[styles.delegationInfoText, { color: colors.textSecondary }]}>
                Delegations allow approvers to temporarily assign their approval authority to another user.
              </Text>
            </View>

            {delegations.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <UserCheck size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No delegations</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Create a delegation when you need someone to approve on your behalf
                </Text>
              </View>
            ) : (
              delegations.map((delegation: any) => renderDelegationCard(delegation))
            )}
          </View>
        )}
      </ScrollView>

      {renderDetailModal()}
      {renderBuilderModal()}
      {renderDelegationModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  templatesSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  cardCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  delegationsSection: {
    gap: 12,
  },
  delegationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  delegationInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  delegationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  delegationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  delegationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delegationUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  delegationFrom: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  delegationArrow: {
    opacity: 0.5,
  },
  delegationTo: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  delegationToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  delegationToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  delegationDates: {
    flexDirection: 'row',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 12,
  },
  delegationReason: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  deleteDelegationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteDelegationText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepsContainer: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 28,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  stepLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepHeaderInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  stepType: {
    fontSize: 11,
    marginTop: 1,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptySteps: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    gap: 8,
  },
  emptyStepsText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  metaCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  modalActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  togglesSection: {
    gap: 10,
    marginTop: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  builderPlaceholder: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  formActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  formActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  dateField: {
    flex: 1,
  },
});
