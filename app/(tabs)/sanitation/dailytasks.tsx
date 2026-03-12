import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  ClipboardList,
  CheckCircle2,
  MapPin,
  User,
  ChevronRight,
  Play,
  CheckCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSanitationWorkOrders, SanitationWorkOrder } from '@/hooks/useSupabaseSanitationWorkOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

type WOStatus = SanitationWorkOrder['status'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending:      { label: 'Pending',     color: '#F59E0B', bgColor: '#F59E0B15' },
  in_progress:  { label: 'In Progress', color: '#3B82F6', bgColor: '#3B82F615' },
  awaiting_qa:  { label: 'Awaiting QA', color: '#8B5CF6', bgColor: '#8B5CF615' },
  completed:    { label: 'Completed',   color: '#10B981', bgColor: '#10B98115' },
  skipped:      { label: 'Skipped',     color: '#6B7280', bgColor: '#6B728015' },
  overdue:      { label: 'Overdue',     color: '#EF4444', bgColor: '#EF444415' },
};

const FILTER_OPTIONS = ['all', 'pending', 'in_progress', 'awaiting_qa', 'completed', 'overdue'] as const;

export default function DailyTasksScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { workOrders, isLoading, refetch, startTimer } = useSanitationWorkOrders();

  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<typeof FILTER_OPTIONS[number]>('all');

  const todaysTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let filtered = workOrders.filter(wo => {
      const woDate = wo.scheduled_date?.split('T')[0] ?? wo.created_at?.split('T')[0];
      const isDaily = !wo.is_preop;
      return isDaily && (woDate === today || wo.status === 'in_progress');
    });

    if (filterStatus !== 'all') {
      filtered = filtered.filter(wo => wo.status === filterStatus);
    }

    const statusOrder: Record<string, number> = {
      overdue: 0, in_progress: 1, pending: 2, awaiting_qa: 3, completed: 4, skipped: 5,
    };
    return filtered.sort((a, b) =>
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    );
  }, [workOrders, filterStatus]);

  const taskStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const daily = workOrders.filter(wo => {
      const woDate = wo.scheduled_date?.split('T')[0] ?? wo.created_at?.split('T')[0];
      return !wo.is_preop && woDate === today;
    });
    return {
      total:      daily.length,
      completed:  daily.filter(wo => wo.status === 'completed').length,
      inProgress: daily.filter(wo => wo.status === 'in_progress').length,
      pending:    daily.filter(wo => wo.status === 'pending').length,
      overdue:    daily.filter(wo => wo.status === 'overdue').length,
    };
  }, [workOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStartTask = useCallback(async (wo: SanitationWorkOrder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startTimer(wo.id);
      router.push(`/(tabs)/sanitation/work-orders/${wo.id}`);
    } catch (error) {
      console.error('[DailyTasks] Start error:', error);
      Alert.alert('Error', 'Failed to start task');
    }
  }, [startTimer, router]);

  const renderTaskCard = (wo: SanitationWorkOrder) => {
    const statusCfg = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.pending;

    return (
      <Pressable
        key={wo.id}
        style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/(tabs)/sanitation/work-orders/${wo.id}`)}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <Text style={[styles.woNumber, { color: colors.textSecondary }]}>{wo.wo_number}</Text>
        </View>

        <Text style={[styles.taskTitle, { color: colors.text }]}>{wo.task_name}</Text>

        <View style={styles.taskMeta}>
          {wo.area && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{wo.area}</Text>
            </View>
          )}
          {wo.tech_name && (
            <View style={styles.metaItem}>
              <User size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{wo.tech_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.taskActions}>
          {wo.status === 'pending' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleStartTask(wo)}
            >
              <Play size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>Start</Text>
            </Pressable>
          )}
          {wo.status === 'in_progress' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => router.push(`/(tabs)/sanitation/work-orders/${wo.id}`)}
            >
              <CheckCheck size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>Continue</Text>
            </Pressable>
          )}
          {wo.status === 'completed' && (
            <View style={styles.completedInfo}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.completedText, { color: '#10B981' }]}>
                {wo.tech_signed_at
                  ? new Date(wo.tech_signed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Done'}
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
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
            <ClipboardList size={28} color="#8B5CF6" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Daily Sanitation Tasks</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { value: taskStats.completed,  color: '#10B981', label: 'Completed'  },
            { value: taskStats.inProgress, color: '#3B82F6', label: 'In Progress' },
            { value: taskStats.pending,    color: '#F59E0B', label: 'Pending'     },
            { value: taskStats.overdue,    color: '#EF4444', label: 'Overdue'     },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTER_OPTIONS.map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  filterStatus === status && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                ]}
                onPress={() => {
                  setFilterStatus(status);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filterStatus === status ? '#FFF' : colors.text },
                ]}>
                  {status === 'all' ? 'All' : (STATUS_CONFIG[status]?.label ?? status)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {todaysTasks.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ClipboardList size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterStatus === 'all'
                ? 'No daily sanitation work orders for today.'
                : `No ${STATUS_CONFIG[filterStatus]?.label.toLowerCase() ?? filterStatus} tasks.`}
            </Text>
          </View>
        ) : (
          todaysTasks.map(renderTaskCard)
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16,
  },
  iconContainer: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  filterRow: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  taskCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  woNumber: { fontSize: 11 },
  taskTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  taskActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  completedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedText: { fontSize: 12, fontWeight: '500' },
  emptyState: { borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  bottomPadding: { height: 80 },
});
