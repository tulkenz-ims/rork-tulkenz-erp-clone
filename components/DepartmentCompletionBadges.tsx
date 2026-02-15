import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, Clock, Play, ShieldCheck, AlertTriangle, ArrowRight, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';

// ── Status Config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#EF4444', icon: Clock, bgAlpha: '20' },
  in_progress: { label: 'In Progress', color: '#F59E0B', icon: Play, bgAlpha: '20' },
  completed: { label: 'Completed', color: '#3B82F6', icon: Check, bgAlpha: '20' },
  signed_off: { label: 'Signed Off', color: '#10B981', icon: ShieldCheck, bgAlpha: '20' },
} as const;

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
}

// ── Full Department Badges (for post detail page) ──────────────
interface DepartmentCompletionBadgesProps {
  departmentTasks: TaskFeedDepartmentTask[];
  assignedDepartments?: string[];
  compact?: boolean;
  onBadgePress?: (task: TaskFeedDepartmentTask) => void;
  onEscalatePress?: () => void;
  onSignoffPress?: (task: TaskFeedDepartmentTask) => void;
  showEscalateButton?: boolean;
  isProductionHold?: boolean;
  holdStatus?: string;
}

export default function DepartmentCompletionBadges({
  departmentTasks,
  assignedDepartments,
  compact = false,
  onBadgePress,
  onEscalatePress,
  onSignoffPress,
  showEscalateButton = false,
  isProductionHold = false,
  holdStatus,
}: DepartmentCompletionBadgesProps) {
  const { colors } = useTheme();

  const deptCodes = assignedDepartments || [...new Set(departmentTasks.map(t => t.departmentCode))];

  if (deptCodes.length === 0) return null;

  const taskMap = new Map(departmentTasks.map(t => [t.departmentCode, t]));
  const allGreen = departmentTasks.every(t => t.status === 'signed_off' || (t.status === 'completed' && !t.requiresSignoff));
  const completedOrSigned = departmentTasks.filter(t => t.status === 'completed' || t.status === 'signed_off').length;
  const totalCount = deptCodes.length;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>
            Department Status
          </Text>
          {isProductionHold && (holdStatus === 'active' || holdStatus === 'reinstated') && (
            <View style={styles.holdBadge}>
              <AlertTriangle size={10} color="#DC2626" />
              <Text style={styles.holdText}>HOLD</Text>
            </View>
          )}
        </View>
        <View style={[
          styles.progressBadge,
          { backgroundColor: allGreen ? '#10B98120' : colors.primary + '20' }
        ]}>
          <Text style={[
            styles.progressText,
            { color: allGreen ? '#10B981' : colors.primary }
          ]}>
            {completedOrSigned}/{totalCount}
          </Text>
        </View>
      </View>

      {/* Department badges */}
      <View style={styles.badgesContainer}>
        {deptCodes.map((deptCode) => {
          const task = taskMap.get(deptCode);
          const status = task?.status || 'pending';
          const config = getStatusConfig(status);
          const StatusIcon = config.icon;
          const deptName = getDepartmentName(deptCode);
          const needsSignoff = task?.requiresSignoff && task.status === 'completed';

          const badge = (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: config.color + config.bgAlpha,
                  borderColor: config.color + '60',
                  borderWidth: 1,
                },
              ]}
            >
              {/* Status icon */}
              <View style={[styles.badgeIcon, { backgroundColor: config.color }]}>
                <StatusIcon size={12} color="#fff" strokeWidth={3} />
              </View>

              {/* Info */}
              <View style={styles.badgeContent}>
                <View style={styles.badgeTopRow}>
                  <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
                    {deptName}
                  </Text>
                  {task?.isOriginal === false && (
                    <View style={styles.escalatedTag}>
                      <ArrowRight size={8} color="#8B5CF6" />
                      <Text style={styles.escalatedTagText}>Escalated</Text>
                    </View>
                  )}
                </View>

                {/* Status line */}
                <Text style={[styles.badgeStatus, { color: config.color }]}>
                  {needsSignoff ? 'Awaiting Sign-off' : config.label}
                </Text>

                {/* Form used */}
                {task?.formType && (
                  <View style={styles.formRow}>
                    <FileText size={9} color={colors.textTertiary} />
                    <Text style={[styles.formText, { color: colors.textTertiary }]} numberOfLines={1}>
                      {task.formType}
                    </Text>
                  </View>
                )}

                {/* Completed by */}
                {task?.completedByName && (status === 'completed' || status === 'signed_off') && (
                  <Text style={[styles.badgeCompletedBy, { color: colors.textTertiary }]} numberOfLines={1}>
                    {task.completedByName}
                  </Text>
                )}

                {/* Signoff info */}
                {task?.signoffByName && status === 'signed_off' && (
                  <Text style={[styles.badgeCompletedBy, { color: '#10B981' }]} numberOfLines={1}>
                    ✓ Signed: {task.signoffByName}
                  </Text>
                )}
              </View>

              {/* Sign-off button for completed tasks needing sign-off */}
              {needsSignoff && onSignoffPress && (
                <TouchableOpacity
                  style={styles.signoffBtn}
                  onPress={() => onSignoffPress(task)}
                  activeOpacity={0.7}
                >
                  <ShieldCheck size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          );

          if (onBadgePress && task) {
            return (
              <TouchableOpacity key={deptCode} onPress={() => onBadgePress(task)} activeOpacity={0.7}>
                {badge}
              </TouchableOpacity>
            );
          }

          return <View key={deptCode}>{badge}</View>;
        })}
      </View>

      {/* Escalate button */}
      {showEscalateButton && onEscalatePress && (
        <TouchableOpacity
          style={[styles.escalateBtn, { borderColor: colors.border }]}
          onPress={onEscalatePress}
          activeOpacity={0.7}
        >
          <ArrowRight size={14} color="#8B5CF6" />
          <Text style={styles.escalateBtnText}>Send to Department</Text>
        </TouchableOpacity>
      )}

      {/* All green banner */}
      {allGreen && totalCount > 0 && (
        <View style={[styles.completedBanner, { backgroundColor: '#10B98115' }]}>
          <ShieldCheck size={14} color="#10B981" strokeWidth={3} />
          <Text style={styles.completedText}>
            {isProductionHold ? 'All clear — Ready to resume production' : 'All departments signed off'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Compact Badges (for post list cards) ───────────────────────
interface CompactDepartmentBadgesProps {
  departmentTasks: TaskFeedDepartmentTask[];
  maxVisible?: number;
}

export function CompactDepartmentBadges({
  departmentTasks,
  maxVisible = 8
}: CompactDepartmentBadgesProps) {
  const { colors } = useTheme();

  if (departmentTasks.length === 0) return null;

  const signedOff = departmentTasks.filter(t => t.status === 'signed_off').length;
  const completed = departmentTasks.filter(t => t.status === 'completed').length;
  const inProgress = departmentTasks.filter(t => t.status === 'in_progress').length;
  const pending = departmentTasks.filter(t => t.status === 'pending').length;
  const visibleTasks = departmentTasks.slice(0, maxVisible);
  const hiddenCount = departmentTasks.length - maxVisible;

  return (
    <View style={styles.compactContainerNew}>
      <Text style={[styles.assignedLabel, { color: colors.textSecondary }]}>
        DEPARTMENTS:
      </Text>
      <View style={styles.pillBadgesRow}>
        {visibleTasks.map((task) => {
          const config = getStatusConfig(task.status);
          const StatusIcon = config.icon;
          const deptName = getDepartmentName(task.departmentCode);

          return (
            <View
              key={task.id}
              style={[
                styles.pillBadge,
                {
                  backgroundColor: config.color + config.bgAlpha,
                  borderColor: config.color,
                },
              ]}
            >
              <StatusIcon size={12} color={config.color} strokeWidth={3} />
              <Text style={[styles.pillText, { color: config.color }]} numberOfLines={1}>
                {deptName}
              </Text>
              {task.isOriginal === false && (
                <ArrowRight size={8} color={config.color} />
              )}
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
        {signedOff > 0 && (
          <View style={styles.statusCount}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.statusCountText, { color: '#10B981' }]}>
              {signedOff} signed off
            </Text>
          </View>
        )}
        {completed > 0 && (
          <View style={styles.statusCount}>
            <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.statusCountText, { color: '#3B82F6' }]}>
              {completed} done
            </Text>
          </View>
        )}
        {inProgress > 0 && (
          <View style={styles.statusCount}>
            <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.statusCountText, { color: '#F59E0B' }]}>
              {inProgress} active
            </Text>
          </View>
        )}
        {pending > 0 && (
          <View style={styles.statusCount}>
            <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.statusCountText, { color: '#EF4444' }]}>
              {pending} pending
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  holdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC262620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  holdText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgesContainer: {
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 10,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    flex: 1,
    gap: 1,
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  escalatedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  escalatedTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.3,
  },
  badgeStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  formText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badgeCompletedBy: {
    fontSize: 10,
    marginTop: 1,
  },
  signoffBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  escalateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  // ── Compact styles ──
  compactContainerNew: {
    gap: 8,
  },
  assignedLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pillBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreBadgeNew: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  moreTextNew: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  statusCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
