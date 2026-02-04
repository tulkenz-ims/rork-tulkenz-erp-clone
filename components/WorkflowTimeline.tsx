import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  FileCheck,
  Sunrise,
  Calendar,
  TrendingUp,
  Award,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  WORKFLOW_STAGES,
} from '@/hooks/useSupabaseOnboarding';
import type {
  WorkflowStage,
  WorkflowMilestone,
  MilestoneStatus,
} from '@/mocks/onboardingData';

const STAGE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  FileCheck,
  Sunrise,
  Calendar,
  TrendingUp,
  Award,
};

interface WorkflowTimelineProps {
  currentStage: WorkflowStage;
  milestones: WorkflowMilestone[];
  startDate: string;
  onMilestonePress?: (milestone: WorkflowMilestone) => void;
  compact?: boolean;
}

export default function WorkflowTimeline({
  currentStage,
  milestones,
  startDate,
  onMilestonePress,
  compact = false,
}: WorkflowTimelineProps) {
  const { colors } = useTheme();

  const stageProgress = useMemo(() => {
    const stageMap: Record<WorkflowStage, { total: number; completed: number }> = {
      pre_boarding: { total: 0, completed: 0 },
      first_day: { total: 0, completed: 0 },
      first_week: { total: 0, completed: 0 },
      first_month: { total: 0, completed: 0 },
      probation_end: { total: 0, completed: 0 },
    };

    milestones.forEach(m => {
      stageMap[m.stage].total++;
      if (m.status === 'completed') {
        stageMap[m.stage].completed++;
      }
    });

    return stageMap;
  }, [milestones]);

  const getStageStatus = (stageId: WorkflowStage): 'completed' | 'current' | 'upcoming' => {
    const stageIndex = WORKFLOW_STAGES.findIndex(s => s.id === stageId);
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getMilestoneIcon = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'in_progress':
        return <Clock size={16} color="#3B82F6" />;
      case 'overdue':
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Circle size={16} color={colors.textTertiary} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMilestoneDueDate = (daysFromStart: number) => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + daysFromStart);
    return formatDate(start.toISOString());
  };

  const styles = createStyles(colors, compact);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactContent}
        >
          {WORKFLOW_STAGES.map((stage, index) => {
            const status = getStageStatus(stage.id);
            const progress = stageProgress[stage.id];
            const StageIcon = STAGE_ICONS[stage.icon] || FileCheck;
            const isLast = index === WORKFLOW_STAGES.length - 1;

            return (
              <View key={stage.id} style={styles.compactStageWrapper}>
                <View style={[
                  styles.compactStage,
                  status === 'current' && { borderColor: stage.color, borderWidth: 2 },
                  status === 'completed' && { backgroundColor: stage.color + '20' },
                ]}>
                  <View style={[
                    styles.compactIconWrapper,
                    { backgroundColor: status === 'upcoming' ? colors.border : stage.color + '30' },
                  ]}>
                    <StageIcon 
                      size={18} 
                      color={status === 'upcoming' ? colors.textTertiary : stage.color} 
                    />
                  </View>
                  <Text style={[
                    styles.compactStageName,
                    status === 'upcoming' && { color: colors.textTertiary },
                  ]}>
                    {stage.name}
                  </Text>
                  {progress.total > 0 && (
                    <Text style={[
                      styles.compactProgress,
                      status === 'completed' && { color: '#10B981' },
                    ]}>
                      {progress.completed}/{progress.total}
                    </Text>
                  )}
                </View>
                {!isLast && (
                  <View style={[
                    styles.compactConnector,
                    status === 'completed' && { backgroundColor: stage.color },
                  ]} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Workflow Progress</Text>
      
      <View style={styles.stagesContainer}>
        {WORKFLOW_STAGES.map((stage, stageIndex) => {
          const status = getStageStatus(stage.id);
          const progress = stageProgress[stage.id];
          const StageIcon = STAGE_ICONS[stage.icon] || FileCheck;
          const stageMilestones = milestones.filter(m => m.stage === stage.id);
          const isLast = stageIndex === WORKFLOW_STAGES.length - 1;

          return (
            <View key={stage.id} style={styles.stageSection}>
              <View style={styles.stageHeader}>
                <View style={styles.stageIndicator}>
                  <View style={[
                    styles.stageIconWrapper,
                    { backgroundColor: status === 'upcoming' ? colors.border : stage.color },
                  ]}>
                    <StageIcon size={20} color={status === 'upcoming' ? colors.textTertiary : '#FFF'} />
                  </View>
                  {!isLast && (
                    <View style={[
                      styles.stageLine,
                      status === 'completed' && { backgroundColor: stage.color },
                    ]} />
                  )}
                </View>
                
                <View style={styles.stageInfo}>
                  <View style={styles.stageNameRow}>
                    <Text style={[
                      styles.stageName,
                      status === 'upcoming' && { color: colors.textTertiary },
                    ]}>
                      {stage.name}
                    </Text>
                    {status === 'current' && (
                      <View style={[styles.currentBadge, { backgroundColor: stage.color }]}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                    {status === 'completed' && progress.total > 0 && (
                      <View style={styles.completedBadge}>
                        <CheckCircle size={14} color="#10B981" />
                        <Text style={styles.completedText}>Complete</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stageDescription}>{stage.description}</Text>
                  
                  {progress.total > 0 && (
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill,
                            { 
                              width: `${(progress.completed / progress.total) * 100}%`,
                              backgroundColor: stage.color,
                            },
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {progress.completed}/{progress.total} milestones
                      </Text>
                    </View>
                  )}

                  {(status === 'current' || status === 'completed') && stageMilestones.length > 0 && (
                    <View style={styles.milestonesContainer}>
                      {stageMilestones.map((milestone, index) => (
                        <Pressable
                          key={milestone.id}
                          style={styles.milestoneItem}
                          onPress={() => onMilestonePress?.(milestone)}
                        >
                          {getMilestoneIcon(milestone.status)}
                          <View style={styles.milestoneContent}>
                            <Text style={[
                              styles.milestoneName,
                              milestone.status === 'completed' && styles.milestoneCompleted,
                            ]}>
                              {milestone.name}
                            </Text>
                            <Text style={styles.milestoneDue}>
                              {milestone.status === 'completed' && milestone.completedAt
                                ? `Completed ${formatDate(milestone.completedAt)}`
                                : `Due: ${getMilestoneDueDate(milestone.daysFromStart)}`
                              }
                            </Text>
                          </View>
                          {milestone.isRequired && (
                            <View style={styles.requiredDot} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any, compact: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    stagesContainer: {
      gap: 0,
    },
    stageSection: {
      marginBottom: 0,
    },
    stageHeader: {
      flexDirection: 'row',
    },
    stageIndicator: {
      alignItems: 'center',
      marginRight: 12,
    },
    stageIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stageLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
      minHeight: 20,
    },
    stageInfo: {
      flex: 1,
      paddingBottom: 20,
    },
    stageNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    stageName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    currentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    currentBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFF',
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    completedText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
    },
    stageDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    progressBarBg: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 11,
      color: colors.textTertiary,
      minWidth: 80,
    },
    milestonesContainer: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 8,
      gap: 6,
    },
    milestoneItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    milestoneContent: {
      flex: 1,
    },
    milestoneName: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    milestoneCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    milestoneDue: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    requiredDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#EF4444',
    },
    compactContainer: {
      marginBottom: 12,
    },
    compactContent: {
      paddingHorizontal: 16,
      gap: 0,
    },
    compactStageWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    compactStage: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      minWidth: 80,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    compactIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    compactStageName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    compactProgress: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 2,
    },
    compactConnector: {
      width: 20,
      height: 2,
      backgroundColor: colors.border,
    },
  });
