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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  AlertOctagon,
  ArrowLeft,
  Plus,
  Search,
  X,
  Calendar,
  MapPin,
  Clock,
  User,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Phone,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SpillReportEntry {
  id: string;
  incidentDate: string;
  incidentTime: string;
  reportedBy: string;
  chemicalName: string;
  estimatedQuantity: string;
  unit: string;
  spillLocation: string;
  locationDetails: string;
  causeOfSpill: string;
  surfaceAffected: string[];
  containmentActions: string[];
  cleanupActions: string[];
  ppeUsed: string[];
  wasteDisposal: string;
  injuriesReported: boolean;
  injuryDetails: string;
  environmentalImpact: boolean;
  impactDetails: string;
  reportableSpill: boolean;
  agenciesNotified: string[];
  rootCause: string;
  correctiveActions: string;
  status: 'active' | 'cleanup_in_progress' | 'cleanup_complete' | 'investigation' | 'closed';
  completedBy: string;
  completedDate: string;
}

const INITIAL_REPORTS: SpillReportEntry[] = [
  {
    id: '1',
    incidentDate: '2024-12-18',
    incidentTime: '14:30',
    reportedBy: 'John Martinez',
    chemicalName: 'Sodium Hypochlorite 12.5%',
    estimatedQuantity: '5',
    unit: 'gallons',
    spillLocation: 'Sanitation Room A',
    locationDetails: 'Near chemical dispensing station, concrete floor with drain',
    causeOfSpill: 'Hose connection failure during transfer',
    surfaceAffected: ['Concrete floor', 'Floor drain'],
    containmentActions: ['Area cordoned off', 'Absorbent applied', 'Drain blocked'],
    cleanupActions: ['Absorbed with spill pillows', 'Neutralized with soda ash', 'Area rinsed'],
    ppeUsed: ['Chemical goggles', 'Nitrile gloves', 'Chemical apron', 'Rubber boots'],
    wasteDisposal: 'Collected in hazardous waste drum for proper disposal',
    injuriesReported: false,
    injuryDetails: '',
    environmentalImpact: false,
    impactDetails: '',
    reportableSpill: false,
    agenciesNotified: [],
    rootCause: 'Worn hose fitting not identified during routine inspection',
    correctiveActions: 'Replace all transfer hoses; add fitting inspection to weekly checklist',
    status: 'closed',
    completedBy: 'Sarah Williams',
    completedDate: '2024-12-18',
  },
  {
    id: '2',
    incidentDate: '2024-12-20',
    incidentTime: '09:15',
    reportedBy: 'Maria Garcia',
    chemicalName: 'Peracetic Acid 15%',
    estimatedQuantity: '2',
    unit: 'gallons',
    spillLocation: 'Production Line 3',
    locationDetails: 'Sanitizer application area, stainless steel and epoxy floor',
    causeOfSpill: 'Container dropped during handling',
    surfaceAffected: ['Epoxy floor', 'Equipment base'],
    containmentActions: ['Immediate evacuation of area', 'Ventilation increased'],
    cleanupActions: ['In progress - using PAA-specific absorbent'],
    ppeUsed: ['Full face respirator', 'Chemical suit', 'Nitrile gloves'],
    wasteDisposal: 'Pending cleanup completion',
    injuriesReported: false,
    injuryDetails: '',
    environmentalImpact: false,
    impactDetails: '',
    reportableSpill: false,
    agenciesNotified: [],
    rootCause: 'Investigation in progress',
    correctiveActions: 'Pending investigation',
    status: 'cleanup_in_progress',
    completedBy: '',
    completedDate: '',
  },
];

const SPILL_LOCATIONS = [
  'Production Line 1',
  'Production Line 2',
  'Production Line 3',
  'Sanitation Room A',
  'Sanitation Room B',
  'Chemical Storage',
  'Maintenance Shop',
  'Loading Dock',
  'Warehouse',
  'Outside - Grounds',
];

const SURFACES = [
  'Concrete floor',
  'Epoxy floor',
  'Stainless steel',
  'Floor drain',
  'Equipment',
  'Soil/ground',
  'Water body',
];

const CONTAINMENT_ACTIONS = [
  'Area cordoned off',
  'Absorbent applied',
  'Drain blocked',
  'Area evacuated',
  'Ventilation increased',
  'Spill contained with berms',
  'Emergency response called',
];

const CLEANUP_ACTIONS = [
  'Absorbed with spill pillows',
  'Absorbed with granular absorbent',
  'Neutralized',
  'Area rinsed',
  'Vacuumed with wet vac',
  'Professional cleanup service',
];

