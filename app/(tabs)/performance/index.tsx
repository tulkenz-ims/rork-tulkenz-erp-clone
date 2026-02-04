import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import {
  Award,
  Target,
  Users,
  TrendingUp,
  Search,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import {
  type PerformanceReview,
  type Goal,
  type Feedback360,
  type SuccessionPlan,
  type TalentProfile,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  GOAL_STATUS_COLORS,
} from '@/constants/performanceConstants';

type PerformanceView = 'reviews' | 'goals' | 'feedback' | 'succession' | 'talent';

export default function PerformanceScreen() {
  const { colors } = useTheme();
  const { performanceReviews, goals, feedback360, successionPlans, talentProfiles, employees } = useERP();

  const [currentView, setCurrentView] = useState<PerformanceView>('reviews');
  const [searchQuery, setSearchQuery] = useState('');

  const views = [
    { key: 'reviews' as const, label: 'Reviews', icon: Award },
    { key: 'goals' as const, label: 'Goals', icon: Target },
    { key: 'feedback' as const, label: '360 Feedback', icon: Users },
    { key: 'succession' as const, label: 'Succession', icon: TrendingUp },
    { key: 'talent' as const, label: 'Talent', icon: Star },
  ];

  const stats = useMemo(() => {
    const reviewsDue = performanceReviews.filter(r => r.status === 'in-progress' || r.status === 'not-started').length;
    const reviewsOverdue = performanceReviews.filter(r => r.status === 'overdue').length;
    const activeGoals = goals.filter(g => g.status === 'on-track' || g.status === 'at-risk').length;
    const goalsAtRisk = goals.filter(g => g.status === 'at-risk').length;
    const pending360 = feedback360.filter(f => f.status === 'pending' || f.status === 'in-progress').length;
    const criticalRoles = successionPlans.filter(s => s.criticalRole).length;

    return {
      reviewsDue,
      reviewsOverdue,
      activeGoals,
      goalsAtRisk,
      pending360,
      criticalRoles,
    };
  }, [performanceReviews, goals, feedback360, successionPlans]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  }, [employees]);

  const filteredReviews = useMemo(() => {
    return performanceReviews.filter(review => {
      const employeeName = getEmployeeName(review.employeeId);
      const reviewerName = getEmployeeName(review.reviewerId);
      return (
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reviewerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.reviewPeriod.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [performanceReviews, searchQuery, getEmployeeName]);

  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      const employeeName = getEmployeeName(goal.employeeId);
      return (
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [goals, searchQuery, getEmployeeName]);

  const renderReviewCard = (review: PerformanceReview) => {
    const employeeName = getEmployeeName(review.employeeId);
    const reviewerName = getEmployeeName(review.reviewerId);
    const statusColor = REVIEW_STATUS_COLORS[review.status];

    return (
      <TouchableOpacity
        key={review.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Award size={20} color={colors.primary} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{employeeName}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {review.reviewCycle} - {review.reviewPeriod}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {REVIEW_STATUS_LABELS[review.status]}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.reviewInfo}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reviewer</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{reviewerName}</Text>
          </View>
          <View style={styles.reviewInfo}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(review.dueDate).toLocaleDateString()}
            </Text>
          </View>
          {review.overallRating && (
            <View style={styles.reviewInfo}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Rating</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={16}
                    color={star <= review.overallRating! ? '#F59E0B' : colors.border}
                    fill={star <= review.overallRating! ? '#F59E0B' : 'none'}
                  />
                ))}
                <Text style={[styles.ratingText, { color: colors.text }]}>
                  {review.overallRating.toFixed(1)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {review.competencies.length > 0 && (
          <View style={styles.competenciesContainer}>
            <Text style={[styles.competenciesLabel, { color: colors.textSecondary }]}>
              {review.competencies.length} competencies evaluated
            </Text>
          </View>
        )}

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderGoalCard = (goal: Goal) => {
    const employeeName = getEmployeeName(goal.employeeId);
    const statusColor = GOAL_STATUS_COLORS[goal.status];

    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Target size={20} color={colors.primary} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{goal.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {employeeName} • {goal.category}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {goal.status.replace('-', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>{goal.progress}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: statusColor, width: `${goal.progress}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.goalDates}>
            <View style={styles.dateItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Target: {new Date(goal.targetDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {goal.milestones.length > 0 && (
            <View style={styles.milestonesContainer}>
              <Text style={[styles.milestonesText, { color: colors.textSecondary }]}>
                {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones completed
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderFeedbackCard = (feedback: Feedback360) => {
    const employeeName = getEmployeeName(feedback.employeeId);
    const totalResponses = feedback.responses.length;
    const completedResponses = feedback.responses.filter(r => r.status === 'submitted').length;

    return (
      <TouchableOpacity
        key={feedback.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Users size={20} color={colors.primary} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{employeeName}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {feedback.reviewCycle}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  feedback.status === 'completed'
                    ? '#10B98120'
                    : feedback.status === 'in-progress'
                    ? '#3B82F620'
                    : '#F59E0B20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    feedback.status === 'completed'
                      ? '#10B981'
                      : feedback.status === 'in-progress'
                      ? '#3B82F6'
                      : '#F59E0B',
                },
              ]}
            >
              {feedback.status.replace('-', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Responses Received
              </Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {completedResponses}/{totalResponses}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(completedResponses / totalResponses) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.feedbackDates}>
            <View style={styles.dateItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Due: {new Date(feedback.dueDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderSuccessionCard = (plan: SuccessionPlan) => {
    const incumbent = plan.incumbentId ? getEmployeeName(plan.incumbentId) : 'Vacant';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <TrendingUp size={20} color={colors.primary} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{plan.positionTitle}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {plan.department} • {incumbent}
              </Text>
            </View>
          </View>
          {plan.criticalRole && (
            <View style={[styles.badge, { backgroundColor: '#EF444420' }]}>
              <AlertCircle size={12} color="#EF4444" />
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>Critical</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.successorsList}>
            <Text style={[styles.successorsLabel, { color: colors.textSecondary }]}>
              {plan.successors.length} identified successor{plan.successors.length !== 1 ? 's' : ''}
            </Text>
            {plan.successors.slice(0, 2).map((successor, index) => {
              const successorName = getEmployeeName(successor.employeeId);
              return (
                <View key={successor.id} style={styles.successorItem}>
                  <View style={styles.successorInfo}>
                    <Text style={[styles.successorName, { color: colors.text }]}>
                      {index + 1}. {successorName}
                    </Text>
                    <Text style={[styles.successorReadiness, { color: colors.textSecondary }]}>
                      {successor.readiness.replace('-', ' ')}
                    </Text>
                  </View>
                  {successor.readiness === 'ready-now' && (
                    <CheckCircle size={16} color="#10B981" />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.planDates}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              Last reviewed: {new Date(plan.lastReviewed).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderTalentCard = (profile: TalentProfile) => {
    const employeeName = getEmployeeName(profile.employeeId);

    const getCategoryColor = (category: typeof profile.category) => {
      switch (category) {
        case 'high-performer':
          return '#10B981';
        case 'solid-performer':
          return '#3B82F6';
        case 'needs-improvement':
          return '#F59E0B';
        case 'critical-talent':
          return '#8B5CF6';
        default:
          return colors.textSecondary;
      }
    };

    const categoryColor = getCategoryColor(profile.category);

    return (
      <TouchableOpacity
        key={profile.employeeId}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Star size={20} color={colors.primary} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{employeeName}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Performance: {profile.performanceRating}/5 • Potential: {profile.potentialRating}/5
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.statusText, { color: categoryColor }]}>
              {profile.category.replace('-', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.talentMetrics}>
            <View style={styles.metricItem}>
              <View style={styles.ratingBox}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={14}
                    color={star <= profile.performanceRating ? '#F59E0B' : colors.border}
                    fill={star <= profile.performanceRating ? '#F59E0B' : 'none'}
                  />
                ))}
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Performance</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.ratingBox}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={14}
                    color={star <= profile.potentialRating ? '#3B82F6' : colors.border}
                    fill={star <= profile.potentialRating ? '#3B82F6' : 'none'}
                  />
                ))}
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Potential</Text>
            </View>
          </View>

          {profile.readyForPromotion && (
            <View style={[styles.badge, { backgroundColor: '#10B98120', marginTop: 12 }]}>
              <CheckCircle size={12} color="#10B981" />
              <Text style={[styles.badgeText, { color: '#10B981' }]}>Ready for Promotion</Text>
            </View>
          )}

          {profile.successorFor.length > 0 && (
            <View style={styles.successorForContainer}>
              <Text style={[styles.successorForLabel, { color: colors.textSecondary }]}>
                Successor for {profile.successorFor.length} position{profile.successorFor.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Performance Management',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
              <Clock size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.reviewsOverdue}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
              <AlertCircle size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.goalsAtRisk}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>At Risk</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
              <Award size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.criticalRoles}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Critical</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.viewTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {views.map(view => {
            const Icon = view.icon;
            const isActive = currentView === view.key;
            return (
              <TouchableOpacity
                key={view.key}
                style={[
                  styles.viewTab,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCurrentView(view.key)}
              >
                <Icon size={18} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[
                    styles.viewTabText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {view.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentView === 'reviews' && (
          <View style={styles.section}>
            {filteredReviews.length > 0 ? (
              filteredReviews.map(renderReviewCard)
            ) : (
              <View style={styles.emptyState}>
                <Award size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No performance reviews found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'goals' && (
          <View style={styles.section}>
            {filteredGoals.length > 0 ? (
              filteredGoals.map(renderGoalCard)
            ) : (
              <View style={styles.emptyState}>
                <Target size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No goals found</Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'feedback' && (
          <View style={styles.section}>
            {feedback360.length > 0 ? (
              feedback360.map(renderFeedbackCard)
            ) : (
              <View style={styles.emptyState}>
                <Users size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No 360 feedback requests found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'succession' && (
          <View style={styles.section}>
            {successionPlans.length > 0 ? (
              successionPlans.map(renderSuccessionCard)
            ) : (
              <View style={styles.emptyState}>
                <TrendingUp size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No succession plans found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'talent' && (
          <View style={styles.section}>
            {talentProfiles.length > 0 ? (
              talentProfiles.map(renderTalentCard)
            ) : (
              <View style={styles.emptyState}>
                <Star size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No talent profiles found
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  viewTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  viewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 12,
    gap: 6,
    borderWidth: 1,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  cardContent: {
    gap: 12,
  },
  reviewInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 4,
  },
  competenciesContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  competenciesLabel: {
    fontSize: 13,
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalDates: {
    gap: 6,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
  },
  milestonesContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  milestonesText: {
    fontSize: 13,
  },
  feedbackDates: {
    gap: 6,
  },
  successorsList: {
    gap: 8,
  },
  successorsLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  successorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  successorInfo: {
    flex: 1,
  },
  successorName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  successorReadiness: {
    fontSize: 12,
    textTransform: 'capitalize' as const,
  },
  planDates: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  talentMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    gap: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  successorForContainer: {
    marginTop: 8,
  },
  successorForLabel: {
    fontSize: 13,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
