import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import { DepartmentTaskStatus } from '@/types/taskFeedTemplates';

export interface DepartmentTaskBadge {
  departmentCode: string;
  departmentName: string;
  status: DepartmentTaskStatus;
  completedByName?: string;
  completedAt?: string;
}

interface DepartmentStatusBadgesProps {
  tasks: DepartmentTaskBadge[];
  compact?: boolean;
}

export default function DepartmentStatusBadges({ tasks, compact = false }: DepartmentStatusBadgesProps) {
  const { colors } = useTheme();

  if (!tasks || tasks.length === 0) return null;

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const styles = createStyles(colors, compact);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Assigned Departments:
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgesContainer}
      >
        {tasks.map((task) => {
          const isCompleted = task.status === 'completed';
          const isPending = task.status === 'pending';
          const isInProgress = task.status === 'in_progress';
          const deptColor = getDepartmentColor(task.departmentCode);
          
          const badgeBackgroundColor = isCompleted 
            ? '#10B981' + '20'
            : isPending 
              ? '#EF4444' + '20'
              : '#3B82F6' + '20';
          
          const badgeBorderColor = isCompleted 
            ? '#10B981'
            : isPending 
              ? '#EF4444'
              : '#3B82F6';

          const textColor = isCompleted 
            ? '#10B981'
            : isPending 
              ? '#EF4444'
              : '#3B82F6';

          return (
            <View
              key={task.departmentCode}
              style={[
                styles.badge,
                {
                  backgroundColor: badgeBackgroundColor,
                  borderColor: badgeBorderColor,
                },
              ]}
            >
              <View style={[styles.deptDot, { backgroundColor: deptColor }]} />
              <Text style={[styles.badgeText, { color: textColor }]} numberOfLines={1}>
                {compact ? task.departmentCode : (task.departmentName || getDepartmentName(task.departmentCode))}
              </Text>
              {isCompleted && (
                <View style={styles.checkContainer}>
                  <Check size={12} color="#10B981" strokeWidth={3} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {!compact && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBadge, { backgroundColor: '#10B981' + '15' }]}>
            <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.summaryText, { color: '#10B981' }]}>
              {completedTasks.length} completed
            </Text>
          </View>
          {pendingTasks.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: '#EF4444' + '15' }]}>
              <View style={[styles.summaryDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.summaryText, { color: '#EF4444' }]}>
                {pendingTasks.length} pending
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function DepartmentStatusBadgesCompact({ tasks }: { tasks: DepartmentTaskBadge[] }) {
  const { colors } = useTheme();

  if (!tasks || tasks.length === 0) return null;

  return (
    <View style={compactStyles.container}>
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed';
        const isPending = task.status === 'pending';
        const deptColor = getDepartmentColor(task.departmentCode);
        
        const badgeBackgroundColor = isCompleted 
          ? '#10B981'
          : isPending 
            ? '#EF4444'
            : '#3B82F6';

        return (
          <View
            key={task.departmentCode}
            style={[
              compactStyles.badge,
              { backgroundColor: badgeBackgroundColor },
            ]}
          >
            <Text style={compactStyles.badgeText} numberOfLines={1}>
              {getDepartmentName(task.departmentCode).slice(0, 3).toUpperCase()}
            </Text>
            {isCompleted && (
              <Check size={10} color="#fff" strokeWidth={3} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: any, compact: boolean) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    badgesContainer: {
      gap: 8,
      paddingRight: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: compact ? 8 : 10,
      paddingVertical: compact ? 4 : 6,
      borderRadius: 16,
      borderWidth: 1.5,
      gap: 6,
    },
    deptDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    badgeText: {
      fontSize: compact ? 11 : 12,
      fontWeight: '600' as const,
    },
    checkContainer: {
      marginLeft: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    summaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    summaryDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    summaryText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
  });

const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
