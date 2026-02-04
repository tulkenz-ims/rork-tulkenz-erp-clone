import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Thermometer,
  ChevronDown,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCCPMonitoringLogs, CCPMonitoringLogInsert } from '@/hooks/useCCPMonitoringLogs';
import * as Haptics from 'expo-haptics';

const CCP_TYPES = [
  { value: 'cooking', label: 'Cooking', icon: '🔥' },
  { value: 'cooling', label: 'Cooling', icon: '❄️' },
  { value: 'hot_holding', label: 'Hot Holding', icon: '♨️' },
  { value: 'cold_holding', label: 'Cold Holding', icon: '🧊' },
  { value: 'receiving', label: 'Receiving', icon: '📦' },
  { value: 'metal_detection', label: 'Metal Detection', icon: '🔍' },
  { value: 'other', label: 'Other', icon: '📋' },
] as const;

const CCP_PRESETS = [
  { ccpNumber: 'CCP-1', ccpName: 'Cooking - Internal Temp', ccpType: 'cooking' as const, processStep: 'Cooking', criticalLimitMin: 165, criticalLimitMax: null, unit: '°F', target: 165 },
  { ccpNumber: 'CCP-2', ccpName: 'Cooling - 2hr Check', ccpType: 'cooling' as const, processStep: 'Cooling', criticalLimitMin: null, criticalLimitMax: 70, unit: '°F', target: 70 },
  { ccpNumber: 'CCP-3', ccpName: 'Cooling - 4hr Check', ccpType: 'cooling' as const, processStep: 'Cooling', criticalLimitMin: null, criticalLimitMax: 41, unit: '°F', target: 41 },
  { ccpNumber: 'CCP-4', ccpName: 'Hot Holding', ccpType: 'hot_holding' as const, processStep: 'Hot Holding', criticalLimitMin: 135, criticalLimitMax: null, unit: '°F', target: 140 },
  { ccpNumber: 'CCP-5', ccpName: 'Cold Holding', ccpType: 'cold_holding' as const, processStep: 'Cold Holding', criticalLimitMin: null, criticalLimitMax: 41, unit: '°F', target: 38 },
  { ccpNumber: 'CCP-6', ccpName: 'Receiving Temp', ccpType: 'receiving' as const, processStep: 'Receiving', criticalLimitMin: null, criticalLimitMax: 41, unit: '°F', target: 40 },
];

const MONITORING_FREQUENCIES = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'every_15_min', label: 'Every 15 min' },
  { value: 'every_30_min', label: 'Every 30 min' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'per_batch', label: 'Per Batch' },
  { value: 'per_lot', label: 'Per Lot' },
] as const;

const DISPOSITIONS = [
  { value: 'released', label: 'Released' },
  { value: 'held', label: 'Held' },
  { value: 'reworked', label: 'Reworked' },
  { value: 'destroyed', label: 'Destroyed' },
  { value: 'returned', label: 'Returned' },
  { value: 'n/a', label: 'N/A' },
] as const;

