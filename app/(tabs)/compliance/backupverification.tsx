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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  HardDrive,
  Cloud,
  Lock,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Server,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PinSignatureCapture, isSignatureVerified } from '@/components/PinSignatureCapture';
import type { SignatureVerification } from '@/hooks/usePinSignature';
import * as Haptics from 'expo-haptics';

// ── Types ──

interface BackupLog {
  id: string;
  organization_id: string;
  backup_date: string;
  backup_type: string;
  backup_scope: string;
  description: string;
  tables_included: string | null;
  record_count: number | null;
  backup_size_mb: number | null;
  destination: string;
  destination_region: string | null;
  retention_days: number | null;
  encrypted: boolean;
  encryption_method: string | null;
  verification_method: string;
  verification_date: string;
  verification_result: string;
  verification_details: string | null;
  data_loss_detected: boolean;
  corruption_detected: boolean;
  corrective_action: string | null;
  corrective_action_date: string | null;
  performed_by: string;
  verified_by: string;
  verifier_initials: string | null;
  verifier_department_code: string | null;
  verifier_signature_stamp: string | null;
  verifier_signed_at: string | null;
  verifier_pin_verified: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Dropdown options ──

const BACKUP_TYPES = [
  { value: 'automated', label: 'Automated (Daily)' },
  { value: 'manual', label: 'Manual' },
  { value: 'point_in_time', label: 'Point-in-Time Recovery' },
  { value: 'migration', label: 'Pre-Migration' },
  { value: 'pre_deployment', label: 'Pre-Deployment' },
];

const BACKUP_SCOPES = [
  { value: 'full_database', label: 'Full Database' },
  { value: 'incremental', label: 'Incremental' },
  { value: 'specific_tables', label: 'Specific Tables' },
  { value: 'file_storage', label: 'File Storage' },
  { value: 'full_system', label: 'Full System' },
];

const VERIFICATION_METHODS = [
  { value: 'restore_test', label: 'Restore Test' },
  { value: 'checksum_validation', label: 'Checksum Validation' },
  { value: 'integrity_check', label: 'Integrity Check' },
  { value: 'row_count_comparison', label: 'Row Count Comparison' },
  { value: 'spot_check', label: 'Spot Check' },
  { value: 'automated_monitoring', label: 'Automated Monitoring' },
];

const VERIFICATION_RESULTS = [
  { value: 'pass', label: 'Pass', color: '#10B981' },
  { value: 'fail', label: 'Fail', color: '#EF4444' },
  { value: 'partial', label: 'Partial', color: '#F59E0B' },
  { value: 'pending', label: 'Pending', color: '#6366F1' },
];

const RESULT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pass: { label: 'PASS', color: '#10B981', icon: CheckCircle },
  fail: { label: 'FAIL', color: '#EF4444', icon: XCircle },
  partial: { label: 'PARTIAL', color: '#F59E0B', icon: AlertTriangle },
  pending: { label: 'PENDING', color: '#6366F1', icon: Clock },
};

// ── Component ──

