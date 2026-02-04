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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  ChevronDown,
  Shield,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMetalDetectorLogs, MetalDetectorLogInsert } from '@/hooks/useMetalDetectorLogs';
import * as Haptics from 'expo-haptics';

const DETECTORS = [
  { id: 'MD-001', name: 'Metal Detector #1', location: 'Line 1 - End of Line', line: 'L1' },
  { id: 'MD-002', name: 'Metal Detector #2', location: 'Line 2 - End of Line', line: 'L2' },
  { id: 'MD-003', name: 'Metal Detector #3', location: 'Line 3 - End of Line', line: 'L3' },
  { id: 'MD-004', name: 'Metal Detector #4', location: 'Raw Materials Receiving', line: null },
];

const CHECK_TYPES = [
  { value: 'startup', label: 'Startup Verification' },
  { value: 'hourly', label: 'Hourly Check' },
  { value: 'lot_change', label: 'Lot Change' },
  { value: 'product_change', label: 'Product Change' },
  { value: 'shutdown', label: 'Shutdown Check' },
  { value: 'after_reject', label: 'After Reject' },
  { value: 'verification', label: 'Verification Only' },
] as const;

const DEFAULT_STANDARDS = {
  ferrous: 1.5,
  nonFerrous: 2.0,
  stainless: 2.5,
};

