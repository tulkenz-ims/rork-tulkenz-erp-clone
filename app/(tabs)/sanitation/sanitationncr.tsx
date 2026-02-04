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
  AlertTriangle,
  Plus,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  X,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SanitationArea } from '@/hooks/useSupabaseSanitation';
import * as Haptics from 'expo-haptics';

type NCRStatus = 'open' | 'investigation' | 'corrective_action' | 'verification' | 'closed';
type NCRSeverity = 'minor' | 'major' | 'critical';

interface SanitationNCR {
  id: string;
  ncrNumber: string;
  status: NCRStatus;
  severity: NCRSeverity;
  area: SanitationArea;
  location: string;
  discoveredDate: string;
  discoveredBy: string;
  description: string;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  closedDate: string | null;
  closedBy: string | null;
  repeatOccurrence: boolean;
  notes: string | null;
}

const AREA_LABELS: Record<SanitationArea, string> = {
  restroom: 'Restroom',
  break_room: 'Break Room',
  locker_room: 'Locker Room',
  office: 'Office',
  common_area: 'Common Area',
  floor: 'Floor Care',
  exterior: 'Exterior',
  production: 'Production',
  warehouse: 'Warehouse',
  other: 'Other',
};

const STATUS_CONFIG: Record<NCRStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: '#EF4444', bgColor: '#EF444415' },
  investigation: { label: 'Investigation', color: '#F59E0B', bgColor: '#F59E0B15' },
  corrective_action: { label: 'Corrective Action', color: '#3B82F6', bgColor: '#3B82F615' },
  verification: { label: 'Verification', color: '#8B5CF6', bgColor: '#8B5CF615' },
  closed: { label: 'Closed', color: '#10B981', bgColor: '#10B98115' },
};

const SEVERITY_CONFIG: Record<NCRSeverity, { label: string; color: string }> = {
  minor: { label: 'Minor', color: '#F59E0B' },
  major: { label: 'Major', color: '#EF4444' },
  critical: { label: 'Critical', color: '#DC2626' },
};

const MOCK_NCRS: SanitationNCR[] = [
  {
    id: '1',
    ncrNumber: 'NCR-SAN-2501-001',
    status: 'corrective_action',
    severity: 'major',
    area: 'restroom',
    location: 'Building A - 1st Floor Men\'s Restroom',
    discoveredDate: '2025-01-24',
    discoveredBy: 'Quality Inspector',
    description: 'Mold observed on ceiling tiles above sink area. Multiple tiles affected.',
    rootCause: 'Ventilation system not functioning properly, causing moisture buildup.',
    correctiveAction: 'Replace affected ceiling tiles, repair ventilation system.',
    preventiveAction: 'Implement weekly ventilation checks.',
    assignedTo: 'Maintenance Team',
    dueDate: '2025-01-28',
    closedDate: null,
    closedBy: null,
    repeatOccurrence: false,
    notes: 'Maintenance scheduled for 1/27',
  },
  {
    id: '2',
    ncrNumber: 'NCR-SAN-2501-002',
    status: 'open',
    severity: 'critical',
    area: 'production',
    location: 'Production Floor - Line 3 Area',
    discoveredDate: '2025-01-25',
    discoveredBy: 'Shift Supervisor',
    description: 'Standing water found near production equipment. Potential contamination risk.',
    rootCause: null,
    correctiveAction: null,
    preventiveAction: null,
    assignedTo: null,
    dueDate: null,
    closedDate: null,
    closedBy: null,
    repeatOccurrence: false,
    notes: null,
  },
  {
    id: '3',
    ncrNumber: 'NCR-SAN-2501-003',
    status: 'closed',
    severity: 'minor',
    area: 'break_room',
    location: 'Building B - Break Room',
    discoveredDate: '2025-01-20',
    discoveredBy: 'Sanitation Crew',
    description: 'Trash receptacle overflowing, not emptied per schedule.',
    rootCause: 'Missed cleaning rotation due to staff absence.',
    correctiveAction: 'Emptied trash, cleaned area, counseled staff.',
    preventiveAction: 'Added backup assignments for staff absences.',
    assignedTo: 'Sanitation Lead',
    dueDate: '2025-01-21',
    closedDate: '2025-01-21',
    closedBy: 'Quality Manager',
    repeatOccurrence: false,
    notes: 'Issue resolved same day.',
  },
];

