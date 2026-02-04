import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';

interface DepartmentCompletionBadgesProps {
  departmentTasks: TaskFeedDepartmentTask[];
  assignedDepartments?: string[];
  compact?: boolean;
  onBadgePress?: (task: TaskFeedDepartmentTask) => void;
}

export default function DepartmentCompletionBadges({
  departmentTasks,
  assignedDepartments,
  compact = false,
  onBadgePress,
}: DepartmentCompletionBadgesProps) {
  const { colors } = useTheme();

  const deptCodes = assignedDepartments || [...new Set(departmentTasks.map(t => t.departmentCode))];
  
  if (deptCodes.length === 0) {
    return null;
  }

  const taskMap = new Map(departmentTasks.map(t => [t.departmentCode, t]));

  const completedCount = departmentTasks.filter(t => t.status === 'completed').length;
  const totalCount = deptCodes.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          Department Progress
        </Text>
        <View style={[
          styles.progressBadge, 
          { backgroundColor: allCompleted ? '#10B981' + '20' : colors.primary + '20' }
        ]}>
          <Text style={[
            styles.progressText, 
            { color: allCompleted ? '#10B981' : colors.primary }
          ]}>
            {completedCount}/{totalCount}
          </Text>
        </View>
      </View>
      
      <View style={styles.badgesContainer}>
        {deptCodes.map((deptCode) => {
          const task = taskMap.get(deptCode);
          const isCompleted = task?.status === 'completed';
          const deptName = getDepartmentName(deptCode);
          
          const BadgeContent = (
            <View
              style={[
                compact ? styles.compactBadge : styles.badge,
                {
                  backgroundColor: isCompleted ? '#10B981' : '#EF4444',
                  borderColor: isCompleted ? '#10B981' : '#EF4444',
                },
              ]}
            >
              {compact ? (
                <>
                  {isCompleted ? (
                    <Check size={10} color="#fff" strokeWidth={3} />
                  ) : (
                    <Clock size={10} color="#fff" />
                  )}
                  <Text style={styles.compactBadgeText} numberOfLines={1}>
                    {deptName.split(' ')[0]}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.badgeIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    {isCompleted ? (
                      <Check size={12} color="#fff" strokeWidth={3} />
                    ) : (
                      <Clock size={12} color="#fff" />
                    )}
                  </View>
                  <View style={styles.badgeContent}>
                    <Text style={styles.badgeName} numberOfLines={1}>
                      {deptName}
                    </Text>
                    {task?.completedByName && isCompleted && (
                      <Text style={styles.badgeCompletedBy} numberOfLines={1}>
                        {task.completedByName}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>
          );

          if (onBadgePress && task) {
            return (
              <TouchableOpacity
                key={deptCode}
                onPress={() => onBadgePress(task)}
                activeOpacity={0.7}
              >
                {BadgeContent}
              </TouchableOpacity>
            );
          }

          return <View key={deptCode}>{BadgeContent}</View>;
        })}
      </View>

      {allCompleted && (
        <View style={[styles.completedBanner, { backgroundColor: '#10B981' + '15' }]}>
          <Check size={14} color="#10B981" strokeWidth={3} />
          <Text style={styles.completedText}>All departments completed</Text>
        </View>
      )}
    </View>
  );
}

interface CompactDepartmentBadgesProps {
  departmentTasks: TaskFeedDepartmentTask[];
  maxVisible?: number;
}

export function CompactDepartmentBadges({ 
  departmentTasks, 
  maxVisible = 8 
}: CompactDepartmentBadgesProps) {
  const { colors } = useTheme();

  if (departmentTasks.length === 0) {
    return null;
  }

  const completedCount = departmentTasks.filter(t => t.status === 'completed').length;
  const pendingCount = departmentTasks.filter(t => t.status !== 'completed').length;
  const visibleTasks = departmentTasks.slice(0, maxVisible);
  const hiddenCount = departmentTasks.length - maxVisible;

  return (
    <View style={styles.compactContainerNew}>
      <Text style={[styles.assignedLabel, { color: colors.textSecondary }]}>
        ASSIGNED DEPARTMENTS:
      </Text>
      <View style={styles.pillBadgesRow}>
        {visibleTasks.map((task) => {
          const isCompleted = task.status === 'completed';
          const deptName = getDepartmentName(task.departmentCode);
          const statusColor = isCompleted ? '#10B981' : '#F59E0B';
          
          return (
            <View
              key={task.id}
              style={[
                styles.pillBadge,
                { 
                  backgroundColor: statusColor + '20',
                  borderColor: statusColor,
                },
              ]}
            >
              {isCompleted ? (
                <Check size={14} color={statusColor} strokeWidth={3} />
              ) : (
                <Clock size={12} color={statusColor} />
              )}
              <Text style={[styles.pillText, { color: statusColor }]} numberOfLines={1}>
                {deptName}
              </Text>
            </View>
          );
        })}
        {hiddenCount > 0 && (
          <View style={[styles.moreBadgeNew, { backgroundColor: colors.border }]}>
            <Text style={[styles.moreTextNew, { color: colors.textSecondary }]}>
              +{hiddenCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.statusCountsRow}>
        <View style={styles.statusCount}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.statusCountText, { color: '#10B981' }]}>
            {completedCount} completed
          </Text>
        </View>
        <View style={styles.statusCount}>
          <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.statusCountText, { color: '#F59E0B' }]}>
            {pendingCount} pending
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: 100,
  },
  badgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    flex: 1,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  badgeCompletedBy: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  compactBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  compactProgress: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  compactContainerNew: {
    gap: 8,
  },
  assignedLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  pillBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  moreBadgeNew: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreTextNew: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  statusCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCountText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
