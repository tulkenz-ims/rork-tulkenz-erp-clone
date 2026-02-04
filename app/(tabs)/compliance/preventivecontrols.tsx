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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Shield,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Thermometer,
  Wheat,
  Droplets,
  Truck,
  RotateCcw,
  AlertTriangle,
  User,
  Calendar,
  ClipboardCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type ControlType = 'process' | 'allergen' | 'sanitation' | 'supply_chain' | 'recall';
type ControlStatus = 'active' | 'under_review' | 'needs_update' | 'inactive';
type VerificationStatus = 'verified' | 'pending' | 'overdue' | 'failed';

interface MonitoringRecord {
  id: string;
  date: string;
  time: string;
  result: string;
  withinLimits: boolean;
  monitoredBy: string;
  correctiveAction?: string;
}

interface PreventiveControl {
  id: string;
  type: ControlType;
  name: string;
  description: string;
  associatedHazard: string;
  criticalLimits: string;
  monitoringProcedure: string;
  monitoringFrequency: string;
  monitoringDevice?: string;
  correctiveActionProcedure: string;
  verificationActivities: string[];
  verificationFrequency: string;
  recordsKept: string[];
  responsiblePerson: string;
  status: ControlStatus;
  lastVerification: string;
  nextVerification: string;
  verificationStatus: VerificationStatus;
  recentMonitoring: MonitoringRecord[];
  createdAt: string;
  updatedAt: string;
}

const CONTROL_TYPE_CONFIG: Record<ControlType, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  process: { label: 'Process Control', color: '#3B82F6', icon: Thermometer },
  allergen: { label: 'Allergen Control', color: '#EC4899', icon: Wheat },
  sanitation: { label: 'Sanitation Control', color: '#10B981', icon: Droplets },
  supply_chain: { label: 'Supply Chain Control', color: '#F59E0B', icon: Truck },
  recall: { label: 'Recall Plan', color: '#EF4444', icon: RotateCcw },
};

const STATUS_CONFIG: Record<ControlStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#10B981' },
  under_review: { label: 'Under Review', color: '#F59E0B' },
  needs_update: { label: 'Needs Update', color: '#EF4444' },
  inactive: { label: 'Inactive', color: '#6B7280' },
};

const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: 'Verified', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  overdue: { label: 'Overdue', color: '#EF4444' },
  failed: { label: 'Failed', color: '#DC2626' },
};

