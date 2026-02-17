import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  ArrowLeft,
  Shield,
  Database,
  Smartphone,
  Server,
  Lock,
  Eye,
  Layers,
  Cpu,
  Wifi,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Users,
  FileText,
  Wrench,
  ClipboardList,
  AlertTriangle,
  Package,
  DollarSign,
  Clock,
  Activity,
  Settings,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

type SectionId = 'overview' | 'stack' | 'security' | 'modules' | 'database' | 'compliance' | 'infra';

interface CollapsibleProps {
  title: string;
  icon: any;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  colors: any;
}

function Collapsible({ title, icon: Icon, iconColor, children, defaultOpen = false, colors }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[styles.collapsible, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable style={styles.collapsibleHeader} onPress={() => setOpen(!open)}>
        <Icon size={20} color={iconColor} />
        <Text style={[styles.collapsibleTitle, { color: colors.text }]}>{title}</Text>
        {open ? <ChevronDown size={18} color={colors.textSecondary} /> : <ChevronRight size={18} color={colors.textSecondary} />}
      </Pressable>
      {open && <View style={[styles.collapsibleBody, { borderTopColor: colors.border }]}>{children}</View>}
    </View>
  );
}

function StatCard({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color + '15', borderColor: color + '30' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, colors, alt }: { label: string; value: string; colors: any; alt?: boolean }) {
  return (
    <View style={[styles.infoRow, alt && { backgroundColor: colors.background }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function BulletItem({ text, colors, icon, iconColor }: { text: string; colors: any; icon?: any; iconColor?: string }) {
  const Icon = icon || CheckCircle;
  return (
    <View style={styles.bulletRow}>
      <Icon size={14} color={iconColor || '#10B981'} style={{ marginTop: 3 }} />
      <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const moduleData = [
  { name: 'CMMS / Maintenance', screens: 93, icon: Wrench, color: '#3B82F6', desc: 'Work orders, PMs, equipment, parts, vendors, failure analysis, LOTO, KPI dashboards' },
  { name: 'Quality', screens: 104, icon: ClipboardList, color: '#10B981', desc: 'CCP monitoring, inspections, metal detectors, temperature logs, room hygiene, hold tags' },
  { name: 'Safety', screens: 99, icon: AlertTriangle, color: '#EF4444', desc: 'Incidents, OSHA logs, permits, emergency events, contractor safety, PPE, SDS' },
  { name: 'Compliance', screens: 119, icon: Shield, color: '#8B5CF6', desc: 'SQF audit prep, HACCP, document control, corrective actions, internal audits' },
  { name: 'Sanitation', screens: 80, icon: FileText, color: '#14B8A6', desc: 'Master schedule, daily/weekly/monthly tasks, crew assignment, NCRs, CAPAs, PPE' },
  { name: 'Inventory', screens: 113, icon: Package, color: '#F59E0B', desc: 'Multi-department materials, lot tracking, stock levels, cycle counts, replenishment' },
  { name: 'Procurement', screens: 52, icon: DollarSign, color: '#EC4899', desc: 'Purchase requests, POs, vendor management, receiving, approvals, contracts' },
  { name: 'Production', screens: 3, icon: Activity, color: '#8B5CF6', desc: 'Real-time sensor counting, run tracking, yield, waste/rework, Task Feed integration' },
  { name: 'Finance', screens: 69, icon: BarChart3, color: '#06B6D4', desc: 'Budgets, cost centers, GL accounts, AP/AR, expense tracking, reporting' },
  { name: 'HR', screens: 51, icon: Users, color: '#6366F1', desc: 'Employees, benefits, FMLA, disciplinary, succession, EEOC, I-9, on/offboarding' },
  { name: 'Task Feed', screens: 2, icon: Zap, color: '#F97316', desc: 'Cross-department issue routing, production holds, PPIN sign-off, auto hygiene logging' },
  { name: 'Time Clock', screens: 4, icon: Clock, color: '#84CC16', desc: 'Clock in/out, break tracking, kiosk mode, room hub, shift management' },
  { name: 'Approvals', screens: 5, icon: CheckCircle, color: '#A855F7', desc: 'Multi-tier workflows, delegation, approval history, configurable chains' },
  { name: 'Settings', screens: 13, icon: Settings, color: '#64748B', desc: 'Organization, facilities, areas, departments, roles, users, templates, alerts' },
];

export default function SystemOverviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.heroTitle}>TulKenz OPS</Text>
          <Text style={styles.heroSub}>Comprehensive Operations Management Platform</Text>
          <Text style={styles.heroDesc}>Purpose-built for food manufacturing facilities</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Modules" value="39" color="#8B5CF6" colors={colors} />
          <StatCard label="Screens" value="838" color="#3B82F6" colors={colors} />
          <StatCard label="Hooks" value="103" color="#10B981" colors={colors} />
          <StatCard label="Code Lines" value="463K+" color="#F59E0B" colors={colors} />
        </View>

        {/* Tech Stack */}
        <Collapsible title="Technology Stack" icon={Cpu} iconColor="#3B82F6" defaultOpen colors={colors}>
          <Text style={[styles.sectionLabel, { color: '#8B5CF6' }]}>Frontend</Text>
          <InfoRow label="Framework" value="React Native 0.81.5 + Expo 54" colors={colors} />
          <InfoRow label="Language" value="TypeScript (strict mode)" colors={colors} alt />
          <InfoRow label="Routing" value="Expo Router v6 (file-based)" colors={colors} />
          <InfoRow label="State" value="TanStack React Query v5" colors={colors} alt />
          <InfoRow label="React" value="v19.1.0" colors={colors} />

          <Text style={[styles.sectionLabel, { color: '#8B5CF6', marginTop: 16 }]}>Backend & Database</Text>
          <InfoRow label="Backend" value="Supabase (BaaS)" colors={colors} />
          <InfoRow label="Database" value="PostgreSQL 15+" colors={colors} alt />
          <InfoRow label="Auth" value="Supabase Auth (JWT)" colors={colors} />
          <InfoRow label="Storage" value="Supabase Storage (photos)" colors={colors} alt />
          <InfoRow label="Hosting" value="Vercel Pro (~35s deploys)" colors={colors} />
        </Collapsible>

        {/* Security */}
        <Collapsible title="Security Architecture" icon={Shield} iconColor="#EF4444" colors={colors}>
          <Text style={[styles.sectionLabel, { color: '#EF4444' }]}>Authentication</Text>
          <BulletItem text="Email/password with bcrypt hashing" colors={colors} icon={Lock} iconColor="#EF4444" />
          <BulletItem text="JWT sessions with auto-refresh tokens" colors={colors} icon={Lock} iconColor="#EF4444" />
          <BulletItem text="Encrypted session storage (AsyncStorage)" colors={colors} icon={Lock} iconColor="#EF4444" />
          <BulletItem text="PPIN sign-off for regulated actions (quality holds, daily reports)" colors={colors} icon={Lock} iconColor="#EF4444" />

          <Text style={[styles.sectionLabel, { color: '#EF4444', marginTop: 16 }]}>Authorization</Text>
          <BulletItem text="Row Level Security (RLS) on every table — database enforces access" colors={colors} icon={Shield} iconColor="#F59E0B" />
          <BulletItem text="Organization-level data isolation" colors={colors} icon={Shield} iconColor="#F59E0B" />
          <BulletItem text="Role-based access: Admin, Manager, Supervisor, Technician, Operator" colors={colors} icon={Shield} iconColor="#F59E0B" />
          <BulletItem text="Module-level permissions per role" colors={colors} icon={Shield} iconColor="#F59E0B" />
          <BulletItem text="Department-scoped task visibility" colors={colors} icon={Shield} iconColor="#F59E0B" />

          <Text style={[styles.sectionLabel, { color: '#EF4444', marginTop: 16 }]}>Data Protection</Text>
          <BulletItem text="TLS 1.3 encryption in transit (HTTPS only)" colors={colors} />
          <BulletItem text="AES-256 encryption at rest (Supabase)" colors={colors} />
          <BulletItem text="Environment variables for all API keys" colors={colors} />
          <BulletItem text="No sensitive PII (SSN, payment) stored" colors={colors} />
        </Collapsible>

        {/* Modules */}
        <Collapsible title="Module Breakdown (39 Modules)" icon={Layers} iconColor="#8B5CF6" colors={colors}>
          {moduleData.map((mod, i) => (
            <View key={i} style={[styles.moduleRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '20' }]}>
                <mod.icon size={18} color={mod.color} />
              </View>
              <View style={styles.moduleInfo}>
                <View style={styles.moduleHeader}>
                  <Text style={[styles.moduleName, { color: colors.text }]}>{mod.name}</Text>
                  <Text style={[styles.moduleScreens, { color: mod.color }]}>{mod.screens}</Text>
                </View>
                <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>{mod.desc}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Screens</Text>
            <Text style={[styles.totalValue, { color: '#8B5CF6' }]}>838</Text>
          </View>
        </Collapsible>

        {/* Database */}
        <Collapsible title="Database Architecture" icon={Database} iconColor="#10B981" colors={colors}>
          <BulletItem text="60+ PostgreSQL tables with Row Level Security" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="UUID primary keys — no sequential ID exposure" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="Multi-tenant: organization_id on every table" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="Automatic timestamps via database triggers" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="JSONB for flexible form data and template snapshots" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="Composite indexes on high-query columns" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="Check constraints for data validation at DB level" colors={colors} icon={Database} iconColor="#10B981" />
          <BulletItem text="Foreign keys for referential integrity across modules" colors={colors} icon={Database} iconColor="#10B981" />
        </Collapsible>

        {/* Compliance */}
        <Collapsible title="Regulatory Compliance" icon={FileText} iconColor="#F59E0B" colors={colors}>
          <View style={[styles.complianceCard, { backgroundColor: '#3B82F610', borderColor: '#3B82F640' }]}>
            <Text style={[styles.compLabel, { color: '#3B82F6' }]}>SQF (Safe Quality Food)</Text>
            <Text style={[styles.compDesc, { color: colors.text }]}>Document control, internal audits, CAPA, supplier management, HACCP, training records, room hygiene logs with daily Quality PPIN sign-off</Text>
          </View>
          <View style={[styles.complianceCard, { backgroundColor: '#10B98110', borderColor: '#10B98140' }]}>
            <Text style={[styles.compLabel, { color: '#10B981' }]}>FDA FSMA</Text>
            <Text style={[styles.compDesc, { color: colors.text }]}>Preventive controls, CCP monitoring, metal detector verification, temperature logs, corrective actions, supplier verification</Text>
          </View>
          <View style={[styles.complianceCard, { backgroundColor: '#EF444410', borderColor: '#EF444440' }]}>
            <Text style={[styles.compLabel, { color: '#EF4444' }]}>OSHA</Text>
            <Text style={[styles.compDesc, { color: colors.text }]}>Incident reporting, 300/301 logs, safety permits, LOTO procedures, PPE tracking, contractor safety, emergency preparedness</Text>
          </View>
          <View style={[styles.complianceCard, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF640' }]}>
            <Text style={[styles.compLabel, { color: '#8B5CF6' }]}>GMP</Text>
            <Text style={[styles.compDesc, { color: colors.text }]}>Equipment maintenance records, calibration, sanitation schedules, pest control, employee hygiene verification</Text>
          </View>
        </Collapsible>

        {/* Infrastructure */}
        <Collapsible title="Infrastructure & Deployment" icon={Server} iconColor="#06B6D4" colors={colors}>
          <InfoRow label="Hosting" value="Vercel Pro (global edge network)" colors={colors} />
          <InfoRow label="Build Time" value="~35 seconds (Turbo)" colors={colors} alt />
          <InfoRow label="Database" value="Supabase Cloud (auto backups)" colors={colors} />
          <InfoRow label="CI/CD" value="Git push → auto deploy" colors={colors} alt />
          <InfoRow label="Uptime" value="99.9%+ (Vercel + Supabase SLAs)" colors={colors} />
          <InfoRow label="CDN" value="Static assets from nearest edge PoP" colors={colors} alt />

          <Text style={[styles.sectionLabel, { color: '#06B6D4', marginTop: 16 }]}>Hardware Integrations</Text>
          <BulletItem text="Photoelectric sensors (ESP32) for production line counting" colors={colors} icon={Wifi} iconColor="#06B6D4" />
          <BulletItem text="Barcode/QR scanner support for inventory" colors={colors} icon={Wifi} iconColor="#06B6D4" />
          <BulletItem text="Time clock kiosk mode for shared devices" colors={colors} icon={Wifi} iconColor="#06B6D4" />
          <BulletItem text="Push notifications via Expo Push" colors={colors} icon={Wifi} iconColor="#06B6D4" />
        </Collapsible>

        {/* Cross Module */}
        <Collapsible title="Cross-Module Integration" icon={Zap} iconColor="#F97316" colors={colors}>
          <BulletItem text="Task Feed → Room Hygiene Log: auto-log on department task completion" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="Task Feed → Work Orders: issues auto-generate emergency WOs" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="Task Feed → Production Runs: Start/End Run posts control sensor counting" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="Work Orders → Parts: parts issued auto-decrement inventory" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="PM Schedules → Work Orders: auto-generated on schedule" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="Inspections → Task Feed: failed inspections create flagged posts" colors={colors} icon={Zap} iconColor="#F97316" />
          <BulletItem text="Approvals → Procurement: multi-tier approval chains for POs" colors={colors} icon={Zap} iconColor="#F97316" />
        </Collapsible>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>TulKenz OPS v1.0 — Built by TulKenz LLC</Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>A single unified platform replacing separate CMMS, QMS, EHS, HRIS, procurement, and production tracking systems.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  hero: { padding: 32, alignItems: 'center' },
  heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  heroSub: { color: '#E0D4FF', fontSize: 16, marginTop: 6, textAlign: 'center' },
  heroDesc: { color: '#C4B5FD', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4 },
  collapsible: { marginHorizontal: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  collapsibleTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  collapsibleBody: { padding: 16, paddingTop: 12, borderTopWidth: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  bulletRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 19 },
  moduleRow: { flexDirection: 'row', paddingVertical: 12, alignItems: 'flex-start' },
  moduleIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  moduleInfo: { flex: 1 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleName: { fontSize: 14, fontWeight: '700' },
  moduleScreens: { fontSize: 14, fontWeight: '800' },
  moduleDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, marginTop: 8, borderTopWidth: 2 },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  complianceCard: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10 },
  compLabel: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  compDesc: { fontSize: 13, lineHeight: 19 },
  footer: { borderTopWidth: 1, margin: 12, paddingTop: 20, alignItems: 'center', gap: 8 },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
