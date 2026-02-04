import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Settings,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useBreakSettings,
  useCreateBreakSettings,
  useUpdateBreakSettings,
  useDeleteBreakSettings,
  type BreakSettings,
} from '@/hooks/useSupabaseTimeClock';
import {
  DEFAULT_PAID_BREAK_DURATIONS,
  DEFAULT_UNPAID_BREAK_DURATIONS,
  DEFAULT_MIN_UNPAID_BREAK,
  DEFAULT_MAX_UNPAID_BREAK,
  DEFAULT_UNPAID_BREAK_BUFFER,
} from '@/types/timeclock';

const defaultFormData: Omit<BreakSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  is_default: false,
  is_active: true,
  paid_break_durations: DEFAULT_PAID_BREAK_DURATIONS,
  max_paid_breaks_per_shift: 2,
  paid_break_auto_deduct: false,
  unpaid_break_durations: DEFAULT_UNPAID_BREAK_DURATIONS,
  min_unpaid_break_minutes: DEFAULT_MIN_UNPAID_BREAK,
  max_unpaid_break_minutes: DEFAULT_MAX_UNPAID_BREAK,
  unpaid_break_buffer_minutes: DEFAULT_UNPAID_BREAK_BUFFER,
  early_return_grace_minutes: 2,
  enforce_minimum_break: true,
  enforce_maximum_break: true,
  break_too_short_action: 'block',
  break_too_long_action: 'alert_hr',
  break_too_long_threshold_minutes: 5,
  required_break_after_hours: 6,
  auto_deduct_unpaid_break: false,
  auto_deduct_duration_minutes: 30,
  applicable_departments: [],
  applicable_roles: [],
};

