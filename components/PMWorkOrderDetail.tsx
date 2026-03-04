import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X,
  Wrench,
  Calendar,
  MapPin,
  Shield,
  ClipboardList,
  Clock,
  RefreshCw,
} from 'lucide-react-native';

interface PMWorkOrderDetailProps {
  workOrder: {
    id: string;
    workOrderNumber: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
    type: 'corrective' | 'preventive' | 'emergency' | 'request';
    source: 'manual' | 'request' | 'pm_schedule';
    sourceId?: string;
    equipment?: string;
    equipmentId?: string;
    location: string;
    facility_id: string;
    assigned_to?: string;
    assignedName?: string;
    due_date: string;
    started_at?: string;
    completed_at?: string;
    estimatedHours?: number;
    actualHours?: number;
    safety: {
      lotoRequired: boolean;
      lotoSteps: any[];
      permits: string[];
      permitNumbers: Record<string, string>;
      permitExpiry: Record<string, string>;
      ppeRequired: string[];
    };
    tasks: any[];
    attachments: any[];
    notes: string;
    completionNotes?: string;
    created_at: string;
    updated_at: string;
  };
  onClose: () => void;
  onUpdate: (id: string, updates: any) => void;
  onStartWork: (id: string) => void;
  onCompleteWork: (id: string) => void;
  canEdit: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completed', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' },
  on_hold: { label: 'On Hold', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.15)' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bgColor: 'rgba(107,114,128,0.15)' },
};

export default function PMWorkOrderDetail({
  workOrder,
  onClose,
  onUpdate,
  onStartWork,
  onCompleteWork,
  canEdit,
}: PMWorkOrderDetailProps) {
  const { colors } = useTheme();
  const statusConfig = STATUS_CONFIG[workOrder.status] || STATUS_CONFIG.open;
  const priorityColor = PRIORITY_COLORS[workOrder.priority] || '#F59E0B';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <RefreshCw size={18} color="#10B981" />
            <Text style={[styles.headerLabel, { color: '#10B981' }]}>Preventive Maintenance</Text>
          </View>
          <Text style={[styles.headerWONumber, { color: colors.text }]}>{workOrder.workOrderNumber}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Priority Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '25' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)} Priority
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.woTitle, { color: colors.text }]}>{workOrder.title}</Text>
          {workOrder.description ? (
            <Text style={[styles.woDescription, { color: colors.textSecondary }]}>{workOrder.description}</Text>
          ) : null}
        </View>

        {/* PM Schedule Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <RefreshCw size={16} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>PM Schedule Info</Text>
          </View>
          <View style={styles.infoGrid}>
            {workOrder.equipment && (
              <View style={styles.infoRow}>
                <Wrench size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Equipment</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.equipment}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.due_date}</Text>
            </View>
            {workOrder.assignedName && (
              <View style={styles.infoRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.assignedName}</Text>
              </View>
            )}
            {workOrder.estimatedHours && (
              <View style={styles.infoRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Est. Hours</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.estimatedHours}h</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tasks Checklist */}
        {workOrder.tasks && workOrder.tasks.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={16} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                PM Tasks ({workOrder.tasks.length})
              </Text>
            </View>
            {workOrder.tasks.map((task: any, index: number) => (
              <View key={task.id || index} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.taskCheckbox, {
                  backgroundColor: task.completed ? '#10B981' : 'transparent',
                  borderColor: task.completed ? '#10B981' : colors.border,
                }]}>
                  {task.completed && <Text style={styles.taskCheckmark}>✓</Text>}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskName, { color: colors.text }]}>{task.name || task.title || `Task ${index + 1}`}</Text>
                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>{task.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Safety Requirements */}
        {(workOrder.safety.lotoRequired || workOrder.safety.permits.length > 0 || workOrder.safety.ppeRequired.length > 0) && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Requirements</Text>
            </View>

            {workOrder.safety.lotoRequired && (
              <View style={[styles.safetyBanner, { backgroundColor: '#EF444415' }]}>
                <Text style={[styles.safetyBannerText, { color: '#EF4444' }]}>
                  ⚠️ LOTO REQUIRED — {workOrder.safety.lotoSteps.length} step{workOrder.safety.lotoSteps.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {workOrder.safety.lotoSteps.length > 0 && (
              <View style={styles.lotoStepsContainer}>
                {workOrder.safety.lotoSteps.map((step: any, index: number) => (
                  <View key={index} style={[styles.lotoStep, { backgroundColor: colors.background }]}>
                    <View style={[styles.lotoStepNumber, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.lotoStepText, { color: colors.text }]}>
                      {typeof step === 'string' ? step : step.description || step.step || `Step ${index + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {workOrder.safety.permits.length > 0 && (
              <View style={styles.safetySubSection}>
                <Text style={[styles.safetySubTitle, { color: colors.textSecondary }]}>Required Permits</Text>
                <View style={styles.tagRow}>
                  {workOrder.safety.permits.map((permit: string, index: number) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={[styles.tagText, { color: '#F59E0B' }]}>{permit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {workOrder.safety.ppeRequired.length > 0 && (
              <View style={styles.safetySubSection}>
                <Text style={[styles.safetySubTitle, { color: colors.textSecondary }]}>Required PPE</Text>
                <View style={styles.tagRow}>
                  {workOrder.safety.ppeRequired.map((ppe: string, index: number) => (
                    <View key={index} style={[styles.tag, { backgroundColor: '#3B82F620' }]}>
                      <Text style={[styles.tagText, { color: '#3B82F6' }]}>
                        {ppe.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {workOrder.notes ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={16} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.text }]}>{workOrder.notes}</Text>
          </View>
        ) : null}

        {/* Bottom spacer for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Actions */}
      {workOrder.status !== 'completed' && workOrder.status !== 'cancelled' && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {workOrder.status === 'open' && (
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: '#10B981' }]}
              onPress={() => onStartWork(workOrder.id)}
              activeOpacity={0.7}
            >
              <Wrench size={18} color="#fff" />
              <Text style={styles.footerButtonText}>Start PM Work</Text>
            </TouchableOpacity>
          )}
          {workOrder.status === 'in_progress' && (
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: '#10B981' }]}
              onPress={() => onCompleteWork(workOrder.id)}
              activeOpacity={0.7}
            >
              <ClipboardList size={18} color="#fff" />
              <Text style={styles.footerButtonText}>Complete PM</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerWONumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  woTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  woDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  taskCheckmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  safetyBanner: {
    padding: 10,
    borderRadius: 8,
  },
  safetyBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lotoStepsContainer: {
    gap: 8,
  },
  lotoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  lotoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotoStepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lotoStepText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
  safetySubSection: {
    gap: 6,
    marginTop: 4,
  },
  safetySubTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
