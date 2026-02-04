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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileSpreadsheet,
  Plus,
  X,
  Calendar,
  User,
  FileText,
  ChevronDown,
  Check,
  Search,
  AlertTriangle,
  History,
  Send,
  Building2,
  Clock,
  Briefcase,
  Activity,
  Hash,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import {
  useOSHA300Entries,
  useCreateOSHA300Entry,
  type OSHA300Entry,
  type OSHA300InjuryType,
  type OutcomeType,
} from '@/hooks/useSafetyOSHA';

const INJURY_TYPES: { id: OSHA300InjuryType; name: string; column: string }[] = [
  { id: 'injury', name: 'Injury', column: 'M' },
  { id: 'skin_disorder', name: 'Skin Disorder', column: 'N' },
  { id: 'respiratory', name: 'Respiratory Condition', column: 'O' },
  { id: 'poisoning', name: 'Poisoning', column: 'P' },
  { id: 'hearing_loss', name: 'Hearing Loss', column: 'Q' },
  { id: 'other_illness', name: 'All Other Illnesses', column: 'R' },
];

const OUTCOME_TYPES: { id: OutcomeType; name: string; description: string }[] = [
  { id: 'death', name: 'Death', description: 'Employee died from work-related injury/illness' },
  { id: 'days_away', name: 'Days Away From Work', description: 'Employee missed work days' },
  { id: 'job_transfer', name: 'Job Transfer or Restriction', description: 'Employee transferred or had restrictions' },
  { id: 'other_recordable', name: 'Other Recordable Cases', description: 'Medical treatment beyond first aid' },
];

const JOB_TITLES = [
  'Machine Operator', 'Forklift Operator', 'Production Worker', 'Maintenance Technician',
  'Warehouse Associate', 'Quality Inspector', 'Sanitation Worker', 'Line Lead',
  'Shipping Clerk', 'Receiving Clerk', 'Lab Technician', 'Office Staff', 'Supervisor', 'Other'
];

interface FormData {
  employee_name: string;
  job_title: string;
  date_of_injury: string;
  where_occurred: string;
  description: string;
  classify_case: OSHA300InjuryType | '';
  outcome: OutcomeType | '';
  death: boolean;
  days_away_from_work: string;
  days_job_transfer: string;
}

const initialFormData: FormData = {
  employee_name: '',
  job_title: '',
  date_of_injury: new Date().toISOString().split('T')[0],
  where_occurred: '',
  description: '',
  classify_case: '',
  outcome: '',
  death: false,
  days_away_from_work: '0',
  days_job_transfer: '0',
};

