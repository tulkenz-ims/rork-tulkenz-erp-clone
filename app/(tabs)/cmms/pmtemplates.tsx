import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Cog,
  CheckCircle,
  Circle,
  GripVertical,
  AlertTriangle,
  Lock,
  Shield,
  HardHat,
  X,
  Zap,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  usePMSchedulesQuery,
  usePMScheduleById,
  useCreatePMSchedule,
  useUpdatePMSchedule,
  type ExtendedPMSchedule,
  type PMFrequency,
  type PMPriority,
  type PMDayOfWeek,
  getFrequencyDays,
} from '@/hooks/useSupabasePMSchedules';

interface PMTask {
  id: string;
  description: string;
  required: boolean;
  order: number;
}

const FREQUENCY_DAYS: Record<PMFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semi_annual: 180,
  annual: 365,
};
import { useEquipmentQuery, type ExtendedEquipment } from '@/hooks/useSupabaseEquipment';
import { useEmployees, type SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import {
  PERMIT_TYPES,
  PPE_ITEMS,
  PPE_CATEGORIES,
  LOCK_COLORS,
  ENERGY_SOURCES,
  DEFAULT_LOTO_STEPS,
} from '@/constants/workOrderDataConstants';
import * as Haptics from 'expo-haptics';

interface PMSafety {
  lotoRequired: boolean;
  lotoSteps: Array<{
    id: string;
    order: number;
    description: string;
    lockColor?: string;
    energySource?: string;
    location?: string;
  }>;
  permits: string[];
  ppeRequired: string[];
}

const PRIORITIES: { value: PMPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#3B82F6' },
  { value: 'high', label: 'High', color: '#F59E0B' },
  { value: 'critical', label: 'Critical', color: '#EF4444' },
];

const FREQUENCIES: { value: PMFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const DAYS_OF_WEEK: { value: PMDayOfWeek; label: string; shortLabel: string }[] = [
  { value: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { value: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { value: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { value: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { value: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
];

const SCHEDULE_TIMES: { value: string; label: string }[] = [
  { value: '05:00', label: '5:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
];

interface FormTask {
  id: string;
  description: string;
  required: boolean;
  order: number;
}

interface FormLOTOStep {
  id: string;
  order: number;
  description: string;
  lockColor?: string;
  energySource?: string;
  location?: string;
}

export default function PMTemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  
  const { data: pmSchedules = [] } = usePMSchedulesQuery();
  const { data: equipment = [] } = useEquipmentQuery();
  const { data: employees = [] } = useEmployees({ status: 'active' });
  
  const createPMScheduleMutation = useCreatePMSchedule({
    onSuccess: () => {
      Alert.alert('Success', 'PM Schedule created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });
  
  const updatePMScheduleMutation = useUpdatePMSchedule({
    onSuccess: () => {
      Alert.alert('Success', 'PM Schedule updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const isEditMode = params.mode === 'edit' && params.id;
  const { data: fetchedSchedule } = usePMScheduleById(isEditMode ? params.id : null);
  const existingSchedule = fetchedSchedule || (isEditMode ? pmSchedules.find(pm => pm.id === params.id) : null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [frequency, setFrequency] = useState<PMFrequency>('monthly');
  const [priority, setPriority] = useState<PMPriority>('medium');
  const [estimatedHours, setEstimatedHours] = useState('2');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [tasks, setTasks] = useState<FormTask[]>([]);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  
  const [lotoRequired, setLotoRequired] = useState(false);
  const [lotoSteps, setLotoSteps] = useState<FormLOTOStep[]>([]);
  const [selectedPermits, setSelectedPermits] = useState<string[]>([]);
  const [selectedPPE, setSelectedPPE] = useState<string[]>([]);
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'schedule', 'tasks']));
  const [scheduleTime, setScheduleTime] = useState<string>('08:00');
  const [scheduleDays, setScheduleDays] = useState<PMDayOfWeek[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showPPEModal, setShowPPEModal] = useState(false);
  const [showLOTOStepModal, setShowLOTOStepModal] = useState(false);
  const [editingLOTOStep, setEditingLOTOStep] = useState<FormLOTOStep | null>(null);
  const [newLOTOStep, setNewLOTOStep] = useState({
    description: '',
    lockColor: '',
    energySource: '',
    location: '',
  });

  useEffect(() => {
    if (existingSchedule) {
      setName(existingSchedule.name || '');
      setDescription(existingSchedule.description || '');
      setSelectedEquipment(existingSchedule.equipment_id || '');
      setFrequency((existingSchedule.frequency as PMFrequency) || 'monthly');
      setPriority((existingSchedule.priority as PMPriority) || 'medium');
      setEstimatedHours((existingSchedule.estimated_hours || 2).toString());
      setAssignedTo(existingSchedule.assigned_to || '');
      setIsActive(existingSchedule.active !== false);
      
      const existingTasks = ((existingSchedule as unknown as { tasks?: PMTask[] }).tasks || []);
      setTasks(existingTasks.map(t => ({
        id: t.id,
        description: t.description,
        required: t.required,
        order: t.order,
      })));
      
      const safety = (existingSchedule as unknown as { safety?: PMSafety }).safety;
      if (safety) {
        setLotoRequired(safety.lotoRequired);
        setLotoSteps(safety.lotoSteps.map(s => ({
          id: s.id,
          order: s.order,
          description: s.description,
          lockColor: s.lockColor,
          energySource: s.energySource,
          location: s.location,
        })));
        setSelectedPermits(safety.permits);
        setSelectedPPE(safety.ppeRequired);
      }
      
      if (existingSchedule.schedule_time) {
        setScheduleTime(existingSchedule.schedule_time);
      }
      if (existingSchedule.schedule_days && existingSchedule.schedule_days.length > 0) {
        setScheduleDays(existingSchedule.schedule_days);
      }
    }
  }, [existingSchedule]);

  const selectedEquipmentData = useMemo(() => 
    equipment.find((e: ExtendedEquipment) => e.id === selectedEquipment),
    [equipment, selectedEquipment]
  );

  const selectedAssigneeData = useMemo(() => 
    employees.find((e: SupabaseEmployee) => e.id === assignedTo),
    [employees, assignedTo]
  );

  const maintenanceTechnicians = useMemo(() => 
    employees.filter((e: SupabaseEmployee) => 
      e.role === 'technician' || 
      e.role === 'mechanic' ||
      e.position?.toLowerCase().includes('maintenance') ||
      e.position?.toLowerCase().includes('technician')
    ),
    [employees]
  );

  const selectedPermitData = useMemo(() => 
    PERMIT_TYPES.filter(p => selectedPermits.includes(p.id)),
    [selectedPermits]
  );

  const selectedPPEData = useMemo(() => 
    PPE_ITEMS.filter(p => selectedPPE.includes(p.id)),
    [selectedPPE]
  );

  const toggleSection = useCallback((section: string) => {
    Haptics.selectionAsync();
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleAddTask = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTask: FormTask = {
      id: `task-${Date.now()}`,
      description: '',
      required: true,
      order: tasks.length + 1,
    };
    setTasks(prev => [...prev, newTask]);
  }, [tasks.length]);

  const handleUpdateTask = useCallback((taskId: string, updates: Partial<FormTask>) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== taskId);
      return filtered.map((t, idx) => ({ ...t, order: idx + 1 }));
    });
  }, []);

  const handleToggleLOTO = useCallback((enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLotoRequired(enabled);
    if (enabled && lotoSteps.length === 0) {
      setLotoSteps(DEFAULT_LOTO_STEPS.map(s => ({
        id: s.id,
        order: s.order,
        description: s.description,
        lockColor: s.lockColor,
        energySource: s.energySource,
        location: s.lockLocation,
      })));
    }
  }, [lotoSteps.length]);

  const handleAddLOTOStep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingLOTOStep(null);
    setNewLOTOStep({
      description: '',
      lockColor: '',
      energySource: '',
      location: '',
    });
    setShowLOTOStepModal(true);
  }, []);

  const handleEditLOTOStep = useCallback((step: FormLOTOStep) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingLOTOStep(step);
    setNewLOTOStep({
      description: step.description,
      lockColor: step.lockColor || '',
      energySource: step.energySource || '',
      location: step.location || '',
    });
    setShowLOTOStepModal(true);
  }, []);

  const handleSaveLOTOStep = useCallback(() => {
    if (!newLOTOStep.description.trim()) {
      Alert.alert('Error', 'Please enter a step description');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingLOTOStep) {
      setLotoSteps(prev => prev.map(s => 
        s.id === editingLOTOStep.id 
          ? { ...s, ...newLOTOStep }
          : s
      ));
    } else {
      const newStep: FormLOTOStep = {
        id: `loto-${Date.now()}`,
        order: lotoSteps.length + 1,
        description: newLOTOStep.description,
        lockColor: newLOTOStep.lockColor || undefined,
        energySource: newLOTOStep.energySource || undefined,
        location: newLOTOStep.location || undefined,
      };
      setLotoSteps(prev => [...prev, newStep]);
    }

    setShowLOTOStepModal(false);
    setEditingLOTOStep(null);
  }, [newLOTOStep, editingLOTOStep, lotoSteps.length]);

  const handleDeleteLOTOStep = useCallback((stepId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLotoSteps(prev => {
      const filtered = prev.filter(s => s.id !== stepId);
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  }, []);

  const handleTogglePermit = useCallback((permitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPermits(prev => 
      prev.includes(permitId)
        ? prev.filter(p => p !== permitId)
        : [...prev, permitId]
    );
  }, []);

  const handleTogglePPE = useCallback((ppeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPPE(prev => 
      prev.includes(ppeId)
        ? prev.filter(p => p !== ppeId)
        : [...prev, ppeId]
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a PM schedule name');
      return;
    }
    if (!selectedEquipment) {
      Alert.alert('Error', 'Please select equipment');
      return;
    }
    if (tasks.length === 0) {
      Alert.alert('Error', 'Please add at least one task');
      return;
    }
    if (tasks.some(t => !t.description.trim())) {
      Alert.alert('Error', 'All tasks must have a description');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const equipmentData = equipment.find((e: ExtendedEquipment) => e.id === selectedEquipment);
    const assigneeData = assignedTo ? employees.find((e: SupabaseEmployee) => e.id === assignedTo) : null;
    const assigneeName = assigneeData ? `${assigneeData.first_name} ${assigneeData.last_name}` : undefined;

    const pmData: Partial<ExtendedPMSchedule> = {
      name: name.trim(),
      description: description.trim(),
      equipment_id: selectedEquipment,
      equipment_name: equipmentData?.name || '',
      equipment_tag: equipmentData?.equipment_tag || '',
      frequency,
      priority,
      estimated_hours: parseFloat(estimatedHours) || 2,
      assigned_to: assignedTo || undefined,
      assigned_name: assigneeName || undefined,
      next_due: calculateNextDue(frequency, scheduleDays),
      active: isActive,
      facility_id: equipmentData?.facility_id || undefined,
      schedule_time: scheduleTime,
      schedule_days: (frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') ? scheduleDays : undefined,
    };

    if (isEditMode && existingSchedule) {
      updatePMScheduleMutation.mutate({
        id: existingSchedule.id,
        updates: pmData,
      });
    } else {
      createPMScheduleMutation.mutate(pmData as Omit<ExtendedPMSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>);
    }
  }, [name, description, selectedEquipment, frequency, priority, estimatedHours, assignedTo, isActive, tasks, equipment, employees, isEditMode, existingSchedule, updatePMScheduleMutation, createPMScheduleMutation]);

  const calculateNextDue = (freq: PMFrequency, days?: PMDayOfWeek[]): string => {
    const now = new Date();
    
    if ((freq === 'daily' || freq === 'weekly' || freq === 'biweekly') && days && days.length > 0) {
      const dayMap: Record<PMDayOfWeek, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
        thursday: 4, friday: 5, saturday: 6
      };
      const targetDays = days.map(d => dayMap[d]).sort((a, b) => a - b);
      const currentDay = now.getDay();
      
      let nextDay = targetDays.find(d => d > currentDay);
      if (nextDay === undefined) {
        nextDay = targetDays[0];
        now.setDate(now.getDate() + (7 - currentDay + nextDay));
      } else {
        now.setDate(now.getDate() + (nextDay - currentDay));
      }
    } else {
      now.setDate(now.getDate() + (FREQUENCY_DAYS[freq] || 30));
    }
    
    return now.toISOString().split('T')[0];
  };

  const handleToggleDay = useCallback((day: PMDayOfWeek) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduleDays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== day);
      }
      return [...prev, day];
    });
  }, []);

  const handleSelectAllWeekdays = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduleDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  }, []);

  const handleSelectAllDays = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduleDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
  }, []);

  const renderSectionHeader = (
    title: string,
    section: string,
    icon: React.ReactNode,
    badge?: string | number,
    badgeColor?: string
  ) => (
    <Pressable
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {badge !== undefined && (
          <View style={[styles.sectionBadge, { backgroundColor: (badgeColor || colors.primary) + '20' }]}>
            <Text style={[styles.sectionBadgeText, { color: badgeColor || colors.primary }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      {expandedSections.has(section) ? (
        <ChevronDown size={20} color={colors.textSecondary} />
      ) : (
        <ChevronRight size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );

  const renderTaskItem = useCallback((task: FormTask, index: number) => (
    <View 
      key={task.id} 
      style={[styles.taskItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
    >
      <View style={styles.taskHeader}>
        <GripVertical size={18} color={colors.textSecondary} />
        <Text style={[styles.taskNumber, { color: colors.textSecondary }]}>#{index + 1}</Text>
        <Pressable
          style={styles.requiredToggle}
          onPress={() => handleUpdateTask(task.id, { required: !task.required })}
        >
          {task.required ? (
            <CheckCircle size={20} color="#10B981" />
          ) : (
            <Circle size={20} color={colors.textSecondary} />
          )}
          <Text style={[styles.requiredText, { color: task.required ? '#10B981' : colors.textSecondary }]}>
            {task.required ? 'Required' : 'Optional'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.deleteTaskButton, { backgroundColor: '#EF444415' }]}
          onPress={() => handleDeleteTask(task.id)}
        >
          <Trash2 size={16} color="#EF4444" />
        </Pressable>
      </View>
      <TextInput
        style={[styles.taskInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Enter task description..."
        placeholderTextColor={colors.textSecondary}
        value={task.description}
        onChangeText={(text) => handleUpdateTask(task.id, { description: text })}
        multiline
      />
    </View>
  ), [colors, handleUpdateTask, handleDeleteTask]);

  const renderLOTOStepItem = useCallback((step: FormLOTOStep, index: number) => (
    <View key={step.id} style={[styles.lotoStep, { borderColor: colors.border }]}>
      <View style={[styles.lotoStepNumber, { backgroundColor: '#EF4444' }]}>
        <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.lotoStepContent}>
        <Text style={[styles.lotoStepText, { color: colors.text }]}>{step.description}</Text>
        <View style={styles.lotoStepMeta}>
          {step.energySource && (
            <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Zap size={12} color={colors.textSecondary} />
              <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                {step.energySource}
              </Text>
            </View>
          )}
          {step.lockColor && (
            <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <View
                style={[
                  styles.miniLockDot,
                  { backgroundColor: LOCK_COLORS.find(l => l.id === step.lockColor)?.hex || colors.textSecondary },
                ]}
              />
              <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                {step.lockColor} lock
              </Text>
            </View>
          )}
          {step.location && (
            <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                {step.location}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.lotoStepActions}>
        <Pressable
          style={[styles.lotoStepActionBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => handleEditLOTOStep(step)}
        >
          <Cog size={14} color={colors.text} />
        </Pressable>
        <Pressable
          style={[styles.lotoStepActionBtn, { backgroundColor: '#EF444415' }]}
          onPress={() => handleDeleteLOTOStep(step.id)}
        >
          <Trash2 size={14} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  ), [colors, handleEditLOTOStep, handleDeleteLOTOStep]);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: isEditMode ? 'Edit PM Schedule' : 'New PM Schedule',
          headerRight: () => (
            <Pressable onPress={handleSave} style={styles.headerButton}>
              <Save size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Basic Information Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader('Basic Information', 'basic', <Cog size={18} color={colors.primary} />)}
          {expandedSections.has('basic') && (
            <View style={styles.sectionContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>PM Schedule Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., CNC Monthly PM"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter description..."
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Equipment *</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={() => setShowEquipmentPicker(!showEquipmentPicker)}
                >
                  {selectedEquipmentData ? (
                    <View style={styles.pickerValue}>
                      <Cog size={18} color={colors.primary} />
                      <View style={styles.pickerTextContainer}>
                        <Text style={[styles.pickerMainText, { color: colors.text }]}>
                          {selectedEquipmentData.name}
                        </Text>
                        <Text style={[styles.pickerSubText, { color: colors.textSecondary }]}>
                          {selectedEquipmentData.equipment_tag} • {selectedEquipmentData.location}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.pickerPlaceholder, { color: colors.textSecondary }]}>
                      Select equipment...
                    </Text>
                  )}
                  <ChevronDown size={20} color={colors.textSecondary} />
                </Pressable>
                {showEquipmentPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                      {equipment.filter((e: ExtendedEquipment) => e.status !== 'retired').map((e: ExtendedEquipment) => (
                        <Pressable
                          key={e.id}
                          style={[
                            styles.pickerOption,
                            selectedEquipment === e.id && { backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => {
                            setSelectedEquipment(e.id);
                            setShowEquipmentPicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                            {e.name}
                          </Text>
                          <Text style={[styles.pickerOptionSubtext, { color: colors.textSecondary }]}>
                            {e.equipment_tag} • {e.location}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Schedule Settings Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader('Schedule Settings', 'schedule', <Clock size={18} color="#3B82F6" />)}
          {expandedSections.has('schedule') && (
            <View style={styles.sectionContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Frequency</Text>
                <View style={styles.optionsGrid}>
                  {FREQUENCIES.map(f => (
                    <Pressable
                      key={f.value}
                      style={[
                        styles.optionChip,
                        { 
                          backgroundColor: frequency === f.value ? colors.primary : colors.backgroundSecondary,
                          borderColor: frequency === f.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setFrequency(f.value)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        { color: frequency === f.value ? '#FFFFFF' : colors.text },
                      ]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {(frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly') && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Schedule Days</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary, marginBottom: 10 }]}>
                    {frequency === 'daily' 
                      ? 'Select which days this PM should run'
                      : frequency === 'weekly' 
                        ? 'Select which day of the week to generate PM'
                        : 'Select days for bi-weekly schedule'}
                  </Text>
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map(day => (
                      <Pressable
                        key={day.value}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: scheduleDays.includes(day.value) ? '#3B82F6' : colors.backgroundSecondary,
                            borderColor: scheduleDays.includes(day.value) ? '#3B82F6' : colors.border,
                          },
                        ]}
                        onPress={() => handleToggleDay(day.value)}
                      >
                        <Text style={[
                          styles.dayChipText,
                          { color: scheduleDays.includes(day.value) ? '#FFFFFF' : colors.text },
                        ]}>
                          {day.shortLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.dayPresetsRow}>
                    <Pressable
                      style={[styles.presetButton, { borderColor: colors.border }]}
                      onPress={handleSelectAllWeekdays}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.primary }]}>M-F (Weekdays)</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.presetButton, { borderColor: colors.border }]}
                      onPress={handleSelectAllDays}
                    >
                      <Text style={[styles.presetButtonText, { color: colors.primary }]}>All Days</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Schedule Time</Text>
                <Text style={[styles.switchHint, { color: colors.textSecondary, marginBottom: 10 }]}>
                  Time of day when the PM work order should be created
                </Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                >
                  <View style={styles.pickerValue}>
                    <Clock size={18} color="#3B82F6" />
                    <Text style={[styles.pickerMainText, { color: colors.text }]}>
                      {SCHEDULE_TIMES.find(t => t.value === scheduleTime)?.label || scheduleTime}
                    </Text>
                  </View>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </Pressable>
                {showTimePicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                      {SCHEDULE_TIMES.map(time => (
                        <Pressable
                          key={time.value}
                          style={[
                            styles.pickerOption,
                            scheduleTime === time.value && { backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => {
                            setScheduleTime(time.value);
                            setShowTimePicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                            {time.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={[styles.schedulePreviewCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.schedulePreviewHeader}>
                  <Calendar size={16} color="#3B82F6" />
                  <Text style={[styles.schedulePreviewTitle, { color: colors.text }]}>Schedule Preview</Text>
                </View>
                <Text style={[styles.schedulePreviewText, { color: colors.textSecondary }]}>
                  {frequency === 'daily' && scheduleDays.length === 7
                    ? `Every day at ${SCHEDULE_TIMES.find(t => t.value === scheduleTime)?.label}`
                    : frequency === 'daily' && scheduleDays.length === 5 && !scheduleDays.includes('saturday') && !scheduleDays.includes('sunday')
                      ? `Weekdays (M-F) at ${SCHEDULE_TIMES.find(t => t.value === scheduleTime)?.label}`
                      : frequency === 'daily' || frequency === 'weekly' || frequency === 'biweekly'
                        ? `${scheduleDays.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.shortLabel).join(', ')} at ${SCHEDULE_TIMES.find(t => t.value === scheduleTime)?.label}`
                        : `${FREQUENCIES.find(f => f.value === frequency)?.label} at ${SCHEDULE_TIMES.find(t => t.value === scheduleTime)?.label}`}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
                <View style={styles.optionsRow}>
                  {PRIORITIES.map(p => (
                    <Pressable
                      key={p.value}
                      style={[
                        styles.priorityChip,
                        { 
                          backgroundColor: priority === p.value ? p.color + '20' : colors.backgroundSecondary,
                          borderColor: priority === p.value ? p.color : colors.border,
                        },
                      ]}
                      onPress={() => setPriority(p.value)}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                      <Text style={[
                        styles.priorityChipText,
                        { color: priority === p.value ? p.color : colors.text },
                      ]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Estimated Hours</Text>
                  <View style={[styles.inputWithIcon, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <Clock size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.inputWithIconText, { color: colors.text }]}
                      placeholder="2"
                      placeholderTextColor={colors.textSecondary}
                      value={estimatedHours}
                      onChangeText={setEstimatedHours}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Assign To</Text>
                <Pressable
                  style={[styles.pickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={() => setShowAssigneePicker(!showAssigneePicker)}
                >
                  {selectedAssigneeData ? (
                    <View style={styles.pickerValue}>
                      <User size={18} color={colors.primary} />
                      <Text style={[styles.pickerMainText, { color: colors.text }]}>
                        {selectedAssigneeData.first_name} {selectedAssigneeData.last_name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.pickerPlaceholder, { color: colors.textSecondary }]}>
                      Select assignee (optional)...
                    </Text>
                  )}
                  <ChevronDown size={20} color={colors.textSecondary} />
                </Pressable>
                {showAssigneePicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                      <Pressable
                        style={[styles.pickerOption, !assignedTo && { backgroundColor: colors.primary + '15' }]}
                        onPress={() => {
                          setAssignedTo('');
                          setShowAssigneePicker(false);
                        }}
                      >
                        <Text style={[styles.pickerOptionText, { color: colors.textSecondary }]}>
                          Unassigned
                        </Text>
                      </Pressable>
                      {maintenanceTechnicians.map((e: SupabaseEmployee) => (
                        <Pressable
                          key={e.id}
                          style={[
                            styles.pickerOption,
                            assignedTo === e.id && { backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => {
                            setAssignedTo(e.id);
                            setShowAssigneePicker(false);
                          }}
                        >
                          <Text style={[styles.pickerOptionText, { color: colors.text }]}>
                            {e.first_name} {e.last_name}
                          </Text>
                          <Text style={[styles.pickerOptionSubtext, { color: colors.textSecondary }]}>
                            {e.position} • {e.role}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 2 }]}>Active</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    Inactive schedules will not generate work orders
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}
        </View>

        {/* LOTO Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader(
            'LOTO Procedure',
            'loto',
            <Lock size={18} color="#EF4444" />,
            lotoRequired ? 'REQUIRED' : 'OFF',
            lotoRequired ? '#EF4444' : colors.textTertiary
          )}
          {expandedSections.has('loto') && (
            <View style={styles.sectionContent}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 2 }]}>LOTO Required</Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    Lock Out / Tag Out must be completed before work begins
                  </Text>
                </View>
                <Switch
                  value={lotoRequired}
                  onValueChange={handleToggleLOTO}
                  trackColor={{ false: colors.border, true: '#EF4444' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {lotoRequired && (
                <>
                  <View style={[styles.lotoWarning, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                    <AlertTriangle size={18} color="#EF4444" />
                    <Text style={[styles.lotoWarningText, { color: '#B91C1C' }]}>
                      Work orders generated from this PM will require LOTO completion
                    </Text>
                  </View>

                  <View style={styles.lockColorsContainer}>
                    <Text style={[styles.subSectionTitle, { color: colors.text }]}>Lock Colors Reference</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lockColorsScroll}>
                      {LOCK_COLORS.map(lock => (
                        <View key={lock.id} style={styles.lockColorItem}>
                          <View style={[styles.lockColorDot, { backgroundColor: lock.hex, borderColor: lock.hex }]} />
                          <Text style={[styles.lockColorName, { color: colors.text }]}>{lock.name}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <Text style={[styles.subSectionTitle, { color: colors.text }]}>Lockout Steps ({lotoSteps.length})</Text>
                  {lotoSteps.map((step, index) => renderLOTOStepItem(step, index))}

                  <Pressable
                    style={[styles.addButton, { borderColor: '#EF4444', backgroundColor: '#EF444410' }]}
                    onPress={handleAddLOTOStep}
                  >
                    <Plus size={18} color="#EF4444" />
                    <Text style={[styles.addButtonText, { color: '#EF4444' }]}>Add LOTO Step</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        {/* Permits Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader(
            'Permits Required',
            'permits',
            <Shield size={18} color="#8B5CF6" />,
            selectedPermits.length,
            selectedPermits.length > 0 ? '#8B5CF6' : colors.textTertiary
          )}
          {expandedSections.has('permits') && (
            <View style={styles.sectionContent}>
              <Text style={[styles.switchHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Select permits that will be required when work orders are generated from this PM
              </Text>

              {selectedPermitData.length > 0 ? (
                <View style={styles.selectedPermits}>
                  {selectedPermitData.map(permit => (
                    <View
                      key={permit.id}
                      style={[styles.permitCard, { backgroundColor: permit.color + '15', borderColor: permit.color + '40' }]}
                    >
                      <View style={styles.permitHeader}>
                        <View style={[styles.permitCode, { backgroundColor: permit.color }]}>
                          <Text style={styles.permitCodeText}>{permit.id.toUpperCase().slice(0, 3)}</Text>
                        </View>
                        <Text style={[styles.permitName, { color: colors.text }]}>{permit.name}</Text>
                        <Pressable onPress={() => handleTogglePermit(permit.id)}>
                          <X size={18} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                      <Text style={[styles.permitDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {permit.description}
                      </Text>
                      <View style={styles.permitMeta}>
                        <Clock size={12} color={colors.textTertiary} />
                        <Text style={[styles.permitMetaText, { color: colors.textTertiary }]}>
                          {permit.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                  No permits required
                </Text>
              )}

              <Pressable
                style={[styles.addButton, { borderColor: '#8B5CF6', backgroundColor: '#8B5CF610' }]}
                onPress={() => setShowPermitModal(true)}
              >
                <Plus size={18} color="#8B5CF6" />
                <Text style={[styles.addButtonText, { color: '#8B5CF6' }]}>Add Permit</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* PPE Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader(
            'PPE Required',
            'ppe',
            <HardHat size={18} color="#F59E0B" />,
            selectedPPE.length,
            selectedPPE.length > 0 ? '#F59E0B' : colors.textTertiary
          )}
          {expandedSections.has('ppe') && (
            <View style={styles.sectionContent}>
              <Text style={[styles.switchHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                Select PPE that will be required when work orders are generated from this PM
              </Text>

              {selectedPPEData.length > 0 ? (
                <View style={styles.ppeGrid}>
                  {selectedPPEData.map(ppe => (
                    <View
                      key={ppe.id}
                      style={[styles.ppeItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    >
                      <HardHat size={20} color="#F59E0B" />
                      <Text style={[styles.ppeName, { color: colors.text }]} numberOfLines={2}>
                        {ppe.name}
                      </Text>
                      <Pressable style={styles.ppeRemove} onPress={() => handleTogglePPE(ppe.id)}>
                        <X size={14} color={colors.textTertiary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                  No PPE specified
                </Text>
              )}

              <Pressable
                style={[styles.addButton, { borderColor: '#F59E0B', backgroundColor: '#F59E0B10' }]}
                onPress={() => setShowPPEModal(true)}
              >
                <Plus size={18} color="#F59E0B" />
                <Text style={[styles.addButtonText, { color: '#F59E0B' }]}>Add PPE</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Tasks Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderSectionHeader(
            'Tasks',
            'tasks',
            <CheckCircle size={18} color="#10B981" />,
            tasks.length,
            tasks.length > 0 ? '#10B981' : colors.textTertiary
          )}
          {expandedSections.has('tasks') && (
            <View style={styles.sectionContent}>
              {tasks.length === 0 ? (
                <View style={styles.emptyTasks}>
                  <AlertTriangle size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyTasksText, { color: colors.textSecondary }]}>
                    No tasks added yet. Add at least one task.
                  </Text>
                </View>
              ) : (
                tasks.map((task, index) => renderTaskItem(task, index))
              )}

              <Pressable
                style={[styles.addButton, { borderColor: '#10B981', backgroundColor: '#10B98110' }]}
                onPress={handleAddTask}
              >
                <Plus size={18} color="#10B981" />
                <Text style={[styles.addButtonText, { color: '#10B981' }]}>Add Task</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.footerButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.footerButtonText, { color: colors.text }]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.footerButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Save size={18} color="#FFFFFF" />
          <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
            {isEditMode ? 'Save Changes' : 'Create PM'}
          </Text>
        </Pressable>
      </View>

      {/* Permit Selection Modal */}
      <Modal visible={showPermitModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Permits</Text>
            <Pressable onPress={() => setShowPermitModal(false)}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {PERMIT_TYPES.map(permit => {
              const isSelected = selectedPermits.includes(permit.id);
              return (
                <Pressable
                  key={permit.id}
                  style={[
                    styles.permitSelectItem,
                    {
                      backgroundColor: isSelected ? permit.color + '15' : colors.surface,
                      borderColor: isSelected ? permit.color : colors.border,
                    },
                  ]}
                  onPress={() => handleTogglePermit(permit.id)}
                >
                  <View style={[styles.permitCode, { backgroundColor: permit.color }]}>
                    <Text style={styles.permitCodeText}>{permit.id.toUpperCase().slice(0, 3)}</Text>
                  </View>
                  <View style={styles.permitSelectContent}>
                    <Text style={[styles.permitName, { color: colors.text }]}>{permit.name}</Text>
                    <Text style={[styles.permitDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {permit.description}
                    </Text>
                  </View>
                  {isSelected ? (
                    <CheckCircle size={24} color={permit.color} />
                  ) : (
                    <Circle size={24} color={colors.border} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* PPE Selection Modal */}
      <Modal visible={showPPEModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select PPE</Text>
            <Pressable onPress={() => setShowPPEModal(false)}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {PPE_CATEGORIES.map(category => {
              const categoryItems = PPE_ITEMS.filter(p => p.category === category.id);
              return (
                <View key={category.id} style={styles.ppeCategorySection}>
                  <Text style={[styles.ppeCategoryTitle, { color: colors.text }]}>{category.name}</Text>
                  {categoryItems.map(ppe => {
                    const isSelected = selectedPPE.includes(ppe.id);
                    return (
                      <Pressable
                        key={ppe.id}
                        style={[
                          styles.ppeSelectItem,
                          {
                            backgroundColor: isSelected ? '#F59E0B15' : colors.surface,
                            borderColor: isSelected ? '#F59E0B' : colors.border,
                          },
                        ]}
                        onPress={() => handleTogglePPE(ppe.id)}
                      >
                        <HardHat size={20} color={isSelected ? '#F59E0B' : colors.textSecondary} />
                        <View style={styles.ppeSelectContent}>
                          <Text style={[styles.ppeSelectName, { color: colors.text }]}>{ppe.name}</Text>
                          <Text style={[styles.ppeSelectDesc, { color: colors.textTertiary }]}>{ppe.category}</Text>
                        </View>
                        {isSelected ? (
                          <CheckCircle size={22} color="#F59E0B" />
                        ) : (
                          <Circle size={22} color={colors.border} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* LOTO Step Modal */}
      <Modal visible={showLOTOStepModal} animationType="slide" transparent>
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLOTOStepModal(false)}
        >
          <Pressable style={[styles.lotoModalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingLOTOStep ? 'Edit LOTO Step' : 'Add LOTO Step'}
              </Text>
              <Pressable onPress={() => setShowLOTOStepModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.lotoModalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Step Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter step description..."
                  placeholderTextColor={colors.textSecondary}
                  value={newLOTOStep.description}
                  onChangeText={(text) => setNewLOTOStep(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Energy Source</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.energySourceOptions}>
                    {ENERGY_SOURCES.map(source => (
                      <Pressable
                        key={source.id}
                        style={[
                          styles.energySourceOption,
                          { 
                            backgroundColor: newLOTOStep.energySource === source.id ? '#EF4444' : colors.backgroundSecondary,
                            borderColor: newLOTOStep.energySource === source.id ? '#EF4444' : colors.border,
                          },
                        ]}
                        onPress={() => setNewLOTOStep(prev => ({ 
                          ...prev, 
                          energySource: prev.energySource === source.id ? '' : source.id 
                        }))}
                      >
                        <Zap size={14} color={newLOTOStep.energySource === source.id ? '#FFFFFF' : colors.text} />
                        <Text style={[
                          styles.energySourceText,
                          { color: newLOTOStep.energySource === source.id ? '#FFFFFF' : colors.text },
                        ]}>
                          {source.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Lock Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.lockColorOptions}>
                    {LOCK_COLORS.map(lock => (
                      <Pressable
                        key={lock.id}
                        style={[
                          styles.lockColorOption,
                          { 
                            borderColor: newLOTOStep.lockColor === lock.id ? lock.hex : colors.border,
                            borderWidth: newLOTOStep.lockColor === lock.id ? 2 : 1,
                          },
                        ]}
                        onPress={() => setNewLOTOStep(prev => ({ 
                          ...prev, 
                          lockColor: prev.lockColor === lock.id ? '' : lock.id 
                        }))}
                      >
                        <View style={[styles.lockColorOptionDot, { backgroundColor: lock.hex, borderColor: lock.hex }]} />
                        <Text style={[styles.lockColorOptionText, { color: colors.text }]}>{lock.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Location</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Main Panel - Breaker #15"
                  placeholderTextColor={colors.textSecondary}
                  value={newLOTOStep.location}
                  onChangeText={(text) => setNewLOTOStep(prev => ({ ...prev, location: text }))}
                />
              </View>
            </ScrollView>

            <View style={styles.lotoModalActions}>
              <Pressable
                style={[styles.lotoModalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowLOTOStepModal(false)}
              >
                <Text style={[styles.lotoModalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.lotoModalButton, { backgroundColor: '#EF4444' }]}
                onPress={handleSaveLOTOStep}
              >
                <Text style={[styles.lotoModalButtonText, { color: '#FFFFFF' }]}>
                  {editingLOTOStep ? 'Save Changes' : 'Add Step'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  sectionContent: {
    padding: 14,
    paddingTop: 0,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerTextContainer: {
    flex: 1,
  },
  pickerMainText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  pickerSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerPlaceholder: {
    fontSize: 15,
  },
  pickerDropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 200,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  pickerOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputWithIconText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchHint: {
    fontSize: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emptyTasks: {
    alignItems: 'center' as const,
    paddingVertical: 30,
    gap: 10,
  },
  emptyTasksText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  taskItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  taskNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  deleteTaskButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  taskInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  lotoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  lotoWarningText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  lockColorsContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  lockColorsScroll: {
    marginTop: 8,
  },
  lockColorItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  lockColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 4,
  },
  lockColorName: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  lockColorDesc: {
    fontSize: 9,
    textAlign: 'center' as const,
  },
  lotoStep: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  lotoStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotoStepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    gap: 6,
    marginTop: 6,
  },
  lotoMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lotoMetaText: {
    fontSize: 11,
  },
  miniLockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lotoStepActions: {
    flexDirection: 'row',
    gap: 6,
  },
  lotoStepActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  selectedPermits: {
    gap: 10,
  },
  permitCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  permitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permitCode: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permitCodeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  permitName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  permitDesc: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  permitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  permitMetaText: {
    fontSize: 11,
  },
  approvalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  noItemsText: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
  ppeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ppeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  ppeName: {
    fontSize: 12,
    fontWeight: '500' as const,
    maxWidth: 100,
  },
  ppeRemove: {
    padding: 2,
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  permitSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  permitSelectContent: {
    flex: 1,
  },
  ppeCategorySection: {
    marginBottom: 20,
  },
  ppeCategoryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  ppeSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  ppeSelectContent: {
    flex: 1,
  },
  ppeSelectName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  ppeSelectDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  lotoModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  lotoModalBody: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  energySourceOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  energySourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  energySourceText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  lockColorOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  lockColorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: 'transparent',
  },
  lockColorOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  lockColorOptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  lotoModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
  },
  lotoModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  lotoModalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dayPresetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  schedulePreviewCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  schedulePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  schedulePreviewTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  schedulePreviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
