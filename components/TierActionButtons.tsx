import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpRight,
  Users,
  UserCheck,
  Edit3,
  Trash2,
  MessageSquare,
  ChevronRight,
  X,
  ArrowLeft,
  AlertTriangle,
  Send,
  Shield,
  History,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import type { ApprovalTierLevel } from '@/types/approvalWorkflows';
import type { TierProgressItem } from './TierProgressVisualization';

export type UserRole = 'approver' | 'requestor' | 'viewer' | 'admin';

export type ActionType = 
  | 'approve' 
  | 'reject' 
  | 'return' 
  | 'escalate' 
  | 'delegate' 
  | 'reassign'
  | 'edit'
  | 'cancel'
  | 'view_history'
  | 'add_comment';

export interface ActionConfig {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  color: string;
  backgroundColor: string;
  requiresComment?: boolean;
  requiresSelection?: boolean;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  enabled?: boolean;
  tooltip?: string;
}

export interface DelegateOption {
  id: string;
  name: string;
  role: string;
  department?: string;
}

export interface TierActionButtonsProps {
  tier: TierProgressItem;
  userRole: UserRole;
  userId: string;
  userName: string;
  instanceId: string;
  instanceStatus: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned' | 'cancelled';
  isCurrentUserApprover?: boolean;
  isRequestor?: boolean;
  canDelegate?: boolean;
  canReassign?: boolean;
  canEscalate?: boolean;
  delegateOptions?: DelegateOption[];
  reassignOptions?: DelegateOption[];
  onAction?: (action: ActionType, data?: Record<string, unknown>) => Promise<void>;
  onApprove?: (comments?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onReturn?: (reason: string, returnToTier?: ApprovalTierLevel) => Promise<void>;
  onEscalate?: (reason: string) => Promise<void>;
  onDelegate?: (toUserId: string, toUserName: string, reason?: string) => Promise<void>;
  onReassign?: (toUserId: string, toUserName: string, reason?: string) => Promise<void>;
  onEdit?: () => void;
  onCancel?: (reason?: string) => Promise<void>;
  onViewHistory?: () => void;
  compact?: boolean;
  showLabels?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  disabled?: boolean;
}

const tierLevelColors: Record<ApprovalTierLevel, string> = {
  1: '#10B981',
  2: '#3B82F6',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#7C3AED',
};

export function TierActionButtons({
  tier,
  userRole,
  userId,
  userName,
  instanceId,
  instanceStatus,
  isCurrentUserApprover = false,
  isRequestor = false,
  canDelegate = true,
  canReassign = true,
  canEscalate = true,
  delegateOptions = [],
  reassignOptions = [],
  onAction,
  onApprove,
  onReject,
  onReturn,
  onEscalate,
  onDelegate,
  onReassign,
  onEdit,
  onCancel,
  onViewHistory,
  compact = false,
  showLabels = true,
  layout = 'vertical',
  disabled = false,
}: TierActionButtonsProps) {
  const { colors } = useTheme();

  const [showActionModal, setShowActionModal] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [comments, setComments] = useState('');
  const [selectedUser, setSelectedUser] = useState<DelegateOption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tierColor = tier.color || tierLevelColors[tier.level];
  const isTierActive = tier.status === 'current';
  const canTakeAction = isTierActive && !disabled && instanceStatus === 'in_progress';

  const approverActions: ActionConfig[] = useMemo(() => {
    if (!isCurrentUserApprover || !canTakeAction) return [];

    const actions: ActionConfig[] = [
      {
        type: 'approve',
        label: 'Approve',
        icon: <CheckCircle2 size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#10B981',
        requiresComment: false,
        confirmationRequired: false,
        enabled: true,
      },
      {
        type: 'reject',
        label: 'Reject',
        icon: <XCircle size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#EF4444',
        requiresComment: true,
        confirmationRequired: true,
        confirmationMessage: 'Are you sure you want to reject this request?',
        enabled: true,
      },
      {
        type: 'return',
        label: 'Return',
        icon: <RotateCcw size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#F59E0B',
        requiresComment: true,
        confirmationRequired: false,
        enabled: true,
        tooltip: 'Return to requestor for changes',
      },
    ];

    if (canEscalate) {
      actions.push({
        type: 'escalate',
        label: 'Escalate',
        icon: <ArrowUpRight size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#8B5CF6',
        requiresComment: true,
        confirmationRequired: true,
        confirmationMessage: 'Escalate this request to a higher tier?',
        enabled: true,
      });
    }

    if (canDelegate && delegateOptions.length > 0) {
      actions.push({
        type: 'delegate',
        label: 'Delegate',
        icon: <Users size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#6366F1',
        requiresSelection: true,
        enabled: true,
        tooltip: 'Delegate to another approver',
      });
    }

    if (canReassign && reassignOptions.length > 0) {
      actions.push({
        type: 'reassign',
        label: 'Reassign',
        icon: <UserCheck size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#0EA5E9',
        requiresSelection: true,
        enabled: true,
        tooltip: 'Reassign to a different approver',
      });
    }

    return actions;
  }, [isCurrentUserApprover, canTakeAction, canEscalate, canDelegate, canReassign, delegateOptions, reassignOptions, compact]);

  const requestorActions: ActionConfig[] = useMemo(() => {
    if (!isRequestor) return [];

    const actions: ActionConfig[] = [];

    if (instanceStatus === 'returned') {
      actions.push({
        type: 'edit',
        label: 'Edit & Resubmit',
        icon: <Edit3 size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: colors.primary,
        enabled: true,
      });
    }

    if (instanceStatus === 'in_progress' || instanceStatus === 'pending' || instanceStatus === 'returned') {
      actions.push({
        type: 'cancel',
        label: 'Cancel Request',
        icon: <Trash2 size={compact ? 16 : 20} color="#FFF" />,
        color: '#FFF',
        backgroundColor: '#EF4444',
        confirmationRequired: true,
        confirmationMessage: 'Are you sure you want to cancel this request? This cannot be undone.',
        enabled: true,
      });
    }

    actions.push({
      type: 'view_history',
      label: 'View History',
      icon: <History size={compact ? 16 : 20} color={colors.primary} />,
      color: colors.primary,
      backgroundColor: `${colors.primary}15`,
      enabled: true,
    });

    return actions;
  }, [isRequestor, instanceStatus, colors.primary, compact]);

  const viewerActions: ActionConfig[] = useMemo(() => {
    return [
      {
        type: 'view_history',
        label: 'View History',
        icon: <History size={compact ? 16 : 20} color={colors.primary} />,
        color: colors.primary,
        backgroundColor: `${colors.primary}15`,
        enabled: true,
      },
      {
        type: 'add_comment',
        label: 'Add Comment',
        icon: <MessageSquare size={compact ? 16 : 20} color={colors.textSecondary} />,
        color: colors.textSecondary,
        backgroundColor: colors.backgroundSecondary,
        enabled: true,
      },
    ];
  }, [colors, compact]);

  const availableActions = useMemo(() => {
    switch (userRole) {
      case 'approver':
        return [...approverActions, ...viewerActions];
      case 'requestor':
        return requestorActions;
      case 'admin':
        return [...approverActions, ...requestorActions];
      case 'viewer':
      default:
        return viewerActions;
    }
  }, [userRole, approverActions, requestorActions, viewerActions]);

  const executeAction = useCallback(async (actionType: ActionType) => {
    setIsProcessing(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onAction) {
        await onAction(actionType, { comments, selectedUser });
      } else {
        switch (actionType) {
          case 'approve':
            await onApprove?.(comments.trim() || undefined);
            break;
          case 'reject':
            if (!comments.trim()) {
              Alert.alert('Required', 'Please provide a reason for rejection.');
              setIsProcessing(false);
              return;
            }
            await onReject?.(comments.trim());
            break;
          case 'return':
            if (!comments.trim()) {
              Alert.alert('Required', 'Please provide a reason for returning.');
              setIsProcessing(false);
              return;
            }
            await onReturn?.(comments.trim());
            break;
          case 'escalate':
            if (!comments.trim()) {
              Alert.alert('Required', 'Please provide a reason for escalation.');
              setIsProcessing(false);
              return;
            }
            await onEscalate?.(comments.trim());
            break;
          case 'delegate':
            if (!selectedUser) {
              Alert.alert('Required', 'Please select a user to delegate to.');
              setIsProcessing(false);
              return;
            }
            await onDelegate?.(selectedUser.id, selectedUser.name, comments.trim() || undefined);
            break;
          case 'reassign':
            if (!selectedUser) {
              Alert.alert('Required', 'Please select a user to reassign to.');
              setIsProcessing(false);
              return;
            }
            await onReassign?.(selectedUser.id, selectedUser.name, comments.trim() || undefined);
            break;
          case 'cancel':
            await onCancel?.(comments.trim() || undefined);
            break;
        }
      }

      setShowActionModal(false);
      setActiveAction(null);
      setComments('');
      setSelectedUser(null);
    } catch (error) {
      console.error('[TierActionButtons] Action failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [comments, selectedUser, onAction, onApprove, onReject, onReturn, onEscalate, onDelegate, onReassign, onCancel]);

  const handleActionPress = useCallback((action: ActionConfig) => {
    Haptics.selectionAsync();

    if (action.type === 'view_history') {
      onViewHistory?.();
      return;
    }

    if (action.type === 'edit') {
      onEdit?.();
      return;
    }

    if (action.confirmationRequired && action.confirmationMessage) {
      Alert.alert(
        'Confirm Action',
        action.confirmationMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: action.type === 'reject' || action.type === 'cancel' ? 'destructive' : 'default',
            onPress: () => {
              if (action.requiresComment || action.requiresSelection) {
                setActiveAction(action.type);
                setShowActionModal(true);
              } else {
                executeAction(action.type);
              }
            },
          },
        ]
      );
    } else if (action.requiresComment || action.requiresSelection) {
      setActiveAction(action.type);
      setShowActionModal(true);
    } else {
      executeAction(action.type);
    }
  }, [onViewHistory, onEdit, executeAction]);

  const closeModal = useCallback(() => {
    setShowActionModal(false);
    setActiveAction(null);
    setComments('');
    setSelectedUser(null);
  }, []);

  const getActionModalConfig = () => {
    switch (activeAction) {
      case 'approve':
        return {
          title: 'Approve Request',
          subtitle: 'Add optional comments for the approval.',
          buttonLabel: 'Approve',
          buttonColor: '#10B981',
          requiresInput: false,
          inputLabel: 'Comments (Optional)',
          inputPlaceholder: 'Add any notes or comments...',
        };
      case 'reject':
        return {
          title: 'Reject Request',
          subtitle: 'Please provide a reason for the rejection.',
          buttonLabel: 'Reject',
          buttonColor: '#EF4444',
          requiresInput: true,
          inputLabel: 'Rejection Reason *',
          inputPlaceholder: 'Explain why this request is being rejected...',
        };
      case 'return':
        return {
          title: 'Return to Requestor',
          subtitle: 'The request will be sent back for modifications.',
          buttonLabel: 'Return',
          buttonColor: '#F59E0B',
          requiresInput: true,
          inputLabel: 'Return Reason *',
          inputPlaceholder: 'Explain what changes are needed...',
        };
      case 'escalate':
        return {
          title: 'Escalate Request',
          subtitle: 'Send this request to a higher approval tier.',
          buttonLabel: 'Escalate',
          buttonColor: '#8B5CF6',
          requiresInput: true,
          inputLabel: 'Escalation Reason *',
          inputPlaceholder: 'Explain why this needs escalation...',
        };
      case 'delegate':
        return {
          title: 'Delegate Approval',
          subtitle: 'Select someone to handle this approval on your behalf.',
          buttonLabel: 'Delegate',
          buttonColor: '#6366F1',
          requiresInput: false,
          requiresSelection: true,
          selectionLabel: 'Delegate To *',
          selectionOptions: delegateOptions,
          inputLabel: 'Notes (Optional)',
          inputPlaceholder: 'Add any notes for the delegate...',
        };
      case 'reassign':
        return {
          title: 'Reassign Request',
          subtitle: 'Transfer this request to a different approver.',
          buttonLabel: 'Reassign',
          buttonColor: '#0EA5E9',
          requiresInput: false,
          requiresSelection: true,
          selectionLabel: 'Reassign To *',
          selectionOptions: reassignOptions,
          inputLabel: 'Notes (Optional)',
          inputPlaceholder: 'Add any notes for the new approver...',
        };
      case 'cancel':
        return {
          title: 'Cancel Request',
          subtitle: 'This action cannot be undone.',
          buttonLabel: 'Cancel Request',
          buttonColor: '#EF4444',
          requiresInput: false,
          inputLabel: 'Cancellation Reason (Optional)',
          inputPlaceholder: 'Optionally explain why you are cancelling...',
        };
      default:
        return null;
    }
  };

  const renderActionButton = (action: ActionConfig, index: number) => {
    const isDisabled = disabled || !action.enabled;

    return (
      <Pressable
        key={action.type}
        style={[
          styles.actionButton,
          compact && styles.actionButtonCompact,
          layout === 'horizontal' && styles.actionButtonHorizontal,
          layout === 'grid' && styles.actionButtonGrid,
          { backgroundColor: action.backgroundColor, opacity: isDisabled ? 0.5 : 1 },
        ]}
        onPress={() => handleActionPress(action)}
        disabled={isDisabled}
      >
        {action.icon}
        {showLabels && (
          <Text
            style={[
              styles.actionButtonLabel,
              compact && styles.actionButtonLabelCompact,
              { color: action.color },
            ]}
          >
            {action.label}
          </Text>
        )}
        {!compact && layout === 'vertical' && (
          <ChevronRight size={16} color={action.color} style={{ opacity: 0.7 }} />
        )}
      </Pressable>
    );
  };

  const renderActionModal = () => {
    const config = getActionModalConfig();
    if (!config) return null;

    const canSubmit = config.requiresInput 
      ? comments.trim().length > 0 
      : config.requiresSelection 
        ? !!selectedUser 
        : true;

    return (
      <Modal
        visible={showActionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={closeModal} style={styles.modalBackButton}>
              <ArrowLeft size={20} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{config.title}</Text>
            <Pressable onPress={closeModal} style={styles.modalCloseButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.tierBanner, { backgroundColor: `${tierColor}10`, borderColor: tierColor }]}>
              <Shield size={18} color={tierColor} />
              <View style={styles.tierBannerContent}>
                <Text style={[styles.tierBannerTitle, { color: tierColor }]}>
                  Tier {tier.level}: {tier.name}
                </Text>
                <Text style={[styles.tierBannerSubtitle, { color: colors.textSecondary }]}>
                  {config.subtitle}
                </Text>
              </View>
            </View>

            {activeAction === 'cancel' && (
              <View style={[styles.warningBanner, { backgroundColor: '#EF444410' }]}>
                <AlertTriangle size={20} color="#EF4444" />
                <Text style={[styles.warningText, { color: '#EF4444' }]}>
                  This action is permanent and cannot be undone.
                </Text>
              </View>
            )}

            {config.requiresSelection && config.selectionOptions && (
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  {config.selectionLabel}
                </Text>
                <View style={styles.selectionList}>
                  {config.selectionOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.selectionItem,
                        {
                          backgroundColor: selectedUser?.id === option.id 
                            ? `${config.buttonColor}15` 
                            : colors.surface,
                          borderColor: selectedUser?.id === option.id 
                            ? config.buttonColor 
                            : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedUser(option);
                      }}
                    >
                      <View style={[styles.selectionAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                        <UserCheck size={16} color={colors.textSecondary} />
                      </View>
                      <View style={styles.selectionInfo}>
                        <Text style={[styles.selectionName, { color: colors.text }]}>{option.name}</Text>
                        <Text style={[styles.selectionRole, { color: colors.textSecondary }]}>
                          {option.role}{option.department ? ` • ${option.department}` : ''}
                        </Text>
                      </View>
                      {selectedUser?.id === option.id && (
                        <CheckCircle2 size={20} color={config.buttonColor} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                {config.inputLabel}
              </Text>
              <TextInput
                style={[
                  styles.formTextArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={comments}
                onChangeText={setComments}
                placeholder={config.inputPlaceholder}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: config.buttonColor,
                  opacity: !canSubmit || isProcessing ? 0.6 : 1,
                },
              ]}
              onPress={() => executeAction(activeAction!)}
              disabled={!canSubmit || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Send size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>{config.buttonLabel}</Text>
                </>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isCurrentUserApprover && isTierActive && (
        <View style={[styles.roleIndicator, { backgroundColor: `${tierColor}15` }]}>
          <Shield size={14} color={tierColor} />
          <Text style={[styles.roleIndicatorText, { color: tierColor }]}>
            You are an approver for this tier
          </Text>
        </View>
      )}

      {isRequestor && instanceStatus === 'returned' && (
        <View style={[styles.roleIndicator, { backgroundColor: '#F59E0B15' }]}>
          <AlertTriangle size={14} color="#F59E0B" />
          <Text style={[styles.roleIndicatorText, { color: '#F59E0B' }]}>
            Action required - Review and respond
          </Text>
        </View>
      )}

      <View
        style={[
          styles.actionsContainer,
          layout === 'horizontal' && styles.actionsContainerHorizontal,
          layout === 'grid' && styles.actionsContainerGrid,
        ]}
      >
        {availableActions.map((action, index) => renderActionButton(action, index))}
      </View>

      {renderActionModal()}
    </View>
  );
}

export function QuickApprovalButtons({
  onApprove,
  onReject,
  disabled = false,
  isProcessing = false,
  compact = false,
}: {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  compact?: boolean;
}) {

  const handleApprove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApprove();
  }, [onApprove]);

  const handleReject = useCallback(() => {
    Haptics.selectionAsync();
    onReject();
  }, [onReject]);

  return (
    <View style={[styles.quickActions, compact && styles.quickActionsCompact]}>
      <Pressable
        style={[
          styles.quickActionButton,
          styles.quickRejectButton,
          compact && styles.quickActionButtonCompact,
          { opacity: disabled || isProcessing ? 0.5 : 1 },
        ]}
        onPress={handleReject}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : (
          <>
            <XCircle size={compact ? 16 : 20} color="#EF4444" />
            <Text style={[styles.quickActionText, styles.quickRejectText, compact && styles.quickActionTextCompact]}>
              Reject
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[
          styles.quickActionButton,
          styles.quickApproveButton,
          compact && styles.quickActionButtonCompact,
          { opacity: disabled || isProcessing ? 0.5 : 1 },
        ]}
        onPress={handleApprove}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <CheckCircle2 size={compact ? 16 : 20} color="#FFF" />
            <Text style={[styles.quickActionText, styles.quickApproveText, compact && styles.quickActionTextCompact]}>
              Approve
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export function ApproverActionBar({
  tier,
  onApprove,
  onReject,
  onReturn,
  onMoreActions,
  disabled = false,
  isProcessing = false,
}: {
  tier: TierProgressItem;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
  onMoreActions?: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}) {
  const { colors } = useTheme();
  const tierColor = tier.color || tierLevelColors[tier.level];

  return (
    <View style={[styles.actionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.actionBarHeader}>
        <View style={[styles.actionBarTierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.actionBarTierText}>Tier {tier.level}</Text>
        </View>
        <Text style={[styles.actionBarTitle, { color: colors.text }]} numberOfLines={1}>
          {tier.name}
        </Text>
      </View>

      <View style={styles.actionBarButtons}>
        <Pressable
          style={[styles.actionBarButton, { backgroundColor: '#EF444415', opacity: disabled ? 0.5 : 1 }]}
          onPress={() => {
            Haptics.selectionAsync();
            onReject();
          }}
          disabled={disabled || isProcessing}
        >
          <XCircle size={18} color="#EF4444" />
        </Pressable>

        <Pressable
          style={[styles.actionBarButton, { backgroundColor: '#F59E0B15', opacity: disabled ? 0.5 : 1 }]}
          onPress={() => {
            Haptics.selectionAsync();
            onReturn();
          }}
          disabled={disabled || isProcessing}
        >
          <RotateCcw size={18} color="#F59E0B" />
        </Pressable>

        {onMoreActions && (
          <Pressable
            style={[styles.actionBarButton, { backgroundColor: colors.backgroundSecondary, opacity: disabled ? 0.5 : 1 }]}
            onPress={() => {
              Haptics.selectionAsync();
              onMoreActions();
            }}
            disabled={disabled || isProcessing}
          >
            <MessageSquare size={18} color={colors.textSecondary} />
          </Pressable>
        )}

        <Pressable
          style={[
            styles.actionBarButton,
            styles.actionBarApproveButton,
            { backgroundColor: '#10B981', opacity: disabled ? 0.5 : 1 },
          ]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onApprove();
          }}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#FFF" />
              <Text style={styles.actionBarApproveText}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function RequestorActionBar({
  instanceStatus,
  onEdit,
  onCancel,
  onViewHistory,
  disabled = false,
}: {
  instanceStatus: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'returned' | 'cancelled';
  onEdit?: () => void;
  onCancel?: () => void;
  onViewHistory?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const canEdit = instanceStatus === 'returned';
  const canCancel = ['pending', 'in_progress', 'returned'].includes(instanceStatus);

  return (
    <View style={[styles.requestorBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {instanceStatus === 'returned' && (
        <View style={[styles.requestorAlert, { backgroundColor: '#F59E0B15' }]}>
          <AlertTriangle size={16} color="#F59E0B" />
          <Text style={[styles.requestorAlertText, { color: '#F59E0B' }]}>
            Returned for revision
          </Text>
        </View>
      )}

      <View style={styles.requestorButtons}>
        {onViewHistory && (
          <Pressable
            style={[styles.requestorButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => {
              Haptics.selectionAsync();
              onViewHistory();
            }}
          >
            <History size={18} color={colors.textSecondary} />
            <Text style={[styles.requestorButtonText, { color: colors.textSecondary }]}>History</Text>
          </Pressable>
        )}

        {canCancel && onCancel && (
          <Pressable
            style={[styles.requestorButton, { backgroundColor: '#EF444415', opacity: disabled ? 0.5 : 1 }]}
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                'Cancel Request',
                'Are you sure you want to cancel this request?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive', onPress: onCancel },
                ]
              );
            }}
            disabled={disabled}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text style={[styles.requestorButtonText, { color: '#EF4444' }]}>Cancel</Text>
          </Pressable>
        )}

        {canEdit && onEdit && (
          <Pressable
            style={[styles.requestorButton, styles.requestorEditButton, { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}
            onPress={() => {
              Haptics.selectionAsync();
              onEdit();
            }}
            disabled={disabled}
          >
            <Edit3 size={18} color="#FFF" />
            <Text style={[styles.requestorButtonText, { color: '#FFF' }]}>Edit & Resubmit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  roleIndicatorText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionsContainer: {
    gap: 8,
  },
  actionsContainerHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  actionButtonCompact: {
    padding: 10,
    gap: 8,
  },
  actionButtonHorizontal: {
    flex: 0,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonGrid: {
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  actionButtonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  actionButtonLabelCompact: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalBackButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  tierBannerContent: {
    flex: 1,
    gap: 2,
  },
  tierBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tierBannerSubtitle: {
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  formSection: {
    marginBottom: 16,
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  formTextArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  selectionList: {
    gap: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  selectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionInfo: {
    flex: 1,
    gap: 2,
  },
  selectionName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  selectionRole: {
    fontSize: 12,
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
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionsCompact: {
    gap: 6,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  quickActionButtonCompact: {
    paddingVertical: 10,
    gap: 6,
  },
  quickRejectButton: {
    backgroundColor: '#EF444415',
  },
  quickApproveButton: {
    backgroundColor: '#10B981',
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  quickActionTextCompact: {
    fontSize: 13,
  },
  quickRejectText: {
    color: '#EF4444',
  },
  quickApproveText: {
    color: '#FFF',
  },
  actionBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  actionBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBarTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBarTierText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  actionBarTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  actionBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBarButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBarApproveButton: {
    flex: 1,
    width: 'auto' as unknown as number,
    flexDirection: 'row',
    gap: 8,
  },
  actionBarApproveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  requestorBar: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  requestorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  requestorAlertText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  requestorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  requestorEditButton: {
    flex: 1,
  },
  requestorButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

export default TierActionButtons;
