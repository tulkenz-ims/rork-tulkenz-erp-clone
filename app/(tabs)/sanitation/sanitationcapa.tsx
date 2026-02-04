import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Shield,
  Plus,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  X,
  Clock,
  CheckCircle2,
  Target,
  FileText,
  Link2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type CAPAType = 'corrective' | 'preventive';
type CAPAStatus = 'draft' | 'open' | 'in_progress' | 'verification' | 'closed' | 'cancelled';
type CAPAPriority = 'low' | 'medium' | 'high' | 'critical';

interface CAPA {
  id: string;
  capaNumber: string;
  type: CAPAType;
  status: CAPAStatus;
  priority: CAPAPriority;
  title: string;
  description: string;
  linkedNCR: string | null;
  rootCause: string | null;
  proposedAction: string;
  implementationPlan: string | null;
  assignedTo: string;
  assignedDate: string;
  targetDate: string;
  completedDate: string | null;
  verifiedBy: string | null;
  verifiedDate: string | null;
  effectivenessCheck: string | null;
  effectivenessDate: string | null;
  notes: string | null;
}

const TYPE_CONFIG: Record<CAPAType, { label: string; color: string }> = {
  corrective: { label: 'Corrective', color: '#EF4444' },
  preventive: { label: 'Preventive', color: '#3B82F6' },
};

const STATUS_CONFIG: Record<CAPAStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bgColor: '#6B728015' },
  open: { label: 'Open', color: '#F59E0B', bgColor: '#F59E0B15' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bgColor: '#3B82F615' },
  verification: { label: 'Verification', color: '#8B5CF6', bgColor: '#8B5CF615' },
  closed: { label: 'Closed', color: '#10B981', bgColor: '#10B98115' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: '#6B728015' },
};

const PRIORITY_CONFIG: Record<CAPAPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B' },
  high: { label: 'High', color: '#EF4444' },
  critical: { label: 'Critical', color: '#DC2626' },
};

const MOCK_CAPAS: CAPA[] = [
  {
    id: '1',
    capaNumber: 'CAPA-SAN-2501-001',
    type: 'corrective',
    status: 'in_progress',
    priority: 'high',
    title: 'Repair Ventilation System - Building A Restroom',
    description: 'Address mold issue caused by inadequate ventilation in 1st floor restroom.',
    linkedNCR: 'NCR-SAN-2501-001',
    rootCause: 'Ventilation system not functioning properly, causing moisture buildup.',
    proposedAction: 'Replace affected ceiling tiles, repair ventilation system, install humidity sensors.',
    implementationPlan: '1. Order parts (1/25)\n2. Schedule maintenance (1/27)\n3. Complete repair (1/28)\n4. Verify fix (1/30)',
    assignedTo: 'Maintenance Manager',
    assignedDate: '2025-01-24',
    targetDate: '2025-01-30',
    completedDate: null,
    verifiedBy: null,
    verifiedDate: null,
    effectivenessCheck: null,
    effectivenessDate: null,
    notes: 'Parts ordered, awaiting delivery.',
  },
  {
    id: '2',
    capaNumber: 'CAPA-SAN-2501-002',
    type: 'preventive',
    status: 'open',
    priority: 'medium',
    title: 'Implement Weekly Ventilation Checks',
    description: 'Prevent future mold issues by implementing regular ventilation system inspections.',
    linkedNCR: 'NCR-SAN-2501-001',
    rootCause: 'Lack of preventive maintenance schedule for ventilation systems.',
    proposedAction: 'Create weekly inspection checklist, train sanitation staff, add to MSS.',
    implementationPlan: null,
    assignedTo: 'Sanitation Supervisor',
    assignedDate: '2025-01-25',
    targetDate: '2025-02-07',
    completedDate: null,
    verifiedBy: null,
    verifiedDate: null,
    effectivenessCheck: null,
    effectivenessDate: null,
    notes: null,
  },
  {
    id: '3',
    capaNumber: 'CAPA-SAN-2501-003',
    type: 'corrective',
    status: 'closed',
    priority: 'low',
    title: 'Update Backup Assignment Procedures',
    description: 'Ensure coverage when sanitation staff is absent.',
    linkedNCR: 'NCR-SAN-2501-003',
    rootCause: 'No backup assignments for staff absences.',
    proposedAction: 'Create backup assignment matrix, update SOPs, communicate to all staff.',
    implementationPlan: 'Completed backup matrix and updated SOPs.',
    assignedTo: 'Sanitation Lead',
    assignedDate: '2025-01-20',
    targetDate: '2025-01-22',
    completedDate: '2025-01-21',
    verifiedBy: 'Quality Manager',
    verifiedDate: '2025-01-22',
    effectivenessCheck: 'Monitored for 1 week - no missed tasks during staff absences.',
    effectivenessDate: '2025-01-29',
    notes: 'CAPA effective. Closed.',
  },
];

