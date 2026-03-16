/**
 * app/(tabs)/settings/tech-presentation.tsx
 *
 * TulKenz OPS — Technical Platform Presentation
 * 12-slide tap-through deck for tech-focused stakeholder meetings.
 * Covers: AI, IoT, Gap Analysis, Architecture, Security, Data Packages,
 * Auditor Portal, Implementation, NetSuite comparison.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Theme ──────────────────────────────────────────────────────
const T = {
  bg:     '#080E1A',
  card:   '#0D1626',
  alt:    '#111F35',
  cyan:   '#00D4FF',
  teal:   '#00B894',
  amber:  '#FFB800',
  red:    '#FF3B5C',
  purple: '#7B61FF',
  blue:   '#3B82F6',
  green:  '#00C851',
  white:  '#FFFFFF',
  light:  '#C8D8E8',
  gray:   '#8899AA',
  muted:  '#3A5070',
  border: '#1A2E48',
};

// ── Reusable components ────────────────────────────────────────

function SlideHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.slideHeader}>
      <Text style={s.slideTitle}>{title}</Text>
      {subtitle && <Text style={s.slideSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function Card({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: any }) {
  return (
    <View style={[s.card, accent ? { borderColor: accent } : {}, style]}>
      {accent && <View style={[s.accentBar, { backgroundColor: accent }]} />}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[s.dot, { backgroundColor: color }]} />;
}

function BulletRow({ text, color }: { text: string; color: string }) {
  return (
    <View style={s.bulletRow}>
      <Dot color={color} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={[s.statBox, { borderColor: color }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Quote({ text, color }: { text: string; color: string }) {
  return (
    <View style={s.quoteRow}>
      <Text style={[s.quoteText, { color }]}>"{text}"</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// SLIDES
// ══════════════════════════════════════════════════════════════

function Slide01() {
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      {/* Brand */}
      <View style={s.heroCenter}>
        <Text style={s.heroTitle}>
          <Text style={{ color: T.white }}>Tul</Text>
          <Text style={{ color: T.cyan }}>Kenz</Text>
          <Text style={{ color: T.white }}> OPS</Text>
        </Text>
        <Text style={s.heroSub}>Technical Platform Overview</Text>
        <Text style={[s.heroDesc, { marginTop: 12 }]}>
          Purpose-built operations software replacing fragmented enterprise tools.{'\n'}
          Built for how your plant actually works — not how a template says it should.
        </Text>
      </View>
      {/* Stats */}
      <View style={s.statRow}>
        {[
          { value: '39+', label: 'Modules', color: T.cyan },
          { value: 'AI', label: 'Integrated', color: T.purple },
          { value: 'IoT', label: 'Ready', color: T.teal },
          { value: '9', label: 'Audit Frameworks', color: T.amber },
        ].map((st) => <StatBox key={st.label} {...st} />)}
      </View>
      <View style={s.slideFooter}>
        <Text style={s.footerText}>Confidential — TulKenz LLC  •  2026</Text>
      </View>
    </ScrollView>
  );
}

function Slide02() {
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="You Already Have NetSuite & Rippling"
        subtitle="Here is what those two do not cover — and what breaks down without it"
      />
      <View style={s.threeCol}>
        <Card accent={T.blue} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.blue }]}>NetSuite Covers</Text>
          {['Financials & GL', 'Purchase Orders', 'Vendor Management', 'Inventory (high level)', 'Reporting & Dashboards'].map(t => <BulletRow key={t} text={t} color={T.blue} />)}
        </Card>
        <Card accent={T.purple} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.purple }]}>Rippling Covers</Text>
          {['Payroll & Time Clock', 'Benefits & HR', 'Employee Onboarding', 'IT / Device Mgmt', 'PTO & Scheduling'].map(t => <BulletRow key={t} text={t} color={T.purple} />)}
        </Card>
        <Card accent={T.cyan} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.cyan }]}>The Gap — TulKenz Fills</Text>
          {['Maintenance & CMMS', 'Quality & Food Safety', 'Sanitation Scheduling', 'Safety / OSHA Compliance', 'Task Feed + Push Routing', 'IoT Sensors & Andon', 'AI-Assisted Operations', 'Auditor Portal (SQF/FDA)'].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
        </Card>
      </View>
      <Quote text="TulKenz OPS is not competing with NetSuite or Rippling — it completes them." color={T.cyan} />
    </ScrollView>
  );
}

