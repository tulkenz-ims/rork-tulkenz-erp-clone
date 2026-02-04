import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Calendar,
  X,
  Plus,
  ChevronRight,
  AlertCircle,
  Lock,
  EyeOff,
  Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_GRIEVANCES,
  GRIEVANCE_TYPE_LABELS,
  GRIEVANCE_STATUS_LABELS,
  GRIEVANCE_STATUS_COLORS,
  type Grievance,
  type GrievanceStatus,
  type GrievancePriority,
} from '@/constants/complianceDataConstants';

type FilterStatus = 'all' | GrievanceStatus;

const PRIORITY_COLORS: Record<GrievancePriority, string> = {
  'low': '#6B7280',
  'medium': '#F59E0B',
  'high': '#EF4444',
  'critical': '#DC2626',
};

export default function GrievanceScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredGrievances = useMemo(() => {
    return MOCK_GRIEVANCES.filter((grievance) => {
      const matchesSearch = searchQuery === '' ||
        grievance.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grievance.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || grievance.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = MOCK_GRIEVANCES.length;
    const open = MOCK_GRIEVANCES.filter(g => !['resolved', 'closed', 'withdrawn'].includes(g.status)).length;
    const resolved = MOCK_GRIEVANCES.filter(g => g.status === 'resolved').length;
    const critical = MOCK_GRIEVANCES.filter(g => g.priority === 'critical' || g.priority === 'high').length;
    return { total, open, resolved, critical };
  }, []);

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsIcon, { backgroundColor: '#7C3AED15' }]}>
          <MessageSquare size={24} color="#7C3AED" />
        </View>
        <View style={styles.statsHeaderText}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Grievance Management</Text>
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            Complaint Resolution Center
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Cases</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.open}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.resolved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.critical}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>High Priority</Text>
        </View>
      </View>
    </View>
  );

  const renderGrievanceCard = (grievance: Grievance) => {
    const statusColor = GRIEVANCE_STATUS_COLORS[grievance.status];
    const priorityColor = PRIORITY_COLORS[grievance.priority];

    return (
      <TouchableOpacity
        key={grievance.id}
        style={[styles.grievanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedGrievance(grievance);
          setShowDetail(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.grievanceId, { color: colors.textSecondary }]}>{grievance.id}</Text>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          </View>
          <View style={styles.cardHeaderRight}>
            {grievance.confidential && (
              <View style={[styles.confidentialBadge, { backgroundColor: colors.background }]}>
                <Lock size={12} color={colors.textSecondary} />
              </View>
            )}
            {grievance.anonymous && (
              <View style={[styles.anonymousBadge, { backgroundColor: colors.background }]}>
                <EyeOff size={12} color={colors.textSecondary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.typeBadgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.typeText, { color: statusColor }]}>
              {GRIEVANCE_STATUS_LABELS[grievance.status]}
            </Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
              {GRIEVANCE_TYPE_LABELS[grievance.type]}
            </Text>
          </View>
        </View>

        <View style={styles.employeeRow}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            {grievance.anonymous ? (
              <EyeOff size={16} color={colors.textSecondary} />
            ) : (
              <User size={16} color={colors.textSecondary} />
            )}
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, { color: colors.text }]}>
              {grievance.anonymous ? 'Anonymous' : grievance.employeeName}
            </Text>
            <Text style={[styles.employeeMeta, { color: colors.textSecondary }]}>
              {grievance.department}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <Text style={[styles.descriptionPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {grievance.description}
        </Text>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Submitted: {new Date(grievance.submittedDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {grievance.assignedToName && (
          <View style={[styles.assignedRow, { backgroundColor: colors.background }]}>
            <Shield size={14} color={colors.primary} />
            <Text style={[styles.assignedText, { color: colors.textSecondary }]}>
              Assigned to: {grievance.assignedToName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search grievances..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && { backgroundColor: colors.primary }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['all', 'submitted', 'under-review', 'investigation', 'mediation', 'resolved', 'closed'] as FilterStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && { backgroundColor: colors.primary },
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === status ? '#fff' : colors.textSecondary },
                ]}>
                  {status === 'all' ? 'All' : GRIEVANCE_STATUS_LABELS[status as GrievanceStatus]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {renderStatsCard()}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Grievance Cases</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {filteredGrievances.length} cases
          </Text>
        </View>

        {filteredGrievances.map(renderGrievanceCard)}

        {filteredGrievances.length === 0 && (
          <View style={styles.emptyState}>
            <MessageSquare size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No grievances found
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => Alert.alert('New Grievance', 'This would open a form to submit a new grievance.')}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Grievance Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedGrievance && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailHeaderRow}>
                  <Text style={[styles.detailId, { color: colors.textSecondary }]}>{selectedGrievance.id}</Text>
                  <View style={styles.detailBadges}>
                    {selectedGrievance.confidential && (
                      <View style={[styles.detailBadge, { backgroundColor: '#EF444415' }]}>
                        <Lock size={12} color="#EF4444" />
                        <Text style={[styles.detailBadgeText, { color: '#EF4444' }]}>Confidential</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.statusPriorityRow}>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: `${GRIEVANCE_STATUS_COLORS[selectedGrievance.status]}15` }]}>
                    <Text style={[styles.statusBadgeLargeText, { color: GRIEVANCE_STATUS_COLORS[selectedGrievance.status] }]}>
                      {GRIEVANCE_STATUS_LABELS[selectedGrievance.status]}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[selectedGrievance.priority]}15` }]}>
                    <AlertCircle size={14} color={PRIORITY_COLORS[selectedGrievance.priority]} />
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[selectedGrievance.priority] }]}>
                      {selectedGrievance.priority.charAt(0).toUpperCase() + selectedGrievance.priority.slice(1)} Priority
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {GRIEVANCE_TYPE_LABELS[selectedGrievance.type]}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Complainant</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedGrievance.anonymous ? 'Anonymous' : selectedGrievance.employeeName}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGrievance.department}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedGrievance.submittedDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Incident Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedGrievance.incidentDate).toLocaleDateString()}
                  </Text>
                </View>

                {selectedGrievance.assignedToName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGrievance.assignedToName}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Description</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedGrievance.description}
                </Text>
              </View>

              <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Desired Resolution</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedGrievance.desiredResolution}
                </Text>
              </View>

              {selectedGrievance.resolution && (
                <View style={[styles.descriptionCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
                  <Text style={[styles.descriptionTitle, { color: '#10B981' }]}>Resolution</Text>
                  <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    {selectedGrievance.resolution}
                  </Text>
                </View>
              )}

              {selectedGrievance.timeline.length > 0 && (
                <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.timelineTitle, { color: colors.text }]}>Timeline</Text>
                  {selectedGrievance.timeline.map((entry, index) => (
                    <View key={entry.id} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                        {index < selectedGrievance.timeline.length - 1 && (
                          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineAction, { color: colors.text }]}>{entry.action}</Text>
                        <Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>
                          {new Date(entry.date).toLocaleDateString()} • {entry.performedBy}
                        </Text>
                        {entry.notes && (
                          <Text style={[styles.timelineNotes, { color: colors.textSecondary }]}>
                            {entry.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    padding: 10,
    borderRadius: 10,
  },
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statsHeaderText: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sectionCount: {
    fontSize: 13,
  },
  grievanceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    gap: 6,
  },
  grievanceId: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidentialBadge: {
    padding: 6,
    borderRadius: 6,
  },
  anonymousBadge: {
    padding: 6,
    borderRadius: 6,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  employeeMeta: {
    fontSize: 12,
  },
  descriptionPreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  assignedText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailId: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statusPriorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeLargeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  descriptionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  timelineCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineAction: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  timelineMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  timelineNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
});
