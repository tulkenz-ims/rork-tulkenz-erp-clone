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
  ActivityIndicator,
} from 'react-native';
import {
  Target,
  Plus,
  X,
  Calendar,
  FileText,
  ChevronDown,
  Check,
  Search,
  ChevronRight,
  History,
  Send,
  Users,
  Settings,
  GitBranch,
  CheckCircle,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  useRootCauseAnalyses,
  useCreateRootCauseAnalysis,
  AnalysisMethod,
  ContributingCategory,
  ActionPriority,
} from '@/hooks/useRootCauseSafety';
import type { RootCauseFormData, ContributingFactor, CorrectiveAction } from '@/hooks/useRootCauseSafety';

const ANALYSIS_METHODS: { id: AnalysisMethod; name: string; description: string }[] = [
  { id: '5_whys', name: '5 Whys Analysis', description: 'Ask "why" repeatedly to find root cause' },
  { id: 'fishbone', name: 'Fishbone (Ishikawa)', description: 'Cause and effect diagram' },
  { id: 'fault_tree', name: 'Fault Tree Analysis', description: 'Top-down deductive analysis' },
  { id: 'pareto', name: 'Pareto Analysis', description: 'Focus on vital few causes' },
  { id: 'fmea', name: 'FMEA', description: 'Failure Mode and Effects Analysis' },
  { id: 'barrier', name: 'Barrier Analysis', description: 'Identify failed safeguards' },
  { id: 'taproot', name: 'TapRooT', description: 'Systematic investigation process' },
  { id: 'other', name: 'Other Method', description: 'Custom analysis approach' },
];

const CONTRIBUTING_CATEGORIES: { id: ContributingCategory; name: string; icon: string; color: string }[] = [
  { id: 'people', name: 'People/Human Factors', icon: '👥', color: '#3B82F6' },
  { id: 'process', name: 'Process/Procedures', icon: '📋', color: '#8B5CF6' },
  { id: 'equipment', name: 'Equipment/Tools', icon: '🔧', color: '#F59E0B' },
  { id: 'materials', name: 'Materials/Supplies', icon: '📦', color: '#10B981' },
  { id: 'environment', name: 'Environment/Conditions', icon: '🌡️', color: '#06B6D4' },
  { id: 'management', name: 'Management Systems', icon: '🏢', color: '#EC4899' },
];

const ACTION_PRIORITIES: { id: ActionPriority; name: string; color: string }[] = [
  { id: 'critical', name: 'Critical', color: '#EF4444' },
  { id: 'high', name: 'High', color: '#F59E0B' },
  { id: 'medium', name: 'Medium', color: '#3B82F6' },
  { id: 'low', name: 'Low', color: '#10B981' },
];

const INCIDENT_TYPES = [
  'Workplace Injury', 'Near Miss', 'Property Damage', 'Equipment Failure',
  'Process Deviation', 'Quality Issue', 'Environmental', 'Security', 'Other'
];

const initialFormData: RootCauseFormData = {
  incident_reference: '',
  incident_date: new Date().toISOString().split('T')[0],
  incident_type: '',
  problem_statement: '',
  analysis_method: '',
  analysis_team: '',
  contributing_factors: [],
  five_whys: ['', '', '', '', ''],
  root_causes: '',
  corrective_actions: [],
  preventive_actions: '',
  verification_method: '',
  verification_date: '',
  lessons_learned: '',
};

