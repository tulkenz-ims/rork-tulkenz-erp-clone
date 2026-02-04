import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ArrowDownRight,
  User,
  MessageSquare,
  Info,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { ApprovalTierLevel, tierLevelColors } from '@/types/approvalWorkflows';
import { getTierCascadeTarget, getRejectionCascadePath } from '@/hooks/useSupabaseWorkflows';

export interface RejectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  currentTierLevel?: ApprovalTierLevel;
  showCascadeInfo?: boolean;
  requestTitle?: string;
  requestedBy?: string;
  minReasonLength?: number;
  maxReasonLength?: number;
  placeholderText?: string;
  confirmButtonText?: string;
  requireReason?: boolean;
}

const COMMON_REJECTION_REASONS = [
  'Insufficient budget allocation',
  'Missing required documentation',
  'Does not meet policy requirements',
  'Requires additional justification',
  'Incorrect pricing or quantity',
  'Duplicate request',
  'Not approved by department head',
  'Vendor not on approved list',
];

export default function RejectionModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'Reject Request',
  subtitle = 'Please provide a reason for this rejection.',
  currentTierLevel,
  showCascadeInfo = true,
  requestTitle,
  requestedBy,
  minReasonLength = 10,
  maxReasonLength = 500,
  placeholderText = 'Enter reason for rejection...',
  confirmButtonText = 'Reject',
  requireReason = true,
}: RejectionModalProps) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showQuickReasons, setShowQuickReasons] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
      setShowQuickReasons(false);
    }
  }, [visible]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnimation]);

  const validateReason = useCallback((text: string): string | null => {
    if (requireReason && !text.trim()) {
      return 'Rejection reason is required';
    }
    if (requireReason && text.trim().length < minReasonLength) {
      return `Reason must be at least ${minReasonLength} characters`;
    }
    if (text.length > maxReasonLength) {
      return `Reason cannot exceed ${maxReasonLength} characters`;
    }
    return null;
  }, [requireReason, minReasonLength, maxReasonLength]);

  const handleReasonChange = useCallback((text: string) => {
    setReason(text);
    if (error) {
      const validationError = validateReason(text);
      if (!validationError) {
        setError(null);
      }
    }
  }, [error, validateReason]);

  const handleQuickReasonSelect = useCallback((quickReason: string) => {
    setReason(quickReason);
    setError(null);
    setShowQuickReasons(false);
    Haptics.selectionAsync();
  }, []);

  const handleConfirm = useCallback(() => {
    const validationError = validateReason(reason);
    if (validationError) {
      setError(validationError);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onConfirm(reason.trim());
  }, [reason, validateReason, triggerShake, onConfirm]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      Haptics.selectionAsync();
      onClose();
    }
  }, [isLoading, onClose]);

  const cascadeTarget = currentTierLevel ? getTierCascadeTarget(currentTierLevel) : null;
  const cascadePath = currentTierLevel ? getRejectionCascadePath(currentTierLevel) : [];

  const characterCount = reason.length;
  const isNearLimit = characterCount > maxReasonLength * 0.8;
  const isOverLimit = characterCount > maxReasonLength;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.surface, transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors.error}15` }]}>
              <AlertTriangle size={28} color={colors.error} />
            </View>
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

            {(requestTitle || requestedBy) && (
              <View style={[styles.requestInfo, { backgroundColor: colors.backgroundSecondary }]}>
                {requestTitle && (
                  <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={2}>
                    {requestTitle}
                  </Text>
                )}
                {requestedBy && (
                  <View style={styles.requestedByRow}>
                    <User size={14} color={colors.textTertiary} />
                    <Text style={[styles.requestedByText, { color: colors.textSecondary }]}>
                      Requested by {requestedBy}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {showCascadeInfo && currentTierLevel && cascadeTarget && (
              <View style={[styles.cascadeInfo, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
                <View style={styles.cascadeHeader}>
                  <Info size={16} color={colors.warning} />
                  <Text style={[styles.cascadeTitle, { color: colors.warning }]}>Rejection Flow</Text>
                </View>
                <Text style={[styles.cascadeDescription, { color: colors.textSecondary }]}>
                  {cascadeTarget.returnedToRequestor
                    ? 'This rejection will return the request to the original requestor for action.'
                    : `This rejection will cascade to Tier ${cascadeTarget.targetTier} for review.`}
                </Text>
                <View style={styles.cascadePathContainer}>
                  {cascadePath.slice(0, 4).map((step, index) => (
                    <View key={step.tier ?? 'requestor'} style={styles.cascadeStep}>
                      <View
                        style={[
                          styles.cascadeBadge,
                          {
                            backgroundColor: index === 0
                              ? colors.error
                              : step.tier
                              ? tierLevelColors[step.tier as ApprovalTierLevel]
                              : colors.primary,
                          },
                        ]}
                      >
                        <Text style={styles.cascadeBadgeText}>
                          {step.tier ?? 'R'}
                        </Text>
                      </View>
                      {index < Math.min(cascadePath.length - 1, 3) && (
                        <ArrowDownRight size={14} color={colors.textTertiary} style={styles.cascadeArrow} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputSection}>
              <View style={styles.inputHeader}>
                <View style={styles.inputLabelRow}>
                  <MessageSquare size={16} color={colors.textSecondary} />
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Rejection Reason {requireReason && <Text style={{ color: colors.error }}>*</Text>}
                  </Text>
                </View>
                <Pressable
                  style={[styles.quickReasonsButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { setShowQuickReasons(!showQuickReasons); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.quickReasonsText, { color: colors.primary }]}>Quick Reasons</Text>
                  <ChevronDown
                    size={14}
                    color={colors.primary}
                    style={{ transform: [{ rotate: showQuickReasons ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
              </View>

              {showQuickReasons && (
                <View style={[styles.quickReasonsList, { backgroundColor: colors.backgroundSecondary }]}>
                  {COMMON_REJECTION_REASONS.map((quickReason, index) => (
                    <Pressable
                      key={index}
                      style={[styles.quickReasonItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleQuickReasonSelect(quickReason)}
                    >
                      <Text style={[styles.quickReasonText, { color: colors.text }]}>{quickReason}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.text,
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}
                placeholder={placeholderText}
                placeholderTextColor={colors.textTertiary}
                value={reason}
                onChangeText={handleReasonChange}
                multiline
                numberOfLines={4}
                maxLength={maxReasonLength + 50}
                editable={!isLoading}
                textAlignVertical="top"
              />

              <View style={styles.inputFooter}>
                {error ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                ) : (
                  <Text style={[styles.hintText, { color: colors.textTertiary }]}>
                    Minimum {minReasonLength} characters required
                  </Text>
                )}
                <Text
                  style={[
                    styles.characterCount,
                    {
                      color: isOverLimit ? colors.error : isNearLimit ? colors.warning : colors.textTertiary,
                    },
                  ]}
                >
                  {characterCount}/{maxReasonLength}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmButton,
                { backgroundColor: isLoading ? colors.border : colors.error },
              ]}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Processing...' : confirmButtonText}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: '92%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 0,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  requestInfo: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  requestedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestedByText: {
    fontSize: 13,
  },
  cascadeInfo: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  cascadeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cascadeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cascadeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cascadePathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cascadeStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cascadeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cascadeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  cascadeArrow: {
    marginHorizontal: 6,
  },
  inputSection: {
    gap: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  quickReasonsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickReasonsText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  quickReasonsList: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  quickReasonItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quickReasonText: {
    fontSize: 13,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  hintText: {
    fontSize: 12,
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  confirmButton: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
