import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Shield,
  Copy,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Link2,
  ChevronRight,
  Globe,
  User,
  Mail,
  Building,
  Calendar,
  Activity,
  Lock,
  FileText,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useAuditSessions,
  AuditSession,
  AuditSessionStatus,
  AuditType,
  AuditAccessLogEntry,
  SCOPE_LABELS,
  AUDIT_TYPE_LABELS,
  CreateAuditSessionInput,
} from '@/hooks/useAuditSessions';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

// ── Status config ──

const STATUS_CONFIG: Record<AuditSessionStatus, { label: string; color: string; icon: any }> = {
  active: { label: 'Active', color: '#10B981', icon: CheckCircle },
  expired: { label: 'Expired', color: '#F59E0B', icon: Clock },
  revoked: { label: 'Revoked', color: '#EF4444', icon: XCircle },
};

const AUDIT_TYPES: { value: AuditType; label: string }[] = [
  { value: 'sqf', label: 'SQF' },
  { value: 'brcgs', label: 'BRCGS' },
  { value: 'fssc', label: 'FSSC 22000' },
  { value: 'internal', label: 'Internal' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'customer', label: 'Customer' },
  { value: 'other', label: 'Other' },
];

// ── Default scope presets ──

const DEFAULT_SQF_SCOPES = {
  scope_documents: true,
  scope_ncrs: true,
  scope_capas: true,
  scope_training: true,
  scope_internal_audits: true,
  scope_haccp: true,
  scope_supplier_approvals: true,
  scope_env_monitoring: true,
  scope_change_management: true,
  scope_food_safety_culture: true,
  scope_work_orders: false,
  scope_inventory: false,
  scope_security_controls: true,
};

// ── Component ──

