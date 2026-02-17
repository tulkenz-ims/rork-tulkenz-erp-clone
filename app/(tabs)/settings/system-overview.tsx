import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  Shield,
  Database,
  Server,
  Lock,
  Layers,
  Cpu,
  Wifi,
  CheckCircle,
  ChevronDown,
  ChevronRight,
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
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// ── Collapsible ───────────────────────────────────────────────

function Collapsible({ title, icon: Icon, iconColor, children, defaultOpen = false, colors }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode; defaultOpen?: boolean; colors: any;
}) {
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

// ── Tech Item: label, technical value, then layman ────────────

function TechItem({ label, value, layman, colors, alt }: {
  label: string; value: string; layman: string; colors: any; alt?: boolean;
}) {
  return (
    <View style={[styles.techItem, alt && { backgroundColor: colors.background }]}>
      <View style={styles.techTop}>
        <Text style={[styles.techLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.techValue, { color: colors.text }]}>{value}</Text>
      </View>
      <View style={styles.laymanRow}>
        <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
        <Text style={[styles.laymanText, { color: '#8B5CF6' }]}>{layman}</Text>
      </View>
    </View>
  );
}

// ── Bullet: technical text + layman underneath ────────────────

function BulletItem({ text, layman, colors, icon, iconColor }: {
  text: string; layman: string; colors: any; icon?: any; iconColor?: string;
}) {
  const Icon = icon || CheckCircle;
  return (
    <View style={styles.bulletItem}>
      <View style={styles.bulletRow}>
        <Icon size={14} color={iconColor || '#10B981'} style={{ marginTop: 3 }} />
        <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
      </View>
      <View style={styles.laymanIndented}>
        <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
        <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>{layman}</Text>
      </View>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{text}</Text>;
}

// ── Module Data ───────────────────────────────────────────────

const moduleData = [
  { name: 'CMMS / Maintenance', screens: 93, icon: Wrench, color: '#3B82F6',
    desc: 'Work orders, PMs, equipment registry, parts inventory, vendors, failure analysis, LOTO, KPI dashboards, labor costing, MTBF/MTTR, warranty tracking',
    layman: 'Everything your maintenance team needs — tracking repairs, scheduling preventive work, managing spare parts and vendors, and measuring how well equipment is performing.' },
  { name: 'Quality', screens: 104, icon: ClipboardList, color: '#10B981',
    desc: 'CCP monitoring, pre-op inspections, metal detector logs, temperature logs, room hygiene log, hold tags, daily reports with PPIN sign-off',
    layman: 'Tracks every quality check in the facility — food safety critical control points, product inspections, temperature readings, and room cleanliness with daily Quality sign-off.' },
  { name: 'Safety', screens: 99, icon: AlertTriangle, color: '#EF4444',
    desc: 'Incident reports, OSHA 300/301 logs, safety permits, emergency events/drills, contractor safety, ergonomics, respirator fit tests, PPE, SDS, vehicle incidents',
    layman: 'Report injuries, track safety permits, run and log emergency drills, manage contractor access, keep OSHA paperwork current, and make sure everyone has their protective gear.' },
  { name: 'Compliance', screens: 119, icon: Shield, color: '#8B5CF6',
    desc: 'SQF audit prep, HACCP plans, document control, corrective actions (CAPA), internal audits, supplier approvals, training records',
    layman: 'Keeps you audit-ready — organizes all your compliance documents, tracks corrective actions, manages food safety plans, and logs training so auditors can find everything fast.' },
  { name: 'Sanitation', screens: 80, icon: FileText, color: '#14B8A6',
    desc: 'Master sanitation schedule, daily/weekly/monthly tasks, crew assignment, restroom cleaning, chemical safety, NCRs, CAPAs, PPE inventories',
    layman: 'Manages the entire cleaning operation — who cleans what and when, tracks supplies like gloves and chemicals, handles non-conformances, and keeps restroom logs.' },
  { name: 'Inventory', screens: 113, icon: Package, color: '#F59E0B',
    desc: 'Multi-department materials (MRO, production, sanitation, safety, warehouse, office), lot tracking, stock levels, cycle counts, adjustments, replenishment, low stock alerts',
    layman: 'One place for all your stuff — parts, raw materials, cleaning supplies, safety gear. Tracks what you have, what you need, and alerts you when something is running low.' },
  { name: 'Procurement', screens: 52, icon: DollarSign, color: '#EC4899',
    desc: 'Purchase requests, purchase orders, vendor management, receiving, multi-tier approvals, budget tracking, contract management',
    layman: 'Handles buying things — from requesting a purchase, getting it approved, sending the PO to the vendor, all the way to receiving it at the dock and tracking the cost.' },
  { name: 'Production', screens: 3, icon: Activity, color: '#8B5CF6',
    desc: 'Production runs with real-time sensor counting, yield tracking, waste/rework, materials management, Task Feed integration',
    layman: 'Counts bags/units coming off the line in real-time using a sensor. Tracks how many good units, how many wasted, and ties it all to a run number.' },
  { name: 'Finance', screens: 69, icon: BarChart3, color: '#06B6D4',
    desc: 'Budgets, cost centers, GL accounts, journal entries, AP/AR, expense tracking, financial reporting',
    layman: 'Tracks money in and out — department budgets, vendor bills, expenses, and financial reports so you know where every dollar goes.' },
  { name: 'HR', screens: 51, icon: Users, color: '#6366F1',
    desc: 'Employee profiles, benefits, attendance, time-off, FMLA, disciplinary, grievance, succession planning, EEOC, I-9/E-Verify, onboarding, offboarding',
    layman: 'Manages people from hire to retire — employee records, benefits, time off requests, write-ups, new hire paperwork, and compliance reporting.' },
  { name: 'Task Feed', screens: 2, icon: Zap, color: '#F97316',
    desc: 'Cross-department issue routing, production holds, department task assignments, form responses, work order linking, PPIN sign-off, auto Room Hygiene Log',
    layman: 'The nerve center — when something happens on the floor, it gets posted here and automatically routes to every department that needs to respond. Tracks who did what and when.' },
  { name: 'Time Clock', screens: 4, icon: Clock, color: '#84CC16',
    desc: 'Clock in/out, break tracking, kiosk mode for shared devices, room hub, shift management',
    layman: 'Employees clock in and out from their phone or a shared tablet at the door. Tracks breaks, overtime, and hours by department.' },
  { name: 'Approvals', screens: 5, icon: CheckCircle, color: '#A855F7',
    desc: 'Multi-tier approval workflows, delegation, approval history, configurable approval chains',
    layman: 'When something needs a manager\'s OK (like a purchase over $500), it flows through an approval chain. Managers can delegate when they\'re out.' },
  { name: 'Settings', screens: 13, icon: Settings, color: '#64748B',
    desc: 'Organization setup, facilities, areas/locations, departments, roles/permissions, users, Task Feed templates, alert preferences',
    layman: 'The admin panel — set up your company, buildings, rooms, departments, who has access to what, and how Task Feed templates work.' },
];

// ══════════════════════════════════════════════════════════════

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

        {/* ── Technology Stack ──────────────────────────── */}
        <Collapsible title="Technology Stack" icon={Cpu} iconColor="#3B82F6" defaultOpen colors={colors}>
          <SectionLabel text="Frontend (What Users See)" color="#3B82F6" />
          <TechItem label="React Native" value="v0.81.5" colors={colors}
            layman="The framework that lets this app run on phones, tablets, and web browsers from one codebase — build once, works everywhere." />
          <TechItem label="React" value="v19.1.0" colors={colors} alt
            layman="The engine behind every screen you see. It builds the buttons, lists, and forms and updates them instantly when data changes." />
          <TechItem label="Expo" value="v54.0.27" colors={colors}
            layman="A toolkit that handles the hard parts of mobile apps — camera access, push notifications, app updates — so the app works smoothly on any device." />
          <TechItem label="Expo Router" value="v6.0.17 (file-based routing)" colors={colors} alt
            layman="The navigation system. Each screen is a file in a folder, and the router knows how to move between them — like a GPS for the app." />
          <TechItem label="TypeScript" value="Strict mode" colors={colors}
            layman="A safer version of JavaScript. It catches coding mistakes before they reach you, like spell-check but for code." />
          <TechItem label="TanStack React Query" value="v5.83" colors={colors} alt
            layman="Manages all the data flowing between the app and the database. Handles caching (so screens load fast), retries (if the network hiccups), and live refreshing." />

          <SectionLabel text="Backend & Database (Behind the Scenes)" color="#10B981" />
          <TechItem label="Supabase" value="Backend-as-a-Service" colors={colors}
            layman="The server that stores all your data, handles logins, and manages file uploads. It's like a smart filing cabinet in the cloud that only lets authorized people in." />
          <TechItem label="PostgreSQL" value="v15+" colors={colors} alt
            layman="The actual database — one of the most trusted and powerful databases in the world. Banks and hospitals use it. Your data is in good hands." />
          <TechItem label="Row Level Security (RLS)" value="Enabled on every table" colors={colors}
            layman="A security rule built into the database itself. Even if someone hacked the app code, the database would still block them from seeing data they shouldn't. Each company only sees their own data." />
          <TechItem label="Database Triggers" value="Automated workflows" colors={colors} alt
            layman="Automatic actions that happen inside the database — like when all departments complete their tasks, the post automatically marks itself as done. No human needed." />
          <TechItem label="Supabase Auth" value="JWT-based authentication" colors={colors}
            layman="The login system. When you sign in, you get a secure digital 'pass' (called a JWT) that proves who you are. It refreshes automatically so you don't get logged out randomly." />
          <TechItem label="Supabase Storage" value="File & photo storage" colors={colors} alt
            layman="Where photos go when you snap a picture of an issue in Task Feed or attach a document to a work order. Stored securely in the cloud." />
          <TechItem label="Vercel Pro" value="Hosting with Turbo builds (~35s)" colors={colors}
            layman="The company that hosts the app on the internet. When we push an update, it goes live in about 35 seconds and is served from the nearest data center to you for speed." />
          <TechItem label="Real-time Subscriptions" value="Supabase Realtime" colors={colors} alt
            layman="Live updates — when someone completes a task or a sensor pushes a count, your screen updates automatically without refreshing. Like a live sports score ticker." />
        </Collapsible>

        {/* ── Security Architecture ────────────────────── */}
        <Collapsible title="Security Architecture" icon={Shield} iconColor="#EF4444" colors={colors}>
          <SectionLabel text="Authentication (Proving Who You Are)" color="#EF4444" />
          <BulletItem icon={Lock} iconColor="#EF4444" colors={colors}
            text="Email/password authentication with bcrypt hashing"
            layman="Your password is scrambled into an unreadable code before it's stored. Even if someone stole the database, they couldn't read your password." />
          <BulletItem icon={Lock} iconColor="#EF4444" colors={colors}
            text="JWT sessions with automatic token refresh"
            layman="When you log in, you get a secure digital pass that expires after a while. The app automatically renews it so you stay logged in without doing anything." />
          <BulletItem icon={Lock} iconColor="#EF4444" colors={colors}
            text="Encrypted session storage (AsyncStorage)"
            layman="Your login session is saved securely on your device so you don't have to sign in every time you open the app." />
          <BulletItem icon={Lock} iconColor="#EF4444" colors={colors}
            text="PPIN sign-off for regulated actions"
            layman="For important actions like releasing a production hold or signing off a daily report, you enter a personal PIN to prove it was really you — like signing a document." />

          <SectionLabel text="Authorization (Controlling What You Can Do)" color="#F59E0B" />
          <BulletItem icon={Shield} iconColor="#F59E0B" colors={colors}
            text="Row Level Security (RLS) on every database table"
            layman="The database itself checks permissions on every single request. Even if the app had a bug, the database would still block unauthorized access. It's a security guard at the vault door." />
          <BulletItem icon={Shield} iconColor="#F59E0B" colors={colors}
            text="Organization-level data isolation"
            layman="Each company's data is completely walled off from every other company. Company A can never see Company B's information, period." />
          <BulletItem icon={Shield} iconColor="#F59E0B" colors={colors}
            text="Role-based access control (Admin, Manager, Supervisor, Technician, Operator)"
            layman="Different people get different access levels. A technician can close work orders but can't change system settings. An operator can clock in but can't approve purchases." />
          <BulletItem icon={Shield} iconColor="#F59E0B" colors={colors}
            text="Module-level permissions per role"
            layman="You can control which modules each role can even see. For example, a sanitation crew member doesn't need access to Finance or HR." />
          <BulletItem icon={Shield} iconColor="#F59E0B" colors={colors}
            text="Department-scoped task visibility"
            layman="People only see tasks assigned to their department. Maintenance sees maintenance tasks. Quality sees quality tasks. No clutter, no confusion." />

          <SectionLabel text="Data Protection (Keeping Data Safe)" color="#10B981" />
          <BulletItem colors={colors}
            text="TLS 1.3 encryption in transit (HTTPS only)"
            layman="Every piece of data traveling between your phone and the server is scrambled during the trip. Even if someone intercepted it on the WiFi, they'd see gibberish. Same technology banks use." />
          <BulletItem colors={colors}
            text="AES-256 encryption at rest"
            layman="When your data is sitting in the database, it's encrypted with military-grade encryption. Even if someone physically stole the hard drive, they couldn't read it." />
          <BulletItem colors={colors}
            text="Environment variables for API keys"
            layman="Secret keys that connect the app to the database are stored separately from the code, like keeping the safe combination in a different building than the safe." />
          <BulletItem colors={colors}
            text="Supabase anon key with minimal permissions"
            layman="The key the app uses to talk to the database can barely do anything on its own — the real permissions come from your login session. It's like having a building key that only opens the lobby." />
          <BulletItem colors={colors}
            text="No sensitive PII stored (SSN, payment info)"
            layman="The app doesn't store social security numbers, credit cards, or bank details. If it's not needed for operations, it's not collected." />
        </Collapsible>

        {/* ── Module Breakdown ─────────────────────────── */}
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
                <View style={styles.laymanIndented}>
                  <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
                  <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>{mod.layman}</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Screens</Text>
            <Text style={[styles.totalValue, { color: '#8B5CF6' }]}>838</Text>
          </View>
        </Collapsible>

        {/* ── Database Architecture ────────────────────── */}
        <Collapsible title="Database Architecture" icon={Database} iconColor="#10B981" colors={colors}>
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="60+ PostgreSQL tables with Row Level Security"
            layman="Over 60 organized data tables — each one locked down so only the right people can see the right data." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="UUID primary keys — globally unique identifiers"
            layman="Every record gets a random ID like '3b45da94-b49d-4be4...' instead of 1, 2, 3. This means no one can guess IDs to access other records." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="Multi-tenant architecture with organization_id isolation"
            layman="Every single row of data is tagged with which company it belongs to. The database won't even look at rows that don't match your company." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="Automatic timestamps via database triggers"
            layman="Every time a record is created or changed, the database automatically stamps the exact date and time. No one can fake when something happened." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="JSONB columns for flexible data storage"
            layman="Some fields can store complex data like form responses or template configurations — like a mini-database inside a field. This keeps the system flexible without adding hundreds of columns." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="Composite indexes on high-query columns"
            layman="The database has 'speed shortcuts' on the columns you search most often (like status, dates, departments). This is why screens load fast even with thousands of records." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="Check constraints for data validation"
            layman="The database rejects bad data before it's saved. For example, a work order status can only be 'open', 'in_progress', or 'completed' — you can't accidentally save 'banana' as a status." />
          <BulletItem icon={Database} iconColor="#10B981" colors={colors}
            text="Foreign keys for referential integrity"
            layman="Tables are linked together. A work order points to a real piece of equipment. A task points to a real post. If something gets deleted, the links don't break — the database protects them." />
        </Collapsible>

        {/* ── Regulatory Compliance ─────────────────────── */}
        <Collapsible title="Regulatory Compliance (to name a few)" icon={FileText} iconColor="#F59E0B" colors={colors}>
          <View style={[styles.compCard, { backgroundColor: '#3B82F610', borderColor: '#3B82F640' }]}>
            <Text style={[styles.compLabel, { color: '#3B82F6' }]}>SQF (Safe Quality Food)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Document control, internal audits, CAPA, supplier management, HACCP plans, training records, room hygiene logs with daily Quality PPIN sign-off</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>The gold standard for food safety certification. TulKenz OPS organizes everything an SQF auditor will ask for — documents, corrective actions, training, and hygiene logs — so you're always ready.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#10B98110', borderColor: '#10B98140' }]}>
            <Text style={[styles.compLabel, { color: '#10B981' }]}>FDA FSMA (Food Safety Modernization Act)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Preventive controls, CCP monitoring, metal detector verification, temperature logs, corrective actions, supplier verification</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>Federal law requiring food facilities to prevent contamination rather than react to it. TulKenz OPS tracks every critical check — temperatures, metal detectors, CCPs — with timestamps and signatures.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#EF444410', borderColor: '#EF444440' }]}>
            <Text style={[styles.compLabel, { color: '#EF4444' }]}>OSHA (Occupational Safety & Health Administration)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Incident reporting, 300/301 logs, safety permits, LOTO procedures, PPE tracking, contractor safety, emergency preparedness</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>Worker safety regulations. TulKenz OPS tracks injuries, generates the required OSHA forms, manages lockout/tagout procedures, and logs who has what safety gear.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF640' }]}>
            <Text style={[styles.compLabel, { color: '#8B5CF6' }]}>GMP (Good Manufacturing Practices)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Equipment maintenance records, calibration tracking, sanitation schedules, pest control, employee hygiene verification</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>The baseline rules for manufacturing food safely. Clean equipment, trained people, documented processes. TulKenz OPS tracks all of it with proof.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }]}>
            <Text style={[styles.compLabel, { color: '#F59E0B' }]}>Emergency Preparedness</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Emergency drill tracking, event logging, fire/tornado/chemical spill drills, evacuation records, drill participation, response time metrics</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>Tracks every emergency drill you run — who participated, how fast people evacuated, what type of drill. Auditors and insurance companies love seeing this documented.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#06B6D410', borderColor: '#06B6D440' }]}>
            <Text style={[styles.compLabel, { color: '#06B6D4' }]}>HACCP (Hazard Analysis Critical Control Points)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Critical control point monitoring, hazard analysis, corrective action tracking, CCP verification records</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>A system for identifying where food safety hazards can happen and monitoring those points. TulKenz OPS logs every CCP check with who, when, and what the reading was.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#EC489910', borderColor: '#EC489940' }]}>
            <Text style={[styles.compLabel, { color: '#EC4899' }]}>Environmental Monitoring</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Room hygiene logs, swab tracking, contamination risk assessment, cross-department entry logging</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>Tracks who enters production rooms, what they did, and whether there's any contamination risk. Required by most food safety programs to prove your facility is clean.</Text>
            </View>
          </View>

          <View style={[styles.compCard, { backgroundColor: '#84CC1610', borderColor: '#84CC1640' }]}>
            <Text style={[styles.compLabel, { color: '#84CC16' }]}>LOTO (Lockout/Tagout)</Text>
            <Text style={[styles.compTech, { color: colors.text }]}>Equipment-specific LOTO procedures, energy source identification, isolation verification, authorized personnel tracking</Text>
            <View style={styles.laymanIndented}>
              <Info size={11} color="#8B5CF6" style={{ marginTop: 2 }} />
              <Text style={[styles.laymanSmall, { color: '#8B5CF6' }]}>Safety procedures for shutting down equipment before maintenance so no one gets hurt. Documents every energy source, every lock, and who's authorized to do it — OSHA requires this.</Text>
            </View>
          </View>

          <View style={[styles.moreNote, { backgroundColor: colors.background }]}>
            <Info size={14} color={colors.textSecondary} />
            <Text style={[styles.moreNoteText, { color: colors.textSecondary }]}>
              These are some of the major standards TulKenz OPS supports. The platform also covers state and local health department requirements, customer-specific audit standards, and third-party certifications like BRC and FSSC 22000 through its flexible compliance module.
            </Text>
          </View>
        </Collapsible>

        {/* ── Infrastructure ───────────────────────────── */}
        <Collapsible title="Infrastructure & Deployment" icon={Server} iconColor="#06B6D4" colors={colors}>
          <TechItem label="Hosting" value="Vercel Pro (global edge network)" colors={colors}
            layman="The app lives on Vercel's servers spread around the world. When you load a page, it comes from the server closest to you — Dallas users get Dallas speed." />
          <TechItem label="Build Time" value="~35 seconds (Turbo build machines)" colors={colors} alt
            layman="When we push a code update, the new version of the app is built and live in about 35 seconds. You'll see changes almost immediately." />
          <TechItem label="Database Hosting" value="Supabase Cloud (automatic backups)" colors={colors}
            layman="Your data is backed up automatically every day. If something ever went wrong, we can restore to any point in time. Your data doesn't disappear." />
          <TechItem label="CI/CD Pipeline" value="Git push → auto deploy" colors={colors} alt
            layman="Continuous Integration / Continuous Deployment — when new code is finished, it automatically tests itself, builds itself, and goes live. No manual steps, no forgetting to upload files." />
          <TechItem label="Uptime" value="99.9%+ (Vercel + Supabase SLAs)" colors={colors}
            layman="The app is available 99.9% of the time. That's less than 9 hours of downtime per year. Both Vercel and Supabase guarantee this in their service agreements." />
          <TechItem label="CDN" value="Static assets from nearest edge PoP" colors={colors} alt
            layman="Content Delivery Network — images, icons, and app files are cached at 'points of presence' worldwide. It's why pages load fast instead of waiting for a faraway server." />

          <SectionLabel text="Hardware Integrations" color="#06B6D4" />
          <BulletItem icon={Wifi} iconColor="#06B6D4" colors={colors}
            text="Photoelectric sensors (ESP32) for production line counting"
            layman="A small light sensor on the conveyor belt detects each bag that passes. A tiny WiFi-enabled computer (ESP32) counts them and sends the number to TulKenz OPS every few seconds." />
          <BulletItem icon={Wifi} iconColor="#06B6D4" colors={colors}
            text="Barcode/QR scanner support for inventory operations"
            layman="Scan parts and materials with your phone camera or a handheld scanner to speed up receiving, cycle counts, and parts issuing." />
          <BulletItem icon={Wifi} iconColor="#06B6D4" colors={colors}
            text="Time clock kiosk mode for shared devices"
            layman="Mount a tablet by the entrance and employees can clock in/out by tapping their name and entering their PIN. One device, everyone uses it." />
          <BulletItem icon={Wifi} iconColor="#06B6D4" colors={colors}
            text="Push notifications via Expo Push Notification Service"
            layman="When something needs your attention (new task assigned, production hold, low stock alert), your phone buzzes with a notification — even when the app is closed." />
        </Collapsible>

        {/* ── Cross-Module Integration ─────────────────── */}
        <Collapsible title="Cross-Module Integration" icon={Zap} iconColor="#F97316" colors={colors}>
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Task Feed → Room Hygiene Log"
            layman="When a department completes a task in a production room, it automatically creates a hygiene log entry — no extra steps needed for SQF compliance." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Task Feed → Work Orders"
            layman="When Maintenance gets an issue through Task Feed, they can create an emergency work order right from the task. The WO links back to the original report." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Task Feed → Production Runs"
            layman="Posting 'Start Run' or 'End Run' in Task Feed creates and closes production run records. The sensor counts automatically tie to the right run." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Work Orders → Parts Inventory"
            layman="When parts are used on a work order, inventory automatically goes down. No separate inventory adjustment needed." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="PM Schedules → Work Orders"
            layman="Preventive maintenance tasks auto-generate work orders on schedule — daily, weekly, monthly, or based on meter readings. Never miss a PM again." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Inspections → Task Feed"
            layman="If an inspection fails, it can automatically create a flagged post in Task Feed so the right departments get notified and act on it." />
          <BulletItem icon={Zap} iconColor="#F97316" colors={colors}
            text="Approvals → Procurement"
            layman="Purchase requests over a certain dollar amount automatically go through an approval chain — manager, then director, then VP — before the PO is sent to the vendor." />
        </Collapsible>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerBold, { color: '#8B5CF6' }]}>TulKenz OPS v1.0</Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Built by TulKenz LLC</Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            A single unified platform replacing separate CMMS, QMS, EHS, HRIS, procurement, and production tracking systems — purpose-built for food manufacturing.
          </Text>
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
  sectionLabel: { fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  techItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6 },
  techTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  techLabel: { fontSize: 13, fontWeight: '600' },
  techValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  laymanRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  laymanText: { flex: 1, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  bulletItem: { marginBottom: 10 },
  bulletRow: { flexDirection: 'row', gap: 10 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 19 },
  laymanIndented: { flexDirection: 'row', gap: 6, marginTop: 5, marginLeft: 24 },
  laymanSmall: { flex: 1, fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  moduleRow: { flexDirection: 'row', paddingVertical: 14, alignItems: 'flex-start' },
  moduleIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  moduleInfo: { flex: 1 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduleName: { fontSize: 14, fontWeight: '700' },
  moduleScreens: { fontSize: 14, fontWeight: '800' },
  moduleDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, marginTop: 8, borderTopWidth: 2 },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  compCard: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 10 },
  compLabel: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  compTech: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  moreNote: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 10, marginTop: 6 },
  moreNoteText: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  footer: { borderTopWidth: 1, margin: 12, paddingTop: 20, alignItems: 'center', gap: 8, paddingBottom: 20 },
  footerBold: { fontSize: 16, fontWeight: '800' },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
