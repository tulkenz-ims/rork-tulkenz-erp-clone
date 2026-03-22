// app/(tabs)/watchscreen/index.tsx
// TulKenz OPS — AI Watch Screen
// Platform Admin & Super Admin ONLY
// Tony Stark HUD theme

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/contexts/UserContext';
import {
  useWatchList,
  useWatchLogs,
  useWatchStats,
  useUnreviewedWatchLogs,
  useFlagEmployee,
  useUnflagEmployee,
  useUpdateWatchEntry,
  useMarkLogReviewed,
  useMarkLogEmailed,
  useAllSavedConversations,
  AIWatchEntry,
  AIWatchLog,
} from '@/hooks/useAIWatchSystem';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── HUD Theme ─────────────────────────────────────────────────────
const HUD_BG      = '#0a0e1a';
const HUD_CARD    = '#0d1117';
const HUD_BORDER  = '#1a2332';
const HUD_ACCENT  = '#00d4ff';
const HUD_GREEN   = '#00ff88';
const HUD_YELLOW  = '#ffcc00';
const HUD_RED     = '#ff4444';
const HUD_ORANGE  = '#ff8800';
const HUD_PURPLE  = '#9945ff';
const HUD_TEXT    = '#e2e8f0';
const HUD_DIM     = '#64748b';
const HUD_BRIGHT  = '#ffffff';

const ORG_ID = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

const SEVERITY_COLORS: Record<string, string> = {
  low: HUD_GREEN, medium: HUD_YELLOW, high: HUD_ORANGE, critical: HUD_RED,
};