export default function SanitationCAPAScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [capas, setCAPAs] = useState(MOCK_CAPAS);
  const [filterStatus, setFilterStatus] = useState<CAPAStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<CAPAType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCAPA, setSelectedCAPA] = useState<CAPA | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<CAPAType>('corrective');
  const [newPriority, setNewPriority] = useState<CAPAPriority>('medium');
  const [newProposedAction, setNewProposedAction] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');

  const filteredCAPAs = useMemo(() => {
    let filtered = capas;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }
    return filtered;
  }, [capas, filterStatus, filterType]);

  const capaStats = useMemo(() => {
    return {
      total: capas.length,
      open: capas.filter(c => ['open', 'in_progress'].includes(c.status)).length,
      corrective: capas.filter(c => c.type === 'corrective').length,
      preventive: capas.filter(c => c.type === 'preventive').length,
      closed: capas.filter(c => c.status === 'closed').length,
    };
  }, [capas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const generateCAPANumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CAPA-SAN-${year}${month}-${random}`;
  };

  const handleAddCAPA = useCallback(() => {
    if (!newTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter a title.');
      return;
    }
    if (!newProposedAction.trim()) {
      Alert.alert('Missing Information', 'Please describe the proposed action.');
      return;
    }
    if (!newAssignedTo.trim()) {
      Alert.alert('Missing Information', 'Please assign this CAPA to someone.');
      return;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (newPriority === 'critical' ? 3 : newPriority === 'high' ? 7 : newPriority === 'medium' ? 14 : 30));

    const newCAPA: CAPA = {
      id: Date.now().toString(),
      capaNumber: generateCAPANumber(),
      type: newType,
      status: 'open',
      priority: newPriority,
      title: newTitle,
      description: newDescription,
      linkedNCR: null,
      rootCause: null,
      proposedAction: newProposedAction,
      implementationPlan: null,
      assignedTo: newAssignedTo,
      assignedDate: new Date().toISOString().split('T')[0],
      targetDate: targetDate.toISOString().split('T')[0],
      completedDate: null,
      verifiedBy: null,
      verifiedDate: null,
      effectivenessCheck: null,
      effectivenessDate: null,
      notes: null,
    };

    setCAPAs(prev => [newCAPA, ...prev]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewProposedAction('');
    setNewAssignedTo('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('CAPA Created', `${TYPE_CONFIG[newType].label} action ${newCAPA.capaNumber} has been created.`);
  }, [newTitle, newDescription, newType, newPriority, newProposedAction, newAssignedTo]);

  const handleStatusChange = useCallback((capaId: string, newStatus: CAPAStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCAPAs(prev =>
      prev.map(c => {
        if (c.id === capaId) {
          return {
            ...c,
            status: newStatus,
            completedDate: newStatus === 'verification' ? new Date().toISOString().split('T')[0] : c.completedDate,
            verifiedBy: newStatus === 'closed' ? user?.displayName || 'Unknown' : c.verifiedBy,
            verifiedDate: newStatus === 'closed' ? new Date().toISOString().split('T')[0] : c.verifiedDate,
          };
        }
        return c;
      })
    );
    setSelectedCAPA(null);
    Alert.alert('Status Updated', `CAPA status changed to ${STATUS_CONFIG[newStatus].label}`);
  }, [user]);

  const renderCAPACard = (capa: CAPA) => {
    const typeConfig = TYPE_CONFIG[capa.type];
    const statusConfig = STATUS_CONFIG[capa.status];
    const priorityConfig = PRIORITY_CONFIG[capa.priority];
    const isOverdue = new Date(capa.targetDate) < new Date() && capa.status !== 'closed';
    
    return (
      <Pressable
        key={capa.id}
        style={[styles.capaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedCAPA(capa)}
      >
        <View style={styles.capaHeader}>
          <View style={styles.capaBadges}>
            <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
              <Shield size={12} color={typeConfig.color} />
              <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>{priorityConfig.label}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.capaNumber, { color: colors.textSecondary }]}>{capa.capaNumber}</Text>
        <Text style={[styles.capaTitle, { color: colors.text }]}>{capa.title}</Text>

        <View style={styles.capaMeta}>
          <View style={styles.metaItem}>
            <User size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{capa.assignedTo}</Text>
          </View>
          {capa.linkedNCR && (
            <View style={styles.metaItem}>
              <Link2 size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{capa.linkedNCR}</Text>
            </View>
          )}
        </View>

        <View style={styles.capaFooter}>
          <View style={styles.targetDate}>
            <Target size={12} color={isOverdue ? '#EF4444' : colors.textTertiary} />
            <Text style={[styles.targetDateText, { color: isOverdue ? '#EF4444' : colors.textSecondary }]}>
              Target: {new Date(capa.targetDate).toLocaleDateString()}
            </Text>
          </View>
          {isOverdue && (
            <View style={[styles.overdueBadge, { backgroundColor: '#EF444420' }]}>
              <Text style={[styles.overdueText, { color: '#EF4444' }]}>Overdue</Text>
            </View>
          )}
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <Shield size={28} color="#3B82F6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sanitation CAPA</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Corrective & Preventive Actions
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{capaStats.open}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{capaStats.corrective}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Corrective</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{capaStats.preventive}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Preventive</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{capaStats.closed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Closed</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Type</Text>
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterType === 'all' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
            ]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, { color: filterType === 'all' ? '#FFF' : colors.text }]}>All</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterType === 'corrective' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
            ]}
            onPress={() => setFilterType('corrective')}
          >
            <Text style={[styles.filterChipText, { color: filterType === 'corrective' ? '#FFF' : colors.text }]}>Corrective</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterType === 'preventive' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
            onPress={() => setFilterType('preventive')}
          >
            <Text style={[styles.filterChipText, { color: filterType === 'preventive' ? '#FFF' : colors.text }]}>Preventive</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterStatus === 'all' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, { color: filterStatus === 'all' ? '#FFF' : colors.text }]}>All</Text>
          </Pressable>
          {(Object.keys(STATUS_CONFIG) as CAPAStatus[]).filter(s => s !== 'draft' && s !== 'cancelled').map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterStatus === status && { backgroundColor: STATUS_CONFIG[status].color, borderColor: STATUS_CONFIG[status].color },
              ]}
              onPress={() => {
                setFilterStatus(status);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.filterChipText, { color: filterStatus === status ? '#FFF' : colors.text }]}>
                {STATUS_CONFIG[status].label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredCAPAs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle2 size={48} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No CAPAs Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No corrective or preventive actions match the selected filters.
            </Text>
          </View>
        ) : (
          filteredCAPAs.map(renderCAPACard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#3B82F6' }]}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create CAPA</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.typeSelector}>
              <Pressable
                style={[
                  styles.typeOption,
                  { borderColor: colors.border },
                  newType === 'corrective' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                ]}
                onPress={() => setNewType('corrective')}
              >
                <Text style={[styles.typeOptionText, { color: newType === 'corrective' ? '#FFF' : colors.text }]}>
                  Corrective
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeOption,
                  { borderColor: colors.border },
                  newType === 'preventive' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                ]}
                onPress={() => setNewType('preventive')}
              >
                <Text style={[styles.typeOptionText, { color: newType === 'preventive' ? '#FFF' : colors.text }]}>
                  Preventive
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Brief title for this action"
              placeholderTextColor={colors.textTertiary}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Detailed description..."
              placeholderTextColor={colors.textTertiary}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Proposed Action *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Describe the corrective/preventive action to be taken..."
              placeholderTextColor={colors.textTertiary}
              value={newProposedAction}
              onChangeText={setNewProposedAction}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Priority</Text>
            <View style={styles.prioritySelector}>
              {(Object.keys(PRIORITY_CONFIG) as CAPAPriority[]).map((priority) => (
                <Pressable
                  key={priority}
                  style={[
                    styles.priorityOption,
                    { borderColor: colors.border },
                    newPriority === priority && { backgroundColor: PRIORITY_CONFIG[priority].color, borderColor: PRIORITY_CONFIG[priority].color },
                  ]}
                  onPress={() => setNewPriority(priority)}
                >
                  <Text style={[styles.priorityOptionText, { color: newPriority === priority ? '#FFF' : colors.text }]}>
                    {PRIORITY_CONFIG[priority].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Assign To *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Name or role responsible"
              placeholderTextColor={colors.textTertiary}
              value={newAssignedTo}
              onChangeText={setNewAssignedTo}
            />

            <Pressable
              style={[styles.addButton, { backgroundColor: newType === 'corrective' ? '#EF4444' : '#3B82F6' }]}
              onPress={handleAddCAPA}
            >
              <Text style={styles.addButtonText}>Create {TYPE_CONFIG[newType].label} Action</Text>
            </Pressable>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={!!selectedCAPA}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCAPA(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.detailModalContent, { backgroundColor: colors.surface }]}>
            {selectedCAPA && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedCAPA.capaNumber}</Text>
                  <Pressable onPress={() => setSelectedCAPA(null)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.detailBadges}>
                  <View style={[styles.typeBadge, { backgroundColor: TYPE_CONFIG[selectedCAPA.type].color + '20' }]}>
                    <Shield size={14} color={TYPE_CONFIG[selectedCAPA.type].color} />
                    <Text style={[styles.typeText, { color: TYPE_CONFIG[selectedCAPA.type].color }]}>
                      {TYPE_CONFIG[selectedCAPA.type].label}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_CONFIG[selectedCAPA.priority].color + '20' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_CONFIG[selectedCAPA.priority].color }]}>
                      {PRIORITY_CONFIG[selectedCAPA.priority].label}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedCAPA.status].bgColor }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedCAPA.status].color }]}>
                      {STATUS_CONFIG[selectedCAPA.status].label}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedCAPA.title}</Text>

                {selectedCAPA.description && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCAPA.description}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Proposed Action</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCAPA.proposedAction}</Text>
                </View>

                {selectedCAPA.rootCause && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Root Cause</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCAPA.rootCause}</Text>
                  </View>
                )}

                {selectedCAPA.implementationPlan && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Implementation Plan</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCAPA.implementationPlan}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCAPA.assignedTo}</Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Target Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedCAPA.targetDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {selectedCAPA.linkedNCR && (
                  <View style={styles.linkedSection}>
                    <Link2 size={16} color={colors.textTertiary} />
                    <Text style={[styles.linkedText, { color: colors.textSecondary }]}>
                      Linked to: {selectedCAPA.linkedNCR}
                    </Text>
                  </View>
                )}

                {selectedCAPA.status !== 'closed' && selectedCAPA.status !== 'cancelled' && (
                  <View style={styles.statusActions}>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Update Status:</Text>
                    <View style={styles.statusButtons}>
                      {selectedCAPA.status === 'open' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleStatusChange(selectedCAPA.id, 'in_progress')}
                        >
                          <Text style={styles.statusBtnText}>Start Implementation</Text>
                        </Pressable>
                      )}
                      {selectedCAPA.status === 'in_progress' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#8B5CF6' }]}
                          onPress={() => handleStatusChange(selectedCAPA.id, 'verification')}
                        >
                          <Text style={styles.statusBtnText}>Submit for Verification</Text>
                        </Pressable>
                      )}
                      {selectedCAPA.status === 'verification' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleStatusChange(selectedCAPA.id, 'closed')}
                        >
                          <Text style={styles.statusBtnText}>Verify & Close CAPA</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
            <View style={styles.bottomPadding} />
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
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 12,
  },
  filterScrollRow: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  capaCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  capaHeader: {
    marginBottom: 8,
  },
  capaBadges: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  capaNumber: {
    fontSize: 11,
    marginBottom: 4,
  },
  capaTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  capaMeta: {
    gap: 6,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  capaFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  targetDate: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  targetDateText: {
    fontSize: 11,
  },
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  detailModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  typeSelector: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  prioritySelector: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailBadges: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 16,
  },
  detailHalf: {
    flex: 1,
  },
  linkedSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    marginBottom: 16,
  },
  linkedText: {
    fontSize: 13,
  },
  statusActions: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  statusButtons: {
    gap: 10,
  },
  statusBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  statusBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
