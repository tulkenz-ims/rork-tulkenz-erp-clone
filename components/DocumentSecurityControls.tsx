import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Lock,
  Key,
  Eye,
  Users,
  Database,
  FileCheck,
  Clock,
  Fingerprint,
  Globe,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Hash,
  Layers,
  UserCheck,
  BookOpen,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================================
// DOCUMENT SECURITY CONTROLS
// SQF Edition 9: 2.2.2 (Document Control) & 2.2.3 (Records)
// SQF Edition 10: Consolidated documentation section
// GFSI BMR v2024: Data management requirements
//
// This component is shown in the Auditor Portal to demonstrate
// how TulKenz OPS meets electronic document security requirements.
// ============================================================

interface SecurityControlProps {
  icon: React.ReactNode;
  title: string;
  sqfRef: string;
  description: string;
  controls: string[];
}

function SecurityControl({ icon, title, sqfRef, description, controls }: SecurityControlProps) {
  const { colors } = useTheme();
  return (
    <View style={[s.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.controlHeader}>
        <View style={[s.controlIcon, { backgroundColor: '#8B5CF6' + '12' }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.controlTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[s.controlRef, { color: '#8B5CF6' }]}>{sqfRef}</Text>
        </View>
      </View>
      <Text style={[s.controlDesc, { color: colors.textSecondary }]}>{description}</Text>
      <View style={s.controlsList}>
        {controls.map((ctrl, i) => (
          <View key={i} style={s.controlItem}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={[s.controlItemText, { color: colors.text }]}>{ctrl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DocumentSecurityControls() {
  const { colors } = useTheme();

  const securityControls: SecurityControlProps[] = [
    {
      icon: <Lock size={22} color="#8B5CF6" />,
      title: 'Access Control & Authentication',
      sqfRef: 'SQF 2.2.2.3 — Documents shall be safely stored and readily accessible',
      description: 'All system access requires authenticated credentials. Role-based permissions ensure users only access modules and data relevant to their function.',
      controls: [
        'Email/password authentication via Supabase Auth with encrypted credential storage',
        'Organization-scoped data isolation — users cannot access other organizations\' records',
        'Role-based access control (Admin, Manager, Technician, Operator) with granular permissions',
        'Session timeout after period of inactivity requiring re-authentication',
        'Employee-level module access restrictions configurable by administrators',
      ],
    },
    {
      icon: <Fingerprint size={22} color="#8B5CF6" />,
      title: 'Electronic Signatures (PPN Verification)',
      sqfRef: 'SQF 2.2.3.2 — Records shall be suitably authorized by those undertaking monitoring activities',
      description: 'All forms and records require PPN (Personal PIN Number) verification. Each signature captures the signer\'s identity, department, and timestamp, creating an immutable authorization trail.',
      controls: [
        'Two-factor signature: employee initials + personal PIN verified against employee database',
        'Signature stamp format: "Full Name — verified by PPN — MM/DD/YYYY HH:MM AM/PM"',
        'Signatures are non-editable once verified — cannot be altered or removed after submission',
        'Each employee has a unique PIN set by their supervisor, stored securely in the employee record',
        'Signature logs recorded in audit trail with employee ID, department code, form type, and timestamp',
        'Failed PIN attempts are tracked and visible in security logs',
      ],
    },
    {
      icon: <FileCheck size={22} color="#8B5CF6" />,
      title: 'Document Version Control',
      sqfRef: 'SQF 2.2.2.2 — A register of current documents and amendments shall be maintained',
      description: 'Every controlled document maintains a complete version history with approval tracking, ensuring only current versions are in use and prior revisions are archived.',
      controls: [
        'Each document has a unique Template ID, version number, and effective date',
        'Version history log tracks all changes: who changed, what changed, when, and approval status',
        'Only approved versions are accessible to general users — drafts require authorization',
        'Superseded documents are archived with read-only access for historical reference',
        'Document register maintained with document name, code, current version, revision date, author, and approver',
        'Amendment notifications sent to relevant personnel when documents are updated',
      ],
    },
    {
      icon: <Database size={22} color="#8B5CF6" />,
      title: 'Data Storage & Security',
      sqfRef: 'SQF 2.2.3.3 — Records shall be securely stored to prevent damage and deterioration',
      description: 'All records are stored in a cloud-hosted PostgreSQL database with encryption at rest and in transit. Infrastructure is managed by Supabase on AWS with enterprise-grade security.',
      controls: [
        'Database hosted on Supabase (AWS infrastructure) with SOC 2 Type II compliance',
        'All data encrypted at rest using AES-256 encryption',
        'All data encrypted in transit using TLS 1.3 (HTTPS)',
        'Row Level Security (RLS) policies enforce organization-level data isolation at the database layer',
        'Automated daily database backups with point-in-time recovery capability',
        'Database access restricted to authenticated application connections only — no direct public access',
      ],
    },
    {
      icon: <Eye size={22} color="#8B5CF6" />,
      title: 'Audit Trail & Activity Logging',
      sqfRef: 'SQF 2.2.3.1 — Methods for maintaining and retaining records shall be documented',
      description: 'Every create, update, and status change across the system is tracked with timestamps and user attribution. This provides a complete chain of custody for all records.',
      controls: [
        'All record modifications include created_at, updated_at, created_by, and updated_by fields',
        'Status changes on NCRs, CAPAs, work orders, and tasks are logged with timestamp and user',
        'PPN signature log captures every signature event: form type, reference ID, signer, department, and time',
        'Auditor portal access log tracks every page view, search, and export with timestamp and IP address',
        'Task feed posts maintain full history of cross-department routing and resolution',
        'No hard deletes — records are soft-deleted or archived, never permanently removed from the database',
      ],
    },
    {
      icon: <Users size={22} color="#8B5CF6" />,
      title: 'User Management & Authorization',
      sqfRef: 'SQF 2.1.1 — Senior management shall demonstrate commitment to the SQF system',
      description: 'Employee accounts are managed centrally with department assignments, role designations, and individual access controls. Administrators control who can access, create, and modify records.',
      controls: [
        'Centralized employee directory with status tracking (active, inactive, terminated)',
        'Department-based access: employees see records relevant to their department by default',
        'Admin-only functions: user management, audit session creation, system configuration',
        'Each employee record tracks: name, initials, department, role, hire date, training status, and PIN setup',
        'Deactivated employees immediately lose system access — no orphaned accounts',
        'Manager approval required for sensitive operations (NCR closure, CAPA verification)',
      ],
    },
    {
      icon: <Clock size={22} color="#8B5CF6" />,
      title: 'Record Retention & Retrieval',
      sqfRef: 'SQF 2.2.3.3 — Records shall be readily accessible, retrievable, and retained per requirements',
      description: 'Records are retained indefinitely in the system and are searchable, filterable, and exportable. Retention periods follow regulatory requirements and product shelf life.',
      controls: [
        'All records retained for minimum duration required by FDA regulations or customer requirements',
        'Full-text search across all modules: NCRs, documents, training, work orders, CAPAs',
        'Filter by date range, status, department, severity, type, and custom fields',
        'Records can be exported to PDF for offline archival or submission',
        'Closed/completed records remain accessible in read-only mode — never purged from active system',
        'Automated form numbering (e.g., NCR-YYYYMM-XXXX) ensures unique, traceable identification',
      ],
    },
    {
      icon: <Globe size={22} color="#8B5CF6" />,
      title: 'External Auditor Access (Portal)',
      sqfRef: 'SQF Edition 10 — Pre-audit remote document review requirements',
      description: 'External auditors receive time-limited, read-only access to designated modules through a secure token-based portal. All auditor activity is logged.',
      controls: [
        'Token-based access: unique 48-character cryptographic token generated per audit session',
        'Token hashed (SHA-256) for secure storage — plaintext shown only once at creation',
        'Time-limited: administrator sets valid_from and valid_until dates; access auto-expires',
        'Scoped access: administrator selects exactly which modules the auditor can view',
        'Read-only enforced: auditors cannot create, edit, or delete any records',
        'Complete access log: every page view, search, and resource accessed is recorded with timestamp',
        'Instant revocation: administrator can revoke access at any time with documented reason',
      ],
    },
    {
      icon: <Server size={22} color="#8B5CF6" />,
      title: 'Application Hosting & Availability',
      sqfRef: 'GFSI BMR v2024 — Data management and system integrity',
      description: 'The application is hosted on Vercel Pro with global CDN distribution. Database services are hosted on Supabase with managed infrastructure, monitoring, and uptime guarantees.',
      controls: [
        'Application deployed on Vercel Pro with automatic SSL certificates and DDoS protection',
        'Global CDN ensures fast access from any location — critical for remote audits',
        'Supabase database with managed backups, monitoring, and automatic failover',
        'Build and deployment pipeline: code changes go through version control (Git) before deployment',
        'Environment variables and API keys stored securely — never exposed in client-side code',
        'Mobile app distributed via Expo/React Native — runs on iOS and Android devices',
      ],
    },
    {
      icon: <RefreshCw size={22} color="#8B5CF6" />,
      title: 'Change Management for System Updates',
      sqfRef: 'SQF Edition 10 — Change Management clause',
      description: 'All changes to the system — features, database schema, forms, and workflows — follow a documented change management process with version control and testing.',
      controls: [
        'All code changes tracked in Git version control with commit history and author attribution',
        'Database migrations are versioned SQL scripts applied sequentially and documented',
        'Form template changes include version number and effective date visible on every form',
        'New features tested before deployment to production environment',
        'System changes documented with rationale, scope of impact, and rollback plan if needed',
        'Users notified of significant changes affecting their workflows or data entry requirements',
      ],
    },
    {
      icon: <AlertTriangle size={22} color="#8B5CF6" />,
      title: 'Data Integrity & Correction Controls',
      sqfRef: 'SQF 2.2.3.2 — Records shall be legible and demonstrate activities have been completed',
      description: 'Electronic records cannot be silently altered. Form submissions require all fields to be completed (no blank cells). Corrections are tracked through status changes and audit trail.',
      controls: [
        'Every form field must be filled in before submission — blank cells are not permitted (N/A if not applicable)',
        'Submitted records cannot be edited by non-admin users — corrections flow through status updates and notes',
        'PPN signature verification prevents unauthorized submissions — only verified employees can sign',
        'Auto-generated form numbers prevent duplicate or out-of-sequence records',
        'Timestamps are system-generated (not user-entered) to prevent backdating',
        'Legacy/historical records are locked as read-only with visual "Legacy" badge — cannot be modified',
      ],
    },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={s.scroll}>
        <View style={s.content}>

          {/* Header */}
          <View style={[s.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.headerIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Shield size={32} color="#8B5CF6" />
            </View>
            <Text style={[s.headerTitle, { color: colors.text }]}>
              Document Security Controls
            </Text>
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>
              Electronic Record Security & Data Integrity
            </Text>
            <View style={[s.headerMeta, { borderTopColor: colors.border }]}>
              <View style={s.headerMetaItem}>
                <BookOpen size={14} color="#8B5CF6" />
                <Text style={[s.headerMetaText, { color: colors.textSecondary }]}>
                  SQF Code 2.2.2 / 2.2.3 Compliance
                </Text>
              </View>
              <View style={s.headerMetaItem}>
                <Layers size={14} color="#8B5CF6" />
                <Text style={[s.headerMetaText, { color: colors.textSecondary }]}>
                  GFSI BMR v2024 Data Management
                </Text>
              </View>
              <View style={s.headerMetaItem}>
                <UserCheck size={14} color="#8B5CF6" />
                <Text style={[s.headerMetaText, { color: colors.textSecondary }]}>
                  SQF Edition 10 Pre-Audit Documentation
                </Text>
              </View>
            </View>
          </View>

          {/* Intro */}
          <View style={[s.introCard, { backgroundColor: '#F0F4FF', borderColor: '#8B5CF6' + '30' }]}>
            <Text style={[s.introText, { color: '#1E3A5F' }]}>
              This document describes the security controls implemented in TulKenz OPS, the electronic food safety management system used by this facility. These controls satisfy SQF requirements for electronic security of records, electronic signatures, document control, and data integrity. All records referenced during audit are managed within this system.
            </Text>
          </View>

          {/* Platform summary */}
          <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryTitle, { color: colors.text }]}>System Overview</Text>
            <View style={s.summaryGrid}>
              {[
                { label: 'Platform', value: 'TulKenz OPS' },
                { label: 'Type', value: 'Cloud-hosted FSMS (SaaS)' },
                { label: 'Database', value: 'PostgreSQL via Supabase' },
                { label: 'Hosting', value: 'Vercel Pro (AWS)' },
                { label: 'Encryption', value: 'AES-256 at rest, TLS 1.3 in transit' },
                { label: 'Auth Method', value: 'Email/Password + PPN Signatures' },
                { label: 'Access Control', value: 'Row Level Security (RLS)' },
                { label: 'Signature Method', value: 'PPN (Personal PIN Number)' },
                { label: 'Client Apps', value: 'iOS, Android, Web' },
                { label: 'Backup', value: 'Automated daily + point-in-time recovery' },
              ].map((item, i) => (
                <View key={i} style={[s.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[s.summaryValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Security controls */}
          {securityControls.map((ctrl, i) => (
            <SecurityControl key={i} {...ctrl} />
          ))}

          {/* Footer */}
          <View style={[s.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.footerText, { color: colors.textSecondary }]}>
              Document ID: SEC-CTRL-001 {'\u00A0'}|{'\u00A0'} Version: 1.0 {'\u00A0'}|{'\u00A0'} Effective: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={[s.footerText, { color: colors.textTertiary, marginTop: 4 }]}>
              This document is auto-generated from the active system configuration and reflects current security controls.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
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

  // Header
  header: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  headerIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub: { fontSize: 15, marginBottom: 16 },
  headerMeta: { borderTopWidth: 1, paddingTop: 14, width: '100%', gap: 8 },
  headerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerMetaText: { fontSize: 13 },

  // Intro
  introCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  introText: { fontSize: 14, lineHeight: 22 },

  // Summary
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryGrid: {},
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 13, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 12 },

  // Control card
  controlCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  controlHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  controlIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controlTitle: { fontSize: 15, fontWeight: '700' },
  controlRef: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  controlDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  controlsList: { gap: 6 },
  controlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  controlItemText: { fontSize: 13, lineHeight: 19, flex: 1 },

  // Footer
  footer: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
  footerText: { fontSize: 12, textAlign: 'center' },
});
