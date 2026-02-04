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
  Heart,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Package,
  Clock,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface AEDInspection {
  id: string;
  inspection_date: string;
  aed_id: string;
  location: string;
  building: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  unit_accessible: boolean;
  signage_visible: boolean;
  cabinet_clean: boolean;
  alarm_functional: boolean;
  ready_indicator: boolean;
  battery_status: 'good' | 'low' | 'replace' | 'unknown';
  battery_expiration: string;
  pads_status: 'good' | 'expired' | 'damaged' | 'missing';
  adult_pads_expiration: string;
  pediatric_pads_expiration: string;
  pediatric_pads_present: boolean;
  rescue_kit_present: boolean;
  rescue_kit_contents: string[];
  defects_found: string[];
  corrective_actions: string;
  inspected_by: string;
  supervisor_notified: boolean;
  notes: string;
  status: 'pass' | 'fail' | 'needs_attention' | 'out_of_service';
  next_inspection_due: string;
  created_at?: string;
  updated_at?: string;
}

const LOCATIONS = [
  'Main Entrance Lobby',
  'Production Floor - East',
  'Production Floor - West',
  'Warehouse',
  'Cafeteria',
  'Gym/Fitness Area',
  'Office Building Lobby',
  'Loading Dock',
  'Security Office',
];

const BUILDINGS = ['Main Building', 'Production Wing', 'Warehouse', 'Office Building'];
const MANUFACTURERS = ['Philips', 'ZOLL', 'Cardiac Science', 'Defibtech', 'HeartSine', 'Other'];

const RESCUE_KIT_ITEMS = [
  'CPR mask/barrier',
  'Nitrile gloves',
  'Trauma scissors',
  'Razor',
  'Absorbent towel',
  'Antiseptic wipes',
  'Biohazard bag',
];

const COMMON_DEFECTS = [
  'Ready indicator not lit',
  'Battery indicator showing low',
  'Pads expired',
  'Pads damaged/missing',
  'Cabinet damaged',
  'Cabinet dirty/dusty',
  'Signage missing/damaged',
  'Unit not accessible',
  'Alarm not functioning',
  'Rescue kit incomplete',
];

async function fetchAEDInspections(): Promise<AEDInspection[]> {
  console.log('Fetching AED inspections from Supabase...');
  try {
    const { data, error } = await supabase
      .from('aed_inspections')
      .select('*')
      .order('inspection_date', { ascending: false });

    if (error) {
      console.warn('AED inspections table may not exist, using empty data:', error.message);
      return [];
    }

    console.log('Fetched AED inspections:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.warn('AED inspections query failed, using empty data:', err);
    return [];
  }
}

async function createAEDInspection(inspection: Omit<AEDInspection, 'id' | 'created_at' | 'updated_at'>): Promise<AEDInspection> {
  console.log('Creating AED inspection:', inspection);
  const { data, error } = await supabase
    .from('aed_inspections')
    .insert([inspection])
    .select()
    .single();

  if (error) {
    console.error('Error creating AED inspection:', error);
    throw error;
  }

  console.log('Created AED inspection:', data);
  return data;
}

async function updateAEDInspection(id: string, inspection: Partial<AEDInspection>): Promise<AEDInspection> {
  console.log('Updating AED inspection:', id, inspection);
  const { data, error } = await supabase
    .from('aed_inspections')
    .update(inspection)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating AED inspection:', error);
    throw error;
  }

  console.log('Updated AED inspection:', data);
  return data;
}