export default function RootCauseSafetyScreen() {
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<RootCauseFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showIncidentTypePicker, setShowIncidentTypePicker] = useState(false);
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const [newFactor, setNewFactor] = useState({ category: '' as ContributingCategory | '', description: '', is_root_cause: false });
  const [newAction, setNewAction] = useState({ description: '', responsible_party: '', due_date: '', priority: '' as ActionPriority | '' });

  const { data: analyses = [], isLoading, refetch } = useRootCauseAnalyses();
  const createMutation = useCreateRootCauseAnalysis();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof RootCauseFormData, value: RootCauseFormData[keyof RootCauseFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateWhyAtIndex = useCallback((index: number, value: string) => {
    setFormData(prev => {
      const newWhys = [...prev.five_whys];
      newWhys[index] = value;
      return { ...prev, five_whys: newWhys };
    });
  }, []);

  const addContributingFactor = useCallback(() => {
    if (!newFactor.category || !newFactor.description.trim()) {
      Alert.alert('Missing Information', 'Please select a category and provide a description.');
      return;
    }
    const factor: ContributingFactor = {
      id: `cf_${Date.now()}`,
      category: newFactor.category,
      description: newFactor.description.trim(),
      is_root_cause: newFactor.is_root_cause,
    };
    setFormData(prev => ({
      ...prev,
      contributing_factors: [...prev.contributing_factors, factor],
    }));
    setNewFactor({ category: '', description: '', is_root_cause: false });
    setShowFactorModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newFactor]);

  const removeContributingFactor = useCallback((factorId: string) => {
    setFormData(prev => ({
      ...prev,
      contributing_factors: prev.contributing_factors.filter(f => f.id !== factorId),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const addCorrectiveAction = useCallback(() => {
    if (!newAction.description.trim() || !newAction.responsible_party.trim() || !newAction.priority) {
      Alert.alert('Missing Information', 'Please fill in all required action fields.');
      return;
    }
    const action: CorrectiveAction = {
      id: `ca_${Date.now()}`,
      description: newAction.description.trim(),
      responsible_party: newAction.responsible_party.trim(),
      due_date: newAction.due_date || '',
      priority: newAction.priority,
      status: 'pending',
    };
    setFormData(prev => ({
      ...prev,
      corrective_actions: [...prev.corrective_actions, action],
    }));
    setNewAction({ description: '', responsible_party: '', due_date: '', priority: '' });
    setShowActionModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newAction]);

  const removeCorrectiveAction = useCallback((actionId: string) => {
    setFormData(prev => ({
      ...prev,
      corrective_actions: prev.corrective_actions.filter(a => a.id !== actionId),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(analysis => {
      const matchesSearch = !searchQuery ||
        analysis.analysis_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.incident_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.problem_statement.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [analyses, searchQuery]);

  const canSubmit = formData.incident_reference.trim().length > 0 &&
    formData.incident_type &&
    formData.problem_statement.trim().length > 10 &&
    formData.analysis_method &&
    formData.contributing_factors.length > 0 &&
    formData.root_causes.trim().length > 5 &&
    formData.corrective_actions.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields including at least one contributing factor and corrective action.');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      'This Root Cause Analysis will be submitted for management approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync(formData);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Root Cause Analysis submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[RootCauseAnalysis] Submit error:', error);
              Alert.alert('Error', 'Failed to submit analysis. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, createMutation]);

  const resetForm = useCallback(() => {
    Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'closed': return '#6B7280';
      case 'pending_approval': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#6366F120' }]}>
          <Target size={32} color="#6366F1" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Root Cause Analysis</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Systematic analysis to identify fundamental causes of incidents
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#6366F120', borderColor: '#6366F140' }]}>
        <GitBranch size={18} color="#6366F1" />
        <Text style={[styles.infoText, { color: '#6366F1' }]}>
          A thorough root cause analysis prevents recurrence by addressing underlying issues, not just symptoms.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Information *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Reference # *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FileText size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="INC-XXXX-XXXX or description"
          placeholderTextColor={colors.textSecondary}
          value={formData.incident_reference}
          onChangeText={(text) => updateFormData('incident_reference', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.incident_date}
              onChangeText={(text) => updateFormData('incident_date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Incident Type *</Text>
          <Pressable
            style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowIncidentTypePicker(true)}
          >
            <Text style={[styles.selectorText, { color: formData.incident_type ? colors.text : colors.textSecondary }]} numberOfLines={1}>
              {formData.incident_type || 'Select type'}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Problem Statement *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Clearly describe what happened, when, where, and the impact..."
        placeholderTextColor={colors.textSecondary}
        value={formData.problem_statement}
        onChangeText={(text) => updateFormData('problem_statement', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Analysis Details *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Analysis Method *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowMethodPicker(true)}
      >
        <Settings size={18} color={formData.analysis_method ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.analysis_method ? colors.text : colors.textSecondary, flex: 1 }]}>
          {formData.analysis_method 
            ? ANALYSIS_METHODS.find(m => m.id === formData.analysis_method)?.name
            : 'Select analysis method'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Analysis Team (comma-separated)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Safety Manager, Supervisor, Operator..."
        placeholderTextColor={colors.textSecondary}
        value={formData.analysis_team}
        onChangeText={(text) => updateFormData('analysis_team', text)}
      />

      {formData.analysis_method === '5_whys' && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5 Whys Analysis</Text>
          <View style={[styles.whysContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {formData.five_whys.map((why, index) => (
              <View key={index} style={styles.whyRow}>
                <View style={[styles.whyNumber, { backgroundColor: '#6366F120' }]}>
                  <Text style={[styles.whyNumberText, { color: '#6366F1' }]}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.whyInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder={index === 0 ? "Why did this happen?" : "Why?"}
                  placeholderTextColor={colors.textSecondary}
                  value={why}
                  onChangeText={(text) => updateWhyAtIndex(index, text)}
                />
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributing Factors *</Text>
      
      <View style={styles.factorsContainer}>
        {formData.contributing_factors.map((factor) => {
          const category = CONTRIBUTING_CATEGORIES.find(c => c.id === factor.category);
          return (
            <View key={factor.id} style={[styles.factorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.factorHeader}>
                <View style={[styles.factorCategoryBadge, { backgroundColor: category?.color + '20' }]}>
                  <Text style={styles.factorCategoryIcon}>{category?.icon}</Text>
                  <Text style={[styles.factorCategoryText, { color: category?.color }]}>{category?.name}</Text>
                </View>
                {factor.is_root_cause && (
                  <View style={[styles.rootCauseBadge, { backgroundColor: '#EF444420' }]}>
                    <Text style={[styles.rootCauseText, { color: '#EF4444' }]}>Root Cause</Text>
                  </View>
                )}
                <Pressable onPress={() => removeContributingFactor(factor.id)} style={styles.removeButton}>
                  <X size={16} color="#EF4444" />
                </Pressable>
              </View>
              <Text style={[styles.factorDescription, { color: colors.text }]}>{factor.description}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => setShowFactorModal(true)}
      >
        <Plus size={18} color={colors.primary} />
        <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Contributing Factor</Text>
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Root Causes Identified * (one per line)</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="List the fundamental root causes identified..."
        placeholderTextColor={colors.textSecondary}
        value={formData.root_causes}
        onChangeText={(text) => updateFormData('root_causes', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Corrective Actions *</Text>

      <View style={styles.actionsContainer}>
        {formData.corrective_actions.map((action) => {
          const priority = ACTION_PRIORITIES.find(p => p.id === action.priority);
          return (
            <View key={action.id} style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.actionHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: priority?.color + '20' }]}>
                  <Text style={[styles.priorityText, { color: priority?.color }]}>{priority?.name}</Text>
                </View>
                <Pressable onPress={() => removeCorrectiveAction(action.id)} style={styles.removeButton}>
                  <X size={16} color="#EF4444" />
                </Pressable>
              </View>
              <Text style={[styles.actionDescription, { color: colors.text }]}>{action.description}</Text>
              <View style={styles.actionMeta}>
                <View style={styles.actionMetaItem}>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={[styles.actionMetaText, { color: colors.textSecondary }]}>{action.responsible_party}</Text>
                </View>
                {action.due_date && (
                  <View style={styles.actionMetaItem}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={[styles.actionMetaText, { color: colors.textSecondary }]}>{action.due_date}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => setShowActionModal(true)}
      >
        <Plus size={18} color={colors.primary} />
        <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Corrective Action</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Prevention & Verification</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Preventive Actions (one per line)</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Actions to prevent similar incidents in the future..."
        placeholderTextColor={colors.textSecondary}
        value={formData.preventive_actions}
        onChangeText={(text) => updateFormData('preventive_actions', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Method</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="How will effectiveness of corrective actions be verified?"
        placeholderTextColor={colors.textSecondary}
        value={formData.verification_method}
        onChangeText={(text) => updateFormData('verification_method', text)}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Target Date</Text>
      <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Calendar size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={formData.verification_date}
          onChangeText={(text) => updateFormData('verification_date', text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Lessons Learned</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Key takeaways and lessons for the organization..."
        placeholderTextColor={colors.textSecondary}
        value={formData.lessons_learned}
        onChangeText={(text) => updateFormData('lessons_learned', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Clear Form</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: canSubmit ? '#6366F1' : colors.border }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending || !canSubmit}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Submit for Approval</Text>
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
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search analyses..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading && analyses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredAnalyses.length === 0 ? (
        <View style={styles.emptyState}>
          <Target size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Analyses Found</Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {searchQuery ? 'Try adjusting your search' : 'Create your first root cause analysis'}
          </Text>
        </View>
      ) : (
        filteredAnalyses.map((analysis) => {
          const isExpanded = expandedAnalysis === analysis.id;
          return (
            <Pressable
              key={analysis.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedAnalysis(isExpanded ? null : analysis.id);
              }}
            >
              <View style={styles.historyCardHeader}>
                <View style={styles.historyCardLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: '#6366F120' }]}>
                    <Target size={20} color="#6366F1" />
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{analysis.analysis_number}</Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{analysis.date}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(analysis.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(analysis.status) }]}>
                    {analysis.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.historyIncident, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                {analysis.problem_statement}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <FileText size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{analysis.incident_reference}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <Settings size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {ANALYSIS_METHODS.find(m => m.id === analysis.analysis_method)?.name}
                  </Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  
                  <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Root Causes:</Text>
                  {analysis.root_causes.map((cause, idx) => (
                    <View key={idx} style={styles.rootCauseItem}>
                      <ArrowRight size={14} color="#EF4444" />
                      <Text style={[styles.rootCauseItemText, { color: colors.text }]}>{cause}</Text>
                    </View>
                  ))}

                  <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 12 }]}>Corrective Actions:</Text>
                  {analysis.corrective_actions.map((action, idx) => (
                    <View key={idx} style={styles.actionItem}>
                      <CheckCircle size={14} color={action.status === 'completed' ? '#10B981' : '#F59E0B'} />
                      <Text style={[styles.actionItemText, { color: colors.text }]}>{action.description}</Text>
                    </View>
                  ))}

                  {analysis.lessons_learned && (
                    <>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary, marginTop: 12 }]}>Lessons Learned:</Text>
                      <Text style={[styles.lessonsText, { color: colors.text }]}>{analysis.lessons_learned}</Text>
                    </>
                  )}
                </View>
              )}

              <View style={styles.expandIndicator}>
                <ChevronRight 
                  size={18} 
                  color={colors.textSecondary} 
                  style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} 
                />
              </View>
            </Pressable>
          );
        })
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#6366F1', borderBottomWidth: 2 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('new'); }}
        >
          <Plus size={18} color={activeTab === 'new' ? '#6366F1' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#6366F1' : colors.textSecondary }]}>New Analysis</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#6366F1', borderBottomWidth: 2 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('history'); }}
        >
          <History size={18} color={activeTab === 'history' ? '#6366F1' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#6366F1' : colors.textSecondary }]}>History</Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal visible={showMethodPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Analysis Method</Text>
              <Pressable onPress={() => setShowMethodPicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {ANALYSIS_METHODS.map((method) => (
                <Pressable
                  key={method.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    updateFormData('analysis_method', method.id);
                    setShowMethodPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>{method.name}</Text>
                    <Text style={[styles.modalOptionDesc, { color: colors.textSecondary }]}>{method.description}</Text>
                  </View>
                  {formData.analysis_method === method.id && <Check size={20} color="#6366F1" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showIncidentTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Incident Type</Text>
              <Pressable onPress={() => setShowIncidentTypePicker(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {INCIDENT_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    updateFormData('incident_type', type);
                    setShowIncidentTypePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{type}</Text>
                  {formData.incident_type === type && <Check size={20} color="#6366F1" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFactorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Contributing Factor</Text>
              <Pressable onPress={() => setShowFactorModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category *</Text>
              <View style={styles.categoryGrid}>
                {CONTRIBUTING_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      { borderColor: newFactor.category === cat.id ? cat.color : colors.border },
                      newFactor.category === cat.id && { backgroundColor: cat.color + '20' }
                    ]}
                    onPress={() => setNewFactor(prev => ({ ...prev, category: cat.id }))}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryName, { color: newFactor.category === cat.id ? cat.color : colors.text }]}>{cat.name}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Describe this contributing factor..."
                placeholderTextColor={colors.textSecondary}
                value={newFactor.description}
                onChangeText={(text) => setNewFactor(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />

              <Pressable
                style={[styles.toggleOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setNewFactor(prev => ({ ...prev, is_root_cause: !prev.is_root_cause }))}
              >
                <View style={[styles.checkbox, { borderColor: newFactor.is_root_cause ? '#EF4444' : colors.border, backgroundColor: newFactor.is_root_cause ? '#EF4444' : 'transparent' }]}>
                  {newFactor.is_root_cause && <Check size={14} color="#fff" />}
                </View>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>This is a Root Cause</Text>
              </Pressable>

              <Pressable
                style={[styles.modalSubmitButton, { backgroundColor: '#6366F1' }]}
                onPress={addContributingFactor}
              >
                <Text style={styles.modalSubmitText}>Add Factor</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showActionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Corrective Action</Text>
              <Pressable onPress={() => setShowActionModal(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textSecondary }]}>Action Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Describe the corrective action..."
                placeholderTextColor={colors.textSecondary}
                value={newAction.description}
                onChangeText={(text) => setNewAction(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Responsible Party *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Name or role"
                placeholderTextColor={colors.textSecondary}
                value={newAction.responsible_party}
                onChangeText={(text) => setNewAction(prev => ({ ...prev, responsible_party: text }))}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Due Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={newAction.due_date}
                onChangeText={(text) => setNewAction(prev => ({ ...prev, due_date: text }))}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Priority *</Text>
              <View style={styles.priorityGrid}>
                {ACTION_PRIORITIES.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.priorityOption,
                      { borderColor: newAction.priority === p.id ? p.color : colors.border },
                      newAction.priority === p.id && { backgroundColor: p.color + '20' }
                    ]}
                    onPress={() => setNewAction(prev => ({ ...prev, priority: p.id }))}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.priorityName, { color: newAction.priority === p.id ? p.color : colors.text }]}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.modalSubmitButton, { backgroundColor: '#6366F1' }]}
                onPress={addCorrectiveAction}
              >
                <Text style={styles.modalSubmitText}>Add Action</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabContainer: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, gap: 8 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' as const, borderWidth: 1 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  infoCard: { flexDirection: 'row' as const, padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, gap: 12, alignItems: 'flex-start' as const },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, marginTop: 8, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 4 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 48, gap: 8, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  selectorText: { fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  inputField: { flex: 1, fontSize: 15, height: '100%' },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, textAlignVertical: 'top' as const, minHeight: 90 },
  whysContainer: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  whyRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10, gap: 10 },
  whyNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  whyNumberText: { fontSize: 14, fontWeight: '700' as const },
  whyInput: { flex: 1, fontSize: 14, borderBottomWidth: 1, paddingVertical: 8 },
  factorsContainer: { marginBottom: 12 },
  factorCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  factorHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 8, gap: 8 },
  factorCategoryBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  factorCategoryIcon: { fontSize: 14 },
  factorCategoryText: { fontSize: 11, fontWeight: '600' as const },
  rootCauseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rootCauseText: { fontSize: 10, fontWeight: '700' as const },
  removeButton: { marginLeft: 'auto' as const, padding: 4 },
  factorDescription: { fontSize: 14, lineHeight: 20 },
  actionsContainer: { marginBottom: 12 },
  actionCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  actionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  priorityText: { fontSize: 11, fontWeight: '700' as const },
  actionDescription: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  actionMeta: { flexDirection: 'row' as const, gap: 16 },
  actionMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  actionMetaText: { fontSize: 12 },
  addButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed' as const, paddingVertical: 14, marginBottom: 16, gap: 8 },
  addButtonText: { fontSize: 14, fontWeight: '600' as const },
  buttonRow: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  secondaryButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' as const },
  primaryButton: { flex: 2, height: 50, borderRadius: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { alignItems: 'center' as const, padding: 40 },
  emptyStateTitle: { fontSize: 17, fontWeight: '600' as const, marginTop: 16 },
  emptyStateText: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  historyCardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  historyCardLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  historyNumber: { fontSize: 15, fontWeight: '700' as const },
  historyDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' as const },
  historyIncident: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  expandedLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, marginBottom: 8 },
  rootCauseItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, marginBottom: 6 },
  rootCauseItemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actionItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, marginBottom: 6 },
  actionItemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  lessonsText: { fontSize: 14, lineHeight: 20 },
  expandIndicator: { alignItems: 'center' as const, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  modalScroll: { padding: 16 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionContent: { flex: 1 },
  modalOptionText: { fontSize: 15, fontWeight: '500' as const },
  modalOptionDesc: { fontSize: 12, marginTop: 2 },
  categoryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  categoryOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, gap: 6 },
  categoryIcon: { fontSize: 16 },
  categoryName: { fontSize: 12, fontWeight: '500' as const },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 16, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleTitle: { fontSize: 15, fontWeight: '500' as const },
  modalSubmitButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' as const, marginTop: 8, marginBottom: 16 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  priorityGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  priorityOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, gap: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityName: { fontSize: 13, fontWeight: '500' as const },
});
