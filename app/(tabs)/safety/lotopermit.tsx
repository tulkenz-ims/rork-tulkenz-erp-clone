import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';

import {
  Lock,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Wind,
  Droplets,
  Settings,
  Thermometer,
  Atom,
  ArrowDown,
  Battery,
  CircleDot,
  X,
  Trash2,
  Check,
  FileText,
  Users,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafetyPermits } from '@/hooks/useSafetyPermits';
import {
  SafetyPermit,
  PermitStatus,
  PERMIT_STATUS_LABELS,
  PERMIT_STATUS_COLORS,
  EnergySourceType,
  ENERGY_SOURCE_LABELS,
  LockoutPoint,
  LOTOPermitData,
  PPE_OPTIONS,
  HAZARD_OPTIONS,
  PRECAUTION_OPTIONS,
} from '@/types/safety';
import * as Haptics from 'expo-haptics';

const ENERGY_ICONS: Record<EnergySourceType, React.ComponentType<{ size: number; color: string }>> = {
  electrical: Zap,
  pneumatic: Wind,
  hydraulic: Droplets,
  mechanical: Settings,
  thermal: Thermometer,
  chemical: Atom,
  gravitational: ArrowDown,
  stored_energy: Battery,
  radiation: CircleDot,
  other: CircleDot,
};

type TabType = 'active' | 'pending' | 'completed' | 'all';