export default function BackupVerificationScreen() {
  const { colors } = useTheme();
  const { organizationId } = useOrganization();
  const { user } = useUser();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureVerification, setSignatureVerification] = useState<SignatureVerification | null>(null);

  // ── Form state ──
  const emptyForm = {
    backup_date: new Date().toISOString().split('T')[0],
    backup_type: 'automated',
    backup_scope: 'full_database',
    description: '',
    tables_included: '',
    record_count: '',
    backup_size_mb: '',
    destination: 'Supabase (AWS us-east-1)',
    destination_region: 'us-east-1',
    retention_days: '30',
    encrypted: true,
    encryption_method: 'AES-256',
    verification_method: 'automated_monitoring',
    verification_date: new Date().toISOString().split('T')[0],
    verification_result: 'pass',
    verification_details: '',
    data_loss_detected: false,
    corruption_detected: false,
    corrective_action: '',
    performed_by: user?.name || '',
    verified_by: user?.name || '',
    notes: '',
  };

  const [form, setForm] = useState(emptyForm);
  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Fetch logs ──
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['backup_verification_log', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('backup_verification_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('backup_date', { ascending: false });
      if (error) throw error;
      return (data || []) as BackupLog[];
    },
    enabled: !!organizationId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Stats ──
  const stats = useMemo(() => ({
    total: logs.length,
    pass: logs.filter(l => l.verification_result === 'pass').length,
    fail: logs.filter(l => l.verification_result === 'fail').length,
    lastBackup: logs[0]?.backup_date || null,
  }), [logs]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    // Validate all fields
    const missing: string[] = [];
    if (!form.backup_date.trim()) missing.push('Backup Date');
    if (!form.description.trim()) missing.push('Description');
    if (!form.destination.trim()) missing.push('Destination');
    if (!form.destination_region.trim()) missing.push('Destination Region');
    if (!form.retention_days.trim()) missing.push('Retention Days');
    if (!form.encryption_method.trim()) missing.push('Encryption Method');
    if (!form.verification_date.trim()) missing.push('Verification Date');
    if (!form.verification_details.trim()) missing.push('Verification Details');
    if (!form.performed_by.trim()) missing.push('Performed By');
    if (!form.verified_by.trim()) missing.push('Verified By');
    if (!form.tables_included.trim()) missing.push('Tables Included');
    if (!form.record_count.trim()) missing.push('Record Count');
    if (!form.backup_size_mb.trim()) missing.push('Backup Size (MB)');
    if (!form.notes.trim()) missing.push('Notes');
    if (form.verification_result === 'fail' && !form.corrective_action.trim()) missing.push('Corrective Action (required for failures)');

    // PPN signature required
    if (!signatureVerification || !isSignatureVerified(signatureVerification)) {
      missing.push('Verifier PPN Signature');
    }

    if (missing.length > 0) {
      Alert.alert(
        'All Fields Required',
        `Every field must be filled in (use "N/A" if not applicable).\n\nMissing:\n• ${missing.join('\n• ')}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const row = {
        organization_id: organizationId,
        backup_date: new Date(form.backup_date).toISOString(),
        backup_type: form.backup_type,
        backup_scope: form.backup_scope,
        description: form.description.trim(),
        tables_included: form.tables_included.trim(),
        record_count: parseInt(form.record_count) || null,
        backup_size_mb: parseFloat(form.backup_size_mb) || null,
        destination: form.destination.trim(),
        destination_region: form.destination_region.trim(),
        retention_days: parseInt(form.retention_days) || 30,
        encrypted: form.encrypted,
        encryption_method: form.encryption_method.trim(),
        verification_method: form.verification_method,
        verification_date: new Date(form.verification_date).toISOString(),
        verification_result: form.verification_result,
        verification_details: form.verification_details.trim(),
        data_loss_detected: form.data_loss_detected,
        corruption_detected: form.corruption_detected,
        corrective_action: form.corrective_action.trim() || null,
        corrective_action_date: form.corrective_action.trim() ? new Date().toISOString() : null,
        performed_by: form.performed_by.trim(),
        performed_by_id: user?.id || null,
        verified_by: form.verified_by.trim(),
        verified_by_id: user?.id || null,
        verifier_initials: signatureVerification?.initials || null,
        verifier_department_code: signatureVerification?.departmentCode || null,
        verifier_signature_stamp: signatureVerification?.stamp || null,
        verifier_signed_at: signatureVerification?.signedAt || null,
        verifier_pin_verified: signatureVerification?.verified || false,
        status: form.verification_result === 'fail' ? 'failed' : 'verified',
        notes: form.notes.trim(),
      };

      const { error } = await supabase.from('backup_verification_log').insert(row);
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['backup_verification_log', organizationId] });
      setShowCreate(false);
      setForm(emptyForm);
      setSignatureVerification(null);
      Alert.alert('Saved', 'Backup verification logged successfully.');
    } catch (err: any) {
      console.error('[BackupLog] Submit error:', err);
      Alert.alert('Error', err?.message || 'Failed to save backup log');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, signatureVerification, organizationId, user, qc]);

  // ── Helpers ──
  const fmtDate = (iso: string | null) => {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (iso: string | null) => {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label} *</Text>
      {children}
    </View>
  );

  const ChipSelect = ({ options, value, onChange }: { options: { value: string; label: string; color?: string }[]; value: string; onChange: (v: string) => void }) => (
    <View style={s.chipRow}>
      {options.map(opt => (
        <Pressable
          key={opt.value}
          style={[s.chip, { borderColor: value === opt.value ? (opt.color || '#8B5CF6') : colors.border },
            value === opt.value && { backgroundColor: (opt.color || '#8B5CF6') + '15' }]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={{ fontSize: 13, fontWeight: value === opt.value ? '600' : '400',
            color: value === opt.value ? (opt.color || '#8B5CF6') : colors.text }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.content}>

          {/* Header */}
          <View style={[s.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.headerIcon, { backgroundColor: '#6366F1' + '15' }]}>
              <Database size={28} color="#6366F1" />
            </View>
            <Text style={[s.headerTitle, { color: colors.text }]}>Backup Verification Log</Text>
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>
              SQF 2.2.3.3 — Secure storage, prevent damage & deterioration
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: 'Total Backups', val: stats.total, c: '#6366F1' },
              { label: 'Passed', val: stats.pass, c: '#10B981' },
              { label: 'Failed', val: stats.fail, c: '#EF4444' },
            ].map(st => (
              <View key={st.label} style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.statVal, { color: st.c }]}>{st.val}</Text>
                <Text style={[s.statLbl, { color: colors.textSecondary }]}>{st.label}</Text>
              </View>
            ))}
          </View>

          {stats.lastBackup && (
            <View style={[s.lastBackup, { backgroundColor: '#10B981' + '10', borderColor: '#10B981' + '30' }]}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={{ color: '#065F46', fontSize: 13, flex: 1, marginLeft: 8 }}>
                Last verified backup: {fmtDate(stats.lastBackup)}
              </Text>
            </View>
          )}

          {/* Create button */}
          <Pressable
            style={[s.createBtn, { backgroundColor: '#6366F1' }]}
            onPress={() => { setForm({ ...emptyForm, performed_by: user?.name || '', verified_by: user?.name || '' }); setSignatureVerification(null); setShowCreate(true); }}
          >
            <Plus size={20} color="#FFF" />
            <Text style={s.createBtnText}>Log Backup Verification</Text>
          </Pressable>

          {/* List */}
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : logs.length === 0 ? (
            <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Database size={48} color={colors.textTertiary} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No backup verifications logged yet</Text>
              <Text style={[s.emptyHint, { color: colors.textTertiary }]}>
                Log your first backup verification to demonstrate SQF data security compliance
              </Text>
            </View>
          ) : (
            logs.map(log => {
              const cfg = RESULT_CONFIG[log.verification_result] || RESULT_CONFIG.pending;
              const Icon = cfg.icon;
              const isExpanded = expandedId === log.id;

              return (
                <Pressable
                  key={log.id}
                  style={[s.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <View style={s.logRow}>
                    <View style={[s.resultDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.logDesc, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                        {log.description}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.textTertiary }}>{fmtDate(log.backup_date)}</Text>
                        <View style={[s.typeBadge, { backgroundColor: '#6366F1' + '15' }]}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: '#6366F1' }}>
                            {BACKUP_TYPES.find(t => t.value === log.backup_type)?.label || log.backup_type}
                          </Text>
                        </View>
                        <View style={[s.resultBadge, { backgroundColor: cfg.color + '15' }]}>
                          <Icon size={10} color={cfg.color} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: cfg.color, marginLeft: 3 }}>{cfg.label}</Text>
                        </View>
                      </View>
                    </View>
                    {isExpanded ? <ChevronUp size={18} color={colors.textTertiary} /> : <ChevronDown size={18} color={colors.textTertiary} />}
                  </View>

                  {isExpanded && (
                    <View style={[s.logExpanded, { borderTopColor: colors.border }]}>
                      {[
                        ['Backup Type', BACKUP_TYPES.find(t => t.value === log.backup_type)?.label || log.backup_type],
                        ['Scope', BACKUP_SCOPES.find(t => t.value === log.backup_scope)?.label || log.backup_scope],
                        ['Tables', log.tables_included],
                        ['Record Count', log.record_count?.toLocaleString()],
                        ['Size', log.backup_size_mb ? `${log.backup_size_mb} MB` : null],
                        ['Destination', log.destination],
                        ['Region', log.destination_region],
                        ['Retention', log.retention_days ? `${log.retention_days} days` : null],
                        ['Encrypted', log.encrypted ? `Yes (${log.encryption_method})` : 'No'],
                        ['Verification Method', VERIFICATION_METHODS.find(m => m.value === log.verification_method)?.label || log.verification_method],
                        ['Verification Date', fmtDateTime(log.verification_date)],
                        ['Verification Details', log.verification_details],
                        ['Data Loss', log.data_loss_detected ? 'YES — DETECTED' : 'None detected'],
                        ['Corruption', log.corruption_detected ? 'YES — DETECTED' : 'None detected'],
                        ['Corrective Action', log.corrective_action],
                        ['Performed By', log.performed_by],
                        ['Verified By', log.verified_by],
                        ['PPN Signature', log.verifier_signature_stamp],
                        ['Notes', log.notes],
                      ].filter(([_, val]) => val != null && val !== '').map(([label, val], i) => (
                        <View key={i} style={s.detailRow}>
                          <Text style={[s.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                          <Text style={[s.detailValue, { color: label === 'Data Loss' && log.data_loss_detected ? '#EF4444' : label === 'Corruption' && log.corruption_detected ? '#EF4444' : colors.text }]}>
                            {val}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ===== CREATE MODAL ===== */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCreate(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.text }]}>Log Backup Verification</Text>
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator size="small" color="#6366F1" />
                : <Text style={{ fontSize: 16, fontWeight: '600', color: '#6366F1' }}>Save</Text>
              }
            </Pressable>
          </View>
          <ScrollView style={s.modalContent} keyboardShouldPersistTaps="handled">

            {/* Backup Info */}
            <Text style={[s.sectionTitle, { color: colors.text }]}>Backup Information</Text>

            <FieldRow label="Backup Date (YYYY-MM-DD)">
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.backup_date}
                onChangeText={t => updateForm('backup_date', t)}
                placeholder="2026-02-21"
                placeholderTextColor={colors.textTertiary}
              />
            </FieldRow>

            <FieldRow label="Backup Type">
              <ChipSelect options={BACKUP_TYPES} value={form.backup_type} onChange={v => updateForm('backup_type', v)} />
            </FieldRow>

            <FieldRow label="Backup Scope">
              <ChipSelect options={BACKUP_SCOPES} value={form.backup_scope} onChange={v => updateForm('backup_scope', v)} />
            </FieldRow>

            <FieldRow label="Description">
              <TextInput
                style={[s.input, s.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.description}
                onChangeText={t => updateForm('description', t)}
                placeholder="e.g. Automated daily full database backup via Supabase"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </FieldRow>

            <FieldRow label="Tables Included">
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.tables_included}
                onChangeText={t => updateForm('tables_included', t)}
                placeholder="e.g. All public schema tables (47 tables)"
                placeholderTextColor={colors.textTertiary}
              />
            </FieldRow>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldRow label="Record Count">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.record_count}
                    onChangeText={t => updateForm('record_count', t)}
                    placeholder="e.g. 24500"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </FieldRow>
              </View>
              <View style={{ flex: 1 }}>
                <FieldRow label="Backup Size (MB)">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.backup_size_mb}
                    onChangeText={t => updateForm('backup_size_mb', t)}
                    placeholder="e.g. 256"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </FieldRow>
              </View>
            </View>

            {/* Destination */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Destination & Security</Text>

            <FieldRow label="Destination">
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.destination}
                onChangeText={t => updateForm('destination', t)}
                placeholder="e.g. Supabase (AWS us-east-1)"
                placeholderTextColor={colors.textTertiary}
              />
            </FieldRow>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldRow label="Region">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.destination_region}
                    onChangeText={t => updateForm('destination_region', t)}
                    placeholder="us-east-1"
                    placeholderTextColor={colors.textTertiary}
                  />
                </FieldRow>
              </View>
              <View style={{ flex: 1 }}>
                <FieldRow label="Retention (days)">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.retention_days}
                    onChangeText={t => updateForm('retention_days', t)}
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                </FieldRow>
              </View>
            </View>

            <FieldRow label="Encryption Method">
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.encryption_method}
                onChangeText={t => updateForm('encryption_method', t)}
                placeholder="AES-256"
                placeholderTextColor={colors.textTertiary}
              />
            </FieldRow>

            {/* Verification */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Verification</Text>

            <FieldRow label="Verification Method">
              <ChipSelect options={VERIFICATION_METHODS} value={form.verification_method} onChange={v => updateForm('verification_method', v)} />
            </FieldRow>

            <FieldRow label="Verification Date (YYYY-MM-DD)">
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.verification_date}
                onChangeText={t => updateForm('verification_date', t)}
                placeholder="2026-02-21"
                placeholderTextColor={colors.textTertiary}
              />
            </FieldRow>

            <FieldRow label="Result">
              <ChipSelect options={VERIFICATION_RESULTS} value={form.verification_result} onChange={v => updateForm('verification_result', v)} />
            </FieldRow>

            <FieldRow label="Verification Details">
              <TextInput
                style={[s.input, s.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.verification_details}
                onChangeText={t => updateForm('verification_details', t)}
                placeholder="e.g. Restored backup to staging environment, verified row counts match production across all 47 tables. No discrepancies found."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </FieldRow>

            {/* Integrity flags */}
            <View style={[s.flagRow, { borderColor: colors.border }]}>
              <Text style={[s.flagLabel, { color: colors.text }]}>Data Loss Detected?</Text>
              <ChipSelect
                options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes', color: '#EF4444' }]}
                value={form.data_loss_detected ? 'yes' : 'no'}
                onChange={v => updateForm('data_loss_detected', v === 'yes')}
              />
            </View>

            <View style={[s.flagRow, { borderColor: colors.border }]}>
              <Text style={[s.flagLabel, { color: colors.text }]}>Corruption Detected?</Text>
              <ChipSelect
                options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes', color: '#EF4444' }]}
                value={form.corruption_detected ? 'yes' : 'no'}
                onChange={v => updateForm('corruption_detected', v === 'yes')}
              />
            </View>

            {/* Corrective action (if fail) */}
            {(form.verification_result === 'fail' || form.data_loss_detected || form.corruption_detected) && (
              <FieldRow label="Corrective Action">
                <TextInput
                  style={[s.input, s.inputMulti, { color: colors.text, borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}
                  value={form.corrective_action}
                  onChangeText={t => updateForm('corrective_action', t)}
                  placeholder="Describe corrective action taken..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
              </FieldRow>
            )}

            {/* Personnel */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Personnel</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldRow label="Performed By">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.performed_by}
                    onChangeText={t => updateForm('performed_by', t)}
                    placeholder="Name"
                    placeholderTextColor={colors.textTertiary}
                  />
                </FieldRow>
              </View>
              <View style={{ flex: 1 }}>
                <FieldRow label="Verified By">
                  <TextInput
                    style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={form.verified_by}
                    onChangeText={t => updateForm('verified_by', t)}
                    placeholder="Name"
                    placeholderTextColor={colors.textTertiary}
                  />
                </FieldRow>
              </View>
            </View>

            {/* Notes */}
            <FieldRow label="Notes">
              <TextInput
                style={[s.input, s.inputMulti, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={form.notes}
                onChangeText={t => updateForm('notes', t)}
                placeholder="Additional notes (use N/A if not applicable)"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </FieldRow>

            {/* PPN Signature */}
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Verifier Signature</Text>
            <PinSignatureCapture
              onVerified={(verification) => setSignatureVerification(verification)}
              label="Verifier PPN Signature"
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
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
  header: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 13, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 11, marginTop: 2 },
  lastBackup: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, gap: 8, marginBottom: 16 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 15, marginTop: 12, fontWeight: '600' },
  emptyHint: { fontSize: 13, marginTop: 4, textAlign: 'center' },

  // Log card
  logCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  resultDot: { width: 10, height: 10, borderRadius: 5 },
  logDesc: { fontSize: 14, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  resultBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  logExpanded: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  detailRow: { flexDirection: 'row', paddingVertical: 5 },
  detailLabel: { fontSize: 12, fontWeight: '600', width: 130 },
  detailValue: { fontSize: 13, flex: 1 },

  // Modal
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  // Fields
  fieldRow: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  flagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, marginBottom: 10 },
  flagLabel: { fontSize: 14, fontWeight: '600' },
});
