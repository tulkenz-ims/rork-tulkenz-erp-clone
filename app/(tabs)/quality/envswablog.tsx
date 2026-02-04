import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseQualityTasks, SwabTest } from '@/hooks/useSupabaseQualityTasks';
import {
  Droplets,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  MapPin,
  Beaker,
  FileText,
  AlertCircle,
  Search,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type SwabTestType = 'atp' | 'micro' | 'allergen' | 'listeria' | 'salmonella' | 'environmental' | 'other';
type SwabReason = 'scheduled' | 'new_part' | 'post_maintenance' | 'post_sanitation' | 'investigation' | 'other';
type SwabZone = '1' | '2' | '3' | '4';

const TEST_TYPES: { value: SwabTestType; label: string; color: string }[] = [
  { value: 'atp', label: 'ATP Test', color: '#10B981' },
  { value: 'micro', label: 'Micro Test', color: '#3B82F6' },
  { value: 'allergen', label: 'Allergen Swab', color: '#F59E0B' },
  { value: 'listeria', label: 'Listeria', color: '#EF4444' },
  { value: 'salmonella', label: 'Salmonella', color: '#DC2626' },
  { value: 'environmental', label: 'Environmental', color: '#8B5CF6' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const REASONS: { value: SwabReason; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled Sampling' },
  { value: 'new_part', label: 'New Part Introduction' },
  { value: 'post_maintenance', label: 'Post-Maintenance' },
  { value: 'post_sanitation', label: 'Post-Sanitation' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'other', label: 'Other' },
];

const ZONES: { value: SwabZone; label: string; description: string; color: string }[] = [
  { value: '1', label: 'Zone 1', description: 'Direct food contact surfaces', color: '#EF4444' },
  { value: '2', label: 'Zone 2', description: 'Adjacent to food contact', color: '#F59E0B' },
  { value: '3', label: 'Zone 3', description: 'Non-food contact in production', color: '#3B82F6' },
  { value: '4', label: 'Zone 4', description: 'Non-production areas', color: '#10B981' },
];

export default function EnvSwabLogScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewSwabModal, setShowNewSwabModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedSwab, setSelectedSwab] = useState<SwabTest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newSwab, setNewSwab] = useState({
    test_type: 'atp' as SwabTestType,
    reason: 'scheduled' as SwabReason,
    zone: '1' as SwabZone,
    location: '',
    equipment_name: '',
    surface_type: '',
    notes: '',
  });

  const [resultData, setResultData] = useState({
    result: 'pass' as 'pass' | 'fail',
    atp_reading: '',
    corrective_action: '',
    retest_required: false,
  });

  const {
    swabTests,
    createSwabTest,
    recordSwabResult,
    generateSwabNumber,
    refetch,
    isLoading,
  } = useSupabaseQualityTasks();

  const filteredSwabs = useMemo(() => {
    let filtered = swabTests;
    
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter(s => s.status === 'pending' || s.status === 'awaiting_results');
      } else {
        filtered = filtered.filter(s => s.status === filterStatus);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.location.toLowerCase().includes(query) ||
        s.equipment_name?.toLowerCase().includes(query) ||
        s.swab_number.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [swabTests, filterStatus, searchQuery]);

  const swabStats = useMemo(() => {
    const pending = swabTests.filter(s => s.status === 'pending' || s.status === 'awaiting_results').length;
    const passed = swabTests.filter(s => s.result === 'pass').length;
    const failed = swabTests.filter(s => s.result === 'fail').length;
    const total = swabTests.length;
    return { pending, passed, failed, total };
  }, [swabTests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleCreateSwab = useCallback(async () => {
    if (!newSwab.location.trim()) {
      Alert.alert('Required', 'Please enter a location.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createSwabTest({
        swab_number: generateSwabNumber(),
        test_type: newSwab.test_type,
        status: 'pending',
        result: null,
        facility_id: 'FAC001',
        location: newSwab.location,
        zone: newSwab.zone,
        equipment_id: null,
        equipment_name: newSwab.equipment_name || null,
        surface_type: newSwab.surface_type || null,
        reason: newSwab.reason,
        related_doc_id: null,
        sampled_by: 'Current User',
        sampled_by_id: 'USER001',
        sampled_at: new Date().toISOString(),
        sample_id: `ATP-${Date.now()}`,
        atp_reading: null,
        atp_threshold: newSwab.test_type === 'atp' ? 30 : null,
        sent_to_lab: newSwab.test_type !== 'atp',
        lab_name: newSwab.test_type !== 'atp' ? 'External Lab' : null,
        lab_sample_id: null,
        results_received_at: null,
        results_entered_by: null,
        results_entered_by_id: null,
        detailed_results: null,
        corrective_action_required: false,
        corrective_action: null,
        retest_required: false,
        retest_id: null,
        photos: [],
        notes: newSwab.notes || null,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_at: null,
      });

      setShowNewSwabModal(false);
      setNewSwab({
        test_type: 'atp',
        reason: 'scheduled',
        zone: '1',
        location: '',
        equipment_name: '',
        surface_type: '',
        notes: '',
      });
      
      Alert.alert('Success', 'Swab test created successfully.');
    } catch (error) {
      console.error('[EnvSwabLog] Error creating swab:', error);
      Alert.alert('Error', 'Failed to create swab test.');
    }
  }, [newSwab, createSwabTest, generateSwabNumber]);

  const handleRecordResult = useCallback(async () => {
    if (!selectedSwab) return;

    if (selectedSwab.test_type === 'atp' && !resultData.atp_reading) {
      Alert.alert('Required', 'Please enter the ATP reading.');
      return;
    }

    Haptics.notificationAsync(
      resultData.result === 'pass' 
        ? Haptics.NotificationFeedbackType.Success 
        : Haptics.NotificationFeedbackType.Warning
    );

    try {
      await recordSwabResult({
        id: selectedSwab.id,
        result: resultData.result,
        atpReading: resultData.atp_reading ? parseFloat(resultData.atp_reading) : undefined,
        enteredBy: 'Current User',
        enteredById: 'USER001',
        correctiveActionRequired: resultData.result === 'fail',
        correctiveAction: resultData.corrective_action || undefined,
        retestRequired: resultData.retest_required,
      });

      setShowResultModal(false);
      setSelectedSwab(null);
      setResultData({
        result: 'pass',
        atp_reading: '',
        corrective_action: '',
        retest_required: false,
      });

      if (resultData.result === 'fail') {
        Alert.alert(
          'Failed Result',
          'This swab test failed. Corrective action may be required.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[EnvSwabLog] Error recording result:', error);
      Alert.alert('Error', 'Failed to record result.');
    }
  }, [selectedSwab, resultData, recordSwabResult]);

  const openResultModal = useCallback((swab: SwabTest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSwab(swab);
    setResultData({
      result: 'pass',
      atp_reading: '',
      corrective_action: '',
      retest_required: false,
    });
    setShowResultModal(true);
  }, []);

  const getStatusColor = (status: string, result: string | null) => {
    if (result === 'pass') return '#10B981';
    if (result === 'fail') return '#EF4444';
    if (status === 'awaiting_results') return '#F59E0B';
    return '#6B7280';
  };

  const getStatusLabel = (status: string, result: string | null) => {
    if (result === 'pass') return 'Passed';
    if (result === 'fail') return 'Failed';
    if (status === 'awaiting_results') return 'Awaiting Results';
    if (status === 'pending') return 'Pending';
    return status;
  };

  const renderSwabCard = (swab: SwabTest) => {
    const statusColor = getStatusColor(swab.status, swab.result);
    const testType = TEST_TYPES.find(t => t.value === swab.test_type);
    const zone = ZONES.find(z => z.value === swab.zone);
    const isPending = swab.status === 'pending' || swab.status === 'awaiting_results';

    return (
      <Pressable
        key={swab.id}
        style={[
          styles.swabCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            borderLeftColor: statusColor,
            borderLeftWidth: 4,
          }
        ]}
        onPress={() => isPending && openResultModal(swab)}
      >
        <View style={styles.swabHeader}>
          <View style={styles.swabHeaderLeft}>
            <Text style={[styles.swabNumber, { color: colors.text }]}>{swab.swab_number}</Text>
            <View style={[styles.typeBadge, { backgroundColor: (testType?.color || '#6B7280') + '20' }]}>
              <Text style={[styles.typeText, { color: testType?.color || '#6B7280' }]}>
                {testType?.label || swab.test_type}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            {swab.result === 'pass' && <CheckCircle2 size={14} color={statusColor} />}
            {swab.result === 'fail' && <AlertTriangle size={14} color={statusColor} />}
            {!swab.result && <Clock size={14} color={statusColor} />}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(swab.status, swab.result)}
            </Text>
          </View>
        </View>

        <View style={styles.swabDetails}>
          <View style={styles.detailRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
              {swab.location}
            </Text>
          </View>
          {swab.equipment_name && (
            <View style={styles.detailRow}>
              <Beaker size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                {swab.equipment_name}
              </Text>
            </View>
          )}
          <View style={styles.swabMeta}>
            {zone && (
              <View style={[styles.zoneBadge, { backgroundColor: zone.color + '15' }]}>
                <Text style={[styles.zoneText, { color: zone.color }]}>{zone.label}</Text>
              </View>
            )}
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {new Date(swab.sampled_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {swab.result === 'pass' && swab.atp_reading !== null && (
          <View style={[styles.resultRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>ATP Reading:</Text>
            <Text style={[styles.resultValue, { color: '#10B981' }]}>
              {swab.atp_reading} RLU (Pass)
            </Text>
          </View>
        )}

        {swab.result === 'fail' && (
          <View style={[styles.failedBanner, { backgroundColor: '#EF4444' + '10' }]}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.failedText}>
              {swab.corrective_action_required ? 'Corrective action required' : 'Failed - Review needed'}
            </Text>
          </View>
        )}

        {isPending && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.actionHint, { color: colors.textTertiary }]}>
              Tap to enter results
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#06B6D4' + '20' }]}>
            <Droplets size={32} color="#06B6D4" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Environmental Swab Log</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track swab samples for new parts, maintenance, and scheduled testing
          </Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{swabStats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{swabStats.passed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Passed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{swabStats.failed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Failed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{swabStats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by location or equipment..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['all', 'pending', 'completed'].map(status => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: filterStatus === status ? colors.primary : colors.surface,
                    borderColor: filterStatus === status ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilterStatus(status);
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === status ? '#FFF' : colors.text }
                ]}>
                  {status === 'all' ? 'All' : status === 'pending' ? 'Pending' : 'Completed'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.swabList}>
          {filteredSwabs.map(swab => renderSwabCard(swab))}
        </View>

        {filteredSwabs.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Droplets size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Swab Tests</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No results match your search.' : 'Create a new swab test to get started.'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowNewSwabModal(true);
        }}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showNewSwabModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewSwabModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowNewSwabModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Swab Test</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Test Type *</Text>
              <View style={styles.typeGrid}>
                {TEST_TYPES.map(type => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.typeOption,
                      { 
                        backgroundColor: newSwab.test_type === type.value ? type.color + '20' : colors.backgroundSecondary,
                        borderColor: newSwab.test_type === type.value ? type.color : colors.border,
                      }
                    ]}
                    onPress={() => setNewSwab(prev => ({ ...prev, test_type: type.value }))}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      { color: newSwab.test_type === type.value ? type.color : colors.text }
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Reason for Sampling *</Text>
              <View style={styles.reasonList}>
                {REASONS.map(reason => (
                  <Pressable
                    key={reason.value}
                    style={[
                      styles.reasonOption,
                      { 
                        backgroundColor: newSwab.reason === reason.value ? colors.primary + '15' : 'transparent',
                        borderColor: newSwab.reason === reason.value ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setNewSwab(prev => ({ ...prev, reason: reason.value }))}
                  >
                    <View style={[
                      styles.radioOuter,
                      { borderColor: newSwab.reason === reason.value ? colors.primary : colors.border }
                    ]}>
                      {newSwab.reason === reason.value && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text style={[styles.reasonText, { color: colors.text }]}>{reason.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Zone Classification *</Text>
              <View style={styles.zoneGrid}>
                {ZONES.map(zone => (
                  <Pressable
                    key={zone.value}
                    style={[
                      styles.zoneOption,
                      { 
                        backgroundColor: newSwab.zone === zone.value ? zone.color + '15' : colors.backgroundSecondary,
                        borderColor: newSwab.zone === zone.value ? zone.color : colors.border,
                      }
                    ]}
                    onPress={() => setNewSwab(prev => ({ ...prev, zone: zone.value }))}
                  >
                    <Text style={[
                      styles.zoneLabel,
                      { color: newSwab.zone === zone.value ? zone.color : colors.text }
                    ]}>
                      {zone.label}
                    </Text>
                    <Text style={[styles.zoneDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {zone.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Location *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Production Floor - Line 1"
                placeholderTextColor={colors.textTertiary}
                value={newSwab.location}
                onChangeText={(text) => setNewSwab(prev => ({ ...prev, location: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Equipment Name (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Mixer #1"
                placeholderTextColor={colors.textTertiary}
                value={newSwab.equipment_name}
                onChangeText={(text) => setNewSwab(prev => ({ ...prev, equipment_name: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Surface Type (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Food contact surface, Conveyor belt"
                placeholderTextColor={colors.textTertiary}
                value={newSwab.surface_type}
                onChangeText={(text) => setNewSwab(prev => ({ ...prev, surface_type: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Additional observations..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={newSwab.notes}
                onChangeText={(text) => setNewSwab(prev => ({ ...prev, notes: text }))}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: '#06B6D4', opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={handleCreateSwab}
            >
              <Droplets size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Create Swab Test</Text>
            </Pressable>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showResultModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowResultModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Results</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedSwab && (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.swabInfoTitle, { color: colors.text }]}>{selectedSwab.swab_number}</Text>
                  <Text style={[styles.swabInfoText, { color: colors.textSecondary }]}>
                    {selectedSwab.location}
                  </Text>
                  {selectedSwab.equipment_name && (
                    <Text style={[styles.swabInfoText, { color: colors.textSecondary }]}>
                      Equipment: {selectedSwab.equipment_name}
                    </Text>
                  )}
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Result *</Text>
                  <View style={styles.resultOptions}>
                    <Pressable
                      style={[
                        styles.resultOption,
                        { 
                          backgroundColor: resultData.result === 'pass' ? '#10B981' + '20' : colors.backgroundSecondary,
                          borderColor: resultData.result === 'pass' ? '#10B981' : colors.border,
                        }
                      ]}
                      onPress={() => setResultData(prev => ({ ...prev, result: 'pass' }))}
                    >
                      <CheckCircle2 size={24} color={resultData.result === 'pass' ? '#10B981' : colors.textSecondary} />
                      <Text style={[
                        styles.resultOptionText,
                        { color: resultData.result === 'pass' ? '#10B981' : colors.text }
                      ]}>
                        Pass
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.resultOption,
                        { 
                          backgroundColor: resultData.result === 'fail' ? '#EF4444' + '20' : colors.backgroundSecondary,
                          borderColor: resultData.result === 'fail' ? '#EF4444' : colors.border,
                        }
                      ]}
                      onPress={() => setResultData(prev => ({ ...prev, result: 'fail' }))}
                    >
                      <AlertTriangle size={24} color={resultData.result === 'fail' ? '#EF4444' : colors.textSecondary} />
                      <Text style={[
                        styles.resultOptionText,
                        { color: resultData.result === 'fail' ? '#EF4444' : colors.text }
                      ]}>
                        Fail
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {selectedSwab.test_type === 'atp' && (
                  <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>ATP Reading (RLU) *</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder="Enter reading..."
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      value={resultData.atp_reading}
                      onChangeText={(text) => setResultData(prev => ({ ...prev, atp_reading: text }))}
                    />
                    {selectedSwab.atp_threshold && (
                      <Text style={[styles.thresholdHint, { color: colors.textTertiary }]}>
                        Threshold: ≤ {selectedSwab.atp_threshold} RLU
                      </Text>
                    )}
                  </View>
                )}

                {resultData.result === 'fail' && (
                  <>
                    <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>Corrective Action</Text>
                      <TextInput
                        style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        placeholder="Describe corrective action taken..."
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        value={resultData.corrective_action}
                        onChangeText={(text) => setResultData(prev => ({ ...prev, corrective_action: text }))}
                      />
                    </View>

                    <Pressable
                      style={[styles.checkboxRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setResultData(prev => ({ ...prev, retest_required: !prev.retest_required }))}
                    >
                      <View style={[
                        styles.checkbox,
                        { 
                          borderColor: resultData.retest_required ? '#F59E0B' : colors.border,
                          backgroundColor: resultData.retest_required ? '#F59E0B' : 'transparent',
                        }
                      ]}>
                        {resultData.retest_required && <CheckCircle2 size={14} color="#FFF" />}
                      </View>
                      <Text style={[styles.checkboxText, { color: colors.text }]}>Retest Required</Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    { 
                      backgroundColor: resultData.result === 'pass' ? '#10B981' : '#EF4444',
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                  onPress={handleRecordResult}
                >
                  <FileText size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>Record Result</Text>
                </Pressable>

                <View style={styles.modalBottomPadding} />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
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
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    alignItems: 'center' as const,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScroll: {
    flexDirection: 'row' as const,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  swabList: {
    gap: 12,
  },
  swabCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  swabHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
  },
  swabHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  swabNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  swabDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  swabMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 6,
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoneText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dateText: {
    fontSize: 12,
  },
  resultRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
    borderTopWidth: 1,
  },
  resultLabel: {
    fontSize: 13,
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  failedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
  },
  failedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  actionRow: {
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center' as const,
  },
  actionHint: {
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06B6D4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  reasonList: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
  },
  zoneGrid: {
    gap: 8,
  },
  zoneOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  zoneLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  zoneDesc: {
    fontSize: 12,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textAreaInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    borderWidth: 1,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
  swabInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  swabInfoText: {
    fontSize: 14,
    marginBottom: 2,
  },
  resultOptions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  resultOption: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  resultOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  thresholdHint: {
    fontSize: 12,
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