export default function SanitationNCRScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [ncrs, setNcrs] = useState(MOCK_NCRS);
  const [filterStatus, setFilterStatus] = useState<NCRStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<SanitationNCR | null>(null);

  const [newDescription, setNewDescription] = useState('');
  const [newArea, setNewArea] = useState<SanitationArea>('restroom');
  const [newLocation, setNewLocation] = useState('');
  const [newSeverity, setNewSeverity] = useState<NCRSeverity>('minor');

  const filteredNCRs = useMemo(() => {
    if (filterStatus === 'all') return ncrs;
    return ncrs.filter(n => n.status === filterStatus);
  }, [ncrs, filterStatus]);

  const ncrStats = useMemo(() => {
    return {
      total: ncrs.length,
      open: ncrs.filter(n => n.status === 'open').length,
      inProgress: ncrs.filter(n => ['investigation', 'corrective_action', 'verification'].includes(n.status)).length,
      closed: ncrs.filter(n => n.status === 'closed').length,
    };
  }, [ncrs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const generateNCRNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `NCR-SAN-${year}${month}-${random}`;
  };

  const handleAddNCR = useCallback(() => {
    if (!newDescription.trim()) {
      Alert.alert('Missing Information', 'Please describe the non-conformance.');
      return;
    }
    if (!newLocation.trim()) {
      Alert.alert('Missing Information', 'Please enter the location.');
      return;
    }

    const newNCR: SanitationNCR = {
      id: Date.now().toString(),
      ncrNumber: generateNCRNumber(),
      status: 'open',
      severity: newSeverity,
      area: newArea,
      location: newLocation,
      discoveredDate: new Date().toISOString().split('T')[0],
      discoveredBy: user?.displayName || 'Unknown',
      description: newDescription,
      rootCause: null,
      correctiveAction: null,
      preventiveAction: null,
      assignedTo: null,
      dueDate: null,
      closedDate: null,
      closedBy: null,
      repeatOccurrence: false,
      notes: null,
    };

    setNcrs(prev => [newNCR, ...prev]);
    setShowAddModal(false);
    setNewDescription('');
    setNewLocation('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('NCR Created', `Non-conformance report ${newNCR.ncrNumber} has been created.`);
  }, [newDescription, newArea, newLocation, newSeverity, user]);

  const handleStatusChange = useCallback((ncrId: string, newStatus: NCRStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNcrs(prev =>
      prev.map(n => {
        if (n.id === ncrId) {
          return {
            ...n,
            status: newStatus,
            closedDate: newStatus === 'closed' ? new Date().toISOString().split('T')[0] : n.closedDate,
            closedBy: newStatus === 'closed' ? user?.displayName || 'Unknown' : n.closedBy,
          };
        }
        return n;
      })
    );
    setSelectedNCR(null);
    Alert.alert('Status Updated', `NCR status changed to ${STATUS_CONFIG[newStatus].label}`);
  }, [user]);

  const renderNCRCard = (ncr: SanitationNCR) => {
    const statusConfig = STATUS_CONFIG[ncr.status];
    const severityConfig = SEVERITY_CONFIG[ncr.severity];
    
    return (
      <Pressable
        key={ncr.id}
        style={[styles.ncrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedNCR(ncr)}
      >
        <View style={styles.ncrHeader}>
          <View style={styles.ncrBadges}>
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '20' }]}>
              <AlertTriangle size={12} color={severityConfig.color} />
              <Text style={[styles.severityText, { color: severityConfig.color }]}>{severityConfig.label}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
          <Text style={[styles.ncrNumber, { color: colors.textSecondary }]}>{ncr.ncrNumber}</Text>
        </View>

        <Text style={[styles.ncrDescription, { color: colors.text }]} numberOfLines={2}>
          {ncr.description}
        </Text>

        <View style={styles.ncrMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{ncr.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {new Date(ncr.discoveredDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {ncr.assignedTo && (
          <View style={styles.assignedRow}>
            <User size={14} color={colors.textTertiary} />
            <Text style={[styles.assignedText, { color: colors.textSecondary }]}>
              Assigned to: {ncr.assignedTo}
            </Text>
          </View>
        )}

        <View style={styles.ncrFooter}>
          {ncr.dueDate && ncr.status !== 'closed' && (
            <View style={styles.dueDate}>
              <Clock size={12} color={new Date(ncr.dueDate) < new Date() ? '#EF4444' : colors.textTertiary} />
              <Text style={[
                styles.dueDateText,
                { color: new Date(ncr.dueDate) < new Date() ? '#EF4444' : colors.textSecondary }
              ]}>
                Due: {new Date(ncr.dueDate).toLocaleDateString()}
              </Text>
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
          <View style={[styles.iconContainer, { backgroundColor: '#DC2626' + '20' }]}>
            <AlertTriangle size={28} color="#DC2626" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sanitation NCR</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Non-Conformance Reports
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{ncrStats.open}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{ncrStats.inProgress}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{ncrStats.closed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Closed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{ncrStats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                filterStatus === 'all' && { backgroundColor: '#DC2626', borderColor: '#DC2626' },
              ]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterChipText, { color: filterStatus === 'all' ? '#FFF' : colors.text }]}>
                All
              </Text>
            </Pressable>
            {(Object.keys(STATUS_CONFIG) as NCRStatus[]).map((status) => (
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
        </View>

        {filteredNCRs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CheckCircle2 size={48} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No NCRs Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterStatus === 'all' 
                ? 'No non-conformance reports have been created.' 
                : `No ${STATUS_CONFIG[filterStatus as NCRStatus].label.toLowerCase()} NCRs.`}
            </Text>
          </View>
        ) : (
          filteredNCRs.map(renderNCRCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#DC2626' }]}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Report Non-Conformance</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Describe the non-conformance issue..."
              placeholderTextColor={colors.textTertiary}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Building A - 1st Floor Restroom"
              placeholderTextColor={colors.textTertiary}
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Area</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
              {(Object.keys(AREA_LABELS) as SanitationArea[]).map((area) => (
                <Pressable
                  key={area}
                  style={[
                    styles.optionChip,
                    { borderColor: colors.border },
                    newArea === area && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
                  ]}
                  onPress={() => setNewArea(area)}
                >
                  <Text style={[styles.optionChipText, { color: newArea === area ? '#FFF' : colors.text }]}>
                    {AREA_LABELS[area]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Severity</Text>
            <View style={styles.severitySelector}>
              {(Object.keys(SEVERITY_CONFIG) as NCRSeverity[]).map((severity) => (
                <Pressable
                  key={severity}
                  style={[
                    styles.severityOption,
                    { borderColor: colors.border },
                    newSeverity === severity && { backgroundColor: SEVERITY_CONFIG[severity].color, borderColor: SEVERITY_CONFIG[severity].color },
                  ]}
                  onPress={() => setNewSeverity(severity)}
                >
                  <AlertTriangle size={16} color={newSeverity === severity ? '#FFF' : SEVERITY_CONFIG[severity].color} />
                  <Text style={[styles.severityOptionText, { color: newSeverity === severity ? '#FFF' : colors.text }]}>
                    {SEVERITY_CONFIG[severity].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.addButton, { backgroundColor: '#DC2626' }]}
              onPress={handleAddNCR}
            >
              <Text style={styles.addButtonText}>Create NCR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedNCR}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedNCR(null)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.detailModalContent, { backgroundColor: colors.surface }]}>
            {selectedNCR && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedNCR.ncrNumber}</Text>
                  <Pressable onPress={() => setSelectedNCR(null)}>
                    <X size={24} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.detailBadges}>
                  <View style={[styles.severityBadge, { backgroundColor: SEVERITY_CONFIG[selectedNCR.severity].color + '20' }]}>
                    <AlertTriangle size={14} color={SEVERITY_CONFIG[selectedNCR.severity].color} />
                    <Text style={[styles.severityText, { color: SEVERITY_CONFIG[selectedNCR.severity].color }]}>
                      {SEVERITY_CONFIG[selectedNCR.severity].label}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedNCR.status].bgColor }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedNCR.status].color }]}>
                      {STATUS_CONFIG[selectedNCR.status].label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailHalf}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedNCR.discoveredDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailHalf}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.discoveredBy}</Text>
                  </View>
                </View>

                {selectedNCR.rootCause && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Root Cause</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.rootCause}</Text>
                  </View>
                )}

                {selectedNCR.correctiveAction && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Corrective Action</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.correctiveAction}</Text>
                  </View>
                )}

                {selectedNCR.status !== 'closed' && (
                  <View style={styles.statusActions}>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Update Status:</Text>
                    <View style={styles.statusButtons}>
                      {selectedNCR.status === 'open' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#F59E0B' }]}
                          onPress={() => handleStatusChange(selectedNCR.id, 'investigation')}
                        >
                          <Text style={styles.statusBtnText}>Start Investigation</Text>
                        </Pressable>
                      )}
                      {selectedNCR.status === 'investigation' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#3B82F6' }]}
                          onPress={() => handleStatusChange(selectedNCR.id, 'corrective_action')}
                        >
                          <Text style={styles.statusBtnText}>Begin Corrective Action</Text>
                        </Pressable>
                      )}
                      {selectedNCR.status === 'corrective_action' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#8B5CF6' }]}
                          onPress={() => handleStatusChange(selectedNCR.id, 'verification')}
                        >
                          <Text style={styles.statusBtnText}>Submit for Verification</Text>
                        </Pressable>
                      )}
                      {selectedNCR.status === 'verification' && (
                        <Pressable
                          style={[styles.statusBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleStatusChange(selectedNCR.id, 'closed')}
                        >
                          <Text style={styles.statusBtnText}>Close NCR</Text>
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
  filterRow: {
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
  ncrCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  ncrHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  ncrBadges: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  severityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  ncrNumber: {
    fontSize: 11,
  },
  ncrDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ncrMeta: {
    gap: 6,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  assignedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  assignedText: {
    fontSize: 12,
  },
  ncrFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  dueDate: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
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
    maxHeight: '85%',
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
    minHeight: 100,
    textAlignVertical: 'top' as const,
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
  severitySelector: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 20,
  },
  severityOption: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  addButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailBadges: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
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
  statusActions: {
    marginTop: 20,
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