function Slide03() {
  const groups = [
    { label: 'Operations Core', color: T.cyan, modules: ['Task Feed', 'Work Orders', 'PM Schedules', 'Equipment', 'Labor Tracking'] },
    { label: 'Quality & Compliance', color: T.teal, modules: ['NCR / CAPA', 'Auditor Portal', 'Inspections', 'HACCP / SQF', 'SDS Manager'] },
    { label: 'Sanitation', color: T.blue, modules: ['Master Schedule', 'Sanitation WOs', 'Pre-Op Inspections', 'ATP Records', 'SSOP Library'] },
    { label: 'Safety & HR', color: T.amber, modules: ['OSHA Permits', 'Incident Tracking', 'Training Records', 'Emergency Protocol', 'Time Clock'] },
    { label: 'Supply Chain', color: T.purple, modules: ['Procurement', 'Inventory / MRO', 'Vendor Approvals', 'Receiving', 'Parts Catalog'] },
    { label: 'Intelligence', color: T.red, modules: ['AI Assistant', 'IoT Sensors', 'Andon Lights', 'Push Notifications', 'Analytics'] },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader title="Platform Architecture" subtitle="39+ integrated modules — single data layer, single source of truth" />
      <View style={s.twoColGrid}>
        {groups.map(g => (
          <Card key={g.label} accent={g.color} style={s.gridCard}>
            <Text style={[s.cardTitle, { color: g.color }]}>{g.label}</Text>
            {g.modules.map(m => <Text key={m} style={s.smallText}>{m}</Text>)}
          </Card>
        ))}
      </View>
      <Text style={[s.footerText, { marginTop: 12 }]}>
        Stack: React Native / Expo  •  Supabase (PostgreSQL)  •  Vercel Pro  •  Anthropic AI
      </Text>
    </ScrollView>
  );
}

function Slide04() {
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="AI-Assisted Operations"
        subtitle="Powered by Anthropic Claude — embedded directly via Tool Use (function calling)"
      />
      <View style={s.twoCol}>
        <Card accent={T.cyan} style={{ flex: 1.1 }}>
          <Text style={[s.cardTitle, { color: T.cyan }]}>What Claude Can Do Today</Text>
          {[
            'Create & route task feed posts automatically',
            'File work orders from a voice or text command',
            'Look up equipment history and open WOs',
            'Understand Spanish language input',
            'Run queries across all 39 modules',
            'Trigger corrective action workflows',
            'Summarize shift activity on demand',
            'Interpret sensor alerts and recommend actions',
          ].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
        </Card>
        <View style={{ flex: 1, gap: 10 }}>
          <Card accent={T.purple}>
            <Text style={[s.cardTitle, { color: T.purple }]}>Architecture</Text>
            {['Anthropic Tool Use API (function calling)', 'JSON-structured actions mapped to app hooks', 'Full conversation context preserved per session', 'Org-scoped — AI only sees your data'].map(t => <Text key={t} style={s.smallText}>{t}</Text>)}
          </Card>
          <Card accent={T.amber}>
            <Text style={[s.cardTitle, { color: T.amber }]}>Roadmap</Text>
            {['Auto-open web pages for part lookups', 'Spanish language responses (output)', 'Predictive maintenance from sensor data', 'Auto-generate audit evidence packages', 'Voice command integration'].map(t => <Text key={t} style={s.smallText}>{t}</Text>)}
          </Card>
        </View>
      </View>
      <Quote text="Not a chatbot bolted on — Claude is wired into every module's data layer." color={T.cyan} />
    </ScrollView>
  );
}

