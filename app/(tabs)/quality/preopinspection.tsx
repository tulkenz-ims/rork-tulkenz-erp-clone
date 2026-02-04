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
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  ChevronDown,
  Check,
  XCircle,
  Minus,
  Play,
  Pause,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePreOpInspections, PreOpInspectionInsert, InspectionCheckItem } from '@/hooks/usePreOpInspections';
import * as Haptics from 'expo-haptics';

const AREAS = [
  { name: 'Production Line 1', line: 'L1', room: 'A101' },
  { name: 'Production Line 2', line: 'L2', room: 'A102' },
  { name: 'Production Line 3', line: 'L3', room: 'B101' },
  { name: 'Packaging Area', line: 'PKG', room: 'C101' },
  { name: 'Raw Materials Storage', line: null, room: 'D101' },
  { name: 'Finished Goods Staging', line: null, room: 'E101' },
];

const SHIFTS = [
  { value: '1st', label: '1st Shift' },
  { value: '2nd', label: '2nd Shift' },
  { value: '3rd', label: '3rd Shift' },
  { value: 'day', label: 'Day Shift' },
  { value: 'night', label: 'Night Shift' },
] as const;

const SANITATION_CHECKS: Omit<InspectionCheckItem, 'id' | 'result'>[] = [
  { name: 'Food contact surfaces cleaned and sanitized' },
  { name: 'Non-food contact surfaces cleaned' },
  { name: 'Floors swept and mopped' },
  { name: 'Drains clean and free of debris' },
  { name: 'No standing water present' },
  { name: 'Cleaning chemicals stored properly' },
];

const EQUIPMENT_CHECKS: Omit<InspectionCheckItem, 'id' | 'result'>[] = [
  { name: 'All equipment assembled correctly' },
  { name: 'No loose parts or missing components' },
  { name: 'Equipment in good working condition' },
  { name: 'Conveyor belts aligned and clean' },
  { name: 'Temperature controls set correctly' },
  { name: 'All guards and covers in place' },
];

const SAFETY_CHECKS: Omit<InspectionCheckItem, 'id' | 'result'>[] = [
  { name: 'Emergency stops accessible and functional' },
  { name: 'Safety guards in place' },
  { name: 'Fire extinguisher accessible' },
  { name: 'Eye wash station accessible' },
  { name: 'First aid kit stocked' },
];

const ALLERGEN_CHECKS: Omit<InspectionCheckItem, 'id' | 'result'>[] = [
  { name: 'Allergen changeover completed (if applicable)' },
  { name: 'Allergen verification swabs passed' },
  { name: 'Correct allergen labels available' },
  { name: 'No cross-contact risk identified' },
];

const GMP_CHECKS: Omit<InspectionCheckItem, 'id' | 'result'>[] = [
  { name: 'All personnel properly gowned' },
  { name: 'Hairnets/beard covers worn' },
  { name: 'No jewelry or personal items' },
  { name: 'Handwashing completed' },
  { name: 'No food, drinks, or gum in area' },
];

