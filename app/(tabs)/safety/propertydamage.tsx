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
  Building2,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronDown,
  Check,
  Search,
  ChevronRight,
  AlertTriangle,
  History,
  Send,
  DollarSign,
  Wrench,
  Camera,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  usePropertyDamageReports,
  useCreatePropertyDamageReport,
  DamageType,
  SeverityLevel,
  CauseType,
} from '@/hooks/usePropertyDamage';
import type { PropertyDamageFormData } from '@/hooks/usePropertyDamage';

const DAMAGE_TYPES: { id: DamageType; name: string; icon: string }[] = [
  { id: 'equipment', name: 'Equipment', icon: '⚙️' },
  { id: 'facility', name: 'Facility/Building', icon: '🏢' },
  { id: 'vehicle', name: 'Vehicle', icon: '🚗' },
  { id: 'machinery', name: 'Machinery', icon: '🏭' },
  { id: 'tools', name: 'Tools', icon: '🔧' },
  { id: 'inventory', name: 'Inventory/Product', icon: '📦' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️' },
  { id: 'other', name: 'Other', icon: '❓' },
];

const SEVERITY_LEVELS: { id: SeverityLevel; name: string; color: string }[] = [
  { id: 'minor', name: 'Minor - Cosmetic/No Impact', color: '#10B981' },
  { id: 'moderate', name: 'Moderate - Limited Impact', color: '#F59E0B' },
  { id: 'major', name: 'Major - Significant Impact', color: '#F97316' },
  { id: 'critical', name: 'Critical - Operations Halted', color: '#EF4444' },
];

const CAUSE_TYPES: { id: CauseType; name: string }[] = [
  { id: 'operator_error', name: 'Operator Error' },
  { id: 'equipment_failure', name: 'Equipment Failure' },
  { id: 'weather', name: 'Weather/Natural Event' },
  { id: 'collision', name: 'Collision/Impact' },
  { id: 'fire', name: 'Fire' },
  { id: 'water', name: 'Water/Flooding' },
  { id: 'vandalism', name: 'Vandalism' },
  { id: 'wear_tear', name: 'Normal Wear & Tear' },
  { id: 'other', name: 'Other' },
];

const DEPARTMENTS = [
  'Production', 'Warehouse', 'Shipping', 'Receiving', 'Maintenance',
  'Quality', 'Office', 'Sanitation', 'R&D', 'Facilities', 'Other'
];

const LOCATIONS = [
  'Production Floor', 'Warehouse', 'Loading Dock', 'Parking Lot', 'Office',
  'Maintenance Shop', 'Lab', 'Cold Storage', 'Exterior', 'Roof', 'Other'
];

const initialFormData: PropertyDamageFormData = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  location: '',
  specific_location: '',
  department: '',
  damage_type: '',
  severity: '',
  item_damaged: '',
  asset_id: '',
  description: '',
  cause: '',
  cause_description: '',
  personnel_involved: '',
  witnesses: '',
  estimated_cost: '',
  photos_attached: false,
  immediate_actions: '',
  repair_required: true,
  equipment_operational: true,
  notes: '',
};