function Slide05() {
  const andon = [
    { label: '● Green', desc: 'Running / Production Active', color: T.green },
    { label: '● Red', desc: 'LOTO / Locked Out', color: T.red },
    { label: '● Yellow', desc: 'Cleaning / Sanitation', color: T.amber },
    { label: '● Blue', desc: 'Setup / Changeover', color: T.blue },
    { label: '● Gray', desc: 'Idle / Not In Use', color: T.gray },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader title="IoT, Sensors & Facility Intelligence" />
      <View style={s.threeCol}>
        <Card accent={T.teal} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.teal }]}>Room Sensor Simulators</Text>
          {['Temperature monitoring per room', 'Humidity & air quality sensors', 'Simulated now — ESP32 hardware ready', 'Real-time alerts to task feed', 'Historical trending & reports'].map(t => <BulletRow key={t} text={t} color={T.teal} />)}
        </Card>
        <Card accent={T.amber} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.amber }]}>Andon Light System</Text>
          {andon.map(a => (
            <View key={a.label} style={s.bulletRow}>
              <Text style={[s.andonDot, { color: a.color }]}>{a.label}</Text>
              <Text style={[s.smallText, { flex: 1 }]}>{a.desc}</Text>
            </View>
          ))}
        </Card>
        <Card accent={T.red} style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: T.red }]}>Emergency Protocol</Text>
          {['Fire drill protocols', 'Severe weather (shelter-in-place)', 'Active threat procedures', 'Room-by-room status tracking', 'All-clear confirmation workflow', 'Logged & timestamped for OSHA'].map(t => <BulletRow key={t} text={t} color={T.red} />)}
        </Card>
      </View>
      <Card accent={T.blue} style={{ marginTop: 10 }}>
        <Text style={[s.cardTitle, { color: T.blue }]}>Hardware Integration Path</Text>
        <Text style={s.smallText}>WiFi ESP32 microcontrollers → TulKenz OPS API → Real-time room status updates</Text>
        <Text style={s.smallText}>LED Andon bars above each room entrance — software already live, hardware plug-and-play</Text>
        <Text style={[s.smallText, { color: T.gray, marginTop: 4 }]}>Current: Fully simulated in-app  •  Next: Physical sensors wired to same API endpoints</Text>
      </Card>
      <Quote text="The simulation runs on real production data — swap in hardware and nothing else changes." color={T.teal} />
    </ScrollView>
  );
}