const MOCK_CONTROLS: PreventiveControl[] = [
  {
    id: '1',
    type: 'process',
    name: 'Cooking Temperature Control',
    description: 'Ensure all RTE products reach minimum internal temperature to eliminate pathogens',
    associatedHazard: 'Survival of pathogens (Salmonella, E. coli, Listeria)',
    criticalLimits: 'Internal temperature ≥ 165°F (74°C) for 15 seconds',
    monitoringProcedure: 'Measure internal temperature of product at thickest point using calibrated thermometer',
    monitoringFrequency: 'Every batch, minimum 2 readings per batch',
    monitoringDevice: 'Calibrated digital probe thermometer',
    correctiveActionProcedure: 'If temperature < 165°F: Continue cooking until limit achieved. If equipment malfunction: Hold product, notify maintenance, evaluate product safety.',
    verificationActivities: ['Daily review of cooking logs', 'Weekly thermometer calibration', 'Monthly equipment verification'],
    verificationFrequency: 'Daily for logs, Weekly for calibration',
    recordsKept: ['Cooking temperature logs', 'Calibration records', 'Corrective action records'],
    responsiblePerson: 'Production Supervisor',
    status: 'active',
    lastVerification: '2026-01-25',
    nextVerification: '2026-02-01',
    verificationStatus: 'verified',
    recentMonitoring: [
      { id: 'm1', date: '2026-01-26', time: '08:30', result: '168°F', withinLimits: true, monitoredBy: 'John D.' },
      { id: 'm2', date: '2026-01-26', time: '10:45', result: '171°F', withinLimits: true, monitoredBy: 'John D.' },
      { id: 'm3', date: '2026-01-25', time: '14:20', result: '165°F', withinLimits: true, monitoredBy: 'Sarah M.' },
    ],
    createdAt: '2024-06-15',
    updatedAt: '2026-01-20',
  },
  {
    id: '2',
    type: 'allergen',
    name: 'Allergen Cross-Contact Prevention',
    description: 'Prevent undeclared allergens through scheduling, cleaning, and verification',
    associatedHazard: 'Undeclared allergens causing allergic reactions',
    criticalLimits: 'Allergen residue < 10 ppm on food contact surfaces after cleaning',
    monitoringProcedure: 'Visual inspection of cleaned equipment, allergen swab testing of food contact surfaces',
    monitoringFrequency: 'After each allergen changeover',
    monitoringDevice: 'Allergen test kits (ELISA lateral flow)',
    correctiveActionProcedure: 'If positive result: Re-clean equipment, retest. If second positive: Investigate root cause, segregate potentially affected product.',
    verificationActivities: ['Review of cleaning records', 'Environmental allergen swab testing', 'Label verification audits'],
    verificationFrequency: 'Weekly environmental testing, Daily record review',
    recordsKept: ['Allergen cleaning logs', 'Swab test results', 'Production schedule', 'Corrective action records'],
    responsiblePerson: 'QA Manager',
    status: 'active',
    lastVerification: '2026-01-24',
    nextVerification: '2026-01-31',
    verificationStatus: 'verified',
    recentMonitoring: [
      { id: 'm4', date: '2026-01-26', time: '06:00', result: 'Negative', withinLimits: true, monitoredBy: 'QA Tech' },
      { id: 'm5', date: '2026-01-25', time: '14:00', result: 'Negative', withinLimits: true, monitoredBy: 'QA Tech' },
    ],
    createdAt: '2024-06-15',
    updatedAt: '2026-01-15',
  },
  {
    id: '3',
    type: 'sanitation',
    name: 'Environmental Listeria Control',
    description: 'Control Listeria monocytogenes in RTE processing environment',
    associatedHazard: 'Listeria contamination from environmental sources',
    criticalLimits: 'No Listeria spp. detected on food contact surfaces',
    monitoringProcedure: 'Environmental swabbing of Zone 1, 2, and 3 surfaces per sampling plan',
    monitoringFrequency: 'Daily Zone 1, Weekly Zone 2, Monthly Zone 3',
    monitoringDevice: 'Environmental sampling sponges, Laboratory PCR testing',
    correctiveActionProcedure: 'If positive Zone 1: Stop production, intensive cleaning, hold product, expand testing. Zone 2/3: Enhanced cleaning, increased monitoring.',
    verificationActivities: ['Third-party laboratory testing', 'Sanitation effectiveness audits', 'Trend analysis'],
    verificationFrequency: 'Monthly trend analysis, Quarterly third-party testing',
    recordsKept: ['Environmental monitoring results', 'Sanitation records', 'Corrective action records', 'Trend reports'],
    responsiblePerson: 'Sanitation Manager',
    status: 'active',
    lastVerification: '2026-01-20',
    nextVerification: '2026-02-20',
    verificationStatus: 'verified',
    recentMonitoring: [
      { id: 'm6', date: '2026-01-26', time: '05:00', result: 'Not Detected', withinLimits: true, monitoredBy: 'Sanitation Lead' },
    ],
    createdAt: '2024-06-15',
    updatedAt: '2026-01-20',
  },
  {
    id: '4',
    type: 'supply_chain',
    name: 'Supplier Verification Program',
    description: 'Verify suppliers control hazards in raw materials supplied',
    associatedHazard: 'Hazards from raw material suppliers',
    criticalLimits: 'All suppliers must be approved and meet verification requirements',
    monitoringProcedure: 'Review of supplier documentation, COAs, audit reports',
    monitoringFrequency: 'Each incoming shipment for COA, Annual for audits',
    correctiveActionProcedure: 'If non-conformance: Reject shipment, notify supplier, evaluate need for re-audit or supplier change.',
    verificationActivities: ['Annual supplier audits', 'Incoming material testing', 'Supplier scorecard review'],
    verificationFrequency: 'Annual audits, Quarterly scorecard review',
    recordsKept: ['Approved supplier list', 'Audit reports', 'COAs', 'Corrective action records'],
    responsiblePerson: 'Procurement Manager',
    status: 'active',
    lastVerification: '2026-01-15',
    nextVerification: '2026-04-15',
    verificationStatus: 'verified',
    recentMonitoring: [],
    createdAt: '2024-06-15',
    updatedAt: '2026-01-15',
  },
];

