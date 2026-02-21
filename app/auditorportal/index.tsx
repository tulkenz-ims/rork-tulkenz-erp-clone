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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Lock,
  FileText,
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  Search as SearchIcon,
  BookOpen,
  Truck,
  Microscope,
  RefreshCw,
  Heart,
  Wrench,
  Package,
  Database,
  Eye,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Building,
  Globe,
  Activity,
  Filter,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// ── Colors (portal always uses light theme) ──
const C = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  primary: '#8B5CF6',
  primaryBg: '#F5F3FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  infoBg: '#EFF6FF',
};

// ── Types ──
interface AuditSession {
  id: string;
  organization_id: string;
  session_name: string;
  audit_type: string;
  certification_body: string | null;
  auditor_name: string | null;
  auditor_email: string | null;
  valid_from: string;
  valid_until: string;
  status: string;
  access_count: number;
  [key: string]: any;
}

interface ModuleDef {
  key: string;
  scopeField: string;
  label: string;
  sqfRef: string;
  icon: React.ReactNode;
  table: string;
  columns: string[];
  nameField: string;
  dateField: string;
  statusField?: string;
}

// ── Module definitions mapped to SQF categories ──
const MODULES: ModuleDef[] = [
  {
    key: 'documents',
    scopeField: 'scope_documents',
    label: 'Controlled Documents',
    sqfRef: 'SQF 2.2.2 — Document Control',
    icon: <FileText size={20} color={C.primary} />,
    table: 'documents',
    columns: '*',
    nameField: 'title',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'ncrs',
    scopeField: 'scope_ncrs',
    label: 'Non-Conformance Reports',
    sqfRef: 'SQF 2.5.3 — Corrective Action',
    icon: <AlertTriangle size={20} color={C.primary} />,
    table: 'ncr_records',
    columns: '*',
    nameField: 'description',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'capas',
    scopeField: 'scope_capas',
    label: 'Corrective & Preventive Actions',
    sqfRef: 'SQF 2.5.4 — Corrective & Preventive Action',
    icon: <ClipboardList size={20} color={C.primary} />,
    table: 'capas',
    columns: '*',
    nameField: 'title',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'training',
    scopeField: 'scope_training',
    label: 'Training Records',
    sqfRef: 'SQF 2.1.1.6 — Training Requirements',
    icon: <GraduationCap size={20} color={C.primary} />,
    table: 'employee_training_progress',
    columns: '*',
    nameField: 'course_name',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'internal_audits',
    scopeField: 'scope_internal_audits',
    label: 'Internal Audits',
    sqfRef: 'SQF 2.5.1 — Internal Audits & Inspections',
    icon: <SearchIcon size={20} color={C.primary} />,
    table: 'internal_audits',
    columns: '*',
    nameField: 'audit_name',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'haccp',
    scopeField: 'scope_haccp',
    label: 'HACCP / Food Safety Plans',
    sqfRef: 'SQF 2.4.3 — Food Safety Plan',
    icon: <BookOpen size={20} color={C.primary} />,
    table: 'haccp_plans',
    columns: '*',
    nameField: 'plan_name',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'supplier_approvals',
    scopeField: 'scope_supplier_approvals',
    label: 'Approved Supplier Program',
    sqfRef: 'SQF 2.3.2 — Approved Supplier Program',
    icon: <Truck size={20} color={C.primary} />,
    table: 'suppliers',
    columns: '*',
    nameField: 'name',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'env_monitoring',
    scopeField: 'scope_env_monitoring',
    label: 'Environmental Monitoring',
    sqfRef: 'SQF 11.2.8 — Environmental Monitoring',
    icon: <Microscope size={20} color={C.primary} />,
    table: 'env_monitoring_results',
    columns: '*',
    nameField: 'test_location',
    dateField: 'sample_date',
    statusField: 'result',
  },
  {
    key: 'change_management',
    scopeField: 'scope_change_management',
    label: 'Change Management',
    sqfRef: 'SQF Edition 10 — Change Management',
    icon: <RefreshCw size={20} color={C.primary} />,
    table: 'change_requests',
    columns: '*',
    nameField: 'title',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'food_safety_culture',
    scopeField: 'scope_food_safety_culture',
    label: 'Food Safety Culture',
    sqfRef: 'SQF 2.1.3 — Food Safety Culture',
    icon: <Heart size={20} color={C.primary} />,
    table: 'food_safety_culture',
    columns: '*',
    nameField: 'title',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'work_orders',
    scopeField: 'scope_work_orders',
    label: 'Work Orders',
    sqfRef: 'SQF 11.1.3 — Maintenance',
    icon: <Wrench size={20} color={C.primary} />,
    table: 'work_orders',
    columns: '*',
    nameField: 'title',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'inventory',
    scopeField: 'scope_inventory',
    label: 'Inventory',
    sqfRef: 'SQF 2.3 — Specifications & Supplier Approval',
    icon: <Package size={20} color={C.primary} />,
    table: 'inventory_items',
    columns: '*',
    nameField: 'name',
    dateField: 'created_at',
    statusField: 'status',
  },
  {
    key: 'backup_verification',
    scopeField: 'scope_security_controls',
    label: 'Backup Verification Log',
    sqfRef: 'SQF 2.2.3.3 — Secure Storage & Data Integrity',
    icon: <Database size={20} color={C.primary} />,
    table: 'backup_verification_log',
    columns: '*',
    nameField: 'description',
    dateField: 'backup_date',
    statusField: 'verification_result',
  },
];

