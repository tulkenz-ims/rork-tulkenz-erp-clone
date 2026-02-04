import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseQualityTasks, CrossDepartmentDoc } from '@/hooks/useSupabaseQualityTasks';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Shield,
  Droplets,
  XCircle,
  ChevronRight,
  Building2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

type DocType = 'equipment_work' | 'part_introduction' | 'maintenance' | 'sanitation' | 'other';

const DOC_TYPES: { value: DocType; label: string; color: string }[] = [
  { value: 'equipment_work', label: 'Equipment Work', color: '#3B82F6' },
  { value: 'maintenance', label: 'Maintenance', color: '#F59E0B' },
  { value: 'part_introduction', label: 'New Part', color: '#8B5CF6' },
  { value: 'sanitation', label: 'Sanitation', color: '#10B981' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

export default function EquipmentHygieneScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CrossDepartmentDoc | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const [newDoc, setNewDoc] = useState({
    doc_type: 'equipment_work' as DocType,
    equipment_name: '',
    location: '',
    work_performed: '',
    performed_by: '',
    performed_by_department: '',
    sanitation_required: true,
    swab_test_required: false,
    notes: '',
  });

  const [signOffData, setSignOffData] = useState({
    status: 'approved' as 'approved' | 'rejected' | 'needs_action',
    food_safety_compromised: false,
    corrective_actions: '',
    notes: '',
  });

  const {
    crossDeptDocs,
    pendingSignOffs,
    createCrossDeptDoc,
    signOffCrossDeptDoc,
    generateCrossDeptDocNumber,
    refetch,
    isLoading,
  } = useSupabaseQualityTasks();

  const filteredDocs = useMemo(() => {
    if (filterStatus === 'pending') {
      return crossDeptDocs.filter(d => d.status === 'pending_quality');
    } else if (filterStatus === 'approved') {
      return crossDeptDocs.filter(d => d.status === 'approved');
    } else if (filterStatus === 'rejected') {
      return crossDeptDocs.filter(d => d.status === 'rejected' || d.status === 'needs_action');
    }
    return crossDeptDocs;
  }, [crossDeptDocs, filterStatus]);

  const docStats = useMemo(() => {
    const pending = crossDeptDocs.filter(d => d.status === 'pending_quality').length;
    const approved = crossDeptDocs.filter(d => d.status === 'approved').length;
    const rejected = crossDeptDocs.filter(d => d.status === 'rejected' || d.status === 'needs_action').length;
    return { pending, approved, rejected };
  }, [crossDeptDocs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refetch]);

  const handleCreateDoc = useCallback(async () => {
    if (!newDoc.equipment_name.trim() || !newDoc.work_performed.trim() || !newDoc.performed_by.trim()) {
      Alert.alert('Required Fields', 'Please fill in equipment name, work performed, and performed by.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createCrossDeptDoc({
        doc_number: generateCrossDeptDocNumber(),
        doc_type: newDoc.doc_type,
        status: 'pending_quality',
        facility_id: 'FAC001',
        location: newDoc.location || null,
        equipment_id: null,
        equipment_name: newDoc.equipment_name,
        work_performed: newDoc.work_performed,
        work_date: new Date().toISOString().split('T')[0],
        work_start_time: null,
        work_end_time: null,
        performed_by: newDoc.performed_by,
        performed_by_id: null,
        performed_by_department: newDoc.performed_by_department || null,
        sanitation_required: newDoc.sanitation_required,
        sanitation_completed: false,
        sanitation_completed_by: null,
        sanitation_completed_at: null,
        swab_test_required: newDoc.swab_test_required,
        swab_test_id: null,
        swab_test_result: null,
        quality_sign_off_required: true,
        quality_signed_off_by: null,
        quality_signed_off_by_id: null,
        quality_signed_off_at: null,
        quality_notes: null,
        food_safety_compromised: false,
        corrective_actions: null,
        photos: [],
        attachments: [],
        notes: newDoc.notes || null,
      });

      setShowNewDocModal(false);
      setNewDoc({
        doc_type: 'equipment_work',
        equipment_name: '',
        location: '',
        work_performed: '',
        performed_by: '',
        performed_by_department: '',
        sanitation_required: true,
        swab_test_required: false,
        notes: '',
      });
      
      Alert.alert('Success', 'Equipment hygiene record created. Quality sign-off required.');
    } catch (error) {
      console.error('[EquipmentHygiene] Error creating doc:', error);
      Alert.alert('Error', 'Failed to create record.');
    }
  }, [newDoc, createCrossDeptDoc, generateCrossDeptDocNumber]);

  const handleSignOff = useCallback(async () => {
    if (!selectedDoc) return;

    if (signOffData.status === 'needs_action' && !signOffData.corrective_actions.trim()) {
      Alert.alert('Required', 'Please describe the corrective actions needed.');
      return;
    }

    Haptics.notificationAsync(
      signOffData.status === 'approved' 
        ? Haptics.NotificationFeedbackType.Success 
        : Haptics.NotificationFeedbackType.Warning
    );

    try {
      await signOffCrossDeptDoc({
        id: selectedDoc.id,
        signedOffBy: 'Quality Inspector',
        signedOffById: 'USER001',
        status: signOffData.status,
        foodSafetyCompromised: signOffData.food_safety_compromised,
        correctiveActions: signOffData.corrective_actions || undefined,
        notes: signOffData.notes || undefined,
      });

      setShowSignOffModal(false);
      setSelectedDoc(null);
      setSignOffData({
        status: 'approved',
        food_safety_compromised: false,
        corrective_actions: '',
        notes: '',
      });

      if (signOffData.food_safety_compromised) {
        Alert.alert(
          'Food Safety Alert',
          'This work has been flagged as potentially compromising food safety. An NCR may be required.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[EquipmentHygiene] Error signing off:', error);
      Alert.alert('Error', 'Failed to complete sign-off.');
    }
  }, [selectedDoc, signOffData, signOffCrossDeptDoc]);

  const openSignOffModal = useCallback((doc: CrossDepartmentDoc) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDoc(doc);
    setSignOffData({
      status: 'approved',
      food_safety_compromised: false,
      corrective_actions: '',
      notes: '',
    });
    setShowSignOffModal(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'needs_action': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_quality': return 'Awaiting QA';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'needs_action': return 'Action Required';
      default: return status;
    }
  };

  const renderDocCard = (doc: CrossDepartmentDoc) => {
    const statusColor = getStatusColor(doc.status);
    const docType = DOC_TYPES.find(t => t.value === doc.doc_type);
    const isPending = doc.status === 'pending_quality';

    return (
      <Pressable
        key={doc.id}
        style={[
          styles.docCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.border,
            borderLeftColor: isPending ? '#F59E0B' : statusColor,
            borderLeftWidth: 4,
          }
        ]}
        onPress={() => isPending && openSignOffModal(doc)}
      >
        <View style={styles.docHeader}>
          <View style={styles.docHeaderLeft}>
            <Text style={[styles.docNumber, { color: colors.text }]}>{doc.doc_number}</Text>
            <View style={[styles.typeBadge, { backgroundColor: (docType?.color || '#6B7280') + '20' }]}>
              <Text style={[styles.typeText, { color: docType?.color || '#6B7280' }]}>
                {docType?.label || doc.doc_type}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (isPending ? '#F59E0B' : statusColor) + '20' }]}>
            {doc.status === 'approved' && <CheckCircle2 size={14} color={statusColor} />}
            {doc.status === 'rejected' && <XCircle size={14} color={statusColor} />}
            {doc.status === 'needs_action' && <AlertTriangle size={14} color={statusColor} />}
            {isPending && <Clock size={14} color="#F59E0B" />}
            <Text style={[styles.statusText, { color: isPending ? '#F59E0B' : statusColor }]}>
              {getStatusLabel(doc.status)}
            </Text>
          </View>
        </View>

        <View style={styles.docDetails}>
          <View style={styles.detailRow}>
            <Wrench size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
              {doc.equipment_name}
            </Text>
          </View>
          {doc.location && (
            <View style={styles.detailRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                {doc.location}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {doc.performed_by} {doc.performed_by_department && `(${doc.performed_by_department})`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {doc.work_date}
            </Text>
          </View>
        </View>

        <View style={[styles.workSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.workLabel, { color: colors.textSecondary }]}>Work Performed:</Text>
          <Text style={[styles.workText, { color: colors.text }]} numberOfLines={2}>
            {doc.work_performed}
          </Text>
        </View>

        <View style={styles.requirementsRow}>
          {doc.sanitation_required && (
            <View style={[
              styles.requirementBadge, 
              { backgroundColor: doc.sanitation_completed ? '#10B981' + '15' : '#F59E0B' + '15' }
            ]}>
              <Droplets size={12} color={doc.sanitation_completed ? '#10B981' : '#F59E0B'} />
              <Text style={[
                styles.requirementText, 
                { color: doc.sanitation_completed ? '#10B981' : '#F59E0B' }
              ]}>
                {doc.sanitation_completed ? 'Sanitized' : 'Sanitation Req'}
              </Text>
            </View>
          )}
          {doc.swab_test_required && (
            <View style={[
              styles.requirementBadge, 
              { backgroundColor: doc.swab_test_result === 'pass' ? '#10B981' + '15' : '#8B5CF6' + '15' }
            ]}>
              <Droplets size={12} color={doc.swab_test_result === 'pass' ? '#10B981' : '#8B5CF6'} />
              <Text style={[
                styles.requirementText, 
                { color: doc.swab_test_result === 'pass' ? '#10B981' : '#8B5CF6' }
              ]}>
                {doc.swab_test_result === 'pass' ? 'Swab Passed' : 'Swab Required'}
              </Text>
            </View>
          )}
        </View>

        {doc.food_safety_compromised && (
          <View style={[styles.warningBanner, { backgroundColor: '#EF4444' + '10' }]}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.warningText}>Food safety may have been compromised</Text>
          </View>
        )}

        {doc.status === 'approved' && doc.quality_signed_off_by && (
          <View style={[styles.signOffInfo, { borderTopColor: colors.border }]}>
            <Shield size={14} color="#10B981" />
            <Text style={[styles.signOffText, { color: colors.textSecondary }]}>
              Approved by {doc.quality_signed_off_by}
            </Text>
          </View>
        )}

        {isPending && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.actionHint, { color: colors.textTertiary }]}>
              Tap to review and sign off
            </Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#F97316' + '20' }]}>
            <Wrench size={32} color="#F97316" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Equipment Hygiene Sign-off</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Cross-department documentation for equipment work and quality verification
          </Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <Pressable 
              style={[styles.statItem, filterStatus === 'pending' && styles.statItemActive]}
              onPress={() => setFilterStatus('pending')}
            >
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{docStats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Pressable 
              style={[styles.statItem, filterStatus === 'approved' && styles.statItemActive]}
              onPress={() => setFilterStatus('approved')}
            >
              <Text style={[styles.statValue, { color: '#10B981' }]}>{docStats.approved}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Pressable 
              style={[styles.statItem, filterStatus === 'rejected' && styles.statItemActive]}
              onPress={() => setFilterStatus('rejected')}
            >
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{docStats.rejected}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { 
                backgroundColor: filterStatus === 'all' ? colors.primary : colors.surface,
                borderColor: filterStatus === 'all' ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, { color: filterStatus === 'all' ? '#FFF' : colors.text }]}>
              All
            </Text>
          </Pressable>
        </View>

        <View style={styles.docList}>
          {filteredDocs.map(doc => renderDocCard(doc))}
        </View>

        {filteredDocs.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Wrench size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Records</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterStatus === 'pending' 
                ? 'No documents awaiting quality sign-off.' 
                : 'No documents found.'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowNewDocModal(true);
        }}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showNewDocModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewDocModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowNewDocModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Equipment Work Record</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Work Type *</Text>
              <View style={styles.typeGrid}>
                {DOC_TYPES.map(type => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.typeOption,
                      { 
                        backgroundColor: newDoc.doc_type === type.value ? type.color + '20' : colors.backgroundSecondary,
                        borderColor: newDoc.doc_type === type.value ? type.color : colors.border,
                      }
                    ]}
                    onPress={() => setNewDoc(prev => ({ ...prev, doc_type: type.value }))}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      { color: newDoc.doc_type === type.value ? type.color : colors.text }
                    ]}>
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Equipment Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Mixer #1, Conveyor Belt A"
                placeholderTextColor={colors.textTertiary}
                value={newDoc.equipment_name}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, equipment_name: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Location</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Production Floor - Line 1"
                placeholderTextColor={colors.textTertiary}
                value={newDoc.location}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, location: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Work Performed *</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Describe the work that was performed..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={newDoc.work_performed}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, work_performed: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Performed By *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Name of person who performed the work"
                placeholderTextColor={colors.textTertiary}
                value={newDoc.performed_by}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, performed_by: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Department</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Maintenance, Engineering"
                placeholderTextColor={colors.textTertiary}
                value={newDoc.performed_by_department}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, performed_by_department: text }))}
              />
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Requirements</Text>
              
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setNewDoc(prev => ({ ...prev, sanitation_required: !prev.sanitation_required }))}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    borderColor: newDoc.sanitation_required ? '#10B981' : colors.border,
                    backgroundColor: newDoc.sanitation_required ? '#10B981' : 'transparent',
                  }
                ]}>
                  {newDoc.sanitation_required && <CheckCircle2 size={14} color="#FFF" />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.text }]}>Sanitation Required</Text>
              </Pressable>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setNewDoc(prev => ({ ...prev, swab_test_required: !prev.swab_test_required }))}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    borderColor: newDoc.swab_test_required ? '#8B5CF6' : colors.border,
                    backgroundColor: newDoc.swab_test_required ? '#8B5CF6' : 'transparent',
                  }
                ]}>
                  {newDoc.swab_test_required && <CheckCircle2 size={14} color="#FFF" />}
                </View>
                <Text style={[styles.checkboxText, { color: colors.text }]}>Swab Test Required</Text>
              </Pressable>
            </View>

            <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={newDoc.notes}
                onChangeText={(text) => setNewDoc(prev => ({ ...prev, notes: text }))}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: '#F97316', opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={handleCreateDoc}
            >
              <FileText size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Create Record</Text>
            </Pressable>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showSignOffModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignOffModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowSignOffModal(false)} style={styles.modalClose}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Quality Sign-off</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedDoc && (
              <>
                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.docInfoTitle, { color: colors.text }]}>{selectedDoc.doc_number}</Text>
                  <View style={styles.docInfoRow}>
                    <Wrench size={16} color={colors.textSecondary} />
                    <Text style={[styles.docInfoText, { color: colors.text }]}>{selectedDoc.equipment_name}</Text>
                  </View>
                  <View style={styles.docInfoRow}>
                    <User size={16} color={colors.textSecondary} />
                    <Text style={[styles.docInfoText, { color: colors.text }]}>
                      {selectedDoc.performed_by} ({selectedDoc.performed_by_department})
                    </Text>
                  </View>
                  <View style={styles.docInfoRow}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={[styles.docInfoText, { color: colors.textSecondary }]}>{selectedDoc.work_date}</Text>
                  </View>
                  <View style={[styles.workDescBox, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.workDescLabel, { color: colors.textSecondary }]}>Work Performed:</Text>
                    <Text style={[styles.workDescText, { color: colors.text }]}>{selectedDoc.work_performed}</Text>
                  </View>
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Decision *</Text>
                  <View style={styles.decisionOptions}>
                    <Pressable
                      style={[
                        styles.decisionOption,
                        { 
                          backgroundColor: signOffData.status === 'approved' ? '#10B981' + '20' : colors.backgroundSecondary,
                          borderColor: signOffData.status === 'approved' ? '#10B981' : colors.border,
                        }
                      ]}
                      onPress={() => setSignOffData(prev => ({ ...prev, status: 'approved' }))}
                    >
                      <CheckCircle2 size={24} color={signOffData.status === 'approved' ? '#10B981' : colors.textSecondary} />
                      <Text style={[
                        styles.decisionText,
                        { color: signOffData.status === 'approved' ? '#10B981' : colors.text }
                      ]}>
                        Approve
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.decisionOption,
                        { 
                          backgroundColor: signOffData.status === 'needs_action' ? '#F59E0B' + '20' : colors.backgroundSecondary,
                          borderColor: signOffData.status === 'needs_action' ? '#F59E0B' : colors.border,
                        }
                      ]}
                      onPress={() => setSignOffData(prev => ({ ...prev, status: 'needs_action' }))}
                    >
                      <AlertTriangle size={24} color={signOffData.status === 'needs_action' ? '#F59E0B' : colors.textSecondary} />
                      <Text style={[
                        styles.decisionText,
                        { color: signOffData.status === 'needs_action' ? '#F59E0B' : colors.text }
                      ]}>
                        Action Req
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.decisionOption,
                        { 
                          backgroundColor: signOffData.status === 'rejected' ? '#EF4444' + '20' : colors.backgroundSecondary,
                          borderColor: signOffData.status === 'rejected' ? '#EF4444' : colors.border,
                        }
                      ]}
                      onPress={() => setSignOffData(prev => ({ ...prev, status: 'rejected' }))}
                    >
                      <XCircle size={24} color={signOffData.status === 'rejected' ? '#EF4444' : colors.textSecondary} />
                      <Text style={[
                        styles.decisionText,
                        { color: signOffData.status === 'rejected' ? '#EF4444' : colors.text }
                      ]}>
                        Reject
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={[styles.safetyCheckRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setSignOffData(prev => ({ ...prev, food_safety_compromised: !prev.food_safety_compromised }))}
                >
                  <View style={[
                    styles.safetyCheckbox,
                    { 
                      borderColor: signOffData.food_safety_compromised ? '#EF4444' : colors.border,
                      backgroundColor: signOffData.food_safety_compromised ? '#EF4444' : 'transparent',
                    }
                  ]}>
                    {signOffData.food_safety_compromised && <AlertCircle size={16} color="#FFF" />}
                  </View>
                  <View style={styles.safetyCheckContent}>
                    <Text style={[styles.safetyCheckTitle, { color: colors.text }]}>Food Safety Compromised?</Text>
                    <Text style={[styles.safetyCheckDesc, { color: colors.textSecondary }]}>
                      Check if this work may have compromised food safety
                    </Text>
                  </View>
                </Pressable>

                {(signOffData.status === 'needs_action' || signOffData.status === 'rejected') && (
                  <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      {signOffData.status === 'needs_action' ? 'Corrective Actions Required *' : 'Rejection Reason'}
                    </Text>
                    <TextInput
                      style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder="Describe required actions or reason..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      value={signOffData.corrective_actions}
                      onChangeText={(text) => setSignOffData(prev => ({ ...prev, corrective_actions: text }))}
                    />
                  </View>
                )}

                <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.textAreaInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                    placeholder="Additional quality notes..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={signOffData.notes}
                    onChangeText={(text) => setSignOffData(prev => ({ ...prev, notes: text }))}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    { 
                      backgroundColor: signOffData.status === 'approved' ? '#10B981' : 
                        signOffData.status === 'needs_action' ? '#F59E0B' : '#EF4444',
                      opacity: pressed ? 0.8 : 1,
                    }
                  ]}
                  onPress={handleSignOff}
                >
                  <Shield size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {signOffData.status === 'approved' ? 'Approve & Sign Off' : 
                      signOffData.status === 'needs_action' ? 'Request Action' : 'Reject'}
                  </Text>
                </Pressable>

                <View style={styles.modalBottomPadding} />
              </>
            )}
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
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    alignItems: 'center' as const,
    flex: 1,
    paddingVertical: 4,
  },
  statItemActive: {
    opacity: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row' as const,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  docList: {
    gap: 12,
  },
  docCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  docHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
  },
  docHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  docNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  docDetails: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  workSection: {
    padding: 14,
    borderTopWidth: 1,
  },
  workLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  workText: {
    fontSize: 13,
    lineHeight: 18,
  },
  requirementsRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  requirementBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  warningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 10,
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  signOffInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  signOffText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
    borderTopWidth: 1,
  },
  actionHint: {
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
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
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  textAreaInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBottomPadding: {
    height: 40,
  },
  docInfoTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  docInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 8,
  },
  docInfoText: {
    fontSize: 14,
  },
  workDescBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  workDescLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  workDescText: {
    fontSize: 14,
    lineHeight: 20,
  },
  decisionOptions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  decisionOption: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  decisionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  safetyCheckRow: {
    flexDirection: 'row' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  safetyCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  safetyCheckContent: {
    flex: 1,
  },
  safetyCheckTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  safetyCheckDesc: {
    fontSize: 12,
  },
});
