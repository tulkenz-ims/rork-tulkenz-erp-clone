import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePeerSafetyAudits } from '@/hooks/useBehaviorSafety';
import {
  PeerSafetyAudit,
  AuditStatus,
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_COLORS,
} from '@/types/behaviorSafety';
import {
  Plus,
  Search,
  Filter,
  ClipboardCheck,
  MapPin,
  Users,
  CheckCircle,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react-native';

export default function PeerSafetyAuditScreen() {
  const { colors } = useTheme();
  const {
    audits,
    isRefetching,
    create,
    isCreating,
    generateNumber,
    refetch,
  } = usePeerSafetyAudits();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<PeerSafetyAudit | null>(null);
  const [formData, setFormData] = useState({
    area_audited: '',
    shift: '',
    auditor_name: '',
    audit_partner_name: '',
    audit_type: '',
    audit_duration_minutes: '',
    employees_observed: '',
    safe_observations: '',
    at_risk_observations: '',
    positive_findings: [] as string[],
    areas_for_improvement: [] as string[],
    immediate_hazards_found: false,
    hazards_corrected_immediately: false,
    hazard_details: '',
    recommendations: [] as string[],
    notes: '',
  });
  const [newFinding, setNewFinding] = useState('');
  const [newImprovement, setNewImprovement] = useState('');
  const [newRecommendation, setNewRecommendation] = useState('');

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const matchesSearch =
        a.audit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.area_audited.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.auditor_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [audits, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const completed = audits.filter(a => a.status === 'completed');
    const avgScore = completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.safety_score || 0), 0) / completed.length
      : 0;
    return {
      total: audits.length,
      completed: completed.length,
      avgScore: avgScore.toFixed(1),
      scheduled: audits.filter(a => a.status === 'scheduled').length,
    };
  }, [audits]);

  const resetForm = () => {
    setFormData({
      area_audited: '',
      shift: '',
      auditor_name: '',
      audit_partner_name: '',
      audit_type: '',
      audit_duration_minutes: '',
      employees_observed: '',
      safe_observations: '',
      at_risk_observations: '',
      positive_findings: [],
      areas_for_improvement: [],
      immediate_hazards_found: false,
      hazards_corrected_immediately: false,
      hazard_details: '',
      recommendations: [],
      notes: '',
    });
    setNewFinding('');
    setNewImprovement('');
    setNewRecommendation('');
  };

  const handleSubmit = async () => {
    if (!formData.area_audited.trim() || !formData.auditor_name.trim()) {
      Alert.alert('Error', 'Area audited and auditor name are required');
      return;
    }

    const safeObs = parseInt(formData.safe_observations) || 0;
    const atRiskObs = parseInt(formData.at_risk_observations) || 0;
    const totalObs = safeObs + atRiskObs;
    const score = totalObs > 0 ? (safeObs / totalObs) * 100 : null;

    try {
      const payload = {
        audit_number: generateNumber(),
        audit_date: new Date().toISOString().split('T')[0],
        facility_id: null,
        facility_name: null,
        department: null,
        area_audited: formData.area_audited,
        shift: formData.shift || null,
        auditor_id: null,
        auditor_name: formData.auditor_name,
        auditor_department: null,
        audit_partner_id: null,
        audit_partner_name: formData.audit_partner_name || null,
        audit_type: formData.audit_type || null,
        audit_duration_minutes: formData.audit_duration_minutes ? parseInt(formData.audit_duration_minutes) : null,
        employees_observed: formData.employees_observed ? parseInt(formData.employees_observed) : null,
        safe_observations: safeObs,
        at_risk_observations: atRiskObs,
        total_observations: totalObs,
        safety_score: score,
        checklist_items: [],
        findings: [],
        positive_findings: formData.positive_findings,
        areas_for_improvement: formData.areas_for_improvement,
        immediate_hazards_found: formData.immediate_hazards_found,
        hazards_corrected_immediately: formData.hazards_corrected_immediately,
        hazard_details: formData.hazard_details || null,
        recommendations: formData.recommendations,
        action_items: [],
        follow_up_required: formData.areas_for_improvement.length > 0 || formData.immediate_hazards_found,
        follow_up_date: null,
        status: 'completed' as AuditStatus,
        reviewed_by: null,
        reviewed_by_id: null,
        reviewed_date: null,
        attachments: [],
        photos: [],
        notes: formData.notes || null,
      };

      await create(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Peer safety audit recorded successfully');
    } catch (err) {
      console.error('Error creating audit:', err);
      Alert.alert('Error', 'Failed to record audit');
    }
  };

  const addItem = (field: 'positive_findings' | 'areas_for_improvement' | 'recommendations', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setter('');
    }
  };

  const removeItem = (field: 'positive_findings' | 'areas_for_improvement' | 'recommendations', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: colors.text,
    },
    filterButton: {
      width: 44,
      height: 44,
      backgroundColor: colors.surface,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#3B82F6',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    auditNumber: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    auditDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    cardBody: {
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    scoreLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    scoreValue: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    scorePercent: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    observationStats: {
      flexDirection: 'row',
      gap: 12,
    },
    observationStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewButtonText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 16,
    },
    formSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfWidth: {
      flex: 1,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 12,
    },
    switchLabel: {
      fontSize: 15,
      color: colors.text,
    },
    switchButton: {
      width: 50,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    switchKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
    },
    addItemRow: {
      flexDirection: 'row',
      gap: 8,
    },
    addItemInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    addItemButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    addItemButtonText: {
      color: '#fff',
      fontWeight: '600' as const,
    },
    itemList: {
      marginTop: 8,
      gap: 4,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    itemText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    removeItemButton: {
      padding: 4,
    },
    submitButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    detailSection: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 120,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    detailList: {
      marginTop: 8,
      gap: 4,
    },
    detailListItem: {
      fontSize: 14,
      color: colors.text,
      paddingLeft: 12,
    },
    filterModalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    filterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterOptionText: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    filterOptionSelected: {
      color: colors.primary,
      fontWeight: '600' as const,
    },
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return colors.textSecondary;
    if (score >= 90) return '#10B981';
    if (score >= 75) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B98120' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.avgScore}%</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#6B728020' }]}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.scheduled}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search audits..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {filteredAudits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ClipboardCheck size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Audits Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Conduct your first peer safety audit'}
            </Text>
          </View>
        ) : (
          filteredAudits.map(audit => (
            <TouchableOpacity
              key={audit.id}
              style={styles.card}
              onPress={() => {
                setSelectedAudit(audit);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditNumber}>{audit.audit_number}</Text>
                  <Text style={styles.auditDate}>
                    {new Date(audit.audit_date).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: AUDIT_STATUS_COLORS[audit.status] + '20' },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: AUDIT_STATUS_COLORS[audit.status] }]}
                  >
                    {AUDIT_STATUS_LABELS[audit.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{audit.area_audited}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Users size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Auditor: {audit.auditor_name}</Text>
                </View>
                {audit.audit_duration_minutes && (
                  <View style={styles.infoRow}>
                    <Clock size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{audit.audit_duration_minutes} minutes</Text>
                  </View>
                )}
              </View>

              {audit.safety_score !== null && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Safety Score</Text>
                  <Text style={[styles.scoreValue, { color: getScoreColor(audit.safety_score) }]}>
                    {audit.safety_score.toFixed(1)}
                  </Text>
                  <Text style={styles.scorePercent}>%</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.observationStats}>
                  <View style={styles.observationStat}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={{ fontSize: 13, color: '#10B981' }}>{audit.safe_observations}</Text>
                  </View>
                  <View style={styles.observationStat}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <Text style={{ fontSize: 13, color: '#EF4444' }}>{audit.at_risk_observations}</Text>
                  </View>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowFormModal(true);
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFormModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Peer Safety Audit</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Audit Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Area Audited *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.area_audited}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, area_audited: text }))}
                    placeholder="Enter area or department"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Shift</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.shift}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, shift: text }))}
                      placeholder="e.g., Day, Night"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Duration (min)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.audit_duration_minutes}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, audit_duration_minutes: text }))}
                      placeholder="30"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Auditor Information</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Auditor Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.auditor_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, auditor_name: text }))}
                      placeholder="Your name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Audit Partner</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.audit_partner_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, audit_partner_name: text }))}
                      placeholder="Partner name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Observation Counts</Text>
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Safe Observations</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.safe_observations}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, safe_observations: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>At-Risk Observations</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.at_risk_observations}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, at_risk_observations: text }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Employees Observed</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.employees_observed}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, employees_observed: text }))}
                    placeholder="Number of employees observed"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Positive Findings</Text>
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newFinding}
                    onChangeText={setNewFinding}
                    placeholder="Add positive finding..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addItem('positive_findings', newFinding, setNewFinding)}
                  >
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.positive_findings.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.positive_findings.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {item}</Text>
                        <TouchableOpacity
                          style={styles.removeItemButton}
                          onPress={() => removeItem('positive_findings', index)}
                        >
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Areas for Improvement</Text>
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newImprovement}
                    onChangeText={setNewImprovement}
                    placeholder="Add area for improvement..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addItem('areas_for_improvement', newImprovement, setNewImprovement)}
                  >
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.areas_for_improvement.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.areas_for_improvement.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {item}</Text>
                        <TouchableOpacity
                          style={styles.removeItemButton}
                          onPress={() => removeItem('areas_for_improvement', index)}
                        >
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Hazards</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, immediate_hazards_found: !prev.immediate_hazards_found }))}
                >
                  <Text style={styles.switchLabel}>Immediate Hazards Found?</Text>
                  <View style={[styles.switchButton, { backgroundColor: formData.immediate_hazards_found ? '#EF4444' : colors.border }]}>
                    <View style={[styles.switchKnob, { alignSelf: formData.immediate_hazards_found ? 'flex-end' : 'flex-start' }]} />
                  </View>
                </TouchableOpacity>

                {formData.immediate_hazards_found && (
                  <>
                    <TouchableOpacity
                      style={styles.switchRow}
                      onPress={() => setFormData(prev => ({ ...prev, hazards_corrected_immediately: !prev.hazards_corrected_immediately }))}
                    >
                      <Text style={styles.switchLabel}>Corrected Immediately?</Text>
                      <View style={[styles.switchButton, { backgroundColor: formData.hazards_corrected_immediately ? '#10B981' : colors.border }]}>
                        <View style={[styles.switchKnob, { alignSelf: formData.hazards_corrected_immediately ? 'flex-end' : 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Hazard Details</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={formData.hazard_details}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, hazard_details: text }))}
                        placeholder="Describe hazards found..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                      />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.addItemRow}>
                  <TextInput
                    style={styles.addItemInput}
                    value={newRecommendation}
                    onChangeText={setNewRecommendation}
                    placeholder="Add recommendation..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => addItem('recommendations', newRecommendation, setNewRecommendation)}
                  >
                    <Text style={styles.addItemButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.recommendations.length > 0 && (
                  <View style={styles.itemList}>
                    {formData.recommendations.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemText}>• {item}</Text>
                        <TouchableOpacity
                          style={styles.removeItemButton}
                          onPress={() => removeItem('recommendations', index)}
                        >
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Any additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Recording...' : 'Complete Audit'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedAudit && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Audit Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Audit #</Text>
                      <Text style={styles.detailValue}>{selectedAudit.audit_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedAudit.audit_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Area</Text>
                      <Text style={styles.detailValue}>{selectedAudit.area_audited}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: AUDIT_STATUS_COLORS[selectedAudit.status] }]}>
                        {AUDIT_STATUS_LABELS[selectedAudit.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Auditors</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Auditor</Text>
                      <Text style={styles.detailValue}>{selectedAudit.auditor_name}</Text>
                    </View>
                    {selectedAudit.audit_partner_name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Partner</Text>
                        <Text style={styles.detailValue}>{selectedAudit.audit_partner_name}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Results</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Safety Score</Text>
                      <Text style={[styles.detailValue, { color: getScoreColor(selectedAudit.safety_score) }]}>
                        {selectedAudit.safety_score?.toFixed(1) || 'N/A'}%
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Safe Obs.</Text>
                      <Text style={[styles.detailValue, { color: '#10B981' }]}>{selectedAudit.safe_observations}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>At-Risk Obs.</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>{selectedAudit.at_risk_observations}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Obs.</Text>
                      <Text style={styles.detailValue}>{selectedAudit.total_observations}</Text>
                    </View>
                  </View>

                  {selectedAudit.positive_findings.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Positive Findings</Text>
                      <View style={styles.detailList}>
                        {selectedAudit.positive_findings.map((finding, index) => (
                          <Text key={index} style={styles.detailListItem}>• {finding}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedAudit.areas_for_improvement.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Areas for Improvement</Text>
                      <View style={styles.detailList}>
                        {selectedAudit.areas_for_improvement.map((area, index) => (
                          <Text key={index} style={styles.detailListItem}>• {area}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedAudit.recommendations.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Recommendations</Text>
                      <View style={styles.detailList}>
                        {selectedAudit.recommendations.map((rec, index) => (
                          <Text key={index} style={styles.detailListItem}>• {rec}</Text>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setStatusFilter('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, statusFilter === 'all' && styles.filterOptionSelected]}>
                All Audits
              </Text>
              {statusFilter === 'all' && <CheckCircle size={20} color={colors.primary} />}
            </TouchableOpacity>

            {(Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={styles.filterOption}
                onPress={() => {
                  setStatusFilter(status);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.filterOptionText, statusFilter === status && styles.filterOptionSelected]}>
                  {AUDIT_STATUS_LABELS[status]}
                </Text>
                {statusFilter === status && <CheckCircle size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
