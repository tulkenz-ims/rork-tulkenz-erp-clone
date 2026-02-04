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
  Users,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Building,
  ClipboardList,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useAssemblyHeadcount } from '@/hooks/useSafetyEmergencyPreparedness';
import { AssemblyHeadcountEntry, AssemblyHeadcountStatus } from '@/types/emergencyPreparedness';

const EVENT_TYPES = ['Fire Drill', 'Evacuation', 'Severe Weather', 'Chemical Spill', 'Real Emergency', 'Active Threat', 'Other'];
const ASSEMBLY_POINTS = ['Assembly Point A', 'Assembly Point B', 'Assembly Point C', 'Assembly Point D', 'Parking Lot North', 'Parking Lot South'];
const SHIFTS = ['1st Shift', '2nd Shift', '3rd Shift', 'All Shifts'];
const DEPARTMENTS = ['Production', 'Warehouse', 'Office', 'Maintenance', 'Quality', 'Shipping', 'All Departments'];

export default function AssemblyHeadcountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AssemblyHeadcountEntry | null>(null);

  const {
    entries: headcounts,
    isLoading,
    isRefetching,
    createEntry,
    updateEntry,
    isCreating,
    isUpdating,
    refetch,
  } = useAssemblyHeadcount();

  const [formData, setFormData] = useState({
    event_date: new Date().toISOString().split('T')[0],
    event_time: '',
    event_type: '',
    assembly_point: '',
    shift: '',
    department: '',
    expected_count: '',
    actual_count: '',
    unaccounted_names: '',
    found_locations: '',
    time_to_complete: '',
    all_clear: false,
    all_clear_time: '',
    conducted_by: '',
    supervisor_name: '',
    special_needs: '',
    weather_conditions: '',
    notes: '',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      event_date: new Date().toISOString().split('T')[0],
      event_time: '',
      event_type: '',
      assembly_point: '',
      shift: '',
      department: '',
      expected_count: '',
      actual_count: '',
      unaccounted_names: '',
      found_locations: '',
      time_to_complete: '',
      all_clear: false,
      all_clear_time: '',
      conducted_by: '',
      supervisor_name: '',
      special_needs: '',
      weather_conditions: '',
      notes: '',
    });
    setEditingEntry(null);
  };

  const handleSaveEntry = async () => {
    if (!formData.event_date || !formData.assembly_point || !formData.department) {
      Alert.alert('Required Fields', 'Please enter event date, assembly point, and department.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const expected = parseInt(formData.expected_count) || 0;
      const actual = parseInt(formData.actual_count) || 0;
      const unaccounted = formData.unaccounted_names.split(',').map(n => n.trim()).filter(Boolean);

      let status: AssemblyHeadcountStatus = 'complete';
      if (!formData.all_clear) {
        status = 'in_progress';
      } else if (unaccounted.length > 0 || expected !== actual) {
        status = 'discrepancy';
      }

      const entryData = {
        event_date: formData.event_date,
        event_time: formData.event_time || undefined,
        event_type: formData.event_type,
        assembly_point: formData.assembly_point,
        shift: formData.shift || undefined,
        department: formData.department,
        expected_count: expected,
        actual_count: actual,
        accounted_for: [],
        unaccounted,
        found_locations: formData.found_locations || undefined,
        time_to_complete: formData.time_to_complete || undefined,
        all_clear: formData.all_clear,
        all_clear_time: formData.all_clear_time || undefined,
        conducted_by: formData.conducted_by || undefined,
        supervisor_name: formData.supervisor_name || undefined,
        special_needs: formData.special_needs || undefined,
        weather_conditions: formData.weather_conditions || undefined,
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

  const handleEditEntry = (entry: AssemblyHeadcountEntry) => {
    setEditingEntry(entry);
    setFormData({
      event_date: entry.event_date,
      event_time: entry.event_time || '',
      event_type: entry.event_type,
      assembly_point: entry.assembly_point,
      shift: entry.shift || '',
      department: entry.department || '',
      expected_count: entry.expected_count.toString(),
      actual_count: entry.actual_count.toString(),
      unaccounted_names: (entry.unaccounted || []).join(', '),
      found_locations: entry.found_locations || '',
      time_to_complete: entry.time_to_complete || '',
      all_clear: entry.all_clear,
      all_clear_time: entry.all_clear_time || '',
      conducted_by: entry.conducted_by || '',
      supervisor_name: entry.supervisor_name || '',
      special_needs: entry.special_needs || '',
      weather_conditions: entry.weather_conditions || '',
      notes: entry.notes || '',
    });
    setShowAddModal(true);
  };

  const filteredHeadcounts = headcounts.filter(entry =>
    entry.assembly_point.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.event_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return '#10B981';
      case 'discrepancy': return '#F59E0B';
      case 'incomplete': return '#EF4444';
      case 'in_progress': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete': return 'All Accounted';
      case 'discrepancy': return 'Discrepancy';
      case 'incomplete': return 'Incomplete';
      case 'in_progress': return 'In Progress';
      default: return status;
    }
  };

  const totalExpected = headcounts.reduce((sum, h) => sum + h.expected_count, 0);
  const totalActual = headcounts.reduce((sum, h) => sum + h.actual_count, 0);
  const totalUnaccounted = headcounts.reduce((sum, h) => sum + (h.unaccounted || []).length, 0);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Assembly Headcount' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Assembly Headcount',
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
          placeholder="Search headcounts..."
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
            <UserCheck size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {headcounts.filter(h => h.status === 'complete').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Complete</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
            <Users size={18} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{totalActual}/{totalExpected}</Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Accounted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <UserX size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{totalUnaccounted}</Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Unaccounted</Text>
          </View>
        </View>

        <View style={[styles.infoBanner, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
          <ClipboardList size={18} color="#8B5CF6" />
          <View style={styles.infoBannerContent}>
            <Text style={[styles.infoBannerTitle, { color: '#8B5CF6' }]}>Headcount Protocol</Text>
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Account for all personnel at designated assembly points. Report any missing persons immediately.
            </Text>
          </View>
        </View>

        {filteredHeadcounts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Headcount Records</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tap the + button to record an assembly headcount
            </Text>
          </View>
        ) : (
          filteredHeadcounts.map((entry) => (
            <Pressable
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleEditEntry(entry)}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleRow}>
                  <MapPin size={18} color="#8B5CF6" />
                  <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.assembly_point}</Text>
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
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{entry.event_type}</Text>
                </View>
              </View>

              <View style={styles.headcountRow}>
                <View style={[styles.headcountBox, { backgroundColor: entry.expected_count === entry.actual_count ? '#10B98115' : '#F59E0B15' }]}>
                  <UserCheck size={16} color={entry.expected_count === entry.actual_count ? '#10B981' : '#F59E0B'} />
                  <Text style={[styles.headcountValue, { color: entry.expected_count === entry.actual_count ? '#10B981' : '#F59E0B' }]}>
                    {entry.actual_count}/{entry.expected_count}
                  </Text>
                  <Text style={[styles.headcountLabel, { color: colors.textSecondary }]}>Present</Text>
                </View>
                {(entry.unaccounted || []).length > 0 && (
                  <View style={[styles.headcountBox, { backgroundColor: '#EF444415' }]}>
                    <UserX size={16} color="#EF4444" />
                    <Text style={[styles.headcountValue, { color: '#EF4444' }]}>{(entry.unaccounted || []).length}</Text>
                    <Text style={[styles.headcountLabel, { color: colors.textSecondary }]}>Missing</Text>
                  </View>
                )}
                <View style={[styles.headcountBox, { backgroundColor: '#3B82F615' }]}>
                  <Timer size={16} color="#3B82F6" />
                  <Text style={[styles.headcountValue, { color: '#3B82F6' }]}>{entry.time_to_complete || '--'}</Text>
                  <Text style={[styles.headcountLabel, { color: colors.textSecondary }]}>Time</Text>
                </View>
              </View>

              {(entry.unaccounted || []).length > 0 && (
                <View style={[styles.unaccountedBanner, { backgroundColor: '#EF444410' }]}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <Text style={[styles.unaccountedText, { color: '#EF4444' }]} numberOfLines={1}>
                    Unaccounted: {(entry.unaccounted || []).join(', ')}
                  </Text>
                </View>
              )}

              {entry.all_clear && (
                <View style={[styles.allClearBadge, { backgroundColor: '#10B98115' }]}>
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text style={[styles.allClearText, { color: '#10B981' }]}>
                    All Clear at {entry.all_clear_time || '--'}
                  </Text>
                </View>
              )}

              <View style={styles.entryFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {entry.event_date} @ {entry.event_time || '--'}
                  </Text>
                </View>
                <Text style={[styles.conductorText, { color: colors.textSecondary }]}>
                  {entry.conducted_by || 'Unknown'}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#8B5CF6' }]}
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
              {editingEntry ? 'Edit Headcount' : 'New Headcount'}
            </Text>
            <Pressable onPress={handleSaveEntry} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={[styles.saveButton, { color: '#8B5CF6' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Event Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.event_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, event_date: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Event Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.event_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, event_time: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Event Type</Text>
            <View style={styles.chipContainer}>
              {EVENT_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.event_type === type ? '#8B5CF620' : colors.surface,
                      borderColor: formData.event_type === type ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, event_type: type }))}
                >
                  <Text style={[styles.chipText, { color: formData.event_type === type ? '#8B5CF6' : colors.textSecondary }]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assembly Point *</Text>
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
                  <Text style={[styles.chipText, { color: formData.assembly_point === point ? '#10B981' : colors.textSecondary }]}>
                    {point}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Department *</Text>
            <View style={styles.chipContainer}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.department === dept ? '#3B82F620' : colors.surface,
                      borderColor: formData.department === dept ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, department: dept }))}
                >
                  <Text style={[styles.chipText, { color: formData.department === dept ? '#3B82F6' : colors.textSecondary }]}>
                    {dept}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Shift</Text>
            <View style={styles.chipContainer}>
              {SHIFTS.map((shift) => (
                <Pressable
                  key={shift}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.shift === shift ? '#F59E0B20' : colors.surface,
                      borderColor: formData.shift === shift ? '#F59E0B' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, shift }))}
                >
                  <Text style={[styles.chipText, { color: formData.shift === shift ? '#F59E0B' : colors.textSecondary }]}>
                    {shift}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Headcount Details</Text>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Expected Count</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Total expected"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.expected_count}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, expected_count: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Actual Count</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Present"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.actual_count}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, actual_count: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Unaccounted Personnel</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Names of missing persons (comma separated)"
              placeholderTextColor={colors.textSecondary}
              value={formData.unaccounted_names}
              onChangeText={(text) => setFormData(prev => ({ ...prev, unaccounted_names: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Found Locations</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Where missing persons were found"
              placeholderTextColor={colors.textSecondary}
              value={formData.found_locations}
              onChangeText={(text) => setFormData(prev => ({ ...prev, found_locations: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Time to Complete</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="mm:ss"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.time_to_complete}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, time_to_complete: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>All Clear Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.all_clear_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, all_clear_time: text }))}
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>All Clear Given</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.all_clear ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, all_clear: !prev.all_clear }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.all_clear ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Conducted By</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.conducted_by}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, conducted_by: text }))}
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Special Needs Personnel</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Any special assistance required"
              placeholderTextColor={colors.textSecondary}
              value={formData.special_needs}
              onChangeText={(text) => setFormData(prev => ({ ...prev, special_needs: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional observations..."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
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
  statValue: { fontSize: 18, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const },
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  infoBannerText: { fontSize: 12, lineHeight: 16 },
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
    marginBottom: 8,
  },
  entryTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 8 },
  entryTitle: { fontSize: 15, fontWeight: '600' as const, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  entryDetails: { marginBottom: 10 },
  detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  detailText: { fontSize: 12 },
  separator: { marginHorizontal: 2 },
  headcountRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 10 },
  headcountBox: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  headcountValue: { fontSize: 16, fontWeight: '700' as const },
  headcountLabel: { fontSize: 10 },
  unaccountedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 8,
  },
  unaccountedText: { fontSize: 11, flex: 1 },
  allClearBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
    marginBottom: 10,
  },
  allClearText: { fontSize: 11, fontWeight: '500' as const },
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
  conductorText: { fontSize: 11 },
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
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, marginTop: 20, marginBottom: 4 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 70 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12 },
  toggleRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
