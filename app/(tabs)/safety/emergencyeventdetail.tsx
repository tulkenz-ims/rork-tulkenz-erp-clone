import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ArrowLeft,
  Flame,
  Tornado,
  ShieldAlert,
  FlaskConical,
  Wind,
  AlertOctagon,
  HeartPulse,
  Activity,
  Waves,
  ZapOff,
  Building,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Siren,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Megaphone,
  CircleDot,
  Ban,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmergencyEvent, useEmergencyEvents } from '@/hooks/useEmergencyEvents';
import {
  EmergencyEvent,
  EmergencyEventStatus,
  EMERGENCY_EVENT_TYPE_CONFIG,
  EMERGENCY_EVENT_STATUS_LABELS,
  EMERGENCY_EVENT_STATUS_COLORS,
  EMERGENCY_SEVERITY_LABELS,
  EMERGENCY_SEVERITY_COLORS,
} from '@/types/emergencyEvents';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Flame, Tornado, ShieldAlert, FlaskConical, Wind, AlertOctagon,
  HeartPulse, Activity, Waves, ZapOff, Building, AlertTriangle,
};

const STATUS_FLOW: EmergencyEventStatus[] = ['initiated', 'in_progress', 'all_clear', 'resolved'];

const STATUS_ICONS: Record<EmergencyEventStatus, React.ComponentType<{ size: number; color: string }>> = {
  initiated: Siren,
  in_progress: Activity,
  all_clear: ShieldCheck,
  resolved: CheckCircle2,
  cancelled: Ban,
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(startStr: string, endStr?: string): string {
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const diffMin = Math.floor((end - start) / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function EmergencyEventDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, refetch } = useEmergencyEvent(id);
  const { updateEvent, isUpdating, addTimelineEntry, isAddingTimeline } = useEmergencyEvents();

  const [showTimeline, setShowTimeline] = useState(true);
  const [showAfterAction, setShowAfterAction] = useState(false);
  const [timelineAction, setTimelineAction] = useState('');
  const [timelineNotes, setTimelineNotes] = useState('');
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [afterActionNotes, setAfterActionNotes] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [editingAfterAction, setEditingAfterAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const config = useMemo(() => event ? EMERGENCY_EVENT_TYPE_CONFIG[event.event_type] : null, [event]);
  const IconComp = config ? ICON_MAP[config.icon] : null;

  const nextStatus = useMemo(() => {
    if (!event) return null;
    const idx = STATUS_FLOW.indexOf(event.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  }, [event]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStatusAdvance = useCallback(async () => {
    if (!event || !nextStatus) return;
    const label = EMERGENCY_EVENT_STATUS_LABELS[nextStatus];
    Alert.alert(
      `Move to "${label}"?`,
      `This will update the event status to ${label}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const updates: Record<string, unknown> = { id: event.id, status: nextStatus };
              if (nextStatus === 'all_clear') updates.all_clear_at = new Date().toISOString();
              if (nextStatus === 'resolved') updates.resolved_at = new Date().toISOString();
              await updateEvent(updates as any);
              await addTimelineEntry({ eventId: event.id, action: `Status changed to ${label}` });
              await refetch();
            } catch (err) {
              console.error('[EmergencyEventDetail] Status advance error:', err);
              Alert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ],
    );
  }, [event, nextStatus, updateEvent, addTimelineEntry, refetch]);

  const handleCancelEvent = useCallback(async () => {
    if (!event) return;
    Alert.alert('Cancel Event?', 'This will mark the event as cancelled.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Event',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateEvent({ id: event.id, status: 'cancelled' });
            await addTimelineEntry({ eventId: event.id, action: 'Event cancelled' });
            await refetch();
          } catch (err) {
            console.error('[EmergencyEventDetail] Cancel error:', err);
          }
        },
      },
    ]);
  }, [event, updateEvent, addTimelineEntry, refetch]);

  const handleAddTimeline = useCallback(async () => {
    if (!event || !timelineAction.trim()) return;
    try {
      await addTimelineEntry({ eventId: event.id, action: timelineAction.trim(), notes: timelineNotes.trim() || undefined });
      setTimelineAction('');
      setTimelineNotes('');
      setShowAddTimeline(false);
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[EmergencyEventDetail] Add timeline error:', err);
      Alert.alert('Error', 'Failed to add timeline entry.');
    }
  }, [event, timelineAction, timelineNotes, addTimelineEntry, refetch]);

  const handleSaveAfterAction = useCallback(async () => {
    if (!event) return;
    try {
      await updateEvent({
        id: event.id,
        after_action_notes: afterActionNotes.trim() || undefined,
        corrective_actions: correctiveActions.trim() || undefined,
        root_cause: rootCause.trim() || undefined,
      } as any);
      setEditingAfterAction(false);
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[EmergencyEventDetail] Save after-action error:', err);
      Alert.alert('Error', 'Failed to save after-action report.');
    }
  }, [event, afterActionNotes, correctiveActions, rootCause, updateEvent, refetch]);

  const openAfterActionEdit = useCallback(() => {
    if (!event) return;
    setAfterActionNotes(event.after_action_notes || '');
    setCorrectiveActions(event.corrective_actions || '');
    setRootCause(event.root_cause || '');
    setEditingAfterAction(true);
    setShowAfterAction(true);
  }, [event]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Event Detail' }} />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Event Detail' }} />
        <AlertTriangle size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Event Not Found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.text, fontWeight: '600' as const }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = EMERGENCY_EVENT_STATUS_COLORS[event.status];
  const severityColor = EMERGENCY_SEVERITY_COLORS[event.severity];
  const isTerminal = event.status === 'resolved' || event.status === 'cancelled';
  const duration = formatDuration(event.initiated_at, event.resolved_at || event.all_clear_at);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerBack}>
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
      >
        <View style={[styles.heroCard, { backgroundColor: config!.color + '10', borderColor: config!.color + '30' }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: config!.color + '20' }]}>
              {IconComp && <IconComp size={28} color={config!.color} />}
            </View>
            <View style={styles.heroMeta}>
              {event.drill && (
                <View style={[styles.drillBadge, { backgroundColor: '#3B82F618', borderColor: '#3B82F640' }]}>
                  <Text style={styles.drillText}>DRILL</Text>
                </View>
              )}
              <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusPillText, { color: statusColor }]}>
                  {EMERGENCY_EVENT_STATUS_LABELS[event.status]}
                </Text>
              </View>
              <View style={[styles.severityPill, { backgroundColor: severityColor + '15' }]}>
                <Text style={[styles.severityPillText, { color: severityColor }]}>
                  {EMERGENCY_SEVERITY_LABELS[event.severity]}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{event.title}</Text>
          <Text style={[styles.heroType, { color: config!.color }]}>{config!.label}</Text>
          {event.description ? (
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>{event.description}</Text>
          ) : null}
        </View>

        <View style={styles.infoGrid}>
          <InfoTile icon={<Clock size={16} color={colors.textSecondary} />} label="Initiated" value={formatDateTime(event.initiated_at)} colors={colors} />
          <InfoTile icon={<Users size={16} color={colors.textSecondary} />} label="Initiated By" value={event.initiated_by} colors={colors} />
          {event.location_details ? (
            <InfoTile icon={<MapPin size={16} color={colors.textSecondary} />} label="Location" value={event.location_details} colors={colors} />
          ) : null}
          <InfoTile icon={<Clock size={16} color={colors.textSecondary} />} label="Duration" value={duration} colors={colors} />
          {event.all_clear_at ? (
            <InfoTile icon={<ShieldCheck size={16} color="#3B82F6" />} label="All Clear" value={formatDateTime(event.all_clear_at)} colors={colors} />
          ) : null}
          {event.resolved_at ? (
            <InfoTile icon={<CheckCircle2 size={16} color="#10B981" />} label="Resolved" value={formatDateTime(event.resolved_at)} colors={colors} />
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Response Summary</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem label="Evacuated" value={event.total_evacuated?.toString() || '—'} colors={colors} />
            <SummaryItem label="Sheltered" value={event.total_sheltered?.toString() || '—'} colors={colors} />
            <SummaryItem label="Injuries" value={event.injuries_reported.toString()} color={event.injuries_reported > 0 ? '#EF4444' : undefined} colors={colors} />
            <SummaryItem label="Fatalities" value={event.fatalities_reported.toString()} color={event.fatalities_reported > 0 ? '#DC2626' : undefined} colors={colors} />
          </View>

          {event.emergency_services_called && (
            <View style={[styles.servicesBanner, { backgroundColor: '#EF444410', borderColor: '#EF444425' }]}>
              <Siren size={16} color="#EF4444" />
              <Text style={styles.servicesText}>
                {'Emergency services called'}
                {event.emergency_services_arrival ? ` — arrived ${formatDateTime(event.emergency_services_arrival)}` : ''}
              </Text>
            </View>
          )}

          {event.departments_affected.length > 0 && (
            <View style={styles.tagsRow}>
              <Text style={[styles.tagsLabel, { color: colors.textSecondary }]}>Departments Affected:</Text>
              <View style={styles.tagsWrap}>
                {event.departments_affected.map((d) => (
                  <View key={d} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.text }]}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {event.assembly_points_used.length > 0 && (
            <View style={styles.tagsRow}>
              <Text style={[styles.tagsLabel, { color: colors.textSecondary }]}>Assembly Points:</Text>
              <View style={styles.tagsWrap}>
                {event.assembly_points_used.map((a) => (
                  <View key={a} style={[styles.tag, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
                    <Text style={[styles.tagText, { color: '#10B981' }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {event.property_damage && (
            <View style={[styles.damageRow, { borderTopColor: colors.border }]}>
              <DollarSign size={15} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.damageLabel, { color: colors.text }]}>
                  {'Property Damage'}
                  {event.estimated_damage_cost != null ? ` — $${event.estimated_damage_cost.toLocaleString()}` : ''}
                </Text>
                {event.property_damage_description ? (
                  <Text style={[styles.damageDesc, { color: colors.textSecondary }]}>{event.property_damage_description}</Text>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {event.actions_taken.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions Taken</Text>
            {event.actions_taken.map((a, i) => (
              <View key={i} style={styles.actionItem}>
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={[styles.actionText, { color: colors.text }]}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={styles.sectionHeader} onPress={() => setShowTimeline(!showTimeline)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Text>
            <View style={styles.sectionHeaderRight}>
              <Text style={[styles.timelineCount, { color: colors.textSecondary }]}>{event.timeline_entries.length}</Text>
              {showTimeline ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
            </View>
          </Pressable>

          {showTimeline && (
            <View style={styles.timeline}>
              {event.timeline_entries.map((entry, idx) => (
                <View key={entry.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? config!.color : colors.border }]} />
                    {idx < event.timeline_entries.length - 1 && (
                      <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineAction, { color: colors.text }]}>{entry.action}</Text>
                    {entry.notes ? <Text style={[styles.timelineNotes, { color: colors.textSecondary }]}>{entry.notes}</Text> : null}
                    <View style={styles.timelineMeta}>
                      <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>{formatDateTime(entry.timestamp)}</Text>
                      {entry.performed_by ? <Text style={[styles.timelineBy, { color: colors.textSecondary }]}>{entry.performed_by}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}

              {!isTerminal && (
                <>
                  {showAddTimeline ? (
                    <View style={[styles.addTimelineForm, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.tlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                        placeholder="Action taken..."
                        placeholderTextColor={colors.textSecondary}
                        value={timelineAction}
                        onChangeText={setTimelineAction}
                      />
                      <TextInput
                        style={[styles.tlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                        placeholder="Notes (optional)"
                        placeholderTextColor={colors.textSecondary}
                        value={timelineNotes}
                        onChangeText={setTimelineNotes}
                        multiline
                      />
                      <View style={styles.tlActions}>
                        <Pressable onPress={() => setShowAddTimeline(false)} style={[styles.tlCancel, { borderColor: colors.border }]}>
                          <Text style={{ color: colors.textSecondary, fontWeight: '600' as const, fontSize: 13 }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleAddTimeline}
                          disabled={!timelineAction.trim() || isAddingTimeline}
                          style={[styles.tlSave, { backgroundColor: config!.color, opacity: !timelineAction.trim() ? 0.5 : 1 }]}
                        >
                          {isAddingTimeline ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ color: '#fff', fontWeight: '700' as const, fontSize: 13 }}>Add Entry</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setShowAddTimeline(true)}
                      style={[styles.addTimelineBtn, { borderColor: colors.border }]}
                    >
                      <Plus size={16} color={config!.color} />
                      <Text style={{ color: config!.color, fontWeight: '600' as const, fontSize: 13 }}>Add Timeline Entry</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={styles.sectionHeader} onPress={() => setShowAfterAction(!showAfterAction)}>
            <View style={styles.sectionHeaderLeft}>
              <FileText size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>After-Action Report</Text>
            </View>
            {showAfterAction ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
          </Pressable>

          {showAfterAction && (
            <View style={styles.afterActionContent}>
              {editingAfterAction ? (
                <>
                  <Text style={[styles.aaLabel, { color: colors.textSecondary }]}>Root Cause</Text>
                  <TextInput
                    style={[styles.aaInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="What caused this event?"
                    placeholderTextColor={colors.textSecondary}
                    value={rootCause}
                    onChangeText={setRootCause}
                    multiline
                  />
                  <Text style={[styles.aaLabel, { color: colors.textSecondary }]}>After-Action Notes</Text>
                  <TextInput
                    style={[styles.aaInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="What happened, what went well, what didn't..."
                    placeholderTextColor={colors.textSecondary}
                    value={afterActionNotes}
                    onChangeText={setAfterActionNotes}
                    multiline
                  />
                  <Text style={[styles.aaLabel, { color: colors.textSecondary }]}>Corrective Actions</Text>
                  <TextInput
                    style={[styles.aaInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="What changes will be made to prevent recurrence?"
                    placeholderTextColor={colors.textSecondary}
                    value={correctiveActions}
                    onChangeText={setCorrectiveActions}
                    multiline
                  />
                  <View style={styles.tlActions}>
                    <Pressable onPress={() => setEditingAfterAction(false)} style={[styles.tlCancel, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.textSecondary, fontWeight: '600' as const, fontSize: 13 }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSaveAfterAction} disabled={isUpdating} style={[styles.tlSave, { backgroundColor: '#10B981' }]}>
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700' as const, fontSize: 13 }}>Save Report</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  {event.root_cause || event.after_action_notes || event.corrective_actions ? (
                    <>
                      {event.root_cause ? (
                        <View style={styles.aaBlock}>
                          <Text style={[styles.aaBlockLabel, { color: colors.textSecondary }]}>Root Cause</Text>
                          <Text style={[styles.aaBlockValue, { color: colors.text }]}>{event.root_cause}</Text>
                        </View>
                      ) : null}
                      {event.after_action_notes ? (
                        <View style={styles.aaBlock}>
                          <Text style={[styles.aaBlockLabel, { color: colors.textSecondary }]}>Notes</Text>
                          <Text style={[styles.aaBlockValue, { color: colors.text }]}>{event.after_action_notes}</Text>
                        </View>
                      ) : null}
                      {event.corrective_actions ? (
                        <View style={styles.aaBlock}>
                          <Text style={[styles.aaBlockLabel, { color: colors.textSecondary }]}>Corrective Actions</Text>
                          <Text style={[styles.aaBlockValue, { color: colors.text }]}>{event.corrective_actions}</Text>
                        </View>
                      ) : null}
                      <Pressable onPress={openAfterActionEdit} style={[styles.addTimelineBtn, { borderColor: colors.border, marginTop: 12 }]}>
                        <FileText size={14} color={config!.color} />
                        <Text style={{ color: config!.color, fontWeight: '600' as const, fontSize: 13 }}>Edit Report</Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.aaEmpty}>
                      <Text style={[styles.aaEmptyText, { color: colors.textSecondary }]}>No after-action report yet.</Text>
                      <Pressable onPress={openAfterActionEdit} style={[styles.addTimelineBtn, { borderColor: colors.border }]}>
                        <Plus size={14} color={config!.color} />
                        <Text style={{ color: config!.color, fontWeight: '600' as const, fontSize: 13 }}>Write Report</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {!isTerminal && (
          <View style={styles.actionsSection}>
            {nextStatus && (
              <Pressable
                onPress={handleStatusAdvance}
                disabled={isUpdating}
                style={({ pressed }) => [
                  styles.primaryAction,
                  { backgroundColor: EMERGENCY_EVENT_STATUS_COLORS[nextStatus], opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {React.createElement(STATUS_ICONS[nextStatus], { size: 18, color: '#fff' })}
                    <Text style={styles.primaryActionText}>
                      {`Move to ${EMERGENCY_EVENT_STATUS_LABELS[nextStatus]}`}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={handleCancelEvent}
              style={[styles.cancelAction, { borderColor: '#EF444430' }]}
            >
              <XCircle size={16} color="#EF4444" />
              <Text style={styles.cancelActionText}>Cancel Event</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoTile({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.infoTileHeader}>
        {icon}
        <Text style={[styles.infoTileLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoTileValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function SummaryItem({ label, value, color, colors }: { label: string; value: string; color?: string; colors: any }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color: color || colors.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center' as const, justifyContent: 'center' as const, gap: 12 },
  headerBack: { padding: 8, marginLeft: -8 },
  scrollContent: { padding: 16, gap: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  heroCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  heroTop: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const },
  heroIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  heroMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flexWrap: 'wrap' as const },
  drillBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  drillText: { fontSize: 10, fontWeight: '700' as const, color: '#3B82F6', letterSpacing: 0.5 },
  statusPill: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '600' as const },
  severityPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  severityPillText: { fontSize: 12, fontWeight: '600' as const },
  heroTitle: { fontSize: 20, fontWeight: '800' as const, marginTop: 4 },
  heroType: { fontSize: 13, fontWeight: '600' as const },
  heroDesc: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  infoGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
  infoTile: { width: '48%' as any, borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  infoTileHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  infoTileLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  infoTileValue: { fontSize: 14, fontWeight: '600' as const },
  section: { borderRadius: 12, borderWidth: 1, padding: 16 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  sectionHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  sectionHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const },
  summaryGrid: { flexDirection: 'row' as const, marginTop: 14, gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center' as const, gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: '700' as const },
  summaryLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  servicesBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 14 },
  servicesText: { fontSize: 13, fontWeight: '600' as const, color: '#EF4444', flex: 1 },
  tagsRow: { marginTop: 14, gap: 6 },
  tagsLabel: { fontSize: 12, fontWeight: '600' as const },
  tagsWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '500' as const },
  damageRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  damageLabel: { fontSize: 14, fontWeight: '600' as const },
  damageDesc: { fontSize: 13, marginTop: 2 },
  actionItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, marginTop: 10 },
  actionText: { fontSize: 14, flex: 1 },
  timelineCount: { fontSize: 13, fontWeight: '600' as const },
  timeline: { marginTop: 14 },
  timelineItem: { flexDirection: 'row' as const, minHeight: 60 },
  timelineLine: { width: 24, alignItems: 'center' as const },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineConnector: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 16, paddingLeft: 8, gap: 3 },
  timelineAction: { fontSize: 14, fontWeight: '600' as const },
  timelineNotes: { fontSize: 13, fontStyle: 'italic' as const },
  timelineMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginTop: 2 },
  timelineTime: { fontSize: 11 },
  timelineBy: { fontSize: 11, fontWeight: '500' as const },
  addTimelineForm: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  tlInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 40 },
  tlActions: { flexDirection: 'row' as const, gap: 10, justifyContent: 'flex-end' as const },
  tlCancel: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  tlSave: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, minWidth: 90, alignItems: 'center' as const },
  addTimelineBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' as const, alignSelf: 'flex-start' as const },
  afterActionContent: { marginTop: 14, gap: 8 },
  aaLabel: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  aaInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 70, textAlignVertical: 'top' as const },
  aaBlock: { gap: 3 },
  aaBlockLabel: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  aaBlockValue: { fontSize: 14, lineHeight: 20 },
  aaEmpty: { alignItems: 'center' as const, gap: 12, paddingVertical: 8 },
  aaEmptyText: { fontSize: 14 },
  actionsSection: { gap: 10 },
  primaryAction: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 14, borderRadius: 12 },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
  cancelAction: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  cancelActionText: { color: '#EF4444', fontSize: 14, fontWeight: '600' as const },
});