export default function PropertyDamageScreen() {
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState<PropertyDamageFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDamageTypePicker, setShowDamageTypePicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [showCausePicker, setShowCausePicker] = useState(false);

  const { data: reports = [], isLoading, refetch } = usePropertyDamageReports();
  const createMutation = useCreatePropertyDamageReport();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateFormData = useCallback((key: keyof PropertyDamageFormData, value: PropertyDamageFormData[keyof PropertyDamageFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = !searchQuery ||
        report.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.item_damaged.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, searchQuery]);

  const canSubmit = formData.item_damaged.trim().length > 0 &&
    formData.department &&
    formData.location &&
    formData.damage_type &&
    formData.severity &&
    formData.description.trim().length > 10 &&
    formData.cause &&
    formData.immediate_actions.trim().length > 5;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      'This property damage report will be submitted for approval. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await createMutation.mutateAsync(formData);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Property damage report submitted for approval.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[PropertyDamage] Submit error:', error);
              Alert.alert('Error', 'Failed to submit report. Please try again.');
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
      case 'pending_approval': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getSeverityColor = (severity: SeverityLevel) => {
    return SEVERITY_LEVELS.find(s => s.id === severity)?.color || colors.textSecondary;
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#84CC1620' }]}>
          <Building2 size={32} color="#84CC16" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Property Damage Report</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Document damage to equipment, facilities, or property
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
        <AlertTriangle size={18} color="#F59E0B" />
        <Text style={[styles.infoText, { color: '#F59E0B' }]}>
          Report all property damage immediately. Include photos and cost estimates when possible.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Incident Information *</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.date}
              onChangeText={(text) => updateFormData('date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.time}
              onChangeText={(text) => updateFormData('time', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Location *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowLocationPicker(true)}
      >
        <MapPin size={18} color={formData.location ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.location ? colors.text : colors.textSecondary }]}>
          {formData.location || 'Select location'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Specific location details (e.g., Aisle 5, Machine #3)"
        placeholderTextColor={colors.textSecondary}
        value={formData.specific_location}
        onChangeText={(text) => updateFormData('specific_location', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Department *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDepartmentPicker(true)}
      >
        <FileText size={18} color={formData.department ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.department ? colors.text : colors.textSecondary }]}>
          {formData.department || 'Select department'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Damage Details *</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Type of Damage *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowDamageTypePicker(true)}
      >
        <Wrench size={18} color={formData.damage_type ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.damage_type ? colors.text : colors.textSecondary }]}>
          {formData.damage_type 
            ? `${DAMAGE_TYPES.find(d => d.id === formData.damage_type)?.icon} ${DAMAGE_TYPES.find(d => d.id === formData.damage_type)?.name}`
            : 'Select damage type'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Severity Level *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowSeverityPicker(true)}
      >
        <Shield size={18} color={formData.severity ? getSeverityColor(formData.severity as SeverityLevel) : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.severity ? colors.text : colors.textSecondary }]}>
          {formData.severity 
            ? SEVERITY_LEVELS.find(s => s.id === formData.severity)?.name
            : 'Select severity level'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Item/Property Damaged *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Building2 size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Name or description of damaged item"
          placeholderTextColor={colors.textSecondary}
          value={formData.item_damaged}
          onChangeText={(text) => updateFormData('item_damaged', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Asset ID/Tag Number</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Equipment ID or asset tag if applicable"
        placeholderTextColor={colors.textSecondary}
        value={formData.asset_id}
        onChangeText={(text) => updateFormData('asset_id', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Description of Damage *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe the damage in detail..."
        placeholderTextColor={colors.textSecondary}
        value={formData.description}
        onChangeText={(text) => updateFormData('description', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Cause & Personnel</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Cause of Damage *</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowCausePicker(true)}
      >
        <AlertTriangle size={18} color={formData.cause ? colors.primary : colors.textSecondary} />
        <Text style={[styles.selectorText, { color: formData.cause ? colors.text : colors.textSecondary }]}>
          {formData.cause 
            ? CAUSE_TYPES.find(c => c.id === formData.cause)?.name
            : 'Select cause'}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Cause Description</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Additional details about how the damage occurred..."
        placeholderTextColor={colors.textSecondary}
        value={formData.cause_description}
        onChangeText={(text) => updateFormData('cause_description', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Personnel Involved</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Names and roles of personnel involved"
          placeholderTextColor={colors.textSecondary}
          value={formData.personnel_involved}
          onChangeText={(text) => updateFormData('personnel_involved', text)}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Witnesses</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Names of witnesses (comma-separated)"
        placeholderTextColor={colors.textSecondary}
        value={formData.witnesses}
        onChangeText={(text) => updateFormData('witnesses', text)}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost & Documentation</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Repair/Replacement Cost</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DollarSign size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="$0.00"
          placeholderTextColor={colors.textSecondary}
          value={formData.estimated_cost}
          onChangeText={(text) => updateFormData('estimated_cost', text)}
          keyboardType="default"
        />
      </View>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('photos_attached', !formData.photos_attached);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.photos_attached ? '#10B981' : colors.border, backgroundColor: formData.photos_attached ? '#10B981' : 'transparent' }]}>
          {formData.photos_attached && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Photos Attached</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Documentation photos of the damage</Text>
        </View>
        <Camera size={20} color={colors.textSecondary} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Response & Status</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Immediate Actions Taken *</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Describe actions taken immediately after discovering the damage..."
        placeholderTextColor={colors.textSecondary}
        value={formData.immediate_actions}
        onChangeText={(text) => updateFormData('immediate_actions', text)}
        multiline
        numberOfLines={3}
      />

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('repair_required', !formData.repair_required);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.repair_required ? '#F59E0B' : colors.border, backgroundColor: formData.repair_required ? '#F59E0B' : 'transparent' }]}>
          {formData.repair_required && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Repair Required</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>Professional repair or replacement needed</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.toggleOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          updateFormData('equipment_operational', !formData.equipment_operational);
        }}
      >
        <View style={[styles.checkbox, { borderColor: formData.equipment_operational ? '#10B981' : '#EF4444', backgroundColor: formData.equipment_operational ? '#10B981' : '#EF4444' }]}>
          {formData.equipment_operational ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
        </View>
        <View style={styles.toggleContent}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Equipment Operational</Text>
          <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
            {formData.equipment_operational ? 'Can still be used safely' : 'Out of service until repaired'}
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Additional Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional information..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={2}
      />

      <View style={styles.actionButtons}>
        <Pressable style={[styles.resetButton, { borderColor: colors.border }]} onPress={resetForm}>
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#84CC16' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
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
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search reports..."
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
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Property Damage Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{reports.length}</Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
              {reports.filter(r => r.status === 'pending_approval').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStatItem}>
            <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
              {reports.filter(r => r.status === 'approved').length}
            </Text>
            <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
        </View>
      </View>

      {isLoading && reports.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Building2 size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reports Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Property damage reports will appear here
          </Text>
        </View>
      ) : (
        filteredReports.map(report => {
          const isExpanded = expandedReport === report.id;
          const damageType = DAMAGE_TYPES.find(d => d.id === report.damage_type);
          const severity = SEVERITY_LEVELS.find(s => s.id === report.severity);
          
          return (
            <Pressable
              key={report.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedReport(isExpanded ? null : report.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.damageIcon, { backgroundColor: '#84CC1620' }]}>
                    <Text style={styles.damageIconText}>{damageType?.icon || '🏢'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.historyNumber, { color: colors.text }]}>{report.report_number}</Text>
                    <Text style={[styles.historyItem, { color: colors.textSecondary }]}>{report.item_damaged}</Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  <View style={[styles.severityBadge, { backgroundColor: severity?.color + '20' }]}>
                    <Text style={[styles.severityText, { color: severity?.color }]}>
                      {report.severity.toUpperCase()}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <Text style={[styles.historyDescription, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                {report.description}
              </Text>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{report.date}</Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{report.location}</Text>
                </View>
                {report.estimated_cost && (
                  <View style={styles.historyMetaItem}>
                    <DollarSign size={14} color={colors.textSecondary} />
                    <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>{report.estimated_cost}</Text>
                  </View>
                )}
              </View>

              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Damage Type</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{damageType?.name}</Text>
                  </View>
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Cause</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>
                      {CAUSE_TYPES.find(c => c.id === report.cause)?.name}
                    </Text>
                  </View>
                  {report.personnel_involved && (
                    <View style={styles.expandedSection}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Personnel Involved</Text>
                      <Text style={[styles.expandedText, { color: colors.text }]}>{report.personnel_involved}</Text>
                    </View>
                  )}
                  <View style={styles.expandedSection}>
                    <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Immediate Actions</Text>
                    <Text style={[styles.expandedText, { color: colors.text }]}>{report.immediate_actions}</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusChip, { backgroundColor: report.repair_required ? '#F59E0B20' : '#10B98120' }]}>
                      <Text style={[styles.statusChipText, { color: report.repair_required ? '#F59E0B' : '#10B981' }]}>
                        {report.repair_required ? 'Repair Needed' : 'No Repair Needed'}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: report.equipment_operational ? '#10B98120' : '#EF444420' }]}>
                      <Text style={[styles.statusChipText, { color: report.equipment_operational ? '#10B981' : '#EF4444' }]}>
                        {report.equipment_operational ? 'Operational' : 'Out of Service'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.approvalStatus, { backgroundColor: getStatusColor(report.status) + '15' }]}>
                    <Text style={[styles.approvalStatusText, { color: getStatusColor(report.status) }]}>
                      Status: {report.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#84CC16', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#84CC16' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#84CC16' : colors.textSecondary }]}>New Report</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#84CC16', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#84CC16' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#84CC16' : colors.textSecondary }]}>
            History ({reports.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal visible={showDepartmentPicker} transparent animationType="slide" onRequestClose={() => setShowDepartmentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Department</Text>
              <Pressable onPress={() => setShowDepartmentPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {DEPARTMENTS.map(dept => (
                <Pressable
                  key={dept}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.department === dept && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('department', dept); setShowDepartmentPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.department === dept ? colors.primary : colors.text }]}>{dept}</Text>
                  {formData.department === dept && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocationPicker} transparent animationType="slide" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <Pressable onPress={() => setShowLocationPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {LOCATIONS.map(loc => (
                <Pressable
                  key={loc}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.location === loc && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('location', loc); setShowLocationPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <MapPin size={18} color={formData.location === loc ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.modalOptionText, { color: formData.location === loc ? colors.primary : colors.text }]}>{loc}</Text>
                  {formData.location === loc && <Check size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDamageTypePicker} transparent animationType="slide" onRequestClose={() => setShowDamageTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Damage Type</Text>
              <Pressable onPress={() => setShowDamageTypePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {DAMAGE_TYPES.map(type => (
                <Pressable
                  key={type.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.damage_type === type.id && { backgroundColor: '#84CC1610' }]}
                  onPress={() => { updateFormData('damage_type', type.id); setShowDamageTypePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={styles.damageEmoji}>{type.icon}</Text>
                  <Text style={[styles.modalOptionText, { color: formData.damage_type === type.id ? '#84CC16' : colors.text }]}>{type.name}</Text>
                  {formData.damage_type === type.id && <Check size={18} color="#84CC16" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSeverityPicker} transparent animationType="slide" onRequestClose={() => setShowSeverityPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Severity Level</Text>
              <Pressable onPress={() => setShowSeverityPicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {SEVERITY_LEVELS.map(level => (
                <Pressable
                  key={level.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.severity === level.id && { backgroundColor: level.color + '10' }]}
                  onPress={() => { updateFormData('severity', level.id); setShowSeverityPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={[styles.severityDot, { backgroundColor: level.color }]} />
                  <Text style={[styles.modalOptionText, { color: formData.severity === level.id ? level.color : colors.text }]}>{level.name}</Text>
                  {formData.severity === level.id && <Check size={18} color={level.color} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCausePicker} transparent animationType="slide" onRequestClose={() => setShowCausePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Cause</Text>
              <Pressable onPress={() => setShowCausePicker(false)}><X size={24} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {CAUSE_TYPES.map(cause => (
                <Pressable
                  key={cause.id}
                  style={[styles.modalOption, { borderBottomColor: colors.border }, formData.cause === cause.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { updateFormData('cause', cause.id); setShowCausePicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.modalOptionText, { color: formData.cause === cause.id ? colors.primary : colors.text }]}>{cause.name}</Text>
                  {formData.cause === cause.id && <Check size={18} color={colors.primary} />}
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
  selectorText: { flex: 1, fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 48, fontSize: 15, marginBottom: 12 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, gap: 10, marginBottom: 12 },
  inputField: { flex: 1, fontSize: 15, height: '100%' },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, textAlignVertical: 'top' as const, minHeight: 90 },
  toggleOption: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  toggleContent: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '600' as const },
  toggleSubtitle: { fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  resetButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  resetButtonText: { fontSize: 16, fontWeight: '600' as const },
  submitButton: { flex: 2, height: 50, borderRadius: 12, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  bottomPadding: { height: 40 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  summaryCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12 },
  summaryStats: { flexDirection: 'row' as const, alignItems: 'center' as const },
  summaryStatItem: { flex: 1, alignItems: 'center' as const },
  summaryStatValue: { fontSize: 24, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: 32 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { borderRadius: 12, padding: 40, alignItems: 'center' as const, borderWidth: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  historyHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  damageIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  damageIconText: { fontSize: 22 },
  historyNumber: { fontSize: 15, fontWeight: '700' as const },
  historyItem: { fontSize: 13, marginTop: 2 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '700' as const },
  historyDescription: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  historyMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedSection: { marginBottom: 10 },
  expandedLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, marginBottom: 4 },
  expandedText: { fontSize: 14, lineHeight: 20 },
  statusRow: { flexDirection: 'row' as const, gap: 8, marginTop: 8, marginBottom: 10 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusChipText: { fontSize: 11, fontWeight: '600' as const },
  approvalStatus: { padding: 10, borderRadius: 8 },
  approvalStatusText: { fontSize: 12, fontWeight: '600' as const, textAlign: 'center' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const },
  modalList: { padding: 8 },
  modalOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1, gap: 12 },
  modalOptionText: { flex: 1, fontSize: 15 },
  damageEmoji: { fontSize: 22 },
  severityDot: { width: 14, height: 14, borderRadius: 7 },
});
