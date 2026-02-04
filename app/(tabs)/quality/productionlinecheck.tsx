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
  Factory,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  ChevronDown,
  Check,
  XCircle,
  Minus,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductionLineChecks, ProductionLineCheckInsert, CheckItem } from '@/hooks/useProductionLineChecks';
import * as Haptics from 'expo-haptics';

const PRODUCTION_LINES = [
  { number: 'L1', name: 'Line 1 - Packaging', area: 'Production Hall A' },
  { number: 'L2', name: 'Line 2 - Assembly', area: 'Production Hall A' },
  { number: 'L3', name: 'Line 3 - Processing', area: 'Production Hall B' },
  { number: 'L4', name: 'Line 4 - Filling', area: 'Production Hall B' },
  { number: 'L5', name: 'Line 5 - Labeling', area: 'Packaging Area' },
];

const CHECK_TYPES = [
  { value: 'startup', label: 'Startup Check' },
  { value: 'hourly', label: 'Hourly Check' },
  { value: 'changeover', label: 'Changeover Check' },
  { value: 'shutdown', label: 'Shutdown Check' },
  { value: 'random', label: 'Random Check' },
] as const;

const SHIFTS = [
  { value: '1st', label: '1st Shift' },
  { value: '2nd', label: '2nd Shift' },
  { value: '3rd', label: '3rd Shift' },
  { value: 'day', label: 'Day Shift' },
  { value: 'night', label: 'Night Shift' },
] as const;

const DEFAULT_CHECK_ITEMS: Omit<CheckItem, 'id' | 'result'>[] = [
  { name: 'Equipment is clean and sanitized', category: 'Sanitation' },
  { name: 'All guards and safety devices in place', category: 'Safety' },
  { name: 'Correct labels and packaging available', category: 'Materials' },
  { name: 'Date codes set correctly', category: 'Quality' },
  { name: 'Metal detector calibrated and tested', category: 'Quality' },
  { name: 'Conveyor belts running smoothly', category: 'Equipment' },
  { name: 'Temperature displays functioning', category: 'Equipment' },
  { name: 'No foreign materials visible', category: 'Quality' },
  { name: 'Operator properly trained and gowned', category: 'GMP' },
  { name: 'Production documents available', category: 'Documentation' },
];