// ══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function WatchScreen() {
  const router = useRouter();
  const { user } = useUser();

  // ── Role guard ──
  const isAuthorized =
    user?.role === 'platform_admin' ||
    user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'watched' | 'logs' | 'saved'>('watched');
  const [refreshing, setRefreshing] = useState(false);
  const [flagModal, setFlagModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AIWatchEntry | null>(null);
  const [selectedLog, setSelectedLog] = useState<AIWatchLog | null>(null);
  const [logDetailModal, setLogDetailModal] = useState(false);
  const [unflagModal, setUnflagModal] = useState(false);
  const [unflagReason, setUnflagReason] = useState('');
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Flag form
  const [flagEmployeeId, setFlagEmployeeId] = useState('');
  const [flagEmployeeName, setFlagEmployeeName] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState<'low'|'medium'|'high'|'critical'>('low');
  const [flagEmailAlerts, setFlagEmailAlerts] = useState(false);
  const [flagAlertEmail, setFlagAlertEmail] = useState('');
  const [flagNotes, setFlagNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: stats, refetch: refetchStats } = useWatchStats();
  const { data: watchList = [], isLoading: loadingWatch, refetch: refetchWatch } = useWatchList();
  const { data: unreviewedLogs = [], refetch: refetchUnreviewed } = useUnreviewedWatchLogs();
  const { data: watchLogs = [], isLoading: loadingLogs, refetch: refetchLogs } =
    useWatchLogs(selectedEntry?.id);
  const { data: savedConvos = [], isLoading: loadingSaved, refetch: refetchSaved } =
    useAllSavedConversations();

  // Employee search for flag modal
  const [employeeSearch, setEmployeeSearch] = useState('');
  const { data: employeeResults = [] } = useQuery({
    queryKey: ['employee_search_watch', employeeSearch],
    queryFn: async () => {
      if (employeeSearch.length < 2) return [];
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, department_code, position')
        .eq('organization_id', ORG_ID)
        .or(`first_name.ilike.%${employeeSearch}%,last_name.ilike.%${employeeSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: employeeSearch.length >= 2,
  });

  const flagEmployee = useFlagEmployee();
  const unflagEmployee = useUnflagEmployee();
  const markReviewed = useMarkLogReviewed();
  const markEmailed = useMarkLogEmailed();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchWatch(), refetchUnreviewed(), refetchLogs(), refetchSaved()]);
    setRefreshing(false);
  };

  // ── Role guard render ──
  if (!isAuthorized) {
    return (
      <View style={styles.unauthorized}>
        <Ionicons name="shield-checkmark" size={64} color={HUD_RED} />
        <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
        <Text style={styles.unauthorizedSub}>This screen is restricted to platform administrators only.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Flag employee handler ──
  const handleFlag = async () => {
    if (!flagEmployeeId || !flagEmployeeName || !flagReason) {
      Alert.alert('Required', 'Please select an employee and enter a reason.');
      return;
    }
    setSaving(true);
    try {
      await flagEmployee.mutateAsync({
        employee_id: flagEmployeeId,
        employee_name: flagEmployeeName,
        reason: flagReason,
        severity: flagSeverity,
        flagged_by: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Platform Admin',
        flagged_by_id: user?.id || undefined,
        email_alerts: flagEmailAlerts,
        alert_email: flagAlertEmail || undefined,
        notes: flagNotes || undefined,
      });
      setFlagModal(false);
      resetFlagForm();
      Alert.alert('Watch Active', `${flagEmployeeName} has been added to the watch list.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to flag employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnflag = async () => {
    if (!selectedEntry || !unflagReason) {
      Alert.alert('Required', 'Please enter a reason for removing this watch.');
      return;
    }
    setSaving(true);
    try {
      await unflagEmployee.mutateAsync({
        id: selectedEntry.id,
        employee_id: selectedEntry.employee_id,
        unflagged_by: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Platform Admin',
        unflag_reason: unflagReason,
      });
      setUnflagModal(false);
      setSelectedEntry(null);
      setUnflagReason('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove watch.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!selectedLog) return;
    setSaving(true);
    try {
      await markReviewed.mutateAsync({
        id: selectedLog.id,
        watch_id: selectedLog.watch_id,
        reviewed_by: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Platform Admin',
        review_notes: reviewNotes || undefined,
      });
      setReviewModal(false);
      setLogDetailModal(false);
      setSelectedLog(null);
      setReviewNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark reviewed.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailLog = async (log: AIWatchLog) => {
    Alert.prompt(
      'Email Summary',
      'Enter email address to send this conversation summary:',
      async (email) => {
        if (!email) return;
        try {
          await markEmailed.mutateAsync({
            id: log.id,
            watch_id: log.watch_id,
            emailed_to: email,
          });
          // Open mail client with pre-filled summary
          const subject = encodeURIComponent(`AI Watch Log — ${log.employee_name} — ${new Date(log.created_at).toLocaleDateString()}`);
          const body = encodeURIComponent(
            `Employee: ${log.employee_name}\n` +
            `Date: ${new Date(log.created_at).toLocaleString()}\n` +
            `Messages: ${log.message_count}\n\n` +
            `Summary:\n${log.summary || 'No summary available.'}\n\n` +
            `Topics: ${log.topics?.join(', ') || 'N/A'}\n\n` +
            `Actions Taken:\n${log.actions_taken?.map(a => `• ${a}`).join('\n') || 'None'}\n\n` +
            `Unresolved: ${log.unresolved || 'None'}`
          );
          Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
          Alert.alert('Done', `Summary marked as emailed to ${email}.`);
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to mark emailed.');
        }
      },
      'plain-text',
      selectedEntry?.alert_email || ''
    );
  };

  const resetFlagForm = () => {
    setFlagEmployeeId('');
    setFlagEmployeeName('');
    setFlagReason('');
    setFlagSeverity('low');
    setFlagEmailAlerts(false);
    setFlagAlertEmail('');
    setFlagNotes('');
    setEmployeeSearch('');
  };

  const activeWatched = watchList.filter(w => w.is_active);
  const inactiveWatched = watchList.filter(w => !w.is_active);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={HUD_ACCENT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="eye" size={18} color={HUD_RED} />
            <Text style={styles.headerTitle}>WATCH SCREEN</Text>
            {unreviewedLogs.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{unreviewedLogs.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>Platform Admin · Silent Monitoring</Text>
        </View>
        <TouchableOpacity
          style={styles.flagBtn}
          onPress={() => setFlagModal(true)}
        >
          <Ionicons name="add" size={16} color={HUD_BG} />
          <Text style={styles.flagBtnText}>Flag</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Strip */}
      <View style={styles.kpiStrip}>
        {[
          { label: 'WATCHED', value: stats?.activeWatched || 0, color: HUD_RED },
          { label: 'UNREVIEWED', value: stats?.unreviewedLogs || 0, color: HUD_YELLOW },
          { label: 'TOTAL LOGS', value: stats?.totalLogs || 0, color: HUD_ACCENT },
          { label: 'EMAIL ALERTS', value: stats?.emailAlerts || 0, color: HUD_ORANGE },
        ].map(k => (
          <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab Strip */}
      <View style={styles.tabStrip}>
        {[
          { key: 'watched', label: 'Watch List', icon: 'eye-outline' },
          { key: 'logs', label: 'Conversation Logs', icon: 'chatbubbles-outline' },
          { key: 'saved', label: 'Saved Convos', icon: 'bookmark-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? HUD_ACCENT : HUD_DIM}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HUD_ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── WATCH LIST TAB ── */}
        {activeTab === 'watched' && (
          <>
            {loadingWatch ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={HUD_ACCENT} />
              </View>
            ) : activeWatched.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="eye-off-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Active Watches</Text>
                <Text style={styles.emptySub}>Tap Flag to add an employee to the watch list.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>ACTIVE ({activeWatched.length})</Text>
                {activeWatched.map(entry => (
                  <WatchEntryCard
                    key={entry.id}
                    entry={entry}
                    onViewLogs={() => {
                      setSelectedEntry(entry);
                      setActiveTab('logs');
                    }}
                    onUnflag={() => {
                      setSelectedEntry(entry);
                      setUnflagModal(true);
                    }}
                  />
                ))}

                {inactiveWatched.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>INACTIVE HISTORY ({inactiveWatched.length})</Text>
                    {inactiveWatched.map(entry => (
                      <WatchEntryCard
                        key={entry.id}
                        entry={entry}
                        onViewLogs={() => {
                          setSelectedEntry(entry);
                          setActiveTab('logs');
                        }}
                        onUnflag={() => {}}
                        inactive
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── LOGS TAB ── */}
        {activeTab === 'logs' && (
          <>
            {selectedEntry && (
              <View style={styles.filterBanner}>
                <Ionicons name="filter-outline" size={14} color={HUD_ACCENT} />
                <Text style={styles.filterBannerText}>
                  Showing logs for: <Text style={{ color: HUD_BRIGHT }}>{selectedEntry.employee_name}</Text>
                </Text>
                <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                  <Ionicons name="close-circle" size={16} color={HUD_DIM} />
                </TouchableOpacity>
              </View>
            )}

            {loadingLogs ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={HUD_ACCENT} />
              </View>
            ) : watchLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Logs Yet</Text>
                <Text style={styles.emptySub}>
                  {selectedEntry
                    ? `No conversations captured for ${selectedEntry.employee_name} yet.`
                    : 'Select an employee from the Watch List to view their logs.'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{watchLogs.length} CONVERSATION{watchLogs.length !== 1 ? 'S' : ''} CAPTURED</Text>
                {watchLogs.map(log => (
                  <WatchLogCard
                    key={log.id}
                    log={log}
                    onReview={() => {
                      setSelectedLog(log);
                      setLogDetailModal(true);
                    }}
                    onEmail={() => handleEmailLog(log)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* ── SAVED CONVOS TAB ── */}
        {activeTab === 'saved' && (
          <>
            {loadingSaved ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={HUD_ACCENT} />
              </View>
            ) : savedConvos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Saved Conversations</Text>
                <Text style={styles.emptySub}>Employees can save conversations by saying "save this conversation" to the AI assistant.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{savedConvos.length} SAVED CONVERSATION{savedConvos.length !== 1 ? 'S' : ''}</Text>
                {savedConvos.map(convo => (
                  <SavedConvoCard key={convo.id} convo={convo} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── FLAG EMPLOYEE MODAL ── */}
      <Modal visible={flagModal} transparent animationType="slide" onRequestClose={() => setFlagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Flag Employee for Monitoring</Text>
            <Text style={styles.modalSub}>Silent — employee will not be notified</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Employee Search */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Employee <Text style={{ color: HUD_RED }}>*</Text></Text>
                {flagEmployeeId ? (
                  <View style={styles.selectedEmployee}>
                    <Ionicons name="person" size={16} color={HUD_ACCENT} />
                    <Text style={styles.selectedEmployeeName}>{flagEmployeeName}</Text>
                    <TouchableOpacity onPress={() => { setFlagEmployeeId(''); setFlagEmployeeName(''); }}>
                      <Ionicons name="close-circle" size={18} color={HUD_RED} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Search employee name..."
                      placeholderTextColor={HUD_DIM}
                      value={employeeSearch}
                      onChangeText={setEmployeeSearch}
                    />
                    {employeeResults.length > 0 && (
                      <View style={styles.employeeDropdown}>
                        {employeeResults.map((emp: any) => (
                          <TouchableOpacity
                            key={emp.id}
                            style={styles.employeeDropdownItem}
                            onPress={() => {
                              setFlagEmployeeId(emp.id);
                              setFlagEmployeeName(`${emp.first_name} ${emp.last_name}`);
                              setEmployeeSearch('');
                            }}
                          >
                            <Text style={styles.employeeDropdownName}>{emp.first_name} {emp.last_name}</Text>
                            <Text style={styles.employeeDropdownSub}>{emp.position || emp.department_code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Reason */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Reason <Text style={{ color: HUD_RED }}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Why is this employee being monitored?"
                  placeholderTextColor={HUD_DIM}
                  value={flagReason}
                  onChangeText={setFlagReason}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Severity */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Severity</Text>
                <View style={styles.severityRow}>
                  {(['low','medium','high','critical'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.severityChip,
                        flagSeverity === s && { backgroundColor: SEVERITY_COLORS[s] + '33', borderColor: SEVERITY_COLORS[s] },
                      ]}
                      onPress={() => setFlagSeverity(s)}
                    >
                      <Text style={[styles.severityChipText, flagSeverity === s && { color: SEVERITY_COLORS[s] }]}>
                        {s.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Email Alerts */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Text style={styles.toggleLabel}>Email Alerts</Text>
                  <Text style={styles.toggleHint}>Send email when new conversation is captured</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, flagEmailAlerts && styles.toggleActive]}
                  onPress={() => setFlagEmailAlerts(!flagEmailAlerts)}
                >
                  <View style={[styles.toggleThumb, flagEmailAlerts && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              {flagEmailAlerts && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Alert Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor={HUD_DIM}
                    value={flagAlertEmail}
                    onChangeText={setFlagAlertEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Notes */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Admin Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Internal notes about this watch (optional)"
                  placeholderTextColor={HUD_DIM}
                  value={flagNotes}
                  onChangeText={setFlagNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setFlagModal(false); resetFlagForm(); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, { backgroundColor: HUD_RED }, (!flagEmployeeId || !flagReason) && { opacity: 0.4 }]}
                  onPress={handleFlag}
                  disabled={saving || !flagEmployeeId || !flagReason}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={HUD_BG} />
                    : <Text style={styles.modalSaveText}>🚨 Activate Watch</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── UNFLAG MODAL ── */}
      <Modal visible={unflagModal} transparent animationType="slide" onRequestClose={() => setUnflagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '50%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Remove Watch</Text>
            <Text style={styles.modalSub}>{selectedEntry?.employee_name}</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Reason for Removing <Text style={{ color: HUD_RED }}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Why is this watch being removed?"
                placeholderTextColor={HUD_DIM}
                value={unflagReason}
                onChangeText={setUnflagReason}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setUnflagModal(false); setUnflagReason(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !unflagReason && { opacity: 0.4 }]}
                onPress={handleUnflag}
                disabled={saving || !unflagReason}
              >
                {saving
                  ? <ActivityIndicator size="small" color={HUD_BG} />
                  : <Text style={styles.modalSaveText}>Remove Watch</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── LOG DETAIL MODAL ── */}
      <Modal visible={logDetailModal} transparent animationType="slide" onRequestClose={() => setLogDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.logDetailHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedLog?.employee_name}</Text>
                <Text style={styles.modalSub}>
                  {selectedLog ? new Date(selectedLog.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  }) : ''}
                </Text>
              </View>
              {!selectedLog?.reviewed && (
                <View style={styles.unreviewedBadge}>
                  <Text style={styles.unreviewedBadgeText}>UNREVIEWED</Text>
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary */}
              {selectedLog?.summary && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>SUMMARY</Text>
                  <Text style={styles.logSectionText}>{selectedLog.summary}</Text>
                </View>
              )}

              {/* Topics */}
              {selectedLog?.topics && selectedLog.topics.length > 0 && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>TOPICS</Text>
                  <View style={styles.tagRow}>
                    {selectedLog.topics.map((t, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Actions Taken */}
              {selectedLog?.actions_taken && selectedLog.actions_taken.length > 0 && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>ACTIONS TAKEN</Text>
                  {selectedLog.actions_taken.map((a, i) => (
                    <View key={i} style={styles.actionRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={HUD_GREEN} />
                      <Text style={styles.actionText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Unresolved */}
              {selectedLog?.unresolved && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>UNRESOLVED</Text>
                  <Text style={[styles.logSectionText, { color: HUD_YELLOW }]}>{selectedLog.unresolved}</Text>
                </View>
              )}

              {/* Message Count */}
              <View style={styles.logMetaRow}>
                <Ionicons name="chatbubble-outline" size={12} color={HUD_DIM} />
                <Text style={styles.logMetaText}>{selectedLog?.message_count || 0} messages in conversation</Text>
              </View>

              {/* Review Notes */}
              {!selectedLog?.reviewed && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Review Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder="Add notes about this conversation..."
                    placeholderTextColor={HUD_DIM}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {selectedLog?.reviewed && (
                <View style={[styles.logSection, { backgroundColor: HUD_GREEN + '11', borderColor: HUD_GREEN + '33' }]}>
                  <Text style={[styles.logSectionTitle, { color: HUD_GREEN }]}>REVIEWED</Text>
                  <Text style={styles.logSectionText}>By {selectedLog.reviewed_by} on {new Date(selectedLog.reviewed_at!).toLocaleDateString()}</Text>
                  {selectedLog.review_notes && <Text style={styles.logSectionText}>{selectedLog.review_notes}</Text>}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setLogDetailModal(false)}>
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
                {selectedLog && !selectedLog.reviewed && (
                  <TouchableOpacity
                    style={[styles.modalSave, { backgroundColor: HUD_GREEN, flex: 1.5 }]}
                    onPress={handleMarkReviewed}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color={HUD_BG} />
                      : <Text style={styles.modalSaveText}>✓ Mark Reviewed</Text>}
                  </TouchableOpacity>
                )}
                {selectedLog && (
                  <TouchableOpacity
                    style={[styles.modalSave, { backgroundColor: HUD_ACCENT, flex: 1 }]}
                    onPress={() => { setLogDetailModal(false); handleEmailLog(selectedLog); }}
                  >
                    <Text style={styles.modalSaveText}>📧 Email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// WATCH ENTRY CARD
// ══════════════════════════════════════════════════════════════════

function WatchEntryCard({
  entry, onViewLogs, onUnflag, inactive = false,
}: {
  entry: AIWatchEntry;
  onViewLogs: () => void;
  onUnflag: () => void;
  inactive?: boolean;
}) {
  const severityColor = SEVERITY_COLORS[entry.severity] || HUD_DIM;
  return (
    <View style={[styles.watchCard, inactive && { opacity: 0.6 }]}>
      <View style={[styles.watchCardAccent, { backgroundColor: severityColor }]} />
      <View style={styles.watchCardBody}>
        <View style={styles.watchCardHeader}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor + '22', borderColor: severityColor + '44' }]}>
            <Text style={[styles.severityBadgeText, { color: severityColor }]}>{entry.severity.toUpperCase()}</Text>
          </View>
          {entry.email_alerts && (
            <View style={styles.emailBadge}>
              <Ionicons name="mail" size={10} color={HUD_ACCENT} />
              <Text style={styles.emailBadgeText}>EMAIL ALERTS</Text>
            </View>
          )}
          {inactive && (
            <View style={[styles.emailBadge, { backgroundColor: HUD_DIM + '22' }]}>
              <Text style={[styles.emailBadgeText, { color: HUD_DIM }]}>INACTIVE</Text>
            </View>
          )}
        </View>

        <Text style={styles.watchCardName}>{entry.employee_name}</Text>
        <Text style={styles.watchCardReason}>{entry.reason}</Text>

        <View style={styles.watchCardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="chatbubbles-outline" size={10} color={HUD_DIM} />
            <Text style={styles.metaChipText}>{entry.conversation_count} conversations</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="person-outline" size={10} color={HUD_DIM} />
            <Text style={styles.metaChipText}>By {entry.flagged_by}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={10} color={HUD_DIM} />
            <Text style={styles.metaChipText}>{new Date(entry.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        {entry.notes && (
          <Text style={styles.watchCardNotes}>📝 {entry.notes}</Text>
        )}

        {!inactive && (
          <View style={styles.watchCardActions}>
            <TouchableOpacity style={styles.watchActionBtn} onPress={onViewLogs}>
              <Ionicons name="chatbubbles-outline" size={14} color={HUD_ACCENT} />
              <Text style={styles.watchActionText}>View Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.watchActionBtn, styles.watchActionRemove]} onPress={onUnflag}>
              <Ionicons name="eye-off-outline" size={14} color={HUD_RED} />
              <Text style={[styles.watchActionText, { color: HUD_RED }]}>Remove Watch</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// WATCH LOG CARD
// ══════════════════════════════════════════════════════════════════

function WatchLogCard({
  log, onReview, onEmail,
}: {
  log: AIWatchLog;
  onReview: () => void;
  onEmail: () => void;
}) {
  return (
    <View style={[styles.logCard, !log.reviewed && styles.logCardUnreviewed]}>
      <View style={styles.logCardHeader}>
        <View>
          <Text style={styles.logCardName}>{log.employee_name}</Text>
          <Text style={styles.logCardDate}>
            {new Date(log.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.logCardBadges}>
          {!log.reviewed && (
            <View style={styles.unreviewedBadge}>
              <Text style={styles.unreviewedBadgeText}>NEW</Text>
            </View>
          )}
          {log.emailed && (
            <View style={[styles.unreviewedBadge, { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT + '44' }]}>
              <Ionicons name="mail-outline" size={10} color={HUD_ACCENT} />
            </View>
          )}
        </View>
      </View>

      {log.summary && (
        <Text style={styles.logCardSummary} numberOfLines={2}>{log.summary}</Text>
      )}

      {log.topics && log.topics.length > 0 && (
        <View style={styles.tagRow}>
          {log.topics.slice(0, 3).map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
          {log.topics.length > 3 && (
            <Text style={styles.tagMoreText}>+{log.topics.length - 3}</Text>
          )}
        </View>
      )}

      <View style={styles.logCardFooter}>
        <Text style={styles.logCardMsgCount}>{log.message_count} messages</Text>
        <View style={styles.logCardActions}>
          <TouchableOpacity style={styles.logActionBtn} onPress={onReview}>
            <Ionicons name="eye-outline" size={14} color={HUD_ACCENT} />
            <Text style={styles.logActionText}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logActionBtn, { backgroundColor: HUD_ORANGE + '22', borderColor: HUD_ORANGE + '44' }]} onPress={onEmail}>
            <Ionicons name="mail-outline" size={14} color={HUD_ORANGE} />
            <Text style={[styles.logActionText, { color: HUD_ORANGE }]}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// SAVED CONVO CARD
// ══════════════════════════════════════════════════════════════════

function SavedConvoCard({ convo }: { convo: any }) {
  return (
    <View style={styles.savedCard}>
      <View style={styles.savedCardHeader}>
        <View>
          <Text style={styles.savedCardName}>{convo.employee_name}</Text>
          <Text style={styles.savedCardDept}>{convo.department_name || convo.department_code || 'Unknown Dept'}</Text>
        </View>
        <View style={styles.savedByBadge}>
          <Text style={styles.savedByText}>{convo.saved_by === 'watch_flag' ? '👁 WATCH' : '💾 SAVED'}</Text>
        </View>
      </View>

      {convo.summary && (
        <Text style={styles.savedCardSummary} numberOfLines={2}>{convo.summary}</Text>
      )}

      {convo.actions_taken && convo.actions_taken.length > 0 && (
        <Text style={styles.savedCardActions}>
          Actions: {convo.actions_taken.slice(0, 2).join(', ')}{convo.actions_taken.length > 2 ? '...' : ''}
        </Text>
      )}

      <View style={styles.savedCardFooter}>
        <Text style={styles.savedCardDate}>
          {new Date(convo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={styles.savedCardMsgs}>{convo.message_count} messages</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD_BG },
  unauthorized: { flex: 1, backgroundColor: HUD_BG, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  unauthorizedTitle: { fontSize: 20, fontWeight: '700', color: HUD_BRIGHT },
  unauthorizedSub: { fontSize: 14, color: HUD_DIM, textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: 16, backgroundColor: HUD_ACCENT, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { fontSize: 14, fontWeight: '700', color: HUD_BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  headerBackBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: HUD_ACCENT + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT, letterSpacing: 1 },
  headerSub: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  alertBadge: { backgroundColor: HUD_RED, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  alertBadgeText: { fontSize: 10, fontWeight: '700', color: HUD_BRIGHT },
  flagBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD_RED, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  flagBtnText: { fontSize: 13, fontWeight: '700', color: HUD_BG },
  kpiStrip: { flexDirection: 'row', backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderTopWidth: 3 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 8, color: HUD_DIM, letterSpacing: 0.5, marginTop: 2 },
  tabStrip: { flexDirection: 'row', backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: HUD_ACCENT },
  tabText: { fontSize: 10, color: HUD_DIM, fontWeight: '600' },
  tabTextActive: { color: HUD_ACCENT },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT },
  emptySub: { fontSize: 13, color: HUD_DIM, textAlign: 'center', lineHeight: 19 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: HUD_DIM, letterSpacing: 1.5, marginBottom: 8 },
  filterBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD_ACCENT + '11', borderWidth: 1, borderColor: HUD_ACCENT + '33', borderRadius: 8, padding: 10, marginBottom: 12 },
  filterBannerText: { flex: 1, fontSize: 12, color: HUD_DIM },
  // Watch Card
  watchCard: { flexDirection: 'row', backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  watchCardAccent: { width: 4 },
  watchCardBody: { flex: 1, padding: 12 },
  watchCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  severityBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  emailBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HUD_ACCENT + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emailBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_ACCENT, letterSpacing: 0.5 },
  watchCardName: { fontSize: 15, fontWeight: '700', color: HUD_BRIGHT, marginBottom: 2 },
  watchCardReason: { fontSize: 12, color: HUD_DIM, marginBottom: 8, lineHeight: 17 },
  watchCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HUD_BG, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: HUD_BORDER },
  metaChipText: { fontSize: 10, color: HUD_DIM },
  watchCardNotes: { fontSize: 11, color: HUD_DIM, fontStyle: 'italic', marginBottom: 8 },
  watchCardActions: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: HUD_BORDER },
  watchActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: HUD_ACCENT + '15', borderWidth: 1, borderColor: HUD_ACCENT + '33' },
  watchActionRemove: { backgroundColor: HUD_RED + '11', borderColor: HUD_RED + '33' },
  watchActionText: { fontSize: 11, color: HUD_ACCENT, fontWeight: '600' },
  // Log Card
  logCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, padding: 12, marginBottom: 10 },
  logCardUnreviewed: { borderColor: HUD_YELLOW + '55', backgroundColor: HUD_YELLOW + '08' },
  logCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  logCardName: { fontSize: 14, fontWeight: '700', color: HUD_BRIGHT },
  logCardDate: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  logCardBadges: { flexDirection: 'row', gap: 4 },
  unreviewedBadge: { backgroundColor: HUD_YELLOW + '22', borderWidth: 1, borderColor: HUD_YELLOW + '44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  unreviewedBadgeText: { fontSize: 9, fontWeight: '700', color: HUD_YELLOW, letterSpacing: 0.5 },
  logCardSummary: { fontSize: 12, color: HUD_DIM, lineHeight: 17, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, color: HUD_DIM },
  tagMoreText: { fontSize: 10, color: HUD_DIM, alignSelf: 'center' },
  logCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: HUD_BORDER },
  logCardMsgCount: { fontSize: 11, color: HUD_DIM },
  logCardActions: { flexDirection: 'row', gap: 6 },
  logActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: HUD_ACCENT + '15', borderWidth: 1, borderColor: HUD_ACCENT + '33' },
  logActionText: { fontSize: 11, color: HUD_ACCENT, fontWeight: '600' },
  // Saved Card
  savedCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, padding: 12, marginBottom: 10 },
  savedCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  savedCardName: { fontSize: 14, fontWeight: '700', color: HUD_BRIGHT },
  savedCardDept: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  savedByBadge: { backgroundColor: HUD_PURPLE + '22', borderWidth: 1, borderColor: HUD_PURPLE + '44', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  savedByText: { fontSize: 10, fontWeight: '700', color: HUD_PURPLE },
  savedCardSummary: { fontSize: 12, color: HUD_DIM, lineHeight: 17, marginBottom: 6 },
  savedCardActions: { fontSize: 11, color: HUD_DIM, fontStyle: 'italic', marginBottom: 6 },
  savedCardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: HUD_BORDER },
  savedCardDate: { fontSize: 11, color: HUD_DIM },
  savedCardMsgs: { fontSize: 11, color: HUD_DIM },
  // Log Detail
  logDetailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  logSection: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, padding: 12, marginBottom: 10 },
  logSectionTitle: { fontSize: 10, fontWeight: '700', color: HUD_DIM, letterSpacing: 1, marginBottom: 6 },
  logSectionText: { fontSize: 13, color: HUD_TEXT, lineHeight: 19 },
  logMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  logMetaText: { fontSize: 11, color: HUD_DIM },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionText: { fontSize: 12, color: HUD_TEXT },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: HUD_CARD, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: HUD_BORDER, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  modalHandle: { width: 36, height: 4, backgroundColor: HUD_BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: HUD_BRIGHT, marginBottom: 2 },
  modalSub: { fontSize: 12, color: HUD_DIM, marginBottom: 16 },
  fieldWrap: { gap: 6, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: HUD_DIM, letterSpacing: 0.5 },
  input: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: HUD_TEXT, fontSize: 14 },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD_BORDER, alignItems: 'center' },
  severityChipText: { fontSize: 10, fontWeight: '700', color: HUD_DIM, letterSpacing: 0.5 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  toggleLabelWrap: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 13, color: HUD_TEXT, fontWeight: '500' },
  toggleHint: { fontSize: 11, color: HUD_DIM },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: HUD_BORDER, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: HUD_GREEN + '66' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: HUD_DIM },
  toggleThumbActive: { backgroundColor: HUD_GREEN, alignSelf: 'flex-end' },
  selectedEmployee: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_ACCENT + '44', borderRadius: 8, padding: 12 },
  selectedEmployeeName: { flex: 1, fontSize: 14, color: HUD_ACCENT, fontWeight: '600' },
  employeeDropdown: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, overflow: 'hidden', marginTop: 4 },
  employeeDropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  employeeDropdownName: { fontSize: 13, fontWeight: '600', color: HUD_TEXT },
  employeeDropdownSub: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: HUD_BORDER, alignItems: 'center' },
  modalCancelText: { fontSize: 14, color: HUD_TEXT, fontWeight: '600' },
  modalSave: { flex: 2, paddingVertical: 12, borderRadius: 8, backgroundColor: HUD_ACCENT, alignItems: 'center' },
  modalSaveText: { fontSize: 14, color: HUD_BG, fontWeight: '700' },
});
