import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSupabasePerformance, type EmployeeGoal, type GoalStatus, type GoalPriority } from '@/hooks/useSupabasePerformance';
import { useEmployees } from '@/hooks/useSupabaseEmployees';
import {
  Target,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  ChevronRight,
  X,
  Flag,
  Award,
  Zap,
  BarChart3,
} from 'lucide-react-native';
import { GOAL_STATUS_COLORS, GOAL_CATEGORIES } from '@/constants/performanceConstants';

type FilterType = 'all' | 'my-goals' | 'team-goals' | 'department';
type StatusFilter = 'all' | GoalStatus;

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useUser();
  const { goals: supabaseGoals, createGoal, updateGoalProgress, isLoading } = useSupabasePerformance();
  const { data: employees = [] } = useEmployees();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<EmployeeGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'Professional Development',
    priority: 'medium' as GoalPriority,
    targetDate: '',
    employeeId: currentUser?.id || '',
  });

  const stats = useMemo(() => {
    const myGoals = supabaseGoals.filter(g => g.employee_id === currentUser?.id);
    const activeGoals = supabaseGoals.filter(g => g.status === 'on-track' || g.status === 'at-risk');
    const completedGoals = supabaseGoals.filter(g => g.status === 'completed');
    const atRiskGoals = supabaseGoals.filter(g => g.status === 'at-risk');
    const avgProgress = supabaseGoals.length > 0 
      ? Math.round(supabaseGoals.reduce((sum, g) => sum + g.progress, 0) / supabaseGoals.length)
      : 0;

    return {
      total: supabaseGoals.length,
      myGoals: myGoals.length,
      active: activeGoals.length,
      completed: completedGoals.length,
      atRisk: atRiskGoals.length,
      avgProgress,
    };
  }, [supabaseGoals, currentUser]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  }, [employees]);

  const filteredGoals = useMemo(() => {
    let filtered = supabaseGoals;

    if (filterType === 'my-goals') {
      filtered = filtered.filter(g => g.employee_id === currentUser?.id);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(goal => {
        const employeeName = getEmployeeName(goal.employee_id);
        return (
          goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (goal.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (goal.category || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    return filtered.sort((a, b) => {
      if (a.priority === b.priority) {
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      }
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [supabaseGoals, filterType, statusFilter, searchQuery, getEmployeeName, currentUser]);

  const handleCreateGoal = useCallback(async () => {
    if (!newGoal.title.trim() || !newGoal.targetDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoal({
        employee_id: newGoal.employeeId || currentUser?.id || '',
        title: newGoal.title,
        description: newGoal.description || null,
        category: newGoal.category || null,
        priority: newGoal.priority,
        status: 'not-started',
        progress: 0,
        start_date: new Date().toISOString().split('T')[0],
        target_date: newGoal.targetDate,
        completed_date: null,
        milestones: [],
        aligned_to: null,
        metrics: [],
        created_by: currentUser?.first_name && currentUser?.last_name 
          ? `${currentUser.first_name} ${currentUser.last_name}` 
          : 'System',
        created_by_id: currentUser?.id || null,
      });

      setShowCreateModal(false);
      setNewGoal({
        title: '',
        description: '',
        category: 'Professional Development',
        priority: 'medium',
        targetDate: '',
        employeeId: currentUser?.id || '',
      });
      Alert.alert('Success', 'Goal created successfully');
    } catch (error) {
      console.error('[GoalsScreen] Error creating goal:', error);
      Alert.alert('Error', 'Failed to create goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newGoal, currentUser, createGoal]);

  const handleUpdateProgress = useCallback(async (goalId: string, progress: number) => {
    const goal = supabaseGoals.find(g => g.id === goalId);
    if (!goal) return;

    let newStatus: GoalStatus = goal.status;
    if (progress === 100) {
      newStatus = 'completed';
    } else if (progress > 0) {
      const daysUntilTarget = Math.floor(
        (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilTarget < 30 && progress < 70) {
        newStatus = 'at-risk';
      } else if (progress > 0) {
        newStatus = 'on-track';
      }
    }

    try {
      await updateGoalProgress({ id: goalId, progress, status: newStatus });
    } catch (error) {
      console.error('[GoalsScreen] Error updating progress:', error);
      Alert.alert('Error', 'Failed to update progress. Please try again.');
    }
  }, [supabaseGoals, updateGoalProgress]);

  const getPriorityColor = (priority: GoalPriority) => {
    switch (priority) {
      case 'critical':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  const renderGoalCard = (goal: EmployeeGoal) => {
    const employeeName = getEmployeeName(goal.employee_id);
    const statusColor = GOAL_STATUS_COLORS[goal.status] || '#6B7280';
    const priorityColor = getPriorityColor(goal.priority);
    const daysUntilTarget = Math.floor(
      (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysUntilTarget < 0 && goal.status !== 'completed';

    return (
      <TouchableOpacity
        key={goal.id}
        style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedGoal(goal)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{goal.title}</Text>
              <View style={styles.cardMeta}>
                <User size={12} color={colors.textSecondary} />
                <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                  {employeeName}
                </Text>
                {goal.category && (
                  <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                      {goal.category}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {goal.status.replace('-', ' ')}
            </Text>
          </View>
        </View>

        {goal.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {goal.description}
          </Text>
        )}

        <View style={styles.progressSection}>
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

        <View style={styles.cardFooter}>
          <View style={styles.dateSection}>
            <Calendar size={14} color={isOverdue ? '#EF4444' : colors.textSecondary} />
            <Text style={[styles.dateText, { color: isOverdue ? '#EF4444' : colors.textSecondary }]}>
              {isOverdue ? 'Overdue' : `${daysUntilTarget} days left`}
            </Text>
          </View>
          {goal.milestones.length > 0 && (
            <View style={styles.milestoneSection}>
              <CheckCircle size={14} color={colors.textSecondary} />
              <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
                {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textTertiary} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  const renderGoalDetail = () => {
    if (!selectedGoal) return null;

    const employeeName = getEmployeeName(selectedGoal.employee_id);
    const statusColor = GOAL_STATUS_COLORS[selectedGoal.status] || '#6B7280';
    const priorityColor = getPriorityColor(selectedGoal.priority);

    return (
      <Modal
        visible={!!selectedGoal}
        animationType="slide"
        onRequestClose={() => setSelectedGoal(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Goal Details</Text>
            <TouchableOpacity onPress={() => setSelectedGoal(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleRow}>
                  <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedGoal.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {selectedGoal.status.replace('-', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailMeta}>
                <View style={styles.metaItem}>
                  <User size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Owner</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{employeeName}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Flag size={16} color={priorityColor} />
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Priority</Text>
                  <Text style={[styles.metaValue, { color: priorityColor }]}>
                    {selectedGoal.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Award size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Category</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{selectedGoal.category || 'N/A'}</Text>
                </View>
              </View>

              {selectedGoal.description && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                  <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
                    {selectedGoal.description}
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress</Text>
                <View style={styles.progressUpdate}>
                  <View style={styles.progressControls}>
                    <TouchableOpacity
                      style={[styles.progressButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newProgress = Math.max(0, selectedGoal.progress - 10);
                        handleUpdateProgress(selectedGoal.id, newProgress);
                        setSelectedGoal({ ...selectedGoal, progress: newProgress });
                      }}
                    >
                      <Text style={[styles.progressButtonText, { color: colors.text }]}>-10%</Text>
                    </TouchableOpacity>
                    <View style={styles.progressDisplay}>
                      <Text style={[styles.progressPercentage, { color: colors.text }]}>
                        {selectedGoal.progress}%
                      </Text>
                      <View style={[styles.progressBar, { backgroundColor: colors.border, width: 120 }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { backgroundColor: statusColor, width: `${selectedGoal.progress}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.progressButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        const newProgress = Math.min(100, selectedGoal.progress + 10);
                        handleUpdateProgress(selectedGoal.id, newProgress);
                        setSelectedGoal({ ...selectedGoal, progress: newProgress });
                      }}
                    >
                      <Text style={[styles.progressButtonText, { color: '#FFFFFF' }]}>+10%</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Text>
                <View style={styles.timelineItem}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>Start Date</Text>
                  <Text style={[styles.timelineValue, { color: colors.text }]}>
                    {new Date(selectedGoal.start_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.timelineItem}>
                  <Target size={16} color={colors.primary} />
                  <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>Target Date</Text>
                  <Text style={[styles.timelineValue, { color: colors.text }]}>
                    {new Date(selectedGoal.target_date).toLocaleDateString()}
                  </Text>
                </View>
                {selectedGoal.completed_date && (
                  <View style={styles.timelineItem}>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>Completed</Text>
                    <Text style={[styles.timelineValue, { color: colors.text }]}>
                      {new Date(selectedGoal.completed_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {selectedGoal.milestones.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
                  {selectedGoal.milestones.map((milestone) => (
                    <View
                      key={milestone.id}
                      style={[styles.milestoneItem, { borderColor: colors.border }]}
                    >
                      <View style={styles.milestoneHeader}>
                        {milestone.completed ? (
                          <CheckCircle size={20} color="#10B981" />
                        ) : (
                          <View style={[styles.milestoneCircle, { borderColor: colors.border }]} />
                        )}
                        <Text
                          style={[
                            styles.milestoneDescription,
                            { color: milestone.completed ? colors.textSecondary : colors.text },
                            milestone.completed && styles.milestoneCompleted,
                          ]}
                        >
                          {milestone.description}
                        </Text>
                      </View>
                      <Text style={[styles.milestoneDate, { color: colors.textSecondary }]}>
                        Target: {new Date(milestone.targetDate).toLocaleDateString()}
                      </Text>
                      {milestone.completed && milestone.completedDate && (
                        <Text style={[styles.milestoneDate, { color: '#10B981' }]}>
                          Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {selectedGoal.aligned_to && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Alignment</Text>
                  <View style={[styles.alignmentBox, { backgroundColor: colors.background }]}>
                    <Zap size={16} color={colors.primary} />
                    <Text style={[styles.alignmentText, { color: colors.text }]}>
                      {selectedGoal.aligned_to}
                    </Text>
                  </View>
                </View>
              )}

              {selectedGoal.metrics && selectedGoal.metrics.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Success Metrics</Text>
                  {selectedGoal.metrics.map((metric, index) => (
                    <View key={index} style={styles.metricItem}>
                      <BarChart3 size={14} color={colors.primary} />
                      <Text style={[styles.metricText, { color: colors.textSecondary }]}>{metric}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Goal</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Goal Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter goal title"
                placeholderTextColor={colors.textTertiary}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter goal description"
                placeholderTextColor={colors.textTertiary}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {GOAL_CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: newGoal.category === category ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, category })}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: newGoal.category === category ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'medium', 'high', 'critical'] as GoalPriority[]).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: newGoal.priority === priority ? getPriorityColor(priority) + '20' : colors.background,
                        borderColor: newGoal.priority === priority ? getPriorityColor(priority) : colors.border,
                      },
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, priority })}
                  >
                    <Flag size={16} color={getPriorityColor(priority)} />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: newGoal.priority === priority ? getPriorityColor(priority) : colors.text },
                      ]}
                    >
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Target Date *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
                value={newGoal.targetDate}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetDate: text })}
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleCreateGoal}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Goal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen
          options={{
            title: 'Goal Management',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Goal Management',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
              <Target size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <CheckCircle size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
              <AlertCircle size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.atRisk}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>At Risk</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
              <TrendingUp size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgProgress}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Progress</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.actionBar}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search goals..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'my-goals', 'team-goals'] as FilterType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filterType === type ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterType === type ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {type.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'not-started', 'on-track', 'at-risk', 'completed'] as StatusFilter[]).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: statusFilter === status ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: statusFilter === status ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {status.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.goalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, { color: colors.text }]}>
              {filteredGoals.length} Goal{filteredGoals.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {filteredGoals.length > 0 ? (
            filteredGoals.map(renderGoalCard)
          ) : (
            <View style={styles.emptyState}>
              <Target size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No goals found
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Your First Goal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {renderGoalDetail()}
      {renderCreateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  statsScroll: {
    flexDirection: 'row',
  },
  statCard: {
    alignItems: 'center',
    marginRight: 24,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersPanel: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  content: {
    flex: 1,
  },
  goalsSection: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  goalCard: {
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
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardMetaText: {
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500' as const,
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
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressSection: {
    gap: 8,
    marginBottom: 12,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  milestoneSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneText: {
    fontSize: 13,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
  },
  detailHeader: {
    marginBottom: 20,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    flex: 1,
  },
  detailMeta: {
    gap: 12,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressUpdate: {
    gap: 12,
  },
  progressControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressDisplay: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
    flex: 1,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  milestoneItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  milestoneCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  milestoneDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  milestoneCompleted: {
    textDecorationLine: 'line-through' as const,
  },
  milestoneDate: {
    fontSize: 12,
    marginLeft: 32,
  },
  alignmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  alignmentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricText: {
    fontSize: 14,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