export default function PreventiveControlsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [controls, setControls] = useState<PreventiveControl[]>(MOCK_CONTROLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ControlType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedControl, setSelectedControl] = useState<PreventiveControl | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'monitoring' | 'verification'>('details');

  const [newControl, setNewControl] = useState({
    type: '' as ControlType | '',
    name: '',
    description: '',
    associatedHazard: '',
    criticalLimits: '',
    monitoringProcedure: '',
    monitoringFrequency: '',
    correctiveActionProcedure: '',
    responsiblePerson: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredControls = useMemo(() => {
    return controls.filter(control => {
      const matchesSearch = !searchQuery ||
        control.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        control.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || control.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [controls, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    const byType = Object.keys(CONTROL_TYPE_CONFIG).reduce((acc, type) => {
      acc[type as ControlType] = controls.filter(c => c.type === type).length;
      return acc;
    }, {} as Record<ControlType, number>);

    const activeCount = controls.filter(c => c.status === 'active').length;
    const overdueVerification = controls.filter(c => c.verificationStatus === 'overdue').length;

    return { total: controls.length, byType, activeCount, overdueVerification };
  }, [controls]);

  const handleAddControl = useCallback(() => {
    if (!newControl.type || !newControl.name || !newControl.criticalLimits) {
      Alert.alert('Required Fields', 'Please fill in type, name, and critical limits.');
      return;
    }

    const control: PreventiveControl = {
      id: Date.now().toString(),
      type: newControl.type as ControlType,
      name: newControl.name,
      description: newControl.description,
      associatedHazard: newControl.associatedHazard,
      criticalLimits: newControl.criticalLimits,
      monitoringProcedure: newControl.monitoringProcedure,
      monitoringFrequency: newControl.monitoringFrequency,
      correctiveActionProcedure: newControl.correctiveActionProcedure,
      verificationActivities: [],
      verificationFrequency: '',
      recordsKept: [],
      responsiblePerson: newControl.responsiblePerson,
      status: 'under_review',
      lastVerification: '',
      nextVerification: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      verificationStatus: 'pending',
      recentMonitoring: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setControls(prev => [control, ...prev]);
    setShowAddModal(false);
    setNewControl({
      type: '',
      name: '',
      description: '',
      associatedHazard: '',
      criticalLimits: '',
      monitoringProcedure: '',
      monitoringFrequency: '',
      correctiveActionProcedure: '',
      responsiblePerson: '',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newControl]);

  const openDetail = useCallback((control: PreventiveControl) => {
    setSelectedControl(control);
    setActiveTab('details');
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
            <Shield size={28} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Preventive Controls</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FSMA required controls to minimize or prevent hazards
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.activeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.byType.process || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Process</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdueVerification}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search controls..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: !typeFilter ? colors.primary : colors.border },
              !typeFilter && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setTypeFilter(null)}
          >
            <Text style={[styles.filterText, { color: !typeFilter ? colors.primary : colors.text }]}>All</Text>
          </Pressable>
          {Object.entries(CONTROL_TYPE_CONFIG).map(([key, config]) => {
            const IconComp = config.icon;
            return (
              <Pressable
                key={key}
                style={[
                  styles.filterChip,
                  { borderColor: typeFilter === key ? config.color : colors.border },
                  typeFilter === key && { backgroundColor: config.color + '15' },
                ]}
                onPress={() => setTypeFilter(typeFilter === key ? null : key as ControlType)}
              >
                <IconComp size={14} color={typeFilter === key ? config.color : colors.text} />
                <Text style={[styles.filterText, { color: typeFilter === key ? config.color : colors.text }]}>
                  {config.label.split(' ')[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preventive Controls ({filteredControls.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#10B981' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {filteredControls.map(control => {
          const typeConfig = CONTROL_TYPE_CONFIG[control.type];
          const TypeIcon = typeConfig.icon;
          const statusConfig = STATUS_CONFIG[control.status];
          const verificationConfig = VERIFICATION_CONFIG[control.verificationStatus];

          return (
            <Pressable
              key={control.id}
              style={({ pressed }) => [
                styles.controlCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: typeConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(control)}
            >
              <View style={styles.controlHeader}>
                <View style={[styles.controlIcon, { backgroundColor: typeConfig.color + '20' }]}>
                  <TypeIcon size={20} color={typeConfig.color} />
                </View>
                <View style={styles.controlInfo}>
                  <Text style={[styles.controlType, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                  <Text style={[styles.controlName, { color: colors.text }]}>{control.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <Text style={[styles.controlDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {control.description}
              </Text>

              <View style={[styles.criticalLimitsBox, { backgroundColor: colors.background }]}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={[styles.criticalLimitsLabel, { color: colors.textSecondary }]}>Critical Limits:</Text>
                <Text style={[styles.criticalLimitsText, { color: colors.text }]} numberOfLines={1}>
                  {control.criticalLimits}
                </Text>
              </View>

              <View style={styles.controlMeta}>
                <View style={styles.metaItem}>
                  <User size={12} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>{control.responsiblePerson}</Text>
                </View>
                <View style={[styles.verificationBadge, { backgroundColor: verificationConfig.color + '15' }]}>
                  <ClipboardCheck size={12} color={verificationConfig.color} />
                  <Text style={[styles.verificationText, { color: verificationConfig.color }]}>
                    {verificationConfig.label}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {filteredControls.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Shield size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Preventive Controls</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add controls for identified hazards
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Preventive Control</Text>
            <Pressable onPress={handleAddControl}>
              <Text style={[styles.saveButton, { color: '#10B981' }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Control Type *</Text>
            <View style={styles.typeGrid}>
              {Object.entries(CONTROL_TYPE_CONFIG).map(([key, config]) => {
                const IconComp = config.icon;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.typeCard,
                      { borderColor: newControl.type === key ? config.color : colors.border },
                      newControl.type === key && { backgroundColor: config.color + '15' },
                    ]}
                    onPress={() => setNewControl(prev => ({ ...prev, type: key as ControlType }))}
                  >
                    <IconComp size={24} color={newControl.type === key ? config.color : colors.textSecondary} />
                    <Text style={[styles.typeLabel, { color: newControl.type === key ? config.color : colors.text }]}>
                      {config.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Control Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Cooking Temperature Control"
              placeholderTextColor={colors.textTertiary}
              value={newControl.name}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, name: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the preventive control..."
              placeholderTextColor={colors.textTertiary}
              value={newControl.description}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Associated Hazard</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What hazard does this control address?"
              placeholderTextColor={colors.textTertiary}
              value={newControl.associatedHazard}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, associatedHazard: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Critical Limits *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Temperature ≥ 165°F for 15 seconds"
              placeholderTextColor={colors.textTertiary}
              value={newControl.criticalLimits}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, criticalLimits: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Monitoring Procedure</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="How is this control monitored?"
              placeholderTextColor={colors.textTertiary}
              value={newControl.monitoringProcedure}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, monitoringProcedure: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Monitoring Frequency</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Every batch, Hourly, Daily"
              placeholderTextColor={colors.textTertiary}
              value={newControl.monitoringFrequency}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, monitoringFrequency: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Corrective Action Procedure</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What actions are taken when limits are not met?"
              placeholderTextColor={colors.textTertiary}
              value={newControl.correctiveActionProcedure}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, correctiveActionProcedure: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Responsible Person</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Who is responsible for this control?"
              placeholderTextColor={colors.textTertiary}
              value={newControl.responsiblePerson}
              onChangeText={(text) => setNewControl(prev => ({ ...prev, responsiblePerson: text }))}
            />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Control Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedControl && (() => {
            const typeConfig = CONTROL_TYPE_CONFIG[selectedControl.type];
            const TypeIcon = typeConfig.icon;
            const statusConfig = STATUS_CONFIG[selectedControl.status];

            return (
              <>
                <View style={styles.tabBar}>
                  {(['details', 'monitoring', 'verification'] as const).map(tab => (
                    <Pressable
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[
                        styles.tabText,
                        { color: activeTab === tab ? colors.primary : colors.textSecondary },
                      ]}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <ScrollView style={styles.modalContent}>
                  {activeTab === 'details' && (
                    <>
                      <View style={[styles.detailHeader, { backgroundColor: typeConfig.color + '15' }]}>
                        <View style={[styles.detailIcon, { backgroundColor: typeConfig.color + '30' }]}>
                          <TypeIcon size={28} color={typeConfig.color} />
                        </View>
                        <Text style={[styles.detailType, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                        <Text style={[styles.detailName, { color: colors.text }]}>{selectedControl.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15', marginTop: 8 }]}>
                          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                        </View>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Description</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.detailText, { color: colors.text }]}>{selectedControl.description}</Text>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Associated Hazard</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.detailText, { color: colors.text }]}>{selectedControl.associatedHazard}</Text>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Critical Limits</Text>
                      <View style={[styles.criticalCard, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' }]}>
                        <AlertTriangle size={18} color="#F59E0B" />
                        <Text style={[styles.criticalText, { color: colors.text }]}>{selectedControl.criticalLimits}</Text>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Action</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.detailText, { color: colors.text }]}>{selectedControl.correctiveActionProcedure}</Text>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Responsible Person</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.personRow}>
                          <User size={18} color={colors.primary} />
                          <Text style={[styles.personName, { color: colors.text }]}>{selectedControl.responsiblePerson}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {activeTab === 'monitoring' && (
                    <>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Monitoring Procedure</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.detailText, { color: colors.text }]}>{selectedControl.monitoringProcedure}</Text>
                        <View style={[styles.frequencyBox, { backgroundColor: colors.background, marginTop: 10 }]}>
                          <Clock size={14} color={colors.primary} />
                          <Text style={[styles.frequencyText, { color: colors.text }]}>
                            Frequency: {selectedControl.monitoringFrequency}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Recent Monitoring Records</Text>
                      {selectedControl.recentMonitoring.length > 0 ? (
                        selectedControl.recentMonitoring.map(record => (
                          <View
                            key={record.id}
                            style={[
                              styles.monitoringRecord,
                              {
                                backgroundColor: colors.surface,
                                borderColor: record.withinLimits ? '#10B981' : '#EF4444',
                                borderLeftWidth: 3,
                              },
                            ]}
                          >
                            <View style={styles.recordHeader}>
                              <View style={styles.recordDateTime}>
                                <Calendar size={12} color={colors.textTertiary} />
                                <Text style={[styles.recordDate, { color: colors.text }]}>{record.date}</Text>
                                <Clock size={12} color={colors.textTertiary} />
                                <Text style={[styles.recordTime, { color: colors.textSecondary }]}>{record.time}</Text>
                              </View>
                              <View style={[
                                styles.resultBadge,
                                { backgroundColor: record.withinLimits ? '#10B981' + '15' : '#EF4444' + '15' }
                              ]}>
                                {record.withinLimits ? (
                                  <CheckCircle size={12} color="#10B981" />
                                ) : (
                                  <AlertTriangle size={12} color="#EF4444" />
                                )}
                                <Text style={[
                                  styles.resultText,
                                  { color: record.withinLimits ? '#10B981' : '#EF4444' }
                                ]}>
                                  {record.withinLimits ? 'Pass' : 'Fail'}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.recordResult, { color: colors.text }]}>Result: {record.result}</Text>
                            <Text style={[styles.recordBy, { color: colors.textSecondary }]}>By: {record.monitoredBy}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={[styles.emptyRecords, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.emptyRecordsText, { color: colors.textSecondary }]}>
                            No monitoring records yet
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {activeTab === 'verification' && (
                    <>
                      <View style={[styles.verificationSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.verificationRow}>
                          <Text style={[styles.verificationLabel, { color: colors.textSecondary }]}>Last Verification</Text>
                          <Text style={[styles.verificationValue, { color: colors.text }]}>
                            {selectedControl.lastVerification || 'Not yet verified'}
                          </Text>
                        </View>
                        <View style={styles.verificationRow}>
                          <Text style={[styles.verificationLabel, { color: colors.textSecondary }]}>Next Verification</Text>
                          <Text style={[styles.verificationValue, { color: colors.text }]}>
                            {selectedControl.nextVerification}
                          </Text>
                        </View>
                        <View style={styles.verificationRow}>
                          <Text style={[styles.verificationLabel, { color: colors.textSecondary }]}>Status</Text>
                          <View style={[styles.verificationBadge, { backgroundColor: VERIFICATION_CONFIG[selectedControl.verificationStatus].color + '15' }]}>
                            <Text style={[styles.verificationText, { color: VERIFICATION_CONFIG[selectedControl.verificationStatus].color }]}>
                              {VERIFICATION_CONFIG[selectedControl.verificationStatus].label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Verification Activities</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedControl.verificationActivities.map((activity, index) => (
                          <View key={index} style={styles.activityItem}>
                            <CheckCircle size={14} color="#10B981" />
                            <Text style={[styles.activityText, { color: colors.text }]}>{activity}</Text>
                          </View>
                        ))}
                        {selectedControl.verificationFrequency && (
                          <View style={[styles.frequencyBox, { backgroundColor: colors.background, marginTop: 10 }]}>
                            <Clock size={14} color={colors.primary} />
                            <Text style={[styles.frequencyText, { color: colors.text }]}>
                              {selectedControl.verificationFrequency}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Records Maintained</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedControl.recordsKept.map((record, index) => (
                          <View key={index} style={styles.recordItem}>
                            <Text style={[styles.recordItemText, { color: colors.text }]}>• {record}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.bottomPadding} />
                </ScrollView>
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterRow: { marginBottom: 16 },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  controlCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  controlHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  controlInfo: { flex: 1 },
  controlType: { fontSize: 11, fontWeight: '600' as const, marginBottom: 2 },
  controlName: { fontSize: 15, fontWeight: '600' as const },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  controlDescription: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  criticalLimitsBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  criticalLimitsLabel: { fontSize: 11 },
  criticalLimitsText: { flex: 1, fontSize: 12, fontWeight: '500' as const },
  controlMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  metaText: { fontSize: 11 },
  verificationBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verificationText: { fontSize: 10, fontWeight: '600' as const },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8, marginTop: 16 },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  typeGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  typeCard: {
    width: '48%' as const,
    flexGrow: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 8,
  },
  typeLabel: { fontSize: 11, fontWeight: '500' as const, textAlign: 'center' as const },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  detailHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  detailType: { fontSize: 12, fontWeight: '600' as const },
  detailName: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, marginTop: 4 },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  detailText: { fontSize: 14, lineHeight: 20 },
  criticalCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  criticalText: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  personRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  personName: { fontSize: 15, fontWeight: '600' as const },
  frequencyBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  frequencyText: { fontSize: 13, fontWeight: '500' as const },
  monitoringRecord: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recordHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  recordDateTime: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  recordDate: { fontSize: 13, fontWeight: '500' as const },
  recordTime: { fontSize: 12, marginLeft: 8 },
  resultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  resultText: { fontSize: 11, fontWeight: '600' as const },
  recordResult: { fontSize: 14, fontWeight: '500' as const, marginBottom: 4 },
  recordBy: { fontSize: 12 },
  emptyRecords: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyRecordsText: { fontSize: 13 },
  verificationSummary: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  verificationRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  verificationLabel: { fontSize: 13 },
  verificationValue: { fontSize: 13, fontWeight: '500' as const },
  activityItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  activityText: { flex: 1, fontSize: 13 },
  recordItem: { marginBottom: 4 },
  recordItemText: { fontSize: 13 },
});