const PPE_OPTIONS = [
  'Safety glasses',
  'Chemical goggles',
  'Face shield',
  'Nitrile gloves',
  'Chemical-resistant gloves',
  'Chemical apron',
  'Chemical suit',
  'Rubber boots',
  'Half-face respirator',
  'Full face respirator',
  'SCBA',
];

const AGENCIES = [
  'EPA',
  'State Environmental Agency',
  'Local Fire Department',
  'OSHA',
  'National Response Center',
  'Local POTW',
];

export default function SpillReportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<SpillReportEntry[]>(INITIAL_REPORTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReport, setEditingReport] = useState<SpillReportEntry | null>(null);

  const [formData, setFormData] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().slice(0, 5),
    reportedBy: '',
    chemicalName: '',
    estimatedQuantity: '',
    unit: 'gallons',
    spillLocation: '',
    locationDetails: '',
    causeOfSpill: '',
    surfaceAffected: [] as string[],
    containmentActions: [] as string[],
    cleanupActions: [] as string[],
    ppeUsed: [] as string[],
    wasteDisposal: '',
    injuriesReported: false,
    injuryDetails: '',
    environmentalImpact: false,
    impactDetails: '',
    reportableSpill: false,
    agenciesNotified: [] as string[],
    rootCause: '',
    correctiveActions: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const resetForm = () => {
    setFormData({
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: new Date().toTimeString().slice(0, 5),
      reportedBy: '',
      chemicalName: '',
      estimatedQuantity: '',
      unit: 'gallons',
      spillLocation: '',
      locationDetails: '',
      causeOfSpill: '',
      surfaceAffected: [],
      containmentActions: [],
      cleanupActions: [],
      ppeUsed: [],
      wasteDisposal: '',
      injuriesReported: false,
      injuryDetails: '',
      environmentalImpact: false,
      impactDetails: '',
      reportableSpill: false,
      agenciesNotified: [],
      rootCause: '',
      correctiveActions: '',
    });
    setEditingReport(null);
  };

  const handleAddReport = () => {
    if (!formData.chemicalName.trim() || !formData.spillLocation) {
      Alert.alert('Required Fields', 'Please enter chemical name and spill location.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newReport: SpillReportEntry = {
      id: editingReport?.id || Date.now().toString(),
      incidentDate: formData.incidentDate,
      incidentTime: formData.incidentTime,
      reportedBy: formData.reportedBy || 'Current User',
      chemicalName: formData.chemicalName,
      estimatedQuantity: formData.estimatedQuantity,
      unit: formData.unit,
      spillLocation: formData.spillLocation,
      locationDetails: formData.locationDetails,
      causeOfSpill: formData.causeOfSpill,
      surfaceAffected: formData.surfaceAffected,
      containmentActions: formData.containmentActions,
      cleanupActions: formData.cleanupActions,
      ppeUsed: formData.ppeUsed,
      wasteDisposal: formData.wasteDisposal,
      injuriesReported: formData.injuriesReported,
      injuryDetails: formData.injuryDetails,
      environmentalImpact: formData.environmentalImpact,
      impactDetails: formData.impactDetails,
      reportableSpill: formData.reportableSpill,
      agenciesNotified: formData.agenciesNotified,
      rootCause: formData.rootCause,
      correctiveActions: formData.correctiveActions,
      status: editingReport?.status || 'active',
      completedBy: editingReport?.completedBy || '',
      completedDate: editingReport?.completedDate || '',
    };

    if (editingReport) {
      setReports(prev => prev.map(r => r.id === editingReport.id ? newReport : r));
    } else {
      setReports(prev => [newReport, ...prev]);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditReport = (report: SpillReportEntry) => {
    setEditingReport(report);
    setFormData({
      incidentDate: report.incidentDate,
      incidentTime: report.incidentTime,
      reportedBy: report.reportedBy,
      chemicalName: report.chemicalName,
      estimatedQuantity: report.estimatedQuantity,
      unit: report.unit,
      spillLocation: report.spillLocation,
      locationDetails: report.locationDetails,
      causeOfSpill: report.causeOfSpill,
      surfaceAffected: report.surfaceAffected,
      containmentActions: report.containmentActions,
      cleanupActions: report.cleanupActions,
      ppeUsed: report.ppeUsed,
      wasteDisposal: report.wasteDisposal,
      injuriesReported: report.injuriesReported,
      injuryDetails: report.injuryDetails,
      environmentalImpact: report.environmentalImpact,
      impactDetails: report.impactDetails,
      reportableSpill: report.reportableSpill,
      agenciesNotified: report.agenciesNotified,
      rootCause: report.rootCause,
      correctiveActions: report.correctiveActions,
    });
    setShowAddModal(true);
  };

  const handleUpdateStatus = (id: string, newStatus: SpillReportEntry['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              completedBy: newStatus === 'closed' ? 'Current User' : r.completedBy,
              completedDate: newStatus === 'closed' ? new Date().toISOString().split('T')[0] : r.completedDate,
            }
          : r
      )
    );
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

  const filteredReports = reports.filter(report =>
    report.chemicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.spillLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#EF4444';
      case 'cleanup_in_progress': return '#F59E0B';
      case 'cleanup_complete': return '#3B82F6';
      case 'investigation': return '#8B5CF6';
      case 'closed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'cleanup_in_progress': return 'Cleanup In Progress';
      case 'cleanup_complete': return 'Cleanup Complete';
      case 'investigation': return 'Under Investigation';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Spill Report',
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
          placeholder="Search spill reports..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
            <AlertOctagon size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {reports.filter(r => r.status === 'active' || r.status === 'cleanup_in_progress').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#EF4444' }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
            <FileText size={18} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
              {reports.filter(r => r.status === 'investigation').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>Investigating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {reports.filter(r => r.status === 'closed').length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Closed</Text>
          </View>
        </View>

        {filteredReports.map((report) => (
          <Pressable
            key={report.id}
            style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleEditReport(report)}
          >
            <View style={styles.reportHeader}>
              <View style={styles.reportTitleRow}>
                <AlertOctagon size={20} color="#EF4444" />
                <Text style={[styles.reportTitle, { color: colors.text }]} numberOfLines={1}>
                  {report.chemicalName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                  {getStatusLabel(report.status)}
                </Text>
              </View>
            </View>

            <View style={styles.reportDetails}>
              <View style={styles.detailRow}>
                <Droplets size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {report.estimatedQuantity} {report.unit}
                </Text>
                <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {report.spillLocation}
                </Text>
              </View>
            </View>

            {report.causeOfSpill && (
              <View style={styles.causeRow}>
                <Text style={[styles.causeLabel, { color: colors.textSecondary }]}>Cause:</Text>
                <Text style={[styles.causeText, { color: colors.text }]} numberOfLines={1}>
                  {report.causeOfSpill}
                </Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              {report.containmentActions.slice(0, 2).map((action, idx) => (
                <View key={idx} style={[styles.actionBadge, { backgroundColor: '#3B82F615' }]}>
                  <Text style={[styles.actionText, { color: '#3B82F6' }]}>{action}</Text>
                </View>
              ))}
              {report.containmentActions.length > 2 && (
                <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                  +{report.containmentActions.length - 2}
                </Text>
              )}
            </View>

            {(report.injuriesReported || report.environmentalImpact || report.reportableSpill) && (
              <View style={styles.flagsRow}>
                {report.injuriesReported && (
                  <View style={[styles.flagBadge, { backgroundColor: '#EF444420' }]}>
                    <Users size={12} color="#EF4444" />
                    <Text style={[styles.flagText, { color: '#EF4444' }]}>Injury</Text>
                  </View>
                )}
                {report.environmentalImpact && (
                  <View style={[styles.flagBadge, { backgroundColor: '#F59E0B20' }]}>
                    <AlertTriangle size={12} color="#F59E0B" />
                    <Text style={[styles.flagText, { color: '#F59E0B' }]}>Environmental</Text>
                  </View>
                )}
                {report.reportableSpill && (
                  <View style={[styles.flagBadge, { backgroundColor: '#8B5CF620' }]}>
                    <Phone size={12} color="#8B5CF6" />
                    <Text style={[styles.flagText, { color: '#8B5CF6' }]}>Reportable</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.reportFooter}>
              <View style={styles.dateInfo}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {report.incidentDate} {report.incidentTime}
                </Text>
              </View>
              <View style={styles.reporterInfo}>
                <User size={12} color={colors.textSecondary} />
                <Text style={[styles.reporterText, { color: colors.textSecondary }]}>
                  {report.reportedBy}
                </Text>
              </View>
            </View>

            {report.status !== 'closed' && (
              <View style={styles.actionButtons}>
                {report.status === 'active' && (
                  <Pressable
                    style={[styles.statusButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => handleUpdateStatus(report.id, 'cleanup_in_progress')}
                  >
                    <Text style={styles.statusButtonText}>Start Cleanup</Text>
                  </Pressable>
                )}
                {report.status === 'cleanup_in_progress' && (
                  <Pressable
                    style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(report.id, 'cleanup_complete')}
                  >
                    <Text style={styles.statusButtonText}>Cleanup Complete</Text>
                  </Pressable>
                )}
                {(report.status === 'cleanup_complete' || report.status === 'investigation') && (
                  <Pressable
                    style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateStatus(report.id, 'closed')}
                  >
                    <Text style={styles.statusButtonText}>Close Report</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Pressable>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

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
              {editingReport ? 'Edit Spill Report' : 'New Spill Report'}
            </Text>
            <Pressable onPress={handleAddReport}>
              <Text style={[styles.saveButton, { color: '#EF4444' }]}>Save</Text>
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemical Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter chemical name"
              placeholderTextColor={colors.textSecondary}
              value={formData.chemicalName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, chemicalName: text }))}
            />

            <View style={styles.twoColumn}>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Amount"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.estimatedQuantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedQuantity: text }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Reported By</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.reportedBy}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, reportedBy: text }))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Spill Location *</Text>
            <View style={styles.chipContainer}>
              {SPILL_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.spillLocation === loc ? '#EF444420' : colors.surface,
                      borderColor: formData.spillLocation === loc ? '#EF4444' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, spillLocation: loc }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.spillLocation === loc ? '#EF4444' : colors.textSecondary },
                  ]}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Cause of Spill</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe what caused the spill..."
              placeholderTextColor={colors.textSecondary}
              value={formData.causeOfSpill}
              onChangeText={(text) => setFormData(prev => ({ ...prev, causeOfSpill: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Surfaces Affected</Text>
            <View style={styles.chipContainer}>
              {SURFACES.map((surface) => (
                <Pressable
                  key={surface}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.surfaceAffected.includes(surface) ? '#F59E0B20' : colors.surface,
                      borderColor: formData.surfaceAffected.includes(surface) ? '#F59E0B' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('surfaceAffected', surface)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.surfaceAffected.includes(surface) ? '#F59E0B' : colors.textSecondary },
                  ]}>
                    {surface}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Containment Actions</Text>
            <View style={styles.chipContainer}>
              {CONTAINMENT_ACTIONS.map((action) => (
                <Pressable
                  key={action}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.containmentActions.includes(action) ? '#3B82F620' : colors.surface,
                      borderColor: formData.containmentActions.includes(action) ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('containmentActions', action)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.containmentActions.includes(action) ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {action}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>PPE Used</Text>
            <View style={styles.chipContainer}>
              {PPE_OPTIONS.map((ppe) => (
                <Pressable
                  key={ppe}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.ppeUsed.includes(ppe) ? '#10B98120' : colors.surface,
                      borderColor: formData.ppeUsed.includes(ppe) ? '#10B981' : colors.border,
                    },
                  ]}
                  onPress={() => toggleArrayItem('ppeUsed', ppe)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.ppeUsed.includes(ppe) ? '#10B981' : colors.textSecondary },
                  ]}>
                    {ppe}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Injuries Reported</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.injuriesReported ? '#EF4444' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, injuriesReported: !prev.injuriesReported }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.injuriesReported ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Environmental Impact</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.environmentalImpact ? '#F59E0B' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, environmentalImpact: !prev.environmentalImpact }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.environmentalImpact ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Reportable Spill</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.reportableSpill ? '#8B5CF6' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, reportableSpill: !prev.reportableSpill }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.reportableSpill ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            {formData.reportableSpill && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Agencies Notified</Text>
                <View style={styles.chipContainer}>
                  {AGENCIES.map((agency) => (
                    <Pressable
                      key={agency}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: formData.agenciesNotified.includes(agency) ? '#8B5CF620' : colors.surface,
                          borderColor: formData.agenciesNotified.includes(agency) ? '#8B5CF6' : colors.border,
                        },
                      ]}
                      onPress={() => toggleArrayItem('agenciesNotified', agency)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: formData.agenciesNotified.includes(agency) ? '#8B5CF6' : colors.textSecondary },
                      ]}>
                        {agency}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Root Cause</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Identify root cause..."
              placeholderTextColor={colors.textSecondary}
              value={formData.rootCause}
              onChangeText={(text) => setFormData(prev => ({ ...prev, rootCause: text }))}
              multiline
              numberOfLines={2}
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
              numberOfLines={2}
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
  reportCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  reportTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 8,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  reportDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 2,
  },
  causeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  causeLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  causeText: {
    fontSize: 12,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 10,
  },
  moreText: {
    fontSize: 10,
    alignSelf: 'center' as const,
  },
  flagsRow: {
    flexDirection: 'row' as const,
    gap: 8,
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
  reportFooter: {
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
    minHeight: 60,
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
