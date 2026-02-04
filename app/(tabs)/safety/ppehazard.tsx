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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileCheck,
  Plus,
  Calendar,
  User,
  X,
  Check,
  ChevronDown,
  History,
  Shield,
  AlertTriangle,
  Eye,
  Ear,
  Hand,
  Footprints,
  Wind,
  HardHat,
  Trash2,
  MapPin,
  Building2,
  ChevronRight,
  Zap,
  Flame,
  Droplets,
  Volume2,
  Radiation,
  Thermometer,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface HazardType {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  description: string;
  ppeRequired: string[];
}

const HAZARD_TYPES: HazardType[] = [
  {
    id: 'impact',
    name: 'Impact/Flying Particles',
    icon: Zap,
    color: '#3B82F6',
    description: 'Potential for objects striking eyes, face, or body',
    ppeRequired: ['Safety glasses', 'Face shield', 'Hard hat'],
  },
  {
    id: 'chemical',
    name: 'Chemical Exposure',
    icon: Droplets,
    color: '#8B5CF6',
    description: 'Contact with hazardous chemicals or substances',
    ppeRequired: ['Chemical goggles', 'Face shield', 'Chemical gloves', 'Apron'],
  },
  {
    id: 'noise',
    name: 'Noise Hazard',
    icon: Volume2,
    color: '#F59E0B',
    description: 'Exposure to high noise levels (>85 dBA)',
    ppeRequired: ['Ear plugs', 'Ear muffs'],
  },
  {
    id: 'respiratory',
    name: 'Respiratory Hazard',
    icon: Wind,
    color: '#EF4444',
    description: 'Airborne contaminants, dust, fumes, or vapors',
    ppeRequired: ['N95 respirator', 'Half-face respirator', 'Full-face respirator'],
  },
  {
    id: 'thermal',
    name: 'Thermal Hazard',
    icon: Thermometer,
    color: '#F97316',
    description: 'Extreme heat or cold exposure',
    ppeRequired: ['Insulated gloves', 'Heat-resistant clothing', 'Cold weather gear'],
  },
  {
    id: 'electrical',
    name: 'Electrical Hazard',
    icon: Zap,
    color: '#FBBF24',
    description: 'Potential for electrical shock or arc flash',
    ppeRequired: ['Insulated gloves', 'Arc flash suit', 'Dielectric footwear'],
  },
  {
    id: 'radiation',
    name: 'Radiation/UV',
    icon: Radiation,
    color: '#A855F7',
    description: 'Exposure to radiation or UV light',
    ppeRequired: ['Tinted safety glasses', 'Welding helmet', 'Lead apron'],
  },
  {
    id: 'falling',
    name: 'Fall Hazard',
    icon: AlertTriangle,
    color: '#DC2626',
    description: 'Working at heights or on elevated surfaces',
    ppeRequired: ['Hard hat', 'Fall protection harness', 'Safety lanyard'],
  },
  {
    id: 'cut',
    name: 'Cut/Laceration',
    icon: Hand,
    color: '#10B981',
    description: 'Sharp objects, blades, or cutting hazards',
    ppeRequired: ['Cut-resistant gloves', 'Arm guards', 'Steel-toe boots'],
  },
  {
    id: 'biological',
    name: 'Biological Hazard',
    icon: Flame,
    color: '#EC4899',
    description: 'Exposure to biological agents or bloodborne pathogens',
    ppeRequired: ['Nitrile gloves', 'Face mask', 'Gown', 'Face shield'],
  },
];



interface WorkArea {
  id: string;
  name: string;
  location: string;
  tasks: string;
}

interface IdentifiedHazard {
  id: string;
  hazardTypeId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ppeRequired: string[];
}

interface AssessmentFormData {
  assessmentDate: string;
  assessorName: string;
  assessorTitle: string;
  department: string;
  workArea: WorkArea;
  identifiedHazards: IdentifiedHazard[];
  additionalPPE: string;
  trainingRequired: string;
  reviewDate: string;
  notes: string;
}

interface AssessmentRecord {
  id: string;
  workAreaName: string;
  department: string;
  assessorName: string;
  assessmentDate: string;
  hazardCount: number;
  status: 'current' | 'due_review' | 'expired';
  createdAt: string;
}

