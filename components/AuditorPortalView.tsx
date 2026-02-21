import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Shield,
  FileText,
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  Search as SearchIcon,
  Wrench,
  Package,
  Database,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle,
  ArrowLeft,
  Lock,
  Globe,
  Activity,
  RefreshCw,
  Truck,
  Microscope,
  Heart,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// ── Types ──

interface AuditSession {
  id: string;
  organization_id: string;
  session_name: string;
  audit_type: string;
  certification_body: string;
  auditor_name: string;
  auditor_email: string;
  access_token: string;
  valid_from: string;
  valid_until: string;
  status: string;
  access_count: number;
  last_accessed_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  scope_documents: boolean;
  scope_ncrs: boolean;
  scope_capas: boolean;
  scope_training: boolean;
  scope_internal_audits: boolean;
  scope_haccp: boolean;
  scope_supplier_approvals: boolean;
  scope_env_monitoring: boolean;
  scope_change_management: boolean;
  scope_food_safety_culture: boolean;
  scope_work_orders: boolean;
  scope_inventory: boolean;
  scope_security_controls: boolean;
  [key: string]: any;
}

interface ModuleDef {
  key: string;
  scope: string;
  label: string;
  sqf: string;
  icon: any;
  table: string;
  nameField: string;
  dateField: string;
  statusField: string;
}

// ── Module Definitions ──

const MODULE_DEFS: ModuleDef[] = [
  { key: 'documents', scope: 'scope_documents', label: 'Documents', sqf: 'SQF 2.2.2', icon: FileText, table: 'documents', nameField: 'name', dateField: 'created_at', statusField: 'status' },
  { key: 'ncrs', scope: 'scope_ncrs', label: 'NCRs', sqf: 'SQF 2.5.3', icon: AlertTriangle, table: 'ncr_records', nameField: 'description', dateField: 'created_at', statusField: 'status' },
  { key: 'capas', scope: 'scope_capas', label: 'CAPAs', sqf: 'SQF 2.5.4', icon: ClipboardList, table: 'capas', nameField: 'description', dateField: 'created_at', statusField: 'status' },
  { key: 'training', scope: 'scope_training', label: 'Training Records', sqf: 'SQF 2.1.1.6', icon: GraduationCap, table: 'employee_training_progress', nameField: 'course_name', dateField: 'created_at', statusField: 'status' },
  { key: 'internal_audits', scope: 'scope_internal_audits', label: 'Internal Audits', sqf: 'SQF 2.5.1', icon: SearchIcon, table: 'internal_audits', nameField: 'audit_name', dateField: 'created_at', statusField: 'status' },
  { key: 'haccp', scope: 'scope_haccp', label: 'HACCP Plans', sqf: 'SQF 2.4.3', icon: Shield, table: 'haccp_plans', nameField: 'plan_name', dateField: 'created_at', statusField: 'status' },
  { key: 'supplier_approvals', scope: 'scope_supplier_approvals', label: 'Supplier Approvals', sqf: 'SQF 2.3.2', icon: Truck, table: 'suppliers', nameField: 'name', dateField: 'created_at', statusField: 'status' },
  { key: 'env_monitoring', scope: 'scope_env_monitoring', label: 'Environmental Monitoring', sqf: 'SQF 11.2.8', icon: Microscope, table: 'env_monitoring_results', nameField: 'location', dateField: 'created_at', statusField: 'result' },
  { key: 'change_management', scope: 'scope_change_management', label: 'Change Management', sqf: 'SQF Ed10', icon: RefreshCw, table: 'change_requests', nameField: 'title', dateField: 'created_at', statusField: 'status' },
  { key: 'food_safety_culture', scope: 'scope_food_safety_culture', label: 'Food Safety Culture', sqf: 'SQF 2.1.3', icon: Heart, table: 'food_safety_culture', nameField: 'title', dateField: 'created_at', statusField: 'status' },
  { key: 'work_orders', scope: 'scope_work_orders', label: 'Work Orders', sqf: 'SQF 11.1.3', icon: Wrench, table: 'work_orders', nameField: 'title', dateField: 'created_at', statusField: 'status' },
  { key: 'inventory', scope: 'scope_inventory', label: 'Inventory', sqf: 'SQF 2.3', icon: Package, table: 'inventory_items', nameField: 'name', dateField: 'created_at', statusField: 'status' },
  { key: 'backup_verification', scope: 'scope_security_controls', label: 'Backup Verification', sqf: 'SQF 2.2.3.3', icon: Database, table: 'backup_verification_log', nameField: 'description', dateField: 'backup_date', statusField: 'verification_result' },
];