export default function LOTOPermitScreen() {
  const { colors } = useTheme();
  const { 
    permits, 
    refetch,
    generatePermitNumber,
    createPermit,
    approvePermit,
    completePermit,
    cancelPermit,
    getTimeRemaining,
    isPermitExpired,
  } = useSafetyPermits('loto');

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<SafetyPermit | null>(null);
  const [formStep, setFormStep] = useState(0);

  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_id: '',
    equipment_tag: '',
    work_description: '',
    location: '',
    requested_by: '',
    supervisor_name: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '06:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '18:00',
    energy_sources: [] as EnergySourceType[],
    lockout_points: [] as LockoutPoint[],
    ppe_required: [] as string[],
    hazards_identified: [] as string[],
    precautions_required: [] as string[],
    workers: [] as string[],
    isolation_procedure: '',
    verification_procedure: '',
    restoration_procedure: '',
    emergency_contact: '',
    emergency_phone: '',
  });

  const [newLockoutPoint, setNewLockoutPoint] = useState({
    location: '',
    energy_type: 'electrical' as EnergySourceType,
    isolation_method: '',
    lock_number: '',
    tag_number: '',
  });

  const [newWorker, setNewWorker] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredPermits = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return permits.filter(p => p.status === 'active' || p.status === 'approved');
      case 'pending':
        return permits.filter(p => p.status === 'pending_approval' || p.status === 'draft');
      case 'completed':
        return permits.filter(p => p.status === 'completed');
      default:
        return permits;
    }
  }, [permits, activeTab]);

  const stats = useMemo(() => ({
    active: permits.filter(p => p.status === 'active' || p.status === 'approved').length,
    pending: permits.filter(p => p.status === 'pending_approval').length,
    completed: permits.filter(p => p.status === 'completed').length,
    total: permits.length,
  }), [permits]);

  const handleCreatePermit = async () => {
    if (!formData.equipment_name || !formData.work_description || !formData.requested_by) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    if (formData.lockout_points.length === 0) {
      Alert.alert('Missing Lockout Points', 'Please add at least one lockout point.');
      return;
    }

    try {
      const permitData: LOTOPermitData = {
        equipment_name: formData.equipment_name,
        equipment_id: formData.equipment_id,
        equipment_tag: formData.equipment_tag,
        work_description: formData.work_description,
        energy_sources: formData.energy_sources,
        lockout_points: formData.lockout_points,
        isolation_procedure: formData.isolation_procedure,
        verification_procedure: formData.verification_procedure,
        zero_energy_verified: false,
        group_lockout: formData.workers.length > 1,
        affected_employees: [],
        restoration_procedure: formData.restoration_procedure,
      };

      await createPermit({
        permit_number: generatePermitNumber('loto'),
        permit_type: 'loto',
        status: 'pending_approval',
        priority: 'high',
        facility_id: null,
        location: formData.location,
        department_code: null,
        department_name: null,
        work_description: formData.work_description,
        hazards_identified: formData.hazards_identified,
        precautions_required: formData.precautions_required,
        ppe_required: formData.ppe_required,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_date: formData.end_date,
        end_time: formData.end_time,
        valid_hours: 12,
        requested_by: formData.requested_by,
        requested_by_id: null,
        requested_date: new Date().toISOString(),
        approved_by: null,
        approved_by_id: null,
        approved_date: null,
        supervisor_name: formData.supervisor_name,
        supervisor_id: null,
        contractor_name: null,
        contractor_company: null,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        workers: formData.workers,
        permit_data: permitData,
        completed_by: null,
        completed_by_id: null,
        completed_date: null,
        completion_notes: null,
        cancellation_reason: null,
        cancelled_by: null,
        cancelled_date: null,
        attachments: [],
        notes: null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'LOTO permit created and submitted for approval.');
    } catch (error) {
      console.error('[LOTOPermit] Error creating permit:', error);
      Alert.alert('Error', 'Failed to create permit. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      equipment_name: '',
      equipment_id: '',
      equipment_tag: '',
      work_description: '',
      location: '',
      requested_by: '',
      supervisor_name: '',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '06:00',
      end_date: new Date().toISOString().split('T')[0],
      end_time: '18:00',
      energy_sources: [],
      lockout_points: [],
      ppe_required: [],
      hazards_identified: [],
      precautions_required: [],
      workers: [],
      isolation_procedure: '',
      verification_procedure: '',
      restoration_procedure: '',
      emergency_contact: '',
      emergency_phone: '',
    });
    setFormStep(0);
  };

  const addLockoutPoint = () => {
    if (!newLockoutPoint.location || !newLockoutPoint.isolation_method) {
      Alert.alert('Missing Information', 'Please fill in location and isolation method.');
      return;
    }

    const point: LockoutPoint = {
      id: `LP-${Date.now()}`,
      ...newLockoutPoint,
      verified: false,
    };

    setFormData(prev => ({
      ...prev,
      lockout_points: [...prev.lockout_points, point],
      energy_sources: prev.energy_sources.includes(newLockoutPoint.energy_type)
        ? prev.energy_sources
        : [...prev.energy_sources, newLockoutPoint.energy_type],
    }));

    setNewLockoutPoint({
      location: '',
      energy_type: 'electrical',
      isolation_method: '',
      lock_number: '',
      tag_number: '',
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeLockoutPoint = (id: string) => {
    setFormData(prev => ({
      ...prev,
      lockout_points: prev.lockout_points.filter(p => p.id !== id),
    }));
  };

  const addWorker = () => {
    if (!newWorker.trim()) return;
    setFormData(prev => ({
      ...prev,
      workers: [...prev.workers, newWorker.trim()],
    }));
    setNewWorker('');
  };

  const removeWorker = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index),
    }));
  };

  const toggleArrayItem = (field: 'ppe_required' | 'hazards_identified' | 'precautions_required', itemId: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(itemId)
        ? prev[field].filter(id => id !== itemId)
        : [...prev[field], itemId],
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleApprovePermit = async (permit: SafetyPermit) => {
    Alert.alert(
      'Approve Permit',
      `Are you sure you want to approve permit ${permit.permit_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approvePermit({
                id: permit.id,
                approved_by: 'Current User',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowDetailModal(false);
            } catch {
              Alert.alert('Error', 'Failed to approve permit.');
            }
          },
        },
      ]
    );
  };

  const handleCompletePermit = async (permit: SafetyPermit) => {
    Alert.alert(
      'Complete Permit',
      'Confirm all locks have been removed and equipment is restored?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completePermit({
                id: permit.id,
                completed_by: 'Current User',
                completion_notes: 'Work completed. All locks removed. Equipment restored.',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowDetailModal(false);
            } catch {
              Alert.alert('Error', 'Failed to complete permit.');
            }
          },
        },
      ]
    );
  };

  const handleCancelPermit = async (permit: SafetyPermit) => {
    Alert.alert(
      'Cancel Permit',
      'Are you sure you want to cancel this permit?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelPermit({
                id: permit.id,
                cancelled_by: 'Current User',
                cancellation_reason: 'Cancelled by user',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setShowDetailModal(false);
            } catch {
              Alert.alert('Error', 'Failed to cancel permit.');
            }
          },
        },
      ]
    );
  };

  const openPermitDetail = (permit: SafetyPermit) => {
    setSelectedPermit(permit);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getStatusIcon = (status: PermitStatus) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle2 size={16} color={PERMIT_STATUS_COLORS[status]} />;
      case 'pending_approval':
        return <Clock size={16} color={PERMIT_STATUS_COLORS[status]} />;
      case 'completed':
        return <CheckCircle2 size={16} color={PERMIT_STATUS_COLORS[status]} />;
      case 'cancelled':
      case 'expired':
        return <XCircle size={16} color={PERMIT_STATUS_COLORS[status]} />;
      default:
        return <AlertTriangle size={16} color={PERMIT_STATUS_COLORS[status]} />;
    }
  };

  const renderPermitCard = (permit: SafetyPermit) => {
    const lotoData = permit.permit_data as LOTOPermitData | null;
    const timeRemaining = getTimeRemaining(permit);
    const isExpired = isPermitExpired(permit);

    return (
      <Pressable
        key={permit.id}
        style={({ pressed }) => [
          styles.permitCard,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={() => openPermitDetail(permit)}
      >
        <View style={styles.permitHeader}>
          <View style={styles.permitTitleRow}>
            <View style={[styles.permitIcon, { backgroundColor: '#DC262615' }]}>
              <Lock size={20} color="#DC2626" />
            </View>
            <View style={styles.permitTitleContainer}>
              <Text style={[styles.permitNumber, { color: colors.text }]}>{permit.permit_number}</Text>
              <Text style={[styles.permitEquipment, { color: colors.textSecondary }]} numberOfLines={1}>
                {lotoData?.equipment_name || permit.location}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: PERMIT_STATUS_COLORS[permit.status] + '20' }]}>
            {getStatusIcon(permit.status)}
            <Text style={[styles.statusText, { color: PERMIT_STATUS_COLORS[permit.status] }]}>
              {PERMIT_STATUS_LABELS[permit.status]}
            </Text>
          </View>
        </View>

        <Text style={[styles.permitDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {permit.work_description}
        </Text>

        <View style={styles.permitFooter}>
          <View style={styles.permitInfo}>
            <Text style={[styles.permitInfoLabel, { color: colors.textSecondary }]}>Requested by</Text>
            <Text style={[styles.permitInfoValue, { color: colors.text }]}>{permit.requested_by}</Text>
          </View>
          {(permit.status === 'active' || permit.status === 'approved') && (
            <View style={[styles.timeRemaining, { backgroundColor: isExpired ? '#DC262615' : '#10B98115' }]}>
              <Clock size={14} color={isExpired ? '#DC2626' : '#10B981'} />
              <Text style={[styles.timeRemainingText, { color: isExpired ? '#DC2626' : '#10B981' }]}>
                {timeRemaining}
              </Text>
            </View>
          )}
        </View>

        {lotoData && lotoData.lockout_points.length > 0 && (
          <View style={styles.energySourcesRow}>
            {lotoData.energy_sources.slice(0, 4).map((source, index) => {
              const IconComponent = ENERGY_ICONS[source];
              return (
                <View key={index} style={[styles.energyBadge, { backgroundColor: colors.background }]}>
                  <IconComponent size={12} color={colors.textSecondary} />
                  <Text style={[styles.energyBadgeText, { color: colors.textSecondary }]}>
                    {ENERGY_SOURCE_LABELS[source].split(' ')[0]}
                  </Text>
                </View>
              );
            })}
            {lotoData.energy_sources.length > 4 && (
              <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                +{lotoData.energy_sources.length - 4}
              </Text>
            )}
          </View>
        )}

        <ChevronRight size={20} color={colors.textSecondary} style={styles.chevron} />
      </Pressable>
    );
  };

  const renderFormStep = () => {
    switch (formStep) {
      case 0:
        return (
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Equipment Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Equipment Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.equipment_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, equipment_name: text }))}
                placeholder="e.g., Conveyor System CV-301"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Equipment ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.equipment_id}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, equipment_id: text }))}
                  placeholder="EQ-001"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tag Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.equipment_tag}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, equipment_tag: text }))}
                  placeholder="CV-301"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Location *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="e.g., Production Line 3"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Work Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.work_description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, work_description: text }))}
                placeholder="Describe the work to be performed..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Lockout Points</Text>
            <Text style={[styles.formSectionSubtitle, { color: colors.textSecondary }]}>
              Add all energy isolation points that need to be locked out
            </Text>

            {formData.lockout_points.map((point, index) => (
              <View key={point.id} style={[styles.lockoutPointCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.lockoutPointHeader}>
                  <View style={[styles.lockoutPointIcon, { backgroundColor: '#DC262615' }]}>
                    {React.createElement(ENERGY_ICONS[point.energy_type], { size: 16, color: '#DC2626' })}
                  </View>
                  <View style={styles.lockoutPointInfo}>
                    <Text style={[styles.lockoutPointLocation, { color: colors.text }]}>{point.location}</Text>
                    <Text style={[styles.lockoutPointType, { color: colors.textSecondary }]}>
                      {ENERGY_SOURCE_LABELS[point.energy_type]} - {point.isolation_method}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeLockoutPoint(point.id)}>
                    <Trash2 size={18} color="#DC2626" />
                  </Pressable>
                </View>
                <View style={styles.lockoutPointTags}>
                  {point.lock_number && (
                    <View style={[styles.tagBadge, { backgroundColor: '#3B82F615' }]}>
                      <Lock size={10} color="#3B82F6" />
                      <Text style={[styles.tagBadgeText, { color: '#3B82F6' }]}>{point.lock_number}</Text>
                    </View>
                  )}
                  {point.tag_number && (
                    <View style={[styles.tagBadge, { backgroundColor: '#F59E0B15' }]}>
                      <FileText size={10} color="#F59E0B" />
                      <Text style={[styles.tagBadgeText, { color: '#F59E0B' }]}>{point.tag_number}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            <View style={[styles.addLockoutForm, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.addLockoutTitle, { color: colors.text }]}>Add Lockout Point</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Location *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={newLockoutPoint.location}
                  onChangeText={(text) => setNewLockoutPoint(prev => ({ ...prev, location: text }))}
                  placeholder="e.g., MCC-3A Breaker 15"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Energy Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.energyTypeScroll}>
                  {(Object.keys(ENERGY_SOURCE_LABELS) as EnergySourceType[]).map((type) => {
                    const IconComponent = ENERGY_ICONS[type];
                    const isSelected = newLockoutPoint.energy_type === type;
                    return (
                      <Pressable
                        key={type}
                        style={[
                          styles.energyTypeButton,
                          { backgroundColor: isSelected ? '#DC262615' : colors.surface, borderColor: isSelected ? '#DC2626' : colors.border },
                        ]}
                        onPress={() => setNewLockoutPoint(prev => ({ ...prev, energy_type: type }))}
                      >
                        <IconComponent size={16} color={isSelected ? '#DC2626' : colors.textSecondary} />
                        <Text style={[styles.energyTypeText, { color: isSelected ? '#DC2626' : colors.textSecondary }]}>
                          {ENERGY_SOURCE_LABELS[type].split(' ')[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Isolation Method *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={newLockoutPoint.isolation_method}
                  onChangeText={(text) => setNewLockoutPoint(prev => ({ ...prev, isolation_method: text }))}
                  placeholder="e.g., Breaker OFF, Valve CLOSED"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Lock #</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={newLockoutPoint.lock_number}
                    onChangeText={(text) => setNewLockoutPoint(prev => ({ ...prev, lock_number: text }))}
                    placeholder="L-001"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tag #</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={newLockoutPoint.tag_number}
                    onChangeText={(text) => setNewLockoutPoint(prev => ({ ...prev, tag_number: text }))}
                    placeholder="T-001"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <Pressable
                style={[styles.addButton, { backgroundColor: '#DC2626' }]}
                onPress={addLockoutPoint}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Lockout Point</Text>
              </Pressable>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Hazards & Precautions</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hazards Identified</Text>
              <View style={styles.checkboxGrid}>
                {HAZARD_OPTIONS.slice(0, 12).map((hazard) => {
                  const isSelected = formData.hazards_identified.includes(hazard.id);
                  return (
                    <Pressable
                      key={hazard.id}
                      style={[
                        styles.checkboxItem,
                        { backgroundColor: isSelected ? '#F59E0B15' : colors.background, borderColor: isSelected ? '#F59E0B' : colors.border },
                      ]}
                      onPress={() => toggleArrayItem('hazards_identified', hazard.id)}
                    >
                      {isSelected && <Check size={12} color="#F59E0B" />}
                      <Text style={[styles.checkboxText, { color: isSelected ? '#F59E0B' : colors.text }]}>
                        {hazard.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Precautions Required</Text>
              <View style={styles.checkboxGrid}>
                {PRECAUTION_OPTIONS.slice(0, 10).map((precaution) => {
                  const isSelected = formData.precautions_required.includes(precaution.id);
                  return (
                    <Pressable
                      key={precaution.id}
                      style={[
                        styles.checkboxItem,
                        { backgroundColor: isSelected ? '#10B98115' : colors.background, borderColor: isSelected ? '#10B981' : colors.border },
                      ]}
                      onPress={() => toggleArrayItem('precautions_required', precaution.id)}
                    >
                      {isSelected && <Check size={12} color="#10B981" />}
                      <Text style={[styles.checkboxText, { color: isSelected ? '#10B981' : colors.text }]}>
                        {precaution.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PPE Required</Text>
              <View style={styles.checkboxGrid}>
                {PPE_OPTIONS.slice(0, 12).map((ppe) => {
                  const isSelected = formData.ppe_required.includes(ppe.id);
                  return (
                    <Pressable
                      key={ppe.id}
                      style={[
                        styles.checkboxItem,
                        { backgroundColor: isSelected ? '#3B82F615' : colors.background, borderColor: isSelected ? '#3B82F6' : colors.border },
                      ]}
                      onPress={() => toggleArrayItem('ppe_required', ppe.id)}
                    >
                      {isSelected && <Check size={12} color="#3B82F6" />}
                      <Text style={[styles.checkboxText, { color: isSelected ? '#3B82F6' : colors.text }]}>
                        {ppe.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Personnel & Schedule</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Requested By *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.requested_by}
                onChangeText={(text) => setFormData(prev => ({ ...prev, requested_by: text }))}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Supervisor</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.supervisor_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, supervisor_name: text }))}
                placeholder="Supervisor name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Authorized Workers</Text>
              <View style={styles.workersContainer}>
                {formData.workers.map((worker, index) => (
                  <View key={index} style={[styles.workerBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Users size={12} color={colors.textSecondary} />
                    <Text style={[styles.workerName, { color: colors.text }]}>{worker}</Text>
                    <Pressable onPress={() => removeWorker(index)}>
                      <X size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addWorkerRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, flex: 1 }]}
                  value={newWorker}
                  onChangeText={setNewWorker}
                  placeholder="Add worker name"
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={addWorker}
                />
                <Pressable style={[styles.addWorkerButton, { backgroundColor: '#3B82F6' }]} onPress={addWorker}>
                  <Plus size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.start_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.start_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.end_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.end_time}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Emergency Contact</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.emergency_contact}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_contact: text }))}
                  placeholder="Name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={formData.emergency_phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_phone: text }))}
                  placeholder="555-0123"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Procedures</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Isolation Procedure</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.isolation_procedure}
                onChangeText={(text) => setFormData(prev => ({ ...prev, isolation_procedure: text }))}
                placeholder="Step-by-step isolation procedure..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verification Procedure</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.verification_procedure}
                onChangeText={(text) => setFormData(prev => ({ ...prev, verification_procedure: text }))}
                placeholder="How to verify zero energy state..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Restoration Procedure</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={formData.restoration_procedure}
                onChangeText={(text) => setFormData(prev => ({ ...prev, restoration_procedure: text }))}
                placeholder="Steps to restore equipment to service..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderDetailModal = () => {
    if (!selectedPermit) return null;
    const lotoData = selectedPermit.permit_data as LOTOPermitData | null;

    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPermit.permit_number}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>LOTO Permit</Text>
            </View>
            <Pressable onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={[styles.statusSection, { backgroundColor: PERMIT_STATUS_COLORS[selectedPermit.status] + '15' }]}>
              {getStatusIcon(selectedPermit.status)}
              <Text style={[styles.detailStatusText, { color: PERMIT_STATUS_COLORS[selectedPermit.status] }]}>
                {PERMIT_STATUS_LABELS[selectedPermit.status]}
              </Text>
              {(selectedPermit.status === 'active' || selectedPermit.status === 'approved') && (
                <Text style={[styles.timeRemainingDetail, { color: PERMIT_STATUS_COLORS[selectedPermit.status] }]}>
                  {getTimeRemaining(selectedPermit)}
                </Text>
              )}
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Equipment</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{lotoData?.equipment_name}</Text>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{selectedPermit.location}</Text>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Work Description</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.work_description}</Text>
            </View>

            {lotoData && lotoData.lockout_points.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Lockout Points ({lotoData.lockout_points.length})
                </Text>
                {lotoData.lockout_points.map((point, index) => (
                  <View key={point.id} style={[styles.lockoutDetailItem, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={styles.lockoutDetailHeader}>
                      <View style={[styles.lockoutDetailIcon, { backgroundColor: '#DC262615' }]}>
                        {React.createElement(ENERGY_ICONS[point.energy_type], { size: 14, color: '#DC2626' })}
                      </View>
                      <View style={styles.lockoutDetailInfo}>
                        <Text style={[styles.lockoutDetailLocation, { color: colors.text }]}>{point.location}</Text>
                        <Text style={[styles.lockoutDetailType, { color: colors.textSecondary }]}>
                          {ENERGY_SOURCE_LABELS[point.energy_type]}
                        </Text>
                      </View>
                      {point.verified ? (
                        <View style={[styles.verifiedBadge, { backgroundColor: '#10B98115' }]}>
                          <CheckCircle2 size={12} color="#10B981" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      ) : (
                        <View style={[styles.verifiedBadge, { backgroundColor: '#F59E0B15' }]}>
                          <Clock size={12} color="#F59E0B" />
                          <Text style={[styles.verifiedText, { color: '#F59E0B' }]}>Pending</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.lockoutDetailMethod, { color: colors.textSecondary }]}>
                      {point.isolation_method}
                    </Text>
                    <View style={styles.lockoutDetailTags}>
                      {point.lock_number && (
                        <Text style={[styles.lockoutDetailTag, { color: colors.textSecondary }]}>Lock: {point.lock_number}</Text>
                      )}
                      {point.tag_number && (
                        <Text style={[styles.lockoutDetailTag, { color: colors.textSecondary }]}>Tag: {point.tag_number}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Personnel</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Requested By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.requested_by}</Text>
              </View>
              {selectedPermit.approved_by && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.approved_by}</Text>
                </View>
              )}
              {selectedPermit.workers.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Workers</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedPermit.workers.join(', ')}</Text>
                </View>
              )}
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Schedule</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedPermit.start_date} {selectedPermit.start_time}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedPermit.end_date} {selectedPermit.end_time}
                </Text>
              </View>
            </View>

            {selectedPermit.ppe_required.length > 0 && (
              <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>PPE Required</Text>
                <View style={styles.tagContainer}>
                  {selectedPermit.ppe_required.map((ppeId) => {
                    const ppe = PPE_OPTIONS.find(p => p.id === ppeId);
                    return ppe ? (
                      <View key={ppeId} style={[styles.detailTag, { backgroundColor: '#3B82F615' }]}>
                        <Shield size={12} color="#3B82F6" />
                        <Text style={[styles.detailTagText, { color: '#3B82F6' }]}>{ppe.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            <View style={styles.actionButtons}>
              {selectedPermit.status === 'pending_approval' && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => handleApprovePermit(selectedPermit)}
                >
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve Permit</Text>
                </Pressable>
              )}
              {(selectedPermit.status === 'active' || selectedPermit.status === 'approved') && (
                <Pressable
                  style={[styles.actionButton, { backgroundColor: '#059669' }]}
                  onPress={() => handleCompletePermit(selectedPermit)}
                >
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Complete Permit</Text>
                </Pressable>
              )}
              {selectedPermit.status !== 'completed' && selectedPermit.status !== 'cancelled' && (
                <Pressable
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancelPermit(selectedPermit)}
                >
                  <XCircle size={18} color="#DC2626" />
                  <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Cancel Permit</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
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
        <View style={[styles.headerCard, { backgroundColor: '#DC262615', borderColor: '#DC262630' }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIcon, { backgroundColor: '#DC262620' }]}>
              <Lock size={28} color="#DC2626" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>LOTO Permits</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Lockout/Tagout energy isolation permits
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
        </View>

        <Pressable
          style={[styles.createButton, { backgroundColor: '#DC2626' }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.createButtonText}>New LOTO Permit</Text>
        </Pressable>

        <View style={styles.tabsContainer}>
          {(['active', 'pending', 'completed', 'all'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: '#DC262615', borderColor: '#DC2626' },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setActiveTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#DC2626' : colors.textSecondary }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredPermits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Lock size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No permits found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'active' ? 'No active LOTO permits' : `No ${activeTab} permits`}
            </Text>
          </View>
        ) : (
          filteredPermits.map(renderPermitCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New LOTO Permit</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Step {formStep + 1} of 5
              </Text>
            </View>
            <Pressable onPress={() => { setShowCreateModal(false); resetForm(); }} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.stepIndicator}>
            {[0, 1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  { backgroundColor: step <= formStep ? '#DC2626' : colors.border },
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            {renderFormStep()}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            {formStep > 0 && (
              <Pressable
                style={[styles.footerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setFormStep(prev => prev - 1)}
              >
                <Text style={[styles.footerButtonText, { color: colors.text }]}>Previous</Text>
              </Pressable>
            )}
            {formStep < 4 ? (
              <Pressable
                style={[styles.footerButton, styles.primaryButton, { backgroundColor: '#DC2626' }]}
                onPress={() => setFormStep(prev => prev + 1)}
              >
                <Text style={[styles.footerButtonText, { color: '#fff' }]}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.footerButton, styles.primaryButton, { backgroundColor: '#10B981' }]}
                onPress={handleCreatePermit}
              >
                <Text style={[styles.footerButtonText, { color: '#fff' }]}>Submit Permit</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {renderDetailModal()}
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
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  createButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  permitCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  permitHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  permitTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  permitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  permitTitleContainer: {
    flex: 1,
  },
  permitNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  permitEquipment: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  permitDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  permitFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  permitInfo: {},
  permitInfoLabel: {
    fontSize: 11,
  },
  permitInfoValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  timeRemaining: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  timeRemainingText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  energySourcesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 4,
  },
  energyBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  energyBadgeText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '500' as const,
    alignSelf: 'center' as const,
  },
  chevron: {
    position: 'absolute' as const,
    right: 14,
    top: '50%',
  },
  emptyState: {
    alignItems: 'center' as const,
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
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
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  primaryButton: {
    borderWidth: 0,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  formSectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  inputRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  lockoutPointCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  lockoutPointHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  lockoutPointIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  lockoutPointInfo: {
    flex: 1,
  },
  lockoutPointLocation: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lockoutPointType: {
    fontSize: 12,
  },
  lockoutPointTags: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 8,
  },
  tagBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  addLockoutForm: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  addLockoutTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  energyTypeScroll: {
    marginBottom: 8,
  },
  energyTypeButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  energyTypeText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  checkboxGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  checkboxText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  workersContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 10,
  },
  workerBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  addWorkerRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  addWorkerButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  detailStatusText: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  timeRemainingDetail: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailSection: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  lockoutDetailItem: {
    paddingVertical: 10,
  },
  lockoutDetailHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  lockoutDetailIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  lockoutDetailInfo: {
    flex: 1,
  },
  lockoutDetailLocation: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lockoutDetailType: {
    fontSize: 12,
  },
  verifiedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#10B981',
  },
  lockoutDetailMethod: {
    fontSize: 12,
    marginTop: 6,
  },
  lockoutDetailTags: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 4,
  },
  lockoutDetailTag: {
    fontSize: 11,
  },
  tagContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  detailTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actionButtons: {
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#DC262610',
    borderWidth: 1,
    borderColor: '#DC262630',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