export default function CCPLogScreen() {
  const { colors } = useTheme();
  const { user, organizationId } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const dateFilter = filterDate === 'today' ? todayStr : undefined;
  
  const { logs, isLoading, refetch, createLog, isCreating } = useCCPMonitoringLogs(dateFilter);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<typeof CCP_PRESETS[0] | null>(null);
  const [actualValue, setActualValue] = useState('');
  const [productName, setProductName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [disposition, setDisposition] = useState<typeof DISPOSITIONS[number]['value'] | ''>('');
  const [notes, setNotes] = useState('');
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showDispositionPicker, setShowDispositionPicker] = useState(false);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const todayLogs = logs.filter(l => l.monitoring_date === todayStr);
    return {
      total: todayLogs.length,
      withinLimits: todayLogs.filter(l => l.is_within_limits).length,
      deviations: todayLogs.filter(l => l.deviation_occurred).length,
      pending: CCP_PRESETS.length - todayLogs.length,
    };
  }, [logs, todayStr]);

  const checkWithinLimits = useCallback((value: number, min: number | null, max: number | null): boolean => {
    if (min !== null && value < min) return false;
    if (max !== null && value > max) return false;
    return true;
  }, []);

  const currentValueStatus = useMemo(() => {
    if (!selectedPreset || !actualValue) return null;
    const value = parseFloat(actualValue);
    if (isNaN(value)) return null;
    return checkWithinLimits(value, selectedPreset.criticalLimitMin, selectedPreset.criticalLimitMax);
  }, [selectedPreset, actualValue, checkWithinLimits]);

  const handleAddLog = useCallback(async () => {
    if (!selectedPreset || !actualValue || !organizationId) {
      Alert.alert('Required Fields', 'Please select a CCP and enter the actual value.');
      return;
    }

    const value = parseFloat(actualValue);
    if (isNaN(value)) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }

    const withinLimits = checkWithinLimits(value, selectedPreset.criticalLimitMin, selectedPreset.criticalLimitMax);
    const deviationOccurred = !withinLimits;

    if (deviationOccurred && !correctiveAction.trim()) {
      Alert.alert('Corrective Action Required', 'Value is out of critical limits. Please document the corrective action taken.');
      return;
    }

    if (deviationOccurred && !disposition) {
      Alert.alert('Disposition Required', 'Please select the product disposition for this deviation.');
      return;
    }

    const now = new Date();
    const newLog: CCPMonitoringLogInsert = {
      organization_id: organizationId,
      facility_id: null,
      ccp_number: selectedPreset.ccpNumber,
      ccp_name: selectedPreset.ccpName,
      ccp_type: selectedPreset.ccpType,
      process_step: selectedPreset.processStep,
      monitoring_date: todayStr,
      monitoring_time: now.toTimeString().slice(0, 5),
      monitoring_frequency: 'hourly',
      critical_limit_min: selectedPreset.criticalLimitMin,
      critical_limit_max: selectedPreset.criticalLimitMax,
      critical_limit_unit: selectedPreset.unit,
      target_value: selectedPreset.target,
      actual_value: value,
      is_within_limits: withinLimits,
      product_name: productName || null,
      product_code: null,
      lot_number: lotNumber || null,
      batch_number: null,
      equipment_id: null,
      equipment_name: null,
      equipment_tag: null,
      deviation_occurred: deviationOccurred,
      corrective_action_taken: correctiveAction || null,
      corrective_action_time: deviationOccurred ? now.toISOString() : null,
      product_disposition: deviationOccurred ? (disposition as typeof DISPOSITIONS[number]['value']) : 'n/a',
      verified_by: null,
      verified_by_id: null,
      verified_at: null,
      verification_method: null,
      recorded_by: user?.name || 'Unknown',
      recorded_by_id: user?.id || null,
      status: deviationOccurred ? 'flagged' : 'recorded',
      notes: notes || null,
      attachments: [],
    };

    try {
      await createLog(newLog);
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(
        withinLimits
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      console.log('[CCPLog] Added:', selectedPreset.ccpNumber, value, withinLimits ? 'PASS' : 'DEVIATION');
    } catch (error) {
      console.error('[CCPLog] Create error:', error);
      Alert.alert('Error', 'Failed to save CCP log. Please try again.');
    }
  }, [selectedPreset, actualValue, productName, lotNumber, correctiveAction, disposition, notes, organizationId, user, todayStr, checkWithinLimits, createLog]);

  const resetForm = () => {
    setSelectedPreset(null);
    setActualValue('');
    setProductName('');
    setLotNumber('');
    setCorrectiveAction('');
    setDisposition('');
    setNotes('');
  };

  const groupedLogs = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    logs.forEach(log => {
      const key = log.ccp_type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  }, [logs]);

  const getCCPTypeInfo = (type: string) => {
    return CCP_TYPES.find(t => t.value === type) || { label: type, icon: '📋' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EF4444' + '20' }]}>
            <Target size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>CCP Monitoring Log</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Monitor critical control points and document deviations
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recorded</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.withinLimits}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Within Limits</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.deviations}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Deviations</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterButtons}>
            <Pressable
              style={[
                styles.filterButton,
                { borderColor: filterDate === 'today' ? colors.primary : colors.border },
                filterDate === 'today' && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setFilterDate('today')}
            >
              <Text style={[styles.filterText, { color: filterDate === 'today' ? colors.primary : colors.text }]}>
                Today
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                { borderColor: filterDate === 'all' ? colors.primary : colors.border },
                filterDate === 'all' && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setFilterDate('all')}
            >
              <Text style={[styles.filterText, { color: filterDate === 'all' ? colors.primary : colors.text }]}>
                All Records
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Log CCP</Text>
          </Pressable>
        </View>

        {isLoading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading CCP logs...</Text>
          </View>
        ) : (
          Object.entries(groupedLogs).map(([type, typeLogs]) => {
            const typeInfo = getCCPTypeInfo(type);
            return (
              <View key={type} style={styles.typeSection}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>
                  {typeInfo.icon} {typeInfo.label}
                </Text>
                {typeLogs.map(log => (
                  <View
                    key={log.id}
                    style={[
                      styles.logCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: log.deviation_occurred ? '#EF4444' : colors.border,
                        borderLeftWidth: 3,
                        borderLeftColor: log.is_within_limits ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    <View style={styles.logHeader}>
                      <View style={styles.ccpInfo}>
                        <Text style={[styles.ccpNumber, { color: colors.text }]}>{log.ccp_number}</Text>
                        <Text style={[styles.ccpName, { color: colors.textSecondary }]}>{log.ccp_name}</Text>
                        <View style={styles.timeRow}>
                          <Clock size={12} color={colors.textTertiary} />
                          <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                            {log.monitoring_date} at {log.monitoring_time}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.valueDisplay}>
                        <Text
                          style={[
                            styles.actualValue,
                            { color: log.is_within_limits ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {log.actual_value}{log.critical_limit_unit}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: log.is_within_limits
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            },
                          ]}
                        >
                          {log.is_within_limits ? (
                            <CheckCircle size={12} color="#10B981" />
                          ) : (
                            <AlertTriangle size={12} color="#EF4444" />
                          )}
                          <Text
                            style={[
                              styles.statusText,
                              { color: log.is_within_limits ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            {log.is_within_limits ? 'PASS' : 'DEVIATION'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.limitsRow}>
                      <Text style={[styles.limitsText, { color: colors.textSecondary }]}>
                        Critical Limits: {log.critical_limit_min !== null ? `≥${log.critical_limit_min}` : ''} 
                        {log.critical_limit_min !== null && log.critical_limit_max !== null ? ' and ' : ''}
                        {log.critical_limit_max !== null ? `≤${log.critical_limit_max}` : ''}{log.critical_limit_unit}
                      </Text>
                    </View>

                    {log.product_name && (
                      <View style={styles.productRow}>
                        <FileText size={12} color={colors.textTertiary} />
                        <Text style={[styles.productText, { color: colors.textSecondary }]}>
                          {log.product_name} {log.lot_number ? `(Lot: ${log.lot_number})` : ''}
                        </Text>
                      </View>
                    )}

                    {log.corrective_action_taken && (
                      <View style={[styles.correctiveBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={[styles.correctiveLabel, { color: '#EF4444' }]}>Corrective Action:</Text>
                        <Text style={[styles.correctiveText, { color: colors.text }]}>
                          {log.corrective_action_taken}
                        </Text>
                        {log.product_disposition && log.product_disposition !== 'n/a' && (
                          <Text style={[styles.dispositionText, { color: colors.textSecondary }]}>
                            Disposition: {log.product_disposition.toUpperCase()}
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={styles.recordedBy}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[styles.recordedByText, { color: colors.textTertiary }]}>
                        Recorded by {log.recorded_by}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}

        {!isLoading && logs.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Target size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No CCP Logs</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterDate === 'today' ? 'No CCP monitoring recorded today' : 'No CCP logs found'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log CCP Monitoring</Text>
            <Pressable onPress={handleAddLog} disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Select CCP *</Text>
            <Pressable
              style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowPresetPicker(true)}
            >
              <Text style={[styles.pickerText, { color: selectedPreset ? colors.text : colors.textTertiary }]}>
                {selectedPreset ? `${selectedPreset.ccpNumber} - ${selectedPreset.ccpName}` : 'Select CCP...'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>

            {selectedPreset && (
              <>
                <View style={[styles.presetInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.presetInfoText, { color: colors.textSecondary }]}>
                    Process: {selectedPreset.processStep}
                  </Text>
                  <Text style={[styles.presetInfoText, { color: colors.textSecondary }]}>
                    Critical Limits: {selectedPreset.criticalLimitMin !== null ? `≥${selectedPreset.criticalLimitMin}` : ''}
                    {selectedPreset.criticalLimitMin !== null && selectedPreset.criticalLimitMax !== null ? ' and ' : ''}
                    {selectedPreset.criticalLimitMax !== null ? `≤${selectedPreset.criticalLimitMax}` : ''}{selectedPreset.unit}
                  </Text>
                  <Text style={[styles.presetInfoText, { color: colors.textSecondary }]}>
                    Target: {selectedPreset.target}{selectedPreset.unit}
                  </Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>
                  Actual Value ({selectedPreset.unit}) *
                </Text>
                <View style={styles.valueInputRow}>
                  <TextInput
                    style={[
                      styles.valueInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          currentValueStatus === false
                            ? '#EF4444'
                            : currentValueStatus === true
                            ? '#10B981'
                            : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter value"
                    placeholderTextColor={colors.textTertiary}
                    value={actualValue}
                    onChangeText={setActualValue}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>{selectedPreset.unit}</Text>
                  {currentValueStatus !== null && (
                    <View
                      style={[
                        styles.valueStatusIndicator,
                        {
                          backgroundColor: currentValueStatus
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        },
                      ]}
                    >
                      {currentValueStatus ? (
                        <CheckCircle size={20} color="#10B981" />
                      ) : (
                        <AlertTriangle size={20} color="#EF4444" />
                      )}
                    </View>
                  )}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Product Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter product name"
                  placeholderTextColor={colors.textTertiary}
                  value={productName}
                  onChangeText={setProductName}
                />

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Lot/Batch Number</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter lot number"
                  placeholderTextColor={colors.textTertiary}
                  value={lotNumber}
                  onChangeText={setLotNumber}
                />

                {currentValueStatus === false && (
                  <>
                    <Text style={[styles.inputLabel, { color: '#EF4444', marginTop: 16 }]}>
                      Corrective Action Taken *
                    </Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF4444', color: colors.text }]}
                      placeholder="Document corrective action..."
                      placeholderTextColor={colors.textTertiary}
                      value={correctiveAction}
                      onChangeText={setCorrectiveAction}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    <Text style={[styles.inputLabel, { color: '#EF4444', marginTop: 16 }]}>Product Disposition *</Text>
                    <Pressable
                      style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: '#EF4444' }]}
                      onPress={() => setShowDispositionPicker(true)}
                    >
                      <Text style={[styles.pickerText, { color: disposition ? colors.text : colors.textTertiary }]}>
                        {disposition ? DISPOSITIONS.find(d => d.value === disposition)?.label : 'Select disposition...'}
                      </Text>
                      <ChevronDown size={20} color={colors.textSecondary} />
                    </Pressable>
                  </>
                )}

                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Notes</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showPresetPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowPresetPicker(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select CCP</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {CCP_PRESETS.map((preset, index) => (
              <Pressable
                key={index}
                style={[
                  styles.presetOption,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selectedPreset?.ccpNumber === preset.ccpNumber ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedPreset(preset);
                  setShowPresetPicker(false);
                }}
              >
                <View style={styles.presetOptionContent}>
                  <Text style={[styles.presetOptionNumber, { color: colors.primary }]}>{preset.ccpNumber}</Text>
                  <Text style={[styles.presetOptionName, { color: colors.text }]}>{preset.ccpName}</Text>
                  <Text style={[styles.presetOptionLimits, { color: colors.textSecondary }]}>
                    {preset.criticalLimitMin !== null ? `≥${preset.criticalLimitMin}` : ''}
                    {preset.criticalLimitMin !== null && preset.criticalLimitMax !== null ? ' and ' : ''}
                    {preset.criticalLimitMax !== null ? `≤${preset.criticalLimitMax}` : ''}{preset.unit}
                  </Text>
                </View>
                <Thermometer size={20} color={colors.textTertiary} />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDispositionPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDispositionPicker(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Disposition</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {DISPOSITIONS.map((d) => (
              <Pressable
                key={d.value}
                style={[
                  styles.dispositionOption,
                  {
                    backgroundColor: colors.surface,
                    borderColor: disposition === d.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setDisposition(d.value);
                  setShowDispositionPicker(false);
                }}
              >
                <Text style={[styles.dispositionOptionText, { color: colors.text }]}>{d.label}</Text>
                {disposition === d.value && <CheckCircle size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2, textAlign: 'center' as const },
  filterRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  filterButtons: { flexDirection: 'row' as const, gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  loadingText: { marginTop: 12, fontSize: 14 },
  typeSection: { marginBottom: 20 },
  typeTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10 },
  logCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  logHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  ccpInfo: { flex: 1 },
  ccpNumber: { fontSize: 14, fontWeight: '700' as const, marginBottom: 2 },
  ccpName: { fontSize: 12, marginBottom: 4 },
  timeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  timeText: { fontSize: 11 },
  valueDisplay: { alignItems: 'flex-end' as const },
  actualValue: { fontSize: 22, fontWeight: '700' as const },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' as const },
  limitsRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  limitsText: { fontSize: 12 },
  productRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 8 },
  productText: { fontSize: 12 },
  correctiveBox: { marginTop: 10, padding: 10, borderRadius: 8 },
  correctiveLabel: { fontSize: 11, fontWeight: '600' as const, marginBottom: 4 },
  correctiveText: { fontSize: 12, lineHeight: 18 },
  dispositionText: { fontSize: 11, marginTop: 6, fontWeight: '500' as const },
  recordedBy: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 10 },
  recordedByText: { fontSize: 11 },
  emptyState: { borderRadius: 12, padding: 32, alignItems: 'center' as const, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  pickerButton: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerText: { fontSize: 15 },
  presetInfo: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  presetInfoText: { fontSize: 13, marginBottom: 4 },
  valueInputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  valueInput: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '600' as const,
  },
  unitText: { fontSize: 18, fontWeight: '500' as const },
  valueStatusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  textInput: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80 },
  presetOption: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  presetOptionContent: { flex: 1 },
  presetOptionNumber: { fontSize: 14, fontWeight: '700' as const, marginBottom: 2 },
  presetOptionName: { fontSize: 14, marginBottom: 2 },
  presetOptionLimits: { fontSize: 12 },
  dispositionOption: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  dispositionOptionText: { fontSize: 16 },
});
