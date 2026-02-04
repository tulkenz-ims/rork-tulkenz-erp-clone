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
  UserX,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  FileText,
  Activity,
  Stethoscope,
  Building,
  Briefcase,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ChemicalExposureEntry {
  id: string;
  incident_date: string;
  incident_time: string;
  employee_name: string;
  employee_id: string;
  department: string;
  job_title: string;
  chemical_name: string;
  exposure_route: string[];
  exposure_duration: string;
  exposure_level: 'minor' | 'moderate' | 'severe' | 'unknown';
  symptoms: string[];
  symptom_onset: string;
  first_aid_provided: string[];
  medical_treatment_sought: boolean;
  medical_facility: string;
  treating_physician: string;
  diagnosis: string;
  work_restrictions: string;
  lost_work_days: number;
  ppe_worn: string[];
  ppe_failure: boolean;
  ppe_failure_description: string;
  task_performed: string;
  engineering_controls: string;
  supervisor_notified: string;
  supervisor_name: string;
  investigation_findings: string;
  corrective_actions: string;
  status: 'reported' | 'investigating' | 'medical_monitoring' | 'closed';
  reported_by: string;
  osha_recordable: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEPARTMENTS = [
  'Production',
  'Sanitation',
  'Maintenance',
  'Quality',
  'Warehouse',
  'Shipping',
  'Receiving',
];

const EXPOSURE_ROUTES = [
  'Inhalation',
  'Skin contact',
  'Eye contact',
  'Ingestion',
  'Injection',
];

const SYMPTOMS = [
  'Coughing',
  'Throat irritation',
  'Shortness of breath',
  'Skin rash',
  'Skin burns',
  'Eye irritation',
  'Eye burns',
  'Nausea',
  'Vomiting',
  'Dizziness',
  'Headache',
  'Chest tightness',
  'Wheezing',
  'Loss of consciousness',
];

const FIRST_AID = [
  'Moved to fresh air',
  'Skin washed with water',
  'Eyes flushed with water',
  'Oxygen administered',
  'CPR performed',
  'Contaminated clothing removed',
  'Emergency shower used',
  'Eyewash station used',
  'Activated charcoal given',
];

const PPE_OPTIONS = [
  'Safety glasses',
  'Chemical goggles',
  'Face shield',
  'Nitrile gloves',
  'Chemical-resistant gloves',
  'Chemical apron',
  'Chemical suit',
  'Half-face respirator',
  'Full face respirator',
  'SCBA',
  'Rubber boots',
];

async function fetchChemicalExposureEntries(): Promise<ChemicalExposureEntry[]> {
  console.log('Fetching chemical exposure entries from Supabase...');
  try {
    const { data, error } = await supabase
      .from('chemical_exposure_entries')
      .select('*')
      .order('incident_date', { ascending: false });

    if (error) {
      console.warn('Chemical exposure table may not exist, using empty data:', error.message);
      return [];
    }

    console.log('Fetched chemical exposure entries:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.warn('Chemical exposure query failed, using empty data:', err);
    return [];
  }
}

async function createChemicalExposureEntry(entry: Omit<ChemicalExposureEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ChemicalExposureEntry> {
  console.log('Creating chemical exposure entry:', entry);
  const { data, error } = await supabase
    .from('chemical_exposure_entries')
    .insert([entry])
    .select()
    .single();

  if (error) {
    console.error('Error creating chemical exposure entry:', error);
    throw error;
  }

  console.log('Created chemical exposure entry:', data);
  return data;
}

async function updateChemicalExposureEntry(id: string, entry: Partial<ChemicalExposureEntry>): Promise<ChemicalExposureEntry> {
  console.log('Updating chemical exposure entry:', id, entry);
  const { data, error } = await supabase
    .from('chemical_exposure_entries')
    .update(entry)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating chemical exposure entry:', error);
    throw error;
  }

  console.log('Updated chemical exposure entry:', data);
  return data;
}

export default function ChemicalExposureScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChemicalExposureEntry | null>(null);

  const [formData, setFormData] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().slice(0, 5),
    employeeName: '',
    employeeId: '',
    department: '',
    jobTitle: '',
    chemicalName: '',
    exposureRoute: [] as string[],
    exposureDuration: '',
    exposureLevel: 'unknown' as 'minor' | 'moderate' | 'severe' | 'unknown',
    symptoms: [] as string[],
    symptomOnset: '',
    firstAidProvided: [] as string[],
    medicalTreatmentSought: false,
    medicalFacility: '',
    treatingPhysician: '',
    diagnosis: '',
    workRestrictions: '',
    lostWorkDays: '0',
    ppeWorn: [] as string[],
    ppeFailure: false,
    ppeFailureDescription: '',
    taskPerformed: '',
    engineeringControls: '',
    supervisorName: '',
    investigationFindings: '',
    correctiveActions: '',
    oshaRecordable: false,
  });

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['chemical-exposure-entries'],
    queryFn: fetchChemicalExposureEntries,
  });

  const createMutation = useMutation({
    mutationFn: createChemicalExposureEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-exposure-entries'] });
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Create error:', error);
      Alert.alert('Error', 'Failed to save exposure report. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChemicalExposureEntry> }) => updateChemicalExposureEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chemical-exposure-entries'] });
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update exposure report. Please try again.');
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: new Date().toTimeString().slice(0, 5),
      employeeName: '',
      employeeId: '',
      department: '',
      jobTitle: '',
      chemicalName: '',
      exposureRoute: [],
      exposureDuration: '',
      exposureLevel: 'unknown',
      symptoms: [],
      symptomOnset: '',
      firstAidProvided: [],
      medicalTreatmentSought: false,
      medicalFacility: '',
      treatingPhysician: '',
      diagnosis: '',
      workRestrictions: '',
      lostWorkDays: '0',
      ppeWorn: [],
      ppeFailure: false,
      ppeFailureDescription: '',
      taskPerformed: '',
      engineeringControls: '',
      supervisorName: '',
      investigationFindings: '',
      correctiveActions: '',
      oshaRecordable: false,
    });
    setEditingEntry(null);
  };

  const handleAddEntry = () => {
    if (!formData.employeeName.trim() || !formData.chemicalName.trim()) {
      Alert.alert('Required Fields', 'Please enter employee name and chemical name.');
      return;
    }

    const entryData = {
      incident_date: formData.incidentDate,
      incident_time: formData.incidentTime,
      employee_name: formData.employeeName,
      employee_id: formData.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: formData.department,
      job_title: formData.jobTitle,
      chemical_name: formData.chemicalName,
      exposure_route: formData.exposureRoute,
      exposure_duration: formData.exposureDuration,
      exposure_level: formData.exposureLevel,
      symptoms: formData.symptoms,
      symptom_onset: formData.symptomOnset,
      first_aid_provided: formData.firstAidProvided,
      medical_treatment_sought: formData.medicalTreatmentSought,
      medical_facility: formData.medicalFacility,
      treating_physician: formData.treatingPhysician,
      diagnosis: formData.diagnosis,
      work_restrictions: formData.workRestrictions,
      lost_work_days: parseInt(formData.lostWorkDays) || 0,
      ppe_worn: formData.ppeWorn,
      ppe_failure: formData.ppeFailure,
      ppe_failure_description: formData.ppeFailureDescription,
      task_performed: formData.taskPerformed,
      engineering_controls: formData.engineeringControls,
      supervisor_notified: new Date().toISOString(),
      supervisor_name: formData.supervisorName,
      investigation_findings: formData.investigationFindings,
      corrective_actions: formData.correctiveActions,
      status: editingEntry?.status || 'reported' as const,
      reported_by: 'Current User',
      osha_recordable: formData.oshaRecordable,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: entryData });
    } else {
      createMutation.mutate(entryData);
    }
  };

  const handleEditEntry = (entry: ChemicalExposureEntry) => {
    setEditingEntry(entry);
    setFormData({
      incidentDate: entry.incident_date,
      incidentTime: entry.incident_time,
      employeeName: entry.employee_name,
      employeeId: entry.employee_id,
      department: entry.department || '',
      jobTitle: entry.job_title || '',
      chemicalName: entry.chemical_name,
      exposureRoute: entry.exposure_route || [],
      exposureDuration: entry.exposure_duration || '',
      exposureLevel: entry.exposure_level,
      symptoms: entry.symptoms || [],
      symptomOnset: entry.symptom_onset || '',
      firstAidProvided: entry.first_aid_provided || [],
      medicalTreatmentSought: entry.medical_treatment_sought,
      medicalFacility: entry.medical_facility || '',
      treatingPhysician: entry.treating_physician || '',
      diagnosis: entry.diagnosis || '',
      workRestrictions: entry.work_restrictions || '',
      lostWorkDays: entry.lost_work_days.toString(),
      ppeWorn: entry.ppe_worn || [],
      ppeFailure: entry.ppe_failure,
      ppeFailureDescription: entry.ppe_failure_description || '',
      taskPerformed: entry.task_performed || '',
      engineeringControls: entry.engineering_controls || '',
      supervisorName: entry.supervisor_name || '',
      investigationFindings: entry.investigation_findings || '',
      correctiveActions: entry.corrective_actions || '',
      oshaRecordable: entry.osha_recordable,
    });
    setShowAddModal(true);
  };

  const handleUpdateStatus = (id: string, newStatus: ChemicalExposureEntry['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  const toggleArrayItem = (field: keyof typeof formData, item: string) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      return {
        ...prev,
        [field]: currentArray.includes(item)
          ? currentArray.filter(i => i !== item)
          : [...currentArray, item],
      };
    });
  };

  const filteredEntries = entries.filter(entry =>
    entry.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.chemical_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return '#EF4444';
      case 'investigating': return '#F59E0B';
      case 'medical_monitoring': return '#3B82F6';
      case 'closed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reported': return 'Reported';
      case 'investigating': return 'Investigating';
      case 'medical_monitoring': return 'Medical Monitoring';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getExposureLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return '#EF4444';
      case 'moderate': return '#F59E0B';
      case 'minor': return '#10B981';
      default: return '#6B7280';
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Chemical Exposure',
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
          placeholder="Search exposure reports..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {entries.filter(e => e.status === 'reported' || e.status === 'investigating').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#EF4444' }]}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
              <Stethoscope size={18} color="#3B82F6" />
              <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                {entries.filter(e => e.status === 'medical_monitoring').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Monitoring</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
              <FileText size={18} color="#F59E0B" />
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {entries.filter(e => e.osha_recordable).length}
              </Text>
              <Text style={[styles.statLabel, { color: '#F59E0B' }]}>OSHA</Text>
            </View>
          </View>

          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <UserX size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Exposure Reports</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap the + button to report a chemical exposure incident.
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
                  <View style={styles.employeeInfo}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#DC262620' }]}>
                      <UserX size={20} color="#DC2626" />
                    </View>
                    <View>
                      <Text style={[styles.employeeName, { color: colors.text }]}>{entry.employee_name}</Text>
                      <Text style={[styles.employeeId, { color: colors.textSecondary }]}>{entry.employee_id}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                      {getStatusLabel(entry.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.chemicalRow}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={[styles.chemicalName, { color: colors.text }]}>{entry.chemical_name}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: getExposureLevelColor(entry.exposure_level) + '20' }]}>
                    <Text style={[styles.levelText, { color: getExposureLevelColor(entry.exposure_level) }]}>
                      {entry.exposure_level.charAt(0).toUpperCase() + entry.exposure_level.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  {entry.department && (
                    <View style={styles.detailItem}>
                      <Building size={12} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>{entry.department}</Text>
                    </View>
                  )}
                  {entry.job_title && (
                    <View style={styles.detailItem}>
                      <Briefcase size={12} color={colors.textSecondary} />
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>{entry.job_title}</Text>
                    </View>
                  )}
                </View>

                {entry.exposure_route && entry.exposure_route.length > 0 && (
                  <View style={styles.exposureRow}>
                    {entry.exposure_route.map((route, idx) => (
                      <View key={idx} style={[styles.routeBadge, { backgroundColor: '#DC262615' }]}>
                        <Text style={[styles.routeText, { color: '#DC2626' }]}>{route}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {entry.symptoms && entry.symptoms.length > 0 && (
                  <View style={styles.symptomsRow}>
                    <Activity size={14} color={colors.textSecondary} />
                    <Text style={[styles.symptomsText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {entry.symptoms.slice(0, 3).join(', ')}
                      {entry.symptoms.length > 3 && ` +${entry.symptoms.length - 3} more`}
                    </Text>
                  </View>
                )}

                {entry.medical_treatment_sought && entry.medical_facility && (
                  <View style={[styles.medicalRow, { backgroundColor: '#3B82F610' }]}>
                    <Stethoscope size={14} color="#3B82F6" />
                    <Text style={[styles.medicalText, { color: '#3B82F6' }]}>
                      Medical treatment at {entry.medical_facility}
                    </Text>
                  </View>
                )}

                <View style={styles.flagsRow}>
                  {entry.osha_recordable && (
                    <View style={[styles.flagBadge, { backgroundColor: '#F59E0B20' }]}>
                      <FileText size={12} color="#F59E0B" />
                      <Text style={[styles.flagText, { color: '#F59E0B' }]}>OSHA Recordable</Text>
                    </View>
                  )}
                  {entry.ppe_failure && (
                    <View style={[styles.flagBadge, { backgroundColor: '#EF444420' }]}>
                      <Shield size={12} color="#EF4444" />
                      <Text style={[styles.flagText, { color: '#EF4444' }]}>PPE Issue</Text>
                    </View>
                  )}
                  {entry.lost_work_days > 0 && (
                    <View style={[styles.flagBadge, { backgroundColor: '#8B5CF620' }]}>
                      <Clock size={12} color="#8B5CF6" />
                      <Text style={[styles.flagText, { color: '#8B5CF6' }]}>{entry.lost_work_days} days lost</Text>
                    </View>
                  )}
                </View>

                <View style={styles.entryFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      {entry.incident_date} {entry.incident_time}
                    </Text>
                  </View>
                  <View style={styles.reporterInfo}>
                    <User size={12} color={colors.textSecondary} />
                    <Text style={[styles.reporterText, { color: colors.textSecondary }]}>
                      {entry.reported_by}
                    </Text>
                  </View>
                </View>

                {entry.status !== 'closed' && (
                  <View style={styles.actionButtons}>
                    {entry.status === 'reported' && (
                      <Pressable
                        style={[styles.statusButton, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleUpdateStatus(entry.id, 'investigating')}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.statusButtonText}>Start Investigation</Text>
                        )}
                      </Pressable>
                    )}
                    {entry.status === 'investigating' && (
                      <Pressable
                        style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                        onPress={() => handleUpdateStatus(entry.id, 'medical_monitoring')}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.statusButtonText}>Medical Monitoring</Text>
                        )}
                      </Pressable>
                    )}
                    {entry.status === 'medical_monitoring' && (
                      <Pressable
                        style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                        onPress={() => handleUpdateStatus(entry.id, 'closed')}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.statusButtonText}>Close Case</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                )}
              </Pressable>
            ))
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

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
              {editingEntry ? 'Edit Exposure Report' : 'New Exposure Report'}
            </Text>
            <Pressable onPress={handleAddEntry} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={[styles.saveButton, { color: '#DC2626' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.incidentDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, incidentDate: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Time *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.incidentTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, incidentTime: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Employee Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter employee name"
              placeholderTextColor={colors.textSecondary}
              value={formData.employeeName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, employeeName: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Employee ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="EMP-XXXX"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.employeeId}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, employeeId: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Job Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Job title"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.jobTitle}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, jobTitle: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Department</Text>
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemical Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter chemical name"
              placeholderTextColor={colors.textSecondary}
              value={formData.chemicalName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, chemicalName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Exposure Route</Text>
            <View style={styles.chipContainer}>
              {EXPOSURE_ROUTES.map((route) => (
                <Pressable
                  key={route}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.exposureRoute.includes(route) ? '#EF444420' : colors.surface,
                      borderColor: formData.exposureRoute.includes(route) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('exposureRoute', route)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.exposureRoute.includes(route) ? '#EF4444' : colors.textSecondary },
                  ]}>
                    {route}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Exposure Level</Text>
            <View style={styles.levelRow}>
              {(['minor', 'moderate', 'severe', 'unknown'] as const).map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.levelOption,
                    {
                      backgroundColor: formData.exposureLevel === level ? getExposureLevelColor(level) + '20' : colors.surface,
                      borderColor: formData.exposureLevel === level ? getExposureLevelColor(level) : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, exposureLevel: level }))}
                >
                  <Text style={[
                    styles.levelOptionText,
                    { color: formData.exposureLevel === level ? getExposureLevelColor(level) : colors.textSecondary },
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Symptoms</Text>
            <View style={styles.chipContainer}>
              {SYMPTOMS.map((symptom) => (
                <Pressable
                  key={symptom}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.symptoms.includes(symptom) ? '#F59E0B20' : colors.surface,
                      borderColor: formData.symptoms.includes(symptom) ? '#F59E0B' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('symptoms', symptom)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.symptoms.includes(symptom) ? '#F59E0B' : colors.textSecondary },
                  ]}>
                    {symptom}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>First Aid Provided</Text>
            <View style={styles.chipContainer}>
              {FIRST_AID.map((aid) => (
                <Pressable
                  key={aid}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.firstAidProvided.includes(aid) ? '#10B98120' : colors.surface,
                      borderColor: formData.firstAidProvided.includes(aid) ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('firstAidProvided', aid)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.firstAidProvided.includes(aid) ? '#10B981' : colors.textSecondary },
                  ]}>
                    {aid}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Medical Treatment Sought</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.medicalTreatmentSought ? '#3B82F6' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, medicalTreatmentSought: !prev.medicalTreatmentSought }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.medicalTreatmentSought ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            {formData.medicalTreatmentSought && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Medical Facility</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Hospital/Clinic name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.medicalFacility}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, medicalFacility: text }))}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Diagnosis</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Medical diagnosis"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.diagnosis}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, diagnosis: text }))}
                />
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>PPE Worn</Text>
            <View style={styles.chipContainer}>
              {PPE_OPTIONS.map((ppe) => (
                <Pressable
                  key={ppe}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.ppeWorn.includes(ppe) ? '#8B5CF620' : colors.surface,
                      borderColor: formData.ppeWorn.includes(ppe) ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('ppeWorn', ppe)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.ppeWorn.includes(ppe) ? '#8B5CF6' : colors.textSecondary },
                  ]}>
                    {ppe}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>PPE Failure/Issue</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.ppeFailure ? '#EF4444' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, ppeFailure: !prev.ppeFailure }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.ppeFailure ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>OSHA Recordable</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.oshaRecordable ? '#F59E0B' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, oshaRecordable: !prev.oshaRecordable }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.oshaRecordable ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Investigation Findings</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What caused the exposure..."
              placeholderTextColor={colors.textSecondary}
              value={formData.investigationFindings}
              onChangeText={(text) => setFormData(prev => ({ ...prev, investigationFindings: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Corrective Actions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Actions to prevent recurrence..."
              placeholderTextColor={colors.textSecondary}
              value={formData.correctiveActions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, correctiveActions: text }))}
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
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
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  entryCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  employeeInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  employeeId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  chemicalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  chemicalName: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  detailsRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  exposureRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 8,
  },
  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  symptomsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  symptomsText: {
    fontSize: 12,
    flex: 1,
  },
  medicalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  medicalText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  flagsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 8,
  },
  flagBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  entryFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  reporterInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  reporterText: {
    fontSize: 11,
  },
  actionButtons: {
    marginTop: 10,
  },
  statusButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
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
    fontSize: 18,
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
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  twoColumn: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  levelRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  levelOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalBottomPadding: {
    height: 40,
  },
  bottomPadding: {
    height: 80,
  },
});
