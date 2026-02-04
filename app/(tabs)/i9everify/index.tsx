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
  FileCheck,
  Search,
  Filter,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Plus,
  FileText,
  Shield,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_I9_RECORDS,
  I9_STATUS_LABELS,
  I9_STATUS_COLORS,
  EVERIFY_STATUS_LABELS,
  EVERIFY_STATUS_COLORS,
  type I9Record,
  type I9Status,
} from '@/constants/complianceDataConstants';

type FilterStatus = 'all' | I9Status;

export default function I9EVerifyScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedRecord, setSelectedRecord] = useState<I9Record | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredRecords = useMemo(() => {
    return MOCK_I9_RECORDS.filter((record) => {
      const matchesSearch = searchQuery === '' ||
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || record.i9Status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = MOCK_I9_RECORDS.length;
    const verified = MOCK_I9_RECORDS.filter(r => r.i9Status === 'verified').length;
    const pending = MOCK_I9_RECORDS.filter(r => r.i9Status === 'pending' || r.i9Status === 'section1-complete').length;
    const needsAction = MOCK_I9_RECORDS.filter(r => r.i9Status === 'reverification-needed' || r.i9Status === 'expired').length;
    return { total, verified, pending, needsAction };
  }, []);

  const getStatusIcon = (status: I9Status) => {
    switch (status) {
      case 'verified': return CheckCircle;
      case 'pending':
      case 'section1-complete':
      case 'section2-complete': return Clock;
      case 'reverification-needed':
      case 'expired': return AlertTriangle;
      default: return Clock;
    }
  };

  const handleRecordPress = (record: I9Record) => {
    setSelectedRecord(record);
    setShowDetail(true);
  };

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsIcon, { backgroundColor: '#0284C715' }]}>
          <FileCheck size={24} color="#0284C7" />
        </View>
        <View style={styles.statsHeaderText}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>I-9 Compliance</Text>
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            Employment Eligibility Verification
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Records</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.verified}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verified</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.needsAction}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Needs Action</Text>
        </View>
      </View>
    </View>
  );

  const renderRecordCard = (record: I9Record) => {
    const StatusIcon = getStatusIcon(record.i9Status);
    const statusColor = I9_STATUS_COLORS[record.i9Status];
    const everifyColor = EVERIFY_STATUS_COLORS[record.everifyStatus];

    return (
      <TouchableOpacity
        key={record.id}
        style={[styles.recordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleRecordPress(record)}
      >
        <View style={styles.recordHeader}>
          <View style={[styles.recordAvatar, { backgroundColor: `${statusColor}15` }]}>
            <User size={20} color={statusColor} />
          </View>
          <View style={styles.recordInfo}>
            <Text style={[styles.recordName, { color: colors.text }]}>{record.employeeName}</Text>
            <Text style={[styles.recordId, { color: colors.textSecondary }]}>
              {record.employeeId} • Hired: {new Date(record.hireDate).toLocaleDateString()}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>I-9 Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <StatusIcon size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {I9_STATUS_LABELS[record.i9Status]}
              </Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>E-Verify</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${everifyColor}15` }]}>
              <Shield size={12} color={everifyColor} />
              <Text style={[styles.statusText, { color: everifyColor }]}>
                {EVERIFY_STATUS_LABELS[record.everifyStatus]}
              </Text>
            </View>
          </View>
        </View>

        {record.reverificationDate && (
          <View style={[styles.alertRow, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={[styles.alertText, { color: '#EF4444' }]}>
              Reverification due: {new Date(record.reverificationDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {record.notes && (
          <Text style={[styles.recordNotes, { color: colors.textSecondary }]} numberOfLines={1}>
            Note: {record.notes}
          </Text>
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
            {(['all', 'pending', 'section1-complete', 'verified', 'reverification-needed', 'expired'] as FilterStatus[]).map((status) => (
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
                  {status === 'all' ? 'All' : I9_STATUS_LABELS[status as I9Status]}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Records</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {filteredRecords.length} records
          </Text>
        </View>

        {filteredRecords.map(renderRecordCard)}

        {filteredRecords.length === 0 && (
          <View style={styles.emptyState}>
            <FileCheck size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No records found
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => Alert.alert('New I-9', 'This would open a form to create a new I-9 record.')}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>I-9 Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedRecord && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailAvatar, { backgroundColor: `${I9_STATUS_COLORS[selectedRecord.i9Status]}15` }]}>
                    <User size={28} color={I9_STATUS_COLORS[selectedRecord.i9Status]} />
                  </View>
                  <View style={styles.detailHeaderInfo}>
                    <Text style={[styles.detailName, { color: colors.text }]}>{selectedRecord.employeeName}</Text>
                    <Text style={[styles.detailId, { color: colors.textSecondary }]}>{selectedRecord.employeeId}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Hire Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedRecord.hireDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>I-9 Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${I9_STATUS_COLORS[selectedRecord.i9Status]}15` }]}>
                    <Text style={[styles.statusText, { color: I9_STATUS_COLORS[selectedRecord.i9Status] }]}>
                      {I9_STATUS_LABELS[selectedRecord.i9Status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>E-Verify Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${EVERIFY_STATUS_COLORS[selectedRecord.everifyStatus]}15` }]}>
                    <Text style={[styles.statusText, { color: EVERIFY_STATUS_COLORS[selectedRecord.everifyStatus] }]}>
                      {EVERIFY_STATUS_LABELS[selectedRecord.everifyStatus]}
                    </Text>
                  </View>
                </View>

                {selectedRecord.everifyCaseNumber && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>E-Verify Case #</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecord.everifyCaseNumber}</Text>
                  </View>
                )}

                {selectedRecord.section1CompletedDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Section 1 Completed</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedRecord.section1CompletedDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {selectedRecord.section2CompletedDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Section 2 Completed</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedRecord.section2CompletedDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {selectedRecord.reverificationDate && (
                  <View style={[styles.alertBox, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                    <AlertTriangle size={18} color="#EF4444" />
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: '#EF4444' }]}>Reverification Required</Text>
                      <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                        Due: {new Date(selectedRecord.reverificationDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {selectedRecord.documents.length > 0 && (
                <View style={[styles.documentsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.documentsTitle, { color: colors.text }]}>Verified Documents</Text>
                  {selectedRecord.documents.map((doc) => (
                    <View key={doc.id} style={[styles.documentItem, { borderBottomColor: colors.border }]}>
                      <View style={[styles.docIcon, { backgroundColor: colors.background }]}>
                        <FileText size={16} color={colors.primary} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={[styles.docTitle, { color: colors.text }]}>{doc.documentTitle}</Text>
                        <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                          {doc.listType.toUpperCase()} • #{doc.documentNumber}
                        </Text>
                        {doc.expirationDate && (
                          <Text style={[styles.docExpiry, { color: colors.textSecondary }]}>
                            Expires: {new Date(doc.expirationDate).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {selectedRecord.notes && (
                <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.notesTitle, { color: colors.text }]}>Notes</Text>
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>{selectedRecord.notes}</Text>
                </View>
              )}

              {(selectedRecord.i9Status === 'pending' || selectedRecord.i9Status === 'section1-complete') && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => Alert.alert('Complete I-9', 'This would open Section 2 verification.')}
                >
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Complete Section 2</Text>
                </TouchableOpacity>
              )}

              {selectedRecord.i9Status === 'reverification-needed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                  onPress={() => Alert.alert('Reverify', 'This would open Section 3 for reverification.')}
                >
                  <RefreshCw size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Start Reverification</Text>
                </TouchableOpacity>
              )}

              {selectedRecord.everifyStatus === 'not-submitted' && selectedRecord.i9Status === 'verified' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#0284C7' }]}
                  onPress={() => Alert.alert('E-Verify', 'This would submit the case to E-Verify.')}
                >
                  <Shield size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Submit to E-Verify</Text>
                </TouchableOpacity>
              )}
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
  recordCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  recordId: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  recordNotes: {
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  detailId: {
    fontSize: 14,
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
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
  },
  documentsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 12,
  },
  docExpiry: {
    fontSize: 11,
    marginTop: 2,
  },
  notesCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
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
    height: 80,
  },
});
