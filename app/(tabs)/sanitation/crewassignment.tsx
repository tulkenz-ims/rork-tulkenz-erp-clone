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
  Users,
  User,
  MapPin,
  Clock,
  Calendar,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  ChevronRight,
  Edit2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface CrewMember {
  id: string;
  name: string;
  employeeId: string;
  role: 'lead' | 'member' | 'trainee';
  phone: string;
  email: string;
  certifications: string[];
  isActive: boolean;
}

interface CrewAssignment {
  id: string;
  crewMemberId: string;
  crewMember: CrewMember;
  zone: string;
  shift: string;
  date: string;
  startTime: string;
  endTime: string;
  tasks: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'absent';
  notes: string;
}

const SHIFTS = [
  { id: 'day', name: 'Day Shift', time: '6:00 AM - 2:00 PM', color: '#F59E0B' },
  { id: 'swing', name: 'Swing Shift', time: '2:00 PM - 10:00 PM', color: '#3B82F6' },
  { id: 'night', name: 'Night Shift', time: '10:00 PM - 6:00 AM', color: '#8B5CF6' },
];

const ZONES = [
  'Zone A - Production Floor',
  'Zone B - Office Wing',
  'Zone C - Employee Areas',
  'Zone D - Exterior/Grounds',
];

const MOCK_CREW: CrewMember[] = [
  { id: '1', name: 'Maria Garcia', employeeId: 'EMP020', role: 'lead', phone: '555-0101', email: 'mgarcia@company.com', certifications: ['OSHA 10', 'Chemical Safety'], isActive: true },
  { id: '2', name: 'James Wilson', employeeId: 'EMP021', role: 'member', phone: '555-0102', email: 'jwilson@company.com', certifications: ['OSHA 10'], isActive: true },
  { id: '3', name: 'Sarah Chen', employeeId: 'EMP022', role: 'member', phone: '555-0103', email: 'schen@company.com', certifications: ['Chemical Safety'], isActive: true },
  { id: '4', name: 'Michael Brown', employeeId: 'EMP023', role: 'lead', phone: '555-0104', email: 'mbrown@company.com', certifications: ['OSHA 10', 'Chemical Safety', 'Floor Care'], isActive: true },
  { id: '5', name: 'Jennifer Davis', employeeId: 'EMP024', role: 'member', phone: '555-0105', email: 'jdavis@company.com', certifications: ['OSHA 10'], isActive: true },
  { id: '6', name: 'Robert Martinez', employeeId: 'EMP025', role: 'trainee', phone: '555-0106', email: 'rmartinez@company.com', certifications: [], isActive: true },
];

const today = new Date().toISOString().split('T')[0];

const MOCK_ASSIGNMENTS: CrewAssignment[] = [
  { id: '1', crewMemberId: '1', crewMember: MOCK_CREW[0], zone: 'Zone C - Employee Areas', shift: 'Day Shift', date: today, startTime: '6:00 AM', endTime: '2:00 PM', tasks: ['Restroom cleaning', 'Break room', 'Locker rooms'], status: 'in_progress', notes: '' },
  { id: '2', crewMemberId: '2', crewMember: MOCK_CREW[1], zone: 'Zone B - Office Wing', shift: 'Day Shift', date: today, startTime: '6:00 AM', endTime: '2:00 PM', tasks: ['Office cleaning', 'Conference rooms'], status: 'in_progress', notes: '' },
  { id: '3', crewMemberId: '3', crewMember: MOCK_CREW[2], zone: 'Zone A - Production Floor', shift: 'Day Shift', date: today, startTime: '6:00 AM', endTime: '2:00 PM', tasks: ['Production area', 'Warehouse'], status: 'scheduled', notes: '' },
  { id: '4', crewMemberId: '4', crewMember: MOCK_CREW[3], zone: 'Zone C - Employee Areas', shift: 'Swing Shift', date: today, startTime: '2:00 PM', endTime: '10:00 PM', tasks: ['Evening restroom', 'Break room cleanup'], status: 'scheduled', notes: '' },
  { id: '5', crewMemberId: '5', crewMember: MOCK_CREW[4], zone: 'Zone D - Exterior/Grounds', shift: 'Day Shift', date: today, startTime: '6:00 AM', endTime: '2:00 PM', tasks: ['Parking lot', 'Exterior trash'], status: 'completed', notes: '' },
];

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#F59E0B', bgColor: '#F59E0B15' },
  in_progress: { label: 'Working', color: '#3B82F6', bgColor: '#3B82F615' },
  completed: { label: 'Completed', color: '#10B981', bgColor: '#10B98115' },
  absent: { label: 'Absent', color: '#EF4444', bgColor: '#EF444415' },
};

