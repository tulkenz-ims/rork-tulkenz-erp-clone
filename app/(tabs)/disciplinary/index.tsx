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
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Plus,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_DISCIPLINARY_ACTIONS,
  DISCIPLINARY_TYPE_LABELS,
  DISCIPLINARY_TYPE_COLORS,
  DISCIPLINARY_CATEGORY_LABELS,
  type DisciplinaryAction,
  type DisciplinaryStatus,
} from '@/constants/complianceDataConstants';

type FilterStatus = 'all' | DisciplinaryStatus;

export default function DisciplinaryScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredActions = useMemo(() => {
    return MOCK_DISCIPLINARY_ACTIONS.filter((action) => {
      const matchesSearch = searchQuery === '' ||
        action.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || action.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = MOCK_DISCIPLINARY_ACTIONS.length;
    const active = MOCK_DISCIPLINARY_ACTIONS.filter(a => a.status === 'active').length;
    const resolved = MOCK_DISCIPLINARY_ACTIONS.filter(a => a.status === 'resolved').length;
    const pendingAck = MOCK_DISCIPLINARY_ACTIONS.filter(a => !a.employeeAcknowledged && a.status === 'active').length;
    return { total, active, resolved, pendingAck };
  }, []);

  const getStatusColor = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'active': return '#F59E0B';
      case 'resolved': return '#10B981';
      case 'appealed': return '#8B5CF6';
      case 'overturned': return '#3B82F6';
      case 'archived': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'active': return 'Active';
      case 'resolved': return 'Resolved';
      case 'appealed': return 'Appealed';
      case 'overturned': return 'Overturned';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsIcon, { backgroundColor: '#EA580C15' }]}>
          <AlertTriangle size={24} color="#EA580C" />
        </View>
        <View style={styles.statsHeaderText}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Disciplinary Actions</Text>
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            Tracking & Documentation
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Actions</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.resolved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.pendingAck}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Ack.</Text>
        </View>
      </View>
    </View>
  );

  const renderActionCard = (action: DisciplinaryAction) => {
    const typeColor = DISCIPLINARY_TYPE_COLORS[action.type];
    const statusColor = getStatusColor(action.status);

    return (
      <TouchableOpacity
        key={action.id}
        style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedAction(action);
          setShowDetail(true);
        }}
      >
        <View style={styles.actionHeader}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
            <AlertTriangle size={14} color={typeColor} />
            <Text style={[styles.typeText, { color: typeColor }]}>
              {DISCIPLINARY_TYPE_LABELS[action.type]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(action.status)}
            </Text>
          </View>
        </View>

        <View style={styles.employeeRow}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <User size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, { color: colors.text }]}>{action.employeeName}</Text>
            <Text style={[styles.employeeMeta, { color: colors.textSecondary }]}>
              {action.department} • {DISCIPLINARY_CATEGORY_LABELS[action.category]}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Issued: {new Date(action.issuedDate).toLocaleDateString()}
            </Text>
          </View>
          {action.followUpDate && (
            <View style={styles.dateItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Follow-up: {new Date(action.followUpDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {!action.employeeAcknowledged && action.status === 'active' && (
          <View style={[styles.alertBanner, { backgroundColor: '#EF444415' }]}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={[styles.alertBannerText, { color: '#EF4444' }]}>
              Pending employee acknowledgement
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
            placeholder="Search employees..."
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
            {(['all', 'active', 'resolved', 'appealed', 'archived'] as FilterStatus[]).map((status) => (
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
                  {status === 'all' ? 'All' : getStatusLabel(status as DisciplinaryStatus)}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Actions</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {filteredActions.length} records
          </Text>
        </View>

        {filteredActions.map(renderActionCard)}

        {filteredActions.length === 0 && (
          <View style={styles.emptyState}>
            <AlertTriangle size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No disciplinary actions found
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => Alert.alert('New Action', 'This would open a form to create a new disciplinary action.')}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Action Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedAction && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.typeBadgeLarge, { backgroundColor: `${DISCIPLINARY_TYPE_COLORS[selectedAction.type]}15` }]}>
                  <AlertTriangle size={20} color={DISCIPLINARY_TYPE_COLORS[selectedAction.type]} />
                  <Text style={[styles.typeLargeText, { color: DISCIPLINARY_TYPE_COLORS[selectedAction.type] }]}>
                    {DISCIPLINARY_TYPE_LABELS[selectedAction.type]}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Employee</Text>
                  <View style={styles.employeeDetailRow}>
                    <View style={[styles.avatarLarge, { backgroundColor: colors.background }]}>
                      <User size={24} color={colors.textSecondary} />
                    </View>
                    <View>
                      <Text style={[styles.employeeDetailName, { color: colors.text }]}>
                        {selectedAction.employeeName}
                      </Text>
                      <Text style={[styles.employeeDetailMeta, { color: colors.textSecondary }]}>
                        {selectedAction.employeeId} • {selectedAction.department}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {DISCIPLINARY_CATEGORY_LABELS[selectedAction.category]}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedAction.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedAction.status) }]}>
                      {getStatusLabel(selectedAction.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Incident Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedAction.incidentDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Issued Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedAction.issuedDate).toLocaleDateString()}
                  </Text>
                </View>

                {selectedAction.expirationDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expires</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedAction.expirationDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Prior Incidents</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAction.priorIncidents}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Acknowledged</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedAction.employeeAcknowledged ? '#10B98115' : '#EF444415' }]}>
                    {selectedAction.employeeAcknowledged ? (
                      <CheckCircle size={12} color="#10B981" />
                    ) : (
                      <AlertCircle size={12} color="#EF4444" />
                    )}
                    <Text style={[styles.statusText, { color: selectedAction.employeeAcknowledged ? '#10B981' : '#EF4444' }]}>
                      {selectedAction.employeeAcknowledged ? 'Yes' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Description</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedAction.description}
                </Text>
              </View>

              <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Corrective Action</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedAction.correctiveAction}
                </Text>
              </View>

              {selectedAction.employeeResponse && (
                <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.descriptionTitle, { color: colors.text }]}>Employee Response</Text>
                  <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                    {selectedAction.employeeResponse}
                  </Text>
                </View>
              )}

              {selectedAction.witnesses && selectedAction.witnesses.length > 0 && (
                <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.descriptionTitle, { color: colors.text }]}>Witnesses</Text>
                  {selectedAction.witnesses.map((witness, index) => (
                    <Text key={index} style={[styles.witnessText, { color: colors.textSecondary }]}>
                      • {witness}
                    </Text>
                  ))}
                </View>
              )}

              {!selectedAction.employeeAcknowledged && selectedAction.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => Alert.alert('Request Acknowledgement', 'This would send a request to the employee.')}
                >
                  <FileText size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Request Acknowledgement</Text>
                </TouchableOpacity>
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
  actionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  employeeMeta: {
    fontSize: 12,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  alertBannerText: {
    fontSize: 12,
    fontWeight: '500' as const,
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
  typeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  typeLargeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employeeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  employeeDetailName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  employeeDetailMeta: {
    fontSize: 13,
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
  witnessText: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