const initialFormData: AssessmentFormData = {
  assessmentDate: new Date().toISOString().split('T')[0],
  assessorName: '',
  assessorTitle: '',
  department: '',
  workArea: { id: '', name: '', location: '', tasks: '' },
  identifiedHazards: [],
  additionalPPE: '',
  trainingRequired: '',
  reviewDate: '',
  notes: '',
};

export default function PPEHazardAssessmentScreen() {
  const { colors } = useTheme();
  useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<AssessmentFormData>(initialFormData);
  const [showHazardPicker, setShowHazardPicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [selectedHazardForSeverity, setSelectedHazardForSeverity] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRecord[]>([
    {
      id: '1',
      workAreaName: 'Production Line A',
      department: 'Manufacturing',
      assessorName: 'John Smith',
      assessmentDate: '2024-01-15',
      hazardCount: 5,
      status: 'current',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      workAreaName: 'Warehouse Loading Dock',
      department: 'Logistics',
      assessorName: 'Jane Doe',
      assessmentDate: '2023-12-01',
      hazardCount: 4,
      status: 'due_review',
      createdAt: '2023-12-01T08:00:00Z',
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const updateFormData = useCallback((key: keyof AssessmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateWorkArea = useCallback((key: keyof WorkArea, value: string) => {
    setFormData(prev => ({
      ...prev,
      workArea: { ...prev.workArea, [key]: value },
    }));
  }, []);

  const addHazard = useCallback((hazardType: HazardType) => {
    const newHazard: IdentifiedHazard = {
      id: Date.now().toString(),
      hazardTypeId: hazardType.id,
      severity: 'medium',
      description: '',
      ppeRequired: [...hazardType.ppeRequired],
    };
    setFormData(prev => ({
      ...prev,
      identifiedHazards: [...prev.identifiedHazards, newHazard],
    }));
    setShowHazardPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateHazard = useCallback((hazardId: string, key: keyof IdentifiedHazard, value: any) => {
    setFormData(prev => ({
      ...prev,
      identifiedHazards: prev.identifiedHazards.map(h =>
        h.id === hazardId ? { ...h, [key]: value } : h
      ),
    }));
  }, []);

  const removeHazard = useCallback((hazardId: string) => {
    Alert.alert(
      'Remove Hazard',
      'Are you sure you want to remove this hazard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              identifiedHazards: prev.identifiedHazards.filter(h => h.id !== hazardId),
            }));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, []);

  const canSubmit = formData.assessorName.trim().length > 0 &&
    formData.workArea.name.trim().length > 0 &&
    formData.identifiedHazards.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete:\n• Assessor Name\n• Work Area Name\n• At least one identified hazard');
      return;
    }

    Alert.alert(
      'Submit Assessment',
      'Submit this PPE hazard assessment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1500));

              const newRecord: AssessmentRecord = {
                id: Date.now().toString(),
                workAreaName: formData.workArea.name,
                department: formData.department,
                assessorName: formData.assessorName,
                assessmentDate: formData.assessmentDate,
                hazardCount: formData.identifiedHazards.length,
                status: 'current',
                createdAt: new Date().toISOString(),
              };

              setAssessmentHistory(prev => [newRecord, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'PPE Hazard Assessment submitted successfully.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[PPEHazard] Submit error:', error);
              Alert.alert('Error', 'Failed to submit assessment. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return '#10B981';
      case 'due_review': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
          <FileCheck size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>PPE Hazard Assessment</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          OSHA 29 CFR 1910.132(d) requires assessment of workplace hazards to determine appropriate PPE
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Assessment Information</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.assessmentDate}
              onChangeText={(text) => updateFormData('assessmentDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Review Date</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.reviewDate}
              onChangeText={(text) => updateFormData('reviewDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Assessor Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of person conducting assessment"
          placeholderTextColor={colors.textSecondary}
          value={formData.assessorName}
          onChangeText={(text) => updateFormData('assessorName', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Title/Position</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., Safety Manager"
            placeholderTextColor={colors.textSecondary}
            value={formData.assessorTitle}
            onChangeText={(text) => updateFormData('assessorTitle', text)}
          />
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., Manufacturing"
            placeholderTextColor={colors.textSecondary}
            value={formData.department}
            onChangeText={(text) => updateFormData('department', text)}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Work Area Details</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Work Area Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Building2 size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., Production Line A, Warehouse, Lab"
          placeholderTextColor={colors.textSecondary}
          value={formData.workArea.name}
          onChangeText={(text) => updateWorkArea('name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Specific Location</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MapPin size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Building, floor, room number"
          placeholderTextColor={colors.textSecondary}
          value={formData.workArea.location}
          onChangeText={(text) => updateWorkArea('location', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Tasks Performed</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the tasks and activities performed in this work area..."
        placeholderTextColor={colors.textSecondary}
        value={formData.workArea.tasks}
        onChangeText={(text) => updateWorkArea('tasks', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.hazardsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
          Identified Hazards ({formData.identifiedHazards.length})
        </Text>
        <Pressable
          style={[styles.addHazardBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowHazardPicker(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addHazardBtnText}>Add Hazard</Text>
        </Pressable>
      </View>

      {formData.identifiedHazards.length === 0 ? (
        <View style={[styles.emptyHazards, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AlertTriangle size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyHazardsText, { color: colors.textSecondary }]}>
            No hazards identified yet
          </Text>
          <Text style={[styles.emptyHazardsSubtext, { color: colors.textSecondary }]}>
            Tap Add Hazard to identify workplace hazards
          </Text>
        </View>
      ) : (
        <View style={styles.hazardsList}>
          {formData.identifiedHazards.map((hazard, index) => {
            const hazardType = HAZARD_TYPES.find(h => h.id === hazard.hazardTypeId);
            if (!hazardType) return null;
            const HazardIcon = hazardType.icon;

            return (
              <View
                key={hazard.id}
                style={[styles.hazardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.hazardCardHeader}>
                  <View style={[styles.hazardIcon, { backgroundColor: hazardType.color + '15' }]}>
                    <HazardIcon size={20} color={hazardType.color} />
                  </View>
                  <View style={styles.hazardTitleContainer}>
                    <Text style={[styles.hazardName, { color: colors.text }]}>{hazardType.name}</Text>
                    <Pressable
                      style={[styles.severityBadge, { backgroundColor: getSeverityColor(hazard.severity) + '20' }]}
                      onPress={() => {
                        setSelectedHazardForSeverity(hazard.id);
                        setShowSeverityPicker(true);
                      }}
                    >
                      <Text style={[styles.severityText, { color: getSeverityColor(hazard.severity) }]}>
                        {hazard.severity.toUpperCase()}
                      </Text>
                      <ChevronDown size={12} color={getSeverityColor(hazard.severity)} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeHazard(hazard.id)}>
                    <Trash2 size={18} color="#EF4444" />
                  </Pressable>
                </View>

                <Text style={[styles.hazardSubtitle, { color: colors.textSecondary }]}>
                  {hazardType.description}
                </Text>

                <TextInput
                  style={[styles.hazardDescInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Additional notes about this hazard..."
                  placeholderTextColor={colors.textSecondary}
                  value={hazard.description}
                  onChangeText={(text) => updateHazard(hazard.id, 'description', text)}
                  multiline
                />

                <Text style={[styles.ppeLabel, { color: colors.textSecondary }]}>Required PPE:</Text>
                <View style={styles.ppeChips}>
                  {hazard.ppeRequired.map((ppe, i) => (
                    <View key={i} style={[styles.ppeChip, { backgroundColor: hazardType.color + '15' }]}>
                      <Text style={[styles.ppeChipText, { color: hazardType.color }]}>{ppe}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Requirements</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Additional PPE Not Listed</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any other PPE required for this work area..."
        placeholderTextColor={colors.textSecondary}
        value={formData.additionalPPE}
        onChangeText={(text) => updateFormData('additionalPPE', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Training Required</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="List any training required for proper PPE use..."
        placeholderTextColor={colors.textSecondary}
        value={formData.trainingRequired}
        onChangeText={(text) => updateFormData('trainingRequired', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional notes or comments..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={() => setFormData(initialFormData)}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#3B82F6' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FileCheck size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Assessment</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {assessmentHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileCheck size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assessments</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Submit your first PPE hazard assessment to see it here
          </Text>
        </View>
      ) : (
        <>
          {assessmentHistory.map((record) => (
            <Pressable
              key={record.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedRecord(expandedRecord === record.id ? null : record.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: '#3B82F620' }]}>
                    <FileCheck size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.historyTitleContainer}>
                    <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                      {record.workAreaName}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(record.assessmentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                      {record.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: expandedRecord === record.id ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {record.assessorName}
                  </Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <AlertTriangle size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {record.hazardCount} hazards identified
                  </Text>
                </View>
              </View>

              {expandedRecord === record.id && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Department</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.department || 'N/A'}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Hazards Found</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.hazardCount}</Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </>
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#3B82F6' : colors.textSecondary }]}>
            New Assessment
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#3B82F6' : colors.textSecondary }]}>
            History ({assessmentHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal
        visible={showHazardPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHazardPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Hazard Type</Text>
              <Pressable onPress={() => setShowHazardPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {HAZARD_TYPES.map((hazard) => {
                const HazardIcon = hazard.icon;
                const isAdded = formData.identifiedHazards.some(h => h.hazardTypeId === hazard.id);
                return (
                  <Pressable
                    key={hazard.id}
                    style={[
                      styles.hazardOption,
                      { borderBottomColor: colors.border },
                      isAdded && { opacity: 0.5 },
                    ]}
                    onPress={() => !isAdded && addHazard(hazard)}
                    disabled={isAdded}
                  >
                    <View style={[styles.hazardOptionIcon, { backgroundColor: hazard.color + '20' }]}>
                      <HazardIcon size={20} color={hazard.color} />
                    </View>
                    <View style={styles.hazardOptionContent}>
                      <Text style={[styles.hazardOptionName, { color: colors.text }]}>{hazard.name}</Text>
                      <Text style={[styles.hazardOptionDesc, { color: colors.textSecondary }]}>{hazard.description}</Text>
                    </View>
                    {isAdded ? (
                      <Check size={18} color="#10B981" />
                    ) : (
                      <Plus size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSeverityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSeverityPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSeverityPicker(false)}>
          <View style={[styles.severityModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.severityModalTitle, { color: colors.text }]}>Select Severity</Text>
            {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
              <Pressable
                key={severity}
                style={[styles.severityOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (selectedHazardForSeverity) {
                    updateHazard(selectedHazardForSeverity, 'severity', severity);
                  }
                  setShowSeverityPicker(false);
                  setSelectedHazardForSeverity(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(severity) }]} />
                <Text style={[styles.severityOptionText, { color: colors.text }]}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
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
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  halfField: {
    flex: 1,
  },
  dateField: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputWithIcon: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  hazardsHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
    marginBottom: 12,
  },
  addHazardBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addHazardBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyHazards: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    marginBottom: 16,
  },
  emptyHazardsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  emptyHazardsSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  hazardsList: {
    gap: 12,
    marginBottom: 16,
  },
  hazardCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  hazardCardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  hazardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  hazardTitleContainer: {
    flex: 1,
  },
  hazardName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  severityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  hazardSubtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  hazardDescInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    minHeight: 50,
    textAlignVertical: 'top' as const,
    marginBottom: 10,
  },
  ppeLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  ppeChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  ppeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ppeChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row' as const,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    borderRadius: 16,
    padding: 48,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  historyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  historyHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  historyTitleContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
  },
  historyHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  historyMeta: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  historyMetaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  historyMetaText: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  expandedRow: {
    flexDirection: 'row' as const,
    gap: 20,
  },
  expandedItem: {
    flex: 1,
  },
  expandedLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  expandedValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalList: {
    padding: 8,
  },
  hazardOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderBottomWidth: 1,
  },
  hazardOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  hazardOptionContent: {
    flex: 1,
  },
  hazardOptionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  hazardOptionDesc: {
    fontSize: 12,
  },
  severityModal: {
    position: 'absolute' as const,
    top: '35%',
    left: 40,
    right: 40,
    borderRadius: 12,
    padding: 16,
  },
  severityModalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  severityOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 32,
  },
});
