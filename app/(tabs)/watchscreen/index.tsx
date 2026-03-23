// app/(tabs)/watchscreen/index.tsx
// TulKenz OPS — AI Watch Screen
// Platform Admin & Super Admin ONLY
// Tony Stark HUD theme

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/contexts/UserContext';
import {
  useWatchList, useWatchLogs, useWatchStats, useUnreviewedWatchLogs,
  useFlagEmployee, useUnflagEmployee, useUpdateWatchEntry,
  useMarkLogReviewed, useMarkLogEmailed, useAllSavedConversations,
  AIWatchEntry, AIWatchLog,
} from '@/hooks/useAIWatchSystem';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const HUD_BG     = '#0a0e1a';
const HUD_CARD   = '#0d1117';
const HUD_BORDER = '#1a2332';
const HUD_ACCENT = '#00d4ff';
const HUD_GREEN  = '#00ff88';
const HUD_YELLOW = '#ffcc00';
const HUD_RED    = '#ff4444';
const HUD_ORANGE = '#ff8800';
const HUD_PURPLE = '#9945ff';
const HUD_TEXT   = '#e2e8f0';
const HUD_DIM    = '#64748b';
const HUD_BRIGHT = '#ffffff';

const SEVERITY_COLORS: Record<string, string> = {
  low: HUD_GREEN, medium: HUD_YELLOW, high: HUD_ORANGE, critical: HUD_RED,
};

const DEFAULT_ROLE_LIMITS: Record<string, number> = {
  platform_admin: 0, superadmin: 0, super_admin: 0, administrator: 0, admin: 0,
  manager: 200, supervisor: 100, default: 50,
};

const ROLE_OPTIONS = [
  'Maintenance Tech', 'Sanitation', 'Production Operator', 'Quality Tech',
  'Safety Coordinator', 'Supervisor', 'Manager', 'HR', 'Admin', 'Super Admin',
];