export default function AuditPortalAdmin() {
  const { colors } = useTheme();
  const { user } = useUser();
  const {
    sessions,
    isLoading,
    refetch,
    createSession,
    revokeSession,
    fetchAccessLog,
    getPortalUrl,
  } = useAuditSessions();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(null);
  const [accessLog, setAccessLog] = useState<AuditAccessLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [createdToken, setCreatedToken] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [detailTokenVisible, setDetailTokenVisible] = useState(false);

  // ── Create form state ──
  const [form, setForm] = useState({
    session_name: '',
    audit_type: 'sqf' as AuditType,
    certification_body: '',
    auditor_name: '',
    auditor_email: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    ...DEFAULT_SQF_SCOPES,
  });

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      session_name: '',
      audit_type: 'sqf',
      certification_body: '',
      auditor_name: '',
      auditor_email: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      ...DEFAULT_SQF_SCOPES,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Stats ──
  const stats = useMemo(() => ({
    active: sessions.filter(s => s.status === 'active').length,
    expired: sessions.filter(s => s.status === 'expired').length,
    revoked: sessions.filter(s => s.status === 'revoked').length,
    totalAccess: sessions.reduce((sum, s) => sum + s.access_count, 0),
  }), [sessions]);

  // ── Create handler ──
  const handleCreate = useCallback(async () => {
    // Validate all fields
    const missing: string[] = [];
    if (!form.session_name.trim()) missing.push('Session Name');
    if (!form.certification_body.trim()) missing.push('Certification Body');
    if (!form.auditor_name.trim()) missing.push('Auditor Name');
    if (!form.auditor_email.trim()) missing.push('Auditor Email');
    if (!form.valid_from.trim()) missing.push('Valid From');
    if (!form.valid_until.trim()) missing.push('Valid Until');

    if (missing.length > 0) {
      Alert.alert('All Fields Required', `Every field must be filled in (use "N/A" if not applicable).\n\nMissing:\n• ${missing.join('\n• ')}`);
      return;
    }

    // Validate date
    const until = new Date(form.valid_until);
    if (isNaN(until.getTime())) {
      Alert.alert('Invalid Date', 'Valid Until must be a valid date (YYYY-MM-DD).');
      return;
    }
    if (until <= new Date()) {
      Alert.alert('Invalid Date', 'Expiration date must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateAuditSessionInput = {
        session_name: form.session_name.trim(),
        audit_type: form.audit_type,
        certification_body: form.certification_body.trim(),
        auditor_name: form.auditor_name.trim(),
        auditor_email: form.auditor_email.trim(),
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: until.toISOString(),
        scope_documents: form.scope_documents,
        scope_ncrs: form.scope_ncrs,
        scope_capas: form.scope_capas,
        scope_training: form.scope_training,
        scope_internal_audits: form.scope_internal_audits,
        scope_haccp: form.scope_haccp,
        scope_supplier_approvals: form.scope_supplier_approvals,
        scope_env_monitoring: form.scope_env_monitoring,
        scope_change_management: form.scope_change_management,
        scope_food_safety_culture: form.scope_food_safety_culture,
        scope_work_orders: form.scope_work_orders,
        scope_inventory: form.scope_inventory,
        scope_security_controls: form.scope_security_controls,
        created_by: user?.name || 'Unknown',
        created_by_id: user?.id || null,
      };

      const result = await createSession.mutateAsync(input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setCreatedToken(result.access_token);
      setCreatedSessionId(result.id);
      setShowCreateModal(false);
      resetForm();
      setShowTokenModal(true);
    } catch (error: any) {
      console.error('[AuditPortal] Create error:', error);
      Alert.alert('Error', error?.message || 'Failed to create audit session');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, createSession, user]);

  // ── Revoke handler ──
  const handleRevoke = useCallback(async () => {
    if (!selectedSession) return;
    if (!revokeReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for revoking this session.');
      return;
    }
    try {
      await revokeSession.mutateAsync({
        id: selectedSession.id,
        revokedBy: user?.name || 'Unknown',
        reason: revokeReason.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRevokeModal(false);
      setShowDetailModal(false);
      setRevokeReason('');
      Alert.alert('Revoked', 'Audit session has been revoked. The auditor can no longer access the portal.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to revoke session');
    }
  }, [selectedSession, revokeReason, revokeSession, user]);

  // ── Open detail ──
  const openDetail = useCallback(async (session: AuditSession) => {
    setSelectedSession(session);
    setShowDetailModal(true);
    setDetailTokenVisible(false);
    setEmailSent(false);
    setLoadingLog(true);
    try {
      const log = await fetchAccessLog(session.id);
      setAccessLog(log);
    } catch {
      setAccessLog([]);
    } finally {
      setLoadingLog(false);
    }
  }, [fetchAccessLog]);

  // ── Copy link ──
  const copyLink = useCallback(async (token: string) => {
    const url = getPortalUrl(token);
    await Clipboard.setStringAsync(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Portal link copied to clipboard.');
  }, [getPortalUrl]);

  // ── Copy token only ──
  const copyToken = useCallback(async (token: string) => {
    await Clipboard.setStringAsync(token);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Access token copied to clipboard.');
  }, []);

  // ── Send email to auditor ──
  const sendEmailToAuditor = useCallback(async (sessionId: string) => {
    setSendingEmail(true);
    setEmailSent(false);
    try {
      const { data, error } = await supabase.rpc('send_auditor_portal_email', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        setEmailSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Email Sent', result.message || 'Portal access email sent to auditor.');
        refetch();
      } else {
        Alert.alert('Email Failed', result?.error || 'Unable to send email. Check Resend configuration.');
      }
    } catch (err: any) {
      console.error('Send email error:', err);
      Alert.alert('Email Error', err.message || 'Failed to send email. Ensure Resend API key is configured in app_secrets.');
    } finally {
      setSendingEmail(false);
    }
  }, [refetch]);

  // ── Format date ──
  const fmtDate = (iso: string | null) => {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (iso: string | null) => {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // ── Days remaining ──
  const daysRemaining = (until: string) => {
    const diff = Math.ceil((new Date(until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // ── Scope keys ──
  const scopeKeys = Object.keys(SCOPE_LABELS);

  // FieldRow moved outside component to prevent TextInput focus loss

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.content}>

          {/* Page Header */}
          <View style={[s.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.iconCircle, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Shield size={28} color="#8B5CF6" />
            </View>
            <Text style={[s.pageTitle, { color: colors.text }]}>Auditor Portal</Text>
            <Text style={[s.pageSub, { color: colors.textSecondary }]}>
              Create secure, time-limited access for external auditors
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Active', val: stats.active, c: '#10B981' },
              { label: 'Expired', val: stats.expired, c: '#F59E0B' },
              { label: 'Revoked', val: stats.revoked, c: '#EF4444' },
              { label: 'Views', val: stats.totalAccess, c: '#3B82F6' },
            ].map(st => (
              <View key={st.label} style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.statVal, { color: st.c }]}>{st.val}</Text>
                <Text style={[s.statLbl, { color: colors.textSecondary }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Create button */}
          <Pressable
            style={[s.createBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={() => { resetForm(); setShowCreateModal(true); }}
          >
            <Plus size={20} color="#FFF" />
            <Text style={s.createBtnText}>New Audit Session</Text>
          </Pressable>

          {/* Sessions list */}
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : sessions.length === 0 ? (
            <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Shield size={48} color={colors.textTertiary} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No audit sessions created yet</Text>
              <Text style={[s.emptyHint, { color: colors.textTertiary }]}>
                Create a session to generate a secure portal link for your auditor
              </Text>
            </View>
          ) : (
            sessions.map(session => {
              const cfg = STATUS_CONFIG[session.status];
              const Icon = cfg.icon;
              const days = daysRemaining(session.valid_until);
              return (
                <Pressable
                  key={session.id}
                  style={[s.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => openDetail(session)}
                >
                  <View style={s.sessionRow}>
                    <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.sessionName, { color: colors.text }]}>{session.session_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={[s.typeBadge, { backgroundColor: '#8B5CF6' + '15' }]}>
                          <Text style={[s.typeBadgeText, { color: '#8B5CF6' }]}>{AUDIT_TYPE_LABELS[session.audit_type]}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: cfg.color + '15' }]}>
                          <Icon size={12} color={cfg.color} />
                          <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.textTertiary} />
                  </View>
                  <View style={[s.sessionFoot, { borderTopColor: colors.border }]}>
                    <View style={s.sessionFootItem}>
                      <User size={12} color={colors.textTertiary} />
                      <Text style={[s.sessionFootText, { color: colors.textTertiary }]}>{session.auditor_name || '\u2014'}</Text>
                    </View>
                    <View style={s.sessionFootItem}>
                      <Building size={12} color={colors.textTertiary} />
                      <Text style={[s.sessionFootText, { color: colors.textTertiary }]}>{session.certification_body || '\u2014'}</Text>
                    </View>
                    <View style={s.sessionFootItem}>
                      <Activity size={12} color={colors.textTertiary} />
                      <Text style={[s.sessionFootText, { color: colors.textTertiary }]}>{session.access_count} views</Text>
                    </View>
                    {session.status === 'active' && (
                      <View style={s.sessionFootItem}>
                        <Clock size={12} color={days <= 7 ? '#EF4444' : colors.textTertiary} />
                        <Text style={[s.sessionFootText, { color: days <= 7 ? '#EF4444' : colors.textTertiary }]}>
                          {days}d left
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===== CREATE MODAL ===== */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>New Audit Session</Text>
            <Pressable onPress={handleCreate} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator size="small" color="#8B5CF6" />
                : <Text style={[s.saveBtn, { color: '#8B5CF6' }]}>Create</Text>
              }
            </Pressable>
          </View>
          <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">

            {/* Session Info */}
            <Text style={[s.sectionTitle, { color: colors.text }]}>Session Information</Text>

            <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Session Name *</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="e.g. SQF Ed10 Pre-Audit 2027"
                placeholderTextColor={colors.textTertiary}
                value={form.session_name}
                onChangeText={t => updateForm('session_name', t)}
              />
            </View>

            <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Audit Type *</Text>
              <View style={s.chipRow}>
                {AUDIT_TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    style={[s.chip, { borderColor: form.audit_type === t.value ? '#8B5CF6' : colors.border },
                      form.audit_type === t.value && { backgroundColor: '#8B5CF6' + '15' }]}
                    onPress={() => updateForm('audit_type', t.value)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: form.audit_type === t.value ? '600' : '400',
                      color: form.audit_type === t.value ? '#8B5CF6' : colors.text }}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Certification Body *</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="e.g. FSNS, SCS Global, PJRFSI"
                placeholderTextColor={colors.textTertiary}
                value={form.certification_body}
                onChangeText={t => updateForm('certification_body', t)}
              />
            </View>

            {/* Auditor Info */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Auditor Information</Text>

            <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Auditor Name *</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="Lead auditor full name"
                placeholderTextColor={colors.textTertiary}
                value={form.auditor_name}
                onChangeText={t => updateForm('auditor_name', t)}
              />
            </View>

            <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Auditor Email *</Text>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                placeholder="auditor@certbody.com"
                placeholderTextColor={colors.textTertiary}
                value={form.auditor_email}
                onChangeText={t => updateForm('auditor_email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Date Range */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Access Window</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Valid From (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="2026-03-01"
                    placeholderTextColor={colors.textTertiary}
                    value={form.valid_from}
                    onChangeText={t => updateForm('valid_from', t)}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.fieldRow}><Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Valid Until (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    placeholder="2026-04-01"
                    placeholderTextColor={colors.textTertiary}
                    value={form.valid_until}
                    onChangeText={t => updateForm('valid_until', t)}
                  />
                </View>
              </View>
            </View>

            {/* Scope */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Module Access Scope</Text>
            <Text style={[s.sectionHint, { color: colors.textTertiary }]}>
              Select which modules the auditor can view in the portal
            </Text>

            {scopeKeys.map(key => (
              <View key={key} style={[s.scopeRow, { borderBottomColor: colors.border }]}>
                <Text style={[s.scopeLabel, { color: colors.text }]}>{SCOPE_LABELS[key]}</Text>
                <Switch
                  value={(form as any)[key]}
                  onValueChange={v => updateForm(key, v)}
                  trackColor={{ false: colors.border, true: '#8B5CF6' + '80' }}
                  thumbColor={(form as any)[key] ? '#8B5CF6' : '#CCC'}
                />
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== TOKEN REVEAL MODAL ===== */}
      <Modal visible={showTokenModal} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={[s.tokenCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.tokenIconWrap, { backgroundColor: '#10B981' + '15' }]}>
              <CheckCircle size={32} color="#10B981" />
            </View>
            <Text style={[s.tokenTitle, { color: colors.text }]}>Audit Session Created</Text>
            <Text style={[s.tokenHint, { color: colors.textSecondary }]}>
              Copy the link below and send it to your auditor. This token is shown only once.
            </Text>

            <View style={[s.tokenBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Link2 size={16} color="#8B5CF6" />
              <Text style={[s.tokenText, { color: colors.text }]} numberOfLines={2} selectable>
                {tokenVisible ? getPortalUrl(createdToken) : '••••••••••••••••••••••••••••'}
              </Text>
              <Pressable onPress={() => setTokenVisible(!tokenVisible)}>
                {tokenVisible ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <Pressable
                style={[s.tokenBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => copyLink(createdToken)}
              >
                <Copy size={16} color="#FFF" />
                <Text style={s.tokenBtnText}>Copy Link</Text>
              </Pressable>
              {form.auditor_email || createdSessionId ? (
                <Pressable
                  style={[s.tokenBtn, { backgroundColor: '#10B981', opacity: sendingEmail ? 0.6 : 1 }]}
                  onPress={() => {
                    if (createdSessionId) sendEmailToAuditor(createdSessionId);
                  }}
                  disabled={sendingEmail}
                >
                  {sendingEmail
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Send size={16} color="#FFF" />}
                  <Text style={s.tokenBtnText}>{emailSent ? 'Sent ✓' : 'Send Email'}</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[s.tokenBtn, { backgroundColor: colors.border }]}
                onPress={() => { setShowTokenModal(false); setCreatedToken(''); setCreatedSessionId(''); setTokenVisible(false); setEmailSent(false); }}
              >
                <Text style={[s.tokenBtnText, { color: colors.text }]}>Done</Text>
              </Pressable>
            </View>

            <View style={[s.tokenWarning, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <AlertTriangle size={14} color="#92400E" />
              <Text style={{ color: '#92400E', fontSize: 12, flex: 1, marginLeft: 8 }}>
                This token grants read-only access to your documents. Store it securely and only share with authorized auditors.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== DETAIL MODAL ===== */}
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>Session Details</Text>
            <View style={{ width: 40 }} />
          </View>
          {selectedSession && (
            <ScrollView style={s.modalContent}>
              {/* Status banner */}
              {(() => {
                const cfg = STATUS_CONFIG[selectedSession.status];
                return (
                  <View style={[s.detailBanner, { backgroundColor: cfg.color + '10', borderColor: cfg.color + '40' }]}>
                    <cfg.icon size={16} color={cfg.color} />
                    <Text style={{ color: cfg.color, fontWeight: '600', fontSize: 14, marginLeft: 8 }}>{cfg.label}</Text>
                    {selectedSession.status === 'active' && (
                      <Text style={{ color: cfg.color, fontSize: 12, marginLeft: 'auto' }}>
                        {daysRemaining(selectedSession.valid_until)} days remaining
                      </Text>
                    )}
                  </View>
                );
              })()}

              {/* Info card */}
              <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.detailCardTitle, { color: colors.text }]}>{selectedSession.session_name}</Text>

                <View style={s.detailInfoRow}>
                  <Globe size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Type</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{AUDIT_TYPE_LABELS[selectedSession.audit_type]}</Text>
                </View>
                <View style={s.detailInfoRow}>
                  <Building size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>CB</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{selectedSession.certification_body || '\u2014'}</Text>
                </View>
                <View style={s.detailInfoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Auditor</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{selectedSession.auditor_name || '\u2014'}</Text>
                </View>
                <View style={s.detailInfoRow}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{selectedSession.auditor_email || '\u2014'}</Text>
                </View>
                <View style={s.detailInfoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Window</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>
                    {fmtDate(selectedSession.valid_from)} \u2014 {fmtDate(selectedSession.valid_until)}
                  </Text>
                </View>
                <View style={s.detailInfoRow}>
                  <Activity size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Accesses</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{selectedSession.access_count} views</Text>
                </View>
                <View style={s.detailInfoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={[s.detailInfoLabel, { color: colors.textSecondary }]}>Last Seen</Text>
                  <Text style={[s.detailInfoValue, { color: colors.text }]}>{fmtDateTime(selectedSession.last_accessed_at)}</Text>
                </View>
              </View>

              {/* Scope */}
              <Text style={[s.sectionTitle, { color: colors.text }]}>Module Access</Text>
              <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {scopeKeys.map(key => {
                  const enabled = (selectedSession as any)[key];
                  return (
                    <View key={key} style={[s.scopeDetailRow, { borderBottomColor: colors.border }]}>
                      {enabled
                        ? <CheckCircle size={14} color="#10B981" />
                        : <XCircle size={14} color={colors.textTertiary} />
                      }
                      <Text style={[s.scopeDetailLabel, { color: enabled ? colors.text : colors.textTertiary }]}>
                        {SCOPE_LABELS[key]}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Access Token & Actions */}
              {selectedSession.status === 'active' && (
                <>
                  <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Access Token</Text>
                  <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border }}>
                        <Text selectable style={{ fontSize: 12, fontFamily: 'monospace', color: colors.text }}>
                          {detailTokenVisible ? selectedSession.access_token : '•'.repeat(32)}
                        </Text>
                      </View>
                      <Pressable onPress={() => setDetailTokenVisible(!detailTokenVisible)}>
                        {detailTokenVisible
                          ? <EyeOff size={18} color={colors.textSecondary} />
                          : <Eye size={18} color={colors.textSecondary} />}
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        style={[s.actionBtn, { backgroundColor: '#6C5CE7', flex: 1 }]}
                        onPress={() => copyToken(selectedSession.access_token)}
                      >
                        <Copy size={14} color="#FFF" />
                        <Text style={s.actionBtnText}>Copy Token</Text>
                      </Pressable>
                      <Pressable
                        style={[s.actionBtn, { backgroundColor: '#8B5CF6', flex: 1 }]}
                        onPress={() => copyLink(selectedSession.access_token)}
                      >
                        <Link2 size={14} color="#FFF" />
                        <Text style={s.actionBtnText}>Copy Link</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Send to Auditor</Text>
                  <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Mail size={14} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
                        {selectedSession.auditor_email || 'No email on file'}
                      </Text>
                    </View>

                    {selectedSession.email_sent_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                        <CheckCircle size={12} color="#065F46" />
                        <Text style={{ fontSize: 12, color: '#065F46' }}>
                          Sent {fmtDateTime(selectedSession.email_sent_at)}
                          {(selectedSession.email_sent_count || 0) > 1 ? ` (${selectedSession.email_sent_count}×)` : ''}
                        </Text>
                      </View>
                    )}

                    <Pressable
                      style={[s.actionBtn, {
                        backgroundColor: selectedSession.auditor_email ? '#10B981' : colors.border,
                        opacity: sendingEmail ? 0.6 : 1,
                      }]}
                      onPress={() => {
                        if (!selectedSession.auditor_email) {
                          Alert.alert('No Email', 'This session has no auditor email address.');
                          return;
                        }
                        Alert.alert(
                          'Send Portal Access',
                          `Send access token and portal link to ${selectedSession.auditor_email}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Send Email', onPress: () => sendEmailToAuditor(selectedSession.id) },
                          ]
                        );
                      }}
                      disabled={sendingEmail || !selectedSession.auditor_email}
                    >
                      {sendingEmail
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <Send size={14} color={selectedSession.auditor_email ? '#FFF' : colors.textTertiary} />}
                      <Text style={[s.actionBtnText, { color: selectedSession.auditor_email ? '#FFF' : colors.textTertiary }]}>
                        {sendingEmail ? 'Sending...' : selectedSession.email_sent_at ? 'Resend Email' : 'Send Email to Auditor'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <Pressable
                      style={[s.actionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => { setRevokeReason(''); setShowRevokeModal(true); }}
                    >
                      <XCircle size={16} color="#FFF" />
                      <Text style={s.actionBtnText}>Revoke Access</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Revoke info */}
              {selectedSession.status === 'revoked' && (
                <View style={[s.detailBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginTop: 12 }]}>
                  <Lock size={14} color="#EF4444" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13 }}>Revoked by {selectedSession.revoked_by}</Text>
                    <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 2 }}>{selectedSession.revoke_reason}</Text>
                    <Text style={{ color: '#B91C1C', fontSize: 11, marginTop: 2 }}>{fmtDateTime(selectedSession.revoked_at)}</Text>
                  </View>
                </View>
              )}

              {/* Access Log */}
              <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Access Log</Text>
              {loadingLog ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
              ) : accessLog.length === 0 ? (
                <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]}>
                  <Eye size={24} color={colors.textTertiary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>No access recorded yet</Text>
                </View>
              ) : (
                <View style={[s.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {accessLog.slice(0, 50).map((entry, i) => (
                    <View key={entry.id} style={[s.logRow, i < accessLog.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[s.logDot, { backgroundColor: '#8B5CF6' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.logModule, { color: colors.text }]}>{entry.module}</Text>
                        {entry.resource_name && (
                          <Text style={[s.logResource, { color: colors.textSecondary }]}>{entry.resource_name}</Text>
                        )}
                      </View>
                      <Text style={[s.logTime, { color: colors.textTertiary }]}>{fmtDateTime(entry.accessed_at)}</Text>
                    </View>
                  ))}
                  {accessLog.length > 50 && (
                    <Text style={{ textAlign: 'center', color: colors.textTertiary, fontSize: 12, paddingVertical: 8 }}>
                      Showing 50 of {accessLog.length} entries
                    </Text>
                  )}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ===== REVOKE CONFIRMATION MODAL ===== */}
      <Modal visible={showRevokeModal} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={[s.tokenCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.tokenIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={32} color="#EF4444" />
            </View>
            <Text style={[s.tokenTitle, { color: colors.text }]}>Revoke Access?</Text>
            <Text style={[s.tokenHint, { color: colors.textSecondary }]}>
              The auditor will immediately lose access to the portal. This cannot be undone.
            </Text>
            <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>Reason *</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Audit completed, audit cancelled, security concern"
              placeholderTextColor={colors.textTertiary}
              value={revokeReason}
              onChangeText={setRevokeReason}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                style={[s.tokenBtn, { backgroundColor: colors.border, flex: 1 }]}
                onPress={() => setShowRevokeModal(false)}
              >
                <Text style={[s.tokenBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.tokenBtn, { backgroundColor: '#EF4444', flex: 1 }]}
                onPress={handleRevoke}
              >
                <XCircle size={16} color="#FFF" />
                <Text style={s.tokenBtnText}>Revoke</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 14, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 15, marginTop: 12, fontWeight: '600' },
  emptyHint: { fontSize: 13, marginTop: 4, textAlign: 'center' },

  // Session card
  sessionCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  sessionName: { fontSize: 15, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  sessionFoot: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, gap: 16 },
  sessionFootItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionFootText: { fontSize: 12 },

  // Modal
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionHint: { fontSize: 13, marginBottom: 12, marginTop: -4 },

  // Fields
  fieldRow: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },

  // Scope toggles
  scopeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  scopeLabel: { fontSize: 14 },

  // Token modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  tokenCard: { borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center' },
  tokenIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tokenTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  tokenHint: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  tokenBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, width: '100%' },
  tokenText: { fontSize: 13, flex: 1 },
  tokenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  tokenBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  tokenWarning: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16, width: '100%' },

  // Detail modal
  detailBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  detailCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  detailCardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  detailInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  detailInfoLabel: { fontSize: 13, width: 60 },
  detailInfoValue: { fontSize: 14, fontWeight: '500', flex: 1 },
  scopeDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  scopeDetailLabel: { fontSize: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Access log
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  logDot: { width: 6, height: 6, borderRadius: 3 },
  logModule: { fontSize: 13, fontWeight: '600' },
  logResource: { fontSize: 12, marginTop: 1 },
  logTime: { fontSize: 11 },
});
