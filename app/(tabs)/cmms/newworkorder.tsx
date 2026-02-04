import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  Wrench,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  MapPin,
  Cog,
  Shield,
  Lock,
  ClipboardList,
  Send,
  Trash2,
  HardHat,
  Zap,
  AlertCircle,
  Calendar,
} from 'lucide-react-native';
import DatePickerModal from '@/components/DatePickerModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useEquipmentQuery, ExtendedEquipment } from '@/hooks/useSupabaseEquipment';
import { useCreateWorkOrder, WorkOrderSafety, WorkOrderTask } from '@/hooks/useSupabaseWorkOrders';
import { useLocations } from '@/hooks/useLocations';
import { WORK_ORDER_TYPES } from '@/constants/workOrderConstants';
import {
  PERMIT_TYPES,
  PPE_ITEMS,
  PPE_CATEGORIES,
  DEFAULT_LOTO_STEPS,
  ENERGY_SOURCES,
  LOCK_COLORS,
  type LOTOStep,
} from '@/constants/workOrderDataConstants';
import { LOCATION_TYPE_LABELS } from '@/types/location';
import type { LocationWithFacility } from '@/types/location';
import * as Haptics from 'expo-haptics';

const safeParseFloat = (value: string): number | null => {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

type RequestType = 'service_request' | 'work_order';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type WorkType = 'corrective' | 'preventive' | 'emergency' | 'request';

interface TaskItem {
  id: string;
  description: string;
  order: number;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ComponentType<any> }> = {
  low: { label: 'Low', color: '#10B981', icon: Clock },
  medium: { label: 'Medium', color: '#3B82F6', icon: Clock },
  high: { label: 'High', color: '#F59E0B', icon: AlertTriangle },
  critical: { label: 'Critical', color: '#EF4444', icon: AlertCircle },
};

export default function NewWorkOrderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  useUser();
  
  const { data: equipment = [], isLoading: equipmentLoading } = useEquipmentQuery();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const createWorkOrderMutation = useCreateWorkOrder({
    onSuccess: (data) => {
      console.log('Work order created successfully:', data.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Request Submitted',
        `Your ${requestType === 'service_request' ? 'service request' : 'work order'} has been created successfully.\n\nID: ${data.work_order_number || data.id}`,
        [
          {
            text: 'View Work Orders',
            onPress: () => router.push('/cmms/workorders'),
          },
          {
            text: 'Create Another',
            onPress: resetForm,
          },
        ]
      );
    },
    onError: (error) => {
      console.error('Error creating work order:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    },
  });

  const [requestType, setRequestType] = useState<RequestType>('service_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [workType, setWorkType] = useState<WorkType>('corrective');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Safety
  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoSteps, setLotoSteps] = useState<LOTOStep[]>([]);
  const [selectedPermits, setSelectedPermits] = useState<string[]>([]);
  const [selectedPPE, setSelectedPPE] = useState<string[]>([]);
  
  // Tasks
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Downtime tracking
  const [selectedRoomLine, setSelectedRoomLine] = useState<string | null>(null);
  const [productionStopped, setProductionStopped] = useState(false);
  const [stoppedAtTimestamp, setStoppedAtTimestamp] = useState<string | null>(null);
  
  // Modals
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showPermitsModal, setShowPermitsModal] = useState(false);
  const [showPPEModal, setShowPPEModal] = useState(false);
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const [showLotoModal, setShowLotoModal] = useState(false);
  const [showRoomLineModal, setShowRoomLineModal] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const selectedEquipmentData = useMemo((): ExtendedEquipment | undefined => {
    return equipment.find((e: ExtendedEquipment) => e.id === selectedEquipment);
  }, [equipment, selectedEquipment]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSelectedEquipment(null);
    setLocation('');
    setEstimatedHours('');
    setDueDate('');
    setLotoRequired(false);
    setLotoSteps([]);
    setSelectedPermits([]);
    setSelectedPPE([]);
    setTasks([]);
    setNotes('');
    setSelectedRoomLine(null);
    setProductionStopped(false);
    setStoppedAtTimestamp(null);
  }, []);

  const activeLocations = useMemo(() => {
    return locations.filter((loc: LocationWithFacility) => loc.status === 'active');
  }, [locations]);

  const selectedLocationData = useMemo(() => {
    return activeLocations.find((loc: LocationWithFacility) => loc.id === selectedRoomLine);
  }, [activeLocations, selectedRoomLine]);

  const handleToggleProductionStopped = useCallback((value: boolean) => {
    setProductionStopped(value);
    if (value && !stoppedAtTimestamp) {
      setStoppedAtTimestamp(new Date().toISOString());
    } else if (!value) {
      setStoppedAtTimestamp(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [stoppedAtTimestamp]);

  const handleSelectEquipment = useCallback((equipId: string) => {
    const equip = equipment.find((e: ExtendedEquipment) => e.id === equipId);
    setSelectedEquipment(equipId);
    if (equip?.location) {
      setLocation(equip.location);
    }
    setShowEquipmentModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [equipment]);

  const handleAddTask = useCallback(() => {
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      description: newTaskText.trim(),
      order: tasks.length + 1,
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newTaskText, tasks]);

  const handleRemoveTask = useCallback((taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId).map((t, idx) => ({ ...t, order: idx + 1 })));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [tasks]);

  const handleTogglePermit = useCallback((permitId: string) => {
    setSelectedPermits(prev => 
      prev.includes(permitId) 
        ? prev.filter(p => p !== permitId)
        : [...prev, permitId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTogglePPE = useCallback((ppeId: string) => {
    setSelectedPPE(prev => 
      prev.includes(ppeId) 
        ? prev.filter(p => p !== ppeId)
        : [...prev, ppeId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleLoadDefaultLoto = useCallback(() => {
    setLotoSteps(DEFAULT_LOTO_STEPS);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleSubmit = useCallback(() => {
    const missingFields: string[] = [];
    
    if (!title.trim()) missingFields.push('Title');
    if (!description.trim()) missingFields.push('Description');
    if (!selectedRoomLine) missingFields.push('Location');
    
    if (requestType === 'work_order') {
      if (!estimatedHours.trim()) missingFields.push('Estimated Hours');
      if (!dueDate.trim()) missingFields.push('Due Date');
    }
    
    if (missingFields.length > 0) {
      Alert.alert(
        'Required Fields Missing',
        `Please fill in the following required fields:\n\n• ${missingFields.join('\n• ')}`
      );
      return;
    }

    const safetyData: WorkOrderSafety = {
      lotoRequired,
      lotoSteps: lotoSteps.map((step, idx) => ({
        id: step.id,
        order: idx + 1,
        description: step.description,
        lockColor: step.lockColor,
        energySource: step.energySource,
        location: step.lockLocation,
      })),
      permits: selectedPermits,
      permitNumbers: {},
      permitExpiry: {},
      ppeRequired: selectedPPE,
    };

    const taskData: WorkOrderTask[] = tasks.map(t => ({
      id: t.id,
      order: t.order,
      description: t.description,
      completed: false,
    }));

    const workOrderData = {
      title: title.trim(),
      description: description.trim(),
      status: 'open' as const,
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      type: requestType === 'work_order' ? workType : 'request' as const,
      source: 'manual' as const,
      equipment_id: selectedEquipment || null,
      equipment: selectedEquipmentData?.name || null,
      location: location || selectedLocationData?.name || undefined,
      facility_id: selectedRoomLine || '',
      due_date: dueDate || new Date().toISOString(),
      estimated_hours: safeParseFloat(estimatedHours),
      actual_hours: null,
      notes: notes || null,
      safety: safetyData,
      tasks: taskData,
      assigned_to: null,
      assigned_name: undefined,
      started_at: null,
      completed_at: null,
      completion_notes: null,
    };

    console.log('Creating work order:', workOrderData);
    createWorkOrderMutation.mutate(workOrderData);
  }, [
    title, description, priority, workType, requestType,
    selectedEquipment, selectedEquipmentData, location,
    estimatedHours, dueDate, lotoRequired, lotoSteps,
    selectedPermits, selectedPPE, tasks, notes,
    selectedRoomLine, selectedLocationData?.name,
    createWorkOrderMutation,
  ]);

  const isFormValid = useMemo(() => {
    const basicValid = title.trim() && description.trim() && selectedRoomLine;
    if (requestType === 'work_order') {
      return basicValid && estimatedHours.trim() && dueDate.trim() && !createWorkOrderMutation.isPending;
    }
    return basicValid && !createWorkOrderMutation.isPending;
  }, [title, description, selectedRoomLine, requestType, estimatedHours, dueDate, createWorkOrderMutation.isPending]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Request Type Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Type</Text>
          <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={[
                styles.toggleButton,
                requestType === 'service_request' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setRequestType('service_request');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <FileText size={18} color={requestType === 'service_request' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[
                styles.toggleText,
                { color: requestType === 'service_request' ? '#FFFFFF' : colors.text },
              ]}>
                Service Request
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                requestType === 'work_order' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setRequestType('work_order');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Wrench size={18} color={requestType === 'work_order' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[
                styles.toggleText,
                { color: requestType === 'work_order' ? '#FFFFFF' : colors.text },
              ]}>
                Work Order
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {requestType === 'service_request' 
              ? 'Submit a request for maintenance to review and schedule'
              : 'Create a detailed work order with full specifications'}
          </Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          
          <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Brief description of the issue or work needed"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Detailed description of the problem, symptoms, or work required..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Priority Selector */}
          <Pressable
            style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPriorityModal(true)}
          >
            <View style={styles.selectorLeft}>
              <AlertTriangle size={20} color={PRIORITY_CONFIG[priority].color} />
              <View>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Priority</Text>
                <Text style={[styles.selectorValue, { color: PRIORITY_CONFIG[priority].color }]}>
                  {PRIORITY_CONFIG[priority].label}
                </Text>
              </View>
            </View>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Work Type (Only for Work Orders) */}
          {requestType === 'work_order' && (
            <Pressable
              style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowWorkTypeModal(true)}
            >
              <View style={styles.selectorLeft}>
                <Wrench size={20} color={WORK_ORDER_TYPES.find(t => t.id === workType)?.color || colors.primary} />
                <View>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Work Type</Text>
                  <Text style={[styles.selectorValue, { color: colors.text }]}>
                    {WORK_ORDER_TYPES.find(t => t.id === workType)?.name || 'Select type'}
                  </Text>
                </View>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Equipment & Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment & Location</Text>
          
          <Pressable
            style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowEquipmentModal(true)}
          >
            <View style={styles.selectorLeft}>
              <Cog size={20} color={selectedEquipmentData ? colors.primary : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Equipment</Text>
                <Text style={[styles.selectorValue, { color: selectedEquipmentData ? colors.text : colors.textTertiary }]} numberOfLines={1}>
                  {selectedEquipmentData ? `${selectedEquipmentData.name} (${selectedEquipmentData.equipment_tag})` : 'Select equipment (optional)'}
                </Text>
              </View>
            </View>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowRoomLineModal(true)}
          >
            <View style={styles.selectorLeft}>
              <MapPin size={20} color={selectedLocationData ? selectedLocationData.color : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Location <Text style={styles.requiredAsterisk}>*</Text></Text>
                <Text style={[styles.selectorValue, { color: selectedLocationData ? colors.text : colors.textTertiary }]} numberOfLines={1}>
                  {selectedLocationData ? selectedLocationData.name : 'Select location'}
                </Text>
              </View>
            </View>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>

          {selectedRoomLine && (
            <Pressable
              style={[
                styles.productionStoppedCard,
                { 
                  backgroundColor: productionStopped ? colors.error + '15' : colors.surface, 
                  borderColor: productionStopped ? colors.error : colors.border,
                },
              ]}
              onPress={() => handleToggleProductionStopped(!productionStopped)}
            >
              <View style={styles.productionStoppedLeft}>
                <View style={[styles.productionStoppedIcon, { backgroundColor: productionStopped ? colors.error + '20' : colors.backgroundSecondary }]}>
                  <AlertCircle size={22} color={productionStopped ? colors.error : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productionStoppedTitle, { color: colors.text }]}>Has production stopped?</Text>
                  {productionStopped && stoppedAtTimestamp && (
                    <Text style={[styles.productionStoppedTime, { color: colors.error }]}>
                      Stopped at {new Date(stoppedAtTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.productionToggle}>
                <Pressable
                  style={[
                    styles.toggleOption,
                    !productionStopped && { backgroundColor: colors.success },
                  ]}
                  onPress={() => handleToggleProductionStopped(false)}
                >
                  <Text style={[styles.toggleOptionText, { color: !productionStopped ? '#FFFFFF' : colors.textSecondary }]}>Running</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleOption,
                    productionStopped && { backgroundColor: colors.error },
                  ]}
                  onPress={() => handleToggleProductionStopped(true)}
                >
                  <Text style={[styles.toggleOptionText, { color: productionStopped ? '#FFFFFF' : colors.textSecondary }]}>Stopped</Text>
                </Pressable>
              </View>
            </Pressable>
          )}

          <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Additional Location Details</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Specific area, notes, etc. (optional)"
              placeholderTextColor={colors.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {requestType === 'work_order' && (
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfWidth, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Est. Hours <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="0.0"
                  placeholderTextColor={colors.textTertiary}
                  value={estimatedHours}
                  onChangeText={setEstimatedHours}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Due Date <Text style={styles.requiredAsterisk}>*</Text></Text>
                <Pressable
                  style={[styles.datePickerButton, { borderColor: colors.border }]}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.datePickerText, { color: dueDate ? colors.text : colors.textTertiary }]}>
                    {dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Safety Requirements (Only for Work Orders) */}
        {requestType === 'work_order' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Requirements</Text>
            
            {/* LOTO Toggle */}
            <Pressable
              style={[
                styles.safetyCard,
                { 
                  backgroundColor: lotoRequired ? colors.error + '15' : colors.surface, 
                  borderColor: lotoRequired ? colors.error : colors.border,
                },
              ]}
              onPress={() => {
                setLotoRequired(!lotoRequired);
                if (!lotoRequired && lotoSteps.length === 0) {
                  setLotoSteps(DEFAULT_LOTO_STEPS);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <View style={styles.safetyCardLeft}>
                <View style={[styles.safetyIcon, { backgroundColor: lotoRequired ? colors.error + '20' : colors.backgroundSecondary }]}>
                  <Lock size={22} color={lotoRequired ? colors.error : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.safetyTitle, { color: colors.text }]}>LOTO Required</Text>
                  <Text style={[styles.safetyDesc, { color: colors.textSecondary }]}>
                    Lockout/Tagout procedure required
                  </Text>
                </View>
              </View>
              <View style={[
                styles.checkbox,
                { 
                  backgroundColor: lotoRequired ? colors.error : 'transparent',
                  borderColor: lotoRequired ? colors.error : colors.border,
                },
              ]}>
                {lotoRequired && <Check size={14} color="#FFFFFF" />}
              </View>
            </Pressable>

            {lotoRequired && (
              <Pressable
                style={[styles.lotoStepsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowLotoModal(true)}
              >
                <ClipboardList size={18} color={colors.primary} />
                <Text style={[styles.lotoStepsText, { color: colors.text }]}>
                  {lotoSteps.length} LOTO Steps Configured
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </Pressable>
            )}

            {/* Permits */}
            <Pressable
              style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowPermitsModal(true)}
            >
              <View style={styles.selectorLeft}>
                <Shield size={20} color={selectedPermits.length > 0 ? colors.warning : colors.textSecondary} />
                <View>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>Permits Required</Text>
                  <Text style={[styles.selectorValue, { color: selectedPermits.length > 0 ? colors.text : colors.textTertiary }]}>
                    {selectedPermits.length > 0 
                      ? `${selectedPermits.length} permit(s) selected`
                      : 'Select permits (if needed)'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </Pressable>

            {selectedPermits.length > 0 && (
              <View style={styles.selectedTags}>
                {selectedPermits.map(permitId => {
                  const permit = PERMIT_TYPES.find(p => p.id === permitId);
                  return permit ? (
                    <View key={permitId} style={[styles.tag, { backgroundColor: permit.color + '20', borderColor: permit.color }]}>
                      <Text style={[styles.tagText, { color: permit.color }]}>{permit.name}</Text>
                      <Pressable onPress={() => handleTogglePermit(permitId)}>
                        <X size={14} color={permit.color} />
                      </Pressable>
                    </View>
                  ) : null;
                })}
              </View>
            )}

            {/* PPE */}
            <Pressable
              style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowPPEModal(true)}
            >
              <View style={styles.selectorLeft}>
                <HardHat size={20} color={selectedPPE.length > 0 ? colors.info : colors.textSecondary} />
                <View>
                  <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>PPE Required</Text>
                  <Text style={[styles.selectorValue, { color: selectedPPE.length > 0 ? colors.text : colors.textTertiary }]}>
                    {selectedPPE.length > 0 
                      ? `${selectedPPE.length} item(s) selected`
                      : 'Select required PPE'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </Pressable>

            {selectedPPE.length > 0 && (
              <View style={styles.selectedTags}>
                {selectedPPE.map(ppeId => {
                  const ppe = PPE_ITEMS.find(p => p.id === ppeId);
                  return ppe ? (
                    <View key={ppeId} style={[styles.tag, { backgroundColor: colors.info + '20', borderColor: colors.info }]}>
                      <Text style={[styles.tagText, { color: colors.info }]}>{ppe.name}</Text>
                      <Pressable onPress={() => handleTogglePPE(ppeId)}>
                        <X size={14} color={colors.info} />
                      </Pressable>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>
        )}

        {/* Tasks (Only for Work Orders) */}
        {requestType === 'work_order' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Work Tasks</Text>
            
            <View style={[styles.taskInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.taskInput, { color: colors.text }]}
                placeholder="Add a task..."
                placeholderTextColor={colors.textTertiary}
                value={newTaskText}
                onChangeText={setNewTaskText}
                onSubmitEditing={handleAddTask}
              />
              <Pressable
                style={[styles.addTaskButton, { backgroundColor: colors.primary, opacity: newTaskText.trim() ? 1 : 0.5 }]}
                onPress={handleAddTask}
                disabled={!newTaskText.trim()}
              >
                <Plus size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {tasks.length > 0 && (
              <View style={styles.tasksList}>
                {tasks.map((task, index) => (
                  <View 
                    key={task.id} 
                    style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.taskLeft}>
                      <View style={[styles.taskNumber, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.taskNumberText, { color: colors.primary }]}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={2}>
                        {task.description}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleRemoveTask(task.id)}>
                      <Trash2 size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {tasks.length === 0 && (
              <Text style={[styles.emptyTasksText, { color: colors.textSecondary }]}>
                No tasks added yet. Add tasks to define the work scope.
              </Text>
            )}
          </View>
        )}

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
          <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Any additional information, special instructions, or observations..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Pressable
            style={[
              styles.submitButton,
              { 
                backgroundColor: isFormValid ? colors.primary : colors.backgroundSecondary,
                opacity: isFormValid ? 1 : 0.6,
              },
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || createWorkOrderMutation.isPending}
          >
            <Send size={20} color={isFormValid ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.submitText, { color: isFormValid ? '#FFFFFF' : colors.textSecondary }]}>
              {createWorkOrderMutation.isPending 
                ? 'Creating...' 
                : requestType === 'service_request' ? 'Submit Service Request' : 'Create Work Order'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Equipment Modal */}
      <Modal visible={showEquipmentModal} transparent animationType="slide" onRequestClose={() => setShowEquipmentModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEquipmentModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Equipment</Text>
              <Pressable onPress={() => setShowEquipmentModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              <Pressable
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedEquipment(null);
                  setShowEquipmentModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: colors.textSecondary }]}>
                  No Equipment (General Request)
                </Text>
              </Pressable>
              {equipmentLoading && (
                <View style={[styles.modalOption, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalOptionText, { color: colors.textSecondary }]}>Loading equipment...</Text>
                </View>
              )}
              {equipment.map((equip: ExtendedEquipment) => (
                <Pressable
                  key={equip.id}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedEquipment === equip.id && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => handleSelectEquipment(equip.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {equip.name}
                    </Text>
                    <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                      {equip.equipment_tag} • {equip.location || 'No location'}
                    </Text>
                  </View>
                  {selectedEquipment === equip.id && <Check size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Priority Modal */}
      <Modal visible={showPriorityModal} transparent animationType="slide" onRequestClose={() => setShowPriorityModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPriorityModal(false)}>
          <Pressable style={[styles.modalContent, styles.smallModal, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Priority</Text>
              <Pressable onPress={() => setShowPriorityModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => {
              const config = PRIORITY_CONFIG[p];
              const Icon = config.icon;
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    priority === p && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => {
                    setPriority(p);
                    setShowPriorityModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.priorityOption}>
                    <View style={[styles.priorityIcon, { backgroundColor: config.color + '20' }]}>
                      <Icon size={18} color={config.color} />
                    </View>
                    <View>
                      <Text style={[styles.modalOptionText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                  {priority === p && <Check size={20} color={config.color} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Work Type Modal */}
      <Modal visible={showWorkTypeModal} transparent animationType="slide" onRequestClose={() => setShowWorkTypeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWorkTypeModal(false)}>
          <Pressable style={[styles.modalContent, styles.smallModal, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Work Type</Text>
              <Pressable onPress={() => setShowWorkTypeModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            {WORK_ORDER_TYPES.map(type => (
              <Pressable
                key={type.id}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  workType === type.id && { backgroundColor: type.color + '15' },
                ]}
                onPress={() => {
                  setWorkType(type.id as WorkType);
                  setShowWorkTypeModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalOptionText, { color: type.color }]}>{type.name}</Text>
                  <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>{type.description}</Text>
                </View>
                {workType === type.id && <Check size={20} color={type.color} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Permits Modal */}
      <Modal visible={showPermitsModal} transparent animationType="slide" onRequestClose={() => setShowPermitsModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPermitsModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Required Permits</Text>
              <Pressable onPress={() => setShowPermitsModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {PERMIT_TYPES.map(permit => (
                <Pressable
                  key={permit.id}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedPermits.includes(permit.id) && { backgroundColor: permit.color + '15' },
                  ]}
                  onPress={() => handleTogglePermit(permit.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.permitHeader}>
                      <View style={[styles.permitBadge, { backgroundColor: permit.color }]}>
                        <Text style={styles.permitCode}>{permit.id.toUpperCase().substring(0, 2)}</Text>
                      </View>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{permit.name}</Text>
                    </View>
                    <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>{permit.description}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    { 
                      backgroundColor: selectedPermits.includes(permit.id) ? permit.color : 'transparent',
                      borderColor: selectedPermits.includes(permit.id) ? permit.color : colors.border,
                    },
                  ]}>
                    {selectedPermits.includes(permit.id) && <Check size={14} color="#FFFFFF" />}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPermitsModal(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PPE Modal */}
      <Modal visible={showPPEModal} transparent animationType="slide" onRequestClose={() => setShowPPEModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPPEModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Required PPE</Text>
              <Pressable onPress={() => setShowPPEModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {PPE_CATEGORIES.map(category => {
                const categoryItems = PPE_ITEMS.filter(p => p.category === category.id);
                if (categoryItems.length === 0) return null;
                return (
                  <View key={category.id}>
                    <Text style={[styles.ppeCategoryTitle, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}>
                      {category.name}
                    </Text>
                    {categoryItems.map(ppe => (
                      <Pressable
                        key={ppe.id}
                        style={[
                          styles.modalOption,
                          { borderBottomColor: colors.border },
                          selectedPPE.includes(ppe.id) && { backgroundColor: colors.info + '15' },
                        ]}
                        onPress={() => handleTogglePPE(ppe.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalOptionText, { color: colors.text }]}>{ppe.name}</Text>
                          <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>{ppe.category}</Text>
                        </View>
                        <View style={[
                          styles.checkbox,
                          { 
                            backgroundColor: selectedPPE.includes(ppe.id) ? colors.info : 'transparent',
                            borderColor: selectedPPE.includes(ppe.id) ? colors.info : colors.border,
                          },
                        ]}>
                          {selectedPPE.includes(ppe.id) && <Check size={14} color="#FFFFFF" />}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPPEModal(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Location Modal */}
      <Modal visible={showRoomLineModal} transparent animationType="slide" onRequestClose={() => setShowRoomLineModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoomLineModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <Pressable onPress={() => setShowRoomLineModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {locationsLoading && (
                <View style={[styles.modalOption, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalOptionText, { color: colors.textSecondary }]}>Loading locations...</Text>
                </View>
              )}
              {!locationsLoading && activeLocations.length === 0 && (
                <View style={[styles.modalOption, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalOptionText, { color: colors.textSecondary }]}>No locations found. Add locations in Settings.</Text>
                </View>
              )}
              {activeLocations.map((loc: LocationWithFacility) => (
                <Pressable
                  key={loc.id}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedRoomLine === loc.id && { backgroundColor: loc.color + '15' },
                  ]}
                  onPress={() => {
                    setSelectedRoomLine(loc.id);
                    setShowRoomLineModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.roomLineOption}>
                    <View style={[styles.roomLineIndicator, { backgroundColor: loc.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{loc.name}</Text>
                      <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                        {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                        {loc.facility ? ` • ${loc.facility.name}` : ''}
                        {loc.parent_location ? ` • ${loc.parent_location.name}` : ''}
                      </Text>
                    </View>
                  </View>
                  {selectedRoomLine === loc.id && <Check size={20} color={loc.color} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* LOTO Modal */}
      <Modal visible={showLotoModal} transparent animationType="slide" onRequestClose={() => setShowLotoModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLotoModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>LOTO Procedure</Text>
              <Pressable onPress={() => setShowLotoModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {lotoSteps.map((step, index) => {
                const lockColor = LOCK_COLORS.find(c => c.id === step.lockColor);
                const energySource = ENERGY_SOURCES.find(e => e.id === step.energySource);
                return (
                  <View 
                    key={step.id} 
                    style={[styles.lotoStep, { borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.lotoStepNumber, { backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.lotoStepNumberText, { color: colors.error }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.lotoStepContent}>
                      <Text style={[styles.lotoStepText, { color: colors.text }]}>
                        {step.description}
                      </Text>
                      <View style={styles.lotoStepMeta}>
                        {energySource && (
                          <View style={[styles.lotoTag, { backgroundColor: colors.backgroundSecondary }]}>
                            <Zap size={12} color={colors.textSecondary} />
                            <Text style={[styles.lotoTagText, { color: colors.textSecondary }]}>
                              {energySource.name}
                            </Text>
                          </View>
                        )}
                        {lockColor && (
                          <View style={[styles.lotoTag, { backgroundColor: lockColor.hex + '20' }]}>
                            <Lock size={12} color={lockColor.hex} />
                            <Text style={[styles.lotoTagText, { color: lockColor.hex }]}>
                              {lockColor.name} Lock
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
              {lotoSteps.length === 0 && (
                <View style={styles.emptyLoto}>
                  <Lock size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyLotoText, { color: colors.textSecondary }]}>
                    No LOTO steps configured
                  </Text>
                  <Pressable
                    style={[styles.loadDefaultButton, { backgroundColor: colors.primary }]}
                    onPress={handleLoadDefaultLoto}
                  >
                    <Text style={styles.loadDefaultText}>Load Default Steps</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowLotoModal(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Due Date Picker */}
      <DatePickerModal
        visible={showDueDatePicker}
        onClose={() => setShowDueDatePicker(false)}
        onSelect={(date) => {
          setDueDate(date);
          setShowDueDatePicker(false);
        }}
        selectedDate={dueDate}
        minDate={new Date().toISOString().split('T')[0]}
        title="Select Due Date"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  inputGroup: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  textInput: {
    fontSize: 15,
    padding: 0,
  },
  textArea: {
    fontSize: 15,
    padding: 0,
    minHeight: 80,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  safetyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  safetyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  safetyDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lotoStepsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    marginLeft: 56,
    gap: 10,
  },
  lotoStepsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  taskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 10,
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  addTaskButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tasksList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  taskText: {
    fontSize: 14,
    flex: 1,
  },
  emptyTasksText: {
    fontSize: 13,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  smallModal: {
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  permitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  permitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  permitCode: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  ppeCategoryTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalActions: {
    padding: 16,
  },
  modalButton: {
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  lotoStep: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  lotoStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  lotoStepNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  lotoStepContent: {
    flex: 1,
  },
  lotoStepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  lotoStepMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  lotoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  lotoTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyLoto: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 12,
  },
  emptyLotoText: {
    fontSize: 14,
  },
  loadDefaultButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  loadDefaultText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  productionStoppedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  productionStoppedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  productionStoppedIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  productionStoppedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  productionStoppedTime: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  productionToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  toggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '600' as const,
  },
  roomLineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roomLineIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  datePickerText: {
    fontSize: 15,
    flex: 1,
  },
});