export default function OSHA300Screen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'new' | 'log'>('new');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [showJobTitlePicker, setShowJobTitlePicker] = useState(false);
  const [showInjuryTypePicker, setShowInjuryTypePicker] = useState(false);
  const [showOutcomePicker, setShowOutcomePicker] = useState(false);

  const { data: allEntries = [], isLoading, refetch } = useOSHA300Entries();
  const createMutation = useCreateOSHA300Entry();

  const entries = useMemo(() => {
    return allEntries.filter(e => e.year === selectedYear);
  }, [allEntries, selectedYear]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery ||
        entry.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => parseInt(a.case_number) - parseInt(b.case_number));
  }, [entries, searchQuery]);

  const logSummary = useMemo(() => {
    return {
      totalCases: entries.length,
      deaths: entries.filter(e => e.death).length,
      daysAway: entries.reduce((sum, e) => sum + e.days_away_from_work, 0),
      daysTransfer: entries.reduce((sum, e) => sum + e.days_job_transfer, 0),
      injuries: entries.filter(e => e.injury).length,
      skinDisorders: entries.filter(e => e.skin_disorder).length,
      respiratory: entries.filter(e => e.respiratory).length,
      poisoning: entries.filter(e => e.poisoning).length,
      hearingLoss: entries.filter(e => e.hearing_loss).length,
      otherIllness: entries.filter(e => e.other_illness).length,
    };
  }, [entries]);

  const canSubmit = formData.employee_name.trim().length > 0 &&
    formData.job_title &&
    formData.date_of_injury &&
    formData.where_occurred.trim().length > 0 &&
    formData.description.trim().length > 10 &&
    formData.classify_case &&
    formData.outcome;

  const generateCaseNumber = useCallback(() => {
    const yearEntries = allEntries.filter(e => e.year === new Date().getFullYear());
    return (yearEntries.length + 1).toString();
  }, [allEntries]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Add to OSHA 300 Log',
      'This entry will be added to the OSHA 300 Log and submitted for approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync({
                case_number: generateCaseNumber(),
                employee_name: formData.employee_name,
                job_title: formData.job_title,
                date_of_injury: formData.date_of_injury,
                where_occurred: formData.where_occurred,
                description: formData.description,
                classify_case: formData.classify_case as OSHA300InjuryType,
                outcome: formData.outcome as OutcomeType,
                death: formData.outcome === 'death',
                days_away_from_work: parseInt(formData.days_away_from_work) || 0,
                days_job_transfer: parseInt(formData.days_job_transfer) || 0,
                injury: formData.classify_case === 'injury',
                skin_disorder: formData.classify_case === 'skin_disorder',
                respiratory: formData.classify_case === 'respiratory',
                poisoning: formData.classify_case === 'poisoning',
                hearing_loss: formData.classify_case === 'hearing_loss',
                other_illness: formData.classify_case === 'other_illness',
                status: 'pending_approval',
                entered_by: user?.email || 'Unknown',
                entered_by_id: user?.id || '',
                submitted_at: new Date().toISOString(),
                approved_by: null,
                approved_at: null,
                year: new Date().getFullYear(),
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Entry added to OSHA 300 Log.');
              setFormData(initialFormData);
              setActiveTab('log');
            } catch (error) {
              console.error('[OSHA300] Submit error:', error);
              Alert.alert('Error', 'Failed to add entry. Please try again.');
            }
          },
        },
      ]
    );
  }, [canSubmit, formData, user, generateCaseNumber, createMutation]);

  const resetForm = useCallback(() => {
    Alert.alert('Clear Form', 'Are you sure you want to clear all entries?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setFormData(initialFormData) },
    ]);
  }, []);

  const getOutcomeColor = (outcome: OutcomeType) => {
    switch (outcome) {
      case 'death': return '#7F1D1D';
      case 'days_away': return '#EF4444';
      case 'job_transfer': return '#F59E0B';
      case 'other_recordable': return '#3B82F6';
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
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
          <FileSpreadsheet size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>OSHA 300 Log Entry</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Log of Work-Related Injuries and Illnesses
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#3B82F620', borderColor: '#3B82F640' }]}>
        <AlertTriangle size={18} color="#3B82F6" />
        <Text style={[styles.infoText, { color: '#3B82F6' }]}>
          Record all work-related injuries and illnesses that meet OSHA recording criteria. Entries must be made within 7 calendar days of learning about a case.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of injured/ill employee"
          placeholderTextColor={colors.textSecondary}
          value={formData.employee_name}
          onChangeText={(text) => updateFormData('employee_name', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Job Title *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowJobTitlePicker(true)}
      >
        <Briefcase size={18} color={formData.job_title ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.job_title ? colors.text : colors.textSecondary }]}>
          {formData.job_title || 'Select job title'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Details</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Injury/Illness *</Text>
      <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Calendar size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={formData.date_of_injury}
          onChangeText={(text) => updateFormData('date_of_injury', text)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Where Event Occurred *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Building2 size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="e.g., Production Floor - Line 3"
          placeholderTextColor={colors.textSecondary}
          value={formData.where_occurred}
          onChangeText={(text) => updateFormData('where_occurred', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description of Injury/Illness *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the injury or illness, parts of body affected, and object/substance that directly injured or made person ill..."
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Classification</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Classify the Case *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowInjuryTypePicker(true)}
      >
        <Activity size={18} color={formData.classify_case ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.classify_case ? colors.text : colors.textSecondary }]}>
          {formData.classify_case 
            ? INJURY_TYPES.find(t => t.id === formData.classify_case)?.name
            : 'Select classification'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Outcome *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowOutcomePicker(true)}
      >
        <FileText size={18} color={formData.outcome ? getOutcomeColor(formData.outcome as OutcomeType) : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.outcome ? colors.text : colors.textSecondary }]}>
          {formData.outcome 
            ? OUTCOME_TYPES.find(o => o.id === formData.outcome)?.name
            : 'Select outcome'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.outcome === 'death' && (
        <View style={[styles.alertBanner, { backgroundColor: '#7F1D1D20', borderColor: '#7F1D1D40' }]}>
          <AlertTriangle size={20} color="#7F1D1D" />
          <Text style={[styles.alertText, { color: '#7F1D1D' }]}>
            Work-related fatalities must be reported to OSHA within 8 hours.
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Days Away / Restriction</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Days Away From Work</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={formData.days_away_from_work}
              onChangeText={(text) => updateFormData('days_away_from_work', text)}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Days Job Transfer/Restriction</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={formData.days_job_transfer}
              onChangeText={(text) => updateFormData('days_job_transfer', text)}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#3B82F6' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Add to Log</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderLogTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.yearSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable 
          onPress={() => setSelectedYear(prev => prev - 1)}
          style={styles.yearButton}
        >
          <Text style={[styles.yearButtonText, { color: colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[styles.yearText, { color: colors.text }]}>Year {selectedYear}</Text>
        <Pressable 
          onPress={() => setSelectedYear(prev => Math.min(prev + 1, new Date().getFullYear()))}
          style={styles.yearButton}
        >
          <Text style={[styles.yearButtonText, { color: colors.primary }]}>→</Text>
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search log entries..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>OSHA 300 Log Summary - {selectedYear}</Text>
        
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { backgroundColor: '#3B82F615' }]}>
            <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{logSummary.totalCases}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Cases</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#7F1D1D15' }]}>
            <Text style={[styles.summaryValue, { color: '#7F1D1D' }]}>{logSummary.deaths}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Deaths</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#EF444415' }]}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{logSummary.daysAway}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Days Away</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#F59E0B15' }]}>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{logSummary.daysTransfer}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Days Transfer</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.classificationTitle, { color: colors.textSecondary }]}>By Classification</Text>
        <View style={styles.classificationGrid}>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.injuries}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Injuries</Text>
          </View>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.skinDisorders}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Skin</Text>
          </View>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.respiratory}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Resp.</Text>
          </View>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.poisoning}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Poison</Text>
          </View>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.hearingLoss}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Hearing</Text>
          </View>
          <View style={styles.classificationItem}>
            <Text style={[styles.classificationValue, { color: colors.text }]}>{logSummary.otherIllness}</Text>
            <Text style={[styles.classificationLabel, { color: colors.textSecondary }]}>Other</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Entries</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FileSpreadsheet size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Entries for {selectedYear}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            OSHA 300 log entries will appear here
          </Text>
        </View>
      ) : (
        filteredEntries.map(entry => (
          <View
            key={entry.id}
            style={[styles.logEntry, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.logEntryHeader}>
              <View style={[styles.caseNumberBadge, { backgroundColor: '#3B82F620' }]}>
                <Hash size={12} color="#3B82F6" />
                <Text style={[styles.caseNumber, { color: '#3B82F6' }]}>{entry.case_number}</Text>
              </View>
              <View style={[styles.outcomeBadge, { backgroundColor: getOutcomeColor(entry.outcome) + '20' }]}>
                <Text style={[styles.outcomeText, { color: getOutcomeColor(entry.outcome) }]}>
                  {OUTCOME_TYPES.find(o => o.id === entry.outcome)?.name}
                </Text>
              </View>
            </View>

            <Text style={[styles.logEmployeeName, { color: colors.text }]}>{entry.employee_name}</Text>
            <Text style={[styles.logJobTitle, { color: colors.textSecondary }]}>{entry.job_title}</Text>

            <Text style={[styles.logDescription, { color: colors.text }]}>{entry.description}</Text>

            <View style={styles.logMeta}>
              <View style={styles.logMetaItem}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.logMetaText, { color: colors.textSecondary }]}>{entry.date_of_injury}</Text>
              </View>
              <View style={styles.logMetaItem}>
                <Building2 size={14} color={colors.textSecondary} />
                <Text style={[styles.logMetaText, { color: colors.textSecondary }]}>{entry.where_occurred}</Text>
              </View>
            </View>

            <View style={styles.logStats}>
              {entry.days_away_from_work > 0 && (
                <View style={[styles.logStatChip, { backgroundColor: '#EF444415' }]}>
                  <Text style={[styles.logStatText, { color: '#EF4444' }]}>{entry.days_away_from_work} days away</Text>
                </View>
              )}
              {entry.days_job_transfer > 0 && (
                <View style={[styles.logStatChip, { backgroundColor: '#F59E0B15' }]}>
                  <Text style={[styles.logStatText, { color: '#F59E0B' }]}>{entry.days_job_transfer} days restricted</Text>
                </View>
              )}
              <View style={[styles.logStatChip, { backgroundColor: '#3B82F615' }]}>
                <Text style={[styles.logStatText, { color: '#3B82F6' }]}>
                  {INJURY_TYPES.find(t => t.id === entry.classify_case)?.name}
                </Text>
              </View>
            </View>
          </View>
        ))
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
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#3B82F6' : colors.textSecondary }]}>New Entry</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'log' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('log')}
        >
          <History size={18} color={activeTab === 'log' ? '#3B82F6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'log' ? '#3B82F6' : colors.textSecondary }]}>
            View Log ({entries.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderLogTab()}

      <Modal visible={showJobTitlePicker} transparent animationType="slide" onRequestClose={() => setShowJobTitlePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Job Title</Text>
              <Pressable onPress={() => setShowJobTitlePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {JOB_TITLES.map(title => (
                <Pressable
                  key={title}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.job_title === title && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('job_title', title); setShowJobTitlePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.job_title === title ? colors.primary : colors.text }]}>{title}</Text>
                  {formData.job_title === title && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showInjuryTypePicker} transparent animationType="slide" onRequestClose={() => setShowInjuryTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Classify the Case</Text>
              <Pressable onPress={() => setShowInjuryTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {INJURY_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.classify_case === type.id && { backgroundColor: '#3B82F610' }]}
                  onPress={() => { updateFormData('classify_case', type.id); setShowInjuryTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={[styles.columnBadge, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.columnText, { color: '#3B82F6' }]}>{type.column}</Text>
                  </View>
                  <Text style={[styles.modalOptionText, { color: formData.classify_case === type.id ? '#3B82F6' : colors.text }]}>{type.name}</Text>
                  {formData.classify_case === type.id && <Check size={18} color="#3B82F6" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showOutcomePicker} transparent animationType="slide" onRequestClose={() => setShowOutcomePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Outcome</Text>
              <Pressable onPress={() => setShowOutcomePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {OUTCOME_TYPES.map(outcome => (
                <Pressable
                  key={outcome.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.outcome === outcome.id && { backgroundColor: getOutcomeColor(outcome.id) + '10' }]}
                  onPress={() => { updateFormData('outcome', outcome.id); setShowOutcomePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={[styles.outcomeDot, { backgroundColor: getOutcomeColor(outcome.id) }]} />
                  <View style={styles.outcomeInfo}>
                    <Text style={[styles.modalOptionText, { color: formData.outcome === outcome.id ? getOutcomeColor(outcome.id) : colors.text }]}>{outcome.name}</Text>
                    <Text style={[styles.outcomeDesc, { color: colors.textSecondary }]}>{outcome.description}</Text>
                  </View>
                  {formData.outcome === outcome.id && <Check size={18} color={getOutcomeColor(outcome.id)} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  infoCard: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20, gap: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12, gap: 10 },
  inputField: { flex: 1, fontSize: 15, paddingVertical: 14 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' as const, marginBottom: 12 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  row: { flexDirection: 'row' as const, gap: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  alertBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 10 },
  alertText: { flex: 1, fontSize: 13, fontWeight: '500' as const },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  resetButton: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 16, alignItems: 'center' as const },
  resetButtonText: { fontSize: 16, fontWeight: '600' as const },
  submitButton: { flex: 2, borderRadius: 10, padding: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#fff' },
  bottomPadding: { height: 40 },
  yearSelector: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16 },
  yearButton: { padding: 8 },
  yearButtonText: { fontSize: 20, fontWeight: '600' as const },
  yearText: { fontSize: 18, fontWeight: '600' as const },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, marginBottom: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 16, textAlign: 'center' as const },
  summaryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  summaryItem: { width: '48%' as unknown as number, borderRadius: 10, padding: 12, alignItems: 'center' as const },
  summaryValue: { fontSize: 28, fontWeight: '700' as const },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  divider: { height: 1, marginVertical: 16 },
  classificationTitle: { fontSize: 14, fontWeight: '500' as const, marginBottom: 12, textAlign: 'center' as const },
  classificationGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'space-between' as const },
  classificationItem: { width: '16%' as unknown as number, alignItems: 'center' as const },
  classificationValue: { fontSize: 18, fontWeight: '600' as const },
  classificationLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' as const },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { alignItems: 'center' as const, padding: 40, borderRadius: 12, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  logEntry: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  logEntryHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
  caseNumberBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4 },
  caseNumber: { fontSize: 14, fontWeight: '700' as const },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  outcomeText: { fontSize: 11, fontWeight: '600' as const },
  logEmployeeName: { fontSize: 16, fontWeight: '600' as const },
  logJobTitle: { fontSize: 13, marginBottom: 8 },
  logDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  logMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, marginBottom: 10 },
  logMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  logMetaText: { fontSize: 12 },
  logStats: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  logStatChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logStatText: { fontSize: 12, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  columnBadge: { width: 28, height: 28, borderRadius: 6, alignItems: 'center' as const, justifyContent: 'center' as const },
  columnText: { fontSize: 14, fontWeight: '700' as const },
  outcomeDot: { width: 12, height: 12, borderRadius: 6 },
  outcomeInfo: { flex: 1 },
  outcomeDesc: { fontSize: 12, marginTop: 2 },
});