export default function BreakSettingsScreen() {
  const { colors } = useTheme();
  const { employee } = useUser();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSettings, setEditingSettings] = useState<BreakSettings | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const { data: settingsList = [], isLoading, refetch } = useBreakSettings();
  const createMutation = useCreateBreakSettings();
  const updateMutation = useUpdateBreakSettings();
  const deleteMutation = useDeleteBreakSettings();

  const handleCreate = useCallback(() => {
    setEditingSettings(null);
    setFormData(defaultFormData);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((settings: BreakSettings) => {
    setEditingSettings(settings);
    setFormData({
      name: settings.name,
      description: settings.description || '',
      is_default: settings.is_default,
      is_active: settings.is_active,
      paid_break_durations: settings.paid_break_durations,
      max_paid_breaks_per_shift: settings.max_paid_breaks_per_shift,
      paid_break_auto_deduct: settings.paid_break_auto_deduct,
      unpaid_break_durations: settings.unpaid_break_durations,
      min_unpaid_break_minutes: settings.min_unpaid_break_minutes,
      max_unpaid_break_minutes: settings.max_unpaid_break_minutes,
      unpaid_break_buffer_minutes: settings.unpaid_break_buffer_minutes,
      early_return_grace_minutes: settings.early_return_grace_minutes,
      enforce_minimum_break: settings.enforce_minimum_break,
      enforce_maximum_break: settings.enforce_maximum_break,
      break_too_short_action: settings.break_too_short_action,
      break_too_long_action: settings.break_too_long_action,
      break_too_long_threshold_minutes: settings.break_too_long_threshold_minutes,
      required_break_after_hours: settings.required_break_after_hours,
      auto_deduct_unpaid_break: settings.auto_deduct_unpaid_break,
      auto_deduct_duration_minutes: settings.auto_deduct_duration_minutes,
      applicable_departments: settings.applicable_departments,
      applicable_roles: settings.applicable_roles,
    });
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((settings: BreakSettings) => {
    if (settings.is_default) {
      Alert.alert('Cannot Delete', 'Default settings cannot be deleted. Set another configuration as default first.');
      return;
    }

    Alert.alert(
      'Delete Settings',
      `Are you sure you want to delete "${settings.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(settings.id);
              Alert.alert('Success', 'Settings deleted');
            } catch {
              Alert.alert('Error', 'Failed to delete settings');
            }
          },
        },
      ]
    );
  }, [deleteMutation]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter a name for this configuration');
      return;
    }

    try {
      if (editingSettings) {
        await updateMutation.mutateAsync({
          settingsId: editingSettings.id,
          updates: formData,
        });
        Alert.alert('Success', 'Settings updated');
      } else {
        await createMutation.mutateAsync({
          ...formData,
          created_by: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
          created_by_id: employee?.id,
        });
        Alert.alert('Success', 'Settings created');
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  }, [formData, editingSettings, employee, createMutation, updateMutation]);

  const toggleDuration = useCallback((type: 'paid' | 'unpaid', duration: number) => {
    const key = type === 'paid' ? 'paid_break_durations' : 'unpaid_break_durations';
    const current = formData[key];
    
    if (current.includes(duration)) {
      setFormData(prev => ({
        ...prev,
        [key]: current.filter(d => d !== duration),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [key]: [...current, duration].sort((a, b) => a - b),
      }));
    }
  }, [formData]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    headerCount: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 4,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    list: {
      padding: 16,
    },
    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    defaultCard: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    cardTitle: {
      flex: 1,
    },
    settingsName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    settingsDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    badges: {
      flexDirection: 'row',
      gap: 6,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    defaultBadge: {
      backgroundColor: '#DBEAFE',
    },
    activeBadge: {
      backgroundColor: '#D1FAE5',
    },
    inactiveBadge: {
      backgroundColor: '#FEE2E2',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    cardBody: {
      gap: 12,
    },
    breakSection: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
    },
    breakSectionTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    durationChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    durationChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    paidChip: {
      backgroundColor: '#DBEAFE',
    },
    unpaidChip: {
      backgroundColor: '#FEF3C7',
    },
    durationChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.text,
    },
    rulesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ruleItem: {
      flex: 1,
    },
    ruleLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    ruleValue: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginTop: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '95%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    modalBody: {
      padding: 20,
    },
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    textAreaInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    switchLabel: {
      flex: 1,
    },
    switchTitle: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.text,
    },
    switchDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    durationSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    durationOption: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    durationOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    durationOptionText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    durationOptionTextSelected: {
      color: colors.primary,
    },
    actionSelector: {
      flexDirection: 'row',
      gap: 8,
    },
    actionOption: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    actionOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    actionOptionText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    actionOptionTextSelected: {
      color: colors.primary,
    },
    numberInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    numberInputField: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      width: 80,
      textAlign: 'center',
    },
    numberInputUnit: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Break Settings',
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Break Configurations</Text>
            <Text style={styles.headerCount}>{settingsList.length}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : settingsList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Settings size={48} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>
            No break settings configured.{'\n'}Create your first configuration to get started.
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Create Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {settingsList.map((settings) => (
            <View
              key={settings.id}
              style={[styles.settingsCard, settings.is_default && styles.defaultCard]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <Text style={styles.settingsName}>{settings.name}</Text>
                  {settings.description && (
                    <Text style={styles.settingsDescription}>{settings.description}</Text>
                  )}
                </View>
                <View style={styles.badges}>
                  {settings.is_default && (
                    <View style={[styles.badge, styles.defaultBadge]}>
                      <Star size={12} color="#3B82F6" />
                      <Text style={[styles.badgeText, { color: '#3B82F6' }]}>Default</Text>
                    </View>
                  )}
                  <View style={[styles.badge, settings.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.badgeText, { color: settings.is_active ? '#059669' : '#DC2626' }]}>
                      {settings.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.breakSection}>
                  <Text style={styles.breakSectionTitle}>Paid Break Options</Text>
                  <View style={styles.durationChips}>
                    {settings.paid_break_durations.map(d => (
                      <View key={d} style={[styles.durationChip, styles.paidChip]}>
                        <Text style={styles.durationChipText}>{d} min</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.breakSection}>
                  <Text style={styles.breakSectionTitle}>Unpaid Break Options</Text>
                  <View style={styles.durationChips}>
                    {settings.unpaid_break_durations.map(d => (
                      <View key={d} style={[styles.durationChip, styles.unpaidChip]}>
                        <Text style={styles.durationChipText}>{d} min</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.rulesRow}>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleLabel}>Min Unpaid Break</Text>
                    <Text style={styles.ruleValue}>{settings.min_unpaid_break_minutes} min</Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleLabel}>Buffer</Text>
                    <Text style={styles.ruleValue}>{settings.unpaid_break_buffer_minutes} min</Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleLabel}>Too Long Action</Text>
                    <Text style={styles.ruleValue}>
                      {settings.break_too_long_action === 'alert_hr' ? 'Alert HR' : 
                       settings.break_too_long_action === 'warn' ? 'Warn' : 'Allow'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleEdit(settings)}
                >
                  <Edit2 size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDelete(settings)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSettings ? 'Edit Break Settings' : 'New Break Settings'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Basic Info</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Standard Break Policy"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="Optional description..."
                    placeholderTextColor={colors.textSecondary}
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    multiline
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>Set as Default</Text>
                    <Text style={styles.switchDescription}>Use for all employees unless overridden</Text>
                  </View>
                  <Switch
                    value={formData.is_default}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, is_default: val }))}
                    trackColor={{ true: colors.primary }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>Active</Text>
                    <Text style={styles.switchDescription}>Enable this configuration</Text>
                  </View>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, is_active: val }))}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Paid Break Options</Text>
                <Text style={styles.inputLabel}>Available Durations (tap to toggle)</Text>
                <View style={styles.durationSelector}>
                  {[5, 10, 15, 20].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.durationOption,
                        formData.paid_break_durations.includes(d) && styles.durationOptionSelected,
                      ]}
                      onPress={() => toggleDuration('paid', d)}
                    >
                      <Text
                        style={[
                          styles.durationOptionText,
                          formData.paid_break_durations.includes(d) && styles.durationOptionTextSelected,
                        ]}
                      >
                        {d} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Unpaid Break Options</Text>
                <Text style={styles.inputLabel}>Available Durations (tap to toggle)</Text>
                <View style={styles.durationSelector}>
                  {[30, 45, 60, 90].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.durationOption,
                        formData.unpaid_break_durations.includes(d) && styles.durationOptionSelected,
                      ]}
                      onPress={() => toggleDuration('unpaid', d)}
                    >
                      <Text
                        style={[
                          styles.durationOptionText,
                          formData.unpaid_break_durations.includes(d) && styles.durationOptionTextSelected,
                        ]}
                      >
                        {d} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Break Rules</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Minimum Unpaid Break</Text>
                  <View style={styles.numberInput}>
                    <TextInput
                      style={styles.numberInputField}
                      keyboardType="number-pad"
                      value={String(formData.min_unpaid_break_minutes)}
                      onChangeText={(text) => setFormData(prev => ({
                        ...prev,
                        min_unpaid_break_minutes: parseInt(text) || 0,
                      }))}
                    />
                    <Text style={styles.numberInputUnit}>minutes</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Buffer Before &quot;Too Long&quot;</Text>
                  <View style={styles.numberInput}>
                    <TextInput
                      style={styles.numberInputField}
                      keyboardType="number-pad"
                      value={String(formData.unpaid_break_buffer_minutes)}
                      onChangeText={(text) => setFormData(prev => ({
                        ...prev,
                        unpaid_break_buffer_minutes: parseInt(text) || 0,
                      }))}
                    />
                    <Text style={styles.numberInputUnit}>minutes grace</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Break Too Short Action</Text>
                  <View style={styles.actionSelector}>
                    {(['block', 'warn', 'allow'] as const).map(action => (
                      <TouchableOpacity
                        key={action}
                        style={[
                          styles.actionOption,
                          formData.break_too_short_action === action && styles.actionOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, break_too_short_action: action }))}
                      >
                        <Text
                          style={[
                            styles.actionOptionText,
                            formData.break_too_short_action === action && styles.actionOptionTextSelected,
                          ]}
                        >
                          {action === 'block' ? 'Block' : action === 'warn' ? 'Warn' : 'Allow'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Break Too Long Action</Text>
                  <View style={styles.actionSelector}>
                    {(['alert_hr', 'warn', 'allow'] as const).map(action => (
                      <TouchableOpacity
                        key={action}
                        style={[
                          styles.actionOption,
                          formData.break_too_long_action === action && styles.actionOptionSelected,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, break_too_long_action: action }))}
                      >
                        <Text
                          style={[
                            styles.actionOptionText,
                            formData.break_too_long_action === action && styles.actionOptionTextSelected,
                          ]}
                        >
                          {action === 'alert_hr' ? 'Alert HR' : action === 'warn' ? 'Warn' : 'Allow'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>Enforce Minimum Break</Text>
                    <Text style={styles.switchDescription}>Block early returns from unpaid breaks</Text>
                  </View>
                  <Switch
                    value={formData.enforce_minimum_break}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, enforce_minimum_break: val }))}
                    trackColor={{ true: colors.primary }}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>Enforce Maximum Break</Text>
                    <Text style={styles.switchDescription}>Alert HR when breaks exceed duration</Text>
                  </View>
                  <Switch
                    value={formData.enforce_maximum_break}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, enforce_maximum_break: val }))}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