// ══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function WatchScreen() {
  const router = useRouter();
  const { userProfile } = useUser();
  const queryClient = useQueryClient();
  const orgId = userProfile?.organization_id || null;

  const isAuthorized =
    userProfile?.is_platform_admin === true ||
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'superadmin' ||
    userProfile?.role === 'platform_admin';

  const [activeTab, setActiveTab] = useState<'watched'|'logs'|'saved'|'usage'>('watched');
  const [refreshing, setRefreshing] = useState(false);
  const [flagModal, setFlagModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AIWatchEntry | null>(null);
  const [selectedLog, setSelectedLog] = useState<AIWatchLog | null>(null);
  const [logDetailModal, setLogDetailModal] = useState(false);
  const [unflagModal, setUnflagModal] = useState(false);
  const [unflagReason, setUnflagReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Flag form
  const [flagEmployeeId, setFlagEmployeeId] = useState('');
  const [flagEmployeeName, setFlagEmployeeName] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState<'low'|'medium'|'high'|'critical'>('low');
  const [flagEmailAlerts, setFlagEmailAlerts] = useState(false);
  const [flagAlertEmail, setFlagAlertEmail] = useState('');
  const [flagNotes, setFlagNotes] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Usage
  const [usageDateRange, setUsageDateRange] = useState<'today'|'this_week'|'this_month'>('today');

  // Rate limit modals
  const [roleLimitModal, setRoleLimitModal] = useState(false);
  const [empLimitModal, setEmpLimitModal] = useState(false);
  const [rlRoleName, setRlRoleName] = useState('');
  const [rlLimit, setRlLimit] = useState('50');
  const [rlUnlimited, setRlUnlimited] = useState(false);
  const [rlEmpId, setRlEmpId] = useState('');
  const [rlEmpName, setRlEmpName] = useState('');
  const [rlEmpLimit, setRlEmpLimit] = useState('50');
  const [rlEmpUnlimited, setRlEmpUnlimited] = useState(false);
  const [rlEmpSearch, setRlEmpSearch] = useState('');

  // ── Queries ──
  const { data: stats, refetch: refetchStats } = useWatchStats();
  const { data: watchList = [], isLoading: loadingWatch, refetch: refetchWatch } = useWatchList();
  const { data: unreviewedLogs = [], refetch: refetchUnreviewed } = useUnreviewedWatchLogs();
  const { data: watchLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useWatchLogs(selectedEntry?.id);
  const { data: savedConvos = [], isLoading: loadingSaved, refetch: refetchSaved } = useAllSavedConversations();

  const { data: employeeResults = [] } = useQuery({
    queryKey: ['employee_search_watch', employeeSearch, orgId],
    queryFn: async () => {
      if (employeeSearch.length < 2 || !orgId) return [];
      const { data } = await supabase.from('employees')
        .select('id, first_name, last_name, department_code, position')
        .eq('organization_id', orgId)
        .or(`first_name.ilike.%${employeeSearch}%,last_name.ilike.%${employeeSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: employeeSearch.length >= 2 && !!orgId,
  });

  const { data: rlEmpResults = [] } = useQuery({
    queryKey: ['rl_emp_search', rlEmpSearch, orgId],
    queryFn: async () => {
      if (rlEmpSearch.length < 2 || !orgId) return [];
      const { data } = await supabase.from('employees')
        .select('id, first_name, last_name, role')
        .eq('organization_id', orgId)
        .or(`first_name.ilike.%${rlEmpSearch}%,last_name.ilike.%${rlEmpSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: rlEmpSearch.length >= 2 && !!orgId,
  });

  // ── Rate Limits ──
  const { data: roleLimits = [], refetch: refetchRoleLimits } = useQuery({
    queryKey: ['ai_role_limits', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('ai_rate_limits')
        .select('*')
        .eq('organization_id', orgId)
        .is('employee_id', null)
        .order('role_name');
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: empLimits = [], refetch: refetchEmpLimits } = useQuery({
    queryKey: ['ai_emp_limits', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from('ai_rate_limits')
        .select('*')
        .eq('organization_id', orgId)
        .not('employee_id', 'is', null)
        .order('employee_name');
      return data || [];
    },
    enabled: !!orgId,
  });

  // ── Usage Stats ──
  const { data: usageStats, refetch: refetchUsage } = useQuery({
    queryKey: ['ai_usage_stats', orgId, usageDateRange],
    queryFn: async () => {
      if (!orgId) return null;
      const now = new Date();
      let fromDate: string;
      if (usageDateRange === 'today') {
        fromDate = now.toISOString().split('T')[0] + 'T00:00:00';
      } else if (usageDateRange === 'this_week') {
        fromDate = new Date(now.getTime() - 7 * 86400000).toISOString();
      } else {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
      console.log('[WatchScreen] orgId for usage query:', orgId);
      const { data, error } = await supabase.from('ai_usage_log')
        .select('*').eq('organization_id', orgId)
        .gte('created_at', fromDate).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      const logs = data || [];
      const totalCalls  = logs.length;
      const totalTokens = logs.reduce((s: number, l: any) => s + (l.total_tokens || 0), 0);
      const totalCost   = logs.reduce((s: number, l: any) => s + (l.estimated_cost_usd || 0), 0);
      const totalInput  = logs.reduce((s: number, l: any) => s + (l.input_tokens || 0), 0);
      const totalOutput = logs.reduce((s: number, l: any) => s + (l.output_tokens || 0), 0);
      const byEmployee: Record<string, any> = {};
      logs.forEach((l: any) => {
        const key = l.employee_id || 'unknown';
        if (!byEmployee[key]) byEmployee[key] = {
          employee_id: l.employee_id, employee_name: l.employee_name || 'Unknown',
          employee_role: l.employee_role || 'unknown', calls: 0, tokens: 0, cost: 0,
        };
        byEmployee[key].calls++;
        byEmployee[key].tokens += l.total_tokens || 0;
        byEmployee[key].cost   += l.estimated_cost_usd || 0;
      });
      const employeeList = Object.values(byEmployee).sort((a: any, b: any) => b.calls - a.calls);
      const byTool: Record<string, number> = {};
      logs.forEach((l: any) => { if (l.tool_used) byTool[l.tool_used] = (byTool[l.tool_used] || 0) + 1; });
      const topTools = Object.entries(byTool).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tool, count]) => ({ tool, count }));
      return { totalCalls, totalTokens, totalCost, totalInput, totalOutput, employeeList, topTools, recentLogs: logs.slice(0, 30) };
    },
    enabled: !!orgId,
  });

  // Also get today's usage per employee for rate limit display
  const { data: todayUsage = {} } = useQuery({
    queryKey: ['ai_today_usage', orgId],
    queryFn: async () => {
      if (!orgId) return {};
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('ai_usage_log')
        .select('employee_id, employee_name')
        .eq('organization_id', orgId)
        .gte('created_at', todayStart.toISOString());
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.employee_id) counts[r.employee_id] = (counts[r.employee_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId,
  });

  const flagEmployee   = useFlagEmployee();
  const unflagEmployee = useUnflagEmployee();
  const markReviewed   = useMarkLogReviewed();
  const markEmailed    = useMarkLogEmailed();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchWatch(), refetchUnreviewed(), refetchLogs(), refetchSaved(), refetchUsage(), refetchRoleLimits(), refetchEmpLimits()]);
    setRefreshing(false);
  };

  // ── Rate Limit Mutations ──
  const saveRoleLimit = async () => {
    if (!rlRoleName || !orgId) return;
    setSaving(true);
    try {
      const existing = roleLimits.find((r: any) => r.role_name === rlRoleName);
      if (existing) {
        await supabase.from('ai_rate_limits').update({
          daily_limit: parseInt(rlLimit) || 50,
          is_unlimited: rlUnlimited,
          updated_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('ai_rate_limits').insert({
          organization_id: orgId,
          role_name: rlRoleName,
          daily_limit: parseInt(rlLimit) || 50,
          is_unlimited: rlUnlimited,
          created_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
        });
      }
      await refetchRoleLimits();
      setRoleLimitModal(false);
      setRlRoleName(''); setRlLimit('50'); setRlUnlimited(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const saveEmpLimit = async () => {
    if (!rlEmpId || !orgId) return;
    setSaving(true);
    try {
      const existing = empLimits.find((r: any) => r.employee_id === rlEmpId);
      if (existing) {
        await supabase.from('ai_rate_limits').update({
          daily_limit: parseInt(rlEmpLimit) || 50,
          is_unlimited: rlEmpUnlimited,
          updated_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('ai_rate_limits').insert({
          organization_id: orgId,
          employee_id: rlEmpId,
          employee_name: rlEmpName,
          daily_limit: parseInt(rlEmpLimit) || 50,
          is_unlimited: rlEmpUnlimited,
          created_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
        });
      }
      await refetchEmpLimits();
      setEmpLimitModal(false);
      setRlEmpId(''); setRlEmpName(''); setRlEmpLimit('50'); setRlEmpUnlimited(false); setRlEmpSearch('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const deleteRoleLimit = async (id: string) => {
    Alert.alert('Remove', 'Remove this role limit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('ai_rate_limits').delete().eq('id', id);
        refetchRoleLimits();
      }},
    ]);
  };

  const deleteEmpLimit = async (id: string) => {
    Alert.alert('Remove', 'Remove this employee override?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('ai_rate_limits').delete().eq('id', id);
        refetchEmpLimits();
      }},
    ]);
  };

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

  const handleFlag = async () => {
    if (!flagEmployeeId || !flagEmployeeName || !flagReason) {
      Alert.alert('Required', 'Please select an employee and enter a reason.'); return;
    }
    setSaving(true);
    try {
      await flagEmployee.mutateAsync({
        employee_id: flagEmployeeId, employee_name: flagEmployeeName, reason: flagReason,
        severity: flagSeverity,
        flagged_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Platform Admin',
        flagged_by_id: userProfile?.id || undefined,
        email_alerts: flagEmailAlerts, alert_email: flagAlertEmail || undefined, notes: flagNotes || undefined,
      });
      setFlagModal(false); resetFlagForm();
      Alert.alert('Watch Active', `${flagEmployeeName} has been added to the watch list.`);
    } catch (err: any) { Alert.alert('Error', err.message || 'Failed to flag employee.');
    } finally { setSaving(false); }
  };

  const handleUnflag = async () => {
    if (!selectedEntry || !unflagReason) { Alert.alert('Required', 'Please enter a reason.'); return; }
    setSaving(true);
    try {
      await unflagEmployee.mutateAsync({
        id: selectedEntry.id, employee_id: selectedEntry.employee_id,
        unflagged_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Platform Admin',
        unflag_reason: unflagReason,
      });
      setUnflagModal(false); setSelectedEntry(null); setUnflagReason('');
    } catch (err: any) { Alert.alert('Error', err.message || 'Failed to remove watch.');
    } finally { setSaving(false); }
  };

  const handleMarkReviewed = async () => {
    if (!selectedLog) return;
    setSaving(true);
    try {
      await markReviewed.mutateAsync({
        id: selectedLog.id, watch_id: selectedLog.watch_id,
        reviewed_by: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'Platform Admin',
        review_notes: reviewNotes || undefined,
      });
      setLogDetailModal(false); setSelectedLog(null); setReviewNotes('');
    } catch (err: any) { Alert.alert('Error', err.message || 'Failed to mark reviewed.');
    } finally { setSaving(false); }
  };

  const handleEmailLog = async (log: AIWatchLog) => {
    Alert.prompt('Email Summary', 'Enter email address:', async (email) => {
      if (!email) return;
      try {
        await markEmailed.mutateAsync({ id: log.id, watch_id: log.watch_id, emailed_to: email });
        const subject = encodeURIComponent(`AI Watch Log — ${log.employee_name} — ${new Date(log.created_at).toLocaleDateString()}`);
        const body = encodeURIComponent(`Employee: ${log.employee_name}\nDate: ${new Date(log.created_at).toLocaleString()}\nMessages: ${log.message_count}\n\nSummary:\n${log.summary || 'No summary available.'}\n\nTopics: ${log.topics?.join(', ') || 'N/A'}\n\nActions:\n${log.actions_taken?.map(a => `• ${a}`).join('\n') || 'None'}\n\nUnresolved: ${log.unresolved || 'None'}`);
        Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
        Alert.alert('Done', `Marked as emailed to ${email}.`);
      } catch (err: any) { Alert.alert('Error', err.message); }
    }, 'plain-text', selectedEntry?.alert_email || '');
  };

  const resetFlagForm = () => {
    setFlagEmployeeId(''); setFlagEmployeeName(''); setFlagReason('');
    setFlagSeverity('low'); setFlagEmailAlerts(false);
    setFlagAlertEmail(''); setFlagNotes(''); setEmployeeSearch('');
  };

  const activeWatched   = watchList.filter(w => w.is_active);
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
              <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{unreviewedLogs.length}</Text></View>
            )}
          </View>
          <Text style={styles.headerSub}>Platform Admin · Silent Monitoring</Text>
        </View>
        <TouchableOpacity style={styles.flagBtn} onPress={() => setFlagModal(true)}>
          <Ionicons name="add" size={16} color={HUD_BG} />
          <Text style={styles.flagBtnText}>Flag</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Strip */}
      <View style={styles.kpiStrip}>
        {[
          { label: 'WATCHED',    value: stats?.activeWatched  || 0, color: HUD_RED    },
          { label: 'UNREVIEWED', value: stats?.unreviewedLogs || 0, color: HUD_YELLOW },
          { label: 'TOTAL LOGS', value: stats?.totalLogs      || 0, color: HUD_ACCENT },
          { label: 'ALERTS',     value: stats?.emailAlerts    || 0, color: HUD_ORANGE },
        ].map(k => (
          <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab Strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabStripScroll}>
        <View style={styles.tabStrip}>
          {[
            { key: 'watched', label: 'Watch List',   icon: 'eye-outline'         },
            { key: 'logs',    label: 'Conv. Logs',   icon: 'chatbubbles-outline'  },
            { key: 'saved',   label: 'Saved Convos', icon: 'bookmark-outline'    },
            { key: 'usage',   label: 'Usage',        icon: 'bar-chart-outline'   },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? HUD_ACCENT : HUD_DIM} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
              <View style={styles.loadingWrap}><ActivityIndicator size="large" color={HUD_ACCENT} /></View>
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
                  <WatchEntryCard key={entry.id} entry={entry}
                    onViewLogs={() => { setSelectedEntry(entry); setActiveTab('logs'); }}
                    onUnflag={() => { setSelectedEntry(entry); setUnflagModal(true); }}
                  />
                ))}
                {inactiveWatched.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>INACTIVE HISTORY ({inactiveWatched.length})</Text>
                    {inactiveWatched.map(entry => (
                      <WatchEntryCard key={entry.id} entry={entry}
                        onViewLogs={() => { setSelectedEntry(entry); setActiveTab('logs'); }}
                        onUnflag={() => {}} inactive
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
              <View style={styles.loadingWrap}><ActivityIndicator size="large" color={HUD_ACCENT} /></View>
            ) : watchLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Logs Yet</Text>
                <Text style={styles.emptySub}>
                  {selectedEntry ? `No conversations captured for ${selectedEntry.employee_name} yet.` : 'Select an employee from the Watch List to view their logs.'}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{watchLogs.length} CONVERSATION{watchLogs.length !== 1 ? 'S' : ''} CAPTURED</Text>
                {watchLogs.map(log => (
                  <WatchLogCard key={log.id} log={log}
                    onReview={() => { setSelectedLog(log); setLogDetailModal(true); }}
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
              <View style={styles.loadingWrap}><ActivityIndicator size="large" color={HUD_ACCENT} /></View>
            ) : savedConvos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Saved Conversations</Text>
                <Text style={styles.emptySub}>Employees can save conversations by saying "save this conversation".</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>{savedConvos.length} SAVED CONVERSATION{savedConvos.length !== 1 ? 'S' : ''}</Text>
                {savedConvos.map(convo => <SavedConvoCard key={convo.id} convo={convo} />)}
              </>
            )}
          </>
        )}

        {/* ── USAGE TAB ── */}
        {activeTab === 'usage' && (
          <>
            {/* Date Range */}
            <View style={styles.usageDateRow}>
              {(['today','this_week','this_month'] as const).map(range => (
                <TouchableOpacity
                  key={range}
                  style={[styles.usageDateChip, usageDateRange === range && { backgroundColor: HUD_ACCENT, borderColor: HUD_ACCENT }]}
                  onPress={() => setUsageDateRange(range)}
                >
                  <Text style={[styles.usageDateChipText, usageDateRange === range && { color: HUD_BG }]}>
                    {range === 'today' ? 'Today' : range === 'this_week' ? 'This Week' : 'This Month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* KPI Cards */}
            <View style={styles.usageKpiRow}>
              {[
                { label: 'TOTAL CALLS',  value: usageStats?.totalCalls  || 0, color: HUD_ACCENT, format: 'number' },
                { label: 'TOTAL TOKENS', value: usageStats?.totalTokens || 0, color: HUD_PURPLE, format: 'tokens' },
                { label: 'EST. COST',    value: usageStats?.totalCost   || 0, color: HUD_GREEN,  format: 'cost'   },
              ].map(k => (
                <View key={k.label} style={[styles.usageKpiCard, { borderTopColor: k.color }]}>
                  <Text style={[styles.usageKpiValue, { color: k.color }]}>
                    {k.format === 'cost' ? `$${(k.value as number).toFixed(4)}`
                      : k.format === 'tokens' ? ((k.value as number) > 1000 ? `${((k.value as number)/1000).toFixed(1)}K` : String(k.value))
                      : String(k.value)}
                  </Text>
                  <Text style={styles.usageKpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>

            {/* Token Breakdown */}
            <View style={styles.usageTokenBreakdown}>
              <View style={styles.usageTokenRow}>
                <Text style={styles.usageTokenLabel}>Input Tokens</Text>
                <Text style={[styles.usageTokenValue, { color: HUD_ACCENT }]}>{((usageStats?.totalInput || 0)/1000).toFixed(1)}K</Text>
                <Text style={styles.usageTokenCost}>${(((usageStats?.totalInput || 0)/1_000_000)*3).toFixed(4)}</Text>
              </View>
              <View style={styles.usageTokenRow}>
                <Text style={styles.usageTokenLabel}>Output Tokens</Text>
                <Text style={[styles.usageTokenValue, { color: HUD_YELLOW }]}>{((usageStats?.totalOutput || 0)/1000).toFixed(1)}K</Text>
                <Text style={styles.usageTokenCost}>${(((usageStats?.totalOutput || 0)/1_000_000)*15).toFixed(4)}</Text>
              </View>
              <View style={[styles.usageTokenRow, { borderTopWidth: 1, borderTopColor: HUD_BORDER, marginTop: 4, paddingTop: 8 }]}>
                <Text style={[styles.usageTokenLabel, { color: HUD_BRIGHT, fontWeight: '700' }]}>Total Cost</Text>
                <Text style={[styles.usageTokenValue, { color: HUD_GREEN, fontWeight: '800' }]}>${(usageStats?.totalCost || 0).toFixed(4)}</Text>
                <Text style={[styles.usageTokenCost, { color: HUD_GREEN }]}>USD</Text>
              </View>
            </View>

            {/* ── RATE LIMITS SECTION ── */}
            <View style={styles.rlHeader}>
              <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>RATE LIMITS</Text>
              <Text style={styles.rlHeaderSub}>Daily AI message caps · resets midnight CST</Text>
            </View>

            {/* Role Defaults */}
            <View style={styles.rlSectionHeader}>
              <Text style={styles.rlSectionTitle}>ROLE DEFAULTS</Text>
              <TouchableOpacity
                style={styles.rlAddBtn}
                onPress={() => { setRlRoleName(''); setRlLimit('50'); setRlUnlimited(false); setRoleLimitModal(true); }}
              >
                <Ionicons name="add" size={14} color={HUD_BG} />
                <Text style={styles.rlAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Hardcoded defaults info */}
            <View style={[styles.rlInfoCard, { marginBottom: 8 }]}>
              <Ionicons name="information-circle-outline" size={14} color={HUD_DIM} />
              <Text style={styles.rlInfoText}>
                Built-in defaults: Platform/Super Admin = unlimited · Manager = 200 · Supervisor = 100 · All others = 50
              </Text>
            </View>

            {roleLimits.length === 0 ? (
              <View style={[styles.rlEmptyCard, { marginBottom: 12 }]}>
                <Text style={styles.rlEmptyText}>No role overrides set. Using built-in defaults.</Text>
              </View>
            ) : (
              <View style={[styles.usageEmployeeCard, { marginBottom: 12 }]}>
                {roleLimits.map((rl: any, i: number) => (
                  <View key={rl.id} style={[styles.rlRow, i === roleLimits.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rlRowName}>{rl.role_name}</Text>
                    </View>
                    <View style={styles.rlRowRight}>
                      {rl.is_unlimited ? (
                        <View style={[styles.rlBadge, { backgroundColor: HUD_GREEN + '22', borderColor: HUD_GREEN + '44' }]}>
                          <Text style={[styles.rlBadgeText, { color: HUD_GREEN }]}>UNLIMITED</Text>
                        </View>
                      ) : (
                        <Text style={styles.rlLimitText}>{rl.daily_limit}/day</Text>
                      )}
                      <TouchableOpacity
                        style={styles.rlEditBtn}
                        onPress={() => { setRlRoleName(rl.role_name); setRlLimit(String(rl.daily_limit)); setRlUnlimited(rl.is_unlimited); setRoleLimitModal(true); }}
                      >
                        <Ionicons name="pencil-outline" size={12} color={HUD_ACCENT} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRoleLimit(rl.id)}>
                        <Ionicons name="trash-outline" size={12} color={HUD_RED} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Employee Overrides */}
            <View style={styles.rlSectionHeader}>
              <Text style={styles.rlSectionTitle}>EMPLOYEE OVERRIDES</Text>
              <TouchableOpacity
                style={styles.rlAddBtn}
                onPress={() => { setRlEmpId(''); setRlEmpName(''); setRlEmpLimit('50'); setRlEmpUnlimited(false); setRlEmpSearch(''); setEmpLimitModal(true); }}
              >
                <Ionicons name="add" size={14} color={HUD_BG} />
                <Text style={styles.rlAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {empLimits.length === 0 ? (
              <View style={[styles.rlEmptyCard, { marginBottom: 12 }]}>
                <Text style={styles.rlEmptyText}>No employee overrides. All employees use role defaults.</Text>
              </View>
            ) : (
              <View style={[styles.usageEmployeeCard, { marginBottom: 12 }]}>
                {empLimits.map((rl: any, i: number) => {
                  const used = (todayUsage as any)[rl.employee_id] || 0;
                  const limit = rl.is_unlimited ? null : rl.daily_limit;
                  const pct = limit ? used / limit : 0;
                  const barColor = pct >= 1 ? HUD_RED : pct >= 0.8 ? HUD_YELLOW : HUD_GREEN;
                  return (
                    <View key={rl.id} style={[styles.rlRow, i === empLimits.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rlRowName}>{rl.employee_name}</Text>
                        {!rl.is_unlimited && limit && (
                          <View style={styles.rlProgressWrap}>
                            <View style={[styles.rlProgressBar, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: barColor }]} />
                          </View>
                        )}
                        {!rl.is_unlimited && limit && (
                          <Text style={[styles.rlProgressLabel, { color: barColor }]}>{used}/{limit} today</Text>
                        )}
                      </View>
                      <View style={styles.rlRowRight}>
                        {rl.is_unlimited ? (
                          <View style={[styles.rlBadge, { backgroundColor: HUD_GREEN + '22', borderColor: HUD_GREEN + '44' }]}>
                            <Text style={[styles.rlBadgeText, { color: HUD_GREEN }]}>UNLIMITED</Text>
                          </View>
                        ) : (
                          <Text style={styles.rlLimitText}>{rl.daily_limit}/day</Text>
                        )}
                        <TouchableOpacity
                          style={styles.rlEditBtn}
                          onPress={() => { setRlEmpId(rl.employee_id); setRlEmpName(rl.employee_name); setRlEmpLimit(String(rl.daily_limit)); setRlEmpUnlimited(rl.is_unlimited); setEmpLimitModal(true); }}
                        >
                          <Ionicons name="pencil-outline" size={12} color={HUD_ACCENT} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteEmpLimit(rl.id)}>
                          <Ionicons name="trash-outline" size={12} color={HUD_RED} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Top Tools */}
            {usageStats?.topTools && usageStats.topTools.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>TOP TOOLS USED</Text>
                <View style={styles.usageToolsCard}>
                  {usageStats.topTools.map((t: any) => {
                    const maxCount = usageStats.topTools[0].count;
                    const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                    return (
                      <View key={t.tool} style={styles.usageToolRow}>
                        <Text style={styles.usageToolName} numberOfLines={1}>
                          {t.tool.replace(/_/g, ' ').replace('create task feed post ', '')}
                        </Text>
                        <View style={styles.usageToolBarWrap}>
                          <View style={[styles.usageToolBar, { width: `${pct}%` as any, backgroundColor: HUD_ACCENT }]} />
                        </View>
                        <Text style={styles.usageToolCount}>{t.count}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Per Employee Usage */}
            {usageStats?.employeeList && usageStats.employeeList.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>USAGE BY EMPLOYEE</Text>
                <View style={styles.usageEmployeeCard}>
                  <View style={[styles.usageEmployeeHeader, { borderBottomColor: HUD_BORDER }]}>
                    <Text style={[styles.usageEmployeeCell, { flex: 3, color: HUD_DIM }]}>EMPLOYEE</Text>
                    <Text style={[styles.usageEmployeeCell, { flex: 1, textAlign: 'center', color: HUD_DIM }]}>CALLS</Text>
                    <Text style={[styles.usageEmployeeCell, { flex: 1, textAlign: 'center', color: HUD_DIM }]}>TOKENS</Text>
                    <Text style={[styles.usageEmployeeCell, { flex: 1.5, textAlign: 'right', color: HUD_DIM }]}>COST</Text>
                  </View>
                  {usageStats.employeeList.map((emp: any, i: number) => (
                    <View key={emp.employee_id || i}
                      style={[styles.usageEmployeeRow, { borderBottomColor: HUD_BORDER },
                        i === usageStats.employeeList.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 3 }}>
                        <Text style={styles.usageEmployeeName} numberOfLines={1}>{emp.employee_name}</Text>
                        <Text style={styles.usageEmployeeRole}>{emp.employee_role}</Text>
                      </View>
                      <Text style={[styles.usageEmployeeCell, { flex: 1, textAlign: 'center', color: HUD_ACCENT }]}>{emp.calls}</Text>
                      <Text style={[styles.usageEmployeeCell, { flex: 1, textAlign: 'center', color: HUD_PURPLE }]}>
                        {emp.tokens > 1000 ? `${(emp.tokens/1000).toFixed(1)}K` : emp.tokens}
                      </Text>
                      <Text style={[styles.usageEmployeeCell, { flex: 1.5, textAlign: 'right', color: HUD_GREEN }]}>${emp.cost.toFixed(4)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Recent Calls */}
            {usageStats?.recentLogs && usageStats.recentLogs.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>RECENT CALLS</Text>
                {usageStats.recentLogs.map((log: any, i: number) => (
                  <View key={log.id || i} style={styles.usageLogCard}>
                    <View style={styles.usageLogHeader}>
                      <Text style={styles.usageLogEmployee}>{log.employee_name || 'Unknown'}</Text>
                      <Text style={styles.usageLogTime}>
                        {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.usageLogTool} numberOfLines={1}>
                      {log.tool_used ? log.tool_used.replace(/_/g, ' ') : 'general response'}
                    </Text>
                    {log.command_preview && <Text style={styles.usageLogCommand} numberOfLines={1}>"{log.command_preview}"</Text>}
                    <View style={styles.usageLogFooter}>
                      <Text style={styles.usageLogTokens}>{log.total_tokens || 0} tokens</Text>
                      <Text style={styles.usageLogCost}>${(log.estimated_cost_usd || 0).toFixed(5)}</Text>
                      {log.had_image && <Text style={styles.usageLogBadge}>📷</Text>}
                      {log.had_web_search && <Text style={styles.usageLogBadge}>🌐</Text>}
                      {log.response_ms && <Text style={styles.usageLogTokens}>{log.response_ms}ms</Text>}
                    </View>
                  </View>
                ))}
              </>
            )}

            {(!usageStats || usageStats.totalCalls === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={48} color={HUD_DIM} />
                <Text style={styles.emptyTitle}>No Usage Data Yet</Text>
                <Text style={styles.emptySub}>Usage data will appear here after AI assistant calls are made.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── FLAG MODAL ── */}
      <Modal visible={flagModal} transparent animationType="slide" onRequestClose={() => setFlagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Flag Employee for Monitoring</Text>
            <Text style={styles.modalSub}>Silent — employee will not be notified</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                    <TextInput style={styles.input} placeholder="Search employee name..." placeholderTextColor={HUD_DIM}
                      value={employeeSearch} onChangeText={setEmployeeSearch} />
                    {employeeResults.length > 0 && (
                      <View style={styles.employeeDropdown}>
                        {employeeResults.map((emp: any) => (
                          <TouchableOpacity key={emp.id} style={styles.employeeDropdownItem}
                            onPress={() => { setFlagEmployeeId(emp.id); setFlagEmployeeName(`${emp.first_name} ${emp.last_name}`); setEmployeeSearch(''); }}>
                            <Text style={styles.employeeDropdownName}>{emp.first_name} {emp.last_name}</Text>
                            <Text style={styles.employeeDropdownSub}>{emp.position || emp.department_code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Reason <Text style={{ color: HUD_RED }}>*</Text></Text>
                <TextInput style={[styles.input, styles.inputMulti]} placeholder="Why is this employee being monitored?"
                  placeholderTextColor={HUD_DIM} value={flagReason} onChangeText={setFlagReason} multiline numberOfLines={3} />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Severity</Text>
                <View style={styles.severityRow}>
                  {(['low','medium','high','critical'] as const).map(s => (
                    <TouchableOpacity key={s}
                      style={[styles.severityChip, flagSeverity === s && { backgroundColor: SEVERITY_COLORS[s] + '33', borderColor: SEVERITY_COLORS[s] }]}
                      onPress={() => setFlagSeverity(s)}>
                      <Text style={[styles.severityChipText, flagSeverity === s && { color: SEVERITY_COLORS[s] }]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Text style={styles.toggleLabel}>Email Alerts</Text>
                  <Text style={styles.toggleHint}>Send email when new conversation is captured</Text>
                </View>
                <TouchableOpacity style={[styles.toggle, flagEmailAlerts && styles.toggleActive]} onPress={() => setFlagEmailAlerts(!flagEmailAlerts)}>
                  <View style={[styles.toggleThumb, flagEmailAlerts && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              {flagEmailAlerts && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Alert Email</Text>
                  <TextInput style={styles.input} placeholder="email@example.com" placeholderTextColor={HUD_DIM}
                    value={flagAlertEmail} onChangeText={setFlagAlertEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
              )}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Admin Notes</Text>
                <TextInput style={[styles.input, styles.inputMulti]} placeholder="Internal notes (optional)"
                  placeholderTextColor={HUD_DIM} value={flagNotes} onChangeText={setFlagNotes} multiline numberOfLines={2} />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setFlagModal(false); resetFlagForm(); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, { backgroundColor: HUD_RED }, (!flagEmployeeId || !flagReason) && { opacity: 0.4 }]}
                  onPress={handleFlag} disabled={saving || !flagEmployeeId || !flagReason}>
                  {saving ? <ActivityIndicator size="small" color={HUD_BG} /> : <Text style={styles.modalSaveText}>🚨 Activate Watch</Text>}
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
              <Text style={styles.fieldLabel}>Reason <Text style={{ color: HUD_RED }}>*</Text></Text>
              <TextInput style={[styles.input, styles.inputMulti]} placeholder="Why is this watch being removed?"
                placeholderTextColor={HUD_DIM} value={unflagReason} onChangeText={setUnflagReason} multiline numberOfLines={3} />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setUnflagModal(false); setUnflagReason(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, !unflagReason && { opacity: 0.4 }]}
                onPress={handleUnflag} disabled={saving || !unflagReason}>
                {saving ? <ActivityIndicator size="small" color={HUD_BG} /> : <Text style={styles.modalSaveText}>Remove Watch</Text>}
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
                  {selectedLog ? new Date(selectedLog.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                </Text>
              </View>
              {!selectedLog?.reviewed && <View style={styles.unreviewedBadge}><Text style={styles.unreviewedBadgeText}>UNREVIEWED</Text></View>}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedLog?.summary && <View style={styles.logSection}><Text style={styles.logSectionTitle}>SUMMARY</Text><Text style={styles.logSectionText}>{selectedLog.summary}</Text></View>}
              {selectedLog?.topics && selectedLog.topics.length > 0 && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>TOPICS</Text>
                  <View style={styles.tagRow}>{selectedLog.topics.map((t, i) => <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}</View>
                </View>
              )}
              {selectedLog?.actions_taken && selectedLog.actions_taken.length > 0 && (
                <View style={styles.logSection}>
                  <Text style={styles.logSectionTitle}>ACTIONS TAKEN</Text>
                  {selectedLog.actions_taken.map((a, i) => (
                    <View key={i} style={styles.actionRow}><Ionicons name="checkmark-circle-outline" size={14} color={HUD_GREEN} /><Text style={styles.actionText}>{a}</Text></View>
                  ))}
                </View>
              )}
              {selectedLog?.unresolved && <View style={styles.logSection}><Text style={styles.logSectionTitle}>UNRESOLVED</Text><Text style={[styles.logSectionText, { color: HUD_YELLOW }]}>{selectedLog.unresolved}</Text></View>}
              <View style={styles.logMetaRow}><Ionicons name="chatbubble-outline" size={12} color={HUD_DIM} /><Text style={styles.logMetaText}>{selectedLog?.message_count || 0} messages</Text></View>
              {!selectedLog?.reviewed && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Review Notes (optional)</Text>
                  <TextInput style={[styles.input, styles.inputMulti]} placeholder="Add notes..." placeholderTextColor={HUD_DIM}
                    value={reviewNotes} onChangeText={setReviewNotes} multiline numberOfLines={3} />
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
                <TouchableOpacity style={styles.modalCancel} onPress={() => setLogDetailModal(false)}><Text style={styles.modalCancelText}>Close</Text></TouchableOpacity>
                {selectedLog && !selectedLog.reviewed && (
                  <TouchableOpacity style={[styles.modalSave, { backgroundColor: HUD_GREEN, flex: 1.5 }]} onPress={handleMarkReviewed} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={HUD_BG} /> : <Text style={styles.modalSaveText}>✓ Mark Reviewed</Text>}
                  </TouchableOpacity>
                )}
                {selectedLog && (
                  <TouchableOpacity style={[styles.modalSave, { backgroundColor: HUD_ACCENT, flex: 1 }]} onPress={() => { setLogDetailModal(false); handleEmailLog(selectedLog); }}>
                    <Text style={styles.modalSaveText}>📧 Email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ROLE LIMIT MODAL ── */}
      <Modal visible={roleLimitModal} transparent animationType="slide" onRequestClose={() => setRoleLimitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{rlRoleName ? 'Edit' : 'Add'} Role Limit</Text>
            <Text style={styles.modalSub}>Set daily AI message cap for a role</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Role <Text style={{ color: HUD_RED }}>*</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {ROLE_OPTIONS.map(r => (
                    <TouchableOpacity key={r}
                      style={[styles.rlRoleChip, rlRoleName === r && { backgroundColor: HUD_ACCENT + '33', borderColor: HUD_ACCENT }]}
                      onPress={() => setRlRoleName(r)}>
                      <Text style={[styles.rlRoleChipText, rlRoleName === r && { color: HUD_ACCENT }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelWrap}>
                <Text style={styles.toggleLabel}>Unlimited</Text>
                <Text style={styles.toggleHint}>No daily cap for this role</Text>
              </View>
              <TouchableOpacity style={[styles.toggle, rlUnlimited && styles.toggleActive]} onPress={() => setRlUnlimited(!rlUnlimited)}>
                <View style={[styles.toggleThumb, rlUnlimited && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            {!rlUnlimited && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Daily Limit</Text>
                <TextInput style={styles.input} placeholder="e.g. 50" placeholderTextColor={HUD_DIM}
                  value={rlLimit} onChangeText={setRlLimit} keyboardType="number-pad" />
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRoleLimitModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, !rlRoleName && { opacity: 0.4 }]} onPress={saveRoleLimit} disabled={saving || !rlRoleName}>
                {saving ? <ActivityIndicator size="small" color={HUD_BG} /> : <Text style={styles.modalSaveText}>Save Limit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── EMPLOYEE LIMIT MODAL ── */}
      <Modal visible={empLimitModal} transparent animationType="slide" onRequestClose={() => setEmpLimitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{rlEmpId ? 'Edit' : 'Add'} Employee Override</Text>
            <Text style={styles.modalSub}>Override the role default for a specific employee</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Employee <Text style={{ color: HUD_RED }}>*</Text></Text>
                {rlEmpId ? (
                  <View style={styles.selectedEmployee}>
                    <Ionicons name="person" size={16} color={HUD_ACCENT} />
                    <Text style={styles.selectedEmployeeName}>{rlEmpName}</Text>
                    <TouchableOpacity onPress={() => { setRlEmpId(''); setRlEmpName(''); }}>
                      <Ionicons name="close-circle" size={18} color={HUD_RED} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput style={styles.input} placeholder="Search employee name..." placeholderTextColor={HUD_DIM}
                      value={rlEmpSearch} onChangeText={setRlEmpSearch} />
                    {rlEmpResults.length > 0 && (
                      <View style={styles.employeeDropdown}>
                        {rlEmpResults.map((emp: any) => (
                          <TouchableOpacity key={emp.id} style={styles.employeeDropdownItem}
                            onPress={() => { setRlEmpId(emp.id); setRlEmpName(`${emp.first_name} ${emp.last_name}`); setRlEmpSearch(''); }}>
                            <Text style={styles.employeeDropdownName}>{emp.first_name} {emp.last_name}</Text>
                            <Text style={styles.employeeDropdownSub}>{emp.role}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Text style={styles.toggleLabel}>Unlimited</Text>
                  <Text style={styles.toggleHint}>No daily cap for this employee</Text>
                </View>
                <TouchableOpacity style={[styles.toggle, rlEmpUnlimited && styles.toggleActive]} onPress={() => setRlEmpUnlimited(!rlEmpUnlimited)}>
                  <View style={[styles.toggleThumb, rlEmpUnlimited && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              {!rlEmpUnlimited && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Daily Limit</Text>
                  <TextInput style={styles.input} placeholder="e.g. 100" placeholderTextColor={HUD_DIM}
                    value={rlEmpLimit} onChangeText={setRlEmpLimit} keyboardType="number-pad" />
                </View>
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setEmpLimitModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalSave, !rlEmpId && { opacity: 0.4 }]} onPress={saveEmpLimit} disabled={saving || !rlEmpId}>
                  {saving ? <ActivityIndicator size="small" color={HUD_BG} /> : <Text style={styles.modalSaveText}>Save Override</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function WatchEntryCard({ entry, onViewLogs, onUnflag, inactive = false }: {
  entry: AIWatchEntry; onViewLogs: () => void; onUnflag: () => void; inactive?: boolean;
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
          {entry.email_alerts && <View style={styles.emailBadge}><Ionicons name="mail" size={10} color={HUD_ACCENT} /><Text style={styles.emailBadgeText}>EMAIL ALERTS</Text></View>}
          {inactive && <View style={[styles.emailBadge, { backgroundColor: HUD_DIM + '22' }]}><Text style={[styles.emailBadgeText, { color: HUD_DIM }]}>INACTIVE</Text></View>}
        </View>
        <Text style={styles.watchCardName}>{entry.employee_name}</Text>
        <Text style={styles.watchCardReason}>{entry.reason}</Text>
        <View style={styles.watchCardMeta}>
          <View style={styles.metaChip}><Ionicons name="chatbubbles-outline" size={10} color={HUD_DIM} /><Text style={styles.metaChipText}>{entry.conversation_count} conversations</Text></View>
          <View style={styles.metaChip}><Ionicons name="person-outline" size={10} color={HUD_DIM} /><Text style={styles.metaChipText}>By {entry.flagged_by}</Text></View>
          <View style={styles.metaChip}><Ionicons name="calendar-outline" size={10} color={HUD_DIM} /><Text style={styles.metaChipText}>{new Date(entry.created_at).toLocaleDateString()}</Text></View>
        </View>
        {entry.notes && <Text style={styles.watchCardNotes}>📝 {entry.notes}</Text>}
        {!inactive && (
          <View style={styles.watchCardActions}>
            <TouchableOpacity style={styles.watchActionBtn} onPress={onViewLogs}><Ionicons name="chatbubbles-outline" size={14} color={HUD_ACCENT} /><Text style={styles.watchActionText}>View Logs</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.watchActionBtn, styles.watchActionRemove]} onPress={onUnflag}><Ionicons name="eye-off-outline" size={14} color={HUD_RED} /><Text style={[styles.watchActionText, { color: HUD_RED }]}>Remove Watch</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function WatchLogCard({ log, onReview, onEmail }: { log: AIWatchLog; onReview: () => void; onEmail: () => void; }) {
  return (
    <View style={[styles.logCard, !log.reviewed && styles.logCardUnreviewed]}>
      <View style={styles.logCardHeader}>
        <View>
          <Text style={styles.logCardName}>{log.employee_name}</Text>
          <Text style={styles.logCardDate}>{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.logCardBadges}>
          {!log.reviewed && <View style={styles.unreviewedBadge}><Text style={styles.unreviewedBadgeText}>NEW</Text></View>}
          {log.emailed && <View style={[styles.unreviewedBadge, { backgroundColor: HUD_ACCENT + '22', borderColor: HUD_ACCENT + '44' }]}><Ionicons name="mail-outline" size={10} color={HUD_ACCENT} /></View>}
        </View>
      </View>
      {log.summary && <Text style={styles.logCardSummary} numberOfLines={2}>{log.summary}</Text>}
      {log.topics && log.topics.length > 0 && (
        <View style={styles.tagRow}>
          {log.topics.slice(0, 3).map((t, i) => <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}
          {log.topics.length > 3 && <Text style={styles.tagMoreText}>+{log.topics.length - 3}</Text>}
        </View>
      )}
      <View style={styles.logCardFooter}>
        <Text style={styles.logCardMsgCount}>{log.message_count} messages</Text>
        <View style={styles.logCardActions}>
          <TouchableOpacity style={styles.logActionBtn} onPress={onReview}><Ionicons name="eye-outline" size={14} color={HUD_ACCENT} /><Text style={styles.logActionText}>Review</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.logActionBtn, { backgroundColor: HUD_ORANGE + '22', borderColor: HUD_ORANGE + '44' }]} onPress={onEmail}><Ionicons name="mail-outline" size={14} color={HUD_ORANGE} /><Text style={[styles.logActionText, { color: HUD_ORANGE }]}>Email</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SavedConvoCard({ convo }: { convo: any }) {
  return (
    <View style={styles.savedCard}>
      <View style={styles.savedCardHeader}>
        <View><Text style={styles.savedCardName}>{convo.employee_name}</Text><Text style={styles.savedCardDept}>{convo.department_name || convo.department_code || 'Unknown Dept'}</Text></View>
        <View style={styles.savedByBadge}><Text style={styles.savedByText}>{convo.saved_by === 'watch_flag' ? '👁 WATCH' : '💾 SAVED'}</Text></View>
      </View>
      {convo.summary && <Text style={styles.savedCardSummary} numberOfLines={2}>{convo.summary}</Text>}
      {convo.actions_taken && convo.actions_taken.length > 0 && <Text style={styles.savedCardActions}>Actions: {convo.actions_taken.slice(0, 2).join(', ')}{convo.actions_taken.length > 2 ? '...' : ''}</Text>}
      <View style={styles.savedCardFooter}>
        <Text style={styles.savedCardDate}>{new Date(convo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
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
  tabStripScroll: { backgroundColor: HUD_CARD, borderBottomWidth: 1, borderBottomColor: HUD_BORDER, maxHeight: 44 },
  tabStrip: { flexDirection: 'row', paddingHorizontal: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 14 },
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
  logDetailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  logSection: { backgroundColor: HUD_BG, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, padding: 12, marginBottom: 10 },
  logSectionTitle: { fontSize: 10, fontWeight: '700', color: HUD_DIM, letterSpacing: 1, marginBottom: 6 },
  logSectionText: { fontSize: 13, color: HUD_TEXT, lineHeight: 19 },
  logMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  logMetaText: { fontSize: 11, color: HUD_DIM },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionText: { fontSize: 12, color: HUD_TEXT },
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
  // Usage Tab
  usageDateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  usageDateChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HUD_BORDER, alignItems: 'center', backgroundColor: HUD_CARD },
  usageDateChipText: { fontSize: 11, fontWeight: '600', color: HUD_DIM },
  usageKpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  usageKpiCard: { flex: 1, backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, borderTopWidth: 3, padding: 12, alignItems: 'center' },
  usageKpiValue: { fontSize: 18, fontWeight: '800' },
  usageKpiLabel: { fontSize: 8, color: HUD_DIM, letterSpacing: 0.5, marginTop: 2 },
  usageTokenBreakdown: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, padding: 12, marginBottom: 16 },
  usageTokenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  usageTokenLabel: { flex: 2, fontSize: 12, color: HUD_DIM },
  usageTokenValue: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  usageTokenCost: { flex: 1, fontSize: 11, color: HUD_DIM, textAlign: 'right' },
  usageToolsCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, padding: 12, gap: 8 },
  usageToolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usageToolName: { fontSize: 11, color: HUD_TEXT, width: 120 },
  usageToolBarWrap: { flex: 1, height: 6, backgroundColor: HUD_BG, borderRadius: 3, overflow: 'hidden' },
  usageToolBar: { height: 6, borderRadius: 3 },
  usageToolCount: { fontSize: 11, color: HUD_ACCENT, fontWeight: '700', width: 30, textAlign: 'right' },
  usageEmployeeCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 10, overflow: 'hidden' },
  usageEmployeeHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  usageEmployeeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  usageEmployeeCell: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  usageEmployeeName: { fontSize: 12, fontWeight: '600', color: HUD_TEXT },
  usageEmployeeRole: { fontSize: 10, color: HUD_DIM, marginTop: 1 },
  usageLogCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, padding: 10, marginBottom: 6 },
  usageLogHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  usageLogEmployee: { fontSize: 12, fontWeight: '700', color: HUD_BRIGHT },
  usageLogTime: { fontSize: 10, color: HUD_DIM },
  usageLogTool: { fontSize: 11, color: HUD_ACCENT, marginBottom: 2 },
  usageLogCommand: { fontSize: 10, color: HUD_DIM, fontStyle: 'italic', marginBottom: 4 },
  usageLogFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usageLogTokens: { fontSize: 10, color: HUD_DIM },
  usageLogCost: { fontSize: 10, color: HUD_GREEN, fontWeight: '600' },
  usageLogBadge: { fontSize: 12 },
  // Rate Limits
  rlHeader: { marginBottom: 12 },
  rlHeaderSub: { fontSize: 11, color: HUD_DIM, marginTop: 2 },
  rlSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rlSectionTitle: { fontSize: 10, fontWeight: '700', color: HUD_DIM, letterSpacing: 1.5 },
  rlAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: HUD_ACCENT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  rlAddBtnText: { fontSize: 11, fontWeight: '700', color: HUD_BG },
  rlInfoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, padding: 10 },
  rlInfoText: { flex: 1, fontSize: 11, color: HUD_DIM, lineHeight: 16 },
  rlEmptyCard: { backgroundColor: HUD_CARD, borderWidth: 1, borderColor: HUD_BORDER, borderRadius: 8, padding: 12, alignItems: 'center' },
  rlEmptyText: { fontSize: 12, color: HUD_DIM },
  rlRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: HUD_BORDER },
  rlRowName: { fontSize: 13, fontWeight: '600', color: HUD_TEXT },
  rlRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rlLimitText: { fontSize: 12, color: HUD_ACCENT, fontWeight: '600' },
  rlBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  rlBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  rlEditBtn: { padding: 4 },
  rlProgressWrap: { height: 4, backgroundColor: HUD_BG, borderRadius: 2, overflow: 'hidden', marginTop: 4, width: 80 },
  rlProgressBar: { height: 4, borderRadius: 2 },
  rlProgressLabel: { fontSize: 9, marginTop: 2, fontWeight: '600' },
  rlRoleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: HUD_BORDER, backgroundColor: HUD_BG },
  rlRoleChipText: { fontSize: 11, color: HUD_DIM, fontWeight: '600' },
});
