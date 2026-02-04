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
  LogOut,
  Search,
  Filter,
  User,
  Calendar,
  X,
  Plus,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  MOCK_EXIT_INTERVIEWS,
  EXIT_INTERVIEW_STATUS_LABELS,
  EXIT_INTERVIEW_STATUS_COLORS,
  SEPARATION_TYPE_LABELS,
  type ExitInterview,
  type ExitInterviewStatus,
} from '@/constants/complianceDataConstants';

type FilterStatus = 'all' | ExitInterviewStatus;

export default function ExitInterviewScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredInterviews = useMemo(() => {
    return MOCK_EXIT_INTERVIEWS.filter((interview) => {
      const matchesSearch = searchQuery === '' ||
        interview.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || interview.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = MOCK_EXIT_INTERVIEWS.length;
    const completed = MOCK_EXIT_INTERVIEWS.filter(i => i.status === 'completed').length;
    const scheduled = MOCK_EXIT_INTERVIEWS.filter(i => i.status === 'scheduled').length;
    const pending = MOCK_EXIT_INTERVIEWS.filter(i => i.status === 'pending').length;
    const completedWithResponses = MOCK_EXIT_INTERVIEWS.filter(i => i.status === 'completed' && i.responses);
    const avgSatisfaction = completedWithResponses.length > 0
      ? completedWithResponses.reduce((sum, i) => sum + (i.overallSatisfaction || 0), 0) / completedWithResponses.length
      : 0;
    const wouldRecommend = completedWithResponses.filter(i => i.wouldRecommend).length;
    return { total, completed, scheduled, pending, avgSatisfaction, wouldRecommend, completedCount: completedWithResponses.length };
  }, []);

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsIcon, { backgroundColor: '#64748B15' }]}>
          <LogOut size={24} color="#64748B" />
        </View>
        <View style={styles.statsHeaderText}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Exit Interviews</Text>
          <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>
            Departure Feedback Collection
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.scheduled}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Scheduled</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
      </View>

      {stats.completedCount > 0 && (
        <View style={[styles.insightsRow, { borderTopColor: colors.border }]}>
          <View style={styles.insightItem}>
            <Star size={16} color="#F59E0B" />
            <Text style={[styles.insightValue, { color: colors.text }]}>
              {stats.avgSatisfaction.toFixed(1)}/5
            </Text>
            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Avg Satisfaction</Text>
          </View>
          <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
          <View style={styles.insightItem}>
            <ThumbsUp size={16} color="#10B981" />
            <Text style={[styles.insightValue, { color: colors.text }]}>
              {Math.round((stats.wouldRecommend / stats.completedCount) * 100)}%
            </Text>
            <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Would Recommend</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderInterviewCard = (interview: ExitInterview) => {
    const statusColor = EXIT_INTERVIEW_STATUS_COLORS[interview.status];

    return (
      <TouchableOpacity
        key={interview.id}
        style={[styles.interviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedInterview(interview);
          setShowDetail(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {EXIT_INTERVIEW_STATUS_LABELS[interview.status]}
            </Text>
          </View>
          <View style={[styles.separationBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.separationText, { color: colors.textSecondary }]}>
              {SEPARATION_TYPE_LABELS[interview.separationType]}
            </Text>
          </View>
        </View>

        <View style={styles.employeeRow}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <User size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, { color: colors.text }]}>{interview.employeeName}</Text>
            <Text style={[styles.employeeMeta, { color: colors.textSecondary }]}>
              {interview.position} • {interview.department}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Last Day: {new Date(interview.lastWorkDay).toLocaleDateString()}
            </Text>
          </View>
          {interview.interviewDate && (
            <View style={styles.dateItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Interview: {new Date(interview.interviewDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {interview.status === 'completed' && interview.overallSatisfaction && (
          <View style={[styles.satisfactionRow, { backgroundColor: colors.background }]}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  color={star <= interview.overallSatisfaction! ? '#F59E0B' : colors.border}
                  fill={star <= interview.overallSatisfaction! ? '#F59E0B' : 'transparent'}
                />
              ))}
            </View>
            <View style={styles.recommendBadge}>
              {interview.wouldRecommend ? (
                <ThumbsUp size={12} color="#10B981" />
              ) : (
                <ThumbsDown size={12} color="#EF4444" />
              )}
              <Text style={[styles.recommendText, { color: interview.wouldRecommend ? '#10B981' : '#EF4444' }]}>
                {interview.wouldRecommend ? 'Would recommend' : 'Would not recommend'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSatisfactionBar = (label: string, value: number) => (
    <View style={styles.satisfactionBarItem}>
      <View style={styles.satisfactionBarLabel}>
        <Text style={[styles.satisfactionBarText, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.satisfactionBarValue, { color: colors.text }]}>{value}/5</Text>
      </View>
      <View style={[styles.satisfactionBarTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.satisfactionBarFill,
            {
              width: `${(value / 5) * 100}%`,
              backgroundColor: value >= 4 ? '#10B981' : value >= 3 ? '#F59E0B' : '#EF4444',
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search interviews..."
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
            {(['all', 'pending', 'scheduled', 'completed', 'declined', 'no-show'] as FilterStatus[]).map((status) => (
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
                  {status === 'all' ? 'All' : EXIT_INTERVIEW_STATUS_LABELS[status as ExitInterviewStatus]}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Exit Interviews</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {filteredInterviews.length} records
          </Text>
        </View>

        {filteredInterviews.map(renderInterviewCard)}

        {filteredInterviews.length === 0 && (
          <View style={styles.emptyState}>
            <LogOut size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No exit interviews found
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => Alert.alert('Schedule Interview', 'This would open a form to schedule a new exit interview.')}
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Exit Interview Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedInterview && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailHeaderRow}>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: `${EXIT_INTERVIEW_STATUS_COLORS[selectedInterview.status]}15` }]}>
                    <Text style={[styles.statusBadgeLargeText, { color: EXIT_INTERVIEW_STATUS_COLORS[selectedInterview.status] }]}>
                      {EXIT_INTERVIEW_STATUS_LABELS[selectedInterview.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.employeeDetailSection}>
                  <View style={[styles.avatarLarge, { backgroundColor: colors.background }]}>
                    <User size={28} color={colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={[styles.employeeDetailName, { color: colors.text }]}>
                      {selectedInterview.employeeName}
                    </Text>
                    <Text style={[styles.employeeDetailMeta, { color: colors.textSecondary }]}>
                      {selectedInterview.position}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedInterview.department}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manager</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedInterview.manager}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Separation Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {SEPARATION_TYPE_LABELS[selectedInterview.separationType]}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Work Day</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedInterview.lastWorkDay).toLocaleDateString()}
                  </Text>
                </View>

                {selectedInterview.interviewDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Interview Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedInterview.interviewDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {selectedInterview.interviewerName && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Interviewer</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedInterview.interviewerName}</Text>
                  </View>
                )}

                {selectedInterview.primaryReason && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Primary Reason</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedInterview.primaryReason}</Text>
                  </View>
                )}
              </View>

              {selectedInterview.responses && (
                <>
                  <View style={[styles.satisfactionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.satisfactionTitle, { color: colors.text }]}>Satisfaction Ratings</Text>
                    {renderSatisfactionBar('Job Satisfaction', selectedInterview.responses.jobSatisfaction)}
                    {renderSatisfactionBar('Management', selectedInterview.responses.managementSatisfaction)}
                    {renderSatisfactionBar('Work Environment', selectedInterview.responses.workEnvironmentSatisfaction)}
                    {renderSatisfactionBar('Compensation', selectedInterview.responses.compensationSatisfaction)}
                    {renderSatisfactionBar('Benefits', selectedInterview.responses.benefitsSatisfaction)}
                    {renderSatisfactionBar('Career Growth', selectedInterview.responses.careerGrowthSatisfaction)}
                    {renderSatisfactionBar('Work-Life Balance', selectedInterview.responses.workLifeBalanceSatisfaction)}
                  </View>

                  <View style={[styles.recommendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.recommendRow}>
                      <Text style={[styles.recommendLabel, { color: colors.textSecondary }]}>Would Recommend Company</Text>
                      <View style={[
                        styles.recommendBadgeLarge,
                        { backgroundColor: selectedInterview.responses.wouldRecommendCompany ? '#10B98115' : '#EF444415' }
                      ]}>
                        {selectedInterview.responses.wouldRecommendCompany ? (
                          <ThumbsUp size={16} color="#10B981" />
                        ) : (
                          <ThumbsDown size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.recommendBadgeText,
                          { color: selectedInterview.responses.wouldRecommendCompany ? '#10B981' : '#EF4444' }
                        ]}>
                          {selectedInterview.responses.wouldRecommendCompany ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recommendRow}>
                      <Text style={[styles.recommendLabel, { color: colors.textSecondary }]}>Would Return</Text>
                      <View style={[
                        styles.recommendBadgeLarge,
                        { backgroundColor: selectedInterview.responses.wouldReturnToCompany ? '#10B98115' : '#EF444415' }
                      ]}>
                        {selectedInterview.responses.wouldReturnToCompany ? (
                          <ThumbsUp size={16} color="#10B981" />
                        ) : (
                          <ThumbsDown size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.recommendBadgeText,
                          { color: selectedInterview.responses.wouldReturnToCompany ? '#10B981' : '#EF4444' }
                        ]}>
                          {selectedInterview.responses.wouldReturnToCompany ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.text }]}>What They Liked Most</Text>
                    <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                      {selectedInterview.responses.whatLikedMost}
                    </Text>
                  </View>

                  <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.text }]}>What They Liked Least</Text>
                    <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                      {selectedInterview.responses.whatLikedLeast}
                    </Text>
                  </View>

                  <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.text }]}>Improvement Suggestions</Text>
                    <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                      {selectedInterview.responses.improvementSuggestions}
                    </Text>
                  </View>

                  {selectedInterview.responses.additionalComments && (
                    <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.feedbackTitle, { color: colors.text }]}>Additional Comments</Text>
                      <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                        {selectedInterview.responses.additionalComments}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {selectedInterview.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => Alert.alert('Schedule', 'This would open a scheduler to set interview date.')}
                >
                  <Calendar size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Schedule Interview</Text>
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
  insightsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  insightItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  insightLabel: {
    fontSize: 11,
  },
  insightDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 12,
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
  interviewCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  separationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  separationText: {
    fontSize: 11,
    fontWeight: '500' as const,
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
    flexWrap: 'wrap',
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
  satisfactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendText: {
    fontSize: 11,
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
  detailHeaderRow: {
    marginBottom: 16,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeLargeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  employeeDetailSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  employeeDetailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  employeeDetailMeta: {
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
    flex: 1,
    textAlign: 'right',
  },
  satisfactionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  satisfactionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  satisfactionBarItem: {
    marginBottom: 12,
  },
  satisfactionBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  satisfactionBarText: {
    fontSize: 13,
  },
  satisfactionBarValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  satisfactionBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  satisfactionBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  recommendCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  recommendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recommendLabel: {
    fontSize: 14,
  },
  recommendBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  recommendBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
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
