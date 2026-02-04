import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Coffee, Clock, DollarSign, Timer } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DEFAULT_PAID_BREAK_DURATIONS,
  DEFAULT_UNPAID_BREAK_DURATIONS,
} from '@/types/timeclock';

interface BreakTypeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBreak: (breakType: 'paid' | 'unpaid', scheduledMinutes: number) => void;
  isLoading?: boolean;
  employeeName?: string;
}

export default function BreakTypeSelectionModal({
  visible,
  onClose,
  onSelectBreak,
  isLoading = false,
  employeeName,
}: BreakTypeSelectionModalProps) {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<'paid' | 'unpaid' | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedType(null);
      setSelectedDuration(null);
    }
  }, [visible]);

  const handleTypeSelect = useCallback((type: 'paid' | 'unpaid') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedType(type);
    setSelectedDuration(null);
  }, []);

  const handleDurationSelect = useCallback((duration: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDuration(duration);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedType && selectedDuration) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSelectBreak(selectedType, selectedDuration);
    }
  }, [selectedType, selectedDuration, onSelectBreak]);

  const durations = selectedType === 'paid' 
    ? DEFAULT_PAID_BREAK_DURATIONS 
    : DEFAULT_UNPAID_BREAK_DURATIONS;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Start Break</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {employeeName && (
            <Text style={[styles.employeeName, { color: colors.textSecondary }]}>
              {employeeName}
            </Text>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Select Break Type
          </Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeCard,
                { 
                  backgroundColor: selectedType === 'paid' ? '#10B98115' : colors.background,
                  borderColor: selectedType === 'paid' ? '#10B981' : colors.border,
                },
              ]}
              onPress={() => handleTypeSelect('paid')}
              disabled={isLoading}
            >
              <View style={[styles.typeIconContainer, { backgroundColor: '#10B98120' }]}>
                <DollarSign size={24} color="#10B981" />
              </View>
              <Text style={[styles.typeTitle, { color: selectedType === 'paid' ? '#10B981' : colors.text }]}>
                Paid Break
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
                5, 10, or 15 min
              </Text>
              <Text style={[styles.typeNote, { color: colors.textTertiary }]}>
                Does not deduct from hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCard,
                { 
                  backgroundColor: selectedType === 'unpaid' ? '#F59E0B15' : colors.background,
                  borderColor: selectedType === 'unpaid' ? '#F59E0B' : colors.border,
                },
              ]}
              onPress={() => handleTypeSelect('unpaid')}
              disabled={isLoading}
            >
              <View style={[styles.typeIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Coffee size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.typeTitle, { color: selectedType === 'unpaid' ? '#F59E0B' : colors.text }]}>
                Unpaid Break
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
                30, 45, or 60 min
              </Text>
              <Text style={[styles.typeNote, { color: colors.textTertiary }]}>
                Deducts from working hours
              </Text>
            </TouchableOpacity>
          </View>

          {selectedType && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                Select Duration
              </Text>

              <View style={styles.durationSelector}>
                {durations.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      { 
                        backgroundColor: selectedDuration === duration 
                          ? (selectedType === 'paid' ? '#10B98115' : '#F59E0B15')
                          : colors.background,
                        borderColor: selectedDuration === duration 
                          ? (selectedType === 'paid' ? '#10B981' : '#F59E0B')
                          : colors.border,
                      },
                    ]}
                    onPress={() => handleDurationSelect(duration)}
                    disabled={isLoading}
                  >
                    <Timer 
                      size={18} 
                      color={selectedDuration === duration 
                        ? (selectedType === 'paid' ? '#10B981' : '#F59E0B')
                        : colors.textSecondary
                      } 
                    />
                    <Text style={[
                      styles.durationText, 
                      { 
                        color: selectedDuration === duration 
                          ? (selectedType === 'paid' ? '#10B981' : '#F59E0B')
                          : colors.text 
                      }
                    ]}>
                      {duration} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedType === 'unpaid' && (
                <View style={[styles.warningBanner, { backgroundColor: '#F59E0B10' }]}>
                  <Clock size={16} color="#F59E0B" />
                  <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                    Minimum 30 minutes required. Cannot end break early.
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                { 
                  backgroundColor: selectedType && selectedDuration 
                    ? (selectedType === 'paid' ? '#10B981' : '#F59E0B')
                    : colors.border,
                },
              ]}
              onPress={handleConfirm}
              disabled={!selectedType || !selectedDuration || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Coffee size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Start Break</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  employeeName: {
    fontSize: 14,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  typeNote: {
    fontSize: 11,
    textAlign: 'center',
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