function Slide06() {
  const steps = [
    { num: '1', title: 'Operator Reports Issue', desc: 'Photo + form + location\nAuto-stamped, required fields', color: T.cyan },
    { num: '2', title: 'AI Routes Instantly', desc: 'Department auto-assigned\nPush notification sent', color: T.purple },
    { num: '3', title: 'Work Order Created', desc: 'Equipment + location linked\nPM history attached', color: T.teal },
    { num: '4', title: 'Tech Signs Off', desc: 'PPN signature required\nCompletion timestamped', color: T.amber },
    { num: '5', title: 'Full Audit Trail', desc: 'Every step preserved\nSQF / FSMA ready', color: T.blue },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="Task Feed — Operational Hub"
        subtitle="Cross-department workflow routing that no enterprise system replicates"
      />
      <View style={s.flowRow}>
        {steps.map((st, i) => (
          <View key={st.num} style={{ alignItems: 'center', flex: 1 }}>
            <View style={[s.flowCircle, { backgroundColor: st.color }]}>
              <Text style={s.flowNum}>{st.num}</Text>
            </View>
            <Text style={[s.flowTitle, { color: st.color }]}>{st.title}</Text>
            <Text style={s.flowDesc}>{st.desc}</Text>
            {i < 4 && <Text style={[s.flowArrow, { color: T.muted }]}>→</Text>}
          </View>
        ))}
      </View>
      <Card accent={T.bgCard} style={{ marginTop: 12, borderColor: T.border }}>
        <Text style={[s.cardTitle, { color: T.cyan }]}>Also in Task Feed</Text>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            {['Production holds with room/line tagging', 'Linked reactive sanitation forms (ATP, CAPA, SSOP)', 'Department filter + search'].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
          </View>
          <View style={{ flex: 1 }}>
            {['Bilingual — Spanish input supported', 'Real-time downtime timer on Line Status Widget', 'Auto WO creation from issue posts'].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

function Slide07() {
  const items = [
    { title: 'Row-Level Security', desc: 'Supabase RLS enforced at database level. Organization data is physically isolated — Company A cannot access Company B under any query.', color: T.cyan },
    { title: 'PPN Electronic Signatures', desc: 'Personal PIN required for production holds, sign-offs, and regulated actions. Timestamped, employee-linked, FSMA/SQF compliant.', color: T.teal },
    { title: 'Token-Based Audit Access', desc: 'Auditor Portal uses SHA-256 hashed time-limited tokens. Read-only, revocable, all access logged — no login credentials shared.', color: T.purple },
    { title: 'Immutable Audit Logs', desc: 'Every record creation, edit, and delete logged with timestamp, user ID, and change delta. 3-year retention per SQF requirements.', color: T.amber },
    { title: 'Infrastructure', desc: 'Vercel Pro Edge Network (global CDN, auto SSL). Supabase on AWS — AES-256 at rest, TLS 1.3 in transit. 99.9%+ SLA.', color: T.blue },
    { title: 'Role-Based Access Control', desc: 'Platform Admin, Manager, Supervisor, Technician, Operator — each role sees only its permitted modules and data.', color: T.red },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader title="Security & Data Architecture" />
      <View style={s.twoColGrid}>
        {items.map(item => (
          <Card key={item.title} accent={item.color} style={s.gridCard}>
            <Text style={[s.cardTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={s.smallText}>{item.desc}</Text>
          </Card>
        ))}
      </View>
      <Text style={[s.footerText, { marginTop: 10 }]}>Build target: SOC 2 Type II alignment by Year 2</Text>
    </ScrollView>
  );
}

function Slide08() {
  const packages = [
    {
      name: 'Standard Package', color: T.blue,
      items: ['Full data export (CSV / JSON / PDF)', 'Monthly backup snapshots', 'Auditor Portal read-only access', 'QR code document system', 'Push notification delivery logs'],
    },
    {
      name: 'Compliance Package', color: T.teal,
      items: ['SQF / BRCGS / FSSC / FDA audit-ready exports', 'FSMA 204 traceability records', 'Electronic signature audit trail', 'OSHA 300 log auto-population', 'Real-time regulatory dashboard'],
    },
    {
      name: 'Integration Package', color: T.purple,
      items: ['REST API access to all modules', 'NetSuite PO sync (bidirectional)', 'Rippling employee data sync', 'Webhook events for WO status', 'Custom report builder'],
    },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="Data Packages & Portability"
        subtitle="Your data, your way — complete portability and integration at every tier"
      />
      <View style={s.threeCol}>
        {packages.map(pkg => (
          <Card key={pkg.name} accent={pkg.color} style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: pkg.color }]}>{pkg.name}</Text>
            {pkg.items.map(item => <BulletRow key={item} text={item} color={pkg.color} />)}
          </Card>
        ))}
      </View>
      <Card accent={T.amber} style={{ marginTop: 10 }}>
        <Text style={[s.smallText, { color: T.amber, textAlign: 'center' }]}>
          Integration Priority: NetSuite PO → Inventory sync  •  Rippling employee roster → TulKenz time clock & labor tracking  •  Bidirectional, real-time
        </Text>
      </Card>
    </ScrollView>
  );
}

function Slide09() {
  const frameworks = [
    { name: 'SQF Ed. 10', color: T.cyan }, { name: 'BRCGS Issue 9', color: T.teal },
    { name: 'FSSC 22000', color: T.blue }, { name: 'FDA / FSMA', color: T.red },
    { name: 'OSHA 29 CFR', color: T.amber }, { name: 'ESG / GRI', color: T.green },
    { name: 'Internal Audit', color: T.purple }, { name: 'Regulatory', color: T.blue },
    { name: 'Customer Audit', color: T.gray },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="Auditor Portal — 9 Compliance Frameworks"
        subtitle="External auditors get read-only token access — no credentials, no VPN, fully logged"
      />
      <View style={s.frameworkGrid}>
        {frameworks.map(fw => (
          <View key={fw.name} style={[s.fwChip, { borderColor: fw.color }]}>
            <Text style={[s.fwText, { color: fw.color }]}>{fw.name}</Text>
          </View>
        ))}
      </View>
      <Card accent={T.cyan} style={{ marginTop: 12 }}>
        <Text style={[s.cardTitle, { color: T.cyan }]}>Portal Capabilities</Text>
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            {['Each framework renders its own nav structure', 'Live data — SDS, NCRs, WOs, training records', 'PM Program tab + PM Records tab'].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
          </View>
          <View style={{ flex: 1 }}>
            {['Work Orders filtered to corrective & emergency', 'Sanitation: 6 tabs (Schedule, Tasks, Pre-Op, ATP, SSOP, CAPA)', 'All access logged to audit_access_log table'].map(t => <BulletRow key={t} text={t} color={T.cyan} />)}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

function Slide10() {
  const phases = [
    {
      phase: 'PHASE 1', title: 'Discovery & Setup', weeks: 'Weeks 1–4', color: T.cyan,
      items: ['On-site process audit (maintenance, quality, sanitation, safety)', 'Map existing workflows to TulKenz modules', 'Configure org structure, departments, rooms, equipment', 'Import existing equipment lists, PMs, vendor records', 'Set up employees, roles, PPN signatures'],
    },
    {
      phase: 'PHASE 2', title: 'Deployment & Training', weeks: 'Weeks 5–16', color: T.teal,
      items: ['Floor-level training for each department (not classroom — floor)', 'CMMS go-live: work orders, PMs, parts requests', 'Task Feed go-live: issue reporting, routing, notifications', 'Quality & Sanitation module activation', 'First SQF/FDA audit portal walkthrough with your team'],
    },
    {
      phase: 'PHASE 3', title: 'Optimization & Handoff', weeks: 'Months 5–6', color: T.purple,
      items: ['NetSuite PO sync configuration', 'Rippling employee roster integration', 'Custom report builds for your KPIs', 'IoT sensor installation planning', 'Documentation handoff + ongoing support agreement'],
    },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title="Implementation — What You're Getting Onsite"
        subtitle="This is not a software license with a PDF manual. This is hands-on, floor-level implementation."
      />
      <View style={s.threeCol}>
        {phases.map(ph => (
          <Card key={ph.phase} accent={ph.color} style={{ flex: 1 }}>
            <Text style={[s.eyebrow, { color: ph.color }]}>{ph.phase}</Text>
            <Text style={[s.cardTitle, { color: T.white }]}>{ph.title}</Text>
            <Text style={[s.smallText, { color: ph.color, marginBottom: 6 }]}>{ph.weeks}</Text>
            {ph.items.map(item => <BulletRow key={item} text={item} color={ph.color} />)}
          </Card>
        ))}
      </View>
      <Quote text="20+ years of food manufacturing operations experience doesn't come in a box. It comes onsite." color={T.amber} />
    </ScrollView>
  );
}

function Slide11() {
  const rows = [
    { cap: 'Work Order Management', ns: 'Basic WO module, no mobile-first', tk: 'Full CMMS — PM, WO, downtime timers, parts' },
    { cap: 'Food Safety / SQF', ns: 'Not built for food manufacturing', tk: 'SQF Ed.10, BRCGS, FSSC, HACCP native' },
    { cap: 'Sanitation Scheduling', ns: 'Not available', tk: 'Full module — ATP, Pre-Op, SSOP, CAPA' },
    { cap: 'Task Feed / Routing', ns: 'Not available', tk: 'Cross-dept routing, push notifications, AI' },
    { cap: 'Mobile UX', ns: 'Poor — not mobile-native', tk: 'React Native — built mobile-first' },
    { cap: 'AI Integration', ns: 'Add-on / third-party', tk: 'Claude embedded — takes actions in-app' },
    { cap: 'Auditor Access', ns: 'Report exports only', tk: 'Live portal, 9 frameworks, token-based' },
    { cap: 'Onsite Implementation', ns: 'Certified partner required ($$$)', tk: 'Direct — the person who built it trains you' },
    { cap: 'Customization', ns: 'Template-driven, expensive changes', tk: 'Your workflows, your terminology, your plant' },
  ];
  return (
    <ScrollView style={s.slide} contentContainerStyle={s.slidePad} showsVerticalScrollIndicator={false}>
      <SlideHeader
        title={'"But Doesn\'t NetSuite Do Some of This?"'}
        subtitle="Yes — and so does a Swiss Army knife technically replace a chef's knife. Built-for-purpose wins every time."
      />
      {/* Header row */}
      <View style={s.tableRow}>
        <Text style={[s.tableHeader, { flex: 1.1 }]}>Capability</Text>
        <Text style={[s.tableHeader, { flex: 1.2, color: T.red }]}>NetSuite</Text>
        <Text style={[s.tableHeader, { flex: 1.5, color: T.cyan }]}>TulKenz OPS</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.cap} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? T.card : T.bg }]}>
          <Text style={[s.tableCell, { flex: 1.1 }]}>{row.cap}</Text>
          <Text style={[s.tableCell, { flex: 1.2, color: '#FF6B6B' }]}>{row.ns}</Text>
          <Text style={[s.tableCell, { flex: 1.5, color: T.green }]}>{row.tk}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Slide12() {
  return (
    <ScrollView style={s.slide} contentContainerStyle={[s.slidePad, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
      <View style={s.closingAccentTop} />
      <Text style={s.heroTitle}>
        <Text style={{ color: T.white }}>Tul</Text>
        <Text style={{ color: T.cyan }}>Kenz</Text>
        <Text style={{ color: T.white }}> OPS</Text>
      </Text>
      <Text style={[s.heroSub, { marginBottom: 24 }]}>
        The Operations Platform Built For Your Plant — Not A Template
      </Text>
      <View style={s.threeCol}>
        {[
          { icon: '🤖', title: 'AI-Native', desc: 'Claude embedded in every module — not a chatbot, an operator', color: T.cyan },
          { icon: '🏭', title: 'Floor-Level', desc: 'Built by someone who has run maintenance, quality, and sanitation', color: T.amber },
          { icon: '🔗', title: 'Fills the Gap', desc: 'NetSuite handles finance. Rippling handles HR. TulKenz handles everything in between.', color: T.teal },
        ].map(p => (
          <Card key={p.title} accent={p.color} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{p.icon}</Text>
            <Text style={[s.cardTitle, { color: p.color, textAlign: 'center' }]}>{p.title}</Text>
            <Text style={[s.smallText, { textAlign: 'center' }]}>{p.desc}</Text>
          </Card>
        ))}
      </View>
      <Text style={[s.closingCTA, { marginTop: 24 }]}>Ready to see it live on your floor?</Text>
      <Text style={[s.closingContact, { color: T.cyan }]}>Virginia Kessler  •  TulKenz LLC  •  support@tulkenz.net</Text>
      <Text style={s.footerText}>React Native / Expo  •  Supabase  •  Vercel Pro  •  Anthropic Claude</Text>
      <View style={s.closingAccentBottom} />
    </ScrollView>
  );
}

const SLIDES = [
  { id: '01', title: 'Overview', component: Slide01 },
  { id: '02', title: 'The Gap', component: Slide02 },
  { id: '03', title: 'Architecture', component: Slide03 },
  { id: '04', title: 'AI & Automation', component: Slide04 },
  { id: '05', title: 'IoT & Sensors', component: Slide05 },
  { id: '06', title: 'Task Feed', component: Slide06 },
  { id: '07', title: 'Security', component: Slide07 },
  { id: '08', title: 'Data Packages', component: Slide08 },
  { id: '09', title: 'Auditor Portal', component: Slide09 },
  { id: '10', title: 'Implementation', component: Slide10 },
  { id: '11', title: 'vs NetSuite', component: Slide11 },
  { id: '12', title: 'Closing', component: Slide12 },
];

// ══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════

export default function TechPresentationScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
    setCurrent(clamped);
    flatRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, []);

  const CurrentSlide = SLIDES[current].component;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={s.headerWrap}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.closeBtn}>
            <X size={20} color={T.cyan} />
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.slideNum}>{SLIDES[current].id} / 12</Text>
            <Text style={s.slideName}>{SLIDES[current].title}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Dot progress */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View style={[s.progressDot, i === current && s.progressDotActive]} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      {/* ── Slide content ── */}
      <View style={{ flex: 1 }}>
        <CurrentSlide />
      </View>

      {/* ── Nav buttons ── */}
      <SafeAreaView edges={['bottom']} style={s.navWrap}>
        <View style={s.navRow}>
          <Pressable
            onPress={() => goTo(current - 1)}
            disabled={current === 0}
            style={[s.navBtn, current === 0 && s.navBtnDisabled]}
          >
            <ChevronLeft size={22} color={current === 0 ? T.muted : T.cyan} />
            <Text style={[s.navBtnText, current === 0 && { color: T.muted }]}>Previous</Text>
          </Pressable>

          <Text style={s.navPageText}>{current + 1} of {SLIDES.length}</Text>

          <Pressable
            onPress={() => goTo(current + 1)}
            disabled={current === SLIDES.length - 1}
            style={[s.navBtn, current === SLIDES.length - 1 && s.navBtnDisabled]}
          >
            <Text style={[s.navBtnText, current === SLIDES.length - 1 && { color: T.muted }]}>Next</Text>
            <ChevronRight size={22} color={current === SLIDES.length - 1 ? T.muted : T.cyan} />
          </Pressable>
        </View>

        {/* Slide jump pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
          {SLIDES.map((sl, i) => (
            <Pressable key={sl.id} onPress={() => goTo(i)}>
              <View style={[s.pill, i === current && { backgroundColor: T.cyan + '22', borderColor: T.cyan }]}>
                <Text style={[s.pillText, i === current && { color: T.cyan }]}>{sl.id}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  headerWrap: { backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.cyan + '18', borderWidth: 1, borderColor: T.cyan + '40', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  slideNum: { fontSize: 10, fontWeight: '800', color: T.cyan, letterSpacing: 2 },
  slideName: { fontSize: 14, fontWeight: '700', color: T.white, marginTop: 1 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 8, paddingTop: 2 },
  progressDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.muted },
  progressDotActive: { width: 16, backgroundColor: T.cyan },

  // Slide
  slide: { flex: 1, backgroundColor: T.bg },
  slidePad: { padding: 16, paddingBottom: 24 },

  // Slide header
  slideHeader: { marginBottom: 14 },
  slideTitle: { fontSize: 20, fontWeight: '800', color: T.white, lineHeight: 26 },
  slideSubtitle: { fontSize: 12, color: T.gray, marginTop: 4, lineHeight: 17 },

  // Hero
  heroCenter: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  heroTitle: { fontSize: 44, fontWeight: '900', letterSpacing: -0.5 },
  heroSub: { fontSize: 16, fontWeight: '600', color: T.cyan, marginTop: 4, textAlign: 'center' },
  heroDesc: { fontSize: 13, color: T.light, textAlign: 'center', lineHeight: 20 },

  // Stats
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', backgroundColor: T.card },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '600', color: T.gray, marginTop: 2, textAlign: 'center', letterSpacing: 0.5 },

  // Card
  card: { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, flexDirection: 'row', marginBottom: 6 },
  accentBar: { width: 4, borderRadius: 2, marginRight: 10, alignSelf: 'stretch' },
  cardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 },

  // Layouts
  twoCol: { flexDirection: 'row', gap: 10 },
  threeCol: { flexDirection: 'row', gap: 8 },
  twoColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard: { width: '48%' },

  // Bullets
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  bulletText: { fontSize: 10.5, color: T.light, flex: 1, lineHeight: 15 },
  smallText: { fontSize: 10.5, color: T.light, lineHeight: 15, marginBottom: 3 },

  // Andon
  andonDot: { fontSize: 10, fontWeight: '700', width: 52 },

  // Quote
  quoteRow: { marginTop: 10, paddingHorizontal: 4 },
  quoteText: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', lineHeight: 16 },

  // Eyebrow
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 2 },

  // Flow
  flowRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  flowCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  flowNum: { fontSize: 18, fontWeight: '900', color: T.white },
  flowTitle: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13, marginBottom: 4 },
  flowDesc: { fontSize: 9.5, color: T.light, textAlign: 'center', lineHeight: 13 },
  flowArrow: { position: 'absolute', right: -8, top: 8, fontSize: 16 },

  // Table
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderRadius: 6, marginBottom: 2 },
  tableHeader: { fontSize: 10, fontWeight: '800', color: T.white, letterSpacing: 0.5 },
  tableCell: { fontSize: 10, color: T.light, lineHeight: 14 },

  // Frameworks
  frameworkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  fwChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.card },
  fwText: { fontSize: 12, fontWeight: '700' },

  // Footer
  slideFooter: { marginTop: 16 },
  footerText: { fontSize: 10, color: T.muted, textAlign: 'center' },

  // Closing
  closingAccentTop: { width: '100%', height: 4, backgroundColor: T.cyan, marginBottom: 20 },
  closingAccentBottom: { width: '100%', height: 4, backgroundColor: T.cyan, marginTop: 20 },
  closingCTA: { fontSize: 18, fontWeight: '800', color: T.white, textAlign: 'center', marginBottom: 8 },
  closingContact: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 },

  // Nav
  navWrap: { backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.cyan + '40', backgroundColor: T.cyan + '10' },
  navBtnDisabled: { borderColor: T.muted + '40', backgroundColor: 'transparent' },
  navBtnText: { fontSize: 13, fontWeight: '600', color: T.cyan },
  navPageText: { fontSize: 12, color: T.gray, fontWeight: '600' },
  pillRow: { paddingHorizontal: 12, paddingBottom: 6, gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg },
  pillText: { fontSize: 10, fontWeight: '700', color: T.gray },
});
