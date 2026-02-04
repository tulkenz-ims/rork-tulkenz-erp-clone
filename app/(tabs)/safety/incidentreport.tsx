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
  Plus,
  X,
  AlertTriangle,
  Clock,
  Search,
  ChevronRight,
  Calendar,
  MapPin,
  Camera,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSafety, SafetyIncident, IncidentType, IncidentSeverity, IncidentStatus } from '@/hooks/useSupabaseSafety';
import * as Haptics from 'expo-haptics';

const TYPE_CONFIG: Record<IncidentType, { label: string; color: string; bgColor: string }> = {
  'injury': { label: 'Injury', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  'illness': { label: 'Illness', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  'near_miss': { label: 'Near-Miss', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  'property_damage': { label: 'Property Damage', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  'environmental': { label: 'Environmental', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  'vehicle': { label: 'Vehicle', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  'other': { label: 'Other', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string }> = {
  minor: { label: 'Minor', color: '#10B981' },
  moderate: { label: 'Moderate', color: '#F59E0B' },
  serious: { label: 'Serious', color: '#EF4444' },
  critical: { label: 'Critical', color: '#DC2626' },
  fatality: { label: 'Fatality', color: '#7C2D12' },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  reported: { label: 'Reported', color: '#3B82F6' },
  under_investigation: { label: 'Investigating', color: '#F59E0B' },
  pending_review: { label: 'Pending Review', color: '#8B5CF6' },
  closed: { label: 'Closed', color: '#10B981' },
  reopened: { label: 'Reopened', color: '#EF4444' },
};

const LOCATIONS = [
  'Production Line A', 'Production Line B', 'Warehouse - Aisle 1', 'Warehouse - Aisle 2', 
  'Warehouse - Aisle 3', 'Loading Dock', 'Receiving Area', 'Chemical Storage', 
  'Break Room', 'Office Area', 'Parking Lot', 'Maintenance Shop', 'Cold Storage'
];

const EMPLOYEES = [
  'James Wilson', 'Mike Chen', 'Sarah Brown', 'Tom Rodriguez', 'Maria Santos',
  'John Martinez', 'Robert Davis', 'Amy Garcia', 'Lisa Brown', 'David Kim'
];

export default function IncidentReportScreen() {
  const { colors } = useTheme();
  const { 
    incidents, 
    isLoading, 
    createIncident, 
    updateIncident,
    generateIncidentNumber,
    refetch 
  } = useSupabaseSafety();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<IncidentType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newIncident, setNewIncident] = useState({
    location: '',
    incident_type: 'near_miss' as IncidentType,
    description: '',
    peopleInvolved: [] as string[],
    witnesses: [] as string[],
    immediate_actions: '',
    severity: 'minor' as IncidentSeverity,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = !searchQuery || 
        inc.incident_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inc.location || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || inc.incident_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [incidents, searchQuery, typeFilter]);

  const stats = useMemo(() => ({
    total: incidents.length,
    injury: incidents.filter(i => i.incident_type === 'injury').length,
    nearMiss: incidents.filter(i => i.incident_type === 'near_miss').length,
    investigating: incidents.filter(i => i.status === 'under_investigation' || i.status === 'reported').length,
  }), [incidents]);

  const handleAddIncident = useCallback(async () => {
    if (!newIncident.location || !newIncident.description) {
      Alert.alert('Required Fields', 'Please fill in location and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const incidentNumber = generateIncidentNumber();
      
      await createIncident({
        incident_number: incidentNumber,
        incident_type: newIncident.incident_type,
        severity: newIncident.severity,
        status: 'reported',
        facility_id: null,
        location: newIncident.location,
        department_code: null,
        department_name: null,
        incident_date: now.toISOString().split('T')[0],
        incident_time: now.toTimeString().slice(0, 5),
        reported_date: now.toISOString().split('T')[0],
        reported_by: 'Current User',
        reported_by_id: null,
        description: newIncident.description,
        immediate_actions: newIncident.immediate_actions || null,
        injured_employee_id: null,
        injured_employee_name: newIncident.peopleInvolved.length > 0 ? newIncident.peopleInvolved[0] : null,
        injury_type: null,
        body_part: null,
        medical_treatment: null,
        days_away: null,
        restricted_days: null,
        witnesses: newIncident.witnesses,
        root_cause: null,
        contributing_factors: [],
        corrective_actions: null,
        preventive_actions: null,
        osha_recordable: false,
        osha_form_completed: false,
        investigation_lead: null,
        investigation_lead_id: null,
        investigation_date: null,
        investigation_notes: null,
        closed_date: null,
        closed_by: null,
        closed_by_id: null,
        attachments: [],
        notes: null,
      });

      setShowAddModal(false);
      setNewIncident({
        location: '',
        incident_type: 'near_miss',
        description: '',
        peopleInvolved: [],
        witnesses: [],
        immediate_actions: '',
        severity: 'minor',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[Incident] Created:', incidentNumber);
    } catch (error) {
      console.error('[Incident] Create error:', error);
      Alert.alert('Error', 'Failed to create incident report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newIncident, createIncident, generateIncidentNumber]);

  const handleStatusChange = useCallback(async (incident: SafetyIncident, newStatus: IncidentStatus) => {
    try {
      const updates: Partial<SafetyIncident> & { id: string } = {
        id: incident.id,
        status: newStatus,
      };

      if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString().split('T')[0];
        updates.closed_by = 'Current User';
      }

      await updateIncident(updates);
      
      if (selectedIncident?.id === incident.id) {
        setSelectedIncident({ ...selectedIncident, status: newStatus });
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[Incident] Status changed:', incident.incident_number, '->', newStatus);
    } catch (error) {
      console.error('[Incident] Status change error:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  }, [updateIncident, selectedIncident]);

  const togglePerson = useCallback((person: string, field: 'peopleInvolved' | 'witnesses') => {
    setNewIncident(prev => {
      const list = prev[field];
      if (list.includes(person)) {
        return { ...prev, [field]: list.filter(p => p !== person) };
      }
      return { ...prev, [field]: [...list, person] };
    });
  }, []);

  const openDetail = useCallback((incident: SafetyIncident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (isLoading && incidents.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading incidents...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={[styles.iconContainer, { backgroundColor: '#DC2626' + '20' }]}>
            <AlertTriangle size={28} color="#DC2626" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Incident Reports</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Document workplace injuries, near-misses, and safety incidents
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.injury}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Injuries</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.nearMiss}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Near-Miss</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.investigating}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search incidents..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilters}>
          <Pressable
            style={[
              styles.typeFilter,
              { borderColor: !typeFilter ? colors.primary : colors.border },
              !typeFilter && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setTypeFilter(null)}
          >
            <Text style={[styles.typeFilterText, { color: !typeFilter ? colors.primary : colors.text }]}>All</Text>
          </Pressable>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <Pressable
              key={key}
              style={[
                styles.typeFilter,
                { borderColor: typeFilter === key ? config.color : colors.border },
                typeFilter === key && { backgroundColor: config.bgColor },
              ]}
              onPress={() => setTypeFilter(typeFilter === key ? null : key as IncidentType)}
            >
              <Text style={[styles.typeFilterText, { color: typeFilter === key ? config.color : colors.text }]}>
                {config.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Incidents ({filteredIncidents.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#DC2626' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Report</Text>
          </Pressable>
        </View>

        {filteredIncidents.map(incident => {
          const typeConfig = TYPE_CONFIG[incident.incident_type] || TYPE_CONFIG.other;
          const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.reported;
          
          return (
            <Pressable
              key={incident.id}
              style={({ pressed }) => [
                styles.incidentCard,
                { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: typeConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(incident)}
            >
              <View style={styles.incidentHeader}>
                <View style={styles.incidentTitleRow}>
                  <Text style={[styles.incidentNumber, { color: colors.text }]}>{incident.incident_number}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
                    <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <Text style={[styles.incidentDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {incident.description}
              </Text>

              <View style={styles.incidentMeta}>
                <View style={styles.metaItem}>
                  <Calendar size={12} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]}>{incident.incident_date}</Text>
                </View>
                {incident.incident_time && (
                  <View style={styles.metaItem}>
                    <Clock size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>{incident.incident_time}</Text>
                  </View>
                )}
                {incident.location && (
                  <View style={styles.metaItem}>
                    <MapPin size={12} color={colors.textTertiary} />
                    <Text style={[styles.metaText, { color: colors.textTertiary }]}>{incident.location}</Text>
                  </View>
                )}
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {filteredIncidents.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AlertTriangle size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Incidents</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No incidents matching your criteria
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report Incident</Text>
            <Pressable onPress={handleAddIncident} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={[styles.saveButton, { color: '#DC2626' }]}>Submit</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Incident Type *</Text>
            <View style={styles.typeOptions}>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.typeOption,
                    { borderColor: newIncident.incident_type === key ? config.color : colors.border },
                    newIncident.incident_type === key && { backgroundColor: config.bgColor },
                  ]}
                  onPress={() => setNewIncident(prev => ({ ...prev, incident_type: key as IncidentType }))}
                >
                  <Text style={[
                    styles.typeOptionText,
                    { color: newIncident.incident_type === key ? config.color : colors.text },
                  ]}>{config.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Severity *</Text>
            <View style={styles.severityOptions}>
              {Object.entries(SEVERITY_CONFIG).slice(0, 4).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.severityOption,
                    { borderColor: newIncident.severity === key ? config.color : colors.border },
                    newIncident.severity === key && { backgroundColor: config.color + '20' },
                  ]}
                  onPress={() => setNewIncident(prev => ({ ...prev, severity: key as IncidentSeverity }))}
                >
                  <Text style={[
                    styles.severityText,
                    { color: newIncident.severity === key ? config.color : colors.text },
                  ]}>{config.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {LOCATIONS.map(loc => (
                <Pressable
                  key={loc}
                  style={[
                    styles.optionButton,
                    { borderColor: newIncident.location === loc ? colors.primary : colors.border },
                    newIncident.location === loc && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewIncident(prev => ({ ...prev, location: loc }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newIncident.location === loc ? colors.primary : colors.text },
                  ]}>{loc}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe what happened..."
              placeholderTextColor={colors.textTertiary}
              value={newIncident.description}
              onChangeText={(text) => setNewIncident(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>People Involved</Text>
            <View style={styles.peopleGrid}>
              {EMPLOYEES.map(person => (
                <Pressable
                  key={person}
                  style={[
                    styles.personChip,
                    { borderColor: newIncident.peopleInvolved.includes(person) ? '#EF4444' : colors.border },
                    newIncident.peopleInvolved.includes(person) && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                  ]}
                  onPress={() => togglePerson(person, 'peopleInvolved')}
                >
                  <Text style={[
                    styles.personChipText,
                    { color: newIncident.peopleInvolved.includes(person) ? '#EF4444' : colors.text },
                  ]}>{person}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Witnesses</Text>
            <View style={styles.peopleGrid}>
              {EMPLOYEES.map(person => (
                <Pressable
                  key={person}
                  style={[
                    styles.personChip,
                    { borderColor: newIncident.witnesses.includes(person) ? '#3B82F6' : colors.border },
                    newIncident.witnesses.includes(person) && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
                  ]}
                  onPress={() => togglePerson(person, 'witnesses')}
                >
                  <Text style={[
                    styles.personChipText,
                    { color: newIncident.witnesses.includes(person) ? '#3B82F6' : colors.text },
                  ]}>{person}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Immediate Actions Taken</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What immediate actions were taken..."
              placeholderTextColor={colors.textTertiary}
              value={newIncident.immediate_actions}
              onChangeText={(text) => setNewIncident(prev => ({ ...prev, immediate_actions: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable style={[styles.photoButton, { borderColor: colors.border }]}>
              <Camera size={20} color={colors.textSecondary} />
              <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>Add Photos</Text>
            </Pressable>

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedIncident?.incident_number}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedIncident && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                  <View style={[styles.typeBadge, { backgroundColor: (TYPE_CONFIG[selectedIncident.incident_type] || TYPE_CONFIG.other).bgColor }]}>
                    <Text style={[styles.typeText, { color: (TYPE_CONFIG[selectedIncident.incident_type] || TYPE_CONFIG.other).color }]}>
                      {(TYPE_CONFIG[selectedIncident.incident_type] || TYPE_CONFIG.other).label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_CONFIG[selectedIncident.status] || STATUS_CONFIG.reported).color + '20' }]}>
                    <Text style={[styles.statusText, { color: (STATUS_CONFIG[selectedIncident.status] || STATUS_CONFIG.reported).color }]}>
                      {(STATUS_CONFIG[selectedIncident.status] || STATUS_CONFIG.reported).label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Severity</Text>
                  <Text style={[styles.detailValue, { color: (SEVERITY_CONFIG[selectedIncident.severity] || SEVERITY_CONFIG.minor).color }]}>
                    {(SEVERITY_CONFIG[selectedIncident.severity] || SEVERITY_CONFIG.minor).label}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date/Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedIncident.incident_date}{selectedIncident.incident_time ? ` at ${selectedIncident.incident_time}` : ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedIncident.location || 'Not specified'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reported By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedIncident.reported_by}</Text>
                </View>
                {selectedIncident.osha_recordable && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>OSHA Recordable</Text>
                    <Text style={[styles.detailValue, { color: '#EF4444' }]}>Yes</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Description</Text>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailText, { color: colors.text }]}>{selectedIncident.description}</Text>
              </View>

              {selectedIncident.injured_employee_name && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    <Users size={14} color={colors.text} /> Injured Employee
                  </Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.personListItem, { color: colors.text }]}>• {selectedIncident.injured_employee_name}</Text>
                    {selectedIncident.injury_type && (
                      <Text style={[styles.personListItem, { color: colors.textSecondary }]}>
                        Injury: {selectedIncident.injury_type.replace('_', ' ')}
                      </Text>
                    )}
                    {selectedIncident.body_part && (
                      <Text style={[styles.personListItem, { color: colors.textSecondary }]}>
                        Body Part: {selectedIncident.body_part}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {selectedIncident.witnesses.length > 0 && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Witnesses</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {selectedIncident.witnesses.map((witness, i) => (
                      <Text key={i} style={[styles.personListItem, { color: colors.text }]}>• {witness}</Text>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Immediate Actions</Text>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {selectedIncident.immediate_actions || 'No immediate actions recorded'}
                </Text>
              </View>

              {selectedIncident.root_cause && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Root Cause</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailText, { color: colors.text }]}>{selectedIncident.root_cause}</Text>
                  </View>
                </>
              )}

              {selectedIncident.attachments.length > 0 && (
                <View style={[styles.photoInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Camera size={16} color={colors.textSecondary} />
                  <Text style={[styles.photoInfoText, { color: colors.textSecondary }]}>
                    {selectedIncident.attachments.length} attachment(s)
                  </Text>
                </View>
              )}

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Update Status</Text>
              <View style={styles.statusActions}>
                {(['reported', 'under_investigation', 'pending_review', 'closed'] as const).map(status => {
                  const config = STATUS_CONFIG[status];
                  const isActive = selectedIncident.status === status;
                  return (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusAction,
                        { 
                          borderColor: isActive ? config.color : colors.border,
                          backgroundColor: isActive ? config.color + '20' : colors.surface,
                        },
                      ]}
                      onPress={() => handleStatusChange(selectedIncident, status)}
                    >
                      <Text style={[styles.statusActionText, { color: isActive ? config.color : colors.text }]}>
                        {config.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
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
  typeFilters: { marginBottom: 16 },
  typeFilter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  typeFilterText: { fontSize: 13, fontWeight: '500' as const },
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
  incidentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  incidentHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  incidentTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  incidentNumber: { fontSize: 15, fontWeight: '600' as const },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typeText: { fontSize: 11, fontWeight: '600' as const },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  incidentDescription: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  incidentMeta: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  metaText: { fontSize: 11 },
  chevron: { position: 'absolute' as const, right: 14, top: '50%' },
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
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 10, marginTop: 16 },
  typeOptions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  typeOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: { fontSize: 13, fontWeight: '500' as const },
  severityOptions: { flexDirection: 'row' as const, gap: 8 },
  severityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  severityText: { fontSize: 12, fontWeight: '500' as const },
  horizontalOptions: { flexDirection: 'row' as const },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: { fontSize: 13, fontWeight: '500' as const },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  peopleGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  personChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  personChipText: { fontSize: 12, fontWeight: '500' as const },
  photoButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    marginTop: 20,
    gap: 8,
  },
  photoButtonText: { fontSize: 14, fontWeight: '500' as const },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 20, marginBottom: 10 },
  detailText: { fontSize: 14, lineHeight: 20 },
  personListItem: { fontSize: 14, marginBottom: 4 },
  photoInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  photoInfoText: { fontSize: 13 },
  statusActions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  statusAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusActionText: { fontSize: 13, fontWeight: '500' as const },
});