const HIDDEN_FIELDS = ['id', 'organization_id', 'created_by_id', 'performed_by_id', 'verified_by_id', 'verifier_pin_verified', 'pin', 'pin_hash', 'password', 'token', 'token_hash', 'access_token'];

const AUDIT_TYPE_LABELS: Record<string, string> = {
  sqf: 'SQF', brcgs: 'BRCGS', fssc: 'FSSC 22000', internal: 'Internal',
  regulatory: 'Regulatory', customer: 'Customer', other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#FEF3C7', text: '#92400E' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  pass: { bg: '#D1FAE5', text: '#065F46' },
  verified: { bg: '#D1FAE5', text: '#065F46' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  fail: { bg: '#FEE2E2', text: '#991B1B' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
  overdue: { bg: '#FEE2E2', text: '#991B1B' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#FEE2E2', text: '#991B1B' },
};

// ── Helpers ──

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtFieldName(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) return fmtDateTime(val);
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

// ── Props ──

interface AuditorPortalViewProps {
  onExit: () => void;
  initialToken?: string;
}

// ── Component ──

export default function AuditorPortalView({ onExit, initialToken }: AuditorPortalViewProps) {
  const [phase, setPhase] = useState<'token' | 'validating' | 'error' | 'portal'>('token');
  const [token, setToken] = useState(initialToken || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [session, setSession] = useState<AuditSession | null>(null);

  // Portal state
  const [activeView, setActiveView] = useState<'overview' | 'module' | 'security'>('overview');
  const [activeModule, setActiveModule] = useState<ModuleDef | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Auto-validate if initial token provided
  useEffect(() => {
    if (initialToken) {
      validateToken(initialToken);
    }
  }, [initialToken]);

  // ── Token Validation ──

  const validateToken = useCallback(async (t: string) => {
    setPhase('validating');
    try {
      const { data, error } = await supabase
        .from('audit_sessions')
        .select('*')
        .eq('access_token', t.trim())
        .single();

      if (error || !data) {
        setErrorTitle('Invalid Token');
        setErrorMsg('This access token is not recognized. Please check the link provided to you.');
        setPhase('error');
        return;
      }

      if (data.status === 'revoked') {
        setErrorTitle('Access Revoked');
        setErrorMsg(`This audit session was revoked on ${fmtDate(data.revoked_at)}. Reason: ${data.revoke_reason || 'Not specified'}.`);
        setPhase('error');
        return;
      }

      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = new Date(data.valid_until);

      if (now < validFrom) {
        setErrorTitle('Not Yet Active');
        setErrorMsg(`This audit session begins on ${fmtDate(data.valid_from)}. Please return after that date.`);
        setPhase('error');
        return;
      }

      if (now > validUntil) {
        await supabase.from('audit_sessions').update({ status: 'expired' }).eq('id', data.id);
        setErrorTitle('Session Expired');
        setErrorMsg(`This audit session expired on ${fmtDate(data.valid_until)}. Contact the facility to request a new session.`);
        setPhase('error');
        return;
      }

      // Valid — update access tracking
      await supabase.from('audit_sessions').update({
        last_accessed_at: new Date().toISOString(),
        access_count: (data.access_count || 0) + 1,
      }).eq('id', data.id);

      // Log access
      await logAccess(data, 'portal', 'login', null, null, 'Portal accessed');

      setSession(data);
      setPhase('portal');
    } catch (err: any) {
      setErrorTitle('Connection Error');
      setErrorMsg('Unable to validate token. Please check your connection and try again.');
      setPhase('error');
    }
  }, []);

  // ── Access Logging ──

  const logAccess = useCallback(async (sess: AuditSession, module: string, action: string, resourceId: string | null, resourceType: string | null, resourceName: string | null) => {
    try {
      await supabase.from('audit_access_log').insert({
        session_id: sess.id,
        organization_id: sess.organization_id,
        module,
        action,
        resource_id: resourceId,
        resource_type: resourceType,
        resource_name: resourceName,
      });
    } catch (e) { console.warn('[AuditPortal] Log error:', e); }
  }, []);

  // ── Enabled Modules ──

  const enabledModules = useMemo(() => {
    if (!session) return [];
    return MODULE_DEFS.filter(m => session[m.scope] === true);
  }, [session]);

  const daysRemaining = useMemo(() => {
    if (!session) return 0;
    const until = new Date(session.valid_until);
    return Math.max(0, Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [session]);

  // ── Load Module Records ──

  const loadModule = useCallback(async (mod: ModuleDef) => {
    if (!session) return;
    setActiveModule(mod);
    setActiveView('module');
    setLoadingRecords(true);
    setSearchQuery('');
    setExpandedId(null);

    await logAccess(session, mod.key, 'view_module', null, mod.table, mod.label);

    try {
      const { data, error } = await supabase
        .from(mod.table)
        .select('*')
        .eq('organization_id', session.organization_id)
        .order(mod.dateField, { ascending: false })
        .limit(500);

      if (error) throw error;
      setRecords(data || []);
    } catch (e) {
      console.warn('[AuditPortal] Fetch error:', e);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [session, logAccess]);

  // ── Filtered Records ──

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    return records.filter(r => JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [records, searchQuery]);

  // ── Toggle Record & Log ──

  const toggleRecord = useCallback(async (index: number, record: any) => {
    if (expandedId === index) {
      setExpandedId(null);
    } else {
      setExpandedId(index);
      if (session && activeModule) {
        const name = record[activeModule.nameField] || record.title || record.name || 'Record';
        await logAccess(session, activeModule.key, 'view_record', record.id, activeModule.table, name);
      }
    }
  }, [expandedId, session, activeModule, logAccess]);

  // ============================================================
  // RENDER — TOKEN ENTRY
  // ============================================================

  if (phase === 'token') {
    return (
      <View style={s.fullscreen}>
        <View style={s.card}>
          <Lock size={40} color="#6C5CE7" />
          <Text style={s.cardTitle}>Auditor Portal</Text>
          <Text style={s.cardSub}>Enter the access token provided to you by the facility administrator.</Text>
          <TextInput
            style={s.tokenInput}
            value={token}
            onChangeText={setToken}
            placeholder="Paste access token..."
            placeholderTextColor="#9BA3B0"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={s.tokenBtn} onPress={() => { if (token.trim()) validateToken(token.trim()); }}>
            <Text style={s.tokenBtnText}>Verify Token</Text>
          </Pressable>
          <Pressable style={s.backLink} onPress={onExit}>
            <ArrowLeft size={16} color="#5F6673" />
            <Text style={s.backLinkText}>Back to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — VALIDATING
  // ============================================================

  if (phase === 'validating') {
    return (
      <View style={s.fullscreen}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={[s.cardSub, { marginTop: 16 }]}>Validating access token...</Text>
      </View>
    );
  }

  // ============================================================
  // RENDER — ERROR
  // ============================================================

  if (phase === 'error') {
    return (
      <View style={s.fullscreen}>
        <View style={s.card}>
          <XCircle size={48} color="#EF4444" />
          <Text style={s.cardTitle}>{errorTitle}</Text>
          <Text style={s.cardSub}>{errorMsg}</Text>
          <Pressable style={[s.tokenBtn, { marginTop: 16 }]} onPress={() => { setPhase('token'); setToken(''); }}>
            <Text style={s.tokenBtnText}>Try Another Token</Text>
          </Pressable>
          <Pressable style={s.backLink} onPress={onExit}>
            <ArrowLeft size={16} color="#5F6673" />
            <Text style={s.backLinkText}>Back to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER — PORTAL
  // ============================================================

  if (!session) return null;

  return (
    <View style={s.portal}>
      {/* ── Header ── */}
      <View style={s.portalHeader}>
        <View style={s.portalHeaderLeft}>
          <Shield size={20} color="#6C5CE7" />
          <Text style={s.portalBrand}>TulKenz OPS</Text>
          <View style={s.readOnlyBadge}>
            <Eye size={10} color="#6C5CE7" />
            <Text style={s.readOnlyText}>READ ONLY</Text>
          </View>
        </View>
        <View style={s.sessionBadge}>
          <View style={s.activeDot} />
          <Text style={s.sessionBadgeText}>{daysRemaining}d left</Text>
        </View>
      </View>

      {/* ── Session Info Bar ── */}
      <View style={s.sessionBar}>
        <Text style={s.sessionBarText}>
          <Text style={{ fontWeight: '600' }}>{session.auditor_name}</Text> · {session.certification_body} · {AUDIT_TYPE_LABELS[session.audit_type] || session.audit_type} · {fmtDate(session.valid_from)} — {fmtDate(session.valid_until)}
        </Text>
      </View>

      {/* ── Nav Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.navBar} contentContainerStyle={s.navBarContent}>
        <Pressable
          style={[s.navTab, activeView === 'overview' && s.navTabActive]}
          onPress={() => { setActiveView('overview'); setActiveModule(null); }}
        >
          <LayoutDashboard size={14} color={activeView === 'overview' ? '#6C5CE7' : '#5F6673'} />
          <Text style={[s.navTabText, activeView === 'overview' && s.navTabTextActive]}>Overview</Text>
        </Pressable>
        {enabledModules.map(m => {
          const Icon = m.icon;
          const isActive = activeView === 'module' && activeModule?.key === m.key;
          return (
            <Pressable
              key={m.key}
              style={[s.navTab, isActive && s.navTabActive]}
              onPress={() => loadModule(m)}
            >
              <Icon size={14} color={isActive ? '#6C5CE7' : '#5F6673'} />
              <Text style={[s.navTabText, isActive && s.navTabTextActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[s.navTab, activeView === 'security' && s.navTabActive]}
          onPress={() => {
            setActiveView('security');
            setActiveModule(null);
            if (session) logAccess(session, 'security_controls', 'view_module', null, null, 'Security Controls');
          }}
        >
          <Lock size={14} color={activeView === 'security' ? '#6C5CE7' : '#5F6673'} />
          <Text style={[s.navTabText, activeView === 'security' && s.navTabTextActive]}>Security</Text>
        </Pressable>
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView style={s.portalContent} contentContainerStyle={s.portalContentInner}>

        {/* OVERVIEW */}
        {activeView === 'overview' && (
          <>
            <View style={s.welcomeCard}>
              <Text style={s.welcomeTitle}>Welcome, {session.auditor_name}</Text>
              <Text style={s.welcomeSub}>
                You have read-only access to {enabledModules.length} module{enabledModules.length !== 1 ? 's' : ''} for this {(AUDIT_TYPE_LABELS[session.audit_type] || session.audit_type).toUpperCase()} audit. All access is logged.
              </Text>
              <View style={s.welcomeMeta}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Session</Text>
                  <Text style={s.metaVal}>{session.session_name}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>CB</Text>
                  <Text style={s.metaVal}>{session.certification_body}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Expires</Text>
                  <Text style={s.metaVal}>{fmtDate(session.valid_until)}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Access #</Text>
                  <Text style={s.metaVal}>{session.access_count || 1}</Text>
                </View>
              </View>
            </View>

            <Text style={s.sectionTitle}>Available Modules</Text>
            <View style={s.moduleGrid}>
              {enabledModules.map(m => {
                const Icon = m.icon;
                return (
                  <Pressable key={m.key} style={s.moduleCard} onPress={() => loadModule(m)}>
                    <Icon size={24} color="#6C5CE7" />
                    <Text style={s.moduleCardName}>{m.label}</Text>
                    <Text style={s.moduleCardRef}>{m.sqf}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={s.moduleCard} onPress={() => { setActiveView('security'); setActiveModule(null); }}>
                <Lock size={24} color="#6C5CE7" />
                <Text style={s.moduleCardName}>Security Controls</Text>
                <Text style={s.moduleCardRef}>SQF 2.2.2 / 2.2.3</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* MODULE RECORDS */}
        {activeView === 'module' && activeModule && (
          <>
            <View style={s.moduleHeader}>
              <Text style={s.moduleHeaderTitle}>{activeModule.label}</Text>
              <Text style={s.moduleHeaderSqf}>{activeModule.sqf}</Text>
            </View>

            <View style={s.searchBar}>
              <SearchIcon size={16} color="#9BA3B0" />
              <TextInput
                style={s.searchInput}
                placeholder={`Search ${activeModule.label}...`}
                placeholderTextColor="#9BA3B0"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <Text style={s.searchCount}>{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</Text>
            </View>

            {loadingRecords ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color="#6C5CE7" />
                <Text style={s.loadingText}>Loading {activeModule.label}...</Text>
              </View>
            ) : filteredRecords.length === 0 ? (
              <View style={s.loadingWrap}>
                <Text style={s.loadingText}>No records found{searchQuery ? ' matching your search' : ''}.</Text>
              </View>
            ) : (
              filteredRecords.map((record, i) => {
                const name = record[activeModule.nameField] || record.title || record.name || record.description || 'Untitled';
                const date = record[activeModule.dateField] || record.created_at;
                const status = record[activeModule.statusField] || '';
                const statusLower = status.toLowerCase().replace(/\s+/g, '_');
                const statusColor = STATUS_COLORS[statusLower] || { bg: '#F3F4F6', text: '#374151' };
                const isExpanded = expandedId === i;

                return (
                  <Pressable key={i} style={s.recordCard} onPress={() => toggleRecord(i, record)}>
                    <View style={s.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.recordName} numberOfLines={isExpanded ? undefined : 1}>{name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Text style={s.recordDate}>{fmtDate(date)}</Text>
                          {status ? (
                            <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                              <Text style={[s.statusText, { color: statusColor.text }]}>{status}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {isExpanded ? <ChevronUp size={18} color="#9BA3B0" /> : <ChevronDown size={18} color="#9BA3B0" />}
                    </View>

                    {isExpanded && (
                      <View style={s.recordDetail}>
                        {Object.entries(record)
                          .filter(([k]) => !HIDDEN_FIELDS.includes(k))
                          .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                          .map(([k, v], j) => (
                            <View key={j} style={s.detailRow}>
                              <Text style={s.detailLabel}>{fmtFieldName(k)}</Text>
                              <Text style={s.detailValue}>{fmtValue(v)}</Text>
                            </View>
                          ))
                        }
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {/* SECURITY CONTROLS */}
        {activeView === 'security' && (
          <>
            <View style={s.welcomeCard}>
              <Text style={s.welcomeTitle}>Electronic Record Security Controls</Text>
              <Text style={s.welcomeSub}>
                This document describes the security controls implemented in TulKenz OPS to protect electronic records in compliance with SQF Code requirements.
              </Text>
            </View>

            {[
              { title: 'System Overview', ref: 'SQF 2.2.2', items: [
                'Platform: TulKenz OPS — Cloud Food Safety Management System',
                'Database: PostgreSQL via Supabase (AWS)',
                'Hosting: Vercel Pro — Global CDN, SSL, DDoS Protection',
                'Encryption: AES-256 at rest, TLS 1.3 in transit',
                'Auth: PIN-based employee authentication',
                'Signatures: PPN (Personal PIN + Initials + Department Code)',
                'Backup: Automated daily — verified via Management API',
              ]},
              { title: '1. Access Control & Authentication', ref: 'SQF 2.2.2.3', items: [
                'Organization-scoped data isolation — each facility\'s data is completely separated',
                'Role-based access control with granular module permissions',
                'PIN-based authentication for all employee actions',
                'Session timeout after period of inactivity',
                'Failed authentication attempts tracked and logged',
              ]},
              { title: '2. Electronic Signatures — PPN Verification', ref: 'SQF 2.2.3.2', items: [
                'Two-factor verification: Employee initials + PIN entry',
                'Immutable signature stamps include name, department, date, and time',
                'Signature verification status recorded on every signed document',
                'Failed signature attempts logged for security audit trail',
                'Signatures cannot be modified after submission',
              ]},
              { title: '3. Document Version Control', ref: 'SQF 2.2.2.2', items: [
                'Template-based document system with unique form IDs',
                'Version history maintained for all document templates',
                'Approval tracking with reviewer identification and timestamps',
                'Superseded documents archived, not deleted',
              ]},
              { title: '4. Data Storage & Security', ref: 'SQF 2.2.3.3', items: [
                'PostgreSQL database hosted on Supabase (AWS infrastructure)',
                'AES-256 encryption at rest for all stored data',
                'TLS 1.3 encryption in transit for all API communications',
                'Row Level Security (RLS) policies enforced at database level',
                'Automated daily backups with verification monitoring',
                'Point-in-time recovery capability',
              ]},
              { title: '5. Audit Trail & Activity Logging', ref: 'SQF 2.2.3.1', items: [
                'created_at, updated_at, and created_by fields on all records',
                'PPN signature log with full verification chain',
                'No hard deletes — soft delete pattern preserves all historical data',
                'External auditor access fully logged with IP, user agent, and timestamps',
              ]},
              { title: '6. Record Retention & Retrieval', ref: 'SQF 2.2.3.3', items: [
                'Indefinite record retention — no automatic deletion of compliance data',
                'Full-text search across all record types',
                'Export capability for offline review',
                'Auto-generated form numbering for traceability',
              ]},
              { title: '7. External Auditor Access', ref: 'SQF Edition 10', items: [
                'Token-based access with time-limited sessions',
                'Scoped module access — auditor only sees enabled modules',
                'Strictly read-only — no create, edit, or delete capability',
                'Complete access logging with module, action, and record-level tracking',
                'Instant revocation capability by facility administrator',
              ]},
              { title: '8. Data Integrity & Correction Controls', ref: 'SQF 2.2.3.2', items: [
                'All form fields must be completed before submission — blank cells not allowed',
                'Submitted records locked from further editing',
                'System-generated timestamps cannot be modified by users',
                'Database constraints enforce data type and value validation',
              ]},
            ].map((section, i) => (
              <View key={i} style={s.secSection}>
                <Text style={s.secTitle}>{section.title}</Text>
                <Text style={s.secRef}>{section.ref}</Text>
                {section.items.map((item, j) => (
                  <View key={j} style={s.secItem}>
                    <CheckCircle size={14} color="#10B981" style={{ marginTop: 2 }} />
                    <Text style={s.secItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <View style={s.portalFooter}>
          <Lock size={12} color="#9BA3B0" />
          <Text style={s.footerText}>Read-only access · All activity logged · TulKenz OPS</Text>
        </View>

        <Pressable style={s.exitBtn} onPress={onExit}>
          <ArrowLeft size={16} color="#EF4444" />
          <Text style={s.exitBtnText}>Exit Portal</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  // Fullscreen states
  fullscreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 24 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 32, alignItems: 'center', maxWidth: 400, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#E2E5EB' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1A1D23', marginTop: 16, marginBottom: 8 },
  cardSub: { fontSize: 14, color: '#5F6673', textAlign: 'center', lineHeight: 20 },
  tokenInput: { width: '100%', borderWidth: 1, borderColor: '#E2E5EB', borderRadius: 10, padding: 14, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 20, color: '#1A1D23', backgroundColor: '#F8F9FB' },
  tokenBtn: { width: '100%', backgroundColor: '#6C5CE7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  tokenBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  backLinkText: { fontSize: 14, color: '#5F6673' },

  // Portal layout
  portal: { flex: 1, backgroundColor: '#F8F9FB' },
  portalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E5EB' },
  portalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  portalBrand: { fontSize: 16, fontWeight: '700', color: '#6C5CE7' },
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C5CE710', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  readOnlyText: { fontSize: 10, fontWeight: '700', color: '#6C5CE7', letterSpacing: 0.5 },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  sessionBadgeText: { fontSize: 12, fontWeight: '600', color: '#065F46' },

  sessionBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#6C5CE708', borderBottomWidth: 1, borderBottomColor: '#E2E5EB' },
  sessionBarText: { fontSize: 12, color: '#5F6673' },

  navBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E5EB', maxHeight: 48 },
  navBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12 },
  navTabActive: { borderBottomWidth: 2, borderBottomColor: '#6C5CE7' },
  navTabText: { fontSize: 13, color: '#5F6673' },
  navTabTextActive: { color: '#6C5CE7', fontWeight: '600' },

  portalContent: { flex: 1 },
  portalContentInner: { padding: 16 },

  // Welcome / Overview
  welcomeCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E5EB', marginBottom: 16 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D23', marginBottom: 6 },
  welcomeSub: { fontSize: 14, color: '#5F6673', lineHeight: 20 },
  welcomeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  metaItem: {},
  metaLabel: { fontSize: 11, color: '#9BA3B0', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaVal: { fontSize: 14, fontWeight: '600', color: '#1A1D23', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1D23', marginBottom: 12 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moduleCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E5EB', width: '47%', minWidth: 140 },
  moduleCardName: { fontSize: 14, fontWeight: '600', color: '#1A1D23', marginTop: 8 },
  moduleCardRef: { fontSize: 11, color: '#9BA3B0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },

  // Module records
  moduleHeader: { marginBottom: 12 },
  moduleHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#1A1D23' },
  moduleHeaderSqf: { fontSize: 12, color: '#9BA3B0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E5EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1D23', padding: 0 },
  searchCount: { fontSize: 12, color: '#9BA3B0' },

  loadingWrap: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 14, color: '#9BA3B0', marginTop: 12 },

  recordCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E5EB', marginBottom: 8, overflow: 'hidden' },
  recordHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  recordName: { fontSize: 14, fontWeight: '600', color: '#1A1D23' },
  recordDate: { fontSize: 12, color: '#9BA3B0' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

  recordDetail: { borderTopWidth: 1, borderTopColor: '#E2E5EB', padding: 14 },
  detailRow: { flexDirection: 'row', paddingVertical: 4 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#5F6673', width: 140 },
  detailValue: { fontSize: 13, color: '#1A1D23', flex: 1 },

  // Security controls
  secSection: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E5EB', padding: 16, marginBottom: 12 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D23' },
  secRef: { fontSize: 11, color: '#6C5CE7', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 10, marginTop: 2 },
  secItem: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  secItemText: { fontSize: 13, color: '#5F6673', flex: 1, lineHeight: 18 },

  // Footer
  portalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 16 },
  footerText: { fontSize: 11, color: '#9BA3B0' },
  exitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  exitBtnText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
});
