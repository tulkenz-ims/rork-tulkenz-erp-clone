import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  RotateCcw,
  X,
  AlertTriangle,
  Clock,
  ChevronRight,
  Edit3,
  Trash2,
  MessageSquare,
  FileText,
  User,
  Calendar,
  DollarSign,
  ShoppingCart,
  Shield,
  Briefcase,
  ArrowLeft,
  XCircle,
  History,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useInstancesAwaitingRequestorAction,
  useResubmitRequest,
  useCancelRequest,
  useAppealRequest,
  type WorkflowCategory,
} from '@/hooks/useSupabaseWorkflows';
import { useUser } from '@/contexts/UserContext';
import * as Haptics from 'expo-haptics';

interface WorkflowInstance {
  id: string;
  template_id?: string;
  templateId?: string;
  template_name?: string;
  templateName?: string;
  category: WorkflowCategory;
  reference_id?: string;
  referenceId?: string;
  reference_type?: string;
  referenceType?: string;
  reference_title?: string;
  referenceTitle?: string;
  status: string;
  started_at?: string;
  startedAt?: string;
  started_by?: string;
  startedBy?: string;
  started_by_id?: string;
  startedById?: string;
  returned_at?: string;
  returnedAt?: string;
  returned_by?: string;
  returnedBy?: string;
  returned_from_tier?: number;
  returnedFromTier?: number;
  rejection_reason?: string;
  rejectionReason?: string;
  rejection_history?: unknown[];
  rejectionHistory?: unknown[];
  metadata?: Record<string, unknown>;
  resubmit_count?: number;
  resubmitCount?: number;
}

interface RejectionHistoryEntry {
  id: string;
  tierLevel: number;
  rejectedBy: string;
  rejectedAt: string;
  reason: string;
  returnedToTier?: number;
  returnedToRequestor: boolean;
}

interface RequestorActionPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function RequestorActionPanel({ collapsed = false, onToggleCollapse }: RequestorActionPanelProps) {
  const { colors } = useTheme();
  const { user } = useUser();
  const userId = user?.id || 'current-user';
  const userName = user ? `${user.first_name} ${user.last_name}` : 'Current User';

  const { data: awaitingItems, isLoading, refetch } = useInstancesAwaitingRequestorAction(userId);
  const resubmitMutation = useResubmitRequest();
  const cancelMutation = useCancelRequest();
  const appealMutation = useAppealRequest();

  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'resubmit' | 'cancel' | 'appeal' | null>(null);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const returnedItems = useMemo(() => {
    return (awaitingItems || []) as WorkflowInstance[];
  }, [awaitingItems]);

  const handleSelectItem = useCallback((instance: WorkflowInstance) => {
    Haptics.selectionAsync();
    setSelectedInstance(instance);
    setShowActionModal(true);
    setActionType(null);
    setEditedMetadata({});
    setComments('');
    setAppealReason('');
    setCancelReason('');
  }, []);