const ROLE_CONFIG = {
  lead: { label: 'Team Lead', color: '#8B5CF6' },
  member: { label: 'Member', color: '#3B82F6' },
  trainee: { label: 'Trainee', color: '#F59E0B' },
};

export default function CrewAssignmentScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [filterShift, setFilterShift] = useState<string | 'all'>('all');
  const [filterZone, setFilterZone] = useState<string | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<CrewAssignment | null>(null);

  const [newAssignmentMember, setNewAssignmentMember] = useState<string>('');
  const [newAssignmentZone, setNewAssignmentZone] = useState(ZONES[0]);
  const [newAssignmentShift, setNewAssignmentShift] = useState(SHIFTS[0].name);

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    
    if (filterShift !== 'all') {
      filtered = filtered.filter(a => a.shift === filterShift);
    }
    
    if (filterZone !== 'all') {
      filtered = filtered.filter(a => a.zone === filterZone);
    }
    
    return filtered;
  }, [assignments, filterShift, filterZone]);

  const assignmentStats = useMemo(() => {
    return {
      total: assignments.length,
      working: assignments.filter(a => a.status === 'in_progress').length,
      scheduled: assignments.filter(a => a.status === 'scheduled').length,
      completed: assignments.filter(a => a.status === 'completed').length,
    };
  }, [assignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleStatusChange = useCallback((assignmentId: string, newStatus: CrewAssignment['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAssignments(prev =>
      prev.map(a => a.id === assignmentId ? { ...a, status: newStatus } : a)
    );
    Alert.alert('Status Updated', `Assignment status changed to ${STATUS_CONFIG[newStatus].label}`);
  }, []);

  const handleAddAssignment = useCallback(() => {
    if (!newAssignmentMember) {
      Alert.alert('Missing Information', 'Please select a crew member.');
      return;
    }

    const member = MOCK_CREW.find(m => m.id === newAssignmentMember);
    if (!member) return;

    const shift = SHIFTS.find(s => s.name === newAssignmentShift);
    const [startTime, endTime] = shift?.time.split(' - ') || ['', ''];

    const newAssignment: CrewAssignment = {
      id: Date.now().toString(),
      crewMemberId: member.id,
      crewMember: member,
      zone: newAssignmentZone,
      shift: newAssignmentShift,
      date: today,
      startTime,
      endTime,
      tasks: [],
      status: 'scheduled',
      notes: '',
    };

    setAssignments(prev => [...prev, newAssignment]);
    setShowAddModal(false);
    setNewAssignmentMember('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Assignment Created', `${member.name} assigned to ${newAssignmentZone}`);
  }, [newAssignmentMember, newAssignmentZone, newAssignmentShift]);

  const renderAssignmentCard = (assignment: CrewAssignment) => {
    const statusConfig = STATUS_CONFIG[assignment.status];
    const roleConfig = ROLE_CONFIG[assignment.crewMember.role];
    const shift = SHIFTS.find(s => s.name === assignment.shift);
    
    return (
      <Pressable
        key={assignment.id}
        style={[styles.assignmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedAssignment(assignment)}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.memberInfo}>
            <View style={[styles.avatar, { backgroundColor: shift?.color + '20' }]}>
              <User size={20} color={shift?.color} />
            </View>
            <View>
              <Text style={[styles.memberName, { color: colors.text }]}>{assignment.crewMember.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.assignmentMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{assignment.zone}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{assignment.shift} ({assignment.startTime} - {assignment.endTime})</Text>
          </View>
        </View>

        {assignment.tasks.length > 0 && (
          <View style={styles.taskPreview}>
            <Text style={[styles.taskPreviewText, { color: colors.textSecondary }]}>
              Tasks: {assignment.tasks.join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.assignmentActions}>
          {assignment.status === 'scheduled' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleStatusChange(assignment.id, 'in_progress')}
            >
              <Text style={styles.actionBtnText}>Start Shift</Text>
            </Pressable>
          )}
          {assignment.status === 'in_progress' && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => handleStatusChange(assignment.id, 'completed')}
            >
              <Text style={styles.actionBtnText}>Complete</Text>
            </Pressable>
          )}
          {assignment.status === 'completed' && (
            <View style={styles.completedBadge}>
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={[styles.completedText, { color: '#10B981' }]}>Shift Completed</Text>
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
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Users size={28} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Crew Assignment Log</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{assignmentStats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assigned</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{assignmentStats.working}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Working</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{assignmentStats.scheduled}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Scheduled</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{assignmentStats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Shift</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterShift === 'all' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
            ]}
            onPress={() => setFilterShift('all')}
          >
            <Text style={[styles.filterChipText, { color: filterShift === 'all' ? '#FFF' : colors.text }]}>
              All Shifts
            </Text>
          </Pressable>
          {SHIFTS.map((shift) => (
            <Pressable
              key={shift.id}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterShift === shift.name && { backgroundColor: shift.color, borderColor: shift.color },
              ]}
              onPress={() => {
                setFilterShift(shift.name);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.filterChipText, { color: filterShift === shift.name ? '#FFF' : colors.text }]}>
                {shift.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter by Zone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filterZone === 'all' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
            onPress={() => setFilterZone('all')}
          >
            <Text style={[styles.filterChipText, { color: filterZone === 'all' ? '#FFF' : colors.text }]}>
              All Zones
            </Text>
          </Pressable>
          {ZONES.map((zone) => (
            <Pressable
              key={zone}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterZone === zone && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
              ]}
              onPress={() => {
                setFilterZone(zone);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.filterChipText, { color: filterZone === zone ? '#FFF' : colors.text }]}>
                {zone.split(' - ')[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Today&apos;s Assignments ({filteredAssignments.length})
        </Text>

        {filteredAssignments.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assignments</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No crew assignments match the selected filters.
            </Text>
          </View>
        ) : (
          filteredAssignments.map(renderAssignmentCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#8B5CF6' }]}
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Assignment</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Crew Member *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberSelector}>
              {MOCK_CREW.filter(m => m.isActive).map((member) => (
                <Pressable
                  key={member.id}
                  style={[
                    styles.memberChip,
                    { borderColor: colors.border },
                    newAssignmentMember === member.id && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                  ]}
                  onPress={() => setNewAssignmentMember(member.id)}
                >
                  <Text style={[
                    styles.memberChipText,
                    { color: newAssignmentMember === member.id ? '#FFF' : colors.text },
                  ]}>
                    {member.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {ZONES.map((zone) => (
                <Pressable
                  key={zone}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newAssignmentZone === zone && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                  ]}
                  onPress={() => setNewAssignmentZone(zone)}
                >
                  <Text style={[
                    styles.optionChipText,
                    { color: newAssignmentZone === zone ? '#FFF' : colors.text },
                  ]}>
                    {zone.split(' - ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Shift</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {SHIFTS.map((shift) => (
                <Pressable
                  key={shift.id}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newAssignmentShift === shift.name && { backgroundColor: shift.color, borderColor: shift.color },
                  ]}
                  onPress={() => setNewAssignmentShift(shift.name)}
                >
                  <Text style={[
                    styles.optionChipText,
                    { color: newAssignmentShift === shift.name ? '#FFF' : colors.text },
                  ]}>
                    {shift.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.addButton, { backgroundColor: '#8B5CF6' }]}
              onPress={handleAddAssignment}
            >
              <Text style={styles.addButtonText}>Create Assignment</Text>
            </Pressable>
          </View>
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
    marginTop: 8,
  },
  filterRow: {
    marginBottom: 12,
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
  assignmentCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  assignmentHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  assignmentMeta: {
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
  taskPreview: {
    marginBottom: 12,
  },
  taskPreviewText: {
    fontSize: 12,
    fontStyle: 'italic' as const,
  },
  assignmentActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  completedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
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
  memberSelector: {
    marginBottom: 16,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  memberChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  optionRow: {
    marginBottom: 16,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  bottomPadding: {
    height: 80,
  },
});
