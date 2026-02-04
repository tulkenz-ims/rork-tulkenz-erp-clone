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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Thermometer,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface TempReading {
  id: string;
  date: string;
  time: string;
  location: string;
  equipment: string;
  temperature: number;
  unit: 'F' | 'C';
  minTemp: number;
  maxTemp: number;
  status: 'pass' | 'fail';
  correctiveAction: string;
  recordedBy: string;
}

const EQUIPMENT_LOCATIONS: { location: string; equipment: string; minTemp: number; maxTemp: number }[] = [
  { location: 'Cold Storage', equipment: 'Walk-in Cooler #1', minTemp: 32, maxTemp: 40 },
  { location: 'Cold Storage', equipment: 'Walk-in Cooler #2', minTemp: 32, maxTemp: 40 },
  { location: 'Cold Storage', equipment: 'Walk-in Freezer #1', minTemp: -10, maxTemp: 0 },
  { location: 'Cold Storage', equipment: 'Walk-in Freezer #2', minTemp: -10, maxTemp: 0 },
  { location: 'Production', equipment: 'Blast Chiller', minTemp: 32, maxTemp: 38 },
  { location: 'Production', equipment: 'Cooking Kettle #1', minTemp: 165, maxTemp: 212 },
  { location: 'Production', equipment: 'Cooking Kettle #2', minTemp: 165, maxTemp: 212 },
  { location: 'Receiving', equipment: 'Receiving Dock Cooler', minTemp: 32, maxTemp: 45 },
  { location: 'Shipping', equipment: 'Shipping Dock Holding', minTemp: 32, maxTemp: 40 },
];

const INITIAL_READINGS: TempReading[] = [
  {
    id: '1',
    date: '2026-01-17',
    time: '06:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Cooler #1',
    temperature: 36,
    unit: 'F',
    minTemp: 32,
    maxTemp: 40,
    status: 'pass',
    correctiveAction: '',
    recordedBy: 'Maria Santos',
  },
  {
    id: '2',
    date: '2026-01-17',
    time: '06:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Cooler #2',
    temperature: 38,
    unit: 'F',
    minTemp: 32,
    maxTemp: 40,
    status: 'pass',
    correctiveAction: '',
    recordedBy: 'Maria Santos',
  },
  {
    id: '3',
    date: '2026-01-17',
    time: '06:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Freezer #1',
    temperature: -5,
    unit: 'F',
    minTemp: -10,
    maxTemp: 0,
    status: 'pass',
    correctiveAction: '',
    recordedBy: 'Maria Santos',
  },
  {
    id: '4',
    date: '2026-01-17',
    time: '06:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Freezer #2',
    temperature: 3,
    unit: 'F',
    minTemp: -10,
    maxTemp: 0,
    status: 'fail',
    correctiveAction: 'Freezer showing 3°F, above max of 0°F. Maintenance notified. Products moved to Freezer #1.',
    recordedBy: 'Maria Santos',
  },
  {
    id: '5',
    date: '2026-01-16',
    time: '14:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Cooler #1',
    temperature: 37,
    unit: 'F',
    minTemp: 32,
    maxTemp: 40,
    status: 'pass',
    correctiveAction: '',
    recordedBy: 'Tom Rodriguez',
  },
  {
    id: '6',
    date: '2026-01-16',
    time: '14:00',
    location: 'Cold Storage',
    equipment: 'Walk-in Freezer #1',
    temperature: -8,
    unit: 'F',
    minTemp: -10,
    maxTemp: 0,
    status: 'pass',
    correctiveAction: '',
    recordedBy: 'Tom Rodriguez',
  },
];