  const handleStartAction = useCallback((type: 'resubmit' | 'cancel' | 'appeal') => {
    Haptics.selectionAsync();
    setActionType(type);
    
    if (type === 'resubmit' && selectedInstance?.metadata) {
      const initialMetadata: Record<string, string> = {};
      Object.entries(selectedInstance.metadata).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          initialMetadata[key] = String(value);
        }
      });
      setEditedMetadata(initialMetadata);
    }
  }, [selectedInstance]);

  const handleResubmit = useCallback(async () => {
    if (!selectedInstance) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const changes: Record<string, unknown> = {};
      Object.entries(editedMetadata).forEach(([key, value]) => {
        const originalValue = selectedInstance.metadata?.[key];
        if (String(originalValue) !== value) {
          changes[key] = value;
        }
      });

      await resubmitMutation.mutateAsync({
        instanceId: selectedInstance.id,
        actionById: userId,
        actionByName: userName,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        comments: comments.trim() || undefined,
      });

      Alert.alert('Success', 'Your request has been resubmitted and sent for approval.');
      setShowActionModal(false);
      setSelectedInstance(null);
      refetch();
    } catch (error) {
      console.error('[RequestorActionPanel] Resubmit failed:', error);
      Alert.alert('Error', 'Failed to resubmit request. Please try again.');
    }
  }, [selectedInstance, editedMetadata, comments, userId, userName, resubmitMutation, refetch]);

  const handleCancel = useCallback(async () => {
    if (!selectedInstance) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to permanently cancel this request? This action cannot be undone.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              
              await cancelMutation.mutateAsync({
                instanceId: selectedInstance.id,
                actionById: userId,
                actionByName: userName,
                reason: cancelReason.trim() || undefined,
              });

              Alert.alert('Cancelled', 'Your request has been cancelled.');
              setShowActionModal(false);
              setSelectedInstance(null);
              refetch();
            } catch (error) {
              console.error('[RequestorActionPanel] Cancel failed:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedInstance, cancelReason, userId, userName, cancelMutation, refetch]);

  const handleAppeal = useCallback(async () => {
    if (!selectedInstance) return;
    if (!appealReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for your appeal.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      await appealMutation.mutateAsync({
        instanceId: selectedInstance.id,
        actionById: userId,
        actionByName: userName,
        appealReason: appealReason.trim(),
      });

      Alert.alert('Appeal Submitted', 'Your appeal has been submitted and sent for review.');
      setShowActionModal(false);
      setSelectedInstance(null);
      refetch();
    } catch (error) {
      console.error('[RequestorActionPanel] Appeal failed:', error);
      Alert.alert('Error', 'Failed to submit appeal. Please try again.');
    }
  }, [selectedInstance, appealReason, userId, userName, appealMutation, refetch]);

  const getCategoryIcon = (category: WorkflowCategory) => {
    switch (category) {
      case 'purchase': return ShoppingCart;
      case 'time_off': return Calendar;
      case 'permit': return Shield;
      case 'expense': return DollarSign;
      case 'contract': return FileText;
      default: return Briefcase;
    }
  };

  const getCategoryColor = (category: WorkflowCategory) => {
    switch (category) {
      case 'purchase': return '#F59E0B';
      case 'time_off': return '#8B5CF6';
      case 'permit': return '#EF4444';
      case 'expense': return '#10B981';
      case 'contract': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getRejectionHistory = (instance: WorkflowInstance): RejectionHistoryEntry[] => {
    const history = instance.rejection_history || instance.rejectionHistory || [];
    return history as RejectionHistoryEntry[];
  };

  if (returnedItems.length === 0) {
    return null;
  }

  const renderItemCard = (instance: WorkflowInstance) => {
    const CategoryIcon = getCategoryIcon(instance.category);
    const categoryColor = getCategoryColor(instance.category);
    const referenceTitle = instance.reference_title || instance.referenceTitle || 'Untitled';
    const referenceId = instance.reference_id || instance.referenceId || instance.id;
    const returnedAt = instance.returned_at || instance.returnedAt;
    const returnedBy = instance.returned_by || instance.returnedBy;
    const rejectionReason = instance.rejection_reason || instance.rejectionReason;
    const returnedFromTier = instance.returned_from_tier || instance.returnedFromTier;

    return (
      <Pressable
        key={instance.id}
        style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleSelectItem(instance)}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}15` }]}>
            <CategoryIcon size={18} color={categoryColor} />
          </View>
          <View style={styles.itemHeaderInfo}>
            <Text style={[styles.itemReferenceId, { color: colors.primary }]}>{referenceId}</Text>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {referenceTitle}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>

        <View style={[styles.rejectionBadge, { backgroundColor: '#EF444415' }]}>
          <XCircle size={14} color="#EF4444" />
          <Text style={[styles.rejectionBadgeText, { color: '#EF4444' }]}>
            Returned from Tier {returnedFromTier || '?'}
          </Text>
        </View>

        {rejectionReason && (
          <Text style={[styles.rejectionReasonPreview, { color: colors.textSecondary }]} numberOfLines={2}>
            &ldquo;{rejectionReason}&rdquo;
          </Text>
        )}

        <View style={styles.itemFooter}>
          <View style={styles.itemMeta}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={[styles.itemMetaText, { color: colors.textTertiary }]}>
              {formatDate(returnedAt)}
            </Text>
          </View>
          {returnedBy && (
            <View style={styles.itemMeta}>
              <User size={12} color={colors.textTertiary} />
              <Text style={[styles.itemMetaText, { color: colors.textTertiary }]}>
                {returnedBy}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderActionModal = () => {
    if (!selectedInstance) return null;

    const CategoryIcon = getCategoryIcon(selectedInstance.category);
    const categoryColor = getCategoryColor(selectedInstance.category);
    const referenceTitle = selectedInstance.reference_title || selectedInstance.referenceTitle || 'Untitled';
    const referenceId = selectedInstance.reference_id || selectedInstance.referenceId || selectedInstance.id;
    const rejectionReason = selectedInstance.rejection_reason || selectedInstance.rejectionReason;
    const returnedFromTier = selectedInstance.returned_from_tier || selectedInstance.returnedFromTier;
    const rejectionHistory = getRejectionHistory(selectedInstance);
    const resubmitCount = selectedInstance.resubmit_count || selectedInstance.resubmitCount || 0;

    const isProcessing = resubmitMutation.isPending || cancelMutation.isPending || appealMutation.isPending;

    return (
      <Modal
        visible={showActionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowActionModal(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            {actionType ? (
              <Pressable
                style={styles.backButton}
                onPress={() => setActionType(null)}
              >
                <ArrowLeft size={20} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <View style={{ width: 28 }} />
            )}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {actionType === 'resubmit' ? 'Edit & Resubmit' :
               actionType === 'cancel' ? 'Cancel Request' :
               actionType === 'appeal' ? 'Appeal Decision' :
               'Returned Request'}
            </Text>
            <Pressable onPress={() => setShowActionModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {!actionType && (
              <>
                <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.requestHeader}>
                    <View style={[styles.requestCategoryIcon, { backgroundColor: `${categoryColor}15` }]}>
                      <CategoryIcon size={24} color={categoryColor} />
                    </View>
                    <View style={styles.requestHeaderInfo}>
                      <Text style={[styles.requestReferenceId, { color: colors.primary }]}>{referenceId}</Text>
                      <Text style={[styles.requestTitle, { color: colors.text }]}>{referenceTitle}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBanner, { backgroundColor: '#EF444410', borderColor: '#EF4444' }]}>
                    <AlertTriangle size={18} color="#EF4444" />
                    <View style={styles.statusBannerContent}>
                      <Text style={[styles.statusBannerTitle, { color: '#EF4444' }]}>
                        Returned from Tier {returnedFromTier}
                      </Text>
                      <Text style={[styles.statusBannerSubtitle, { color: colors.textSecondary }]}>
                        Action required - Review and take action below
                      </Text>
                    </View>
                  </View>

                  {rejectionReason && (
                    <View style={[styles.rejectionReasonBox, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.rejectionReasonLabel, { color: colors.textSecondary }]}>
                        Rejection Reason
                      </Text>
                      <Text style={[styles.rejectionReasonText, { color: colors.text }]}>
                        &ldquo;{rejectionReason}&rdquo;
                      </Text>
                    </View>
                  )}

                  {resubmitCount > 0 && (
                    <View style={[styles.resubmitCountBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <RotateCcw size={12} color={colors.textSecondary} />
                      <Text style={[styles.resubmitCountText, { color: colors.textSecondary }]}>
                        Previously resubmitted {resubmitCount} time{resubmitCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {rejectionHistory.length > 0 && (
                  <View style={[styles.historySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.historySectionHeader}>
                      <History size={16} color={colors.textSecondary} />
                      <Text style={[styles.historySectionTitle, { color: colors.text }]}>
                        Rejection History
                      </Text>
                    </View>
                    {rejectionHistory.map((entry, index) => (
                      <View
                        key={entry.id || index}
                        style={[styles.historyEntry, index < rejectionHistory.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                      >
                        <View style={styles.historyEntryHeader}>
                          <View style={[styles.historyTierBadge, { backgroundColor: '#EF444415' }]}>
                            <Text style={[styles.historyTierText, { color: '#EF4444' }]}>
                              Tier {entry.tierLevel}
                            </Text>
                          </View>
                          <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                            {formatDate(entry.rejectedAt)}
                          </Text>
                        </View>
                        <Text style={[styles.historyRejector, { color: colors.textSecondary }]}>
                          Rejected by {entry.rejectedBy}
                        </Text>
                        {entry.reason && (
                          <Text style={[styles.historyReason, { color: colors.text }]}>
                            &ldquo;{entry.reason}&rdquo;
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.actionSectionTitle, { color: colors.text }]}>
                  What would you like to do?
                </Text>

                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleStartAction('resubmit')}
                  >
                    <Edit3 size={20} color="#FFF" />
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonTitle}>Edit & Resubmit</Text>
                      <Text style={styles.actionButtonSubtitle}>
                        Make changes and send for approval again
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#FFF" />
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleStartAction('appeal')}
                  >
                    <MessageSquare size={20} color="#FFF" />
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonTitle}>Appeal Decision</Text>
                      <Text style={styles.actionButtonSubtitle}>
                        Request review without changes
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#FFF" />
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleStartAction('cancel')}
                  >
                    <Trash2 size={20} color="#FFF" />
                    <View style={styles.actionButtonContent}>
                      <Text style={styles.actionButtonTitle}>Cancel Request</Text>
                      <Text style={styles.actionButtonSubtitle}>
                        Permanently withdraw this request
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#FFF" />
                  </Pressable>
                </View>
              </>
            )}

            {actionType === 'resubmit' && (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    Edit Request Details
                  </Text>
                  <Text style={[styles.formSectionSubtitle, { color: colors.textSecondary }]}>
                    Make any necessary changes before resubmitting
                  </Text>

                  {selectedInstance.metadata && Object.keys(selectedInstance.metadata).length > 0 ? (
                    <View style={styles.formFields}>
                      {Object.entries(selectedInstance.metadata).map(([key, value]) => {
                        if (typeof value === 'object') return null;
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return (
                          <View key={key} style={styles.formField}>
                            <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>
                              {label}
                            </Text>
                            <TextInput
                              style={[styles.formFieldInput, { 
                                backgroundColor: colors.backgroundSecondary, 
                                color: colors.text,
                                borderColor: colors.border 
                              }]}
                              value={editedMetadata[key] || String(value)}
                              onChangeText={(text) => setEditedMetadata(prev => ({ ...prev, [key]: text }))}
                              placeholder={`Enter ${label.toLowerCase()}`}
                              placeholderTextColor={colors.textTertiary}
                            />
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={[styles.noMetadataBox, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.noMetadataText, { color: colors.textSecondary }]}>
                        No editable fields available. You can add comments below.
                      </Text>
                    </View>
                  )}

                  <View style={styles.formField}>
                    <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>
                      Comments (Optional)
                    </Text>
                    <TextInput
                      style={[styles.formFieldTextArea, { 
                        backgroundColor: colors.backgroundSecondary, 
                        color: colors.text,
                        borderColor: colors.border 
                      }]}
                      value={comments}
                      onChangeText={setComments}
                      placeholder="Add any notes about your changes..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isProcessing ? 0.7 : 1 }]}
                  onPress={handleResubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Send size={18} color="#FFF" />
                      <Text style={styles.submitButtonText}>Resubmit for Approval</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            {actionType === 'appeal' && (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    Appeal This Decision
                  </Text>
                  <Text style={[styles.formSectionSubtitle, { color: colors.textSecondary }]}>
                    Your request will be resubmitted without changes. Provide a reason for your appeal.
                  </Text>

                  <View style={styles.formField}>
                    <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>
                      Appeal Reason *
                    </Text>
                    <TextInput
                      style={[styles.formFieldTextArea, { 
                        backgroundColor: colors.backgroundSecondary, 
                        color: colors.text,
                        borderColor: colors.border 
                      }]}
                      value={appealReason}
                      onChangeText={setAppealReason}
                      placeholder="Explain why you believe this decision should be reconsidered..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: '#8B5CF6', opacity: isProcessing || !appealReason.trim() ? 0.7 : 1 }]}
                  onPress={handleAppeal}
                  disabled={isProcessing || !appealReason.trim()}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MessageSquare size={18} color="#FFF" />
                      <Text style={styles.submitButtonText}>Submit Appeal</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            {actionType === 'cancel' && (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.warningBanner, { backgroundColor: '#EF444410' }]}>
                    <AlertTriangle size={24} color="#EF4444" />
                    <Text style={[styles.warningText, { color: '#EF4444' }]}>
                      This action is permanent and cannot be undone.
                    </Text>
                  </View>

                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    Cancel This Request
                  </Text>
                  <Text style={[styles.formSectionSubtitle, { color: colors.textSecondary }]}>
                    The request will be permanently cancelled and removed from the approval workflow.
                  </Text>

                  <View style={styles.formField}>
                    <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>
                      Cancellation Reason (Optional)
                    </Text>
                    <TextInput
                      style={[styles.formFieldTextArea, { 
                        backgroundColor: colors.backgroundSecondary, 
                        color: colors.text,
                        borderColor: colors.border 
                      }]}
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      placeholder="Optionally explain why you're cancelling..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: '#EF4444', opacity: isProcessing ? 0.7 : 1 }]}
                  onPress={handleCancel}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Trash2 size={18} color="#FFF" />
                      <Text style={styles.submitButtonText}>Cancel Request</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={styles.header}
        onPress={onToggleCollapse}
      >
        <View style={[styles.headerIcon, { backgroundColor: '#EF444415' }]}>
          <AlertTriangle size={20} color="#EF4444" />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Returned to You
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {returnedItems.length} request{returnedItems.length !== 1 ? 's' : ''} need{returnedItems.length === 1 ? 's' : ''} your action
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: '#EF4444' }]}>
          <Text style={styles.countBadgeText}>{returnedItems.length}</Text>
        </View>
      </Pressable>

      {!collapsed && (
        <View style={styles.itemsList}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            returnedItems.map(renderItemCard)
          )}
        </View>
      )}

      {renderActionModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  itemsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  itemCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemReferenceId: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  rejectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rejectionBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  rejectionReasonPreview: {
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemMetaText: {
    fontSize: 11,
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
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  requestCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestHeaderInfo: {
    flex: 1,
  },
  requestReferenceId: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rejectionReasonBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  rejectionReasonText: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    lineHeight: 20,
  },
  resubmitCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resubmitCountText: {
    fontSize: 11,
  },
  historySection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyEntry: {
    padding: 14,
    gap: 6,
  },
  historyEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyTierText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  historyDate: {
    fontSize: 11,
  },
  historyRejector: {
    fontSize: 12,
  },
  historyReason: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    marginTop: 2,
  },
  actionSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  actionButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  formSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  formSectionSubtitle: {
    fontSize: 13,
    marginTop: -4,
  },
  formFields: {
    gap: 12,
    marginTop: 4,
  },
  formField: {
    gap: 6,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  formFieldInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formFieldTextArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  noMetadataBox: {
    padding: 12,
    borderRadius: 8,
  },
  noMetadataText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
});