export default function PreOpInspectionScreen() {
  const { colors } = useTheme();
  const { user, organizationId } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const dateFilter = filterDate === 'today' ? todayStr : undefined;

  const { inspections, isLoading, refetch, createInspection, isCreating } = usePreOpInspections(dateFilter);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<typeof AREAS[0] | null>(null);
  const [shift, setShift] = useState<typeof SHIFTS[number]['value'] | ''>('');
  const [sanitationChecks, setSanitationChecks] = useState<InspectionCheckItem[]>([]);
  const [equipmentChecks, setEquipmentChecks] = useState<InspectionCheckItem[]>([]);
  const [safetyChecks, setSafetyChecks] = useState<InspectionCheckItem[]>([]);
  const [allergenChecks, setAllergenChecks] = useState<InspectionCheckItem[]>([]);
  const [gmpChecks, setGmpChecks] = useState<InspectionCheckItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('sanitation');

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    const todayInspections = inspections.filter(i => i.inspection_date === todayStr);
    return {
      total: todayInspections.length,
      acceptable: todayInspections.filter(i => i.overall_result === 'acceptable').length,
      conditional: todayInspections.filter(i => i.overall_result === 'conditional').length,
      unacceptable: todayInspections.filter(i => i.overall_result === 'unacceptable').length,
      released: todayInspections.filter(i => i.line_released).length,
    };
  }, [inspections, todayStr]);

  const initializeChecks = useCallback(() => {
    setSanitationChecks(SANITATION_CHECKS.map((c, i) => ({ id: `san-${i}`, name: c.name, result: 'pass' as const })));
    setEquipmentChecks(EQUIPMENT_CHECKS.map((c, i) => ({ id: `equip-${i}`, name: c.name, result: 'pass' as const })));
    setSafetyChecks(SAFETY_CHECKS.map((c, i) => ({ id: `safe-${i}`, name: c.name, result: 'pass' as const })));
    setAllergenChecks(ALLERGEN_CHECKS.map((c, i) => ({ id: `aller-${i}`, name: c.name, result: 'pass' as const })));
    setGmpChecks(GMP_CHECKS.map((c, i) => ({ id: `gmp-${i}`, name: c.name, result: 'pass' as const })));
  }, []);

  const updateCheckResult = useCallback((category: string, itemId: string, result: 'pass' | 'fail' | 'na') => {
    const updateFn = (prev: InspectionCheckItem[]) =>
      prev.map(item => (item.id === itemId ? { ...item, result } : item));
    
    switch (category) {
      case 'sanitation': setSanitationChecks(updateFn); break;
      case 'equipment': setEquipmentChecks(updateFn); break;
      case 'safety': setSafetyChecks(updateFn); break;
      case 'allergen': setAllergenChecks(updateFn); break;
      case 'gmp': setGmpChecks(updateFn); break;
    }
  }, []);

  const allChecks = useMemo(() => {
    return [...sanitationChecks, ...equipmentChecks, ...safetyChecks, ...allergenChecks, ...gmpChecks];
  }, [sanitationChecks, equipmentChecks, safetyChecks, allergenChecks, gmpChecks]);

  const calculateResults = useMemo(() => {
    const total = allChecks.length;
    const passed = allChecks.filter(c => c.result === 'pass').length;
    const failed = allChecks.filter(c => c.result === 'fail').length;
    const na = allChecks.filter(c => c.result === 'na').length;

    let overall: 'acceptable' | 'unacceptable' | 'conditional' = 'acceptable';
    if (failed >= 5) {
      overall = 'unacceptable';
    } else if (failed > 0) {
      overall = 'conditional';
    }

    return { total, passed, failed, na, overall };
  }, [allChecks]);

  const getCategoryCounts = useCallback((checks: InspectionCheckItem[]) => {
    const passed = checks.filter(c => c.result === 'pass').length;
    const failed = checks.filter(c => c.result === 'fail').length;
    return { passed, failed, total: checks.length };
  }, []);

  const handleAddInspection = useCallback(async () => {
    if (!selectedArea || !shift || !organizationId) {
      Alert.alert('Required Fields', 'Please select area and shift.');
      return;
    }

    if (allChecks.length === 0) {
      Alert.alert('No Check Items', 'Please initialize check items first.');
      return;
    }

    const now = new Date();
    const results = calculateResults;

    const newInspection: PreOpInspectionInsert = {
      organization_id: organizationId,
      facility_id: null,
      inspection_date: todayStr,
      inspection_time: now.toTimeString().slice(0, 5),
      shift: shift,
      area_name: selectedArea.name,
      line_number: selectedArea.line,
      room_number: selectedArea.room,
      sanitation_checks: sanitationChecks,
      equipment_checks: equipmentChecks,
      safety_checks: safetyChecks,
      allergen_checks: allergenChecks,
      gmp_checks: gmpChecks,
      total_items: results.total,
      passed_items: results.passed,
      failed_items: results.failed,
      na_items: results.na,
      overall_result: results.overall,
      issues_found: allChecks
        .filter(c => c.result === 'fail')
        .map((item, idx) => ({
          id: `issue-${idx}`,
          category: item.id.split('-')[0],
          description: item.name,
          severity: 'major' as const,
          resolved: false,
        })),
      corrective_actions: [],
      line_released: results.overall === 'acceptable',
      released_at: results.overall === 'acceptable' ? now.toISOString() : null,
      released_by: results.overall === 'acceptable' ? user?.name || null : null,
      released_by_id: results.overall === 'acceptable' ? user?.id || null : null,
      hold_reason: results.overall !== 'acceptable' ? 'Failed pre-op inspection items require attention' : null,
      inspector_name: user?.name || 'Unknown',
      inspector_id: user?.id || null,
      supervisor_name: null,
      supervisor_id: null,
      verified_by: null,
      verified_by_id: null,
      verified_at: null,
      status: results.overall === 'acceptable' ? 'released' : results.overall === 'conditional' ? 'completed' : 'on_hold',
      notes: notes || null,
      attachments: [],
    };

    try {
      await createInspection(newInspection);
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(
        results.overall === 'acceptable'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      console.log('[PreOpInspection] Added:', selectedArea.name, results.overall);
    } catch (error) {
      console.error('[PreOpInspection] Create error:', error);
      Alert.alert('Error', 'Failed to save inspection. Please try again.');
    }
  }, [selectedArea, shift, allChecks, sanitationChecks, equipmentChecks, safetyChecks, allergenChecks, gmpChecks, notes, organizationId, user, todayStr, calculateResults, createInspection]);

  const resetForm = () => {
    setSelectedArea(null);
    setShift('');
    setSanitationChecks([]);
    setEquipmentChecks([]);
    setSafetyChecks([]);
    setAllergenChecks([]);
    setGmpChecks([]);
    setNotes('');
    setExpandedSection('sanitation');
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'acceptable': return '#10B981';
      case 'unacceptable': return '#EF4444';
      case 'conditional': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const groupedByArea = useMemo(() => {
    const groups: Record<string, typeof inspections> = {};
    inspections.forEach(inspection => {
      const key = inspection.area_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inspection);
    });
    return groups;
  }, [inspections]);

  const renderCheckSection = (title: string, key: string, checks: InspectionCheckItem[], color: string) => {
    const counts = getCategoryCounts(checks);
    const isExpanded = expandedSection === key;

    return (
      <View style={styles.checkSection} key={key}>
        <Pressable
          style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setExpandedSection(isExpanded ? null : key)}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionDot, { backgroundColor: color }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <View style={styles.sectionHeaderRight}>
            <Text style={[styles.sectionCount, { color: counts.failed > 0 ? '#EF4444' : '#10B981' }]}>
              {counts.passed}/{counts.total}
            </Text>
            {isExpanded ? <Minus size={18} color={colors.textSecondary} /> : <Plus size={18} color={colors.textSecondary} />}
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.checkItemsList}>
            {checks.map(item => (
              <View key={item.id} style={[styles.checkItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.checkItemName, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.checkItemButtons}>
                  <Pressable
                    style={[styles.resultBtn, item.result === 'pass' && { backgroundColor: '#10B981' + '30' }]}
                    onPress={() => updateCheckResult(key, item.id, 'pass')}
                  >
                    <Check size={14} color={item.result === 'pass' ? '#10B981' : colors.textTertiary} />
                  </Pressable>
                  <Pressable
                    style={[styles.resultBtn, item.result === 'fail' && { backgroundColor: '#EF4444' + '30' }]}
                    onPress={() => updateCheckResult(key, item.id, 'fail')}
                  >
                    <X size={14} color={item.result === 'fail' ? '#EF4444' : colors.textTertiary} />
                  </Pressable>
                  <Pressable
                    style={[styles.resultBtn, item.result === 'na' && { backgroundColor: '#6B7280' + '30' }]}
                    onPress={() => updateCheckResult(key, item.id, 'na')}
                  >
                    <Minus size={14} color={item.result === 'na' ? '#6B7280' : colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
            <ClipboardCheck size={28} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Pre-Op Inspection</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verify area readiness before starting production
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inspections</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.acceptable}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Acceptable</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.conditional}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conditional</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.released}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Released</Text>
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
            onPress={() => { initializeChecks(); setShowAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Inspection</Text>
          </Pressable>
        </View>

        {isLoading && inspections.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inspections...</Text>
          </View>
        ) : (
          Object.entries(groupedByArea).map(([areaName, areaInspections]) => (
            <View key={areaName} style={styles.areaSection}>
              <Text style={[styles.areaTitle, { color: colors.text }]}>{areaName}</Text>
              {areaInspections.map(inspection => (
                <View
                  key={inspection.id}
                  style={[styles.inspectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: getResultColor(inspection.overall_result) }]}
                >
                  <View style={styles.inspectionHeader}>
                    <View style={styles.inspectionInfo}>
                      <View style={styles.shiftRow}>
                        <Text style={[styles.shiftText, { color: colors.text }]}>{inspection.shift} Shift</Text>
                        {inspection.line_released && (
                          <View style={[styles.releasedBadge, { backgroundColor: '#10B981' + '20' }]}>
                            <Play size={10} color="#10B981" />
                            <Text style={[styles.releasedText, { color: '#10B981' }]}>RELEASED</Text>
                          </View>
                        )}
                        {!inspection.line_released && inspection.status === 'on_hold' && (
                          <View style={[styles.releasedBadge, { backgroundColor: '#EF4444' + '20' }]}>
                            <Pause size={10} color="#EF4444" />
                            <Text style={[styles.releasedText, { color: '#EF4444' }]}>ON HOLD</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.timeRow}>
                        <Clock size={12} color={colors.textTertiary} />
                        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                          {inspection.inspection_date} at {inspection.inspection_time}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultDisplay}>
                      <View style={[styles.resultBadge, { backgroundColor: getResultColor(inspection.overall_result) + '20' }]}>
                        {inspection.overall_result === 'acceptable' ? (
                          <CheckCircle size={14} color="#10B981" />
                        ) : inspection.overall_result === 'unacceptable' ? (
                          <XCircle size={14} color="#EF4444" />
                        ) : (
                          <AlertTriangle size={14} color="#F59E0B" />
                        )}
                        <Text style={[styles.resultText, { color: getResultColor(inspection.overall_result) }]}>
                          {inspection.overall_result.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.countsRow}>
                    <Text style={[styles.countsText, { color: colors.textSecondary }]}>
                      ✓ {inspection.passed_items} Pass • ✗ {inspection.failed_items} Fail • {inspection.na_items} N/A
                    </Text>
                  </View>

                  {inspection.hold_reason && (
                    <View style={[styles.holdReasonBox, { backgroundColor: '#EF4444' + '10' }]}>
                      <Text style={[styles.holdReasonLabel, { color: '#EF4444' }]}>Hold Reason:</Text>
                      <Text style={[styles.holdReasonText, { color: colors.text }]}>{inspection.hold_reason}</Text>
                    </View>
                  )}

                  <View style={styles.recordedBy}>
                    <User size={12} color={colors.textTertiary} />
                    <Text style={[styles.recordedByText, { color: colors.textTertiary }]}>
                      Inspected by {inspection.inspector_name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {!isLoading && inspections.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ClipboardCheck size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspections</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterDate === 'today' ? 'No pre-op inspections recorded today' : 'No inspections found'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Pre-Op Inspection</Text>
            <Pressable onPress={handleAddInspection} disabled={isCreating}>
              {isCreating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Area / Line *</Text>
            <Pressable style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowAreaPicker(true)}>
              <Text style={[styles.pickerText, { color: selectedArea ? colors.text : colors.textTertiary }]}>
                {selectedArea ? selectedArea.name : 'Select area...'}
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

            {allChecks.length > 0 && (
              <>
                <View style={styles.summaryBar}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Inspection Summary</Text>
                  <View style={styles.summaryStats}>
                    <View style={[styles.summaryItem, { backgroundColor: '#10B981' + '20' }]}>
                      <Text style={[styles.summaryValue, { color: '#10B981' }]}>{calculateResults.passed}</Text>
                      <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Pass</Text>
                    </View>
                    <View style={[styles.summaryItem, { backgroundColor: '#EF4444' + '20' }]}>
                      <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{calculateResults.failed}</Text>
                      <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Fail</Text>
                    </View>
                    <View style={[styles.summaryItem, { backgroundColor: getResultColor(calculateResults.overall) + '20' }]}>
                      <Text style={[styles.summaryValue, { color: getResultColor(calculateResults.overall) }]}>
                        {calculateResults.overall === 'acceptable' ? '✓' : calculateResults.overall === 'conditional' ? '!' : '✗'}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: getResultColor(calculateResults.overall) }]}>
                        {calculateResults.overall.charAt(0).toUpperCase() + calculateResults.overall.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {renderCheckSection('Sanitation', 'sanitation', sanitationChecks, '#3B82F6')}
                {renderCheckSection('Equipment', 'equipment', equipmentChecks, '#8B5CF6')}
                {renderCheckSection('Safety', 'safety', safetyChecks, '#EF4444')}
                {renderCheckSection('Allergen', 'allergen', allergenChecks, '#F59E0B')}
                {renderCheckSection('GMP / Hygiene', 'gmp', gmpChecks, '#10B981')}
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Notes</Text>
            <TextInput style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Additional notes..." placeholderTextColor={colors.textTertiary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showAreaPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAreaPicker(false)}><X size={24} color={colors.text} /></Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Area</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            {AREAS.map((area, idx) => (
              <Pressable key={idx} style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: selectedArea?.name === area.name ? colors.primary : colors.border }]} onPress={() => { setSelectedArea(area); setShowAreaPicker(false); }}>
                <View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{area.name}</Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    {area.line ? `Line: ${area.line} • ` : ''}Room: {area.room}
                  </Text>
                </View>
                {selectedArea?.name === area.name && <CheckCircle size={20} color={colors.primary} />}
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
  statLabel: { fontSize: 9, fontWeight: '500' as const, marginTop: 2, textAlign: 'center' as const },
  filterRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 16 },
  filterButtons: { flexDirection: 'row' as const, gap: 8 },
  filterButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  addButton: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  loadingText: { marginTop: 12, fontSize: 14 },
  areaSection: { marginBottom: 20 },
  areaTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10 },
  inspectionCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  inspectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  inspectionInfo: { flex: 1 },
  shiftRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 4 },
  shiftText: { fontSize: 14, fontWeight: '600' as const },
  releasedBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  releasedText: { fontSize: 9, fontWeight: '700' as const },
  timeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  timeText: { fontSize: 11 },
  resultDisplay: { alignItems: 'flex-end' as const },
  resultBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 4 },
  resultText: { fontSize: 10, fontWeight: '700' as const },
  countsRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  countsText: { fontSize: 12 },
  holdReasonBox: { marginTop: 10, padding: 10, borderRadius: 8 },
  holdReasonLabel: { fontSize: 11, fontWeight: '600' as const, marginBottom: 4 },
  holdReasonText: { fontSize: 12 },
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
  textArea: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80 },
  summaryBar: { marginTop: 20, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 10 },
  summaryStats: { flexDirection: 'row' as const, gap: 10 },
  summaryItem: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' as const },
  summaryValue: { fontSize: 20, fontWeight: '700' as const },
  summaryLabel: { fontSize: 11, fontWeight: '500' as const, marginTop: 2 },
  checkSection: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 14, borderRadius: 10, borderWidth: 1 },
  sectionHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 14, fontWeight: '600' as const },
  sectionHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  sectionCount: { fontSize: 13, fontWeight: '600' as const },
  checkItemsList: { marginTop: 4 },
  checkItemRow: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  checkItemName: { fontSize: 12 },
  checkItemButtons: { flexDirection: 'row' as const, gap: 4 },
  resultBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const },
  optionRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  optionTitle: { fontSize: 15, fontWeight: '500' as const },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
});