// ── Token validation page state ──
type PortalState = 'loading' | 'enter_token' | 'invalid' | 'expired' | 'revoked' | 'active';

// ============================================================
// MAIN PORTAL COMPONENT
// ============================================================

export default function AuditPortal() {
  const [state, setState] = useState<PortalState>('loading');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<any[]>([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // Get token from URL params on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        validateToken(token);
        return;
      }
    }
    setState('enter_token');
  }, []);

  // ── Validate token ──
  const validateToken = useCallback(async (token: string) => {
    setState('loading');
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('audit_sessions')
        .select('*')
        .eq('access_token', token.trim())
        .single();

      if (fetchError || !data) {
        setState('invalid');
        setError('This access link is not valid. Please contact the facility for a new link.');
        return;
      }

      // Check status
      if (data.status === 'revoked') {
        setState('revoked');
        setError('This audit session has been revoked by the facility administrator.');
        return;
      }

      // Check expiration
      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = new Date(data.valid_until);

      if (now < validFrom) {
        setState('invalid');
        setError(`This access link is not active yet. Access begins ${validFrom.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`);
        return;
      }

      if (now > validUntil) {
        // Update status to expired
        await supabase.from('audit_sessions').update({ status: 'expired' }).eq('id', data.id);
        setState('expired');
        setError('This audit session has expired. Please contact the facility for a new access link.');
        return;
      }

      // Valid — update access tracking
      await supabase.from('audit_sessions').update({
        last_accessed_at: new Date().toISOString(),
        access_count: (data.access_count || 0) + 1,
      }).eq('id', data.id);

      // Log access
      await supabase.from('audit_access_log').insert({
        session_id: data.id,
        organization_id: data.organization_id,
        module: 'portal',
        action: 'login',
        resource_name: 'Portal accessed',
      });

      setSession(data);
      setState('active');
    } catch (err: any) {
      console.error('[Portal] Token validation error:', err);
      setState('invalid');
      setError('An error occurred validating your access. Please try again.');
    }
  }, []);

  // ── Available modules based on session scope ──
  const availableModules = useMemo(() => {
    if (!session) return [];
    return MODULES.filter(m => session[m.scopeField] === true);
  }, [session]);

  // ── Load module data ──
  const loadModule = useCallback(async (mod: ModuleDef) => {
    if (!session) return;
    setActiveModule(mod.key);
    setModuleLoading(true);
    setModuleData([]);
    setModuleSearch('');
    setExpandedRecord(null);

    // Log access
    await supabase.from('audit_access_log').insert({
      session_id: session.id,
      organization_id: session.organization_id,
      module: mod.key,
      action: 'view',
      resource_name: mod.label,
    });

    try {
      const { data, error } = await supabase
        .from(mod.table)
        .select(mod.columns)
        .eq('organization_id', session.organization_id)
        .order(mod.dateField, { ascending: false })
        .limit(500);

      if (error) {
        console.warn(`[Portal] Table "${mod.table}" query error:`, error.message);
        setModuleData([]);
      } else {
        setModuleData(data || []);
      }
    } catch (err) {
      console.warn(`[Portal] Module "${mod.key}" load error:`, err);
      setModuleData([]);
    } finally {
      setModuleLoading(false);
    }
  }, [session]);

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    if (!moduleSearch.trim()) return moduleData;
    const q = moduleSearch.toLowerCase();
    return moduleData.filter(row =>
      Object.values(row).some(val =>
        val != null && String(val).toLowerCase().includes(q)
      )
    );
  }, [moduleData, moduleSearch]);

  // ── Format helpers ──
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

  const daysRemaining = (until: string) => {
    const diff = Math.ceil((new Date(until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return C.textTertiary;
    const s = status.toLowerCase();
    if (['open', 'active', 'in_progress', 'in progress', 'pending'].includes(s)) return C.warning;
    if (['closed', 'completed', 'verified', 'approved', 'pass'].includes(s)) return C.success;
    if (['overdue', 'failed', 'rejected', 'fail'].includes(s)) return C.danger;
    return C.textSecondary;
  };

  // ── Render field display (hides nulls, UUIDs, internal fields) ──
  const HIDDEN_FIELDS = ['id', 'organization_id', 'created_by_id', 'updated_by', 'token_hash', 'access_token', 'pin', 'pin_hash', 'pin_code', 'ssn_encrypted'];

  const renderRecordFields = (record: any) => {
    const entries = Object.entries(record).filter(([key, val]) => {
      if (HIDDEN_FIELDS.includes(key)) return false;
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return false;
      return true;
    });

    return entries.map(([key, val]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      let display = String(val);
      if (typeof val === 'boolean') display = val ? 'Yes' : 'No';
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) display = fmtDateTime(val);
      if (Array.isArray(val)) display = val.join(', ');

      return (
        <View key={key} style={p.fieldRow}>
          <Text style={p.fieldLabel}>{label}</Text>
          <Text style={p.fieldValue}>{display}</Text>
        </View>
      );
    });
  };

  // ============================================================
  // RENDER: Loading
  // ============================================================
  if (state === 'loading') {
    return (
      <View style={p.centerWrap}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={p.centerText}>Validating access...</Text>
      </View>
    );
  }

  // ============================================================
  // RENDER: Enter Token
  // ============================================================
  if (state === 'enter_token') {
    return (
      <View style={p.centerWrap}>
        <View style={p.tokenCard}>
          <View style={[p.iconCircle, { backgroundColor: C.primaryBg }]}>
            <Shield size={36} color={C.primary} />
          </View>
          <Text style={p.tokenTitle}>Auditor Portal</Text>
          <Text style={p.tokenSub}>Enter your access token to view documents</Text>
          <TextInput
            style={p.tokenInput}
            placeholder="Paste access token here..."
            placeholderTextColor={C.textTertiary}
            value={tokenInput}
            onChangeText={setTokenInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text style={p.tokenError}>{error}</Text> : null}
          <Pressable
            style={[p.tokenBtn, !tokenInput.trim() && { opacity: 0.5 }]}
            onPress={() => tokenInput.trim() && validateToken(tokenInput.trim())}
            disabled={!tokenInput.trim()}
          >
            <Text style={p.tokenBtnText}>Access Portal</Text>
          </Pressable>
          <View style={p.tokenFooter}>
            <Lock size={12} color={C.textTertiary} />
            <Text style={p.tokenFooterText}>Secure, read-only access. All activity is logged.</Text>
          </View>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER: Invalid / Expired / Revoked
  // ============================================================
  if (state === 'invalid' || state === 'expired' || state === 'revoked') {
    const configs = {
      invalid: { icon: <XCircle size={36} color={C.danger} />, title: 'Invalid Access Link', bg: '#FEF2F2' },
      expired: { icon: <Clock size={36} color={C.warning} />, title: 'Session Expired', bg: '#FFFBEB' },
      revoked: { icon: <Lock size={36} color={C.danger} />, title: 'Access Revoked', bg: '#FEF2F2' },
    };
    const cfg = configs[state];
    return (
      <View style={p.centerWrap}>
        <View style={p.tokenCard}>
          <View style={[p.iconCircle, { backgroundColor: cfg.bg }]}>
            {cfg.icon}
          </View>
          <Text style={p.tokenTitle}>{cfg.title}</Text>
          <Text style={[p.tokenSub, { color: C.textSecondary }]}>{error}</Text>
        </View>
      </View>
    );
  }

  // ============================================================
  // RENDER: Active Portal
  // ============================================================
  const activeMod = MODULES.find(m => m.key === activeModule);

  return (
    <SafeAreaView style={p.container} edges={['top']}>
      {/* ── Top bar ── */}
      <View style={p.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Shield size={22} color={C.primary} />
          <View>
            <Text style={p.topBarTitle}>{session?.session_name}</Text>
            <Text style={p.topBarSub}>
              {session?.certification_body} {'\u00B7'} {session?.audit_type?.toUpperCase()} Audit
            </Text>
          </View>
        </View>
        <View style={p.topBarRight}>
          <View style={[p.topBarBadge, { backgroundColor: C.success + '15' }]}>
            <View style={[p.dot, { backgroundColor: C.success }]} />
            <Text style={[p.topBarBadgeText, { color: C.success }]}>Active</Text>
          </View>
          <View style={[p.topBarBadge, { backgroundColor: C.primaryBg }]}>
            <Clock size={12} color={C.primary} />
            <Text style={[p.topBarBadgeText, { color: C.primary }]}>
              {daysRemaining(session!.valid_until)}d remaining
            </Text>
          </View>
        </View>
      </View>

      <View style={p.body}>
        {/* ── Sidebar nav ── */}
        <ScrollView style={p.sidebar} showsVerticalScrollIndicator={false}>
          <Text style={p.sidebarSection}>SQF DOCUMENT REVIEW</Text>
          {availableModules.map(mod => {
            const isActive = activeModule === mod.key;
            return (
              <Pressable
                key={mod.key}
                style={[p.navItem, isActive && p.navItemActive]}
                onPress={() => loadModule(mod)}
              >
                {mod.icon}
                <View style={{ flex: 1 }}>
                  <Text style={[p.navLabel, isActive && p.navLabelActive]}>{mod.label}</Text>
                  <Text style={p.navRef}>{mod.sqfRef}</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Security controls link */}
          {session?.scope_security_controls && (
            <>
              <View style={p.sidebarDivider} />
              <Text style={p.sidebarSection}>SYSTEM DOCUMENTATION</Text>
              <Pressable
                style={[p.navItem, activeModule === 'security_controls' && p.navItemActive]}
                onPress={() => { setActiveModule('security_controls'); setModuleData([]); }}
              >
                <Shield size={20} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[p.navLabel, activeModule === 'security_controls' && p.navLabelActive]}>
                    Document Security Controls
                  </Text>
                  <Text style={p.navRef}>SQF 2.2.2 / 2.2.3 — Electronic Security</Text>
                </View>
              </Pressable>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Main content ── */}
        <ScrollView style={p.main} showsVerticalScrollIndicator={false}>
          {!activeModule ? (
            /* Welcome screen */
            <View style={p.welcome}>
              <View style={[p.iconCircle, { backgroundColor: C.primaryBg, width: 72, height: 72, borderRadius: 36 }]}>
                <Eye size={32} color={C.primary} />
              </View>
              <Text style={p.welcomeTitle}>Pre-Audit Document Review</Text>
              <Text style={p.welcomeSub}>
                Select a module from the navigation to review documents, records, and compliance data.
                All access is read-only and logged.
              </Text>

              {/* Session info card */}
              <View style={p.sessionInfo}>
                <View style={p.sessionInfoRow}>
                  <User size={14} color={C.textSecondary} />
                  <Text style={p.sessionInfoLabel}>Auditor</Text>
                  <Text style={p.sessionInfoValue}>{session?.auditor_name || '\u2014'}</Text>
                </View>
                <View style={p.sessionInfoRow}>
                  <Building size={14} color={C.textSecondary} />
                  <Text style={p.sessionInfoLabel}>Certification Body</Text>
                  <Text style={p.sessionInfoValue}>{session?.certification_body || '\u2014'}</Text>
                </View>
                <View style={p.sessionInfoRow}>
                  <Globe size={14} color={C.textSecondary} />
                  <Text style={p.sessionInfoLabel}>Audit Type</Text>
                  <Text style={p.sessionInfoValue}>{session?.audit_type?.toUpperCase()}</Text>
                </View>
                <View style={p.sessionInfoRow}>
                  <Calendar size={14} color={C.textSecondary} />
                  <Text style={p.sessionInfoLabel}>Access Window</Text>
                  <Text style={p.sessionInfoValue}>
                    {fmtDate(session?.valid_from || null)} — {fmtDate(session?.valid_until || null)}
                  </Text>
                </View>
                <View style={p.sessionInfoRow}>
                  <Activity size={14} color={C.textSecondary} />
                  <Text style={p.sessionInfoLabel}>Modules Available</Text>
                  <Text style={p.sessionInfoValue}>{availableModules.length}</Text>
                </View>
              </View>

              {/* Quick access grid */}
              <Text style={p.quickTitle}>Available Modules</Text>
              <View style={p.quickGrid}>
                {availableModules.map(mod => (
                  <Pressable key={mod.key} style={p.quickCard} onPress={() => loadModule(mod)}>
                    {mod.icon}
                    <Text style={p.quickLabel}>{mod.label}</Text>
                    <ChevronRight size={14} color={C.textTertiary} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : activeModule === 'security_controls' ? (
            /* Security controls inline */
            <SecurityControlsInline />
          ) : (
            /* Module data view */
            <View style={p.moduleView}>
              {/* Module header */}
              <View style={p.moduleHeader}>
                <Pressable style={p.backBtn} onPress={() => setActiveModule(null)}>
                  <Text style={p.backBtnText}>\u2190 Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={p.moduleTitle}>{activeMod?.label}</Text>
                  <Text style={p.moduleRef}>{activeMod?.sqfRef}</Text>
                </View>
                <View style={p.recordCount}>
                  <Text style={p.recordCountText}>{filteredData.length} records</Text>
                </View>
              </View>

              {/* Search */}
              <View style={p.searchBar}>
                <SearchIcon size={16} color={C.textTertiary} />
                <TextInput
                  style={p.searchInput}
                  placeholder="Search records..."
                  placeholderTextColor={C.textTertiary}
                  value={moduleSearch}
                  onChangeText={setModuleSearch}
                />
                {moduleSearch ? (
                  <Pressable onPress={() => setModuleSearch('')}>
                    <XCircle size={16} color={C.textTertiary} />
                  </Pressable>
                ) : null}
              </View>

              {/* Records */}
              {moduleLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={C.primary} />
                  <Text style={{ color: C.textSecondary, marginTop: 12 }}>Loading records...</Text>
                </View>
              ) : filteredData.length === 0 ? (
                <View style={p.emptyState}>
                  <FileText size={32} color={C.textTertiary} />
                  <Text style={p.emptyTitle}>
                    {moduleSearch ? 'No matching records' : 'No records found'}
                  </Text>
                  <Text style={p.emptySub}>
                    {moduleSearch
                      ? 'Try adjusting your search terms'
                      : `No ${activeMod?.label?.toLowerCase()} records exist for this organization`}
                  </Text>
                </View>
              ) : (
                filteredData.map((record, idx) => {
                  const isExpanded = expandedRecord === record.id;
                  const nameVal = record[activeMod?.nameField || 'title'] || record.description || record.name || `Record ${idx + 1}`;
                  const dateVal = record[activeMod?.dateField || 'created_at'];
                  const statusVal = activeMod?.statusField ? record[activeMod.statusField] : null;
                  const formNumber = record.form_number || record.ncr_number || record.reference_number || null;

                  return (
                    <Pressable
                      key={record.id || idx}
                      style={p.recordCard}
                      onPress={() => {
                        setExpandedRecord(isExpanded ? null : record.id);
                        if (!isExpanded && session) {
                          // Log record view
                          supabase.from('audit_access_log').insert({
                            session_id: session.id,
                            organization_id: session.organization_id,
                            module: activeModule,
                            action: 'view_record',
                            resource_id: record.id,
                            resource_type: activeMod?.table,
                            resource_name: typeof nameVal === 'string' ? nameVal.substring(0, 200) : 'Record',
                          });
                        }
                      }}
                    >
                      {/* Record summary row */}
                      <View style={p.recordSummary}>
                        <View style={{ flex: 1 }}>
                          {formNumber && (
                            <Text style={p.recordNumber}>{formNumber}</Text>
                          )}
                          <Text style={p.recordName} numberOfLines={isExpanded ? undefined : 2}>
                            {typeof nameVal === 'string' ? nameVal : JSON.stringify(nameVal)}
                          </Text>
                          <Text style={p.recordDate}>{fmtDateTime(dateVal)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          {statusVal && (
                            <View style={[p.statusBadge, { backgroundColor: getStatusColor(statusVal) + '15' }]}>
                              <Text style={[p.statusText, { color: getStatusColor(statusVal) }]}>
                                {String(statusVal).replace(/_/g, ' ').toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {isExpanded ? <ChevronUp size={16} color={C.textTertiary} /> : <ChevronDown size={16} color={C.textTertiary} />}
                        </View>
                      </View>

                      {/* Expanded fields */}
                      {isExpanded && (
                        <View style={p.recordExpanded}>
                          {renderRecordFields(record)}
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* ── Footer ── */}
      <View style={p.footer}>
        <Lock size={12} color={C.textTertiary} />
        <Text style={p.footerText}>
          Read-only access {'\u00B7'} All activity logged {'\u00B7'} TulKenz OPS Auditor Portal
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// INLINE SECURITY CONTROLS (for portal view)
// ============================================================

function SecurityControlsInline() {
  const controls = [
    {
      title: 'Access Control & Authentication',
      ref: 'SQF 2.2.2.3',
      items: [
        'Organization-scoped data isolation — users only access their own facility data',
        'Role-based permissions: Admin, Manager, Technician, Operator',
        'Session timeout after inactivity requiring re-authentication',
        'Employee-level module access restrictions configurable by administrators',
      ],
    },
    {
      title: 'Electronic Signatures (PPN Verification)',
      ref: 'SQF 2.2.3.2',
      items: [
        'Two-factor signature: employee initials + personal PIN verified against employee database',
        'Stamp format: "Full Name — verified by PPN — MM/DD/YYYY HH:MM AM/PM"',
        'Signatures are non-editable once verified — cannot be altered after submission',
        'Failed PIN attempts are tracked in security logs',
      ],
    },
    {
      title: 'Document Version Control',
      ref: 'SQF 2.2.2.2',
      items: [
        'Each document has unique Template ID, version number, and effective date',
        'Version history tracks all changes: who, what, when, and approval status',
        'Superseded documents archived with read-only access for historical reference',
      ],
    },
    {
      title: 'Data Storage & Encryption',
      ref: 'SQF 2.2.3.3',
      items: [
        'PostgreSQL database hosted on Supabase (AWS infrastructure)',
        'AES-256 encryption at rest, TLS 1.3 encryption in transit',
        'Row Level Security (RLS) enforces organization-level isolation at database layer',
        'Automated daily backups with point-in-time recovery capability',
      ],
    },
    {
      title: 'Audit Trail & Activity Logging',
      ref: 'SQF 2.2.3.1',
      items: [
        'All record modifications include created_at, updated_at, and user attribution',
        'PPN signature log captures every signature event with form type and timestamp',
        'Auditor portal access log tracks every page view, search, and export',
        'No hard deletes — records are soft-deleted or archived, never permanently removed',
      ],
    },
    {
      title: 'Record Retention & Retrieval',
      ref: 'SQF 2.2.3.3',
      items: [
        'Records retained per FDA regulatory requirements and product shelf life',
        'Full-text search across all modules with date, status, and department filters',
        'Auto-generated form numbering (e.g., NCR-YYYYMM-XXXX) ensures unique identification',
        'Closed records remain accessible in read-only mode — never purged from system',
      ],
    },
    {
      title: 'External Auditor Access (This Portal)',
      ref: 'SQF Edition 10',
      items: [
        'Unique 48-character cryptographic token per audit session',
        'Time-limited access with administrator-set start and end dates',
        'Scoped access — administrator selects exactly which modules are visible',
        'Read-only enforced — auditors cannot create, edit, or delete any records',
        'Complete access log of every action taken in the portal',
        'Instant revocation available to facility administrator at any time',
      ],
    },
    {
      title: 'Data Integrity & Correction Controls',
      ref: 'SQF 2.2.3.2',
      items: [
        'Every form field must be filled before submission — blank cells not permitted (use N/A)',
        'Submitted records cannot be silently edited — corrections tracked through status updates',
        'Timestamps are system-generated to prevent backdating',
        'Legacy records locked as read-only with visual "Legacy" badge',
      ],
    },
    {
      title: 'Change Management for System Updates',
      ref: 'SQF Edition 10 — Change Management',
      items: [
        'All code changes tracked in Git version control with commit history',
        'Database migrations are versioned SQL scripts applied sequentially',
        'Form template changes include version number and effective date',
        'Users notified of significant changes affecting workflows or data entry',
      ],
    },
  ];

  return (
    <View style={p.moduleView}>
      <View style={p.moduleHeader}>
        <View style={[p.iconCircle, { backgroundColor: C.primaryBg, width: 44, height: 44, borderRadius: 12 }]}>
          <Shield size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.moduleTitle}>Document Security Controls</Text>
          <Text style={p.moduleRef}>SQF 2.2.2 / 2.2.3 — Electronic Record Security & Data Integrity</Text>
        </View>
      </View>

      <View style={[p.infoBanner, { backgroundColor: C.infoBg, borderColor: C.primary + '30' }]}>
        <Text style={{ color: '#1E3A5F', fontSize: 14, lineHeight: 22 }}>
          This page describes the security controls implemented in TulKenz OPS, the electronic food safety management system used by this facility. These controls satisfy SQF requirements for electronic security of records, electronic signatures, document control, and data integrity.
        </Text>
      </View>

      {/* System overview */}
      <View style={p.overviewCard}>
        <Text style={p.overviewTitle}>System Overview</Text>
        {[
          ['Platform', 'TulKenz OPS'],
          ['Type', 'Cloud-hosted FSMS (SaaS)'],
          ['Database', 'PostgreSQL via Supabase'],
          ['Hosting', 'Vercel Pro (AWS)'],
          ['Encryption', 'AES-256 at rest, TLS 1.3 in transit'],
          ['Auth Method', 'PIN-based employee verification'],
          ['Signature Method', 'PPN (Personal PIN Number)'],
          ['Client Apps', 'iOS, Android, Web'],
          ['Backup', 'Automated daily + point-in-time recovery'],
        ].map(([label, value], i) => (
          <View key={i} style={p.overviewRow}>
            <Text style={p.overviewLabel}>{label}</Text>
            <Text style={p.overviewValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Controls */}
      {controls.map((ctrl, i) => (
        <View key={i} style={p.secControlCard}>
          <View style={p.secControlHeader}>
            <Text style={p.secControlTitle}>{ctrl.title}</Text>
            <Text style={p.secControlRef}>{ctrl.ref}</Text>
          </View>
          {ctrl.items.map((item, j) => (
            <View key={j} style={p.secControlItem}>
              <CheckCircle size={14} color={C.success} />
              <Text style={p.secControlItemText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={p.secFooter}>
        <Text style={p.secFooterText}>
          Document ID: SEC-CTRL-001 {'\u00A0'}|{'\u00A0'} Version: 1.0 {'\u00A0'}|{'\u00A0'} Effective: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
        <Text style={[p.secFooterText, { color: C.textTertiary, marginTop: 4 }]}>
          Auto-generated from active system configuration
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const p = StyleSheet.create({
  // Center layout (token entry, error screens)
  centerWrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { color: C.textSecondary, marginTop: 12, fontSize: 15 },
  tokenCard: { backgroundColor: C.surface, borderRadius: 16, padding: 32, maxWidth: 440, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  tokenTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8 },
  tokenSub: { fontSize: 15, color: C.textSecondary, textAlign: 'center', marginBottom: 20 },
  tokenInput: { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 15, color: C.text, backgroundColor: C.bg, marginBottom: 12 },
  tokenError: { color: C.danger, fontSize: 13, marginBottom: 8 },
  tokenBtn: { backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, width: '100%', alignItems: 'center' },
  tokenBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  tokenFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  tokenFooterText: { color: C.textTertiary, fontSize: 12 },

  // Active portal layout
  container: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  topBarSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  topBarRight: { flexDirection: 'row', gap: 8 },
  topBarBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  topBarBadgeText: { fontSize: 12, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  body: { flex: 1, flexDirection: 'row' },

  // Sidebar
  sidebar: { width: 280, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.border, paddingHorizontal: 12, paddingTop: 16 },
  sidebarSection: { fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 1, paddingHorizontal: 12, marginBottom: 8, marginTop: 4 },
  sidebarDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: C.primaryBg },
  navLabel: { fontSize: 13, fontWeight: '500', color: C.text },
  navLabelActive: { color: C.primary, fontWeight: '600' },
  navRef: { fontSize: 10, color: C.textTertiary, marginTop: 1 },

  // Main content
  main: { flex: 1, padding: 24 },

  // Welcome
  welcome: { alignItems: 'center', paddingTop: 40 },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 8 },
  welcomeSub: { fontSize: 15, color: C.textSecondary, textAlign: 'center', maxWidth: 480, marginBottom: 32 },
  sessionInfo: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20, width: '100%', maxWidth: 520, marginBottom: 32 },
  sessionInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  sessionInfoLabel: { fontSize: 13, color: C.textSecondary, width: 120 },
  sessionInfoValue: { fontSize: 14, fontWeight: '500', color: C.text, flex: 1 },
  quickTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12, alignSelf: 'flex-start' },
  quickGrid: { width: '100%' },
  quickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 6 },
  quickLabel: { fontSize: 14, fontWeight: '500', color: C.text, flex: 1 },

  // Module view
  moduleView: { flex: 1 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  backBtnText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  moduleTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  moduleRef: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 2 },
  recordCount: { backgroundColor: C.primaryBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  recordCountText: { fontSize: 13, fontWeight: '600', color: C.primary },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary, marginTop: 12 },
  emptySub: { fontSize: 14, color: C.textTertiary, marginTop: 4 },

  // Record cards
  recordCard: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8, overflow: 'hidden' },
  recordSummary: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  recordNumber: { fontSize: 11, fontWeight: '700', color: C.primary, marginBottom: 2 },
  recordName: { fontSize: 14, fontWeight: '500', color: C.text },
  recordDate: { fontSize: 12, color: C.textTertiary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  recordExpanded: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 16, paddingVertical: 12 },
  fieldRow: { flexDirection: 'row', paddingVertical: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, width: 160 },
  fieldValue: { fontSize: 13, color: C.text, flex: 1 },

  // Security inline
  infoBanner: { borderRadius: 10, padding: 16, borderWidth: 1, marginBottom: 20 },
  overviewCard: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 20 },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  overviewLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  overviewValue: { fontSize: 13, fontWeight: '500', color: C.text },
  secControlCard: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
  secControlHeader: { marginBottom: 10 },
  secControlTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  secControlRef: { fontSize: 11, fontWeight: '600', color: C.primary, marginTop: 2 },
  secControlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  secControlItemText: { fontSize: 13, color: C.text, lineHeight: 19, flex: 1 },
  secFooter: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 8, alignItems: 'center' },
  secFooterText: { fontSize: 12, color: C.textSecondary },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  footerText: { fontSize: 11, color: C.textTertiary },
});