export default function MetalDetectorLogScreen() {
  const { colors } = useTheme();
  const { user, organizationId } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const dateFilter = filterDate === 'today' ? todayStr : undefined;

  const { logs, isLoading, refetch, createLog, isCreating } = useMetalDetectorLogs(dateFilter);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetector, setSelectedDetector] = useState<typeof DETECTORS[0] | null>(null);
  const [checkType, setCheckType] = useState<typeof CHECK_TYPES[number]['value'] | ''>('');
  const [productName, setProductName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [ferrousDetected, setFerrousDetected] = useState(true);
  const [nonFerrousDetected, setNonFerrousDetected] = useState(true);
  const [stainlessDetected, setStainlessDetected] = useState(true);
  const [rejectSystemTested, setRejectSystemTested] = useState(false);
  const [rejectSystemFunctional, setRejectSystemFunctional] = useState(true);
  const [rejectBinChecked, setRejectBinChecked] = useState(false);
  const [rejectBinEmpty, setRejectBinEmpty] = useState(true);
  const [rejectsFound, setRejectsFound] = useState('0');
  const [failureReason, setFailureReason] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [notes, setNotes] = useState('');
  const [showDetectorPicker, setShowDetectorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const todayLogs = logs.filter(l => l.check_date === todayStr);
    return {
      total: todayLogs.length,
      pass: todayLogs.filter(l => l.status === 'pass').length,
      fail: todayLogs.filter(l => l.test_failed).length,
      corrected: todayLogs.filter(l => l.status === 'corrected').length,
    };
  }, [logs, todayStr]);

  const allStandardsDetected = ferrousDetected && nonFerrousDetected && stainlessDetected;
  const testFailed = !allStandardsDetected || (rejectSystemTested && !rejectSystemFunctional);

  const handleAddLog = useCallback(async () => {
    if (!selectedDetector || !checkType || !organizationId) {
      Alert.alert('Required Fields', 'Please select detector and check type.');
      return;
    }

    if (testFailed && !correctiveAction.trim()) {
      Alert.alert('Corrective Action Required', 'Test failed. Please document the corrective action taken.');
      return;
    }

    const now = new Date();
    const newLog: MetalDetectorLogInsert = {
      organization_id: organizationId,
      facility_id: null,
      detector_id: selectedDetector.id,
      detector_name: selectedDetector.name,
      detector_location: selectedDetector.location,
      line_number: selectedDetector.line,
      check_date: todayStr,
      check_time: now.toTimeString().slice(0, 5),
      check_type: checkType,
      product_name: productName || null,
      product_code: null,
      lot_number: lotNumber || null,
      ferrous_standard_size: DEFAULT_STANDARDS.ferrous,
      non_ferrous_standard_size: DEFAULT_STANDARDS.nonFerrous,
      stainless_standard_size: DEFAULT_STANDARDS.stainless,
      standard_unit: 'mm',
      ferrous_detected: ferrousDetected,
      non_ferrous_detected: nonFerrousDetected,
      stainless_detected: stainlessDetected,
      all_standards_detected: allStandardsDetected,
      sensitivity_ferrous: null,
      sensitivity_non_ferrous: null,
      sensitivity_stainless: null,
      reject_system_tested: rejectSystemTested,
      reject_system_functional: rejectSystemTested ? rejectSystemFunctional : null,
      reject_bin_checked: rejectBinChecked,
      reject_bin_empty: rejectBinChecked ? rejectBinEmpty : null,
      rejects_found: parseInt(rejectsFound) || 0,
      test_failed: testFailed,
      failure_reason: testFailed ? failureReason : null,
      corrective_action: testFailed ? correctiveAction : null,
      corrective_action_time: testFailed ? now.toISOString() : null,
      products_held_from: null,
      products_held_to: null,
      retest_passed: null,
      retest_time: null,
      tested_by: user?.name || 'Unknown',
      tested_by_id: user?.id || null,
      verified_by: null,
      verified_by_id: null,
      verified_at: null,
      status: testFailed ? (correctiveAction ? 'corrected' : 'fail') : 'pass',
      notes: notes || null,
      attachments: [],
    };

    try {
      await createLog(newLog);
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(
        !testFailed
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      console.log('[MetalDetectorLog] Added:', selectedDetector.id, testFailed ? 'FAIL' : 'PASS');
    } catch (error) {
      console.error('[MetalDetectorLog] Create error:', error);
      Alert.alert('Error', 'Failed to save log. Please try again.');
    }
  }, [selectedDetector, checkType, productName, lotNumber, ferrousDetected, nonFerrousDetected, stainlessDetected, allStandardsDetected, rejectSystemTested, rejectSystemFunctional, rejectBinChecked, rejectBinEmpty, rejectsFound, testFailed, failureReason, correctiveAction, notes, organizationId, user, todayStr, createLog]);

  const resetForm = () => {
    setSelectedDetector(null);
    setCheckType('');
    setProductName('');
    setLotNumber('');
    setFerrousDetected(true);
    setNonFerrousDetected(true);
    setStainlessDetected(true);
    setRejectSystemTested(false);
    setRejectSystemFunctional(true);
    setRejectBinChecked(false);
    setRejectBinEmpty(true);
    setRejectsFound('0');
    setFailureReason('');
    setCorrectiveAction('');
    setNotes('');
  };

  const getStatusColor = (status: string, failed: boolean) => {
    if (failed && status !== 'corrected') return '#EF4444';
    if (status === 'corrected') return '#F59E0B';
    return '#10B981';
  };

  const groupedByDetector = useMemo(() => {
    const groups: Record<string, typeof logs> = {};
    logs.forEach(log => {
      const key = log.detector_id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    return groups;
  }, [logs]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <Search size={28} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Metal Detector Log</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verify metal detector calibration and functionality
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tests</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.pass}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pass</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.corrected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Corrected</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.fail}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fail</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterButtons}>
            <Pressable
              style={[styles.filterButton, { borderColor: filterDate === 'today' ? colors.primary : colors.border }, filterDate === 'today' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setFilterDate('today')}
            >
              <Text style={[styles.filterText, { color: filterDate === 'today' ? colors.primary : colors.text }]}>Today</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, { borderColor: filterDate === 'all' ? colors.primary : colors.border }, filterDate === 'all' && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setFilterDate('all')}
            >
              <Text style={[styles.filterText, { color: filterDate === 'all' ? colors.primary : colors.text }]}>All Records</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => { setShowAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Log Test</Text>
          </Pressable>
        </View>

        {isLoading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading logs...</Text>
          </View>
        ) : (
          Object.entries(groupedByDetector).map(([detectorId, detectorLogs]) => (
            <View key={detectorId} style={styles.detectorSection}>
              <Text style={[styles.detectorTitle, { color: colors.text }]}>{detectorId}</Text>
              {detectorLogs.map(log => (
                <View
                  key={log.id}
                  style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: getStatusColor(log.status, log.test_failed) }]}
                >
                  <View style={styles.logHeader}>
                    <View style={styles.detectorInfo}>
                      <Text style={[styles.detectorName, { color: colors.text }]}>{log.detector_name}</Text>
                      <Text style={[styles.checkTypeText, { color: colors.textSecondary }]}>
                        {CHECK_TYPES.find(t => t.value === log.check_type)?.label}
                      </Text>
                      <View style={styles.timeRow}>
                        <Clock size={12} color={colors.textTertiary} />
                        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                          {log.check_date} at {log.check_time}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusDisplay}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.status, log.test_failed) + '20' }]}>
                        {log.status === 'pass' ? (
                          <CheckCircle size={14} color="#10B981" />
                        ) : log.status === 'corrected' ? (
                          <AlertTriangle size={14} color="#F59E0B" />
                        ) : (
                          <XCircle size={14} color="#EF4444" />
                        )}
                        <Text style={[styles.statusText, { color: getStatusColor(log.status, log.test_failed) }]}>
                          {log.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.standardsRow}>
                    <View style={[styles.standardItem, { backgroundColor: log.ferrous_detected ? '#10B981' + '20' : '#EF4444' + '20' }]}>
                      <Text style={[styles.standardLabel, { color: log.ferrous_detected ? '#10B981' : '#EF4444' }]}>Fe</Text>
                      <Text style={[styles.standardValue, { color: log.ferrous_detected ? '#10B981' : '#EF4444' }]}>
                        {log.ferrous_detected ? '✓' : '✗'}
                      </Text>
                    </View>
                    <View style={[styles.standardItem, { backgroundColor: log.non_ferrous_detected ? '#10B981' + '20' : '#EF4444' + '20' }]}>
                      <Text style={[styles.standardLabel, { color: log.non_ferrous_detected ? '#10B981' : '#EF4444' }]}>Non-Fe</Text>
                      <Text style={[styles.standardValue, { color: log.non_ferrous_detected ? '#10B981' : '#EF4444' }]}>
                        {log.non_ferrous_detected ? '✓' : '✗'}
                      </Text>
                    </View>
                    <View style={[styles.standardItem, { backgroundColor: log.stainless_detected ? '#10B981' + '20' : '#EF4444' + '20' }]}>
                      <Text style={[styles.standardLabel, { color: log.stainless_detected ? '#10B981' : '#EF4444' }]}>SS</Text>
                      <Text style={[styles.standardValue, { color: log.stainless_detected ? '#10B981' : '#EF4444' }]}>
                        {log.stainless_detected ? '✓' : '✗'}
                      </Text>
                    </View>
                    {log.reject_system_tested && (
                      <View style={[styles.standardItem, { backgroundColor: log.reject_system_functional ? '#10B981' + '20' : '#EF4444' + '20' }]}>
                        <Text style={[styles.standardLabel, { color: log.reject_system_functional ? '#10B981' : '#EF4444' }]}>Reject</Text>
                        <Text style={[styles.standardValue, { color: log.reject_system_functional ? '#10B981' : '#EF4444' }]}>
                          {log.reject_system_functional ? '✓' : '✗'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {log.corrective_action && (
                    <View style={[styles.correctiveBox, { backgroundColor: '#F59E0B' + '15' }]}>
                      <Text style={[styles.correctiveLabel, { color: '#F59E0B' }]}>Corrective Action:</Text>
                      <Text style={[styles.correctiveText, { color: colors.text }]}>{log.corrective_action}</Text>
                    </View>
                  )}

                  <View style={styles.recordedBy}>
                    <User size={12} color={colors.textTertiary} />
                    <Text style={[styles.recordedByText, { color: colors.textTertiary }]}>Tested by {log.tested_by}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {!isLoading && logs.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Logs</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterDate === 'today' ? 'No metal detector tests recorded today' : 'No logs found'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Metal Detector Test</Text>
            <Pressable onPress={handleAddLog} disabled={isCreating}>
              {isCreating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Metal Detector *</Text>
            <Pressable style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDetectorPicker(true)}>
              <Text style={[styles.pickerText, { color: selectedDetector ? colors.text : colors.textTertiary }]}>
                {selectedDetector ? `${selectedDetector.id} - ${selectedDetector.name}` : 'Select detector...'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Check Type *</Text>
            <Pressable style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTypePicker(true)}>
              <Text style={[styles.pickerText, { color: checkType ? colors.text : colors.textTertiary }]}>
                {checkType ? CHECK_TYPES.find(t => t.value === checkType)?.label : 'Select type...'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Product Name</Text>
            <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Enter product name" placeholderTextColor={colors.textTertiary} value={productName} onChangeText={setProductName} />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Lot Number</Text>
            <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Enter lot number" placeholderTextColor={colors.textTertiary} value={lotNumber} onChangeText={setLotNumber} />

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Test Standard Detection</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Standards: Fe {DEFAULT_STANDARDS.ferrous}mm, Non-Fe {DEFAULT_STANDARDS.nonFerrous}mm, SS {DEFAULT_STANDARDS.stainless}mm
            </Text>

            <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.testInfo}>
                <Text style={[styles.testLabel, { color: colors.text }]}>Ferrous Standard</Text>
                <Text style={[styles.testSize, { color: colors.textSecondary }]}>{DEFAULT_STANDARDS.ferrous}mm</Text>
              </View>
              <Switch value={ferrousDetected} onValueChange={setFerrousDetected} trackColor={{ false: '#EF4444', true: '#10B981' }} />
            </View>

            <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.testInfo}>
                <Text style={[styles.testLabel, { color: colors.text }]}>Non-Ferrous Standard</Text>
                <Text style={[styles.testSize, { color: colors.textSecondary }]}>{DEFAULT_STANDARDS.nonFerrous}mm</Text>
              </View>
              <Switch value={nonFerrousDetected} onValueChange={setNonFerrousDetected} trackColor={{ false: '#EF4444', true: '#10B981' }} />
            </View>

            <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.testInfo}>
                <Text style={[styles.testLabel, { color: colors.text }]}>Stainless Steel Standard</Text>
                <Text style={[styles.testSize, { color: colors.textSecondary }]}>{DEFAULT_STANDARDS.stainless}mm</Text>
              </View>
              <Switch value={stainlessDetected} onValueChange={setStainlessDetected} trackColor={{ false: '#EF4444', true: '#10B981' }} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Reject System</Text>

            <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.testLabel, { color: colors.text }]}>Reject System Tested</Text>
              <Switch value={rejectSystemTested} onValueChange={setRejectSystemTested} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>

            {rejectSystemTested && (
              <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.testLabel, { color: colors.text }]}>Reject System Functional</Text>
                <Switch value={rejectSystemFunctional} onValueChange={setRejectSystemFunctional} trackColor={{ false: '#EF4444', true: '#10B981' }} />
              </View>
            )}

            <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.testLabel, { color: colors.text }]}>Reject Bin Checked</Text>
              <Switch value={rejectBinChecked} onValueChange={setRejectBinChecked} trackColor={{ false: colors.border, true: colors.primary }} />
            </View>

            {rejectBinChecked && (
              <>
                <View style={[styles.testRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.testLabel, { color: colors.text }]}>Reject Bin Empty</Text>
                  <Switch value={rejectBinEmpty} onValueChange={setRejectBinEmpty} trackColor={{ false: '#F59E0B', true: '#10B981' }} />
                </View>
                {!rejectBinEmpty && (
                  <View style={[styles.rejectsInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.testLabel, { color: colors.text }]}>Rejects Found</Text>
                    <TextInput style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={rejectsFound} onChangeText={setRejectsFound} keyboardType="numeric" />
                  </View>
                )}
              </>
            )}

            {testFailed && (
              <>
                <Text style={[styles.inputLabel, { color: '#EF4444', marginTop: 16 }]}>Failure Reason</Text>
                <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF4444', color: colors.text }]} placeholder="Describe the failure..." placeholderTextColor={colors.textTertiary} value={failureReason} onChangeText={setFailureReason} multiline numberOfLines={2} textAlignVertical="top" />

                <Text style={[styles.inputLabel, { color: '#EF4444', marginTop: 16 }]}>Corrective Action *</Text>
                <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: '#EF4444', color: colors.text }]} placeholder="Document corrective action..." placeholderTextColor={colors.textTertiary} value={correctiveAction} onChangeText={setCorrectiveAction} multiline numberOfLines={3} textAlignVertical="top" />
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Notes</Text>
            <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Additional notes..." placeholderTextColor={colors.textTertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={2} textAlignVertical="top" />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetectorPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetectorPicker(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Detector</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {DETECTORS.map(detector => (
              <Pressable key={detector.id} style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: selectedDetector?.id === detector.id ? colors.primary : colors.border }]} onPress={() => { setSelectedDetector(detector); setShowDetectorPicker(false); }}>
                <View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{detector.id} - {detector.name}</Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{detector.location}</Text>
                </View>
                {selectedDetector?.id === detector.id && <CheckCircle size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showTypePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowTypePicker(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Check Type</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {CHECK_TYPES.map(type => (
              <Pressable key={type.value} style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: checkType === type.value ? colors.primary : colors.border }]} onPress={() => { setCheckType(type.value); setShowTypePicker(false); }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{type.label}</Text>
                {checkType === type.value && <CheckCircle size={20} color={colors.primary} />}
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
  headerCard: { borderRadius: 16, padding: 20, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' as const, borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  filterRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 16 },
  filterButtons: { flexDirection: 'row' as const, gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  addButton: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  loadingText: { marginTop: 12, fontSize: 14 },
  detectorSection: { marginBottom: 20 },
  detectorTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10 },
  logCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  logHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  detectorInfo: { flex: 1 },
  detectorName: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  checkTypeText: { fontSize: 12, marginBottom: 4 },
  timeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  timeText: { fontSize: 11 },
  statusDisplay: { alignItems: 'flex-end' as const },
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' as const },
  standardsRow: { flexDirection: 'row' as const, gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  standardItem: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' as const },
  standardLabel: { fontSize: 10, fontWeight: '600' as const },
  standardValue: { fontSize: 14, fontWeight: '700' as const },
  correctiveBox: { marginTop: 10, padding: 10, borderRadius: 8 },
  correctiveLabel: { fontSize: 11, fontWeight: '600' as const, marginBottom: 4 },
  correctiveText: { fontSize: 12, lineHeight: 18 },
  recordedBy: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 10 },
  recordedByText: { fontSize: 11 },
  emptyState: { borderRadius: 12, padding: 32, alignItems: 'center' as const, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  pickerButton: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1 },
  pickerText: { fontSize: 15 },
  textInput: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  testRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  testInfo: { flex: 1 },
  testLabel: { fontSize: 14 },
  testSize: { fontSize: 12, marginTop: 2 },
  rejectsInput: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  numberInput: { width: 60, height: 36, borderRadius: 8, borderWidth: 1, textAlign: 'center' as const, fontSize: 16 },
  optionRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  optionTitle: { fontSize: 15, fontWeight: '500' as const },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
});