export default function ProductionLineCheckScreen() {
  const { colors } = useTheme();
  const { user, organizationId } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const dateFilter = filterDate === 'today' ? todayStr : undefined;

  const { checks, isLoading, refetch, createCheck, isCreating } = useProductionLineChecks(dateFilter);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState<typeof PRODUCTION_LINES[0] | null>(null);
  const [checkType, setCheckType] = useState<typeof CHECK_TYPES[number]['value'] | ''>('');
  const [shift, setShift] = useState<typeof SHIFTS[number]['value'] | ''>('');
  const [productName, setProductName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showLinePicker, setShowLinePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showShiftPicker, setShowShiftPicker] = useState(false);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const todayChecks = checks.filter(c => c.check_date === todayStr);
    return {
      total: todayChecks.length,
      pass: todayChecks.filter(c => c.overall_result === 'pass').length,
      fail: todayChecks.filter(c => c.overall_result === 'fail').length,
      conditional: todayChecks.filter(c => c.overall_result === 'conditional').length,
    };
  }, [checks, todayStr]);

  const initializeCheckItems = useCallback(() => {
    const items: CheckItem[] = DEFAULT_CHECK_ITEMS.map((item, index) => ({
      id: `item-${index}`,
      name: item.name,
      category: item.category,
      result: 'pass' as const,
    }));
    setCheckItems(items);
  }, []);

  const updateCheckItemResult = useCallback((itemId: string, result: 'pass' | 'fail' | 'na') => {
    setCheckItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, result } : item))
    );
  }, []);

  const calculateResults = useMemo(() => {
    const total = checkItems.length;
    const passed = checkItems.filter(i => i.result === 'pass').length;
    const failed = checkItems.filter(i => i.result === 'fail').length;
    const na = checkItems.filter(i => i.result === 'na').length;

    let overall: 'pass' | 'fail' | 'conditional' = 'pass';
    if (failed > 0) {
      overall = failed >= 3 ? 'fail' : 'conditional';
    }

    return { total, passed, failed, na, overall };
  }, [checkItems]);

  const handleAddCheck = useCallback(async () => {
    if (!selectedLine || !checkType || !shift || !organizationId) {
      Alert.alert('Required Fields', 'Please select line, check type, and shift.');
      return;
    }

    if (checkItems.length === 0) {
      Alert.alert('No Check Items', 'Please initialize check items first.');
      return;
    }

    const now = new Date();
    const results = calculateResults;

    const newCheck: ProductionLineCheckInsert = {
      organization_id: organizationId,
      facility_id: null,
      line_number: selectedLine.number,
      line_name: selectedLine.name,
      area: selectedLine.area,
      check_date: todayStr,
      check_time: now.toTimeString().slice(0, 5),
      shift: shift,
      check_type: checkType,
      product_name: productName || null,
      product_code: null,
      lot_number: lotNumber || null,
      batch_number: null,
      check_items: checkItems,
      total_checks: results.total,
      passed_checks: results.passed,
      failed_checks: results.failed,
      overall_result: results.overall,
      issues_found: checkItems
        .filter(i => i.result === 'fail')
        .map((item, idx) => ({
          id: `issue-${idx}`,
          description: `${item.name} - Failed`,
          severity: 'major' as const,
          resolved: false,
        })),
      corrective_actions: [],
      checked_by: user?.name || 'Unknown',
      checked_by_id: user?.id || null,
      supervisor_name: null,
      supervisor_id: null,
      verified_by: null,
      verified_by_id: null,
      verified_at: null,
      status: results.failed > 0 ? 'requires_action' : 'completed',
      notes: notes || null,
      attachments: [],
    };

    try {
      await createCheck(newCheck);
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(
        results.overall === 'pass'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      console.log('[ProductionLineCheck] Added:', selectedLine.number, results.overall);
    } catch (error) {
      console.error('[ProductionLineCheck] Create error:', error);
      Alert.alert('Error', 'Failed to save check. Please try again.');
    }
  }, [selectedLine, checkType, shift, checkItems, productName, lotNumber, notes, organizationId, user, todayStr, calculateResults, createCheck]);

  const resetForm = () => {
    setSelectedLine(null);
    setCheckType('');
    setShift('');
    setProductName('');
    setLotNumber('');
    setCheckItems([]);
    setNotes('');
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'pass': return '#10B981';
      case 'fail': return '#EF4444';
      case 'conditional': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const groupedByLine = useMemo(() => {
    const groups: Record<string, typeof checks> = {};
    checks.forEach(check => {
      const key = check.line_number;
      if (!groups[key]) groups[key] = [];
      groups[key].push(check);
    });
    return groups;
  }, [checks]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Factory size={28} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Production Line Check</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verify line readiness and quality parameters
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Checks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.pass}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pass</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.conditional}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conditional</Text>
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
            onPress={() => {
              initializeCheckItems();
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Check</Text>
          </Pressable>
        </View>

        {isLoading && checks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading checks...</Text>
          </View>
        ) : (
          Object.entries(groupedByLine).map(([lineNum, lineChecks]) => (
            <View key={lineNum} style={styles.lineSection}>
              <Text style={[styles.lineTitle, { color: colors.text }]}>Line {lineNum}</Text>
              {lineChecks.map(check => (
                <View
                  key={check.id}
                  style={[styles.checkCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: getResultColor(check.overall_result) }]}
                >
                  <View style={styles.checkHeader}>
                    <View style={styles.checkInfo}>
                      <Text style={[styles.lineName, { color: colors.text }]}>{check.line_name}</Text>
                      <Text style={[styles.checkTypeText, { color: colors.textSecondary }]}>
                        {CHECK_TYPES.find(t => t.value === check.check_type)?.label} • {check.shift} Shift
                      </Text>
                      <View style={styles.timeRow}>
                        <Clock size={12} color={colors.textTertiary} />
                        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                          {check.check_date} at {check.check_time}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultDisplay}>
                      <View style={[styles.resultBadge, { backgroundColor: getResultColor(check.overall_result) + '20' }]}>
                        {check.overall_result === 'pass' ? (
                          <CheckCircle size={16} color={getResultColor(check.overall_result)} />
                        ) : check.overall_result === 'fail' ? (
                          <XCircle size={16} color={getResultColor(check.overall_result)} />
                        ) : (
                          <AlertTriangle size={16} color={getResultColor(check.overall_result)} />
                        )}
                        <Text style={[styles.resultText, { color: getResultColor(check.overall_result) }]}>
                          {check.overall_result.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.checksRow}>
                    <Text style={[styles.checksText, { color: colors.textSecondary }]}>
                      ✓ {check.passed_checks} Pass • ✗ {check.failed_checks} Fail • {check.total_checks - check.passed_checks - check.failed_checks} N/A
                    </Text>
                  </View>

                  {check.product_name && (
                    <Text style={[styles.productText, { color: colors.textSecondary }]}>
                      Product: {check.product_name} {check.lot_number ? `(Lot: ${check.lot_number})` : ''}
                    </Text>
                  )}

                  <View style={styles.recordedBy}>
                    <User size={12} color={colors.textTertiary} />
                    <Text style={[styles.recordedByText, { color: colors.textTertiary }]}>
                      Checked by {check.checked_by}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {!isLoading && checks.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Factory size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Checks</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterDate === 'today' ? 'No production line checks recorded today' : 'No checks found'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Production Line Check</Text>
            <Pressable onPress={handleAddCheck} disabled={isCreating}>
              {isCreating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Production Line *</Text>
            <Pressable style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowLinePicker(true)}>
              <Text style={[styles.pickerText, { color: selectedLine ? colors.text : colors.textTertiary }]}>
                {selectedLine ? `${selectedLine.number} - ${selectedLine.name}` : 'Select line...'}
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

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Shift *</Text>
            <Pressable style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowShiftPicker(true)}>
              <Text style={[styles.pickerText, { color: shift ? colors.text : colors.textTertiary }]}>
                {shift ? SHIFTS.find(s => s.value === shift)?.label : 'Select shift...'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Product Name</Text>
            <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Enter product name" placeholderTextColor={colors.textTertiary} value={productName} onChangeText={setProductName} />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Lot Number</Text>
            <TextInput style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Enter lot number" placeholderTextColor={colors.textTertiary} value={lotNumber} onChangeText={setLotNumber} />

            {checkItems.length > 0 && (
              <>
                <View style={styles.checkItemsHeader}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16, marginBottom: 0 }]}>Check Items</Text>
                  <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                    {calculateResults.passed}/{calculateResults.total} Pass
                  </Text>
                </View>

                {checkItems.map(item => (
                  <View key={item.id} style={[styles.checkItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.checkItemInfo}>
                      <Text style={[styles.checkItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.checkItemCategory, { color: colors.textTertiary }]}>{item.category}</Text>
                    </View>
                    <View style={styles.checkItemButtons}>
                      <Pressable
                        style={[styles.resultButton, item.result === 'pass' && { backgroundColor: '#10B981' + '30' }]}
                        onPress={() => updateCheckItemResult(item.id, 'pass')}
                      >
                        <Check size={16} color={item.result === 'pass' ? '#10B981' : colors.textTertiary} />
                      </Pressable>
                      <Pressable
                        style={[styles.resultButton, item.result === 'fail' && { backgroundColor: '#EF4444' + '30' }]}
                        onPress={() => updateCheckItemResult(item.id, 'fail')}
                      >
                        <X size={16} color={item.result === 'fail' ? '#EF4444' : colors.textTertiary} />
                      </Pressable>
                      <Pressable
                        style={[styles.resultButton, item.result === 'na' && { backgroundColor: '#6B7280' + '30' }]}
                        onPress={() => updateCheckItemResult(item.id, 'na')}
                      >
                        <Minus size={16} color={item.result === 'na' ? '#6B7280' : colors.textTertiary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Notes</Text>
            <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Additional notes..." placeholderTextColor={colors.textTertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showLinePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowLinePicker(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Line</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {PRODUCTION_LINES.map(line => (
              <Pressable key={line.number} style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: selectedLine?.number === line.number ? colors.primary : colors.border }]} onPress={() => { setSelectedLine(line); setShowLinePicker(false); }}>
                <View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{line.number} - {line.name}</Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{line.area}</Text>
                </View>
                {selectedLine?.number === line.number && <CheckCircle size={20} color={colors.primary} />}
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

      <Modal visible={showShiftPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowShiftPicker(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Shift</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {SHIFTS.map(s => (
              <Pressable key={s.value} style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: shift === s.value ? colors.primary : colors.border }]} onPress={() => { setShift(s.value); setShowShiftPicker(false); }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{s.label}</Text>
                {shift === s.value && <CheckCircle size={20} color={colors.primary} />}
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
  lineSection: { marginBottom: 20 },
  lineTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10 },
  checkCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  checkHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  checkInfo: { flex: 1 },
  lineName: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  checkTypeText: { fontSize: 12, marginBottom: 4 },
  timeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  timeText: { fontSize: 11 },
  resultDisplay: { alignItems: 'flex-end' as const },
  resultBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  resultText: { fontSize: 11, fontWeight: '700' as const },
  checksRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  checksText: { fontSize: 12 },
  productText: { fontSize: 12, marginTop: 6 },
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
  checkItemsHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16, marginBottom: 8 },
  summaryText: { fontSize: 13 },
  checkItemRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  checkItemInfo: { flex: 1, marginRight: 10 },
  checkItemName: { fontSize: 13, marginBottom: 2 },
  checkItemCategory: { fontSize: 11 },
  checkItemButtons: { flexDirection: 'row' as const, gap: 6 },
  resultButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const },
  optionRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  optionTitle: { fontSize: 15, fontWeight: '500' as const },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
});