export default function AEDInspectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<AEDInspection | null>(null);

  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    aedId: '',
    location: '',
    building: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    unitAccessible: true,
    signageVisible: true,
    cabinetClean: true,
    alarmFunctional: true,
    readyIndicator: true,
    batteryStatus: 'good' as 'good' | 'low' | 'replace' | 'unknown',
    batteryExpiration: '',
    padsStatus: 'good' as 'good' | 'expired' | 'damaged' | 'missing',
    adultPadsExpiration: '',
    pediatricPadsExpiration: '',
    pediatricPadsPresent: false,
    rescueKitPresent: true,
    rescueKitContents: [] as string[],
    defectsFound: [] as string[],
    correctiveActions: '',
    inspectedBy: '',
    supervisorNotified: false,
    notes: '',
  });

  const { data: inspections = [], isLoading, refetch } = useQuery({
    queryKey: ['aed-inspections'],
    queryFn: fetchAEDInspections,
  });

  const createMutation = useMutation({
    mutationFn: createAEDInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aed-inspections'] });
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Create error:', error);
      Alert.alert('Error', 'Failed to save inspection. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AEDInspection> }) => updateAEDInspection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aed-inspections'] });
      setShowAddModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update inspection. Please try again.');
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const resetForm = () => {
    setFormData({
      inspectionDate: new Date().toISOString().split('T')[0],
      aedId: '',
      location: '',
      building: '',
      serialNumber: '',
      manufacturer: '',
      model: '',
      unitAccessible: true,
      signageVisible: true,
      cabinetClean: true,
      alarmFunctional: true,
      readyIndicator: true,
      batteryStatus: 'good',
      batteryExpiration: '',
      padsStatus: 'good',
      adultPadsExpiration: '',
      pediatricPadsExpiration: '',
      pediatricPadsPresent: false,
      rescueKitPresent: true,
      rescueKitContents: [],
      defectsFound: [],
      correctiveActions: '',
      inspectedBy: '',
      supervisorNotified: false,
      notes: '',
    });
    setEditingInspection(null);
  };

  const handleSaveInspection = () => {
    if (!formData.aedId || !formData.location) {
      Alert.alert('Required Fields', 'Please enter AED ID and location.');
      return;
    }

    const hasDefects = formData.defectsFound.length > 0;
    const hasCriticalIssue = !formData.readyIndicator || formData.batteryStatus === 'replace' || formData.padsStatus === 'expired' || formData.padsStatus === 'missing';

    let status: AEDInspection['status'] = 'pass';
    if (hasCriticalIssue) {
      status = 'out_of_service';
    } else if (hasDefects || formData.batteryStatus === 'low') {
      status = 'needs_attention';
    }

    const nextDue = new Date(formData.inspectionDate);
    nextDue.setMonth(nextDue.getMonth() + 1);

    const inspectionData = {
      inspection_date: formData.inspectionDate,
      aed_id: formData.aedId,
      location: formData.location,
      building: formData.building,
      serial_number: formData.serialNumber,
      manufacturer: formData.manufacturer,
      model: formData.model,
      unit_accessible: formData.unitAccessible,
      signage_visible: formData.signageVisible,
      cabinet_clean: formData.cabinetClean,
      alarm_functional: formData.alarmFunctional,
      ready_indicator: formData.readyIndicator,
      battery_status: formData.batteryStatus,
      battery_expiration: formData.batteryExpiration || null,
      pads_status: formData.padsStatus,
      adult_pads_expiration: formData.adultPadsExpiration || null,
      pediatric_pads_expiration: formData.pediatricPadsExpiration || null,
      pediatric_pads_present: formData.pediatricPadsPresent,
      rescue_kit_present: formData.rescueKitPresent,
      rescue_kit_contents: formData.rescueKitContents,
      defects_found: formData.defectsFound,
      corrective_actions: formData.correctiveActions,
      inspected_by: formData.inspectedBy || 'Current User',
      supervisor_notified: formData.supervisorNotified,
      notes: formData.notes,
      status,
      next_inspection_due: nextDue.toISOString().split('T')[0],
    };

    if (editingInspection) {
      updateMutation.mutate({ id: editingInspection.id, data: inspectionData });
    } else {
      createMutation.mutate(inspectionData);
    }
  };

  const handleEditInspection = (inspection: AEDInspection) => {
    setEditingInspection(inspection);
    setFormData({
      inspectionDate: inspection.inspection_date,
      aedId: inspection.aed_id,
      location: inspection.location,
      building: inspection.building || '',
      serialNumber: inspection.serial_number || '',
      manufacturer: inspection.manufacturer || '',
      model: inspection.model || '',
      unitAccessible: inspection.unit_accessible,
      signageVisible: inspection.signage_visible,
      cabinetClean: inspection.cabinet_clean,
      alarmFunctional: inspection.alarm_functional,
      readyIndicator: inspection.ready_indicator,
      batteryStatus: inspection.battery_status,
      batteryExpiration: inspection.battery_expiration || '',
      padsStatus: inspection.pads_status,
      adultPadsExpiration: inspection.adult_pads_expiration || '',
      pediatricPadsExpiration: inspection.pediatric_pads_expiration || '',
      pediatricPadsPresent: inspection.pediatric_pads_present,
      rescueKitPresent: inspection.rescue_kit_present,
      rescueKitContents: inspection.rescue_kit_contents || [],
      defectsFound: inspection.defects_found || [],
      correctiveActions: inspection.corrective_actions || '',
      inspectedBy: inspection.inspected_by || '',
      supervisorNotified: inspection.supervisor_notified,
      notes: inspection.notes || '',
    });
    setShowAddModal(true);
  };

  const toggleArrayItem = (field: 'rescueKitContents' | 'defectsFound', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  const filteredInspections = inspections.filter(inspection =>
    inspection.aed_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#10B981';
      case 'needs_attention': return '#F59E0B';
      case 'fail': return '#EF4444';
      case 'out_of_service': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pass': return 'Pass';
      case 'needs_attention': return 'Needs Attention';
      case 'fail': return 'Fail';
      case 'out_of_service': return 'Out of Service';
      default: return status;
    }
  };

  const getBatteryColor = (status: string) => {
    switch (status) {
      case 'good': return '#10B981';
      case 'low': return '#F59E0B';
      case 'replace': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'AED Inspection',
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
          placeholder="Search AEDs..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inspections...</Text>
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
            <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
              <CheckCircle2 size={18} color="#10B981" />
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {inspections.filter(i => i.status === 'pass').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#10B981' }]}>Passed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
              <Heart size={18} color="#EF4444" />
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {inspections.length}
              </Text>
              <Text style={[styles.statLabel, { color: '#EF4444' }]}>Total AEDs</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {inspections.filter(i => i.status === 'needs_attention' || i.status === 'out_of_service').length}
              </Text>
              <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Issues</Text>
            </View>
          </View>

          <View style={[styles.oshaNote, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <ShieldCheck size={18} color="#EF4444" />
            <View style={styles.oshaContent}>
              <Text style={[styles.oshaTitle, { color: '#EF4444' }]}>OSHA/AHA Compliance</Text>
              <Text style={[styles.oshaText, { color: colors.textSecondary }]}>
                Monthly inspections required. Document battery status, pad expiration, and readiness indicator.
              </Text>
            </View>
          </View>

          {filteredInspections.length === 0 ? (
            <View style={styles.emptyState}>
              <Heart size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspections Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap the + button to record a new AED inspection.
              </Text>
            </View>
          ) : (
            filteredInspections.map((inspection) => (
              <Pressable
                key={inspection.id}
                style={[styles.inspectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleEditInspection(inspection)}
              >
                <View style={styles.inspectionHeader}>
                  <View style={styles.inspectionTitleRow}>
                    <Heart size={20} color="#EF4444" />
                    <Text style={[styles.inspectionTitle, { color: colors.text }]}>{inspection.aed_id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inspection.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(inspection.status) }]}>
                      {getStatusLabel(inspection.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.text }]}>{inspection.location}</Text>
                  {inspection.building && (
                    <>
                      <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                      <Text style={[styles.buildingText, { color: colors.textSecondary }]}>{inspection.building}</Text>
                    </>
                  )}
                </View>

                <View style={styles.checkRow}>
                  <View style={[styles.checkItem, { backgroundColor: inspection.ready_indicator ? '#10B98115' : '#EF444415' }]}>
                    {inspection.ready_indicator ? (
                      <CheckCircle2 size={14} color="#10B981" />
                    ) : (
                      <XCircle size={14} color="#EF4444" />
                    )}
                    <Text style={[styles.checkText, { color: inspection.ready_indicator ? '#10B981' : '#EF4444' }]}>
                      Ready
                    </Text>
                  </View>
                  <View style={[styles.checkItem, { backgroundColor: getBatteryColor(inspection.battery_status) + '15' }]}>
                    <Battery size={14} color={getBatteryColor(inspection.battery_status)} />
                    <Text style={[styles.checkText, { color: getBatteryColor(inspection.battery_status) }]}>
                      {inspection.battery_status.charAt(0).toUpperCase() + inspection.battery_status.slice(1)}
                    </Text>
                  </View>
                  <View style={[styles.checkItem, { backgroundColor: inspection.pads_status === 'good' ? '#10B98115' : '#F59E0B15' }]}>
                    <Package size={14} color={inspection.pads_status === 'good' ? '#10B981' : '#F59E0B'} />
                    <Text style={[styles.checkText, { color: inspection.pads_status === 'good' ? '#10B981' : '#F59E0B' }]}>
                      Pads {inspection.pads_status}
                    </Text>
                  </View>
                </View>

                {inspection.defects_found && inspection.defects_found.length > 0 && (
                  <View style={styles.defectsRow}>
                    {inspection.defects_found.slice(0, 2).map((defect, idx) => (
                      <View key={idx} style={[styles.defectBadge, { backgroundColor: '#EF444415' }]}>
                        <Text style={[styles.defectText, { color: '#EF4444' }]} numberOfLines={1}>{defect}</Text>
                      </View>
                    ))}
                    {inspection.defects_found.length > 2 && (
                      <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                        +{inspection.defects_found.length - 2}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.inspectionFooter}>
                  <View style={styles.dateInfo}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      {inspection.inspection_date}
                    </Text>
                  </View>
                  <View style={styles.nextDueInfo}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      Next: {inspection.next_inspection_due}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#EF4444' }]}
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
              {editingInspection ? 'Edit Inspection' : 'New AED Inspection'}
            </Text>
            <Pressable onPress={handleSaveInspection} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={[styles.saveButton, { color: '#EF4444' }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Inspection Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.inspectionDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, inspectionDate: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>AED ID *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g., AED-001"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.aedId}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, aedId: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location *</Text>
            <View style={styles.chipContainer}>
              {LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.location === loc ? '#EF444420' : colors.surface,
                      borderColor: formData.location === loc ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, location: loc }))}
                >
                  <Text style={[styles.chipText, { color: formData.location === loc ? '#EF4444' : colors.textSecondary }]}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Building</Text>
            <View style={styles.chipContainer}>
              {BUILDINGS.map((bldg) => (
                <Pressable
                  key={bldg}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.building === bldg ? '#3B82F620' : colors.surface,
                      borderColor: formData.building === bldg ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, building: bldg }))}
                >
                  <Text style={[styles.chipText, { color: formData.building === bldg ? '#3B82F6' : colors.textSecondary }]}>
                    {bldg}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Serial Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Serial #"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.serialNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, serialNumber: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Model</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Model name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.model}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, model: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Manufacturer</Text>
            <View style={styles.chipContainer}>
              {MANUFACTURERS.map((mfg) => (
                <Pressable
                  key={mfg}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.manufacturer === mfg ? '#8B5CF620' : colors.surface,
                      borderColor: formData.manufacturer === mfg ? '#8B5CF6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, manufacturer: mfg }))}
                >
                  <Text style={[styles.chipText, { color: formData.manufacturer === mfg ? '#8B5CF6' : colors.textSecondary }]}>
                    {mfg}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Visual Inspection</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Ready Indicator Lit</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.readyIndicator ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, readyIndicator: !prev.readyIndicator }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.readyIndicator ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Unit Accessible</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.unitAccessible ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, unitAccessible: !prev.unitAccessible }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.unitAccessible ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Signage Visible</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.signageVisible ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, signageVisible: !prev.signageVisible }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.signageVisible ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Cabinet Clean</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.cabinetClean ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, cabinetClean: !prev.cabinetClean }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.cabinetClean ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Cabinet Alarm Functional</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.alarmFunctional ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, alarmFunctional: !prev.alarmFunctional }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.alarmFunctional ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Battery & Pads</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Battery Status</Text>
            <View style={styles.chipContainer}>
              {[
                { value: 'good', label: 'Good', color: '#10B981' },
                { value: 'low', label: 'Low', color: '#F59E0B' },
                { value: 'replace', label: 'Replace', color: '#EF4444' },
                { value: 'unknown', label: 'Unknown', color: '#6B7280' },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.batteryStatus === opt.value ? opt.color + '20' : colors.surface,
                      borderColor: formData.batteryStatus === opt.value ? opt.color : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, batteryStatus: opt.value as 'good' | 'low' | 'replace' | 'unknown' }))}
                >
                  <Text style={[styles.chipText, { color: formData.batteryStatus === opt.value ? opt.color : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Battery Expiration</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={formData.batteryExpiration}
              onChangeText={(text) => setFormData(prev => ({ ...prev, batteryExpiration: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Pads Status</Text>
            <View style={styles.chipContainer}>
              {[
                { value: 'good', label: 'Good', color: '#10B981' },
                { value: 'expired', label: 'Expired', color: '#EF4444' },
                { value: 'damaged', label: 'Damaged', color: '#F59E0B' },
                { value: 'missing', label: 'Missing', color: '#EF4444' },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.padsStatus === opt.value ? opt.color + '20' : colors.surface,
                      borderColor: formData.padsStatus === opt.value ? opt.color : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, padsStatus: opt.value as 'good' | 'expired' | 'damaged' | 'missing' }))}
                >
                  <Text style={[styles.chipText, { color: formData.padsStatus === opt.value ? opt.color : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Adult Pads Exp.</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.adultPadsExpiration}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, adultPadsExpiration: text }))}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Pediatric Pads Exp.</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.pediatricPadsExpiration}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, pediatricPadsExpiration: text }))}
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Pediatric Pads Present</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.pediatricPadsPresent ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, pediatricPadsPresent: !prev.pediatricPadsPresent }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.pediatricPadsPresent ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Rescue Kit</Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Rescue Kit Present</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.rescueKitPresent ? '#10B981' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, rescueKitPresent: !prev.rescueKitPresent }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.rescueKitPresent ? 20 : 2 }] }]} />
              </Pressable>
            </View>

            {formData.rescueKitPresent && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Rescue Kit Contents</Text>
                <View style={styles.chipContainer}>
                  {RESCUE_KIT_ITEMS.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: formData.rescueKitContents.includes(item) ? '#10B98120' : colors.surface,
                          borderColor: formData.rescueKitContents.includes(item) ? '#10B981' : colors.border,
                        },
                      ]}
                      onPress={() => toggleArrayItem('rescueKitContents', item)}
                    >
                      <Text style={[styles.chipText, { color: formData.rescueKitContents.includes(item) ? '#10B981' : colors.textSecondary }]}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Defects Found</Text>
            <View style={styles.chipContainer}>
              {COMMON_DEFECTS.map((defect) => (
                <Pressable
                  key={defect}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.defectsFound.includes(defect) ? '#EF444420' : colors.surface,
                      borderColor: formData.defectsFound.includes(defect) ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('defectsFound', defect)}
                >
                  <Text style={[styles.chipText, { color: formData.defectsFound.includes(defect) ? '#EF4444' : colors.textSecondary }]}>
                    {defect}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Corrective Actions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe actions taken or planned..."
              placeholderTextColor={colors.textSecondary}
              value={formData.correctiveActions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, correctiveActions: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Inspected By</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              value={formData.inspectedBy}
              onChangeText={(text) => setFormData(prev => ({ ...prev, inspectedBy: text }))}
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Supervisor Notified (if issues)</Text>
              <Pressable
                style={[styles.toggleButton, { backgroundColor: formData.supervisorNotified ? '#F59E0B' : colors.border }]}
                onPress={() => setFormData(prev => ({ ...prev, supervisorNotified: !prev.supervisorNotified }))}
              >
                <View style={[styles.toggleKnob, { backgroundColor: '#FFFFFF', transform: [{ translateX: formData.supervisorNotified ? 20 : 2 }] }]} />
              </Pressable>
            </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const },
  emptyText: { fontSize: 14, textAlign: 'center' as const },
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
  oshaNote: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  oshaContent: { flex: 1 },
  oshaTitle: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  oshaText: { fontSize: 12, lineHeight: 16 },
  inspectionCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  inspectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  inspectionTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 8 },
  inspectionTitle: { fontSize: 16, fontWeight: '600' as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  locationRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 10 },
  locationText: { fontSize: 13 },
  separator: { marginHorizontal: 2 },
  buildingText: { fontSize: 12 },
  checkRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 10 },
  checkItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  checkText: { fontSize: 11, fontWeight: '500' as const },
  defectsRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginBottom: 10 },
  defectBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: '60%' },
  defectText: { fontSize: 10 },
  moreText: { fontSize: 10, alignSelf: 'center' as const },
  inspectionFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  nextDueInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 11 },
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
  textArea: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80 },
  twoColumn: { flexDirection: 'row' as const, gap: 12 },
  halfWidth: { flex: 1 },
  chipContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11 },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  toggleButton: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' as const },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  modalBottomPadding: { height: 40 },
  bottomPadding: { height: 80 },
});
