import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  FileCheck,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  Building,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useEmergencyActionPlan } from '@/hooks/useSafetyEmergencyPreparedness';
import { EmergencyActionPlanEntry, EAPStatus } from '@/types/emergencyPreparedness';

const DEPARTMENTS = [
  'Production',
  'Sanitation',
  'Maintenance',
  'Quality',
  'Warehouse',
  'Shipping',
  'Receiving',
  'Administration',
  'Safety',
];

const SHIFTS = ['1st Shift', '2nd Shift', '3rd Shift', 'Rotating'];

const ASSEMBLY_POINTS = [
  'Assembly Point A - North Parking Lot',
  'Assembly Point B - South Parking Lot',
  'Assembly Point C - East Gate',
  'Assembly Point D - West Loading Dock',
];

const TRAINING_OPTIONS = [
  'Fire Safety',
  'Evacuation Procedures',
  'First Aid Awareness',
  'AED Training',
  'Severe Weather Response',
  'Chemical Spill Response',
  'Active Shooter Training',
];

export default function EmergencyActionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EmergencyActionPlanEntry | null>(null);

  const {
    entries,
    isLoading,
    isRefetching,
    createEntry,
    updateEntry,
    isCreating,
    isUpdating,
    refetch,
  } = useEmergencyActionPlan();

  const [formData, setFormData] = useState({
    employee_name: '',
    employee_code: '',
    department: '',
    work_location: '',
    shift: '',
    plan_version: 'EAP-2024-v3.2',
    evacuation_routes: false,
    assembly_point: '',
    alarm_recognition: false,
    emergency_contacts: false,
    fire_extinguisher: false,
    first_aid_kit: false,
    aed_location: false,
    shelter_location: false,
    special_duties: '',
    medical_considerations: '',
    training_completed: [] as string[],
    supervisor_name: '',
    notes: '',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      employee_name: '',
      employee_code: '',
      department: '',
      work_location: '',
      shift: '',
      plan_version: 'EAP-2024-v3.2',
      evacuation_routes: false,
      assembly_point: '',
      alarm_recognition: false,
      emergency_contacts: false,
      fire_extinguisher: false,
      first_aid_kit: false,
      aed_location: false,
      shelter_location: false,
      special_duties: '',
      medical_considerations: '',
      training_completed: [],
      supervisor_name: '',
      notes: '',
    });
    setEditingEntry(null);
  };

  const handleAddEntry = async () => {
    if (!formData.employee_name.trim() || !formData.department) {
      Alert.alert('Required Fields', 'Please enter employee name and department.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const allAcknowledged = formData.evacuation_routes && formData.alarm_recognition && 
        formData.emergency_contacts && formData.fire_extinguisher && formData.first_aid_kit && 
        formData.aed_location && formData.shelter_location;

      const status: EAPStatus = allAcknowledged ? 'acknowledged' : formData.training_completed.length === 0 ? 'needs_training' : 'pending';

      const entryData = {
        employee_name: formData.employee_name,
        employee_code: formData.employee_code || undefined,
        department: formData.department,
        work_location: formData.work_location || undefined,
        shift: formData.shift || undefined,
        acknowledgment_date: allAcknowledged ? new Date().toISOString().split('T')[0] : undefined,
        plan_version: formData.plan_version,
        evacuation_routes: formData.evacuation_routes,
        assembly_point: formData.assembly_point || undefined,
        alarm_recognition: formData.alarm_recognition,
        emergency_contacts: formData.emergency_contacts,
        fire_extinguisher: formData.fire_extinguisher,
        first_aid_kit: formData.first_aid_kit,
        aed_location: formData.aed_location,
        shelter_location: formData.shelter_location,
        special_duties: formData.special_duties || undefined,
        medical_considerations: formData.medical_considerations || undefined,
        training_completed: formData.training_completed,
        supervisor_name: formData.supervisor_name || undefined,
        supervisor_signature: allAcknowledged,
        employee_signature: allAcknowledged,
        notes: formData.notes || undefined,
        status,
      };

      if (editingEntry) {
        await updateEntry({ id: editingEntry.id, ...entryData });
      } else {
        await createEntry(entryData);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    }
  };

  const handleEditEntry = (entry: EmergencyActionPlanEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_name: entry.employee_name,
      employee_code: entry.employee_code || '',
      department: entry.department,
      work_location: entry.work_location || '',
      shift: entry.shift || '',
      plan_version: entry.plan_version,
      evacuation_routes: entry.evacuation_routes,
      assembly_point: entry.assembly_point || '',
      alarm_recognition: entry.alarm_recognition,
      emergency_contacts: entry.emergency_contacts,
      fire_extinguisher: entry.fire_extinguisher,
      first_aid_kit: entry.first_aid_kit,
      aed_location: entry.aed_location,
      shelter_location: entry.shelter_location,
      special_duties: entry.special_duties || '',
      medical_considerations: entry.medical_considerations || '',
      training_completed: entry.training_completed || [],
      supervisor_name: entry.supervisor_name || '',
      notes: entry.notes || '',
    });
    setShowAddModal(true);
  };

  const toggleTraining = (item: string) => {
    setFormData(prev => ({
      ...prev,
      training_completed: prev.training_completed.includes(item)
        ? prev.training_completed.filter(t => t !== item)
        : [...prev.training_completed, item],
    }));
  };

  const filteredEntries = entries.filter(entry =>
    entry.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'needs_training': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'acknowledged': return 'Acknowledged';
      case 'pending': return 'Pending';
      case 'needs_training': return 'Needs Training';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Emergency Action Plan' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Emergency Action Plan',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {entries.filter(e => e.status === 'acknowledged').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Acknowledged</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {entries.filter(e => e.status === 'pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <Shield size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {entries.filter(e => e.status === 'needs_training').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Needs Training</Text>
          </View>
        </View>

        {filteredEntries.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileCheck size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No EAP Entries</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tap the + button to add employee EAP acknowledgments
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry) => (
            <Pressable
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleEditEntry(entry)}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleRow}>
                  <User size={20} color="#DC2626" />
                  <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                    {entry.employee_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                    {getStatusLabel(entry.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.entryDetails}>
                <View style={styles.detailRow}>
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>{entry.department}</Text>
                  <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {entry.work_location || 'Not assigned'}
                  </Text>
                </View>
              </View>

              {entry.assembly_point && (
                <View style={styles.assemblyRow}>
                  <Text style={[styles.assemblyLabel, { color: colors.textSecondary }]}>Assembly:</Text>
                  <Text style={[styles.assemblyText, { color: colors.text }]} numberOfLines={1}>
                    {entry.assembly_point}
                  </Text>
                </View>
              )}

              {entry.special_duties && (
                <View style={[styles.dutyBadge, { backgroundColor: '#DC262620' }]}>
                  <Text style={[styles.dutyText, { color: '#DC2626' }]}>{entry.special_duties}</Text>
                </View>
              )}

              <View style={styles.checklistSummary}>
                <View style={[styles.checkItem, { backgroundColor: entry.evacuation_routes ? '#10B98115' : '#EF444415' }]}>
                  <Text style={[styles.checkItemText, { color: entry.evacuation_routes ? '#10B981' : '#EF4444' }]}>
                    Routes {entry.evacuation_routes ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={[styles.checkItem, { backgroundColor: entry.alarm_recognition ? '#10B98115' : '#EF444415' }]}>
                  <Text style={[styles.checkItemText, { color: entry.alarm_recognition ? '#10B981' : '#EF4444' }]}>
                    Alarms {entry.alarm_recognition ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={[styles.checkItem, { backgroundColor: entry.aed_location ? '#10B98115' : '#EF444415' }]}>
                  <Text style={[styles.checkItemText, { color: entry.aed_location ? '#10B981' : '#EF4444' }]}>
                    AED {entry.aed_location ? '✓' : '✗'}
                  </Text>
                </View>
              </View>

              <View style={styles.entryFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {entry.acknowledgment_date || 'Not acknowledged'}
                  </Text>
                </View>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>
                  {entry.plan_version}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#DC2626' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEntry ? 'Edit Acknowledgment' : 'New EAP Acknowledgment'}
            </Text>
            <Pressable onPress={handleAddEntry} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={[styles.saveButton, { color: '#DC2626' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Employee Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter employee name"
              placeholderTextColor={colors.textSecondary}
              value={formData.employee_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, employee_name: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Employee ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="EMP-XXXX-XXX"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.employee_code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, employee_code: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Supervisor</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Supervisor name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.supervisor_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, supervisor_name: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Department *</Text>
            <View style={styles.chipContainer}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.department === dept ? '#DC262620' : colors.surface,
                      borderColor: formData.department === dept ? '#DC2626' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, department: dept }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.department === dept ? '#DC2626' : colors.textSecondary },
                  ]}>
                    {dept}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Work Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Primary work area"
              placeholderTextColor={colors.textSecondary}
              value={formData.work_location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, work_location: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Shift</Text>
            <View style={styles.chipContainer}>
              {SHIFTS.map((shift) => (
                <Pressable
                  key={shift}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.shift === shift ? '#3B82F620' : colors.surface,
                      borderColor: formData.shift === shift ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, shift }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.shift === shift ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {shift}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assembly Point</Text>
            <View style={styles.chipContainer}>
              {ASSEMBLY_POINTS.map((point) => (
                <Pressable
                  key={point}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.assembly_point === point ? '#10B98120' : colors.surface,
                      borderColor: formData.assembly_point === point ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, assembly_point: point }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.assembly_point === point ? '#10B981' : colors.textSecondary },
                  ]}>
                    {point}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Knowledge Verification</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Knows Evacuation Routes</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.evacuation_routes ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, evacuation_routes: !prev.evacuation_routes }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.evacuation_routes ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Recognizes Alarm Signals</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.alarm_recognition ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, alarm_recognition: !prev.alarm_recognition }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.alarm_recognition ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Knows Emergency Contacts</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.emergency_contacts ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, emergency_contacts: !prev.emergency_contacts }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.emergency_contacts ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Fire Extinguisher Locations</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.fire_extinguisher ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, fire_extinguisher: !prev.fire_extinguisher }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.fire_extinguisher ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>First Aid Kit Locations</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.first_aid_kit ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, first_aid_kit: !prev.first_aid_kit }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.first_aid_kit ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>AED Locations</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.aed_location ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, aed_location: !prev.aed_location }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.aed_location ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Severe Weather Shelter</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.shelter_location ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, shelter_location: !prev.shelter_location }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.shelter_location ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Training Completed</Text>
            <View style={styles.chipContainer}>
              {TRAINING_OPTIONS.map((training) => (
                <Pressable
                  key={training}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.training_completed.includes(training) ? '#8B5CF620' : colors.surface,
                      borderColor: formData.training_completed.includes(training) ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleTraining(training)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.training_completed.includes(training) ? '#8B5CF6' : colors.textSecondary },
                  ]}>
                    {training}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Emergency Duties</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Floor Warden, ERT Member"
              placeholderTextColor={colors.textSecondary}
              value={formData.special_duties}
              onChangeText={(text) => setFormData(prev => ({ ...prev, special_duties: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Medical Considerations</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Any mobility or medical considerations for evacuation..."
              placeholderTextColor={colors.textSecondary}
              value={formData.medical_considerations}
              onChangeText={(text) => setFormData(prev => ({ ...prev, medical_considerations: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  backButton: { padding: 8, marginLeft: -8 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  statsRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const },
  emptyState: {
    alignItems: 'center' as const,
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center' as const, marginTop: 8 },
  entryCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  entryHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  entryTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 8 },
  entryTitle: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  entryDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  detailText: { fontSize: 12 },
  separator: { marginHorizontal: 2 },
  assemblyRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 8 },
  assemblyLabel: { fontSize: 12, fontWeight: '500' as const },
  assemblyText: { fontSize: 12, flex: 1 },
  dutyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' as const, marginBottom: 8 },
  dutyText: { fontSize: 11, fontWeight: '500' as const },
  checklistSummary: { flexDirection: 'row' as const, gap: 6, marginBottom: 10, flexWrap: 'wrap' as const },
  checkItem: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  checkItemText: { fontSize: 10, fontWeight: '500' as const },
  entryFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 11 },
  versionText: { fontSize: 11 },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500' as const, marginBottom: 6, marginTop: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, marginTop: 20, marginBottom: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 60 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11 },
  toggleRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