export default function TemperatureLogScreen() {
  const { colors } = useTheme();
  const [readings, setReadings] = useState<TempReading[]>(INITIAL_READINGS);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<typeof EQUIPMENT_LOCATIONS[0] | null>(null);
  const [tempInput, setTempInput] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const todayStr = '2026-01-17';

  const filteredReadings = useMemo(() => {
    if (filterDate === 'today') {
      return readings.filter(r => r.date === todayStr);
    }
    return readings;
  }, [readings, filterDate]);

  const stats = useMemo(() => {
    const todayReadings = readings.filter(r => r.date === todayStr);
    return {
      total: todayReadings.length,
      pass: todayReadings.filter(r => r.status === 'pass').length,
      fail: todayReadings.filter(r => r.status === 'fail').length,
      pending: EQUIPMENT_LOCATIONS.length - todayReadings.length,
    };
  }, [readings]);

  const calculateStatus = (temp: number, min: number, max: number): 'pass' | 'fail' => {
    return temp >= min && temp <= max ? 'pass' : 'fail';
  };

  const handleAddReading = useCallback(() => {
    if (!selectedEquipment || !tempInput) {
      Alert.alert('Required Fields', 'Please select equipment and enter temperature.');
      return;
    }

    const temperature = parseFloat(tempInput);
    if (isNaN(temperature)) {
      Alert.alert('Invalid Temperature', 'Please enter a valid number.');
      return;
    }

    const status = calculateStatus(temperature, selectedEquipment.minTemp, selectedEquipment.maxTemp);
    
    if (status === 'fail' && !correctiveAction.trim()) {
      Alert.alert('Corrective Action Required', 'Temperature is out of range. Please document corrective action taken.');
      return;
    }

    const now = new Date();
    const reading: TempReading = {
      id: Date.now().toString(),
      date: todayStr,
      time: now.toTimeString().slice(0, 5),
      location: selectedEquipment.location,
      equipment: selectedEquipment.equipment,
      temperature,
      unit: 'F',
      minTemp: selectedEquipment.minTemp,
      maxTemp: selectedEquipment.maxTemp,
      status,
      correctiveAction: correctiveAction.trim(),
      recordedBy: 'Current User',
    };

    setReadings(prev => [reading, ...prev]);
    setShowAddModal(false);
    setSelectedEquipment(null);
    setTempInput('');
    setCorrectiveAction('');
    Haptics.notificationAsync(
      status === 'pass' 
        ? Haptics.NotificationFeedbackType.Success 
        : Haptics.NotificationFeedbackType.Warning
    );
    console.log('[TempLog] Added reading:', reading.equipment, temperature + '°F', status);
  }, [selectedEquipment, tempInput, correctiveAction]);

  const currentTempStatus = useMemo(() => {
    if (!selectedEquipment || !tempInput) return null;
    const temp = parseFloat(tempInput);
    if (isNaN(temp)) return null;
    return calculateStatus(temp, selectedEquipment.minTemp, selectedEquipment.maxTemp);
  }, [selectedEquipment, tempInput]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, TempReading[]> = {};
    filteredReadings.forEach(r => {
      if (!groups[r.location]) groups[r.location] = [];
      groups[r.location].push(r);
    });
    return groups;
  }, [filteredReadings]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <Thermometer size={28} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Temperature Log</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Record and monitor temperatures for coolers, freezers, and storage areas
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recorded</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.pass}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pass</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.fail}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Fail</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
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
            <Text style={styles.addButtonText}>Log Temp</Text>
          </Pressable>
        </View>

        {Object.entries(groupedByLocation).map(([location, locationReadings]) => (
          <View key={location} style={styles.locationSection}>
            <Text style={[styles.locationTitle, { color: colors.text }]}>{location}</Text>
            {locationReadings.map(reading => (
              <View
                key={reading.id}
                style={[
                  styles.readingCard,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: reading.status === 'fail' ? '#EF4444' : colors.border,
                    borderLeftWidth: 3,
                    borderLeftColor: reading.status === 'pass' ? '#10B981' : '#EF4444',
                  },
                ]}
              >
                <View style={styles.readingHeader}>
                  <View style={styles.equipmentInfo}>
                    <Text style={[styles.equipmentName, { color: colors.text }]}>{reading.equipment}</Text>
                    <View style={styles.timeRow}>
                      <Clock size={12} color={colors.textTertiary} />
                      <Text style={[styles.timeText, { color: colors.textTertiary }]}>
                        {reading.date} at {reading.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tempDisplay}>
                    <Text style={[
                      styles.tempValue,
                      { color: reading.status === 'pass' ? '#10B981' : '#EF4444' },
                    ]}>
                      {reading.temperature}°{reading.unit}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: reading.status === 'pass' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                    ]}>
                      {reading.status === 'pass' ? (
                        <CheckCircle size={12} color="#10B981" />
                      ) : (
                        <AlertTriangle size={12} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.statusText,
                        { color: reading.status === 'pass' ? '#10B981' : '#EF4444' },
                      ]}>
                        {reading.status === 'pass' ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.rangeRow}>
                  <Text style={[styles.rangeText, { color: colors.textSecondary }]}>
                    Acceptable Range: {reading.minTemp}°F - {reading.maxTemp}°F
                  </Text>
                </View>

                {reading.correctiveAction ? (
                  <View style={[styles.correctiveBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Text style={[styles.correctiveLabel, { color: '#EF4444' }]}>Corrective Action:</Text>
                    <Text style={[styles.correctiveText, { color: colors.text }]}>{reading.correctiveAction}</Text>
                  </View>
                ) : null}

                <View style={styles.recordedBy}>
                  <User size={12} color={colors.textTertiary} />
                  <Text style={[styles.recordedByText, { color: colors.textTertiary }]}>
                    Recorded by {reading.recordedBy}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {filteredReadings.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Thermometer size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Readings</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterDate === 'today' ? 'No temperature readings recorded today' : 'No temperature readings found'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => {
              setShowAddModal(false);
              setSelectedEquipment(null);
              setTempInput('');
              setCorrectiveAction('');
            }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Temperature</Text>
            <Pressable onPress={handleAddReading}>
              <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Equipment *</Text>
            {EQUIPMENT_LOCATIONS.map((eq, index) => (
              <Pressable
                key={index}
                style={[
                  styles.equipmentOption,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: selectedEquipment?.equipment === eq.equipment ? colors.primary : colors.border,
                  },
                  selectedEquipment?.equipment === eq.equipment && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setSelectedEquipment(eq)}
              >
                <View style={styles.equipmentOptionInfo}>
                  <Text style={[styles.equipmentOptionName, { color: colors.text }]}>{eq.equipment}</Text>
                  <Text style={[styles.equipmentOptionRange, { color: colors.textSecondary }]}>
                    Range: {eq.minTemp}°F - {eq.maxTemp}°F
                  </Text>
                </View>
                <MapPin size={16} color={colors.textTertiary} />
              </Pressable>
            ))}

            {selectedEquipment && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text, marginTop: 20 }]}>Temperature Reading (°F) *</Text>
                <View style={styles.tempInputRow}>
                  <TextInput
                    style={[
                      styles.tempInput,
                      { 
                        backgroundColor: colors.surface, 
                        borderColor: currentTempStatus === 'fail' ? '#EF4444' : currentTempStatus === 'pass' ? '#10B981' : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter temperature"
                    placeholderTextColor={colors.textTertiary}
                    value={tempInput}
                    onChangeText={setTempInput}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.tempUnit, { color: colors.textSecondary }]}>°F</Text>
                  {currentTempStatus && (
                    <View style={[
                      styles.tempStatusIndicator,
                      { backgroundColor: currentTempStatus === 'pass' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                    ]}>
                      {currentTempStatus === 'pass' ? (
                        <CheckCircle size={20} color="#10B981" />
                      ) : (
                        <AlertTriangle size={20} color="#EF4444" />
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.rangeInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.rangeInfoRow}>
                    <TrendingDown size={14} color="#3B82F6" />
                    <Text style={[styles.rangeInfoText, { color: colors.textSecondary }]}>
                      Min: {selectedEquipment.minTemp}°F
                    </Text>
                  </View>
                  <View style={styles.rangeInfoRow}>
                    <TrendingUp size={14} color="#EF4444" />
                    <Text style={[styles.rangeInfoText, { color: colors.textSecondary }]}>
                      Max: {selectedEquipment.maxTemp}°F
                    </Text>
                  </View>
                </View>

                {currentTempStatus === 'fail' && (
                  <>
                    <Text style={[styles.inputLabel, { color: '#EF4444', marginTop: 16 }]}>
                      Corrective Action Required *
                    </Text>
                    <TextInput
                      style={[
                        styles.textArea,
                        { backgroundColor: colors.surface, borderColor: '#EF4444', color: colors.text },
                      ]}
                      placeholder="Document corrective action taken..."
                      placeholderTextColor={colors.textTertiary}
                      value={correctiveAction}
                      onChangeText={setCorrectiveAction}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </>
                )}
              </>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    fontSize: 13,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  locationSection: {
    marginBottom: 20,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  readingCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  readingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  tempDisplay: {
    alignItems: 'flex-end' as const,
  },
  tempValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  rangeRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  rangeText: {
    fontSize: 12,
  },
  correctiveBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  correctiveLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  correctiveText: {
    fontSize: 12,
    lineHeight: 18,
  },
  recordedBy: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 10,
  },
  recordedByText: {
    fontSize: 11,
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  equipmentOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  equipmentOptionInfo: {
    flex: 1,
  },
  equipmentOptionName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  equipmentOptionRange: {
    fontSize: 12,
  },
  tempInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  tempInput: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '600' as const,
  },
  tempUnit: {
    fontSize: 18,
    fontWeight: '500' as const,
  },
  tempStatusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rangeInfo: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  rangeInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  rangeInfoText: {
    fontSize: 13,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
});
